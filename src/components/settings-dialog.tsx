import { Check, ClipboardPaste, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FolderPicker } from "@/components/folder-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { sessdataLooksValid } from "@/lib/bili/sessdata";
import { QUALITIES } from "@/lib/bili/types";
import { useDownloader } from "@/store/use-downloader";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { settings, setSettings } = useDownloader();
  const [pasting, setPasting] = useState(false);
  const hasCookie = settings.sessdata.length > 0;
  const cookieOk = sessdataLooksValid(settings.sessdata);

  async function pasteSessdata() {
    setPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.error("Clipboard trống — hãy copy SESSDATA trước");
        return;
      }
      setSettings({ sessdata: text });
      toast.success("Đã dán cookie SESSDATA");
    } catch {
      toast.error("Không đọc được clipboard — dán thủ công vào ô bên dưới (Ctrl+V)");
    } finally {
      setPasting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cài đặt</DialogTitle>
          <DialogDescription>
            Chỉ lưu trên trình duyệt này, không gửi mật khẩu đi đâu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <FolderPicker />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="sessdata">SESSDATA</Label>
              {hasCookie ? (
                <span
                  className={
                    cookieOk
                      ? "inline-flex items-center gap-1 text-[11px] text-success"
                      : "text-[11px] text-warn"
                  }
                >
                  {cookieOk ? <Check className="size-3" /> : null}
                  {cookieOk
                    ? `Đã lưu · ${settings.sessdata.length} ký tự · 1080P+`
                    : "Cookie chưa đúng định dạng"}
                </span>
              ) : (
                <span className="text-[11px] text-muted">Tuỳ chọn — cần cho 1080P+</span>
              )}
            </div>
            <Textarea
              id="sessdata"
              autoComplete="off"
              spellCheck={false}
              placeholder="Dán giá trị SESSDATA vào đây…"
              value={settings.sessdata}
              onChange={(e) => setSettings({ sessdata: e.target.value })}
              className="min-h-24 font-mono text-xs leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={pasteSessdata} disabled={pasting}>
                <ClipboardPaste className="size-3.5" />
                Dán từ clipboard
              </Button>
              {hasCookie ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings({ sessdata: "" })}
                >
                  <Trash2 className="size-3.5" />
                  Xóa
                </Button>
              ) : null}
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
              <li>Mở Bilibili đang đăng nhập → Cookie-Editor</li>
              <li>Click cookie tên <span className="text-fg">SESSDATA</span></li>
              <li>
                Tắt tick <span className="text-fg">Show URL-decoded</span> rồi copy ô Value
              </li>
              <li>Quay lại đây, bấm Dán (hoặc Ctrl+V)</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label>Chất lượng mặc định</Label>
            <div className="grid grid-cols-4 gap-2">
              {QUALITIES.map((q) => {
                const active = settings.quality === q.qn;
                return (
                  <button
                    key={q.qn}
                    type="button"
                    onClick={() => setSettings({ quality: q.qn })}
                    className={
                      active
                        ? "h-11 rounded-sm bg-accent text-accent-fg text-xs font-medium"
                        : "h-11 rounded-sm border border-border bg-elevated text-muted text-xs hover:text-fg"
                    }
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              Chưa đăng nhập thường tối đa 720P. Nét hơn cần cookie.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-elevated px-3 py-3">
            <div>
              <p className="text-sm font-medium">Tách các tập (P)</p>
              <p className="text-xs text-muted">Video nhiều phần sẽ vào hàng đợi từng tập</p>
            </div>
            <Switch
              checked={settings.expandPages}
              onCheckedChange={(v) => setSettings({ expandPages: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spaceLimit">Số video lấy từ trang UP</Label>
            <Input
              id="spaceLimit"
              type="number"
              min={1}
              max={50}
              value={settings.spaceLimit}
              onChange={(e) =>
                setSettings({
                  spaceLimit: Math.min(50, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Xong
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
