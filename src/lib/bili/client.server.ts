import { randomUUID } from "node:crypto";
import { httpsify } from "./hosts";
import { getMixinKey, signWbi } from "./wbi.server";

export const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BUVID3 = `${randomUUID().toUpperCase()} infoc`;

type BiliJson = {
  code?: number;
  message?: string;
  msg?: string;
  ttl?: number;
  data?: unknown;
  result?: unknown;
};

function cookieHeader(sessdata?: string): string {
  const parts = [`buvid3=${BUVID3}`, `b_nut=${Math.floor(Date.now() / 1000)}`];
  if (sessdata) parts.push(`SESSDATA=${sessdata}`);
  return parts.join("; ");
}

export function biliHeaders(opts?: {
  referer?: string;
  sessdata?: string;
  accept?: string;
}): HeadersInit {
  return {
    "User-Agent": CHROME_UA,
    Referer: opts?.referer ?? "https://www.bilibili.com",
    Origin: "https://www.bilibili.com",
    Accept: opts?.accept ?? "application/json, text/plain, */*",
    Cookie: cookieHeader(opts?.sessdata),
  };
}

async function biliFetch(url: string, sessdata?: string, referer?: string): Promise<Response> {
  const res = await fetch(url, {
    headers: biliHeaders({ sessdata, referer }),
    signal: AbortSignal.timeout(20000),
  });
  return res;
}

export async function biliJson<T = unknown>(
  url: string,
  sessdata?: string,
  referer?: string,
  allowCodes: number[] = [],
): Promise<T> {
  const res = await biliFetch(url, sessdata, referer);
  const text = await res.text();
  if (!text.startsWith("{") && !text.startsWith("[")) {
    throw new Error("哔哩哔哩接口返回了非 JSON（可能触发风控，请稍后重试）");
  }
  const json = JSON.parse(text) as BiliJson;
  const code = json.code ?? 0;
  if (code !== 0 && !allowCodes.includes(code)) {
    throw new Error(json.message || json.msg || `接口错误 ${code}`);
  }
  return (json.data ?? json.result ?? json) as T;
}

async function fetchNavKeys(): Promise<{ img_url: string; sub_url: string }> {
  const data = await biliJson<{ wbi_img?: { img_url: string; sub_url: string } }>(
    "https://api.bilibili.com/x/web-interface/nav",
    undefined,
    undefined,
    [-101],
  );
  if (!data.wbi_img?.img_url || !data.wbi_img.sub_url) {
    throw new Error("无法获取 WBI 密钥");
  }
  return data.wbi_img;
}

export async function wbiQuery(
  base: string,
  params: Record<string, string | number>,
  sessdata?: string,
  referer?: string,
): Promise<string> {
  const mixin = await getMixinKey(fetchNavKeys);
  const signed = signWbi(params, mixin);
  const url = `${base}?${signed}`;
  return url;
}

export async function wbiJson<T = unknown>(
  base: string,
  params: Record<string, string | number>,
  sessdata?: string,
  referer?: string,
): Promise<T> {
  const url = await wbiQuery(base, params, sessdata, referer);
  return biliJson<T>(url, sessdata, referer);
}

export type ViewData = {
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  pic: string;
  duration: number;
  owner: { mid: number; name: string; face: string };
  stat: { view: number };
  pages: Array<{
    cid: number;
    page: number;
    part: string;
    duration: number;
  }>;
  videos?: number;
};

export async function fetchView(opts: {
  bvid?: string;
  aid?: string;
  sessdata?: string;
}): Promise<ViewData> {
  const qs = opts.bvid
    ? `bvid=${encodeURIComponent(opts.bvid)}`
    : `aid=${encodeURIComponent(opts.aid ?? "")}`;
  return biliJson<ViewData>(
    `https://api.bilibili.com/x/web-interface/view?${qs}`,
    opts.sessdata,
  );
}

export async function fetchPageList(
  bvid: string,
  sessdata?: string,
): Promise<Array<{ cid: number; page: number; part: string; duration: number }>> {
  return biliJson(
    `https://api.bilibili.com/x/player/pagelist?bvid=${encodeURIComponent(bvid)}`,
    sessdata,
  );
}

export async function resolveShortUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: biliHeaders({ referer: "https://www.bilibili.com" }),
    signal: AbortSignal.timeout(15000),
  });
  const loc = res.headers.get("location");
  if (loc) return loc;
  return url;
}

export type SearchHit = {
  bvid: string;
  aid: number;
  title: string;
  author: string;
  mid: number;
  pic: string;
  duration: string;
  play: number;
};

