import { useMemo, useState } from "react";
import type {
  ExtensionContact,
  ExtensionDirectory,
  ExtensionSection,
} from "@/types/extensions";
import {
  mergeExtensionImport,
  type ExtensionImportMode,
} from "@/utils/extensionSpreadsheet";

type Props = {
  open: boolean;
  directory: ExtensionDirectory;
  onClose: () => void;
  onSave: (next: ExtensionDirectory) => void;
};

async function copyExtension(ext: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(ext);
    return true;
  } catch {
    return false;
  }
}

export function ExtensionDirectoryModal({
  open,
  directory,
  onClose,
  onSave,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(directory);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [newArea, setNewArea] = useState("");
  const [newDept, setNewDept] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newExt, setNewExt] = useState("");
  const [importMode, setImportMode] = useState<ExtensionImportMode>("merge");
  const [sheetStatus, setSheetStatus] = useState<string | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);

  const sections = editMode ? draft.sections : directory.sections;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((sec) => {
        const deptHit = sec.department.toLowerCase().includes(q);
        const areaHit = sec.areaLabel.toLowerCase().includes(q);
        const contacts = sec.contacts.filter(
          (c) =>
            deptHit ||
            areaHit ||
            c.label.toLowerCase().includes(q) ||
            c.extension.includes(q),
        );
        if (contacts.length === 0) return null;
        return { ...sec, contacts };
      })
      .filter((s): s is ExtensionSection => s !== null);
  }, [filter, sections]);

  if (!open) return null;

  function resetDraft() {
    setDraft(directory);
    setEditMode(false);
    setFilter("");
    setSheetStatus(null);
  }

  function handleClose() {
    resetDraft();
    onClose();
  }

  function persistDraft(next: ExtensionDirectory) {
    setDraft(next);
  }

  function addManualEntry() {
    const department = newDept.trim();
    const label = newLabel.trim();
    const extension = newExt.trim();
    const areaLabel = newArea.trim() || "기타";
    if (!department || !label || !extension) return;
    const contact: ExtensionContact = {
      id: crypto.randomUUID(),
      label,
      extension,
    };
    const existingIdx = draft.sections.findIndex(
      (s) => s.areaLabel === areaLabel && s.department === department,
    );
    let nextSections: ExtensionSection[];
    if (existingIdx >= 0) {
      nextSections = draft.sections.map((s, i) =>
        i === existingIdx
          ? { ...s, contacts: [...s.contacts, contact] }
          : s,
      );
    } else {
      const sortOrder =
        draft.sections.length > 0
          ? Math.max(...draft.sections.map((s) => s.sortOrder)) + 1
          : 100;
      nextSections = [
        ...draft.sections,
        {
          id: crypto.randomUUID(),
          areaLabel,
          department,
          sortOrder,
          contacts: [contact],
        },
      ];
    }
    persistDraft({ ...draft, sections: nextSections });
    setNewArea("");
    setNewDept("");
    setNewLabel("");
    setNewExt("");
  }

  function removeContact(sectionId: string, contactId: string) {
    persistDraft({
      ...draft,
      sections: draft.sections
        .map((s) =>
          s.id === sectionId
            ? { ...s, contacts: s.contacts.filter((c) => c.id !== contactId) }
            : s,
        )
        .filter((s) => s.contacts.length > 0),
    });
  }

  function saveEdits() {
    onSave(draft);
    setEditMode(false);
  }

  async function downloadTemplate() {
    setSheetBusy(true);
    setSheetStatus(null);
    const res = await window.schoolUtil?.downloadExtensionTemplate?.();
    setSheetBusy(false);
    if (!res) {
      setSheetStatus("Electron 앱에서만 사용할 수 있습니다.");
      return;
    }
    if (!res.ok && "cancelled" in res && res.cancelled) return;
    if (res.ok) {
      setSheetStatus("엑셀 양식을 저장했습니다. «입력» 시트에 적은 뒤 가져오기를 누르세요.");
    } else if (!res.ok && "error" in res) {
      setSheetStatus(res.error ?? "양식 저장에 실패했습니다.");
    }
  }

  async function exportSpreadsheet() {
    setSheetBusy(true);
    setSheetStatus(null);
    const res = await window.schoolUtil?.exportExtensionSpreadsheet?.(draft);
    setSheetBusy(false);
    if (!res) {
      setSheetStatus("Electron 앱에서만 사용할 수 있습니다.");
      return;
    }
    if (!res.ok && "cancelled" in res && res.cancelled) return;
    if (res.ok) {
      setSheetStatus("현재 편집 중인 목록을 엑셀로 저장했습니다.");
    } else if (!res.ok && "error" in res) {
      setSheetStatus(res.error ?? "내보내기에 실패했습니다.");
    }
  }

  async function importSpreadsheet() {
    if (importMode === "replace") {
      const ok = window.confirm(
        "파일 내용으로 내선 목록 전체를 바꿉니다. 계속할까요?",
      );
      if (!ok) return;
    }
    setSheetBusy(true);
    setSheetStatus(null);
    const res = await window.schoolUtil?.importExtensionSpreadsheet?.();
    setSheetBusy(false);
    if (!res) {
      setSheetStatus("Electron 앱에서만 사용할 수 있습니다.");
      return;
    }
    if (!res.ok && "cancelled" in res && res.cancelled) return;
    if (!res.ok) {
      if ("error" in res) setSheetStatus(res.error ?? "가져오기에 실패했습니다.");
      return;
    }
    const { next, added, skipped, invalid } = mergeExtensionImport(
      draft,
      res.rows,
      importMode,
    );
    persistDraft(next);
    const parts = [`${added}건 반영`];
    if (skipped > 0) parts.push(`${skipped}건 중복 건너뜀`);
    if (invalid > 0) parts.push(`${invalid}건 빈 칸·오류`);
    setSheetStatus(parts.join(" · "));
  }

  let lastArea = "";

  return (
    <div
      className="extension-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="extension-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="extension-modal-title"
      >
        <header className="extension-modal-header">
          <div>
            <h2 id="extension-modal-title">내선번호</h2>
            <p className="muted extension-modal-sub">
              번호를 누르면 클립보드에 복사됩니다.
            </p>
          </div>
          <div className="extension-modal-header-actions">
            {editMode ? (
              <>
                <button type="button" className="btn-secondary" onClick={resetDraft}>
                  취소
                </button>
                <button type="button" className="btn-primary" onClick={saveEdits}>
                  저장
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setDraft(directory);
                  setEditMode(true);
                }}
              >
                편집
              </button>
            )}
            <button
              type="button"
              className="extension-modal-close"
              onClick={handleClose}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </header>

        <div className="extension-modal-toolbar">
          <input
            className="settings-control"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="이름·부서·번호 검색"
          />
          {copied ? (
            <span className="extension-copy-toast" role="status">
              {copied} 복사됨
            </span>
          ) : null}
        </div>

        <div className="extension-modal-body">
          {filtered.map((sec) => {
            const showArea = sec.areaLabel !== lastArea;
            if (showArea) lastArea = sec.areaLabel;
            return (
              <section key={sec.id} className="extension-dept-block">
                {showArea ? (
                  <h3 className="extension-area-heading">{sec.areaLabel}</h3>
                ) : null}
                <h4 className="extension-dept-heading">{sec.department}</h4>
                <ul className="extension-contact-list">
                  {sec.contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="extension-contact-btn"
                        onClick={() => {
                          if (editMode) return;
                          void copyExtension(c.extension).then((ok) => {
                            if (ok) {
                              setCopied(c.extension);
                              window.setTimeout(() => setCopied(null), 1600);
                            }
                          });
                        }}
                        disabled={editMode}
                      >
                        <span className="extension-contact-label">{c.label}</span>
                        <span className="extension-contact-ext">{c.extension}</span>
                      </button>
                      {editMode ? (
                        <button
                          type="button"
                          className="extension-contact-remove"
                          aria-label={`${c.label} 삭제`}
                          onClick={() => removeContact(sec.id, c.id)}
                        >
                          ✕
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length === 0 ? (
            <p className="muted">검색 결과가 없습니다.</p>
          ) : null}
        </div>

        {editMode ? (
          <footer className="extension-modal-add">
            <div className="extension-sheet-block">
              <p className="extension-add-title">엑셀 양식으로 추가</p>
              <p className="muted extension-sheet-hint">
                양식을 받아 «입력» 시트에 한 줄씩 적고 가져오면 자동으로 목록에
                넣습니다.
              </p>
              <div className="extension-sheet-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={sheetBusy}
                  onClick={() => void downloadTemplate()}
                >
                  양식 받기
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={sheetBusy}
                  onClick={() => void exportSpreadsheet()}
                >
                  현재 목록 내보내기
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={sheetBusy}
                  onClick={() => void importSpreadsheet()}
                >
                  엑셀 가져오기
                </button>
              </div>
              <div
                className="extension-sheet-mode"
                role="radiogroup"
                aria-label="가져오기 방식"
              >
                <label className="extension-sheet-radio">
                  <input
                    type="radio"
                    name="extension-import-mode"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                  />
                  기존 목록에 추가
                </label>
                <label className="extension-sheet-radio">
                  <input
                    type="radio"
                    name="extension-import-mode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  파일로 전체 교체
                </label>
              </div>
              {sheetStatus ? (
                <p className="extension-sheet-status" role="status">
                  {sheetStatus}
                </p>
              ) : null}
            </div>
            <p className="extension-add-title">수동 추가</p>
            <div className="extension-add-grid">
              <input
                className="settings-control"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="건물·층 (예: 본관 · 2층)"
              />
              <input
                className="settings-control"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="부서·실 이름"
              />
              <input
                className="settings-control"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="이름 또는 실명"
              />
              <input
                className="settings-control"
                value={newExt}
                onChange={(e) => setNewExt(e.target.value)}
                placeholder="내선 번호"
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!newDept.trim() || !newLabel.trim() || !newExt.trim()}
              onClick={addManualEntry}
            >
              추가
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
