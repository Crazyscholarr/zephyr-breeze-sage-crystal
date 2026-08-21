import { createFileRoute } from "@tanstack/react-router";
import {
  Clock3,
  Download,
  LoaderCircle,
  Search,
  Settings2,
  SquareStack,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FolderPicker, chooseSaveFolder } from "@/components/folder-picker";
import { HistoryDialog } from "@/components/history-dialog";
import { Mark } from "@/components/mark";
import { QueueList } from "@/components/queue-list";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { downloadQueueItem } from "@/lib/bili/download-client";
import { resolveVideosFn } from "@/lib/bili/functions";
import { normalizeSessdata } from "@/lib/bili/sessdata";
import { QUALITIES } from "@/lib/bili/types";
import {
  canPickFolder,
  ensureFolderWrite,
  getCachedFolder,
  restoreFolder,
} from "@/lib/folder";
import { cn } from "@/lib/utils";
import { viCatch, viError } from "@/lib/vi";
import { hydrateDownloader, useDownloader } from "@/store/use-downloader";

export const Route = createFileRoute("/")({ component: Home });

const EXAMPLES = [
  {
    label: "Video mẫu",
    value: "https://www.bilibili.com/video/BV1ztbY6PErp",
    mode: "links" as const,
  },
  {
    label: "Mã BV",
    value: "BV1ztbY6PErp",
    mode: "links" as const,
  },
  {
    label: "Tìm mèo con",
    value: "cat",
    mode: "search" as const,
  },
];

