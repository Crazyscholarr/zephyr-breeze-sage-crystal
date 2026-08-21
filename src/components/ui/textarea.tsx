import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      suppressHydrationWarning
      className={cn(
        "flex min-h-36 w-full rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-fg placeholder:text-subtle",
        "transition-[border-color,box-shadow] duration-150 ease-out resize-y",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-border-strong",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
