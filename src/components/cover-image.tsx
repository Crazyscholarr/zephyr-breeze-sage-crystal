import { cn } from "@/lib/utils";

export function CoverImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const proxied = src
    ? `/api/cover?u=${encodeURIComponent(src)}`
    : "";
  return (
    <div className={cn("relative overflow-hidden bg-elevated", className)}>
      {proxied ? (
        <img
          src={proxied}
          alt={alt}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <div className="size-full bg-elevated" />
      )}
    </div>
  );
}
