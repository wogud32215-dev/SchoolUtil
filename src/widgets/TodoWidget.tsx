import { useMemo } from "react";
import type { TodoItem } from "@/types/state";
import { formatDueDateLong } from "@/utils/dueLabel";
import { TodoCategoryBadge } from "@/components/TodoCategoryBadge";

type Props = {
  todos: TodoItem[];
  onChange: (todos: TodoItem[]) => void;
};

function sortActiveTodos(list: TodoItem[]): TodoItem[] {
  return [...list].sort((a, b) => {
    const da = a.dueDate ?? "9999-99-99";
    const db = b.dueDate ?? "9999-99-99";
    if (da !== db) return da.localeCompare(db);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function TodoWidget({ todos, onChange }: Props) {
  const active = useMemo(
    () => sortActiveTodos(todos.filter((t) => !t.done)),
    [todos],
  );

  function complete(id: string) {
    onChange(
      todos.map((t) => (t.id === id ? { ...t, done: true } : t)),
    );
  }

  if (active.length === 0) {
    return (
      <p className="muted todo-table-empty">
        남은 할 일이 없습니다. 달력에서 날짜를 눌러 추가할 수 있습니다.
      </p>
    );
  }

  return (
    <div className="todo-table todo-table--view" role="table" aria-label="할 일 목록">
      <div className="todo-table-head" role="row">
        <span role="columnheader">구분</span>
        <span className="todo-table-col-check" role="columnheader" aria-label="완료" />
        <span role="columnheader">업무</span>
        <span role="columnheader">기한</span>
      </div>
      <ul className="todo-table-body">
        {active.map((todo) => {
          return (
            <li key={todo.id} className="todo-row todo-row--view" role="row">
              <span className="todo-row-cat" role="cell">
                <TodoCategoryBadge
                  categoryId={todo.category}
                  emptyDash
                />
              </span>
              <span className="todo-table-col-check" role="cell">
                <input
                  type="checkbox"
                  className="todo-check"
                  checked={false}
                  onChange={() => complete(todo.id)}
                  aria-label={`${todo.text} 완료`}
                />
              </span>
              <span className="todo-row-text" role="cell">{todo.text}</span>
              <span className="todo-row-due muted" role="cell">
                {todo.dueDate ? formatDueDateLong(todo.dueDate) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