export async function searchVideos(
  keyword: string,
  page = 1,
  sessdata?: string,
): Promise<SearchHit[]> {
  const data = await wbiJson<{ result?: SearchHit[] }>(
    "https://api.bilibili.com/x/web-interface/wbi/search/type",
    {
      search_type: "video",
      keyword,
      page,
      page_size: 20,
    },
    sessdata,
  );
  return (data.result ?? []).filter((h) => h?.bvid);
}

type DynamicArchive = {
  bvid?: string;
  aid?: string | number;
  title?: string;
  cover?: string;
  duration_text?: string;
  stat?: { play?: number };
};

type DynamicItem = {
  type?: string;
  modules?: {
    module_dynamic?: {
      major?: {
        type?: string;
        archive?: DynamicArchive;
      };
    };
    module_author?: { mid?: number; name?: string };
  };
  orig?: DynamicItem;
};

export async function fetchSpaceVideos(
  mid: string,
  limit: number,
  sessdata?: string,
): Promise<DynamicArchive[]> {
  const archives: DynamicArchive[] = [];
  let offset = "";
  const seen = new Set<string>();
  for (let i = 0; i < 8 && archives.length < limit; i += 1) {
    const params: Record<string, string | number> = {
      host_mid: mid,
      timezone_offset: -480,
      platform: "web",
    };
    if (offset) params.offset = offset;
    let data: {
      items?: DynamicItem[];
      offset?: string;
      has_more?: boolean;
    };
    try {
      data = await biliJson(
        `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        ).toString()}`,
        sessdata,
        `https://space.bilibili.com/${mid}`,
      );
    } catch {
      data = await wbiJson(
        "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space",
        params,
        sessdata,
        `https://space.bilibili.com/${mid}`,
      );
    }
    const items = data.items ?? [];
    for (const item of items) {
      const candidates = [
        item.modules?.module_dynamic?.major?.archive,
        item.orig?.modules?.module_dynamic?.major?.archive,
      ];
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

export type BangumiEpisode = {
  id: number;
  aid: number;
  bvid: string;
  cid: number;
  title: string;
  long_title: string;
  cover: string;
  duration: number;
};

export type BangumiSeason = {
  title: string;
  cover: string;
  episodes: BangumiEpisode[];
};

export async function fetchBangumi(opts: {
  epId?: string;
  seasonId?: string;
  sessdata?: string;
}): Promise<BangumiSeason> {
  const qs = opts.epId
    ? `ep_id=${encodeURIComponent(opts.epId)}`
    : `season_id=${encodeURIComponent(opts.seasonId ?? "")}`;
  return biliJson<BangumiSeason>(
    `https://api.bilibili.com/pgc/view/web/season?${qs}`,
    opts.sessdata,
    "https://www.bilibili.com",
  );
}

export async function fetchSeasonArchives(
  mid: string,
  seasonId: string,
  sessdata?: string,
): Promise<Array<{ bvid: string; title: string; duration: number; pic: string }>> {
  const data = await biliJson<{
    archives?: Array<{
      bvid: string;
      title: string;
      duration: number;
      pic: string;
    }>;
  }>(
    `https://api.bilibili.com/x/polymer/web-space/seasons_archives_list?mid=${encodeURIComponent(mid)}&season_id=${encodeURIComponent(seasonId)}&sort_reverse=false&page_num=1&page_size=100`,
    sessdata,
    `https://space.bilibili.com/${mid}`,
  );
  return data.archives ?? [];
}

export async function fetchFavorite(
  mediaId: string,
  sessdata?: string,
): Promise<
  Array<{
    bvid: string;
    title: string;
    duration: number;
    cover: string;
    upper?: { name: string; mid: number };
    cnt_info?: { play: number };
  }>
> {
  const data = await biliJson<{
    medias?: Array<{
      bvid: string;
      title: string;
      duration: number;
      cover: string;
      upper?: { name: string; mid: number };
      cnt_info?: { play: number };
    }>;
  }>(
    `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${encodeURIComponent(mediaId)}&pn=1&ps=40&platform=web`,
    sessdata,
  );
  return (data.medias ?? []).filter((m) => m.bvid);
}

type DurlItem = { url?: string; size?: number; backup_url?: string[] };
type DashStream = {
  id: number;
  baseUrl?: string;
  base_url?: string;
  backupUrl?: string[] | string;
  backup_url?: string[] | string;
  bandwidth?: number;
  codecs?: string;
};

export type PlayurlData = {
  quality: number;
  accept_quality: number[];
  accept_description: string[];
  durl?: DurlItem[];
  dash?: {
    video?: DashStream[];
    audio?: DashStream[];
  };
  support_formats?: Array<{ quality: number; new_description?: string; display_desc?: string }>;
};

export async function fetchPlayurl(opts: {
  bvid: string;
  cid: string;
  qn: number;
  sessdata?: string;
  epId?: string;
}): Promise<PlayurlData> {
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
    high_quality: "1",
  });
  const dash = new URLSearchParams({
    bvid,
    cid,
    qn,
    fnval: "16",
    fourk: "1",
  });

  const tasks: Array<Promise<PlayurlData>> = [
    biliJson<PlayurlData>(
      `https://api.bilibili.com/x/player/playurl?${html5}`,
      opts.sessdata,
      referer,
    ),
    biliJson<PlayurlData>(
      `https://api.bilibili.com/x/player/playurl?${dash}`,
      opts.sessdata,
      referer,
    ),
    wbiJson<PlayurlData>(
      "https://api.bilibili.com/x/player/wbi/playurl",
      { bvid, cid, qn: opts.qn, fnval: 16, fourk: 1, from_client: "BROWSER" },
      opts.sessdata,
      referer,
    ),
  ];
  if (opts.epId) {
    tasks.push(
      biliJson<PlayurlData>(
        `https://api.bilibili.com/pgc/player/web/playurl?ep_id=${encodeURIComponent(opts.epId)}&qn=${opts.qn}&fnval=16&fourk=1`,
        opts.sessdata,
        "https://www.bilibili.com",
      ),
    );
  }

  const results: PlayurlData[] = [];
  await new Promise<void>((resolve) => {
    let left = tasks.length;
    const finish = () => resolve();
    const timer = setTimeout(finish, 1600);
    for (const task of tasks) {
      task
        .then((play) => {
          if (play.durl?.[0]?.url || play.dash?.video?.length) {
            results.push(play);
            if (play.durl?.[0]?.url && playQuality(play) >= opts.qn) {
              clearTimeout(timer);
              finish();
            }
          }
        })
        .catch(() => {
          // ignore a failed source
        })
        .finally(() => {
          left -= 1;
          if (left <= 0) {
            clearTimeout(timer);
            finish();
          }
        });
    }
  });
  if (results.length === 0) {
    throw new Error("无法获取播放地址");
  }
  return pickBestPlay(results, opts.qn);
}

function playQuality(p: PlayurlData): number {
  if (p.quality) return p.quality;
  const dashMax = Math.max(0, ...(p.dash?.video ?? []).map((v) => v.id ?? 0));
  if (dashMax) return dashMax;
  return 0;
}

function pickBestPlay(plays: PlayurlData[], want: number): PlayurlData {
  let best = plays[0]!;
  let bestScore = -1;
  for (const play of plays) {
    const q = playQuality(play);
    const hasMp4 = Boolean(play.durl?.[0]?.url);
    const hit = q >= want ? 2000 : 0;
    const mp4Bonus = hasMp4 && q >= Math.min(want, 64) ? 250 : 0;
    const score = hit + mp4Bonus + q;
    if (score > bestScore) {
      best = play;
      bestScore = score;
    }
  }
  return best;
}

export function pickStream(
  data: PlayurlData,
  qn: number,
): {
  type: "mp4" | "dash";
  videoUrl: string;
  audioUrl?: string;
  videoUrls: string[];
  audioUrls: string[];
  size?: number;
  quality: number;
} {
  const durl = data.durl?.[0];
  if (durl?.url) {
    const videoUrls = collectUrlList(durl.url, durl.backup_url);
    return {
      type: "mp4",
      videoUrl: videoUrls[0] ?? durl.url,
      videoUrls,
      audioUrls: [],
      size: durl.size,
      quality: data.quality || qn,
    };
  }
  const videos = data.dash?.video ?? [];
  const audios = data.dash?.audio ?? [];
  const video =
    videos.find((v) => v.id === qn) ??
    [...videos].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
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
    quality: video?.id ?? data.quality ?? qn,
  };
}

function collectUrlList(primary?: string, backups?: unknown): string[] {
  const out: string[] = [];
  const add = (u?: unknown) => {
    if (typeof u !== "string" || !u) return;
    const h = httpsify(u);
    if (!out.includes(h)) out.push(h);
  };
  add(primary);
  if (Array.isArray(backups)) backups.forEach(add);
  else add(backups);
  return out;
}

export function qualityLabel(qn: number, _data?: PlayurlData): string {
  const fallback: Record<number, string> = {
    16: "360P",
    32: "480P",
    64: "720P",
    80: "1080P",
    112: "1080P+",
    116: "1080P60",
    120: "4K",
  };
  return fallback[qn] ?? `${qn}P`;
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
}

export { httpsify };
