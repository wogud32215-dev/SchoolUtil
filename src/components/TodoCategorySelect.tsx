import { useEffect, useId, useRef, useState } from "react";
import { TodoCategoryBadge } from "@/components/TodoCategoryBadge";
import { TODO_CATEGORIES } from "@/utils/todoCategories";

type Props = {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  /** 달력 모달 하단 등 — 메뉴를 위로 펼치는 편이 낫을 때 */
  menuPreferAbove?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TodoCategorySelect({
  value,
  onChange,
  label = "구분",
  menuPreferAbove = false,
  onOpenChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const setOpenState = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpenState(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenState(false);
    };
    const id = window.setTimeout(() => {
      window.addEventListener("click", onPointer, true);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={`todo-cat-select${open ? " todo-cat-select--open" : ""}`}
      ref={rootRef}
    >
      <span className="cal-day-field-label" id={`${listId}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="todo-cat-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label`}
        aria-label={`${label} 선택`}
        onClick={(e) => {
          e.stopPropagation();
          setOpenState(!open);
        }}
      >
        <span className="todo-cat-select-trigger-value">
          <TodoCategoryBadge categoryId={value} />
        </span>
        <span className="todo-cat-select-trigger-meta">
          <span className="todo-cat-select-trigger-action">선택</span>
          <span className="todo-cat-select-chevron" aria-hidden="true" />
        </span>
      </button>
      {open && (
        <ul
          className={`todo-cat-select-menu${menuPreferAbove ? " todo-cat-select-menu--above" : ""}`}
          role="listbox"
          aria-labelledby={`${listId}-label`}
        >
          {TODO_CATEGORIES.map((c) => {
            const selected = c.id === value;
            return (
              <li key={c.id || "none"} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`todo-cat-select-option${selected ? " todo-cat-select-option--active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(c.id);
                    setOpenState(false);
                  }}
                >
                  <TodoCategoryBadge categoryId={c.id} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
