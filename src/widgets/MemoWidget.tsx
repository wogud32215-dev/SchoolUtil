import type { MemoNote } from "@/types/state";
import { newId } from "@/utils/id";

const COLORS = ["#fef08a", "#fbcfe8", "#bfdbfe", "#bbf7d0"];

type Props = {
  memos: MemoNote[];
  onChange: (memos: MemoNote[]) => void;
};

export function MemoWidget({ memos, onChange }: Props) {
  function addMemo() {
    const lastColor = memos.at(-1)?.color ?? COLORS[0];
    onChange([
      ...memos,
      {
        id: newId(),
        text: "",
        color: lastColor,
        x: 0,
        y: 0,
        updatedAt: new Date().toISOString(),
      },
    ].slice(-4));
  }

  function update(id: string, text: string) {
    onChange(
      memos.map((m) =>
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
      <div className="input-row">
        <span className="muted">쪽지 최대 4장</span>
        <button
          type="button"
          className="btn-primary"
          onClick={addMemo}
          disabled={memos.length >= 4}
        >
          + 쪽지
        </button>
      </div>
      <div className="memo-grid">
        {memos.map((memo) => (
          <div
            key={memo.id}
            className="memo-note"
            style={{ background: memo.color }}
          >
            <textarea
              value={memo.text}
              placeholder="메모..."
              onChange={(e) => update(memo.id, e.target.value)}
            />
            <button type="button" onClick={() => remove(memo.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
