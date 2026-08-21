import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { h as require_react, m as require_jsx_runtime } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { _ as useRouter, f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as pickStream, f as qualityLabel, i as fetchPlayurl, l as httpsify, n as biliHeaders, t as assertAllowedUrl, u as makeFilename } from "./resolve.server-BnY_n0Dg.mjs";
import { a as object, i as number, o as string, r as literal, s as union } from "../_libs/zod.mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-CgvhciBf.js
var router_CgvhciBf_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Có lỗi xảy ra"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "Lỗi không xác định. Thử tải lại trang."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-CBE3m2Vb.css";
var APP_NAME = "Framebox";
var Route$3 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#0c0c0b"
			},
			{
				name: "description",
				content: "Tải hàng loạt video Bilibili: liên kết, mã BV, anime, tuyển tập, từ khóa."
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Noto+Serif:ital,wght@0,500;0,600&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "vi",
		className: "antialiased",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
					theme: "dark",
					position: "top-center",
					toastOptions: {
						className: "font-sans",
						style: {
							background: "#1d1d1a",
							border: "1px solid rgb(236 236 228 / 12%)",
							color: "#ecece4"
						}
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter = () => import("./routes-BqQwNOG-.mjs");
var Route$2 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route$1 = createFileRoute("/api/cover")({ server: { handlers: { GET: async ({ request }) => {
	const src = new URL(request.url).searchParams.get("u") ?? "";
	if (!src) return new Response("missing", { status: 400 });
	try {
		const url = assertAllowedUrl(httpsify(src));
		if (!url.hostname.endsWith("hdslb.com") && !url.hostname.endsWith("bilibili.com")) return new Response("forbidden", { status: 403 });
		const upstream = await fetch(url.toString(), {
			headers: biliHeaders({ accept: "image/*,*/*" }),
			signal: AbortSignal.timeout(12e3)
		});
		if (!upstream.ok || !upstream.body) return new Response("upstream", { status: 502 });
		const headers = new Headers();
		headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
		headers.set("Cache-Control", "public, max-age=86400");
		return new Response(upstream.body, {
			status: 200,
			headers
		});
	} catch {
		return new Response("invalid", { status: 400 });
	}
} } } });
var WINDOW = 4;
var CHUNK = 1048576;
var MULTI_MIN = 1258291.2;
var PROBE_CAP = 6;
var MIRRORS = [
	"upos-sz-mirrorcos.bilivideo.com",
	"upos-sz-mirrorali.bilivideo.com",
	"upos-sz-mirrorhw.bilivideo.com",
	"upos-sz-estgcos.bilivideo.com"
];
function unique(urls) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of urls) {
		if (!raw) continue;
		try {
			const url = assertAllowedUrl(httpsify(raw)).toString();
			if (seen.has(url)) continue;
			seen.add(url);
			out.push(url);
		} catch {}
	}
	return out;
}
function expandMirrors(url) {
	const out = [url];
	let parsed;
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
function withRange(headers, start, end) {
	const h = new Headers(headers);
	h.set("Range", `bytes=${start}-${end}`);
	h.set("Accept-Encoding", "identity");
	return h;
}
async function fetchRange(url, headers, start, end, signal) {
	const timed = signal ? AbortSignal.any([signal, AbortSignal.timeout(45e3)]) : AbortSignal.timeout(45e3);
	const res = await fetch(url, {
		headers: withRange(headers, start, end),
		signal: timed,
		redirect: "follow"
	});
	if (!res.ok && res.status !== 206) throw new Error(`CDN ${res.status}`);
	const buf = new Uint8Array(await res.arrayBuffer());
	if (buf.byteLength === 0) throw new Error("CDN empty");
	return buf;
}
async function fetchRangeRetry(urls, headers, start, end, signal) {
	let last;
	for (let i = 0; i < urls.length; i += 1) {
		const url = urls[i];
		try {
			return await fetchRange(url, headers, start, end, signal);
		} catch (err) {
			last = err;
			if (signal?.aborted) throw err;
		}
	}
	throw last instanceof Error ? last : /* @__PURE__ */ new Error("Không tải được luồng video");
}
async function probe(url, headers, signal) {
	const timed = signal ? AbortSignal.any([signal, AbortSignal.timeout(8e3)]) : AbortSignal.timeout(8e3);
	const res = await fetch(url, {
		headers: withRange(headers, 0, 1023),
		signal: timed,
		redirect: "follow"
	});
	if (res.status === 206) {
		const cr = res.headers.get("content-range") ?? "";
		const total = cr.includes("/") ? Number(cr.split("/")[1]) : Number(res.headers.get("content-length") || 0);
		await res.arrayBuffer();
		return {
			url,
			length: Number.isFinite(total) ? total : 0,
			acceptRanges: true,
			type: res.headers.get("content-type") || "video/mp4"
		};
	}
	if (res.status === 200) {
		const length = Number(res.headers.get("content-length") || 0);
		try {
			await res.body?.cancel();
		} catch {}
		return {
			url,
			length,
			acceptRanges: false,
			type: res.headers.get("content-type") || "video/mp4"
		};
	}
	try {
		await res.body?.cancel();
	} catch {}
	throw new Error(`CDN ${res.status}`);
}
async function raceUrl(urls, headers, signal) {
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
function rangeStream(urls, headers, length, signal) {
	const parts = [];
	for (let start = 0; start < length; start += CHUNK) parts.push({
		start,
		end: Math.min(length, start + CHUNK) - 1
	});
	let next = 0;
	let launched = 0;
	const cache = /* @__PURE__ */ new Map();
	const ensure = () => {
		while (launched - next < WINDOW && launched < parts.length) {
			const i = launched;
			launched += 1;
			const part = parts[i];
			cache.set(i, fetchRangeRetry(urls, headers, part.start, part.end, signal));
		}
	};
	return new ReadableStream({
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
		}
	});
}
async function turboCdn(candidates, headers, signal) {
	const expanded = unique(candidates.flatMap(expandMirrors)).slice(0, PROBE_CAP);
	if (expanded.length === 0) throw new Error("Không có địa chỉ video hợp lệ");
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
			redirect: "follow"
		});
		if (!res.ok || !res.body) throw new Error(`Máy chủ nguồn trả ${res.status}`);
		const length = winner.length || Number(res.headers.get("content-length") || 0);
		return {
			body: res.body,
			length,
			contentType: res.headers.get("content-type") || winner.type,
			mode: "single"
		};
	}
	return {
		body: rangeStream(urls, headers, winner.length, signal),
		length: winner.length,
		contentType: winner.type,
		mode: "range"
	};
}
function asciiFallback(name) {
	const ascii = name.replace(/[^\x20-\x7E]/g, "_");
	return ascii.length > 0 ? ascii : "video.mp4";
}
function disposition(filename) {
	return `attachment; filename="${asciiFallback(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
var Route = createFileRoute("/api/download")({ server: { handlers: { POST: async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
	}
	const bvid = body.bvid ?? "";
	const cid = body.cid ?? "";
	if (!/^BV[0-9A-Za-z]{10}$/.test(bvid) || !/^\d+$/.test(cid)) return Response.json({ error: "Thiếu mã BV hoặc cid hợp lệ" }, { status: 400 });
	const qn = Number(body.qn ?? 64);
	if (!Number.isFinite(qn) || qn < 16 || qn > 127) return Response.json({ error: "Chất lượng không hợp lệ" }, { status: 400 });
	try {
		const play = await fetchPlayurl({
			bvid,
			cid,
			qn,
			sessdata: body.sessdata?.trim() || void 0
		});
		const stream = pickStream(play, qn);
		const wantAudio = body.stream === "audio";
		const urls = wantAudio ? stream.audioUrls : stream.videoUrls;
		if (urls.length === 0) return Response.json({ error: "Không có luồng âm thanh / hình tương ứng" }, { status: 404 });
		const turbo = await turboCdn(urls, biliHeaders({
			referer: `https://www.bilibili.com/video/${bvid}`,
			sessdata: body.sessdata?.trim() || void 0,
			accept: "*/*"
		}), request.signal);
		const baseName = makeFilename({
			title: body.title || bvid,
			part: body.part || body.title || bvid,
			page: body.page ?? 1,
			pages: body.pages ?? 1,
			bvid
		});
		const filename = stream.type === "dash" ? baseName.replace(/\.mp4$/i, wantAudio ? ".audio.m4s" : ".video.m4s") : baseName;
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
		return new Response(turbo.body, {
			status: 200,
			headers
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Tải thất bại";
		return Response.json({ error: message }, { status: 502 });
	}
} } } });
var rootRouteChildren = {
	IndexRoute: Route$2.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$3
	}),
	ApiCoverRoute: Route$1.update({
		id: "/api/cover",
		path: "/api/cover",
		getParentRoute: () => Route$3
	}),
	ApiDownloadRoute: Route.update({
		id: "/api/download",
		path: "/api/download",
		getParentRoute: () => Route$3
	})
};
var routeTree = Route$3._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getRouter, router_CgvhciBf_exports as t };
