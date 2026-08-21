export const SESSDATA_MAX = 4096;

export function normalizeSessdata(raw: string | undefined | null): string {
  if (!raw) return "";
  let s = raw.trim().replace(/^["']+|["']+$/g, "");
  const named = /(?:^|[;\s])SESSDATA\s*=\s*([^;]+)/i.exec(s);
  if (named?.[1]) {
    s = named[1].trim();
  } else if (s.includes(";") && s.includes("=")) {
    const part = s
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.toLowerCase().startsWith("sessdata="));
    if (part) s = part.slice("sessdata=".length).trim();
  }
  s = s.replace(/^["']+|["']+$/g, "");
  s = encodeIfDecoded(s);
  if (s.length > SESSDATA_MAX) s = s.slice(0, SESSDATA_MAX);
  return s;
}

function encodeIfDecoded(s: string): string {
  if (!s) return s;
  const alreadyEncoded = /%2[Cc]/.test(s) && !s.includes(",");
  if (alreadyEncoded) return s;
  if (s.includes(",") || s.includes("*")) {
    return encodeURIComponent(s).replace(/\*/g, "%2A");
  }
  return s;
}

export function sessdataLooksValid(raw: string | undefined | null): boolean {
  const s = normalizeSessdata(raw);
  if (s.length < 24) return false;
  return /^\d+%2[Cc]\d+/i.test(s) || /^[A-Za-z0-9._~%+-]{24,}$/.test(s);
}
