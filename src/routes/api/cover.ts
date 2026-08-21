import { createFileRoute } from "@tanstack/react-router";
import { assertAllowedUrl, httpsify } from "@/lib/bili/hosts";
import { biliHeaders } from "@/lib/bili/client.server";

export const Route = createFileRoute("/api/cover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const src = new URL(request.url).searchParams.get("u") ?? "";
        if (!src) return new Response("missing", { status: 400 });
        try {
          const url = assertAllowedUrl(httpsify(src));
          if (!url.hostname.endsWith("hdslb.com") && !url.hostname.endsWith("bilibili.com")) {
            return new Response("forbidden", { status: 403 });
          }
          const upstream = await fetch(url.toString(), {
            headers: biliHeaders({ accept: "image/*,*/*" }),
            signal: AbortSignal.timeout(12000),
          });
          if (!upstream.ok || !upstream.body) {
            return new Response("upstream", { status: 502 });
          }
          const headers = new Headers();
          headers.set(
            "Content-Type",
            upstream.headers.get("content-type") || "image/jpeg",
          );
          headers.set("Cache-Control", "public, max-age=86400");
          return new Response(upstream.body, { status: 200, headers });
        } catch {
          return new Response("invalid", { status: 400 });
        }
      },
    },
  },
});
