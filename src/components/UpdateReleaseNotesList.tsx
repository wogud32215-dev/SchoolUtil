type Props = {
  notes: string[];
};

export function UpdateReleaseNotesList({ notes }: Props) {
  if (!notes.length) return null;
  return (
    <ul className="update-prompt-notes">
      {notes.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
