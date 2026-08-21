import { i as __toESM } from "../_runtime.mjs";
import { h as require_react, m as require_jsx_runtime, n as CheckboxIndicator, t as Checkbox$1, u as Slot } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as formatBytes, c as formatSpeed, o as formatCount, r as cn, s as formatDuration } from "./resolve.server-BnY_n0Dg.mjs";
import { a as object, i as number, n as boolean, o as string, t as _enum } from "../_libs/zod.mjs";
import { a as Settings2, c as FolderOpen, d as Check, i as SquareStack, l as Download, o as Search, r as Trash2, s as LoaderCircle, t as X, u as Clock3 } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as Root, t as Indicator } from "../_libs/radix-ui__react-progress.mjs";
import { t as Root$1 } from "../_libs/radix-ui__react-label.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BqQwNOG-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-elevated text-fg border border-border hover:border-border-strong",
			ghost: "text-muted hover:text-fg hover:bg-elevated",
			danger: "bg-danger/15 text-danger hover:bg-danger/25"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 px-3 text-xs",
			lg: "h-12 px-5",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
var DB_NAME = "framebox-idb";
var STORE = "kv";
var HANDLE_KEY = "save-folder";
function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function idbGet(key) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}
async function idbSet(key, value) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(value, key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
async function idbDel(key) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
var cached = null;
function canPickFolder() {
	return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}
function getCachedFolder() {
	return cached;
}
async function pickFolder() {
	if (!canPickFolder()) throw new Error("Trình duyệt không hỗ trợ chọn thư mục. Hãy dùng Chrome hoặc Edge.");
	const handle = await window.showDirectoryPicker({
		id: "framebox-save",
		mode: "readwrite",
		startIn: "videos"
	});
	cached = handle;
	await idbSet(HANDLE_KEY, handle);
	return handle;
}
async function restoreFolder() {
	try {
		const handle = await idbGet(HANDLE_KEY);
		if (!handle) return null;
		cached = handle;
		return handle;
	} catch {
		return null;
	}
}
async function ensureFolderWrite(handle) {
	const opts = { mode: "readwrite" };
	if (await handle.queryPermission(opts) === "granted") return true;
	return await handle.requestPermission(opts) === "granted";
}
async function clearFolder() {
	cached = null;
	try {
		await idbDel(HANDLE_KEY);
	} catch {}
}
async function writeToFolder(handle, filename, res, onProgress, signal) {
	const writable = await (await handle.getFileHandle(filename, { create: true })).createWritable();
	const total = Number(res.headers.get("content-length") || 0);
	try {
		if (!res.body) {
			const buf = await res.arrayBuffer();
			await writable.write(buf);
			onProgress({
				received: buf.byteLength,
				total: buf.byteLength
			});
			await writable.close();
			return;
		}
		const reader = res.body.getReader();
		let received = 0;
		while (true) {
			if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				await writable.write(value);
				received += value.byteLength;
				onProgress({
					received,
					total
				});
			}
		}
		await writable.close();
	} catch (err) {
		try {
			await writable.abort();
		} catch {}
		throw err;
	}
}
var SETTINGS_KEY = "framebox-settings-v1";
var HISTORY_KEY = "framebox-history-v1";
var defaultSettings = {
	sessdata: "",
	quality: 64,
	expandPages: true,
	spaceLimit: 20,
	folderName: ""
};
function loadSettings() {
	if (typeof window === "undefined") return defaultSettings;
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return defaultSettings;
		return {
			...defaultSettings,
			...JSON.parse(raw)
		};
	} catch {
		return defaultSettings;
	}
}
function loadHistory() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
var useDownloader = create((set, get) => ({
	settings: defaultSettings,
	queue: [],
	history: [],
	resolving: false,
	downloading: false,
	setSettings: (patch) => {
		const settings = {
			...get().settings,
			...patch
		};
		set({ settings });
		if (typeof window !== "undefined") localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	},
	addVideos: (videos) => {
		const existing = new Set(get().queue.map((q) => q.id));
		const next = videos.filter((v) => !existing.has(v.id)).map((v) => ({
			...v,
			selected: true,
			status: "idle",
			progress: 0,
			received: 0,
			total: 0
		}));
		set({ queue: [...get().queue, ...next] });
		return next.length;
	},
	toggle: (id) => set({ queue: get().queue.map((q) => q.id === id ? {
		...q,
		selected: !q.selected
	} : q) }),
	toggleAll: (selected) => set({ queue: get().queue.map((q) => ({
		...q,
		selected
	})) }),
	remove: (id) => set({ queue: get().queue.filter((q) => q.id !== id) }),
	clearQueue: () => set({ queue: [] }),
	removeDone: () => set({ queue: get().queue.filter((q) => q.status !== "done") }),
	patchItem: (id, patch) => set({ queue: get().queue.map((q) => q.id === id ? {
		...q,
		...patch
	} : q) }),
	selected: () => get().queue.filter((q) => q.selected),
	recordHistory: (item) => {
		const history = [{
			id: item.id,
			title: item.title,
			bvid: item.bvid,
			at: Date.now()
		}, ...get().history.filter((h) => h.id !== item.id)].slice(0, 40);
		set({ history });
		if (typeof window !== "undefined") localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
	},
	clearHistory: () => {
		set({ history: [] });
		if (typeof window !== "undefined") localStorage.removeItem(HISTORY_KEY);
	},
	setResolving: (resolving) => set({ resolving }),
	setDownloading: (downloading) => set({ downloading })
}));
function hydrateDownloader() {
	useDownloader.setState({
		settings: loadSettings(),
		history: loadHistory()
	});
}
function pickErrorMessage(err) {
	if (err instanceof DOMException && err.name === "AbortError") return "";
	const name = err instanceof DOMException ? err.name : "";
	const raw = err instanceof Error ? err.message : "";
	if (name === "SecurityError" || name === "NotAllowedError" || /not allowed|cross-origin|iframe|permissions policy/i.test(raw)) return "Trình duyệt đang chặn chọn thư mục tại đây. Hãy dùng Chrome hoặc Edge, mở Framebox ở tab riêng — hoặc để trống, file sẽ vào thư mục Tải xuống.";
	return raw || "Không chọn được thư mục";
}
async function chooseSaveFolder() {
	const { setSettings } = useDownloader.getState();
	try {
		const handle = await pickFolder();
		setSettings({ folderName: handle.name });
		toast.success(`Sẽ lưu vào thư mục «${handle.name}»`);
		return true;
	} catch (err) {
		const msg = pickErrorMessage(err);
		if (!msg) return false;
		toast.error(msg);
		return false;
	}
}
function FolderPicker({ compact = false, variant }) {
	const { settings, setSettings } = useDownloader();
	const [supported, setSupported] = (0, import_react.useState)(true);
	const name = settings.folderName;
	const mode = variant ?? (compact ? "compact" : "settings");
	(0, import_react.useEffect)(() => {
		setSupported(canPickFolder());
	}, []);
	function clear() {
		clearFolder();
		setSettings({ folderName: "" });
		toast.message("Đã bỏ thư mục. File sẽ tải vào thư mục Tải xuống mặc định.");
	}
	if (mode === "compact") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => void chooseSaveFolder(),
		className: cn("flex h-10 min-w-0 max-w-56 shrink items-center gap-2 rounded-full border px-3 text-xs", name ? "border-border-strong text-fg" : "border-border text-muted hover:text-fg"),
		title: name ? `Thư mục: ${name}` : "Chọn thư mục lưu",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "truncate",
			children: name ? `Lưu: ${name}` : "Chọn thư mục lưu"
		})]
	});
	if (mode === "banner") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-4 rounded-lg border border-border bg-surface p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-3 sm:flex-row sm:items-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated text-accent",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, { className: "size-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: "Thư mục lưu video"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-xs text-muted",
						children: name ? `Đang ghi vào «${name}»` : supported ? "Chưa chọn — bấm để chọn folder trên máy" : "Trình duyệt không cho chọn folder — file vào Tải xuống"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 gap-2",
				children: [name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					onClick: clear,
					children: "Bỏ"
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: name ? "secondary" : "default",
					onClick: () => void chooseSaveFolder(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, {}), name ? "Đổi thư mục" : "Chọn thư mục"]
				})]
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: "Thư mục lưu"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "secondary",
					className: "min-w-0 flex-1 justify-start",
					onClick: () => void chooseSaveFolder(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderOpen, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: name || "Chọn thư mục trên máy"
					})]
				}), name ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: clear,
					children: "Bỏ"
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-relaxed text-muted",
				children: supported ? "Chọn một thư mục trên máy — mọi video sẽ ghi thẳng vào đó, không hỏi từng file." : "Trình duyệt này không cho chọn thư mục. File sẽ lưu vào thư mục Tải xuống."
			})
		]
	});
}
var Dialog = Dialog$1;
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-50 bg-bg/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
		...props
	});
}
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-4 right-4 z-50 mx-auto max-w-md -translate-y-1/2", "rounded-xl border border-border bg-surface p-6 shadow-2xl", "data-[state=open]:animate-in data-[state=closed]:animate-out", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
			className: "absolute top-4 right-4 rounded-sm p-1 text-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Đóng"
			})]
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-5 space-y-1", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-xl font-medium tracking-tight text-fg", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("text-sm text-muted", className),
		...props
	});
}
function HistoryDialog({ open, onOpenChange }) {
	const { history, clearHistory } = useDownloader();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Lịch sử tải" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Các tác vụ vừa xong trên máy này, không đồng bộ sang thiết bị khác." })] }),
			history.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "py-8 text-center text-sm text-muted",
				children: "Chưa có lượt tải nào."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-72 space-y-2 overflow-y-auto",
				children: history.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-md border border-border bg-elevated px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-sm text-fg",
						children: h.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-0.5 font-mono text-xs text-muted",
						children: [
							h.bvid,
							" · ",
							new Date(h.at).toLocaleString("vi-VN")
						]
					})]
				}, `${h.id}-${h.at}`))
			}),
			history.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4 flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					onClick: clearHistory,
					children: "Xóa lịch sử"
				})
			}) : null
		] })
	});
}
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className,
		"aria-hidden": "true",
		fill: "none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "3",
				y: "5",
				width: "26",
				height: "22",
				rx: "4",
				className: "stroke-accent",
				strokeWidth: "1.6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "8",
				y: "9",
				width: "16",
				height: "14",
				rx: "2",
				className: "fill-accent/15 stroke-accent",
				strokeWidth: "1.2"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M14 13.2v5.6l5.2-2.8-5.2-2.8Z",
				className: "fill-accent"
			})
		]
	});
}
function CoverImage({ src, alt, className }) {
	const proxied = src ? `/api/cover?u=${encodeURIComponent(src)}` : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative overflow-hidden bg-elevated", className),
		children: proxied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: proxied,
			alt,
			referrerPolicy: "no-referrer",
			className: "size-full object-cover"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-full bg-elevated" })
	});
}
function Badge({ className, tone = "muted", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", tone === "muted" && "bg-elevated text-muted border border-border", tone === "accent" && "bg-accent/15 text-accent", tone === "success" && "bg-success/15 text-success", tone === "warn" && "bg-warn/15 text-warn", tone === "danger" && "bg-danger/15 text-danger", className),
		...props
	});
}
function Checkbox({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
		className: cn("grid size-5 shrink-0 place-items-center rounded-xs border border-border-strong bg-elevated", "data-[state=checked]:bg-accent data-[state=checked]:border-accent data-[state=checked]:text-accent-fg", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50", "disabled:opacity-40", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
			className: "size-3.5",
			strokeWidth: 2.4
		}) })
	});
}
function Progress({ className, value, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
		className: cn("relative h-1.5 w-full overflow-hidden rounded-full bg-elevated", className),
		value,
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Indicator, {
			className: "size-full bg-accent transition-transform duration-150 ease-out",
			style: { transform: `translateX(-${100 - (value ?? 0)}%)` }
		})
	});
}
var MAP = [
	[/账号未登录/, "Chưa đăng nhập Bilibili — thêm SESSDATA trong Cài đặt"],
	[/啥都木有/, "Không tìm thấy video này"],
	[/请求过于频繁/, "Bilibili đang giới hạn tần suất, thử lại sau"],
	[/风控校验失败/, "Bilibili chặn yêu cầu, thử lại sau"],
	[/哔哩哔哩接口返回了非 JSON/, "Bilibili trả về lỗi (có thể bị chặn), thử lại sau"],
	[/无法获取 WBI/, "Không lấy được khóa tìm kiếm, thử lại sau"],
	[/无法获取播放地址/, "Không lấy được đường dẫn tải"],
	[/没有可用的视频流/, "Không có luồng video khả dụng"],
	[/无效的地址/, "Địa chỉ không hợp lệ"],
	[/不支持的协议/, "Giao thức không hỗ trợ"],
	[/拒绝代理非哔哩哔哩/, "Chỉ tải được video Bilibili"],
	[/无效请求/, "Yêu cầu không hợp lệ"],
	[/画质无效/, "Chất lượng không hợp lệ"],
	[/缺少有效的 BV/, "Thiếu mã BV hoặc cid hợp lệ"],
	[/没有对应的音视频流/, "Không có luồng âm thanh / hình tương ứng"],
	[/源站返回/, "Máy chủ nguồn trả lỗi"],
	[/下载失败/, "Tải thất bại"],
	[/解析失败/, "Phân tích thất bại"],
	[/条目解析失败/, "Không đọc được mục này"],
	[/没有识别到有效/, "Không nhận ra liên kết, mã BV hoặc từ khóa"],
	[/已达到单次/, "Đã đạt giới hạn một lần, hãy tách thành nhiều đợt"],
	[/暂未解析到投稿/, "Chưa lấy được video từ kênh này — thử tìm kiếm hoặc dán liên kết"],
	[/没有搜到/, "Không tìm thấy kết quả"],
	[/接口错误/, "Lỗi API Bilibili"]
];
function viError(message) {
	for (const [re, vi] of MAP) if (re.test(message)) return vi;
	return message;
}
var KIND_LABEL = {
	video: "Video",
	bangumi: "Anime",
	space: "Kênh UP",
	search: "Tìm kiếm",
	season: "Tuyển tập",
	favorite: "Yêu thích",
	short: "Link ngắn"
};
function statusTone(item) {
	if (item.status === "done") return "success";
	if (item.status === "error") return "danger";
	if (item.status === "downloading") return "accent";
	if (item.status === "waiting") return "warn";
	return "muted";
}
function statusLabel(item) {
	if (item.status === "done") return "Xong";
	if (item.status === "error") return "Lỗi";
	if (item.status === "downloading") return "Đang tải";
	if (item.status === "waiting") return "Chờ";
	return KIND_LABEL[item.sourceKind] ?? item.sourceLabel;
}
function QueueList() {
	const { queue, toggle, remove } = useDownloader();
	if (queue.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-2",
		children: queue.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			className: "rounded-lg border border-border bg-surface p-3 sm:p-3.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-start pt-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
							checked: item.selected,
							onCheckedChange: () => toggle(item.id),
							"aria-label": `Chọn ${item.title}`
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CoverImage, {
						src: item.cover,
						alt: "",
						className: "hidden aspect-video w-32 shrink-0 rounded-sm sm:block"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-medium text-fg",
										children: item.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 truncate text-xs text-muted",
										children: [
											item.owner,
											item.pages > 1 ? ` · P${item.page}/${item.pages} ${item.part}` : "",
											item.duration ? ` · ${formatDuration(item.duration)}` : "",
											item.views ? ` · ${formatCount(item.views)} lượt xem` : ""
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										tone: statusTone(item),
										children: statusLabel(item)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "icon",
										className: "size-9 text-muted",
										onClick: () => remove(item.id),
										"aria-label": "Gỡ khỏi hàng đợi",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {})
									})]
								})]
							}),
							item.status === "downloading" || item.progress > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, { value: Math.round(item.progress * 100) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs tabular-nums text-muted",
									children: [
										item.received === 0 && item.status === "downloading" ? "Đang kết nối máy chủ…" : `${formatBytes(item.received)}${item.total ? ` / ${formatBytes(item.total)}` : ""}`,
										item.status === "downloading" && item.startedAt && item.received > 0 ? ` · ${formatSpeed(item.received / Math.max(.4, (Date.now() - item.startedAt) / 1e3))}` : "",
										item.qualityLabel ? ` · ${item.qualityLabel}` : ""
									]
								})]
							}) : null,
							item.status === "error" && item.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-danger",
								children: viError(item.error)
							}) : null
						]
					})
				]
			})
		}, item.id))
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-11 w-full rounded-sm border border-border bg-elevated px-3 text-sm text-fg placeholder:text-subtle", "transition-[border-color,box-shadow] duration-150 ease-out", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-border-strong", "disabled:opacity-40", className),
		...props
	});
}
function Label({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root$1, {
		className: cn("text-sm font-medium text-fg", className),
		...props
	});
}
function Switch({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		className: cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-elevated transition-colors duration-150", "data-[state=checked]:bg-accent data-[state=checked]:border-accent", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50", "disabled:opacity-40", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block size-5 translate-x-0.5 rounded-full bg-fg shadow-sm transition-transform duration-150", "data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg") })
	});
}
var QUALITIES = [
	{
		qn: 16,
		label: "360P",
		hint: "Mượt"
	},
	{
		qn: 32,
		label: "480P",
		hint: "Nét"
	},
	{
		qn: 64,
		label: "720P",
		hint: "HD"
	},
	{
		qn: 80,
		label: "1080P",
		hint: "Full HD"
	}
];
function SettingsDialog({ open, onOpenChange }) {
	const { settings, setSettings } = useDownloader();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Cài đặt" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Chỉ lưu trên trình duyệt này, không gửi mật khẩu đi đâu." })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderPicker, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "sessdata",
								children: "SESSDATA (tuỳ chọn)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "sessdata",
								type: "password",
								autoComplete: "off",
								placeholder: "Cookie SESSDATA từ Bilibili",
								value: settings.sessdata,
								onChange: (e) => setSettings({ sessdata: e.target.value.trim() })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs leading-relaxed text-muted",
								children: "Điền để thử 1080P trở lên và một số nội dung hội viên. Mở Bilibili → Công cụ nhà phát triển → Application → Cookies, copy SESSDATA."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Chất lượng mặc định" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-4 gap-2",
								children: QUALITIES.map((q) => {
									const active = settings.quality === q.qn;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setSettings({ quality: q.qn }),
										className: active ? "h-11 rounded-sm bg-accent text-accent-fg text-xs font-medium" : "h-11 rounded-sm border border-border bg-elevated text-muted text-xs hover:text-fg",
										children: q.label
									}, q.qn);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "Chưa đăng nhập thường tối đa 720P. Nét hơn cần cookie."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-4 rounded-md border border-border bg-elevated px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-medium",
							children: "Tách các tập (P)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "Video nhiều phần sẽ vào hàng đợi từng tập"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: settings.expandPages,
							onCheckedChange: (v) => setSettings({ expandPages: v })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "spaceLimit",
							children: "Số video lấy từ trang UP"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "spaceLimit",
							type: "number",
							min: 1,
							max: 50,
							value: settings.spaceLimit,
							onChange: (e) => setSettings({ spaceLimit: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					onClick: () => onOpenChange(false),
					children: "Xong"
				})
			})
		] })
	});
}
function Textarea({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		suppressHydrationWarning: true,
		className: cn("flex min-h-36 w-full rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-fg placeholder:text-subtle", "transition-[border-color,box-shadow] duration-150 ease-out resize-y", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-border-strong", "disabled:opacity-40", className),
		...props
	});
}
function sanitize(name) {
	return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}
