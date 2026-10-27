import CDP from "chrome-remote-interface";
import { activatePortalBrowserTab } from "./portal-cdp-activate";
import { tryEdufineCertLoginViaUia } from "./portal-edufine-uia";
import { appendPortalLog } from "./portal-log";

type CdpClient = Awaited<ReturnType<typeof CDP>>;

/** 보이는 «인증서 로그인» 단추의 화면 좌표만 찾습니다 (클릭은 CDP Input으로). */
const FIND_VISIBLE_CERT_BUTTON = `(() => {
  function norm(s) {
    return String(s || "")
      .replace(/\\s+/g, "")
      .replace(/[»›→]/g, "");
  }
  function matches(text) {
    const t = norm(text);
    if (!t) return false;
    if (t.includes("인증서로그인")) return true;
    if (t.includes("교육행정") && t.includes("인증서") && t.includes("로그인"))
      return true;
    if (t.includes("전자서명") && t.includes("인증서") && t.includes("로그인"))
      return true;
    if (t.includes("인증서") && t.includes("로그인") && t.length <= 60) return true;
    return false;
  }
  function pickClickable(el) {
    let cur = el;
    for (let i = 0; i < 8 && cur; i++) {
      const cls = String(cur.className || "");
      if (/nexabutton|Button|btn/i.test(cls)) return cur;
      if (cur.getAttribute && cur.getAttribute("role") === "button") return cur;
      try {
        const st = window.getComputedStyle(cur);
        if (st.cursor === "pointer") return cur;
      } catch (_) {}
      cur = cur.parentElement;
    }
    return el;
  }
  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    if (parseFloat(st.opacity || "1") < 0.05) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 12) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight)
      return false;
    const top = document.elementFromPoint(cx, cy);
    if (!top) return false;
    return el === top || el.contains(top) || top.contains(el);
  }
  function collect(doc, offsetX, offsetY) {
    const out = [];
    const selectors =
      "a, button, input, [role=\\"button\\"], .nexacontentsbox, div[class*=\\"nexa\\"]";
    for (const el of doc.querySelectorAll(selectors)) {
      const text =
        el.innerText ||
        el.textContent ||
        el.value ||
        el.getAttribute("title") ||
        el.getAttribute("aria-label") ||
        "";
      if (!matches(text)) continue;
      const clickEl = pickClickable(el);
      if (!isVisible(clickEl)) continue;
      const r = clickEl.getBoundingClientRect();
      out.push({
        x: offsetX + r.left + r.width / 2,
        y: offsetY + r.top + r.height / 2,
        area: r.width * r.height,
        tag: (el.tagName || "").toLowerCase(),
        text: norm(text).slice(0, 32),
      });
    }
    for (const iframe of doc.querySelectorAll("iframe, frame")) {
      try {
        const sub =
          iframe.contentDocument ||
          (iframe.contentWindow && iframe.contentWindow.document);
        if (!sub) continue;
        const ir = iframe.getBoundingClientRect();
        out.push(...collect(sub, offsetX + ir.left, offsetY + ir.top));
      } catch (_) {}
    }
    return out;
  }
  const all = collect(document, 0, 0);
  if (!all.length) {
    return {
      ok: false,
      reason: "화면에 보이는 «인증서 로그인» 단추가 없습니다.",
      href: location.href,
      title: document.title || "",
      bodyLen: (document.body && document.body.innerText
        ? document.body.innerText.length
        : 0),
      iframeCount: document.querySelectorAll("iframe, frame").length,
      sample: String(document.body && document.body.innerText || "")
        .replace(/\\s+/g, " ")
        .slice(0, 100),
    };
  }
  all.sort((a, b) => b.area - a.area);
  const best = all[0];
  return {
    ok: true,
    x: Math.round(best.x),
    y: Math.round(best.y),
    area: Math.round(best.area),
    tag: best.tag,
    text: best.text,
    href: location.href,
    candidates: all.length,
  };
})()`;

