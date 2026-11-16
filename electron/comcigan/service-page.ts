const SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
const MARKER_OBF = "/* hour-obfuscated-v2 */";
const MARKER_AJAX = "/* hour-ajax-obfuscated-v1 */";
const MARKERS = [MARKER_OBF, MARKER_AJAX] as const;
const MAX_PAGE_SIZE = 16 * 1024 * 1024;
const MAX_PASSES = 4;
const INVOCATION_RE = /\}\s*\)\s*\(\s*(?=\[)/;
const TAIL_RE = /^\s*,\s*([0-9]{1,3})\s*\)\s*;?/;

function readJsonArray(text: string, start: number): { json: string; end: number } {
  if (text[start] !== "[") {
    throw new Error("expected JSON array");
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        return { json: text.slice(start, i + 1), end: i + 1 };
      }
    }
  }
  throw new Error("unterminated JSON array");
}

function decodeScript(script: string, maxSize = MAX_PAGE_SIZE): string {
  const invocation = INVOCATION_RE.exec(script);
  if (!invocation) {
    throw new Error("missing literal fragment array");
  }
  const arrayStart = invocation.index + invocation[0].length;
  const { json, end: arrayEnd } = readJsonArray(script, arrayStart);
  const fragments = JSON.parse(json) as unknown;
  const tail = TAIL_RE.exec(script.slice(arrayEnd));
  if (!Array.isArray(fragments) || !tail) {
    throw new Error("invalid decoder arguments");
  }
  const key = Number(tail[1]);
  if (key > 255) {
    throw new Error("invalid decoder key");
  }

  const decoded: string[] = [];
  let size = 0;
  for (const fragment of fragments) {
    if (
      !Array.isArray(fragment) ||
      fragment.length !== 2 ||
      (fragment[0] !== 0 && fragment[0] !== 1) ||
      typeof fragment[1] !== "string"
    ) {
      throw new Error("invalid fragment");
    }
    const plain = fragment[0] === 1;
    const value = fragment[1] as string;
    size += plain ? value.length : value.length / 4;
    if (size > maxSize) {
      throw new Error("decoded page exceeds size limit");
    }
    if (plain) {
      decoded.push(value);
      continue;
    }
    if (value.length % 4 !== 0 || !/^[0-9a-fA-F]*$/.test(value)) {
      throw new Error("invalid hexadecimal fragment");
    }
    const units = Buffer.alloc(value.length / 2);
    let offset = 0;
    for (let i = 0; i < value.length; i += 4) {
      const unit =
        parseInt(value.slice(i, i + 4), 16) ^
        ((key + (i / 4) * 13) & 255);
      units.writeUInt16LE(unit, offset);
      offset += 2;
    }
    decoded.push(units.toString("utf16le"));
  }
  return decoded.join("");
}

function decodeObfuscatedBlock(
  content: string,
  start: number,
  scriptEnd: number,
  marker: string,
): { decoded: string; stop: number } {
  const nextMarker = Math.min(
    ...MARKERS.map((m) => {
      const p = content.indexOf(m, start + marker.length);
      return p >= 0 ? p : scriptEnd;
    }),
    scriptEnd,
  );
  const slice = content.slice(start, nextMarker);
  const invocation = INVOCATION_RE.exec(slice);
  if (!invocation) {
    throw new Error(`missing literal fragment array (${marker})`);
  }
  const absInv = start + invocation.index + invocation[0].length;
  const { end: arrayEnd } = readJsonArray(content, absInv);
  const tail = TAIL_RE.exec(content.slice(arrayEnd, scriptEnd));
  if (!tail) {
    throw new Error("invalid decoder invocation");
  }
  const stop = arrayEnd + tail.index + tail[0].length;
  const decoded = decodeScript(content.slice(start, stop));
  return { decoded, stop };
}

/** 컴시간 /st 의 hour-obfuscated 스크립트를 원문 JS로 복원 */
export function decodeServicePage(content: string): string {
  if (content.length > MAX_PAGE_SIZE) {
    throw new Error("Comcigan service page exceeds size limit");
  }

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (!MARKERS.some((m) => content.includes(m))) {
      return content;
    }

    const pieces: string[] = [];
    let cursor = 0;
    let replaced = false;

    let match: RegExpExecArray | null;
    SCRIPT_RE.lastIndex = 0;
    while ((match = SCRIPT_RE.exec(content)) !== null) {
      const scriptStart = match.index + match[0].indexOf(match[1]);
      const scriptEnd = scriptStart + match[1].length;
      let position = scriptStart;

      while (position < scriptEnd) {
        const hits = MARKERS.map((marker) => ({
          marker,
          start: content.indexOf(marker, position),
        })).filter((h) => h.start >= scriptStart && h.start < scriptEnd);

        if (hits.length === 0) break;
        hits.sort((a, b) => a.start - b.start);
        const { marker, start } = hits[0]!;
        const { decoded, stop } = decodeObfuscatedBlock(
          content,
          start,
          scriptEnd,
          marker,
        );
        pieces.push(content.slice(cursor, start), decoded);
        cursor = position = stop;
        replaced = true;
        if (stop >= scriptEnd) break;
      }
    }

    if (!replaced) break;
    pieces.push(content.slice(cursor));
    content = pieces.join("");
  }

  if (MARKERS.some((m) => content.includes(m))) {
    throw new Error("Unable to decode Comcigan obfuscated service page");
  }
  return content;
}
