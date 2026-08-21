import { createHash } from "node:crypto";

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20,
  34, 44, 52,
];

type WbiCache = { mixin: string; expiresAt: number };

let cache: WbiCache | null = null;

function mixinKey(raw: string): string {
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i] ?? "")
    .join("")
    .slice(0, 32);
}

function filenameKey(url: string): string {
  const file = url.split("/").pop() ?? "";
  return file.split(".")[0] ?? "";
}

export async function getMixinKey(
  fetchNav: () => Promise<{ img_url: string; sub_url: string }>,
): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) return cache.mixin;
  const { img_url, sub_url } = await fetchNav();
  const mixin = mixinKey(filenameKey(img_url) + filenameKey(sub_url));
  cache = { mixin, expiresAt: Date.now() + 1000 * 60 * 30 };
  return mixin;
}

export function signWbi(
  params: Record<string, string | number>,
  mixin: string,
): string {
  const withTs: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    withTs[k] = String(v).replace(/[!'()*]/g, "");
  }
  withTs.wts = String(Math.floor(Date.now() / 1000));
  const query = Object.keys(withTs)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(withTs[k]!)}`)
    .join("&");
  const wRid = createHash("md5")
    .update(query + mixin)
    .digest("hex");
  return `${query}&w_rid=${wRid}`;
}
