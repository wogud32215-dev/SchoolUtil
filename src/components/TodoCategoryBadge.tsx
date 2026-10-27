import { TodoCategoryIcons } from "@/components/TodoCategoryIcons";
import { todoCategoryAriaLabel, todoCategoryLabel } from "@/utils/todoCategories";

type Props = {
  categoryId?: string;
  placeholder?: string;
  emptyDash?: boolean;
};

export function TodoCategoryBadge({
  categoryId,
  placeholder = "분류 없음",
  emptyDash = false,
}: Props) {
  const id = categoryId ?? "";

  if (!id) {
    if (emptyDash) {
      return <span className="todo-tag todo-tag--empty muted">—</span>;
    }
    return <span className="todo-cat-select-placeholder">{placeholder}</span>;
  }

  if (id === "stars" || id === "hearts") {
    return (
      <span
        className="todo-tag todo-tag--icons"
        data-cat={id}
        aria-label={todoCategoryAriaLabel(id)}
      >
        <TodoCategoryIcons categoryId={id} />
      </span>
    );
  }

  const label = todoCategoryLabel(id);
  return (
    <span className="todo-tag" data-cat={id}>
      {label}
    </span>
  );
}
