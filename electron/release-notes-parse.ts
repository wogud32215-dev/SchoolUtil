/** electron-updater / GitHub Release에서 오는 releaseNotes 파싱 */
export function parseUpdaterReleaseNotes(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^#{1,6}\s+/, "")
          .replace(/^[-*•]\s+/, "")
          .trim(),
      )
      .filter((line) => line.length > 0 && !/^변경\s*\(/.test(line))
      .slice(0, 8);
  }
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) out.push(t);
      } else if (item && typeof item === "object" && "note" in item) {
        const note = String((item as { note?: string }).note ?? "").trim();
        if (note) out.push(note);
      }
    }
    return out.slice(0, 8);
  }
  return [];
}
