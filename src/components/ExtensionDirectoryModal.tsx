import { useMemo, useState } from "react";
import type {
  ExtensionContact,
  ExtensionDirectory,
  ExtensionSection,
} from "@/types/extensions";

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
    persistDraft({ sections: nextSections });
    setNewArea("");
    setNewDept("");
    setNewLabel("");
    setNewExt("");
  }

  function removeContact(sectionId: string, contactId: string) {
    persistDraft({
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