function Home() {
  const [mode, setMode] = useState<"links" | "search">("links");
  const [raw, setRaw] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const {
    settings,
    queue,
    resolving,
    downloading,
    addVideos,
    toggleAll,
    clearQueue,
    removeDone,
    patchItem,
    recordHistory,
    setResolving,
    setDownloading,
    setSettings,
  } = useDownloader();

  useEffect(() => {
    hydrateDownloader();
    void restoreFolder().then((handle) => {
      if (handle?.name) {
        useDownloader.getState().setSettings({ folderName: handle.name });
      }
    });
  }, []);

  const selected = useMemo(
    () => queue.filter((q) => q.selected && q.status !== "downloading"),
    [queue],
  );
  const selectedCount = queue.filter((q) => q.selected).length;
  const allSelected = queue.length > 0 && selectedCount === queue.length;

  async function handleResolve() {
    if (!raw.trim()) {
      toast.error(mode === "search" ? "Hãy nhập từ khóa" : "Hãy dán liên kết hoặc mã BV");
      return;
    }
    setResolving(true);
    try {
      const result = await resolveVideosFn({
        data: {
          raw,
          mode,
          sessdata: normalizeSessdata(settings.sessdata) || undefined,
          expandPages: settings.expandPages,
          spaceLimit: settings.spaceLimit,
        },
      });
      const added = addVideos(result.videos);
      if (added === 0 && result.videos.length > 0) {
        toast.message("Các video này đã nằm trong hàng đợi");
      } else if (added > 0) {
        toast.success(`Đã thêm ${added} video`);
      }
      for (const w of result.warnings) {
        const msg = viError(w.message);
        toast.warning(w.source ? `${w.source}: ${msg}` : msg);
      }
      if (added === 0 && result.videos.length === 0 && result.warnings.length === 0) {
        toast.error("Không phân tích được video nào");
      }
    } catch (err) {
      toast.error(viCatch(err));
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
      const picked = await chooseSaveFolder();
      if (picked) folder = getCachedFolder();
    }
    if (folder) {
      const ok = await ensureFolderWrite(folder);
      if (!ok) {
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
      patchItem(job.id, { status: "waiting", error: undefined });
    }

    const PARALLEL = Math.min(3, jobs.length);
    let cursor = 0;
    async function worker() {
      while (true) {
        if (controller.signal.aborted) return;
        const index = cursor;
        cursor += 1;
        if (index >= jobs.length) return;
        const job = jobs[index]!;
        const current = useDownloader.getState().queue.find((q) => q.id === job.id);
        if (!current) continue;
        patchItem(job.id, {
          status: "downloading",
          progress: 0,
          received: 0,
          total: 0,
          startedAt: Date.now(),
        });
        try {
          const result = await downloadQueueItem(
            current,
            settings.quality,
            normalizeSessdata(settings.sessdata) || undefined,
            ({ received, total }) => {
              patchItem(job.id, {
                received,
                total,
                progress: total > 0 ? Math.min(1, received / total) : 0,
              });
            },
            controller.signal,
            folder,
          );
          patchItem(job.id, {
            status: "done",
            progress: 1,
            qualityLabel: result.quality,
          });
          recordHistory(current);
          ok += 1;
          if (result.type === "dash") {
            toast.message("Video này tách âm/hình — đã lưu hai file riêng");
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          fail += 1;
          patchItem(job.id, {
            status: "error",
            error: viError(err instanceof Error ? err.message : "Tải thất bại"),
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

  return (
    <div className="grain relative min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Mark className="size-7" />
            <div className="leading-tight">
              <p className="font-display text-base font-medium tracking-tight">Framebox</p>
              <p className="hidden text-xs text-muted sm:block">Tải hàng loạt video Bilibili</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Lịch sử tải"
              onClick={() => setHistoryOpen(true)}
            >
              <Clock3 />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cài đặt"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-36 pt-8 sm:pt-12">
        <section className="stagger-in max-w-2xl">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Framebox
          </p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Dán liên kết vào,
            <br />
            tải cả loạt một lần.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Nhận liên kết video, mã BV / av, link b23, anime, tuyển tập, yêu thích, trang UP,
            hoặc tìm theo từ khóa. Chọn thư mục lưu trên máy rồi tải hàng loạt.
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex gap-1 rounded-md bg-elevated p-1">
            <button
              type="button"
              onClick={() => setMode("links")}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-sm text-sm transition-colors duration-150",
                mode === "links" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
              )}
            >
              <SquareStack className="size-4" />
              Liên kết / mã
            </button>
            <button
              type="button"
              onClick={() => setMode("search")}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-sm text-sm transition-colors duration-150",
                mode === "search" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
              )}
            >
              <Search className="size-4" />
              Tìm kiếm
            </button>
          </div>

          <label className="sr-only" htmlFor="paste">
            {mode === "search" ? "Từ khóa tìm kiếm" : "Liên kết video"}
          </label>
          <Textarea
            id="paste"
            className="mt-4 min-h-32 font-mono text-sm"
            placeholder={
              mode === "search"
                ? "Nhập từ khóa, ví dụ: mèo con"
                : "Dán một hoặc nhiều liên kết, mỗi dòng một cái.\nVí dụ: https://www.bilibili.com/video/BVxxxx\nhoặc mã BV, av, link b23.tv, anime, trang UP"
            }
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void handleResolve();
              }
            }}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  setMode(ex.mode);
                  setRaw(ex.value);
                }}
                className="h-8 rounded-full border border-border px-3 text-xs text-muted hover:text-fg"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-subtle">
              Ctrl / ⌘ + Enter để phân tích · Chỉ dùng cá nhân, tôn trọng bản quyền
            </p>
            <Button
              type="button"
              onClick={() => void handleResolve()}
              disabled={resolving}
              className="w-full sm:w-auto"
            >
              {resolving ? <LoaderCircle className="animate-spin" /> : <Search />}
              {resolving ? "Đang phân tích" : mode === "search" ? "Tìm và thêm" : "Phân tích vào hàng đợi"}
            </Button>
          </div>
        </section>

        <FolderPicker variant="banner" />

        {queue.length > 0 ? (
          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-medium">Hàng đợi</h2>
                <p className="text-xs text-muted">
                  {queue.length} video · đã chọn {selectedCount}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAll(!allSelected)}
                >
                  {allSelected ? "Bỏ chọn" : "Chọn hết"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={removeDone}>
                  Xóa đã xong
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearQueue}>
                  <Trash2 />
                  Xóa hết
                </Button>
              </div>
            </div>
            <QueueList />
          </section>
        ) : (
          <section className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Nhiều cách nhập",
                body: "Liên kết, mã BV, link ngắn, anime, tuyển tập, yêu thích, trang UP hoặc từ khóa.",
              },
              {
                title: "Chọn thư mục lưu",
                body: "Chọn một folder trên máy — cả loạt file ghi thẳng vào đó.",
              },
              {
                title: "Chọn chất lượng",
                body: "Mặc định 720P. Thêm SESSDATA để thử nét hơn và nội dung hội viên.",
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-lg border border-border bg-surface px-4 py-4"
              >
                <h3 className="font-display text-base font-medium">{card.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{card.body}</p>
              </article>
            ))}
          </section>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            {QUALITIES.map((q) => {
              const active = settings.quality === q.qn;
              return (
                <button
                  key={q.qn}
                  type="button"
                  onClick={() => setSettings({ quality: q.qn })}
                  className={cn(
                    "h-10 shrink-0 rounded-full px-3 text-xs font-medium",
                    active
                      ? "bg-accent text-accent-fg"
                      : "border border-border text-muted hover:text-fg",
                  )}
                >
                  {q.label}
                </button>
              );
            })}
            <FolderPicker compact />
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={downloading || selected.length === 0}
            onClick={() => void handleDownload()}
          >
            {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
            {downloading
              ? "Đang lưu"
              : selectedCount
                ? `Tải ${selectedCount} đã chọn`
                : "Tải đã chọn"}
          </Button>
        </div>
      </footer>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
