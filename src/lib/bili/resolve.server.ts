import { parseDurationText, sanitizeFilename, sleep } from "@/lib/utils";
import { parseInput } from "./parse";
import type { ResolveResult, SourceKind, VideoEntry } from "./types";
import {
  fetchBangumi,
  fetchFavorite,
  fetchPageList,
  fetchSeasonArchives,
  fetchSpaceVideos,
  fetchView,
  httpsify,
  resolveShortUrl,
  searchVideos,
  stripHtml,
  type ViewData,
} from "./client.server";

const MAX_VIDEOS = 60;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await fn(items[index]!, index);
    }
  }
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function viewToEntries(
  view: ViewData,
  sourceKind: SourceKind,
  sourceLabel: string,
  expandPages: boolean,
): VideoEntry[] {
  const pages = view.pages?.length ? view.pages : [
    {
      cid: view.cid,
      page: 1,
      part: view.title,
      duration: view.duration,
    },
  ];
  const chosen = expandPages ? pages : pages.slice(0, 1);
  return chosen.map((p) => ({
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
    sourceLabel,
  }));
}

async function resolveBvid(
  bvid: string,
  sessdata: string | undefined,
  expandPages: boolean,
  sourceKind: SourceKind,
  sourceLabel: string,
): Promise<VideoEntry[]> {
  const view = await fetchView({ bvid, sessdata });
  return viewToEntries(view, sourceKind, sourceLabel, expandPages);
}

async function hydrateBvid(
  bvid: string,
  meta: {
    title?: string;
    owner?: string;
    ownerMid?: string;
    cover?: string;
    duration?: number;
    views?: number;
  },
  sessdata: string | undefined,
  expandPages: boolean,
  sourceKind: SourceKind,
  sourceLabel: string,
): Promise<VideoEntry[]> {
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
      sourceLabel,
    }));
  } catch {
    return resolveBvid(bvid, sessdata, expandPages, sourceKind, sourceLabel);
  }
}

