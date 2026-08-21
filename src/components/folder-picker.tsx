import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  canPickFolder,
  clearFolder,
  pickFolder,
} from "@/lib/folder";
import { cn } from "@/lib/utils";
import { useDownloader } from "@/store/use-downloader";

function pickErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") return "";
  const name = err instanceof DOMException ? err.name : "";
  const raw = err instanceof Error ? err.message : "";
  if (
    name === "SecurityError" ||
    name === "NotAllowedError" ||
    /not allowed|cross-origin|iframe|permissions policy/i.test(raw)
  ) {
    return "Trình duyệt đang chặn chọn thư mục tại đây. Hãy dùng Chrome hoặc Edge, mở Framebox ở tab riêng — hoặc để trống, file sẽ vào thư mục Tải xuống.";
  }
  return raw || "Không chọn được thư mục";
}

export async function chooseSaveFolder(): Promise<boolean> {
  const { setSettings } = useDownloader.getState();
  try {
    const handle = await pickFolder();
    setSettings({ folderName: handle.name });
    toast.success(`Sẽ lưu vào thư mục «${handle.name}»`);
    return true;
  } catch (err) {
    const msg = pickErrorMessage(err);
    if (!msg) return false;
    toast.error(msg);
    return false;
  }
}

export function FolderPicker({
  compact = false,
  variant,
}: {
  compact?: boolean;
  variant?: "banner" | "compact" | "settings";
}) {
  const { settings, setSettings } = useDownloader();
  const [supported, setSupported] = useState(true);
  const name = settings.folderName;
  const mode = variant ?? (compact ? "compact" : "settings");

  useEffect(() => {
    setSupported(canPickFolder());
  }, []);

  function clear() {
    void clearFolder();
    setSettings({ folderName: "" });
    toast.message("Đã bỏ thư mục. File sẽ tải vào thư mục Tải xuống mặc định.");
  }

  if (mode === "compact") {
    return (
      <button
        type="button"
        onClick={() => void chooseSaveFolder()}
        className={cn(
          "flex h-10 min-w-0 max-w-56 shrink items-center gap-2 rounded-full border px-3 text-xs",
          name
            ? "border-border-strong text-fg"
            : "border-border text-muted hover:text-fg",
        )}
        title={name ? `Thư mục: ${name}` : "Chọn thư mục lưu"}
      >
        <FolderOpen className="size-3.5 shrink-0" />
        <span className="truncate">{name ? `Lưu: ${name}` : "Chọn thư mục lưu"}</span>
      </button>
    );
  }

  if (mode === "banner") {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated text-accent">
              <FolderOpen className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Thư mục lưu video</p>
              <p className="truncate text-xs text-muted">
                {name
                  ? `Đang ghi vào «${name}»`
                  : supported
                    ? "Chưa chọn — bấm để chọn folder trên máy"
                    : "Trình duyệt không cho chọn folder — file vào Tải xuống"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {name ? (
              <Button type="button" variant="ghost" onClick={clear}>
                Bỏ
              </Button>
            ) : null}
            <Button
              type="button"
              variant={name ? "secondary" : "default"}
              onClick={() => void chooseSaveFolder()}
            >
              <FolderOpen />
              {name ? "Đổi thư mục" : "Chọn thư mục"}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Thư mục lưu</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-w-0 flex-1 justify-start"
          onClick={() => void chooseSaveFolder()}
        >
          <FolderOpen />
          <span className="truncate">{name || "Chọn thư mục trên máy"}</span>
        </Button>
        {name ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Bỏ
          </Button>
        ) : null}
      </div>
      <p className="text-xs leading-relaxed text-muted">
        {supported
          ? "Chọn một thư mục trên máy — mọi video sẽ ghi thẳng vào đó, không hỏi từng file."
          : "Trình duyệt này không cho chọn thư mục. File sẽ lưu vào thư mục Tải xuống."}
      </p>
    </div>
  );
}
