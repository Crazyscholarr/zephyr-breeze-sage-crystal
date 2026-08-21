import { create } from "zustand";
import { normalizeSessdata } from "@/lib/bili/sessdata";
import type { QualityQn, QueueItem, VideoEntry } from "@/lib/bili/types";

const SETTINGS_KEY = "framebox-settings-v1";
const HISTORY_KEY = "framebox-history-v1";

export type AppSettings = {
  sessdata: string;
  quality: QualityQn;
  expandPages: boolean;
  spaceLimit: number;
  folderName: string;
};

export type HistoryItem = {
  id: string;
  title: string;
  bvid: string;
  at: number;
};

const defaultSettings: AppSettings = {
  sessdata: "",
  quality: 64,
  expandPages: true,
  spaceLimit: 20,
  folderName: "",
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...defaultSettings, ...parsed, sessdata: normalizeSessdata(parsed.sessdata) };
  } catch {
    return defaultSettings;
  }
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

type State = {
  settings: AppSettings;
  queue: QueueItem[];
  history: HistoryItem[];
  resolving: boolean;
  downloading: boolean;
  setSettings: (patch: Partial<AppSettings>) => void;
  addVideos: (videos: VideoEntry[]) => number;
  toggle: (id: string) => void;
  toggleAll: (selected: boolean) => void;
  remove: (id: string) => void;
  clearQueue: () => void;
  removeDone: () => void;
  patchItem: (id: string, patch: Partial<QueueItem>) => void;
  selected: () => QueueItem[];
  recordHistory: (item: QueueItem) => void;
  clearHistory: () => void;
  setResolving: (v: boolean) => void;
  setDownloading: (v: boolean) => void;
};

export const useDownloader = create<State>((set, get) => ({
  settings: defaultSettings,
  queue: [],
  history: [],
  resolving: false,
  downloading: false,
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    if (patch.sessdata !== undefined) settings.sessdata = normalizeSessdata(patch.sessdata);
    set({ settings });
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  },
  addVideos: (videos) => {
    const existing = new Set(get().queue.map((q) => q.id));
    const next: QueueItem[] = videos
      .filter((v) => !existing.has(v.id))
      .map((v) => ({
        ...v,
        selected: true,
        status: "idle",
        progress: 0,
        received: 0,
        total: 0,
      }));
    set({ queue: [...get().queue, ...next] });
    return next.length;
  },
  toggle: (id) =>
    set({
      queue: get().queue.map((q) =>
        q.id === id ? { ...q, selected: !q.selected } : q,
      ),
    }),
  toggleAll: (selected) =>
    set({ queue: get().queue.map((q) => ({ ...q, selected })) }),
  remove: (id) => set({ queue: get().queue.filter((q) => q.id !== id) }),
  clearQueue: () => set({ queue: [] }),
  removeDone: () =>
    set({ queue: get().queue.filter((q) => q.status !== "done") }),
  patchItem: (id, patch) =>
    set({
      queue: get().queue.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }),
  selected: () => get().queue.filter((q) => q.selected),
  recordHistory: (item) => {
    const history = [
      { id: item.id, title: item.title, bvid: item.bvid, at: Date.now() },
      ...get().history.filter((h) => h.id !== item.id),
    ].slice(0, 40);
    set({ history });
    if (typeof window !== "undefined") {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  },
  clearHistory: () => {
    set({ history: [] });
    if (typeof window !== "undefined") localStorage.removeItem(HISTORY_KEY);
  },
  setResolving: (resolving) => set({ resolving }),
  setDownloading: (downloading) => set({ downloading }),
}));

export function hydrateDownloader() {
  const settings = loadSettings();
  const history = loadHistory();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota
    }
  }
  useDownloader.setState({
    settings,
    history,
  });
}
