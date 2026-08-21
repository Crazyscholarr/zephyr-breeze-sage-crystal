export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect x="3" y="5" width="26" height="22" rx="4" className="stroke-accent" strokeWidth="1.6" />
      <rect x="8" y="9" width="16" height="14" rx="2" className="fill-accent/15 stroke-accent" strokeWidth="1.2" />
      <path d="M14 13.2v5.6l5.2-2.8-5.2-2.8Z" className="fill-accent" />
    </svg>
  );
}
