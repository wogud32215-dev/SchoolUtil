import type { FontFamilySetting } from "../types/state";

export const FONT_FAMILY_OPTIONS: {
  id: FontFamilySetting;
  label: string;
}[] = [
  { id: "pretendard", label: "기본" },
  { id: "system", label: "시스템 글꼴" },
  { id: "noto-sans-kr", label: "Noto Sans" },
  { id: "ibm-plex-sans-kr", label: "IBM Plex" },
  { id: "gowun-dodum", label: "고운 돋움" },
];

export const FONT_FAMILY_SETTINGS: FontFamilySetting[] = FONT_FAMILY_OPTIONS.map(
  (o) => o.id,
);
