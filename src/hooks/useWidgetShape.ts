import { useCallback, useEffect, useRef } from "react";

type ShapeRect = { x: number; y: number; width: number; height: number };

/** 레이아웃 변경 시 메인에 카드·UI 영역 사각형을 보내 창 히트 영역(setShape)을 맞춘다. */
const SHAPE_PAD = 4;

const SHAPE_SELECTORS = [
  ".title-bar",
  ".widget-card",
  ".onboarding-banner",
  ".persist-banner",
  ".update-prompt-banner",
  ".settings-modal",
  ".settings-modal-backdrop",
  ".cal-day-modal",
  ".cal-day-modal-backdrop",
  ".today-glance-modal",
  ".today-glance-backdrop",
  ".comcigan-substitute-modal",
  ".comcigan-substitute-backdrop",
  ".tt-manual-editor",
  ".tt-manual-editor-backdrop",
];

function rectToShape(r: DOMRect): ShapeRect {
  const left = Math.floor(r.left) - SHAPE_PAD;
  const top = Math.floor(r.top) - SHAPE_PAD;
  const right = Math.ceil(r.right) + SHAPE_PAD;
  const bottom = Math.ceil(r.bottom) + SHAPE_PAD;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const width = Math.min(vw - x, Math.max(1, right - left));
  const height = Math.min(vh - y, Math.max(1, bottom - top));
  return { x, y, width, height };
}

function collectShapeRects(): ShapeRect[] {
  const rects: ShapeRect[] = [];
  for (const sel of SHAPE_SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      rects.push(rectToShape(r));
    });
  }
  return rects;
}

/** 위젯 모드에서 카드·제목줄 영역만 클릭 가능하게 창 모양을 갱신한다. */
export function useWidgetShape(enabled: boolean, layoutKey: string) {
  const reportRef = useRef<(() => void) | null>(null);
  const burstFrameRef = useRef(0);

  useEffect(() => {
    const api = window.schoolUtil;
    if (!enabled || !api?.setWindowShape) {
      reportRef.current = null;
      void api?.setWindowShape([]);
      return;
    }

    let frame = 0;
    const report = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        void api.setWindowShape(collectShapeRects());
      });
    };

    reportRef.current = report;

    report();
    const burstMs = [0, 80, 200, 500, 1200];
    for (const ms of burstMs) {
      window.setTimeout(report, ms);
    }
    const ro = new ResizeObserver(report);
    ro.observe(document.documentElement);
    const dashboard = document.querySelector(".dashboard");
    if (dashboard) {
      ro.observe(dashboard);
    }
    document.querySelectorAll(SHAPE_SELECTORS.join(",")).forEach((el) =>
      ro.observe(el),
    );
    window.addEventListener("resize", report);
    dashboard?.addEventListener("scroll", report, { passive: true });
    const offRefresh = api.onRefreshShape?.(() => report());

    const onTransitionEnd = (e: TransitionEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.classList.contains("react-grid-item")
      ) {
        report();
      }
    };
    document.addEventListener("transitionend", onTransitionEnd);

    return () => {
      reportRef.current = null;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(burstFrameRef.current);
      ro.disconnect();
      window.removeEventListener("resize", report);
      dashboard?.removeEventListener("scroll", report);
      document.removeEventListener("transitionend", onTransitionEnd);
      offRefresh?.();
      void api.setWindowShape([]);
    };
  }, [enabled, layoutKey]);

  const scheduleWindowShapeUpdate = useCallback(() => {
    reportRef.current?.();
  }, []);

  /** 드래그·리사이즈 후 transform transition 동안 shape를 따라간다 */
  const runShapeBurst = useCallback((ms = 280) => {
    const start = performance.now();
    const tick = () => {
      reportRef.current?.();
      if (performance.now() - start < ms) {
        burstFrameRef.current = requestAnimationFrame(tick);
      }
    };
    cancelAnimationFrame(burstFrameRef.current);
    burstFrameRef.current = requestAnimationFrame(tick);
  }, []);

  return { scheduleWindowShapeUpdate, runShapeBurst };
}
