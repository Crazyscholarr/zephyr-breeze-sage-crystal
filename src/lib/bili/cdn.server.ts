import { assertAllowedUrl, httpsify } from "./hosts";

const WINDOW = 4;
const CHUNK = 1 * 1024 * 1024;
const MULTI_MIN = 1.2 * 1024 * 1024;
const PROBE_CAP = 6;
const MIRRORS = [
  "upos-sz-mirrorcos.bilivideo.com",
  "upos-sz-mirrorali.bilivideo.com",
  "upos-sz-mirrorhw.bilivideo.com",
  "upos-sz-estgcos.bilivideo.com",
];

export type TurboResult = {
  body: ReadableStream<Uint8Array>;
  length: number;
  contentType: string;
  mode: "single" | "range";
};

function unique(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    if (!raw) continue;
    try {
      const url = assertAllowedUrl(httpsify(raw)).toString();
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    } catch {
      // skip
    }
  }
  return out;
}

function expandMirrors(url: string): string[] {
  const out = [url];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return out;
  }
  if (!parsed.hostname.endsWith("bilivideo.com")) return out;
  for (const host of MIRRORS) {
    if (host === parsed.hostname) continue;
    const copy = new URL(parsed.toString());
    copy.hostname = host;
    out.push(copy.toString());
  }
  return out;
}

function withRange(headers: HeadersInit, start: number, end: number): Headers {
  const h = new Headers(headers);
  h.set("Range", `bytes=${start}-${end}`);
  h.set("Accept-Encoding", "identity");
  return h;
}

async function fetchRange(
  url: string,
  headers: HeadersInit,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const timed = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
    : AbortSignal.timeout(45000);
  const res = await fetch(url, {
    headers: withRange(headers, start, end),
    signal: timed,
    redirect: "follow",
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`CDN ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("CDN empty");
  return buf;
}

async function fetchRangeRetry(
  urls: string[],
  headers: HeadersInit,
  start: number,
  end: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  let last: unknown;
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i]!;
    try {
      return await fetchRange(url, headers, start, end, signal);
    } catch (err) {
      last = err;
      if (signal?.aborted) throw err;
    }
  }
  throw last instanceof Error ? last : new Error("Không tải được luồng video");
}

type Probe = { url: string; length: number; acceptRanges: boolean; type: string };

async function probe(url: string, headers: HeadersInit, signal?: AbortSignal): Promise<Probe> {
  const timed = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
    : AbortSignal.timeout(8000);
  const res = await fetch(url, {
    headers: withRange(headers, 0, 1023),
    signal: timed,
    redirect: "follow",
  });
  if (res.status === 206) {
    const cr = res.headers.get("content-range") ?? "";
    const total = cr.includes("/") ? Number(cr.split("/")[1]) : Number(res.headers.get("content-length") || 0);
    await res.arrayBuffer();
    return {
      url,
      length: Number.isFinite(total) ? total : 0,
      acceptRanges: true,
      type: res.headers.get("content-type") || "video/mp4",
    };
  }
  if (res.status === 200) {
    const length = Number(res.headers.get("content-length") || 0);
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }
    return {
      url,
      length,
      acceptRanges: false,
      type: res.headers.get("content-type") || "video/mp4",
    };
  }
  try {
    await res.body?.cancel();
  } catch {
    // ignore
  }
  throw new Error(`CDN ${res.status}`);
}

async function raceUrl(urls: string[], headers: HeadersInit, signal?: AbortSignal): Promise<Probe> {
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const combined = signal ? AbortSignal.any([signal, ac.signal]) : ac.signal;
  try {
    const probes = urls.map((url) => probe(url, headers, combined));
    for (const p of probes) p.catch(() => {});
    const winner = await Promise.any(probes);
    ac.abort();
    return winner;
  } catch {
    throw new Error("Không kết nối được máy chủ video");
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

function rangeStream(
  urls: string[],
  headers: HeadersInit,
  length: number,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const parts: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < length; start += CHUNK) {
    parts.push({ start, end: Math.min(length, start + CHUNK) - 1 });
  }

  let next = 0;
  let launched = 0;
  const cache = new Map<number, Promise<Uint8Array>>();

  const ensure = () => {
    while (launched - next < WINDOW && launched < parts.length) {
      const i = launched;
      launched += 1;
      const part = parts[i]!;
      cache.set(i, fetchRangeRetry(urls, headers, part.start, part.end, signal));
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (next >= parts.length) {
        controller.close();
        return;
      }
      ensure();
      const buf = await cache.get(next);
      if (!buf) throw new Error("Thiếu khối tải");
      cache.delete(next);
      next += 1;
      ensure();
      controller.enqueue(buf);
    },
    cancel() {
      cache.clear();
    },
  });
}

export async function turboCdn(
  candidates: string[],
  headers: HeadersInit,
  signal?: AbortSignal,
): Promise<TurboResult> {
  const expanded = unique(candidates.flatMap(expandMirrors)).slice(0, PROBE_CAP);
  if (expanded.length === 0) {
    throw new Error("Không có địa chỉ video hợp lệ");
  }

  const winner = await raceUrl(expanded, headers, signal);
  const urls = unique([winner.url, ...expanded]);

  if (!winner.acceptRanges || winner.length < MULTI_MIN) {
    const res = await fetch(winner.url, {
      headers: (() => {
        const h = new Headers(headers);
        h.set("Accept-Encoding", "identity");
        return h;
      })(),
      signal,
      redirect: "follow",
    });
    if (!res.ok || !res.body) {
      throw new Error(`Máy chủ nguồn trả ${res.status}`);
    }
    const length = winner.length || Number(res.headers.get("content-length") || 0);
    return {
      body: res.body as ReadableStream<Uint8Array>,
      length,
      contentType: res.headers.get("content-type") || winner.type,
      mode: "single",
    };
  }

  return {
    body: rangeStream(urls, headers, winner.length, signal),
    length: winner.length,
    contentType: winner.type,
    mode: "range",
  };
}

export function collectUrls(primary?: string, backups?: unknown): string[] {
  const extra: string[] = [];
  if (Array.isArray(backups)) {
    for (const b of backups) if (typeof b === "string") extra.push(b);
  } else if (typeof backups === "string") {
    extra.push(backups);
  }
  return unique([primary ?? "", ...extra]);
}
