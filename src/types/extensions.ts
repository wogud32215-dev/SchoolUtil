export type ExtensionContact = {
  id: string;
  label: string;
  extension: string;
};

export type ExtensionSection = {
  id: string;
  /** 건물·층 등 묶음 표시 */
  areaLabel: string;
  department: string;
  sortOrder: number;
  contacts: ExtensionContact[];
};

export type ExtensionDirectory = {
  sections: ExtensionSection[];
  /** 내선 기본 데이터 보정 세대 (2026.7.1 PDF 기준 진학지원부 등) */
  dataRev?: number;
};
