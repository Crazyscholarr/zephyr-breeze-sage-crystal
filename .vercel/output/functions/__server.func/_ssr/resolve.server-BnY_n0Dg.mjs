import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { createHash, randomUUID } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/resolve.server-BnY_n0Dg.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatDuration(seconds) {
	if (!Number.isFinite(seconds) || seconds < 0) return "—";
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const r = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
	return `${m}:${String(r).padStart(2, "0")}`;
}
function parseDurationText(text) {
	if (!text) return 0;
	const parts = text.trim().split(":").map((p) => Number(p));
	if (parts.some((n) => Number.isNaN(n))) return 0;
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	if (parts.length === 1) return parts[0];
	return 0;
}
function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes === 0) return "0 B";
	const units = [
		"B",
		"KB",
		"MB",
		"GB"
	];
	let n = bytes;
	let i = 0;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i += 1;
	}
	return `${n >= 10 || i === 0 ? n.toFixed(0) : n.toFixed(1)} ${units[i]}`;
}
function formatSpeed(bytesPerSec) {
	if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return "";
	return `${formatBytes(bytesPerSec)}/s`;
}
function formatCount(n) {
	if (!Number.isFinite(n) || n < 0) return "0";
	if (n < 1e3) return String(n);
	if (n < 1e6) return `${(n / 1e3).toFixed(n < 1e4 ? 1 : 0)} N`;
	if (n < 1e9) return `${(n / 1e6).toFixed(n < 1e7 ? 1 : 0)} Tr`;
	return `${(n / 1e9).toFixed(1)} Tỷ`;
}
function sanitizeFilename(name) {
	return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 140);
}
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
var BV_RE = /\b(BV[0-9A-Za-z]{10})\b/;
var AV_RE = /\b[Aa][Vv](\d{1,16})\b/;
var B23_RE = /https?:\/\/(?:b23\.tv|bili2233\.cn)\/[A-Za-z0-9]+\/?/i;
var SPACE_RE = /space\.bilibili\.com\/(\d+)/i;
var EP_RE = /(?:bangumi\/play\/)?ep(\d+)/i;
var SS_RE = /(?:bangumi\/play\/)?ss(\d+)/i;
var SEASON_RE = /(?:collectiondetail|seriesdetail).*?[?&](?:sid|season_id)=(\d+)/i;
var FAV_RE = /(?:favlist\?fid=|medialist\/detail\/ml|\/ml)(\d+)/i;
var VIDEO_PATH_RE = /bilibili\.com\/video\/(BV[0-9A-Za-z]{10}|av\d+)/i;
function splitTokens(input) {
	return input.split(/[\s,;，；\n\r\t]+/).map((s) => s.trim()).filter(Boolean);
}
function parseInput(raw, mode) {
	const text = raw.trim();
	if (!text) return [];
	if (mode === "search") {
		const unique = /* @__PURE__ */ new Map();
		for (const line of text.split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
			const key = `keyword:${line}`;
			if (!unique.has(key)) unique.set(key, {
				kind: "keyword",
				keyword: line,
				source: line
			});
		}
		return [...unique.values()];
	}
	const unique = /* @__PURE__ */ new Map();
	const push = (t) => {
		let key = t.kind + ":";
		switch (t.kind) {
			case "bvid":
				key += t.bvid;
				break;
			case "aid":
				key += t.aid;
				break;
			case "space":
				key += t.mid;
				break;
			case "bangumi-ep":
				key += t.epId;
				break;
			case "bangumi-ss":
				key += t.seasonId;
				break;
			case "season":
				key += `${t.mid}-${t.seasonId}`;
				break;
			case "favorite":
				key += t.mediaId;
				break;
			case "short":
				key += t.url;
				break;
			case "keyword": key += t.keyword;
		}
		if (!unique.has(key)) unique.set(key, t);
	};
	for (const token of splitTokens(text)) {
		const b23 = token.match(B23_RE);
		if (b23) {
			push({
				kind: "short",
				url: b23[0],
				source: token
			});
			continue;
		}
		const space = token.match(SPACE_RE);
		const season = token.match(SEASON_RE);
		if (space && season) {
			push({
				kind: "season",
				mid: space[1],
				seasonId: season[1],
				source: token
			});
			continue;
		}
		if (space) {
			push({
				kind: "space",
				mid: space[1],
				source: token
			});
			continue;
		}
		const fav = token.match(FAV_RE);
		if (fav) {
			push({
				kind: "favorite",
				mediaId: fav[1],
				source: token
			});
			continue;
		}
		if (/bangumi\/play/i.test(token) || /^ep\d+$/i.test(token) || /^ss\d+$/i.test(token)) {
			const ep = token.match(EP_RE);
			const ss = token.match(SS_RE);
			if (ep) {
				push({
					kind: "bangumi-ep",
					epId: ep[1],
					source: token
				});
				continue;
			}
			if (ss) {
				push({
					kind: "bangumi-ss",
					seasonId: ss[1],
					source: token
				});
				continue;
			}
		}
		const videoPath = token.match(VIDEO_PATH_RE);
		if (videoPath) {
			const id = videoPath[1];
			if (id.startsWith("BV")) push({
				kind: "bvid",
				bvid: id,
				source: token
			});
			else push({
				kind: "aid",
				aid: id.slice(2),
				source: token
			});
			continue;
		}
		const bv = token.match(BV_RE);
		if (bv) {
			push({
				kind: "bvid",
				bvid: bv[1],
				source: token
			});
			continue;
		}
		const av = token.match(AV_RE);
		if (av) {
			push({
				kind: "aid",
				aid: av[1],
				source: token
			});
			continue;
		}
	}
	return [...unique.values()];
}
var ALLOWED_HOST_SUFFIXES = [
	".bilivideo.com",
	".akamaized.net",
	".biliapi.net",
	".hdslb.com",
	".bilibili.com",
	".b23.tv",
	".bili2233.cn"
];
var ALLOWED_HOSTS = /* @__PURE__ */ new Set([
	"bilivideo.com",
	"akamaized.net",
	"biliapi.net",
	"hdslb.com",
	"bilibili.com",
	"api.bilibili.com",
	"www.bilibili.com",
	"space.bilibili.com",
	"b23.tv",
	"bili2233.cn",
	"i0.hdslb.com",
	"i1.hdslb.com",
	"i2.hdslb.com",
	"upos-hz-mirrorakam.akamaized.net"
]);
function isAllowedHost(hostname) {
	const host = hostname.toLowerCase();
	if (ALLOWED_HOSTS.has(host)) return true;
	return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) || host === suffix.slice(1));
}
function assertAllowedUrl(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		throw new Error("无效的地址");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("不支持的协议");
	if (!isAllowedHost(url.hostname)) throw new Error("拒绝代理非哔哩哔哩域名");
	return url;
}
function httpsify(url) {
	if (url.startsWith("//")) return `https:${url}`;
	if (url.startsWith("http://")) return `https://${url.slice(7)}`;
	return url;
}
var MIXIN_KEY_ENC_TAB = [
	46,
	47,
	18,
	2,
	53,
	8,
	23,
	32,
	15,
	50,
	10,
	31,
	58,
	3,
	45,
	35,
	27,
	43,
	5,
	49,
	33,
	9,
	42,
	19,
	29,
	28,
	14,
	39,
	12,
	38,
	41,
	13,
	37,
	48,
	7,
	16,
	24,
	55,
	40,
	61,
	26,
	17,
	0,
	1,
	60,
	51,
	30,
	4,
	22,
	25,
	54,
	21,
	56,
	59,
	6,
	63,
	57,
	62,
	11,
	36,
	20,
	34,
	44,
	52
];
var cache = null;
function mixinKey(raw) {
	return MIXIN_KEY_ENC_TAB.map((i) => raw[i] ?? "").join("").slice(0, 32);
}
function filenameKey(url) {
	return (url.split("/").pop() ?? "").split(".")[0] ?? "";
}
async function getMixinKey(fetchNav) {
	if (cache && cache.expiresAt > Date.now()) return cache.mixin;
	const { img_url, sub_url } = await fetchNav();
	const mixin = mixinKey(filenameKey(img_url) + filenameKey(sub_url));
	cache = {
		mixin,
		expiresAt: Date.now() + 18e5
	};
	return mixin;
}
function signWbi(params, mixin) {
	const withTs = {};
	for (const [k, v] of Object.entries(params)) withTs[k] = String(v).replace(/[!'()*]/g, "");
	withTs.wts = String(Math.floor(Date.now() / 1e3));
	const query = Object.keys(withTs).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(withTs[k])}`).join("&");
	return `${query}&w_rid=${createHash("md5").update(query + mixin).digest("hex")}`;
}
var CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var BUVID3 = `${randomUUID().toUpperCase()} infoc`;
function cookieHeader(sessdata) {
	const parts = [`buvid3=${BUVID3}`, `b_nut=${Math.floor(Date.now() / 1e3)}`];
	if (sessdata) parts.push(`SESSDATA=${sessdata}`);
	return parts.join("; ");
}
function biliHeaders(opts) {
	return {
		"User-Agent": CHROME_UA,
		Referer: opts?.referer ?? "https://www.bilibili.com",
		Origin: "https://www.bilibili.com",
		Accept: opts?.accept ?? "application/json, text/plain, */*",
		Cookie: cookieHeader(opts?.sessdata)
	};
}
async function biliFetch(url, sessdata, referer) {
	return await fetch(url, {
		headers: biliHeaders({
			sessdata,
			referer
		}),
		signal: AbortSignal.timeout(2e4)
	});
}
async function biliJson(url, sessdata, referer, allowCodes = []) {
	const text = await (await biliFetch(url, sessdata, referer)).text();
	if (!text.startsWith("{") && !text.startsWith("[")) throw new Error("哔哩哔哩接口返回了非 JSON（可能触发风控，请稍后重试）");
	const json = JSON.parse(text);
	const code = json.code ?? 0;
	if (code !== 0 && !allowCodes.includes(code)) throw new Error(json.message || json.msg || `接口错误 ${code}`);
	return json.data ?? json.result ?? json;
}
async function fetchNavKeys() {
	const data = await biliJson("https://api.bilibili.com/x/web-interface/nav", void 0, void 0, [-101]);
	if (!data.wbi_img?.img_url || !data.wbi_img.sub_url) throw new Error("无法获取 WBI 密钥");
	return data.wbi_img;
}
async function wbiQuery(base, params, sessdata, referer) {
	return `${base}?${signWbi(params, await getMixinKey(fetchNavKeys))}`;
}
async function wbiJson(base, params, sessdata, referer) {
	return biliJson(await wbiQuery(base, params, sessdata, referer), sessdata, referer);
}
async function fetchView(opts) {
	return biliJson(`https://api.bilibili.com/x/web-interface/view?${opts.bvid ? `bvid=${encodeURIComponent(opts.bvid)}` : `aid=${encodeURIComponent(opts.aid ?? "")}`}`, opts.sessdata);
}
async function fetchPageList(bvid, sessdata) {
	return biliJson(`https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}`, sessdata);
}
async function resolveShortUrl(url) {
	const loc = (await fetch(url, {
		method: "GET",
		redirect: "manual",
		headers: biliHeaders({ referer: "https://www.bilibili.com" }),
		signal: AbortSignal.timeout(15e3)
	})).headers.get("location");
	if (loc) return loc;
	return url;
}
async function searchVideos(keyword, page = 1, sessdata) {
	return ((await wbiJson("https://api.bilibili.com/x/web-interface/wbi/search/type", {
		search_type: "video",
		keyword,
		page,
		page_size: 20
	}, sessdata)).result ?? []).filter((h) => h?.bvid);
}
async function fetchSpaceVideos(mid, limit, sessdata) {
	const archives = [];
	let offset = "";
	const seen = /* @__PURE__ */ new Set();
	for (let i = 0; i < 8 && archives.length < limit; i += 1) {
		const params = {
			host_mid: mid,
			timezone_offset: -480,
			platform: "web"
		};
		if (offset) params.offset = offset;
		let data;
		try {
			data = await biliJson(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString()}`, sessdata, `https://space.bilibili.com/${mid}`);
		} catch {
			data = await wbiJson("https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space", params, sessdata, `https://space.bilibili.com/${mid}`);
		}
		const items = data.items ?? [];
		for (const item of items) {
			const candidates = [item.modules?.module_dynamic?.major?.archive, item.orig?.modules?.module_dynamic?.major?.archive];
			for (const archive of candidates) {
				if (!archive?.bvid || seen.has(archive.bvid)) continue;
				seen.add(archive.bvid);
				archives.push(archive);
			}
		}
		if (!data.has_more || !data.offset) break;
		offset = data.offset;
	}
	return archives.slice(0, limit);
}
async function fetchBangumi(opts) {
	return biliJson(`https://api.bilibili.com/pgc/view/web/season?${opts.epId ? `ep_id=${encodeURIComponent(opts.epId)}` : `season_id=${encodeURIComponent(opts.seasonId ?? "")}`}`, opts.sessdata, "https://www.bilibili.com");
}
async function fetchSeasonArchives(mid, seasonId, sessdata) {
	return (await biliJson(`https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${encodeURIComponent(mid)}&season_id=${encodeURIComponent(seasonId)}&sort_reverse=false&page_num=1&page_size=100`, sessdata, `https://space.bilibili.com/${mid}`)).archives ?? [];
}
async function fetchFavorite(mediaId, sessdata) {
	return ((await biliJson(`https://api.bilibili.com/x/v3/fav/resource/list?media_id=${encodeURIComponent(mediaId)}&pn=1&ps=40&platform=web`, sessdata)).medias ?? []).filter((m) => m.bvid);
}
async function fetchPlayurl(opts) {
	const referer = `https://www.bilibili.com/video/${opts.bvid}`;
	const bvid = opts.bvid;
	const cid = opts.cid;
	const qn = String(opts.qn);
	const html5 = new URLSearchParams({
		bvid,
		cid,
		qn,
		fnval: "1",
		fourk: "1",
		platform: "html5",
		high_quality: "1"
	});
	const dash = new URLSearchParams({
		bvid,
		cid,
		qn,
		fnval: "16",
		fourk: "1"
	});
	const tasks = [
		biliJson(`https://api.bilibili.com/x/player/playurl?${html5}`, opts.sessdata, referer),
		biliJson(`https://api.bilibili.com/x/player/playurl?${dash}`, opts.sessdata, referer),
		wbiJson("https://api.bilibili.com/x/player/wbi/playurl", {
			bvid,
			cid,
			qn: opts.qn,
			fnval: 16,
			fourk: 1,
			from_client: "BROWSER"
		}, opts.sessdata, referer)
	];
	if (opts.epId) tasks.push(biliJson(`https://api.bilibili.com/pgc/player/web/playurl?ep_id=${encodeURIComponent(opts.epId)}&qn=${opts.qn}&fnval=16&fourk=1`, opts.sessdata, "https://www.bilibili.com"));
	const results = [];
	await new Promise((resolve) => {
		let left = tasks.length;
		const finish = () => resolve();
		const timer = setTimeout(finish, 1600);
		for (const task of tasks) task.then((play) => {
			if (play.durl?.[0]?.url || play.dash?.video?.length) {
				results.push(play);
				if (play.durl?.[0]?.url && playQuality(play) >= opts.qn) {
					clearTimeout(timer);
					finish();
				}
			}
		}).catch(() => {}).finally(() => {
			left -= 1;
			if (left <= 0) {
				clearTimeout(timer);
				finish();
			}
		});
	});
	if (results.length === 0) throw new Error("无法获取播放地址");
	return pickBestPlay(results, opts.qn);
}
function playQuality(p) {
	if (p.quality) return p.quality;
	const dashMax = Math.max(0, ...(p.dash?.video ?? []).map((v) => v.id ?? 0));
	if (dashMax) return dashMax;
	return 0;
}
function pickBestPlay(plays, want) {
	let best = plays[0];
	let bestScore = -1;
	for (const play of plays) {
		const q = playQuality(play);
		const hasMp4 = Boolean(play.durl?.[0]?.url);
		const score = (q >= want ? 2e3 : 0) + (hasMp4 && q >= Math.min(want, 64) ? 250 : 0) + q;
		if (score > bestScore) {
			best = play;
			bestScore = score;
		}
	}
	return best;
}
function pickStream(data, qn) {
	const durl = data.durl?.[0];
	if (durl?.url) {
		const videoUrls = collectUrlList(durl.url, durl.backup_url);
		return {
			type: "mp4",
			videoUrl: videoUrls[0] ?? durl.url,
			videoUrls,
			audioUrls: [],
			size: durl.size,
			quality: data.quality || qn
		};
	}
	const videos = data.dash?.video ?? [];
	const audios = data.dash?.audio ?? [];
	const video = videos.find((v) => v.id === qn) ?? [...videos].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
	const audio = [...audios].sort((a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0))[0];
	const videoUrl = video?.baseUrl || video?.base_url;
	const audioUrl = audio?.baseUrl || audio?.base_url;
	if (!videoUrl) throw new Error("没有可用的视频流");
	return {
		type: "dash",
		videoUrl,
		audioUrl,
		videoUrls: collectUrlList(videoUrl, video?.backupUrl ?? video?.backup_url),
		audioUrls: collectUrlList(audioUrl, audio?.backupUrl ?? audio?.backup_url),
		quality: video?.id ?? data.quality ?? qn
	};
}
function collectUrlList(primary, backups) {
	const out = [];
	const add = (u) => {
		if (typeof u !== "string" || !u) return;
		const h = httpsify(u);
		if (!out.includes(h)) out.push(h);
	};
	add(primary);
	if (Array.isArray(backups)) backups.forEach(add);
	else add(backups);
	return out;
}
function qualityLabel(qn, _data) {
	return {
		16: "360P",
		32: "480P",
		64: "720P",
		80: "1080P",
		112: "1080P+",
		116: "1080P60",
		120: "4K"
	}[qn] ?? `${qn}P`;
}
function stripHtml(s) {
	return s.replace(/<[^>]+>/g, "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}
var MAX_VIDEOS = 60;
async function mapPool(items, limit, fn) {
	const out = new Array(items.length);
	let cursor = 0;
	async function worker() {
		while (true) {
			const index = cursor;
			cursor += 1;
			if (index >= items.length) return;
			out[index] = await fn(items[index], index);
		}
	}
	const n = Math.min(limit, items.length);
	await Promise.all(Array.from({ length: n }, () => worker()));
	return out;
}
function viewToEntries(view, sourceKind, sourceLabel, expandPages) {
	const pages = view.pages?.length ? view.pages : [{
		cid: view.cid,
		page: 1,
		part: view.title,
		duration: view.duration
	}];
	return (expandPages ? pages : pages.slice(0, 1)).map((p) => ({
		id: `${view.bvid}-${p.cid}`,
		bvid: view.bvid,
		aid: String(view.aid),
		cid: String(p.cid),
		page: p.page,
		pages: pages.length,
		part: p.part || view.title,
		title: view.title,
		owner: view.owner?.name ?? "UP không rõ",
		ownerMid: String(view.owner?.mid ?? ""),
		duration: p.duration || view.duration,
		cover: httpsify(view.pic),
		views: view.stat?.view ?? 0,
		sourceKind,
		sourceLabel
	}));
}
async function resolveBvid(bvid, sessdata, expandPages, sourceKind, sourceLabel) {
	return viewToEntries(await fetchView({
		bvid,
		sessdata
	}), sourceKind, sourceLabel, expandPages);
}
async function hydrateBvid(bvid, meta, sessdata, expandPages, sourceKind, sourceLabel) {
	try {
		const pages = await fetchPageList(bvid, sessdata);
		const chosen = expandPages ? pages : pages.slice(0, 1);
		const title = stripHtml(meta.title || bvid);
		return chosen.map((p) => ({
			id: `${bvid}-${p.cid}`,
			bvid,
			aid: "",
			cid: String(p.cid),
			page: p.page,
			pages: pages.length,
			part: p.part || title,
			title,
			owner: meta.owner ?? "UP không rõ",
			ownerMid: meta.ownerMid ?? "",
			duration: p.duration || meta.duration || 0,
			cover: httpsify(meta.cover ?? ""),
			views: meta.views ?? 0,
			sourceKind,
			sourceLabel
		}));
	} catch {
		return resolveBvid(bvid, sessdata, expandPages, sourceKind, sourceLabel);
	}
}
async function resolveTargets(opts) {
	const targets = parseInput(opts.raw, opts.mode);
	if (targets.length === 0) return {
		videos: [],
		warnings: [{
			source: "",
			message: "Không nhận ra liên kết, mã BV hoặc từ khóa"
		}]
	};
	const videos = [];
	const warnings = [];
	const seen = /* @__PURE__ */ new Set();
	const push = (entries) => {
		for (const entry of entries) {
			if (videos.length >= MAX_VIDEOS) return;
			if (seen.has(entry.id)) continue;
			seen.add(entry.id);
			videos.push(entry);
		}
	};
	for (const target of targets) {
		if (videos.length >= MAX_VIDEOS) {
			warnings.push({
				source: "",
				message: `Đã đạt giới hạn ${MAX_VIDEOS} video một lần, hãy tách đợt`
			});
			break;
		}
		try {
			switch (target.kind) {
				case "short": {
					const nested = await resolveTargets({
						raw: await resolveShortUrl(target.url),
						mode: "links",
						sessdata: opts.sessdata,
						expandPages: opts.expandPages,
						spaceLimit: opts.spaceLimit
					});
					push(nested.videos);
					warnings.push(...nested.warnings);
					break;
				}
				case "bvid":
					push(await resolveBvid(target.bvid, opts.sessdata, opts.expandPages, "video", target.bvid));
					break;
				case "aid":
					push(viewToEntries(await fetchView({
						aid: target.aid,
						sessdata: opts.sessdata
					}), "video", `av${target.aid}`, opts.expandPages));
					break;
				case "space": {
					const archives = await fetchSpaceVideos(target.mid, opts.spaceLimit, opts.sessdata);
					if (archives.length === 0) {
						warnings.push({
							source: target.source,
							message: `UP ${target.mid} chưa lấy được video — thử tìm kiếm hoặc dán liên kết`
						});
						break;
					}
					for (const archive of archives) {
						if (!archive.bvid || videos.length >= MAX_VIDEOS) continue;
						push(await hydrateBvid(archive.bvid, {
							title: archive.title,
							cover: archive.cover,
							duration: parseDurationText(archive.duration_text),
							views: archive.stat?.play
						}, opts.sessdata, opts.expandPages, "space", `UP ${target.mid}`));
						await sleep(80);
					}
					break;
				}
				case "bangumi-ep":
				case "bangumi-ss": {
					const season = await fetchBangumi({
						epId: target.kind === "bangumi-ep" ? target.epId : void 0,
						seasonId: target.kind === "bangumi-ss" ? target.seasonId : void 0,
						sessdata: opts.sessdata
					});
					const eps = season.episodes ?? [];
					const selected = target.kind === "bangumi-ep" ? eps.filter((e) => String(e.id) === target.epId) : eps;
					const list = (selected.length ? selected : eps).slice(0, MAX_VIDEOS - videos.length);
					for (const ep of list) {
						if (!ep.bvid || !ep.cid) continue;
						push([{
							id: `${ep.bvid}-${ep.cid}`,
							bvid: ep.bvid,
							aid: String(ep.aid ?? ""),
							cid: String(ep.cid),
							page: 1,
							pages: 1,
							part: ep.long_title || ep.title,
							title: `${season.title} ${ep.title}${ep.long_title ? ` ${ep.long_title}` : ""}`,
							owner: "Anime",
							ownerMid: "",
							duration: Math.round((ep.duration || 0) / (ep.duration > 1e4 ? 1e3 : 1)),
							cover: httpsify(ep.cover || season.cover),
							views: 0,
							sourceKind: "bangumi",
							sourceLabel: season.title
						}]);
					}
					break;
				}
				case "season": {
					const archives = await fetchSeasonArchives(target.mid, target.seasonId, opts.sessdata);
					for (const archive of archives) {
						if (videos.length >= MAX_VIDEOS) break;
						push(await hydrateBvid(archive.bvid, {
							title: archive.title,
							cover: archive.pic,
							duration: archive.duration
						}, opts.sessdata, opts.expandPages, "season", `Tuyển tập ${target.seasonId}`));
						await sleep(80);
					}
					break;
				}
				case "favorite": {
					const medias = await fetchFavorite(target.mediaId, opts.sessdata);
					for (const media of medias) {
						if (videos.length >= MAX_VIDEOS) break;
						push(await hydrateBvid(media.bvid, {
							title: media.title,
							cover: media.cover,
							duration: media.duration,
							owner: media.upper?.name,
							ownerMid: media.upper ? String(media.upper.mid) : void 0,
							views: media.cnt_info?.play
						}, opts.sessdata, opts.expandPages, "favorite", `Yêu thích ${target.mediaId}`));
						await sleep(80);
					}
					break;
				}
				case "keyword": {
					const hits = (await searchVideos(target.keyword, 1, opts.sessdata)).slice(0, 12);
					if (hits.length === 0) {
						warnings.push({
							source: target.source,
							message: `Không tìm thấy «${target.keyword}»`
						});
						break;
					}
					const batches = await mapPool(hits, 4, async (hit) => {
						try {
							return await hydrateBvid(hit.bvid, {
								title: stripHtml(hit.title),
								cover: httpsify(hit.pic),
								duration: parseDurationText(hit.duration),
								owner: hit.author,
								ownerMid: String(hit.mid ?? ""),
								views: hit.play
							}, opts.sessdata, opts.expandPages, "search", `Tìm: ${target.keyword}`);
						} catch (err) {
							warnings.push({
								source: hit.bvid,
								message: err instanceof Error ? err.message : "Không đọc được mục này"
							});
							return [];
						}
					});
					for (const entries of batches) push(entries);
					break;
				}
			}
		} catch (err) {
			warnings.push({
				source: target.source,
				message: err instanceof Error ? err.message : "Phân tích thất bại"
			});
		}
	}
	for (const v of videos) v.title = v.title || v.part;
	return {
		videos,
		warnings
	};
}
function makeFilename(entry) {
	const pageBit = entry.pages > 1 ? ` P${entry.page} ${entry.part}` : "";
	return sanitizeFilename(`${entry.title}${pageBit} [${entry.bvid}].mp4`);
}
//#endregion
export { formatBytes as a, formatSpeed as c, pickStream as d, qualityLabel as f, fetchPlayurl as i, httpsify as l, biliHeaders as n, formatCount as o, resolveTargets as p, cn as r, formatDuration as s, assertAllowedUrl as t, makeFilename as u };
