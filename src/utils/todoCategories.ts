/** Notion To-do List 구분과 동일한 id·색 (기존 id 호환 유지) */
export type TodoCategoryDef = {
  id: string;
  label: string;
};

export const TODO_CATEGORIES: TodoCategoryDef[] = [
  { id: "", label: "분류 없음" },
  { id: "grade", label: "학급" },
  { id: "class", label: "수업" },
  { id: "work", label: "업무" },
  { id: "submit", label: "제출" },
  { id: "event", label: "행사" },
  { id: "meeting", label: "회의" },
  { id: "trip", label: "출장" },
  { id: "grade-peer", label: "동학년" },
  { id: "training", label: "연수" },
  { id: "counsel", label: "상담" },
  { id: "personal", label: "개인" },
  { id: "stars", label: "별" },
  { id: "hearts", label: "하트" },
  { id: "homeroom", label: "담임" },
  { id: "admin", label: "행정" },
];

export function todoCategoryLabel(id?: string): string {
  const found = TODO_CATEGORIES.find((c) => c.id === (id ?? ""));
  if (found) return found.label;
  return id?.trim() ? id : "";
}

export function todoCategoryAriaLabel(id: string): string {
  if (id === "stars") return "별 세 개";
  if (id === "hearts") return "하트 세 개";
  return todoCategoryLabel(id);
}
