import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
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
const MEMO_CASCADE_STEP = 14;

type Props = {
  memos: MemoNote[];
  onChange: (memos: MemoNote[]) => void;
};

type MemoNoteEditorProps = {
  memo: MemoNote;
  maxWidth: number;
  position: { x: number; y: number };
  stackIndex: number;
  onCommit: (id: string, text: string) => void;
  onResize: (id: string, width: number, height: number) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
};

function resolveMemoPosition(memo: MemoNote, index: number): { x: number; y: number } {
  if (memo.x !== 0 || memo.y !== 0) {
    return { x: memo.x, y: memo.y };
  }
  if (index === 0) {
    return { x: 0, y: 0 };
  }
  const step = index * MEMO_CASCADE_STEP;
  return { x: step, y: step };
}

function clampMemoPosition(
  x: number,
  y: number,
  noteWidth: number,
  boundsWidth: number,
): { x: number; y: number } {
  const maxX = Math.max(0, boundsWidth - noteWidth);
  return {
    x: Math.min(Math.max(0, Math.round(x)), maxX),
    y: Math.max(0, Math.round(y)),
  };
}

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
  position,
  stackIndex,
  onCommit,
  onResize,
  onMove,
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
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  latestTextRef.current = text;

  const displayPos = dragPos ?? position;

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

  function onGripPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget;
    grip.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: displayPos.x,
      originY: displayPos.y,
    };
    setDragging(true);
  }

  function pointerDragPosition(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return position;
    const boundsW = Math.max(MEMO_MIN_W, maxWidth);
    return clampMemoPosition(
      drag.originX + (e.clientX - drag.startX),
      drag.originY + (e.clientY - drag.startY),
      size.width,
      boundsW,
    );
  }

  function onGripPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    setDragPos(pointerDragPosition(e));
  }

  function finishGripDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const finalPos = pointerDragPosition(e);
    dragRef.current = null;
    setDragging(false);
    setDragPos(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onMove(memo.id, finalPos.x, finalPos.y);
  }

  const maxW = Math.max(MEMO_MIN_W, maxWidth);

  return (
    <div
      className={`memo-note-anchored${dragging ? " memo-note-anchored--dragging" : ""}`}
      style={{
        left: displayPos.x,
        top: displayPos.y,
        zIndex: dragging ? 30 : 10 + stackIndex,
      }}
    >
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
          <div
            className="memo-note-grip"
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={finishGripDrag}
            onPointerCancel={finishGripDrag}
            aria-label="쪽지 이동"
            title="드래그하여 이동"
          />
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
    </div>
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
    const n = memos.length;
    onChange(
      [
        ...memos,
        {
          id: newId(),
          text: "",
          color: lastColor,
          x: (n % 4) * 12,
          y: n * 22,
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

  function commitMemoPosition(id: string, x: number, y: number) {
    const current = memosRef.current;
    const prev = current.find((m) => m.id === id);
    if (prev && prev.x === x && prev.y === y) return;
    onChange(
      current.map((m) =>
        m.id === id
          ? { ...m, x, y, updatedAt: new Date().toISOString() }
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

  const gridMinHeight = useMemo(() => {
    let maxBottom = MEMO_DEFAULT_H + 16;
    memos.forEach((memo, index) => {
      const pos = resolveMemoPosition(memo, index);
      const h = resolveNoteHeight(memo);
      maxBottom = Math.max(maxBottom, pos.y + h + 16);
    });
    return maxBottom;
  }, [memos]);

  return (
    <>
      <div className="memo-widget-head">
        <span className="memo-widget-meta">
          최대 4장 · 위쪽 드래그로 이동 · 모서리·가장자리로 크기 조절
        </span>
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
      <div
        className="memo-grid"
        ref={gridRef}
        style={{ minHeight: gridMinHeight }}
      >
        {memos.map((memo, index) => (
          <MemoNoteEditor
            key={memo.id}
            memo={memo}
            maxWidth={gridWidth}
            position={resolveMemoPosition(memo, index)}
            stackIndex={index}
            onCommit={commitMemoText}
            onResize={commitMemoSize}
            onMove={commitMemoPosition}
            onRemove={remove}
          />
        ))}
      </div>
    </>
  );
}
