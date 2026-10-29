import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { ResizableBox, type ResizeCallbackData } from "react-resizable";
import type { MemoNote } from "@/types/state";
import { newId } from "@/utils/id";

/** 새 쪽지 기본 틴트(저장값은 그대로, CSS에서 은은하게 섞음) */
const COLORS = ["#e8e4d4", "#ebe4ec", "#dfe8f2", "#e2ebe6"];
const SAVE_DEBOUNCE_MS = 400;
const MEMO_MIN_W = 140;
const MEMO_MIN_H = 96;
const MEMO_MAX_H = 560;
const MEMO_DEFAULT_H = 128;

type Props = {
  memos: MemoNote[];
  onChange: (memos: MemoNote[]) => void;
};

type MemoNoteEditorProps = {
  memo: MemoNote;
  maxWidth: number;
  onCommit: (id: string, text: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onRemove: (id: string) => void;
};

function resolveNoteWidth(memo: MemoNote, maxWidth: number): number {
  const w = memo.width;
  if (typeof w === "number" && w >= MEMO_MIN_W) {
    return Math.min(Math.round(w), maxWidth);
  }
  return maxWidth;
}

function resolveNoteHeight(memo: MemoNote): number {
  const h = memo.height;
  if (typeof h === "number" && h >= MEMO_MIN_H) {
    return Math.min(Math.round(h), MEMO_MAX_H);
  }
  return MEMO_DEFAULT_H;
}

function MemoNoteEditor({
  memo,
  maxWidth,
  onCommit,
  onResize,
  onRemove,
}: MemoNoteEditorProps) {
  const [text, setText] = useState(memo.text);
  const composingRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const latestTextRef = useRef(memo.text);
  const [size, setSize] = useState(() => ({
    width: resolveNoteWidth(memo, maxWidth),
    height: resolveNoteHeight(memo),
  }));

  latestTextRef.current = text;

  useEffect(() => {
    setSize({
      width: resolveNoteWidth(memo, maxWidth),
      height: resolveNoteHeight(memo),
    });
  }, [memo.width, memo.height, memo.id, maxWidth]);

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

  function onResizeStop(_e: SyntheticEvent, data: ResizeCallbackData) {
    const width = Math.round(data.size.width);
    const height = Math.round(data.size.height);
    setSize({ width, height });
    onResize(memo.id, width, height);
  }

  function stopGridDrag(e: SyntheticEvent) {
    e.stopPropagation();
  }

  const maxW = Math.max(MEMO_MIN_W, maxWidth);

  return (
    <ResizableBox
      className="memo-note-resizable"
      width={size.width}
      height={size.height}
      minConstraints={[MEMO_MIN_W, MEMO_MIN_H]}
      maxConstraints={[maxW, MEMO_MAX_H]}
      resizeHandles={["n", "s", "e", "w", "ne", "nw", "se", "sw"]}
      onResizeStop={onResizeStop}
      onResize={(_e, data) => {
        setSize({ width: data.size.width, height: data.size.height });
      }}
      handle={(handleAxis, ref) => (
        <span
          ref={ref}
          className={`memo-note-handle memo-note-handle--${handleAxis}`}
          onMouseDown={stopGridDrag}
          onTouchStart={stopGridDrag}
        />
      )}
    >
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
    </ResizableBox>
  );
}

export function MemoWidget({ memos, onChange }: Props) {
  const memosRef = useRef(memos);
  memosRef.current = memos;
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(280);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      setGridWidth(Math.max(MEMO_MIN_W, el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  function commitMemoSize(id: string, width: number, height: number) {
    const current = memosRef.current;
    const prev = current.find((m) => m.id === id);
    if (
      prev &&
      prev.width === width &&
      prev.height === height
    ) {
      return;
    }
    onChange(
      current.map((m) =>
        m.id === id
          ? {
              ...m,
              width,
              height,
              updatedAt: new Date().toISOString(),
            }
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
        <span className="memo-widget-meta">최대 4장 · 모서리·가장자리로 크기 조절</span>
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
      <div className="memo-grid" ref={gridRef}>
        {memos.map((memo) => (
          <MemoNoteEditor
            key={memo.id}
            memo={memo}
            maxWidth={gridWidth}
            onCommit={commitMemoText}
            onResize={commitMemoSize}
            onRemove={remove}
          />
        ))}
      </div>
    </>
  );
}
