type Props = {
  categoryId: "stars" | "hearts";
};

export function TodoCategoryIcons({ categoryId }: Props) {
  if (categoryId === "stars") {
    return (
      <span className="todo-cat-icons todo-cat-icons--stars" aria-hidden="true">
        <span className="todo-cat-icon todo-cat-icon--star">⭐</span>
        <span className="todo-cat-icon todo-cat-icon--star">⭐</span>
        <span className="todo-cat-icon todo-cat-icon--star">⭐</span>
      </span>
    );
  }
  return (
    <span className="todo-cat-icons todo-cat-icons--hearts" aria-hidden="true">
      <span className="todo-cat-icon todo-cat-icon--heart">❤️</span>
      <span className="todo-cat-icon todo-cat-icon--heart">❤️</span>
      <span className="todo-cat-icon todo-cat-icon--heart">❤️</span>
    </span>
  );
}
