import type { ParsedTarget } from "./types";

const BV_RE = /\b(BV[0-9A-Za-z]{10})\b/;
const AV_RE = /\b[Aa][Vv](\d{1,16})\b/;
const B23_RE = /https?:\/\/(?:b23\.tv|bili2233\.cn)\/[A-Za-z0-9]+\/?/i;
const SPACE_RE = /space\.bilibili\.com\/(\d+)/i;
const EP_RE = /(?:bangumi\/play\/)?ep(\d+)/i;
const SS_RE = /(?:bangumi\/play\/)?ss(\d+)/i;
const SEASON_RE = /(?:collectiondetail|seriesdetail).*?[?&](?:sid|season_id)=(\d+)/i;
const FAV_RE =
  /(?:favlist\?fid=|medialist\/detail\/ml|\/ml)(\d+)/i;
const VIDEO_PATH_RE = /bilibili\.com\/video\/(BV[0-9A-Za-z]{10}|av\d+)/i;

function splitTokens(input: string): string[] {
  return input
    .split(/[\s,;，；\n\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseInput(raw: string, mode: "links" | "search"): ParsedTarget[] {
  const text = raw.trim();
  if (!text) return [];

  if (mode === "search") {
    const unique = new Map<string, ParsedTarget>();
    for (const line of text.split(/\n+/).map((s) => s.trim()).filter(Boolean)) {
      const key = `keyword:${line}`;
      if (!unique.has(key)) {
        unique.set(key, { kind: "keyword", keyword: line, source: line });
      }
    }
    return [...unique.values()];
  }

  const unique = new Map<string, ParsedTarget>();
  const push = (t: ParsedTarget) => {
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
      case "keyword":
        key += t.keyword;
        break;
    }
    if (!unique.has(key)) unique.set(key, t);
  };

  for (const token of splitTokens(text)) {
    const b23 = token.match(B23_RE);
    if (b23) {
      push({ kind: "short", url: b23[0]!, source: token });
      continue;
    }

    const space = token.match(SPACE_RE);
    const season = token.match(SEASON_RE);
    if (space && season) {
      push({
        kind: "season",
        mid: space[1]!,
        seasonId: season[1]!,
        source: token,
      });
      continue;
    }
    if (space) {
      push({ kind: "space", mid: space[1]!, source: token });
      continue;
    }

    const fav = token.match(FAV_RE);
    if (fav) {
      push({ kind: "favorite", mediaId: fav[1]!, source: token });
      continue;
    }

    if (/bangumi\/play/i.test(token) || /^ep\d+$/i.test(token) || /^ss\d+$/i.test(token)) {
      const ep = token.match(EP_RE);
      const ss = token.match(SS_RE);
      if (ep) {
        push({ kind: "bangumi-ep", epId: ep[1]!, source: token });
        continue;
      }
      if (ss) {
        push({ kind: "bangumi-ss", seasonId: ss[1]!, source: token });
        continue;
      }
    }

    const videoPath = token.match(VIDEO_PATH_RE);
    if (videoPath) {
      const id = videoPath[1]!;
      if (id.startsWith("BV")) push({ kind: "bvid", bvid: id, source: token });
      else push({ kind: "aid", aid: id.slice(2), source: token });
      continue;
    }

    const bv = token.match(BV_RE);
    if (bv) {
      push({ kind: "bvid", bvid: bv[1]!, source: token });
      continue;
    }

    const av = token.match(AV_RE);
    if (av) {
      push({ kind: "aid", aid: av[1]!, source: token });
      continue;
    }
  }

  return [...unique.values()];
}

export function describeTarget(t: ParsedTarget): string {
  switch (t.kind) {
    case "bvid":
      return t.bvid;
    case "aid":
      return `av${t.aid}`;
    case "space":
      return `UP ${t.mid}`;
    case "bangumi-ep":
      return `EP ${t.epId}`;
    case "bangumi-ss":
      return `SS ${t.seasonId}`;
    case "season":
      return `Tuyển tập ${t.seasonId}`;
    case "favorite":
      return `Yêu thích ${t.mediaId}`;
    case "short":
      return "Link ngắn";
    case "keyword":
      return `Tìm «${t.keyword}»`;
  }
}
