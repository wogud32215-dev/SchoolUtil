import iconv from "iconv-lite";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 SchoolUtil";

const DEFAULT_TIMEOUT_MS = 25_000;

export type ComciFetchOptions = {
  requestToken?: string | null;
  timeoutMs?: number;
};

async function fetchBytesWithInit(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (res.status === 403) {
      throw new Error("컴시간이 요청을 거부했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBytes(
  url: string,
  opts: ComciFetchOptions = {},
): Promise<Buffer> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (opts.requestToken) {
    headers["X-Hour-Token"] = opts.requestToken;
  }
  return fetchBytesWithInit(url, { headers }, timeoutMs);
}

export async function postComciPlainBody(
  url: string,
  body: string,
  opts: ComciFetchOptions = {},
): Promise<Buffer> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Content-Type": "text/plain; charset=UTF-8",
  };
  if (opts.requestToken) {
    headers["X-Hour-Token"] = opts.requestToken;
  }
  return fetchBytesWithInit(
    url,
    { method: "POST", headers, body },
    timeoutMs,
  );
}

export async function fetchText(
  url: string,
  opts: ComciFetchOptions = {},
): Promise<string> {
  const buf = await fetchBytes(url, opts);
  const utf8 = buf.toString("utf8");
  if (
    utf8.includes("자료") ||
    utf8.startsWith("enc") ||
    /^\d{4}:/.test(utf8.trim())
  ) {
    return utf8.replace(/\0/g, "");
  }
  return iconv.decode(buf, "euc-kr").replace(/\0/g, "");
}

export async function postComciText(
  url: string,
  body: string,
  opts: ComciFetchOptions = {},
): Promise<string> {
  const buf = await postComciPlainBody(url, body, opts);
  const utf8 = buf.toString("utf8");
  if (
    utf8.includes("자료") ||
    utf8.startsWith("enc") ||
    /^\d{4}:/.test(utf8.trim())
  ) {
    return utf8.replace(/\0/g, "");
  }
  return iconv.decode(buf, "euc-kr").replace(/\0/g, "");
}
