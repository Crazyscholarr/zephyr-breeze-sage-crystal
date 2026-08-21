import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { d as pickStream, f as qualityLabel, i as fetchPlayurl, p as resolveTargets, u as makeFilename } from "./resolve.server-BnY_n0Dg.mjs";
import { a as object, i as number, n as boolean, o as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/functions-Dzq-FW57.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
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
var resolveVideosFn_createServerFn_handler = createServerRpc({
	id: "80f5de3fad1910b6a1e161673474cdb89f70a0ff55da87b6e673662fcedf2a54",
	name: "resolveVideosFn",
	filename: "src/lib/bili/functions.ts"
}, (opts) => resolveVideosFn.__executeServer(opts));
var resolveVideosFn = createServerFn({ method: "POST" }).validator(resolveSchema).handler(resolveVideosFn_createServerFn_handler, async ({ data }) => {
	return resolveTargets({
		raw: data.raw,
		mode: data.mode,
		sessdata: data.sessdata?.trim() || void 0,
		expandPages: data.expandPages,
		spaceLimit: data.spaceLimit
	});
});
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
var getPlayStreamFn_createServerFn_handler = createServerRpc({
	id: "20295c5b6fadfbee69785044cafa78a9852dbc84dbf2ffac78d3da81726cdd04",
	name: "getPlayStreamFn",
	filename: "src/lib/bili/functions.ts"
}, (opts) => getPlayStreamFn.__executeServer(opts));
var getPlayStreamFn = createServerFn({ method: "POST" }).validator(playSchema).handler(getPlayStreamFn_createServerFn_handler, async ({ data }) => {
	const play = await fetchPlayurl({
		bvid: data.bvid,
		cid: data.cid,
		qn: data.qn,
		sessdata: data.sessdata?.trim() || void 0
	});
	const stream = pickStream(play, data.qn);
	return {
		bvid: data.bvid,
		cid: data.cid,
		quality: stream.quality,
		qualityLabel: qualityLabel(stream.quality, play),
		acceptQuality: play.accept_quality ?? [],
		filename: makeFilename({
			title: data.title,
			part: data.part || data.title,
			page: data.page ?? 1,
			pages: data.pages ?? 1,
			bvid: data.bvid
		}),
		type: stream.type,
		videoUrl: stream.videoUrl,
		audioUrl: stream.audioUrl,
		size: stream.size
	};
});
//#endregion
export { getPlayStreamFn_createServerFn_handler, resolveVideosFn_createServerFn_handler };
