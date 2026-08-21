export const QUALITIES = [
  { qn: 16, label: "360P", hint: "Mượt" },
  { qn: 32, label: "480P", hint: "Nét" },
  { qn: 64, label: "720P", hint: "HD" },
  { qn: 80, label: "1080P", hint: "Full HD" },
] as const;

export type QualityQn = (typeof QUALITIES)[number]["qn"];

export type SourceKind =
  | "video"
  | "bangumi"
  | "space"
  | "search"
  | "season"
  | "favorite"
  | "short";

export type ParsedTarget =
  | { kind: "bvid"; bvid: string; source: string }
  | { kind: "aid"; aid: string; source: string }
  | { kind: "space"; mid: string; source: string }
  | { kind: "bangumi-ep"; epId: string; source: string }
  | { kind: "bangumi-ss"; seasonId: string; source: string }
  | { kind: "season"; mid: string; seasonId: string; source: string }
  | { kind: "favorite"; mediaId: string; source: string }
  | { kind: "short"; url: string; source: string }
  | { kind: "keyword"; keyword: string; source: string };

export type VideoEntry = {
  id: string;
  bvid: string;
  aid: string;
  cid: string;
  page: number;
  pages: number;
  part: string;
  title: string;
  owner: string;
  ownerMid: string;
  duration: number;
  cover: string;
  views: number;
  sourceKind: SourceKind;
  sourceLabel: string;
};

export type ResolveWarning = {
  source: string;
  message: string;
};

export type ResolveResult = {
  videos: VideoEntry[];
  warnings: ResolveWarning[];
};

export type PlayStream = {
  bvid: string;
  cid: string;
  quality: number;
  qualityLabel: string;
  acceptQuality: number[];
  filename: string;
  type: "mp4" | "dash";
  videoUrl: string;
  audioUrl?: string;
  size?: number;
};

export type QueueStatus = "idle" | "waiting" | "downloading" | "done" | "error";

export type QueueItem = VideoEntry & {
  selected: boolean;
  status: QueueStatus;
  progress: number;
  received: number;
  total: number;
  error?: string;
  qualityLabel?: string;
  startedAt?: number;
};
