import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MemoNote } from "@/types/state";
import { newId } from "@/utils/id";

/** 새 쪽지 기본 틴트(저장값은 그대로, CSS에서 은은하게 섞음) */
const COLORS = ["#e8e4d4", "#ebe4ec", "#dfe8f2", "#e2ebe6"];
const SAVE_DEBOUNCE_MS = 400;

type Props = {
  memos: MemoNote[];
  onChange: (memos: MemoNote[]) => void;
};

type MemoNoteEditorProps = {
  memo: MemoNote;
  onCommit: (id: string, text: string) => void;
  onRemove: (id: string) => void;
};

function MemoNoteEditor({ memo, onCommit, onRemove }: MemoNoteEditorProps) {
  const [text, setText] = useState(memo.text);
  const composingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const latestTextRef = useRef(memo.text);

  latestTextRef.current = text;

  useEffect(() => {
    if (focusedRef.current) return;
    setText(memo.text);
    latestTextRef.current = memo.text;
  }, [memo.text, memo.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function flushSave() {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    onCommit(memo.id, latestTextRef.current);
  }

  function scheduleSave() {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      onCommit(memo.id, latestTextRef.current);
    }, SAVE_DEBOUNCE_MS);
  }

  function applyValue(next: string) {
    setText(next);
    latestTextRef.current = next;
    scheduleSave();
  }

  return (
    <div
      className="memo-note"
      style={{ "--memo-tint": memo.color } as CSSProperties}
    >
      <button
        type="button"
        className="memo-note-remove"
        onClick={() => onRemove(memo.id)}
        aria-label="쪽지 삭제"
      >
        ×
      </button>
      <textarea
        value={text}
        placeholder="메모..."
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          flushSave();
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          applyValue(e.currentTarget.value);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          latestTextRef.current = next;
          if (composingRef.current) return;
          scheduleSave();
        }}
      />
    </div>
  );
}

export function MemoWidget({ memos, onChange }: Props) {
  const memosRef = useRef(memos);
  memosRef.current = memos;

  function addMemo() {
    const lastColor = memos.at(-1)?.color ?? COLORS[0];
    onChange(
      [
        ...memos,
        {
          id: newId(),
          text: "",
          color: lastColor,
          x: 0,
          y: 0,
          updatedAt: new Date().toISOString(),
        },
      ].slice(-4),
    );
  }

  function commitMemoText(id: string, text: string) {
    const current = memosRef.current;
    const prev = current.find((m) => m.id === id);
    if (!prev || prev.text === text) return;
    onChange(
      current.map((m) =>
        m.id === id
          ? { ...m, text, updatedAt: new Date().toISOString() }
          : m,
      ),
    );
  }

  function remove(id: string) {
    onChange(memos.filter((m) => m.id !== id));
  }

  return (
    <>
      <div className="memo-widget-head">
        <span className="memo-widget-meta">최대 4장</span>
        <button
          type="button"
          className="memo-add-btn"
          onClick={addMemo}
          disabled={memos.length >= 4}
          aria-label="쪽지 추가"
          title="쪽지 추가"
        >
          +
        </button>
      </div>
      {memos.length === 0 && (
        <p className="widget-state-empty muted">쪽지를 추가해 메모해 보세요.</p>
      )}
      <div className="memo-grid">
        {memos.map((memo) => (
          <MemoNoteEditor
            key={memo.id}
            memo={memo}
            onCommit={commitMemoText}
            onRemove={remove}
          />
        ))}
      </div>
    </>
  );
}
