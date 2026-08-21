import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDownloader } from "@/store/use-downloader";

export function HistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { history, clearHistory } = useDownloader();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lịch sử tải</DialogTitle>
          <DialogDescription>
            Các tác vụ vừa xong trên máy này, không đồng bộ sang thiết bị khác.
          </DialogDescription>
        </DialogHeader>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Chưa có lượt tải nào.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {history.map((h) => (
              <li
                key={`${h.id}-${h.at}`}
                className="rounded-md border border-border bg-elevated px-3 py-2"
              >
                <p className="truncate text-sm text-fg">{h.title}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {h.bvid} · {new Date(h.at).toLocaleString("vi-VN")}
                </p>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 ? (
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={clearHistory}>
              Xóa lịch sử
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
