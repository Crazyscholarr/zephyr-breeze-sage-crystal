const MAP: Array<[RegExp, string]> = [
  [/账号未登录/, "Chưa đăng nhập Bilibili — thêm SESSDATA trong Cài đặt"],
  [/啥都木有/, "Không tìm thấy video này"],
  [/请求过于频繁/, "Bilibili đang giới hạn tần suất, thử lại sau"],
  [/风控校验失败/, "Bilibili chặn yêu cầu, thử lại sau"],
  [/哔哩哔哩接口返回了非 JSON/, "Bilibili trả về lỗi (có thể bị chặn), thử lại sau"],
  [/无法获取 WBI/, "Không lấy được khóa tìm kiếm, thử lại sau"],
  [/无法获取播放地址/, "Không lấy được đường dẫn tải"],
  [/没有可用的视频流/, "Không có luồng video khả dụng"],
  [/无效的地址/, "Địa chỉ không hợp lệ"],
  [/不支持的协议/, "Giao thức không hỗ trợ"],
  [/拒绝代理非哔哩哔哩/, "Chỉ tải được video Bilibili"],
  [/无效请求/, "Yêu cầu không hợp lệ"],
  [/画质无效/, "Chất lượng không hợp lệ"],
  [/缺少有效的 BV/, "Thiếu mã BV hoặc cid hợp lệ"],
  [/没有对应的音视频流/, "Không có luồng âm thanh / hình tương ứng"],
  [/源站返回/, "Máy chủ nguồn trả lỗi"],
  [/下载失败/, "Tải thất bại"],
  [/解析失败/, "Phân tích thất bại"],
  [/条目解析失败/, "Không đọc được mục này"],
  [/没有识别到有效/, "Không nhận ra liên kết, mã BV hoặc từ khóa"],
  [/已达到单次/, "Đã đạt giới hạn một lần, hãy tách thành nhiều đợt"],
  [/暂未解析到投稿/, "Chưa lấy được video từ kênh này — thử tìm kiếm hoặc dán liên kết"],
  [/没有搜到/, "Không tìm thấy kết quả"],
  [/接口错误/, "Lỗi API Bilibili"],
  [/too_big[\s\S]*sessdata/i, "Cookie SESSDATA quá dài. Chỉ dán giá trị SESSDATA, không dán cả chuỗi cookie."],
  [/expected string to have <=200 characters/i, "Cookie SESSDATA quá dài. Chỉ dán giá trị SESSDATA."],
];

type ZodIssue = { code?: string; path?: unknown[]; message?: string };

function fromZodDump(message: string): string | null {
  const start = message.indexOf("[");
  const end = message.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(message.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const issues = parsed as ZodIssue[];
    const sess = issues.find((i) => Array.isArray(i.path) && i.path.includes("sessdata"));
    if (sess?.code === "too_big") {
      return "Cookie SESSDATA quá dài. Chỉ dán giá trị SESSDATA, không dán cả chuỗi cookie.";
    }
    if (issues.some((i) => i.code === "too_big")) {
      return "Dữ liệu gửi lên quá dài, hãy rút gọn rồi thử lại";
    }
    return "Dữ liệu gửi lên không hợp lệ";
  } catch {
    return null;
  }
}

export function viError(message: string): string {
  const zod = fromZodDump(message);
  if (zod) return zod;
  for (const [re, vi] of MAP) {
    if (re.test(message)) return vi;
  }
  return message;
}

export function viCatch(err: unknown): string {
  if (err instanceof Error) return viError(err.message);
  if (typeof err === "string") return viError(err);
  try {
    return viError(JSON.stringify(err));
  } catch {
    return "Có lỗi xảy ra";
  }
}
