import { useEffect, useRef, useState } from "react";

const MIN_WIDTH = 320;

/**
 * 대시보드 영역 너비에 맞춰 react-grid-layout `width`를 갱신한다.
 * `mounted`는 대시보드 DOM이 붙은 뒤 true로 두어야 한다 (로딩 화면만 있을 때는 ref가 없음).
 */
export function useDashboardWidth(mounted: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const [width, setWidth] = useState(MIN_WIDTH);

  useEffect(() => {
    if (!mounted) return;

    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setWidth(Math.max(MIN_WIDTH, Math.floor(el.clientWidth)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mounted]);

  return { dashboardRef: ref, gridWidth: width };
}
