import { createFileRoute } from "@tanstack/react-router";
import { fetchPlayurl, pickStream, biliHeaders, qualityLabel } from "@/lib/bili/client.server";
import { turboCdn } from "@/lib/bili/cdn.server";
import { makeFilename } from "@/lib/bili/resolve.server";

function asciiFallback(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_");
  return ascii.length > 0 ? ascii : "video.mp4";
}

function disposition(filename: string): string {
  return `attachment; filename="${asciiFallback(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: {
          bvid?: string;
          cid?: string;
          qn?: number;
          title?: string;
          part?: string;
          page?: number;
          pages?: number;
          sessdata?: string;
          stream?: "video" | "audio";
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
        }

        const bvid = body.bvid ?? "";
        const cid = body.cid ?? "";
        if (!/^BV[0-9A-Za-z]{10}$/.test(bvid) || !/^\d+$/.test(cid)) {
          return Response.json({ error: "Thiếu mã BV hoặc cid hợp lệ" }, { status: 400 });
        }
        const qn = Number(body.qn ?? 64);
        if (!Number.isFinite(qn) || qn < 16 || qn > 127) {
          return Response.json({ error: "Chất lượng không hợp lệ" }, { status: 400 });
        }

        try {
          const play = await fetchPlayurl({
            bvid,
            cid,
            qn,
            sessdata: body.sessdata?.trim() || undefined,
          });
          const stream = pickStream(play, qn);
          const wantAudio = body.stream === "audio";
          const urls = wantAudio ? stream.audioUrls : stream.videoUrls;
          if (urls.length === 0) {
            return Response.json({ error: "Không có luồng âm thanh / hình tương ứng" }, { status: 404 });
          }

          const turbo = await turboCdn(
            urls,
            biliHeaders({
              referer: `https://www.bilibili.com/video/${bvid}`,
              sessdata: body.sessdata?.trim() || undefined,
              accept: "*/*",
            }),
            request.signal,
          );

          const baseName = makeFilename({
            title: body.title || bvid,
            part: body.part || body.title || bvid,
            page: body.page ?? 1,
            pages: body.pages ?? 1,
            bvid,
          });
          const filename =
            stream.type === "dash"
              ? baseName.replace(/\.mp4$/i, wantAudio ? ".audio.m4s" : ".video.m4s")
              : baseName;
          const headers = new Headers();
          headers.set("Content-Type", stream.type === "mp4" ? "video/mp4" : turbo.contentType);
          headers.set("Content-Disposition", disposition(filename));
          headers.set("Cache-Control", "no-store");
          headers.set("X-Accel-Buffering", "no");
          headers.set("X-Stream-Type", stream.type);
          headers.set("X-Quality", qualityLabel(stream.quality, play));
          headers.set("X-Download-Mode", turbo.mode);
          if (stream.audioUrl) headers.set("X-Has-Audio", "1");
          if (turbo.length > 0) headers.set("Content-Length", String(turbo.length));

          return new Response(turbo.body, { status: 200, headers });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Tải thất bại";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
