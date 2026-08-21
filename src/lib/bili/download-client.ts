import { writeToFolder, type DirHandle } from "@/lib/folder";
import { viError } from "@/lib/vi";
import type { QueueItem } from "./types";

export type DownloadProgress = {
  received: number;
  total: number;
};

function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

async function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = sanitize(filename);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}

async function pumpToBlob(
  res: Response,
  filename: string,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const total = Number(res.headers.get("content-length") || 0);
  if (!res.body) {
    const blob = await res.blob();
    await saveBlob(blob, filename);
    onProgress({ received: blob.size, total: blob.size });
    return;
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      onProgress({ received, total });
    }
  }
  await saveBlob(new Blob(chunks), filename);
}

export async function downloadQueueItem(
  item: QueueItem,
  qn: number,
  sessdata: string | undefined,
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
  folder?: DirHandle | null,
): Promise<{ type: "mp4" | "dash"; quality: string }> {
  const payload = {
    bvid: item.bvid,
    cid: item.cid,
    qn,
    title: item.title,
    part: item.part,
    page: item.page,
    pages: item.pages,
    sessdata,
  };

  const res = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });

  if (!res.ok) {
    let message = `Tải thất bại (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = viError(json.error);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const type = (res.headers.get("X-Stream-Type") as "mp4" | "dash" | null) ?? "mp4";
  const quality = res.headers.get("X-Quality") ?? "";
  const hasAudio = res.headers.get("X-Has-Audio") === "1";
  const filename = sanitize(
    type === "dash"
      ? `${item.title} [${item.bvid}].video.m4s`
      : `${item.title}${item.pages > 1 ? ` P${item.page}` : ""} [${item.bvid}].mp4`,
  );

  if (folder) {
    await writeToFolder(folder, filename, res, onProgress, signal);
  } else {
    await pumpToBlob(res, filename, onProgress, signal);
  }

  if (type === "dash" && hasAudio) {
    const audioRes = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, stream: "audio" }),
      cache: "no-store",
      signal,
    });
    if (audioRes.ok) {
      const audioName = sanitize(`${item.title} [${item.bvid}].audio.m4s`);
      if (folder) {
        await writeToFolder(folder, audioName, audioRes, onProgress, signal);
      } else {
        await pumpToBlob(audioRes, audioName, onProgress, signal);
      }
    }
  }

  return { type, quality };
}
