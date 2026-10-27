import { app } from "electron";
import { minimizeAppWindowsForPortal } from "./portal-window-focus";
import CDP from "chrome-remote-interface";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { AppSettings } from "./store";
import type { PortalId } from "./portal-ids";
import { appendPortalLog } from "./portal-log";
import { tryOsCertPasswordInput } from "./portal-cert-ui";
import {
  launchPortalUrl,
  type PortalBrowser,
  portalBrowserFromSettings,
  resolveBrowserExecutable,
} from "./portal-launch";
import { activatePortalBrowserTab } from "./portal-cdp-activate";
import {
  isPortalCertLoginUrl,
  runNeisLoginSteps,
} from "./portal-neis-steps";
import { getPortalCredentials } from "./secrets";

const DEBUG_PORTS = [9333, 9222] as const;
const PRIMARY_DEBUG_PORT = DEBUG_PORTS[0];

let portalAutomationBusy = false;
const AUTOMATION_TIMEOUT_MS = 4 * 60 * 1000;

export type AutomationResult =
  | { ok: true; summary: string; mode: "automation" | "url_only" }
  | { ok: false; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function isDebuggerUp(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function findActiveDebugPort(): Promise<number | null> {
  for (const port of DEBUG_PORTS) {
    if (await isDebuggerUp(port)) return port;
  }
  return null;
}

function automationProfileDir(browser: PortalBrowser): string {
  const sub =
    browser === "edge" ? "portal-edge-profile" : "portal-chrome-profile";
  return path.join(app.getPath("userData"), sub);
}

function assertAutomationBrowser(
  browser: PortalBrowser,
): Exclude<PortalBrowser, "default" | "whale"> {
  if (browser === "default") {
    throw new Error(
      "자동 로그인은 Chrome 또는 Edge를 선택해야 합니다. (시스템 기본은 URL만 열기)",
    );
  }
  if (browser === "whale") {
    throw new Error(
      "자동 로그인(CDP)은 Chrome 또는 Edge만 지원합니다. Whale은 URL만 열기를 사용하세요.",
    );
  }
  return browser;
}

async function launchBrowserWithDebug(
  browser: Exclude<PortalBrowser, "default" | "whale">,
): Promise<number> {
  const exe = resolveBrowserExecutable(browser);
  if (exe === "default") {
    throw new Error(
      "Chrome 또는 Edge 실행 파일을 찾지 못했습니다. 브라우저가 설치되어 있는지 확인하세요.",
    );
  }

  const profile = automationProfileDir(browser);
  fs.mkdirSync(profile, { recursive: true });

  appendPortalLog(
    `전용 프로필로 브라우저 실행(포트 ${PRIMARY_DEBUG_PORT})… 기존 Chrome 창과 별도입니다.`,
  );

  const args = [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${PRIMARY_DEBUG_PORT}`,
    "--remote-debugging-address=127.0.0.1",
    "--remote-allow-origins=*",
    "--no-first-run",
    "--no-default-browser-check",
    "--start-maximized",
    "--disable-features=DevToolsDebuggingRestrictions",
  ];

  const child = spawn(exe, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();

  for (let i = 0; i < 40; i++) {
    const port = await findActiveDebugPort();
    if (port) {
      appendPortalLog(`원격 디버깅 연결됨 (포트 ${port}).`);
      return port;
    }
    await sleep(500);
  }

  throw new Error(
    "원격 디버깅에 연결하지 못했습니다. Chrome·Edge를 모두 종료한 뒤 다시 «지금 한 번 해 보기»를 눌러 보세요. 계속 실패하면 chrome://inspect/#remote-debugging에서 «Allow remote debugging for this browser instance»를 켠 평소 브라우저를 사용하거나, URL만 열기 모드를 쓰세요.",
  );
}

async function ensureDebugger(
  browser: PortalBrowser,
): Promise<number> {
  const b = assertAutomationBrowser(browser);
  const existing = await findActiveDebugPort();
  if (existing) {
    appendPortalLog(
      `이미 열린 디버깅 포트(${existing})에 연결합니다. 평소 Chrome에서 원격 디버깅을 켠 경우일 수 있습니다.`,
    );
    return existing;
  }
  return launchBrowserWithDebug(b);
}

const WEB_CERT_WAIT_MS = 15_000;

// 나이스 인증서 창은 별도 프로그램이 아니라 페이지 안 웹 레이어(kc-*)로 뜬다.
const WEB_CERT_FIND_EXPR = `(() => {
  const docs = [document];
  for (const f of document.querySelectorAll("iframe")) {
    try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) {}
  }
  for (const doc of docs) {
    const el = doc.querySelector('input[name="certPassword"], input.kc-pw-box');
    if (el && el.getBoundingClientRect().width > 0) return true;
  }
  return false;
})()`;

function webCertSelectExpr(certId: string): string {
  return `((id) => {
  const docs = [document];
  for (const f of document.querySelectorAll("iframe")) {
    try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) {}
  }
  for (const doc of docs) {
    if (!doc.querySelector('input[name="certPassword"], input.kc-pw-box')) continue;
    if (id) {
      const row = [...doc.querySelectorAll("tr")].find(
        (tr) => (tr.innerText || "").includes(id) && tr.getBoundingClientRect().width > 0);
      if (row) { (row.querySelector("td") || row).click(); }
    }
    const pw = doc.querySelector('input[name="certPassword"], input.kc-pw-box');
    pw.value = "";
    pw.focus();
    return true;
  }
  return false;
})(${JSON.stringify(certId)})`;
}

const WEB_CERT_SUBMIT_EXPR = `(() => {
  const docs = [document];
  for (const f of document.querySelectorAll("iframe")) {
    try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) {}
  }
  for (const doc of docs) {
    const pw = doc.querySelector('input[name="certPassword"], input.kc-pw-box');
    if (!pw) continue;
    if (!pw.value) return "empty";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    pw.dispatchEvent(new Event("change", { bubbles: true }));
    const btn = doc.querySelector("button.kc-btn-blue") ||
      [...doc.querySelectorAll("button, a, [role=button]")].find(
        (b) => (b.innerText || "").trim() === "확인" && b.getBoundingClientRect().width > 0);
    if (btn) { btn.click(); return "clicked"; }
    return "nobutton";
  }
  return "missing";
})()`;

async function tryWebCertPasswordInput(
  client: Awaited<ReturnType<typeof CDP>>,
  password: string,
  certId: string,
): Promise<boolean> {
  const { Input, Runtime } = client;
  const evalBool = async (expression: string): Promise<unknown> => {
    const r = (await Runtime.evaluate({ expression, returnByValue: true })) as {
      result?: { value?: unknown };
    };
    return r.result?.value;
  };

  appendPortalLog("페이지 안 인증서 창(웹) 찾는 중…");
  const started = Date.now();
  let found = false;
  while (Date.now() - started < WEB_CERT_WAIT_MS) {
    try {
      if ((await evalBool(WEB_CERT_FIND_EXPR)) === true) {
        found = true;
        break;
      }
    } catch {
      /* 페이지 전환 중 */
    }
    await sleep(500);
  }
  if (!found) {
    appendPortalLog("페이지 안 인증서 창이 없습니다 — OS 인증서 창 방식으로 시도합니다.");
    return false;
  }

  appendPortalLog("페이지 안 인증서 창 발견 — 암호 입력 중…");
  try {
    if ((await evalBool(webCertSelectExpr(certId))) !== true) return false;
    await sleep(200);
    await Input.insertText({ text: password.trim() });
    await sleep(200);
    const res = await evalBool(WEB_CERT_SUBMIT_EXPR);
    if (res === "clicked") {
      appendPortalLog("인증서 암호를 입력하고 «확인»을 눌렀습니다.");
      return true;
    }
    if (res === "nobutton") {
      await Input.dispatchKeyEvent({ type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await Input.dispatchKeyEvent({ type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      appendPortalLog("인증서 암호를 입력하고 Enter를 보냈습니다.");
      return true;
    }
    appendPortalLog(`웹 인증서 암호 입력 실패 (${String(res)}).`);
    return false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendPortalLog(`웹 인증서 암호 입력 오류: ${msg.slice(0, 120)}`);
    return false;
  }
}

export function portalDebugHelpUrl(
  browser: ReturnType<typeof portalBrowserFromSettings>,
): string {
  if (browser === "edge") {
    return "edge://inspect/#remote-debugging";
  }
  return "chrome://inspect/#remote-debugging";
}

export async function runPortalAutomation(
  settings: AppSettings,
  portalId: PortalId,
): Promise<AutomationResult> {
  if (portalAutomationBusy) {
    appendPortalLog(
      `[${portalId}] 이전 실행이 끝나지 않았습니다. 잠시 후 다시 시도하세요.`,
    );
    return { ok: false, error: "이전 실행이 끝나지 않았습니다." };
  }
  portalAutomationBusy = true;

  const entry = settings.portals[portalId];
  if (!entry) {
    portalAutomationBusy = false;
    return { ok: false, error: "포털 설정이 없습니다." };
  }
  try {
    return await Promise.race([
      runPortalAutomationInner(settings, portalId, entry),
      new Promise<AutomationResult>((_resolve, reject) => {
        setTimeout(
          () => reject(new Error("자동 로그인 시간이 초과되었습니다.")),
          AUTOMATION_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "자동 로그인 중 오류가 발생했습니다.";
    appendPortalLog(`실패: ${msg}`);
    return { ok: false, error: msg };
  } finally {
    portalAutomationBusy = false;
  }
}

async function runPortalAutomationInner(
  settings: AppSettings,
  portalId: PortalId,
  entry: NonNullable<AppSettings["portals"][PortalId]>,
): Promise<AutomationResult> {
  if (!entry.enabled) {
    return { ok: false, error: "이 포털은 꺼져 있습니다." };
  }
  const url = entry.url.trim();
  if (!url) {
    return { ok: false, error: "포털 URL이 비어 있습니다." };
  }

  const mode = settings.portalLoginMode ?? "url_only";
  if (mode !== "automation") {
    appendPortalLog(`[${portalId}] URL만 열기 모드`);
    try {
      await launchPortalUrl(url, portalBrowserFromSettings(settings.portalBrowser));
      return {
        ok: true,
        summary: "브라우저에서 로그인 페이지를 열었습니다.",
        mode: "url_only",
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "브라우저를 열지 못했습니다.",
      };
    }
  }

  const browser = portalBrowserFromSettings(settings.portalBrowser);
  const cred = getPortalCredentials(portalId);
  const certId = cred.user.trim();

  appendPortalLog(`[${portalId}] 자동 로그인 시작`);
  const restoreAppWindows = minimizeAppWindowsForPortal();
  let debugPort: number;
  try {
    debugPort = await ensureDebugger(browser);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "디버깅 연결 실패";
    appendPortalLog(`실패: ${msg}`);
    restoreAppWindows();
    return { ok: false, error: msg };
  }

  let client: Awaited<ReturnType<typeof CDP>> | null = null;
  try {
    client = await CDP({ port: debugPort });
    const { Input, Network, Page, Runtime } = client;
    await Network.enable();
    await Page.enable();
    void Input;

    appendPortalLog("업무포털 접속 중…");
    await Page.navigate({ url });
    await Page.loadEventFired();

    appendPortalLog("페이지 로드 완료.");
    await sleep(400);
    await activatePortalBrowserTab(debugPort, url, { force: true });
    await sleep(500);

    const neis = await runNeisLoginSteps(client, url, debugPort);
    if (isPortalCertLoginUrl(url) && !neis.clickedCert && neis.error) {
      return { ok: false, error: neis.error };
    }

    if (certId && neis.clickedCert) {
      const label =
        certId.length > 20 ? `${certId.slice(0, 20)}…` : certId;
      appendPortalLog(
        `인증서 목록에서 «${label}» 선택은 아직 수동입니다. 목록이 보이면 직접 고른 뒤 비밀번호 단계로 진행하세요.`,
      );
    }

    const tryCertPassword =
      neis.clickedCert && Boolean(cred.password.trim());

    if (neis.clickedCert && !cred.password.trim()) {
      appendPortalLog(
        "인증서 비밀번호가 설정에 없습니다. 톱니바퀴 → 업무포털에서 저장하거나 창에 직접 입력하세요.",
      );
    }

    const webCert = tryCertPassword
      ? await tryWebCertPasswordInput(client, cred.password, certId)
      : false;
    const certInput = webCert
      ? { ok: true as const }
      : await tryOsCertPasswordInput(cred.password, tryCertPassword);
    if (certInput.ok) {
      appendPortalLog("인증서 비밀번호 입력을 시도했습니다.");
    } else if (certInput.error && tryCertPassword) {
      appendPortalLog(certInput.error);
    }

    appendPortalLog("로그인 확인 중…");
    try {
      await Runtime.evaluate({
        expression: `(() => document.title || "")()`,
        returnByValue: true,
      });
    } catch {
      /* ignore */
    }

    return {
      ok: true,
      summary:
        "자동 로그인 시도를 마쳤습니다. 새로 열린 브라우저 창(전용 프로필)을 확인하세요.",
      mode: "automation",
    };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "자동 로그인 중 오류가 발생했습니다.";
    appendPortalLog(`실패: ${msg}`);
    return { ok: false, error: msg };
  } finally {
    restoreAppWindows();
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
  }
}
