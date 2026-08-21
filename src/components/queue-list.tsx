import { Trash2 } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { QueueItem, SourceKind } from "@/lib/bili/types";
import { formatBytes, formatCount, formatDuration, formatSpeed } from "@/lib/utils";
import { viError } from "@/lib/vi";
import { useDownloader } from "@/store/use-downloader";

const KIND_LABEL: Record<SourceKind, string> = {
  video: "Video",
  bangumi: "Anime",
  space: "Kênh UP",
  search: "Tìm kiếm",
  season: "Tuyển tập",
  favorite: "Yêu thích",
  short: "Link ngắn",
};

function statusTone(item: QueueItem): "muted" | "accent" | "success" | "warn" | "danger" {
  if (item.status === "done") return "success";
  if (item.status === "error") return "danger";
  if (item.status === "downloading") return "accent";
  if (item.status === "waiting") return "warn";
  return "muted";
}

function statusLabel(item: QueueItem): string {
  if (item.status === "done") return "Xong";
  if (item.status === "error") return "Lỗi";
  if (item.status === "downloading") return "Đang tải";
  if (item.status === "waiting") return "Chờ";
  return KIND_LABEL[item.sourceKind] ?? item.sourceLabel;
}

export function QueueList() {
  const { queue, toggle, remove } = useDownloader();

  if (queue.length === 0) return null;

  return (
    <ul className="space-y-2">
      {queue.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-border bg-surface p-3 sm:p-3.5"
        >
          <div className="flex gap-3">
            <div className="flex items-start pt-1">
              <Checkbox
                checked={item.selected}
                onCheckedChange={() => toggle(item.id)}
                aria-label={`Chọn ${item.title}`}
              />
            </div>
            <CoverImage
              src={item.cover}
              alt=""
              className="hidden aspect-video w-32 shrink-0 rounded-sm sm:block"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {item.owner}
                    {item.pages > 1 ? ` · P${item.page}/${item.pages} ${item.part}` : ""}
                    {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
                    {item.views ? ` · ${formatCount(item.views)} lượt xem` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge tone={statusTone(item)}>{statusLabel(item)}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted"
                    onClick={() => remove(item.id)}
                    aria-label="Gỡ khỏi hàng đợi"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {item.status === "downloading" || item.progress > 0 ? (
                <div className="mt-2 space-y-1">
                  <Progress value={Math.round(item.progress * 100)} />
                  <p className="text-xs tabular-nums text-muted">
                    {item.received === 0 && item.status === "downloading"
                      ? "Đang kết nối máy chủ…"
                      : `${formatBytes(item.received)}${item.total ? ` / ${formatBytes(item.total)}` : ""}`}
                    {item.status === "downloading" && item.startedAt && item.received > 0
                      ? ` · ${formatSpeed(item.received / Math.max(0.4, (Date.now() - item.startedAt) / 1000))}`
                      : ""}
                    {item.qualityLabel ? ` · ${item.qualityLabel}` : ""}
                  </p>
                </div>
              ) : null}
              {item.status === "error" && item.error ? (
                <p className="mt-1 text-xs text-danger">{viError(item.error)}</p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
