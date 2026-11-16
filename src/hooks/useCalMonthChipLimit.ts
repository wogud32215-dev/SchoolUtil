import { useEffect, useState, type RefObject } from "react";
import {
  type CalMonthChipMetrics,
  calMonthChipMetricsFromCell,
} from "@/utils/calMonthChipMetrics";

const DEFAULT_METRICS: CalMonthChipMetrics = {
  maxWithoutMore: 2,
  maxWithMore: 1,
};

/** 월간 달력 날짜 칸 높이에 따라 미리보기 칩 슬롯을 계산합니다. */
export function useCalMonthChipLimit(
  gridRef: RefObject<HTMLDivElement | null>,
  layoutKey: string,
): CalMonthChipMetrics {
  const [metrics, setMetrics] =
    useState<CalMonthChipMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sample = grid.querySelector<HTMLElement>("button.cal-day-btn");
        if (!sample) return;
        const next = calMonthChipMetricsFromCell(sample, grid);
        setMetrics((prev) =>
          prev.maxWithoutMore === next.maxWithoutMore &&
          prev.maxWithMore === next.maxWithMore
            ? prev
            : next,
        );
      });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(grid);

    const parent = grid.closest(".react-grid-item");
    if (parent) ro.observe(parent);

    const calRoot = grid.closest(".cal-root");
    if (calRoot && calRoot !== parent) ro.observe(calRoot);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [gridRef, layoutKey]);

  return metrics;
}