const VERIFY_CERT_CLICK = `((prevArea) => {
  function norm(s) {
    return String(s || "").replace(/\\s+/g, "").replace(/[»›→]/g, "");
  }
  function matches(text) {
    const t = norm(text);
    if (t.includes("인증서로그인")) return true;
    if (t.includes("교육행정") && t.includes("인증서") && t.includes("로그인"))
      return true;
    if (t.includes("전자서명") && t.includes("인증서") && t.includes("로그인"))
      return true;
    return t.includes("인증서") && t.includes("로그인") && t.length <= 60;
  }
  function hasCertPasswordField() {
    const docs = [document];
    for (const f of document.querySelectorAll("iframe")) {
      try {
        if (f.contentDocument) docs.push(f.contentDocument);
      } catch (_) {}
    }
    for (const doc of docs) {
      const el = doc.querySelector('input[name="certPassword"], input.kc-pw-box');
      if (el && el.getBoundingClientRect().width > 0) return true;
    }
    return false;
  }
  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const st = window.getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 12) return false;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    if (!top) return false;
    return el === top || el.contains(top) || top.contains(el);
  }
  if (hasCertPasswordField()) {
    return { progressed: true, why: "인증서 암호 입력창" };
  }
  let maxArea = 0;
  for (const el of document.querySelectorAll(
    "a, button, input, .nexacontentsbox, div[class*='nexa']",
  )) {
    const text = el.innerText || el.textContent || el.value || "";
    if (!matches(text) || !isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    maxArea = Math.max(maxArea, r.width * r.height);
  }
  const bodyText = (document.body && document.body.innerText) || "";
  if (maxArea === 0) {
    if (bodyText.replace(/\\s+/g, "").length < 8) {
      return { progressed: false, why: "페이지 내용 없음" };
    }
    return { progressed: true, why: "단추가 더 보이지 않음" };
  }
  if (prevArea > 0 && maxArea < prevArea * 0.6)
    return { progressed: true, why: "단추 상태 변경" };
  const body = (document.body && document.body.innerText) || "";
  if (/보안|인증서\\s*선택|비밀번호|전자서명/i.test(body))
    return { progressed: true, why: "인증서 안내 문구" };
  return { progressed: false, maxArea: Math.round(maxArea) };
})`;

type FindResult = {
  ok: boolean;
  reason?: string;
  x?: number;
  y?: number;
  area?: number;
  tag?: string;
  text?: string;
  href?: string;
  title?: string;
  bodyLen?: number;
  iframeCount?: number;
  sample?: string;
  candidates?: number;
};

export function isNeisHostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith("neis.go.kr");
  } catch {
    return false;
  }
}

export function isEduPtlHostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith("eduptl.kr");
  } catch {
    return false;
  }
}

export function isEdufineHostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "edufine.go.kr" || host.endsWith(".edufine.go.kr")) {
      return true;
    }
    if (host.startsWith("klef.") && host.endsWith(".go.kr")) return true;
    return host.includes("edufine");
  } catch {
    return false;
  }
}

export function isPortalCertLoginUrl(url: string): boolean {
  return (
    isNeisHostUrl(url) || isEdufineHostUrl(url) || isEduPtlHostUrl(url)
  );
}

const FIND_BTN_LGN = `(() => {
  const btn = document.querySelector("#btnLgn");
  if (!btn) return { ok: false, reason: "btnLgn 없음" };
  const r = btn.getBoundingClientRect();
  if (r.width < 40 || r.height < 12) return { ok: false, reason: "btnLgn 크기 부족" };
  const st = window.getComputedStyle(btn);
  if (st.display === "none" || st.visibility === "hidden") {
    return { ok: false, reason: "btnLgn 숨김" };
  }
  return {
    ok: true,
    x: Math.round(r.left + r.width / 2),
    y: Math.round(r.top + r.height / 2),
    area: Math.round(r.width * r.height),
    tag: "button#btnLgn",
    text: "btnLgn",
  };
})()`;

const NEXACRO_READY_EXPR = `(() => {
  const text = (document.body && document.body.innerText) || "";
  const nexa = document.querySelectorAll("[class*='nexa']").length;
  const canv = document.querySelectorAll("canvas").length;
  return nexa >= 6 || canv >= 1 || text.replace(/\\s+/g, "").length > 30;
})()`;

function readEvalValue<T>(res: { result?: { value?: unknown } }): T | null {
  const v = res.result?.value;
  if (v && typeof v === "object") return v as T;
  return null;
}

type CdpClickClient = Pick<CdpClient, "Runtime"> & {
  Input?: {
    dispatchMouseEvent(params: {
      type: string;
      x: number;
      y: number;
      button?: string;
      clickCount?: number;
    }): Promise<void>;
  };
  Page?: { bringToFront(): Promise<void> };
};

async function findVisibleButton(
  client: CdpClickClient,
): Promise<FindResult | null> {
  const res = (await client.Runtime.evaluate({
    expression: FIND_VISIBLE_CERT_BUTTON,
    returnByValue: true,
  })) as { result?: { value?: unknown } };
  return readEvalValue<FindResult>(res);
}

