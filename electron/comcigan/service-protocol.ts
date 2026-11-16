export type ServiceProtocol = {
  /** 예: `./36179?73629l` */
  endpoint: string;
  key: Buffer | null;
  version: string | null;
  schoolDivisor: number | null;
  schoolOffset: number;
  requestToken: string | null;
};

function parseKeyHex(content: string): Buffer {
  const keyMatch = /var\s+key\s*=\s*CryptoJS\.enc\.Hex\.parse\(([\s\S]*?)\);/.exec(
    content,
  );
  if (!keyMatch) {
    throw new Error("Unable to parse Comcigan response key");
  }
  const expression = keyMatch[1].trim();
  const literal = /^'([0-9a-fA-F]+)'$/.exec(expression);
  let keyHex: string;
  if (literal) {
    keyHex = literal[1];
  } else {
    const pieces = /^\(function\(a\)\{return\s+(a\[\d+\](?:\+a\[\d+\])*)\s*;\}\)\((\[.*\])\)$/s.exec(
      expression,
    );
    if (!pieces) {
      throw new Error("Unable to parse Comcigan response key expression");
    }
    const fragments = [...pieces[2].matchAll(/'([0-9a-fA-F]+)'/g)].map(
      (m) => m[1],
    );
    const indexes = [...pieces[1].matchAll(/a\[(\d+)\]/g)].map((m) =>
      Number(m[1]),
    );
    keyHex = indexes.map((i) => fragments[i]).join("");
  }
  if (![32, 48, 64].includes(keyHex.length)) {
    throw new Error("Invalid Comcigan response key size");
  }
  return Buffer.from(keyHex, "hex");
}

export function parseServiceProtocol(content: string): ServiceProtocol {
  if (/\bfunction\s+QAjaxSchool\s*\(/.test(content)) {
    const request = /function\s+QAjaxSchool\s*\([^)]*\)\s*\{(?:(?!\bfunction\b).)*?url\s*:\s*'\.(\/\d+)\?'\s*\+\s*encodeURIComponent\(btoa\(\s*'(\d+l)'\s*\+\s*encodeURIComponent\(sc\)\s*\+\s*'_(enc\d+)'\)\)/s.exec(
      content,
    );
    if (!request) {
      throw new Error("Unable to parse Comcigan school request protocol");
    }
    const endpoint = `./${request[1].replace(/^\//, "")}?${request[2]}`;
    const version = request[3];

    const timetable = /function\s+QAjaxTimetable\s*\([^)]*\)\s*\{(?:(?!\bfunction\b).)*?url\s*:\s*'\.(\/\d+)\?'\s*\+\s*btoa\([^;{}]*?'_(enc\d+)'\s*\)/s.exec(
      content,
    );
    if (!timetable || timetable[2] !== version) {
      throw new Error("Comcigan timetable protocol mismatch");
    }

    const tokenMatch = /window\.__HourRequestToken\s*=\s*['"]([0-9a-fA-F]+)['"]\s*;/.exec(
      content,
    );
    const column = /Math\.floor\(학교명단\[i\]\[0\]\s*\/\s*(\d+)\)\s*\+\s*(\d+)/.exec(
      content,
    );

    return {
      endpoint,
      key: parseKeyHex(content),
      version,
      schoolDivisor: column ? Number(column[1]) : null,
      schoolOffset: column ? Number(column[2]) : 0,
      requestToken: tokenMatch?.[1] ?? null,
    };
  }

  const legacy = /\.(\/\d+\?\d+l)/.exec(content);
  if (legacy) {
    return {
      endpoint: `.${legacy[1]}`,
      key: null,
      version: null,
      schoolDivisor: null,
      schoolOffset: 0,
      requestToken: null,
    };
  }
  throw new Error(
    "컴시간 페이지 구조가 바뀌었습니다. 앱 업데이트가 필요할 수 있습니다.",
  );
}