async function saveBlob(blob, filename) {
	const href = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = href;
	a.download = sanitize(filename);
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(href), 4e3);
}
async function pumpToBlob(res, filename, onProgress, signal) {
	const total = Number(res.headers.get("content-length") || 0);
	if (!res.body) {
		const blob = await res.blob();
		await saveBlob(blob, filename);
		onProgress({
			received: blob.size,
			total: blob.size
		});
		return;
	}
	const reader = res.body.getReader();
	const chunks = [];
	let received = 0;
	while (true) {
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
		const { done, value } = await reader.read();
		if (done) break;
		if (value) {
			chunks.push(value);
			received += value.byteLength;
			onProgress({
				received,
				total
			});
		}
	}
	await saveBlob(new Blob(chunks), filename);
}
async function downloadQueueItem(item, qn, sessdata, onProgress, signal, folder) {
	const payload = {
		bvid: item.bvid,
		cid: item.cid,
		qn,
		title: item.title,
		part: item.part,
		page: item.page,
		pages: item.pages,
		sessdata
	};
	const res = await fetch("/api/download", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		cache: "no-store",
		signal
	});
	if (!res.ok) {
		let message = `Tải thất bại (${res.status})`;
		try {
			const json = await res.json();
			if (json.error) message = viError(json.error);
		} catch {}
		throw new Error(message);
	}
	const type = res.headers.get("X-Stream-Type") ?? "mp4";
	const quality = res.headers.get("X-Quality") ?? "";
	const hasAudio = res.headers.get("X-Has-Audio") === "1";
	const filename = sanitize(type === "dash" ? `${item.title} [${item.bvid}].video.m4s` : `${item.title}${item.pages > 1 ? ` P${item.page}` : ""} [${item.bvid}].mp4`);
	if (folder) await writeToFolder(folder, filename, res, onProgress, signal);
	else await pumpToBlob(res, filename, onProgress, signal);
	if (type === "dash" && hasAudio) {
		const audioRes = await fetch("/api/download", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...payload,
				stream: "audio"
			}),
			cache: "no-store",
			signal
		});
		if (audioRes.ok) {
			const audioName = sanitize(`${item.title} [${item.bvid}].audio.m4s`);
			if (folder) await writeToFolder(folder, audioName, audioRes, onProgress, signal);
			else await pumpToBlob(audioRes, audioName, onProgress, signal);
		}
	}
	return {
		type,
		quality
	};
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var resolveSchema = object({
	raw: string().min(1).max(8e3),
	mode: _enum(["links", "search"]),
	sessdata: string().max(200).optional(),
	expandPages: boolean(),
	spaceLimit: number().int().min(1).max(50)
});
var resolveVideosFn = createServerFn({ method: "POST" }).validator(resolveSchema).handler(createSsrRpc("80f5de3fad1910b6a1e161673474cdb89f70a0ff55da87b6e673662fcedf2a54"));
var playSchema = object({
	bvid: string().regex(/^BV[0-9A-Za-z]{10}$/),
	cid: string().regex(/^\d+$/),
	qn: number().int().min(16).max(127),
	title: string().max(200),
	part: string().max(200).optional(),
	page: number().int().min(1).optional(),
	pages: number().int().min(1).optional(),
	sessdata: string().max(200).optional()
});
createServerFn({ method: "POST" }).validator(playSchema).handler(createSsrRpc("20295c5b6fadfbee69785044cafa78a9852dbc84dbf2ffac78d3da81726cdd04"));
var EXAMPLES = [
	{
		label: "Video mẫu",
		value: "https://www.bilibili.com/video/BV1ztbY6PErp",
		mode: "links"
	},
	{
		label: "Mã BV",
		value: "BV1ztbY6PErp",
		mode: "links"
	},
	{
		label: "Tìm mèo con",
		value: "cat",
		mode: "search"
	}
];
function Home() {
	const [mode, setMode] = (0, import_react.useState)("links");
	const [raw, setRaw] = (0, import_react.useState)("");
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [historyOpen, setHistoryOpen] = (0, import_react.useState)(false);
	const abortRef = (0, import_react.useRef)(null);
	const { settings, queue, resolving, downloading, addVideos, toggleAll, clearQueue, removeDone, patchItem, recordHistory, setResolving, setDownloading, setSettings } = useDownloader();
	(0, import_react.useEffect)(() => {
		hydrateDownloader();
		restoreFolder().then((handle) => {
			if (handle?.name) useDownloader.getState().setSettings({ folderName: handle.name });
		});
	}, []);
	const selected = (0, import_react.useMemo)(() => queue.filter((q) => q.selected && q.status !== "downloading"), [queue]);
	const selectedCount = queue.filter((q) => q.selected).length;
	const allSelected = queue.length > 0 && selectedCount === queue.length;
	async function handleResolve() {
		if (!raw.trim()) {
			toast.error(mode === "search" ? "Hãy nhập từ khóa" : "Hãy dán liên kết hoặc mã BV");
			return;
		}
		setResolving(true);
		try {
			const result = await resolveVideosFn({ data: {
				raw,
				mode,
				sessdata: settings.sessdata || void 0,
				expandPages: settings.expandPages,
				spaceLimit: settings.spaceLimit
			} });
			const added = addVideos(result.videos);
			if (added === 0 && result.videos.length > 0) toast.message("Các video này đã nằm trong hàng đợi");
			else if (added > 0) toast.success(`Đã thêm ${added} video`);
			for (const w of result.warnings) {
				const msg = viError(w.message);
				toast.warning(w.source ? `${w.source}: ${msg}` : msg);
			}
			if (added === 0 && result.videos.length === 0 && result.warnings.length === 0) toast.error("Không phân tích được video nào");
		} catch (err) {
			toast.error(viError(err instanceof Error ? err.message : "Phân tích thất bại"));
		} finally {
			setResolving(false);
		}
	}
	async function handleDownload() {
		const jobs = useDownloader.getState().queue.filter((q) => q.selected);
		if (jobs.length === 0) {
			toast.error("Hãy tick video muốn tải");
			return;
		}
		let folder = getCachedFolder();
		if (!folder && canPickFolder() && !settings.folderName) {
			if (await chooseSaveFolder()) folder = getCachedFolder();
		}
		if (folder) {
			if (!await ensureFolderWrite(folder)) {
				toast.error("Chưa có quyền ghi vào thư mục. Hãy chọn lại.");
				folder = null;
			}
		}
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setDownloading(true);
		let ok = 0;
		let fail = 0;
		for (const job of jobs) {
			if (controller.signal.aborted) break;
			patchItem(job.id, {
				status: "waiting",
				error: void 0
			});
		}
		const PARALLEL = Math.min(3, jobs.length);
		let cursor = 0;
		async function worker() {
			while (true) {
				if (controller.signal.aborted) return;
				const index = cursor;
				cursor += 1;
				if (index >= jobs.length) return;
				const job = jobs[index];
				const current = useDownloader.getState().queue.find((q) => q.id === job.id);
				if (!current) continue;
				patchItem(job.id, {
					status: "downloading",
					progress: 0,
					received: 0,
					total: 0,
					startedAt: Date.now()
				});
				try {
					const result = await downloadQueueItem(current, settings.quality, settings.sessdata || void 0, ({ received, total }) => {
						patchItem(job.id, {
							received,
							total,
							progress: total > 0 ? Math.min(1, received / total) : 0
						});
					}, controller.signal, folder);
					patchItem(job.id, {
						status: "done",
						progress: 1,
						qualityLabel: result.quality
					});
					recordHistory(current);
					ok += 1;
					if (result.type === "dash") toast.message("Video này tách âm/hình — đã lưu hai file riêng");
				} catch (err) {
					if (err instanceof DOMException && err.name === "AbortError") return;
					fail += 1;
					patchItem(job.id, {
						status: "error",
						error: viError(err instanceof Error ? err.message : "Tải thất bại")
					});
				}
			}
		}
		await Promise.all(Array.from({ length: PARALLEL }, () => worker()));
		setDownloading(false);
		if (controller.signal.aborted) return;
		if (ok && !fail) {
			const where = folder?.name ? ` vào «${folder.name}»` : "";
			toast.success(`Đã xong ${ok} file${where}`);
		} else if (ok || fail) toast.message(`Xong ${ok}, lỗi ${fail}`);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grain relative min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-14 max-w-5xl items-center justify-between px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "size-7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-base font-medium tracking-tight",
								children: "Framebox"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hidden text-xs text-muted sm:block",
								children: "Tải hàng loạt video Bilibili"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon",
							"aria-label": "Lịch sử tải",
							onClick: () => setHistoryOpen(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock3, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "icon",
							"aria-label": "Cài đặt",
							onClick: () => setSettingsOpen(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, {})
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto w-full max-w-5xl px-4 pb-36 pt-8 sm:pt-12",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "stagger-in max-w-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium tracking-[0.18em] text-muted uppercase",
								children: "Framebox"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "mt-2 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl",
								children: [
									"Dán liên kết vào,",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"tải cả loạt một lần."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base",
								children: "Nhận liên kết video, mã BV / av, link b23, anime, tuyển tập, yêu thích, trang UP, hoặc tìm theo từ khóa. Chọn thư mục lưu trên máy rồi tải hàng loạt."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-8 rounded-xl border border-border bg-surface p-4 sm:p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1 rounded-md bg-elevated p-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setMode("links"),
									className: cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-sm text-sm transition-colors duration-150", mode === "links" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareStack, { className: "size-4" }), "Liên kết / mã"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setMode("search"),
									className: cn("flex h-10 flex-1 items-center justify-center gap-2 rounded-sm text-sm transition-colors duration-150", mode === "search" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4" }), "Tìm kiếm"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "paste",
								children: mode === "search" ? "Từ khóa tìm kiếm" : "Liên kết video"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "paste",
								className: "mt-4 min-h-32 font-mono text-sm",
								placeholder: mode === "search" ? "Nhập từ khóa, ví dụ: mèo con" : "Dán một hoặc nhiều liên kết, mỗi dòng một cái.\nVí dụ: https://www.bilibili.com/video/BVxxxx\nhoặc mã BV, av, link b23.tv, anime, trang UP",
								value: raw,
								onChange: (e) => setRaw(e.target.value),
								onKeyDown: (e) => {
									if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
										e.preventDefault();
										handleResolve();
									}
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: EXAMPLES.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setMode(ex.mode);
										setRaw(ex.value);
									},
									className: "h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg",
									children: ex.label
								}, ex.label))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-subtle",
									children: "Ctrl / ⌘ + Enter để phân tích · Chỉ dùng cá nhân, tôn trọng bản quyền"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									onClick: () => void handleResolve(),
									disabled: resolving,
									className: "w-full sm:w-auto",
									children: [resolving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {}), resolving ? "Đang phân tích" : mode === "search" ? "Tìm và thêm" : "Phân tích vào hàng đợi"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderPicker, { variant: "banner" }),
					queue.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-3 flex items-end justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-display text-xl font-medium",
								children: "Hàng đợi"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted",
								children: [
									queue.length,
									" video · đã chọn ",
									selectedCount
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: () => toggleAll(!allSelected),
										children: allSelected ? "Bỏ chọn" : "Chọn hết"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: removeDone,
										children: "Xóa đã xong"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: clearQueue,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {}), "Xóa hết"]
									})
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueueList, {})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "mt-10 grid gap-3 sm:grid-cols-3",
						children: [
							{
								title: "Nhiều cách nhập",
								body: "Liên kết, mã BV, link ngắn, anime, tuyển tập, yêu thích, trang UP hoặc từ khóa."
							},
							{
								title: "Chọn thư mục lưu",
								body: "Chọn một folder trên máy — cả loạt file ghi thẳng vào đó."
							},
							{
								title: "Chọn chất lượng",
								body: "Mặc định 720P. Thêm SESSDATA để thử nét hơn và nội dung hội viên."
							}
						].map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "rounded-lg border border-border bg-surface px-4 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-display text-base font-medium",
								children: card.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm leading-relaxed text-muted",
								children: card.body
							})]
						}, card.title))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 overflow-x-auto",
						children: [QUALITIES.map((q) => {
							const active = settings.quality === q.qn;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSettings({ quality: q.qn }),
								className: cn("h-10 shrink-0 rounded-full px-3 text-xs font-medium", active ? "bg-accent text-accent-fg" : "border border-border text-muted hover:text-fg"),
								children: q.label
							}, q.qn);
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FolderPicker, { compact: true })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "lg",
						className: "w-full sm:w-auto",
						disabled: downloading || selected.length === 0,
						onClick: () => void handleDownload(),
						children: [downloading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), downloading ? "Đang lưu" : selectedCount ? `Tải ${selectedCount} đã chọn` : "Tải đã chọn"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsDialog, {
				open: settingsOpen,
				onOpenChange: setSettingsOpen
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HistoryDialog, {
				open: historyOpen,
				onOpenChange: setHistoryOpen
			})
		]
	});
}
//#endregion
export { Home as component };
