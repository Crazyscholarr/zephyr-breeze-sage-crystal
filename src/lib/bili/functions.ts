import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { makeFilename, resolveTargets } from "./resolve.server";
import { fetchPlayurl, pickStream, qualityLabel } from "./client.server";
import { SESSDATA_MAX, normalizeSessdata } from "./sessdata";
import type { PlayStream } from "./types";

const resolveSchema = z.object({
  raw: z.string().min(1).max(8000),
  mode: z.enum(["links", "search"]),
  sessdata: z.string().max(SESSDATA_MAX).optional(),
  expandPages: z.boolean(),
  spaceLimit: z.number().int().min(1).max(50),
});

export const resolveVideosFn = createServerFn({ method: "POST" })
  .validator(resolveSchema)
  .handler(async ({ data }) => {
    return resolveTargets({
      raw: data.raw,
      mode: data.mode,
      sessdata: normalizeSessdata(data.sessdata) || undefined,
      expandPages: data.expandPages,
      spaceLimit: data.spaceLimit,
    });
  });

const playSchema = z.object({
  bvid: z.string().regex(/^BV[0-9A-Za-z]{10}$/),
  cid: z.string().regex(/^\d+$/),
  qn: z.number().int().min(16).max(127),
  title: z.string().max(200),
  part: z.string().max(200).optional(),
  page: z.number().int().min(1).optional(),
  pages: z.number().int().min(1).optional(),
  sessdata: z.string().max(SESSDATA_MAX).optional(),
});

export const getPlayStreamFn = createServerFn({ method: "POST" })
  .validator(playSchema)
  .handler(async ({ data }): Promise<PlayStream> => {
    const play = await fetchPlayurl({
      bvid: data.bvid,
      cid: data.cid,
      qn: data.qn,
      sessdata: normalizeSessdata(data.sessdata) || undefined,
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
        bvid: data.bvid,
      }),
      type: stream.type,
      videoUrl: stream.videoUrl,
      audioUrl: stream.audioUrl,
      size: stream.size,
    };
  });
