import type { UiDensity } from "@/types/state";

export function gridMetricsForDensity(density: UiDensity): {
  rowHeight: number;
  margin: number;
} {
  switch (density) {
    case "cozy":
      return { rowHeight: 40, margin: 16 };
    case "normal":
      return { rowHeight: 36, margin: 12 };
    case "compact":
      return { rowHeight: 32, margin: 8 };
  }
}