export async function resolveTargets(opts: {
  raw: string;
  mode: "links" | "search";
  sessdata?: string;
  expandPages: boolean;
  spaceLimit: number;
}): Promise<ResolveResult> {
  const targets = parseInput(opts.raw, opts.mode);
  if (targets.length === 0) {
    return { videos: [], warnings: [{ source: "", message: "Không nhận ra liên kết, mã BV hoặc từ khóa" }] };
  }

  const videos: VideoEntry[] = [];
  const warnings: ResolveResult["warnings"] = [];
  const seen = new Set<string>();

  const push = (entries: VideoEntry[]) => {
    for (const entry of entries) {
      if (videos.length >= MAX_VIDEOS) return;
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      videos.push(entry);
    }
  };

  for (const target of targets) {
    if (videos.length >= MAX_VIDEOS) {
      warnings.push({ source: "", message: `Đã đạt giới hạn ${MAX_VIDEOS} video một lần, hãy tách đợt` });
      break;
    }
    try {
      switch (target.kind) {
        case "short": {
          const dest = await resolveShortUrl(target.url);
          const nested = await resolveTargets({
            raw: dest,
            mode: "links",
            sessdata: opts.sessdata,
            expandPages: opts.expandPages,
            spaceLimit: opts.spaceLimit,
          });
          push(nested.videos);
          warnings.push(...nested.warnings);
          break;
        }
        case "bvid": {
          push(
            await resolveBvid(
              target.bvid,
              opts.sessdata,
              opts.expandPages,
              "video",
              target.bvid,
            ),
          );
          break;
        }
        case "aid": {
          const view = await fetchView({ aid: target.aid, sessdata: opts.sessdata });
          push(viewToEntries(view, "video", `av${target.aid}`, opts.expandPages));
          break;
        }
        case "space": {
          const archives = await fetchSpaceVideos(
            target.mid,
            opts.spaceLimit,
            opts.sessdata,
          );
          if (archives.length === 0) {
            warnings.push({
              source: target.source,
              message: `UP ${target.mid} chưa lấy được video — thử tìm kiếm hoặc dán liên kết`,
            });
            break;
          }
          for (const archive of archives) {
            if (!archive.bvid || videos.length >= MAX_VIDEOS) continue;
            const entries = await hydrateBvid(
              archive.bvid,
              {
                title: archive.title,
                cover: archive.cover,
                duration: parseDurationText(archive.duration_text),
                views: archive.stat?.play,
              },
              opts.sessdata,
              opts.expandPages,
              "space",
              `UP ${target.mid}`,
            );
            push(entries);
            await sleep(80);
          }
          break;
        }
        case "bangumi-ep":
        case "bangumi-ss": {
          const season = await fetchBangumi({
            epId: target.kind === "bangumi-ep" ? target.epId : undefined,
            seasonId: target.kind === "bangumi-ss" ? target.seasonId : undefined,
            sessdata: opts.sessdata,
          });
          const eps = season.episodes ?? [];
          const selected =
            target.kind === "bangumi-ep"
              ? eps.filter((e) => String(e.id) === target.epId)
              : eps;
          const list = (selected.length ? selected : eps).slice(0, MAX_VIDEOS - videos.length);
          for (const ep of list) {
            if (!ep.bvid || !ep.cid) continue;
            push([
              {
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
                duration: Math.round((ep.duration || 0) / (ep.duration > 10000 ? 1000 : 1)),
                cover: httpsify(ep.cover || season.cover),
                views: 0,
                sourceKind: "bangumi",
                sourceLabel: season.title,
              },
            ]);
          }
          break;
        }
        case "season": {
          const archives = await fetchSeasonArchives(
            target.mid,
            target.seasonId,
            opts.sessdata,
          );
          for (const archive of archives) {
            if (videos.length >= MAX_VIDEOS) break;
            const entries = await hydrateBvid(
              archive.bvid,
              {
                title: archive.title,
                cover: archive.pic,
                duration: archive.duration,
              },
              opts.sessdata,
              opts.expandPages,
              "season",
              `Tuyển tập ${target.seasonId}`,
            );
            push(entries);
            await sleep(80);
          }
          break;
        }
        case "favorite": {
          const medias = await fetchFavorite(target.mediaId, opts.sessdata);
          for (const media of medias) {
            if (videos.length >= MAX_VIDEOS) break;
            const entries = await hydrateBvid(
              media.bvid,
              {
                title: media.title,
                cover: media.cover,
                duration: media.duration,
                owner: media.upper?.name,
                ownerMid: media.upper ? String(media.upper.mid) : undefined,
                views: media.cnt_info?.play,
              },
              opts.sessdata,
              opts.expandPages,
              "favorite",
              `Yêu thích ${target.mediaId}`,
            );
            push(entries);
            await sleep(80);
          }
          break;
        }
        case "keyword": {
          const hits = (await searchVideos(target.keyword, 1, opts.sessdata)).slice(0, 12);
          if (hits.length === 0) {
            warnings.push({ source: target.source, message: `Không tìm thấy «${target.keyword}»` });
            break;
          }
          const batches = await mapPool(hits, 4, async (hit) => {
            try {
              return await hydrateBvid(
                hit.bvid,
                {
                  title: stripHtml(hit.title),
                  cover: httpsify(hit.pic),
                  duration: parseDurationText(hit.duration),
                  owner: hit.author,
                  ownerMid: String(hit.mid ?? ""),
                  views: hit.play,
                },
                opts.sessdata,
                opts.expandPages,
                "search",
                `Tìm: ${target.keyword}`,
              );
            } catch (err) {
              warnings.push({
                source: hit.bvid,
                message: err instanceof Error ? err.message : "Không đọc được mục này",
              });
              return [] as VideoEntry[];
            }
          });
          for (const entries of batches) push(entries);
          break;
        }
      }
    } catch (err) {
      warnings.push({
        source: target.source,
        message: err instanceof Error ? err.message : "Phân tích thất bại",
      });
    }
  }

  for (const v of videos) {
    v.title = v.title || v.part;
  }

  return { videos, warnings };
}

export function makeFilename(entry: Pick<VideoEntry, "title" | "page" | "pages" | "part" | "bvid">): string {
  const pageBit = entry.pages > 1 ? ` P${entry.page} ${entry.part}` : "";
  return sanitizeFilename(`${entry.title}${pageBit} [${entry.bvid}].mp4`);
}
