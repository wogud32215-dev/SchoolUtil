/** 달력 칸 레이아웃 기본값 (CSS와 맞춤) */
const DEFAULT_CHIP_STEP = 26;
const DEFAULT_MORE_H = 20;
const DEFAULT_NUM_H = 18;
const DEFAULT_PAD_Y = 14;
const DEFAULT_ROW_GAP = 6;
const DEFAULT_CHIP_INNER_GAP = 4;
const MAX_PREVIEW = 3;

export type CalMonthChipMetrics = {
  maxWithoutMore: number;
  maxWithMore: number;
};

function clampSlots(n: number): number {
  return Math.min(MAX_PREVIEW, Math.max(1, n));
}

function chipStepPx(grid: HTMLElement): number {
  const chip = grid.querySelector(".cal-chip");
  if (chip) {
    return chip.getBoundingClientRect().height + DEFAULT_CHIP_INNER_GAP;
  }
  return DEFAULT_CHIP_STEP;
}

function moreHeightPx(grid: HTMLElement): number {
  const probe = grid.querySelector(".cal-chip-more");
  if (probe) {
    return probe.getBoundingClientRect().height;
  }
  return DEFAULT_MORE_H;
}

/** 날짜 칸 높이·실제 칩 높이로 미리보기 칩 슬롯 수를 계산합니다. */
export function calMonthChipMetricsFromCell(
  cell: HTMLElement,
  grid: HTMLElement,
): CalMonthChipMetrics {
  const cellH = cell.getBoundingClientRect().height;
  if (cellH < 8) {
    return { maxWithoutMore: 1, maxWithMore: 1 };
  }

  const style = getComputedStyle(cell);
  const padY =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) ||
    DEFAULT_PAD_Y;
  const rowGap = parseFloat(style.gap) || DEFAULT_ROW_GAP;

  const numH =
    cell.querySelector(".cal-day-num")?.getBoundingClientRect().height ??
    DEFAULT_NUM_H;

  const chipStep = chipStepPx(grid);
  const moreH = moreHeightPx(grid);

  const chipsAreaFull = cellH - padY - numH - rowGap;
  const chipsAreaWithFooter = chipsAreaFull - moreH - rowGap;

  const maxWithoutMore = clampSlots(
    Math.floor((chipsAreaFull + DEFAULT_CHIP_INNER_GAP) / chipStep),
  );
  const maxWithMore = clampSlots(
    Math.floor((chipsAreaWithFooter + DEFAULT_CHIP_INNER_GAP) / chipStep),
  );

  return {
    maxWithoutMore,
    maxWithMore: Math.min(maxWithMore, maxWithoutMore),
  };
}