const ALLOWED_HOST_SUFFIXES = [
  ".bilivideo.com",
  ".akamaized.net",
  ".biliapi.net",
  ".hdslb.com",
  ".bilibili.com",
  ".b23.tv",
  ".bili2233.cn",
];

const ALLOWED_HOSTS = new Set([
  "bilivideo.com",
  "akamaized.net",
  "biliapi.net",
  "hdslb.com",
  "bilibili.com",
  "api.bilibili.com",
  "www.bilibili.com",
  "space.bilibili.com",
  "b23.tv",
  "bili2233.cn",
  "i0.hdslb.com",
  "i1.hdslb.com",
  "i2.hdslb.com",
  "upos-hz-mirrorakam.akamaized.net",
]);

export function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host.endsWith(suffix) || host === suffix.slice(1),
  );
}

export function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("无效的地址");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("不支持的协议");
  }
  if (!isAllowedHost(url.hostname)) {
    throw new Error("拒绝代理非哔哩哔哩域名");
  }
  return url;
}

export function httpsify(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}