async function cdpMouseClick(
  client: CdpClickClient,
  x: number,
  y: number,
): Promise<void> {
  try {
    await client.Page?.bringToFront();
  } catch {
    /* ignore */
  }
  const input = client.Input;
  if (input?.dispatchMouseEvent) {
    await input.dispatchMouseEvent({ type: "mouseMoved", x, y });
    await input.dispatchMouseEvent({
      type: "mousePressed",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await input.dispatchMouseEvent({
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    return;
  }
  await client.Runtime.evaluate({
    expression: `(() => {
      const el = document.elementFromPoint(${x}, ${y});
      if (!el) return false;
      const opts = { bubbles: true, cancelable: true, view: window, clientX: ${x}, clientY: ${y} };
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      return true;
    })()`,
    returnByValue: true,
  });
}

async function verifyClickWorked(
  client: CdpClickClient,
  prevArea: number,
): Promise<boolean> {
  await sleep(1200);
  const res = (await client.Runtime.evaluate({
    expression: `(${VERIFY_CERT_CLICK})(${prevArea})`,
    returnByValue: true,
  })) as { result?: { value?: unknown } };
  const v = readEvalValue<{ progressed: boolean; why?: string }>(res);
  return Boolean(v?.progressed);
}

type DebugTarget = {
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

async function listDebugTargets(port: number): Promise<DebugTarget[]> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return (await res.json()) as DebugTarget[];
  } catch {
    return [];
  }
}

function targetPriority(url: string, pageUrl: string): number {
  const u = url.toLowerCase();
  const want = pageUrl.toLowerCase();
  if (!u) return 0;
  if (u.includes("neis.go.kr") && want.includes("neis.go.kr")) return 100;
  if (u.includes("neis.go.kr")) return 80;
  if (u.includes("klef.") && want.includes("klef.")) return 100;
  if (u.includes("eduptl.kr") && want.includes("eduptl.kr")) return 100;
  if (u.includes("edufine") && want.includes("edufine")) return 90;
  if (u.includes("keris_ui") || u.includes("login")) return 70;
  if (u.includes("main.jsp") || u.includes("login")) return 60;
  return 10;
}

async function waitForEdufineShell(
  client: CdpClient,
  maxMs: number,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = (await client.Runtime.evaluate({
        expression: NEXACRO_READY_EXPR,
        returnByValue: true,
      })) as { result?: { value?: unknown } };
      if (res.result?.value === true) return true;
    } catch {
      /* ignore */
    }
    await sleep(800);
  }
  return false;
}

function asClickClient(client: CdpClient): CdpClickClient {
  return client as CdpClickClient;
}

async function tryClickBtnLgn(
  client: CdpClient,
  targetLabel: string,
  debugPort: number,
  pageUrl: string,
): Promise<boolean> {
  const clickClient = asClickClient(client);
  const res = (await clickClient.Runtime.evaluate({
    expression: FIND_BTN_LGN,
    returnByValue: true,
  })) as { result?: { value?: unknown } };
  const found = readEvalValue<FindResult>(res);
  if (!found?.ok || found.x == null || found.y == null) {
    return false;
  }
  appendPortalLog(
    `«교육행정 전자서명 인증서 로그인» (${targetLabel}) ${found.tag} area=${found.area} 좌표=(${found.x},${found.y})`,
  );
  await activatePortalBrowserTab(debugPort, pageUrl, { force: true });
  await sleep(250);
  try {
    await cdpMouseClick(clickClient, found.x, found.y);
  } catch {
    return false;
  }
  return await verifyClickWorked(clickClient, found.area ?? 0);
}

async function tryClickOnClient(
  client: CdpClient,
  targetLabel: string,
  debugPort: number,
  pageUrl: string,
): Promise<boolean> {
  const clickClient = asClickClient(client);
  if (isEduPtlHostUrl(pageUrl)) {
    if (await tryClickBtnLgn(client, targetLabel, debugPort, pageUrl)) {
      return true;
    }
  }
  const found = await findVisibleButton(clickClient);
  if (!found?.ok || found.x == null || found.y == null) {
    return false;
  }
  if ((found.area ?? 0) < 800) {
    appendPortalLog(
      `후보 단추가 너무 작음(area=${found.area}) — 다른 타깃을 찾습니다.`,
    );
    return false;
  }

  appendPortalLog(
    `«인증서 로그인» 후보 (${targetLabel}) ${found.tag} area=${found.area} 좌표=(${found.x},${found.y})`,
  );

  await activatePortalBrowserTab(debugPort, pageUrl, { force: true });
  await sleep(250);

  try {
    await cdpMouseClick(clickClient, found.x, found.y);
  } catch (e) {
    appendPortalLog(
      `마우스 클릭 실패: ${e instanceof Error ? e.message : "알 수 없음"}`,
    );
    return false;
  }

  let progressed = await verifyClickWorked(clickClient, found.area ?? 0);
  if (!progressed) {
    appendPortalLog(
      "클릭했으나 화면 반응이 없습니다. 브라우저를 다시 앞으로 올린 뒤 재시도합니다.",
    );
    await activatePortalBrowserTab(debugPort, pageUrl, { force: true });
    await sleep(400);
    try {
      await cdpMouseClick(clickClient, found.x, found.y);
    } catch {
      return false;
    }
    return await verifyClickWorked(clickClient, found.area ?? 0);
  }
  return true;
}

async function tryAllTargets(
  port: number,
  pageUrl: string,
  primary: CdpClient,
): Promise<{ ok: boolean; lastFail: FindResult | null }> {
  const targets = await listDebugTargets(port);
  const sorted = [...targets].sort(
    (a, b) => targetPriority(b.url, pageUrl) - targetPriority(a.url, pageUrl),
  );

  if (await tryClickOnClient(primary, "메인 탭", port, pageUrl)) {
    return { ok: true, lastFail: null };
  }

  for (const t of sorted) {
    if (!t.webSocketDebuggerUrl) continue;
    if (t.type !== "page" && t.type !== "iframe") continue;
    let sub: CdpClient | null = null;
    try {
      sub = await CDP({ target: t.webSocketDebuggerUrl });
      const label = `${t.type} ${t.url || "(빈 URL)"}`;
      if (await tryClickOnClient(sub, label, port, pageUrl)) {
        appendPortalLog(`디버깅 타깃에서 클릭 성공 — ${label}`);
        return { ok: true, lastFail: null };
      }
    } catch {
      /* 다음 */
    } finally {
      try {
        await sub?.close();
      } catch {
        /* ignore */
      }
    }
  }

  const lastFail = await findVisibleButton(asClickClient(primary));
  return { ok: false, lastFail };
}

function logClickDiagnostics(click: FindResult | null): void {
  if (!click || click.ok) return;
  const parts = [
    click.href ? `주소=${click.href}` : null,
    click.title ? `제목=${click.title}` : null,
    typeof click.bodyLen === "number" ? `본문길이=${click.bodyLen}` : null,
    typeof click.iframeCount === "number"
      ? `iframe=${click.iframeCount}`
      : null,
    click.sample ? `미리보기=${click.sample}` : null,
  ].filter(Boolean);
  if (parts.length) {
    appendPortalLog(`화면 정보(자동): ${parts.join(" | ")}`);
  }
}

export async function runNeisLoginSteps(
  client: Awaited<ReturnType<typeof CDP>>,
  pageUrl: string,
  debugPort: number,
): Promise<{ clickedCert: boolean; error?: string }> {
  if (!isPortalCertLoginUrl(pageUrl)) {
    return { clickedCert: false };
  }

  const edufine = isEdufineHostUrl(pageUrl);
  const eduptl = isEduPtlHostUrl(pageUrl);
  appendPortalLog(
    edufine
      ? "에듀파인 로그인 화면 — «교육행정 전자서명 인증서 로그인» 찾는 중…"
      : eduptl
        ? "경기 업무포털 로그인 화면 — «교육행정 전자서명 인증서 로그인» 찾는 중…"
        : "나이스 로그인 화면 — «인증서 로그인» 찾는 중…",
  );
  await activatePortalBrowserTab(debugPort, pageUrl, { force: true });

  if (edufine) {
    const ready = await waitForEdufineShell(client, 28_000);
    if (ready) {
      appendPortalLog("에듀파인 화면 로드됨.");
    } else {
      appendPortalLog(
        "에듀파인 화면 로드가 느립니다. 통합설치·보안 프로그램을 확인하세요.",
      );
    }
    await sleep(1200);
  }

  const deadline = Date.now() + (edufine ? 40_000 : eduptl ? 30_000 : 22_000);
  let lastFail: FindResult | null = null;
  let lastUiaAttempt = 0;

  while (Date.now() < deadline) {
    const { ok, lastFail: fail } = await tryAllTargets(
      debugPort,
      pageUrl,
      client,
    );
    if (ok) {
      appendPortalLog(
        "«인증서 로그인» 클릭 확인 — 인증서 보안 프로그램이 뜨기를 기다립니다.",
      );
      await sleep(3500);
      return { clickedCert: true };
    }
    lastFail = fail;

    const now = Date.now();
    if (edufine && now - lastUiaAttempt >= 4500) {
      lastUiaAttempt = now;
      appendPortalLog("UI Automation으로 에듀파인 인증서 로그인 단추를 찾는 중…");
      const uia = await tryEdufineCertLoginViaUia();
      if (uia.ok) {
        appendPortalLog(
          uia.windowTitle
            ? `UI Automation 클릭 성공 — ${uia.windowTitle}`
            : "UI Automation으로 인증서 로그인 단추를 눌렀습니다.",
        );
        await sleep(3500);
        return { clickedCert: true };
      }
      appendPortalLog(`UIA(에듀파인): ${uia.reason}`);
    }

    await sleep(600);
  }

  logClickDiagnostics(lastFail);
  const reason = lastFail?.reason ?? "클릭 실패";
  appendPortalLog(`실패: ${reason}`);
  return { clickedCert: false, error: reason };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
