import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarMiniPicker } from "@/components/CalendarMiniPicker";
import type { NeisScheduleRow, TodoItem } from "@/types/state";
import { newId } from "@/utils/id";
import { neisYmdToDash } from "@/utils/neisYmd";
import { TodoCategoryBadge } from "@/components/TodoCategoryBadge";
import { TodoCategorySelect } from "@/components/TodoCategorySelect";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type Props = {
  open: boolean;
  dateYmd: string;
  onClose: () => void;
  neisItems: NeisScheduleRow[];
  todos: TodoItem[];
  onTodosChange: (todos: TodoItem[]) => void;
  onDateChange: (newYmd: string) => void;
};

function parseDateYmd(dateYmd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatHeader(dateYmd: string): string {
  const date = parseDateYmd(dateYmd);
  if (!date) return dateYmd;
  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  const wd = WEEKDAY_KO[date.getDay()];
  return `${y}년 ${mo}월 ${d}일 (${wd})`;
}

function formatDateLine(dateYmd: string): string {
  const date = parseDateYmd(dateYmd);
  if (!date) return dateYmd;
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}. ${mo}. ${d}.`;
}

export function CalendarDayModal({
  open,
  dateYmd,
  onClose,
  neisItems,
  todos,
  onTodosChange,
  onDateChange,
}: Props) {
  const [todoText, setTodoText] = useState("");
  const [todoCategory, setTodoCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);

  const clearCompose = useCallback(() => {
    setEditingId(null);
    setTodoText("");
    setTodoCategory("");
  }, []);

  useEffect(() => {
    if (!open) {
      setDatePickerOpen(false);
      clearCompose();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (datePickerOpen) {
        setDatePickerOpen(false);
        return;
      }
      if (editingId) {
        clearCompose();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, datePickerOpen, editingId, clearCompose]);

  useEffect(() => {
    clearCompose();
  }, [dateYmd, clearCompose]);

  useEffect(() => {
    if (!datePickerOpen) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (datePickerRef.current?.contains(target)) return;
      setDatePickerOpen(false);
    };
    const id = window.setTimeout(() => {
      window.addEventListener("click", onPointer, true);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", onPointer, true);
    };
  }, [datePickerOpen]);

  const dayNeis = useMemo(
    () =>
      neisItems.filter((it) => neisYmdToDash(it.ymd) === dateYmd),
    [neisItems, dateYmd],
  );

  const dayTodos = useMemo(
    () =>
      todos
        .filter((t) => t.dueDate === dateYmd)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [todos, dateYmd],
  );

  function startEdit(todo: TodoItem) {
    setEditingId(todo.id);
    setTodoText(todo.text);
    setTodoCategory(todo.category ?? "");
    window.requestAnimationFrame(() => {
      composeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  function submitCompose() {
    const text = todoText.trim();
    if (!text) return;
    if (editingId) {
      onTodosChange(
        todos.map((t) =>
          t.id === editingId
            ? {
                ...t,
                text,
                category: todoCategory || undefined,
              }
            : t,
        ),
      );
      clearCompose();
      return;
    }
    onTodosChange([
      ...todos,
      {
        id: newId(),
        text,
        done: false,
        dueDate: dateYmd,
        category: todoCategory || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    clearCompose();
  }

  if (!open) return null;

  function toggleTodo(id: string) {
    onTodosChange(
      todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    );
  }

  function completeTodo(id: string) {
    onTodosChange(
      todos.map((t) => (t.id === id ? { ...t, done: true } : t)),
    );
  }

  function removeTodo(id: string) {
    if (editingId === id) clearCompose();
    onTodosChange(todos.filter((t) => t.id !== id));
  }

  const empty = dayNeis.length === 0 && dayTodos.length === 0;

  return createPortal(
    <div
      className="cal-day-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`cal-day-modal${categoryMenuOpen || datePickerOpen ? " cal-day-modal--dropdown-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cal-day-modal-title"
      >
        <header className="cal-day-modal-header">
          <div className="cal-day-modal-title-block" ref={datePickerRef}>
            <button
              type="button"
              className="cal-day-modal-date-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDatePickerOpen((v) => !v);
              }}
              aria-expanded={datePickerOpen}
              aria-haspopup="dialog"
              aria-controls="cal-day-date-picker"
              id="cal-day-modal-title"
            >
              <span className="cal-day-modal-date-line">{formatDateLine(dateYmd)}</span>
              <span className="cal-day-modal-date-heading">{formatHeader(dateYmd)}</span>
              <span className="cal-day-modal-date-hint">날짜 변경</span>
            </button>
            {datePickerOpen && (
              <div
                id="cal-day-date-picker"
                className="cal-day-modal-date-popover"
                role="dialog"
                aria-label="날짜 선택"
              >
                <CalendarMiniPicker
                  selectedYmd={dateYmd}
                  onSelect={(ymd) => {
                    if (ymd !== dateYmd) onDateChange(ymd);
                    setDatePickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="cal-day-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="cal-day-modal-body">
          <div className="cal-day-modal-scroll">
            <section className="cal-day-list-section" aria-label="할 일">
              {empty && (
                <div className="cal-day-empty-state">
                  <span className="cal-day-empty-icon" aria-hidden="true">📋</span>
                  <p>이 날 할 일이 없습니다</p>
                  <span className="muted">아래에서 추가해 보세요</span>
                </div>
              )}
              {dayTodos.length > 0 && (
                <ul className="cal-day-list">
                  {dayTodos.map((t) => {
                    const isEditing = editingId === t.id;
                    return (
                      <li
                        key={t.id}
                        className={`cal-day-row cal-day-row--todo${t.done ? " cal-day-row--done" : ""}${isEditing ? " cal-day-row--editing" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="todo-check cal-day-todo-check"
                          checked={t.done}
                          onChange={() =>
                            t.done ? toggleTodo(t.id) : completeTodo(t.id)
                          }
                          aria-label={t.done ? "완료 취소" : "완료"}
                        />
                        <button
                          type="button"
                          className="cal-day-row-main"
                          onClick={() => startEdit(t)}
                          aria-label={`${t.text} 수정`}
                          aria-pressed={isEditing}
                        >
                          <TodoCategoryBadge
                            categoryId={t.category}
                            emptyDash
                          />
                          <span className="cal-day-row-title">{t.text}</span>
                        </button>
                        <button
                          type="button"
                          className="cal-day-remove"
                          onClick={() => removeTodo(t.id)}
                          aria-label="삭제"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {dayNeis.length > 0 && (
                <ul className="cal-day-list cal-day-list--neis" aria-label="학사일정">
                  {dayNeis.map((it) => (
                    <li
                      key={`n-${it.ymd}-${it.name}`}
                      className="cal-day-row cal-day-row--neis"
                    >
                      <span className="cal-day-row-title">{it.name}</span>
                      {it.content && (
                        <span className="muted cal-day-row-sub">{it.content}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="cal-day-modal-footer">
            <hr className="cal-day-section-divider" />

            <div
              ref={composeRef}
              className={`cal-day-compose-card${editingId ? " cal-day-compose-card--edit" : ""}`}
              aria-label={editingId ? "할 일 수정" : "할 일 추가"}
            >
              <div className="cal-day-compose-heading">
                <span className="cal-day-compose-heading-text">
                  {editingId ? "할 일 수정" : "할 일 추가"}
                </span>
                {editingId && (
                  <button
                    type="button"
                    className="cal-day-compose-cancel"
                    onClick={clearCompose}
                  >
                    취소
                  </button>
                )}
              </div>
              <div className="cal-day-compose-field">
                <TodoCategorySelect
                  value={todoCategory}
                  onChange={setTodoCategory}
                  menuPreferAbove
                  onOpenChange={setCategoryMenuOpen}
                />
              </div>
              <div className="cal-day-compose-field cal-day-compose-field--last">
                <label className="cal-day-field-label" htmlFor="cal-day-todo-text">
                  내용
                </label>
                <div className="cal-day-add-row">
                  <input
                    id="cal-day-todo-text"
                    className="cal-day-field cal-day-field--text"
                    value={todoText}
                    onChange={(e) => setTodoText(e.target.value)}
                    placeholder="할 일을 입력하세요"
                    onKeyDown={(e) => e.key === "Enter" && submitCompose()}
                  />
                  <button
                    type="button"
                    className="cal-day-add-btn"
                    onClick={submitCompose}
                    disabled={!todoText.trim()}
                  >
                    {editingId ? "저장" : "추가"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
