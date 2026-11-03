import { app, net, shell } from "electron";
import {
  getFeedbackRecipientEmail,
  getWeb3FormsAccessKey,
  isValidFeedbackEmail,
} from "./feedback-config";
import { getState } from "./store";

export type FeedbackCategory = "inquiry" | "feature";

export type FeedbackSubmitInput = {
  category: FeedbackCategory;
  subject: string;
  body: string;
  replyEmail: string;
};

const COOLDOWN_MS = 60_000;
let lastSubmitAt = 0;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function categoryLabel(category: FeedbackCategory): string {
  return category === "inquiry" ? "문의" : "기능 요청";
}

export function parseFeedbackSubmitInput(raw: unknown): FeedbackSubmitInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const category = o.category;
  if (category !== "inquiry" && category !== "feature") return null;

  const subject =
    typeof o.subject === "string" ? o.subject.trim() : "";
  const body = typeof o.body === "string" ? o.body.trim() : "";
  const replyEmail =
    typeof o.replyEmail === "string" ? o.replyEmail.trim() : "";

  if (subject.length < 1 || subject.length > 120) return null;
  if (body.length < 1 || body.length > 4000) return null;
  if (replyEmail && !isValidFeedbackEmail(replyEmail)) return null;

  return { category, subject, body, replyEmail };
}

function buildMessage(input: FeedbackSubmitInput): string {
  const settings = getState().settings;
  const schoolName = settings.schoolName?.trim() || "(미설정)";
  const version = app.getVersion();
  const platform = process.platform;
  const osVersion = process.getSystemVersion();

  return [
    `구분: ${categoryLabel(input.category)}`,
    `제목: ${input.subject}`,
    "",
    input.body,
    "",
    "---",
    `앱 버전: ${version}`,
    `OS: ${platform} ${osVersion}`,
    `학교 이름: ${schoolName}`,
  ].join("\n");
}

function isFormSubmitSuccess(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

async function postFormSubmit(
  recipient: string,
  payload: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = `https://formsubmit.co/ajax/${recipient}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await net.fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: "https://github.com/wogud32215-dev/SchoolUtil",
        Origin: "https://github.com",
        "User-Agent": UA,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `전송 서버 응답 오류(HTTP ${res.status}). 잠시 후 다시 시도하세요.`,
      };
    }
    const json = (await res.json()) as { success?: unknown; message?: string };
    if (isFormSubmitSuccess(json.success)) {
      return { ok: true };
    }
    const msg = typeof json.message === "string" ? json.message : "";
    if (/activation/i.test(msg)) {
      return {
        ok: false,
        error:
          "FormSubmit 활성화가 필요합니다. 수신 메일함(스팸함 포함)에서 «Activate Form» 링크를 눌러 주세요. 링크는 브라우저 광고 차단(uBlock 등)을 끄고 열어야 합니다. 또는 «메일 앱으로 보내기»를 사용하세요.",
      };
    }
    return {
      ok: false,
      error: msg || "전송에 실패했습니다. 네트워크를 확인하세요.",
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "전송 시간 초과(15초). 네트워크를 확인하세요." };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "전송 중 오류가 났습니다.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function postWeb3Forms(
  accessKey: string,
  mailSubject: string,
  message: string,
  replyEmail: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body: Record<string, string> = {
    access_key: accessKey,
    subject: mailSubject,
    message,
    from_name: "SchoolUtil",
  };
  if (replyEmail) {
    body.email = replyEmail;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await net.fetch("https://api.web3forms.com/submit", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `전송 서버 응답 오류(HTTP ${res.status}). 잠시 후 다시 시도하세요.`,
      };
    }
    const json = (await res.json()) as { success?: boolean; message?: string };
    if (json.success === true) {
      return { ok: true };
    }
    return {
      ok: false,
      error:
        typeof json.message === "string" && json.message
          ? json.message
          : "전송에 실패했습니다.",
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, error: "전송 시간 초과(15초). 네트워크를 확인하세요." };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "전송 중 오류가 났습니다.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function submitFeedback(
  input: FeedbackSubmitInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const recipient = getFeedbackRecipientEmail();
  if (!recipient) {
    return {
      ok: false,
      error: "문의 기능이 아직 설정되지 않았습니다.",
    };
  }

  const now = Date.now();
  if (now - lastSubmitAt < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - lastSubmitAt)) / 1000);
    return {
      ok: false,
      error: `${waitSec}초 후에 다시 보낼 수 있습니다.`,
    };
  }

  const mailSubject = `[SchoolUtil] ${categoryLabel(input.category)}: ${input.subject}`;
  const message = buildMessage(input);

  const web3Key = getWeb3FormsAccessKey();
  const result = web3Key
    ? await postWeb3Forms(web3Key, mailSubject, message, input.replyEmail)
    : await postFormSubmit(recipient, {
        _subject: mailSubject,
        message,
        _captcha: "false",
        _template: "table",
        ...(input.replyEmail
          ? { email: input.replyEmail, _replyto: input.replyEmail }
          : {}),
      });
  if (result.ok) {
    lastSubmitAt = Date.now();
  }
  return result;
}

export async function openFeedbackMailto(
  input: FeedbackSubmitInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const recipient = getFeedbackRecipientEmail();
  if (!recipient) {
    return {
      ok: false,
      error: "문의 기능이 아직 설정되지 않았습니다.",
    };
  }
  const mailSubject = `[SchoolUtil] ${categoryLabel(input.category)}: ${input.subject}`;
  const body = buildMessage(input);
  const url = `mailto:${recipient}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`;
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "메일 앱을 열 수 없습니다.",
    };
  }
}
