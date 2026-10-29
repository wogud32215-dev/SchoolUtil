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
};
