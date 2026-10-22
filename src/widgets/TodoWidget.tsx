import { useMemo, useState } from "react";
import type { TodoItem } from "@/types/state";
import { newId } from "@/utils/id";

const CATEGORIES = [
  { id: "", label: "분류 없음" },
  { id: "class", label: "수업" },
  { id: "homeroom", label: "담임" },
  { id: "admin", label: "행정" },
] as const;

type Props = {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
};

function catLabel(id?: string) {
  return CATEGORIES.find((c) => c.id === (id ?? ""))?.label ?? "";
}

function sortTodos(list: TodoItem[]): TodoItem[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const da = a.dueDate ?? "9999-99-99";
    const db = b.dueDate ?? "9999-99-99";
    if (da !== db) return da.localeCompare(db);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function TodoWidget({ todos, onChange }: Props) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");

  const visible = useMemo(() => sortTodos(todos), [todos]);

  function addTodo() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onChange([
      ...todos,
      {
        id: newId(),
        text: trimmed,
        done: false,
        dueDate: dueDate || undefined,
        category: category || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText("");
    setDueDate("");
  }

  function toggle(id: string) {
    onChange(
      todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  function remove(id: string) {
    onChange(todos.filter((t) => t.id !== id));
  }

  const pending = todos.filter((t) => !t.done).length;

  return (
    <>
      <div className="input-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할 일"
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          title="마감일"
          style={{ maxWidth: 140 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          title="분류"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id || "none"} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary" onClick={addTodo}>
          추가
        </button>
      </div>
      <p className="muted" style={{ margin: "0 0 8px", fontSize: "0.85rem" }}>
        남은 할 일 {pending}건
      </p>
      <ul>
        {visible.length === 0 && (
          <li className="muted">등록된 할 일이 없습니다.</li>
        )}
        {visible.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${todo.done ? "done" : ""}`}
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggle(todo.id)}
            />
            <label onClick={() => toggle(todo.id)}>
              {todo.text}
              {todo.category && (
                <span className="todo-tag">{catLabel(todo.category)}</span>
              )}
              {todo.dueDate && (
                <span className="todo-due">{todo.dueDate}</span>
              )}
            </label>
            <button type="button" onClick={() => remove(todo.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
