export type ServiceProtocol = {
  /** legacy GET: 예 `./36179?73629l` */
  endpoint: string;
  /** POST 경로 세그먼트 (예 `959975`) */
  mainRoute?: string;
  apiStyle: "legacy-get" | "post-plain";
  searchRoute?: string;
  timetablePrefix?: string;
  key: Buffer | null;
  version: string | null;
  schoolDivisor: number | null;
  schoolOffset: number;
  requestToken: string | null;
};

function parseKeyHexFromExpression(expression: string): string {
  const literal = /^'([0-9a-fA-F]+)'$/.exec(expression.trim());
  if (literal) return literal[1]!;

  const shuffle = /^\(function\(a\)\{return\s+(a\[\d+\](?:\+a\[\d+\])*)\s*;\}\)\((\[.*\])\)$/s.exec(
    expression.trim(),
  );
  if (shuffle) {
    const fragments = [...shuffle[2].matchAll(/'([0-9a-fA-F]+)'/g)].map(
      (m) => m[1]!,
    );
    const indexes = [...shuffle[1].matchAll(/a\[(\d+)\]/g)].map((m) =>
      Number(m[1]),
    );
    return indexes.map((i) => fragments[i]!).join("");
  }

  const pieces = /^\(function\(a\)\{return\s+(a\[\d+\](?:\+a\[\d+\])*)\s*;\}\)\((\[.*\])\)$/s.exec(
    expression.trim(),
  );
  if (!pieces) {
    throw new Error("Unable to parse Comcigan response key expression");
  }
  const fragments = [...pieces[2].matchAll(/'([0-9a-fA-F]+)'/g)].map(
    (m) => m[1]!,
  );
  const indexes = [...pieces[1].matchAll(/a\[(\d+)\]/g)].map((m) =>
    Number(m[1]),
  );
  return indexes.map((i) => fragments[i]!).join("");
}

function parseKeyHex(content: string): Buffer {
  const keyMatch = /var\s+key\s*=\s*CryptoJS\.enc\.Hex\.parse\(([\s\S]*?)\);/.exec(
    content,
  );
  if (!keyMatch) {
    throw new Error("Unable to parse Comcigan response key");
  }
  const keyHex = parseKeyHexFromExpression(keyMatch[1]);
  if (![32, 48, 64].includes(keyHex.length)) {
    throw new Error("Invalid Comcigan response key size");
  }
  return Buffer.from(keyHex, "hex");
}

function parsePost8701Protocol(content: string): ServiceProtocol | null {
  const school =
    /'(\d+l)'\s*\+\s*encodeURIComponent\(sc\);[\s\S]*?url:'\.\/(\d+)'/.exec(
      content,
    );
  const version =
    /encodeURIComponent\(btoa\(s7\+'_(\d{4})'\)\)/.exec(content)?.[1] ??
    /btoa\(s7\+'_(\d{4})'\)/.exec(content)?.[1] ??
    /btoa\(s8\+'_'\+r\+'_(\d{4})'\)/.exec(content)?.[1];
  const timetable =
    /\w+\('(\d{4,7})_',\s*sc/.exec(content)?.[1] ??
    /f856wT\('(\d{4,7})_'/.exec(content)?.[1];
  if (!school || !version || !timetable) return null;

  const token =
    /window\.__HourRequestToken\s*=\s*['"]([0-9a-fA-F]+)['"]/.exec(content)?.[1] ??
    null;
  const column =
    /Math\.floor\(H학교명단\.학교검색\[i\]\[0\]\s*\/\s*(\d+)\)\s*\+\s*(\d+)/.exec(
      content,
    );

  let key: Buffer | null = null;
  try {
    key = parseKeyHex(content);
  } catch {
    key = null;
  }

  return {
    endpoint: `./${school[2]}?${school[1]}`,
    mainRoute: school[2],
    apiStyle: "post-plain",
    searchRoute: school[1],
    timetablePrefix: `${timetable}_`,
    key,
    version,
    schoolDivisor: column ? Number(column[1]) : null,
    schoolOffset: column ? Number(column[2]) : 0,
    requestToken: token,
  };
}

export function parseServiceProtocol(content: string): ServiceProtocol {
  const post8701 = parsePost8701Protocol(content);
  if (post8701) return post8701;

  if (/\bfunction\s+QAjaxSchool\s*\(/.test(content)) {
    const request =
      /function\s+QAjaxSchool\s*\([^)]*\)\s*\{(?:(?!\bfunction\b).)*?url\s*:\s*'\.(\/\d+)\?'\s*\+\s*encodeURIComponent\(btoa\(\s*'(\d+l)'\s*\+\s*encodeURIComponent\(sc\)\s*\+\s*'_(enc\d+)'\)\)/s.exec(
        content,
      );
    if (!request) {
      throw new Error("Unable to parse Comcigan school request protocol");
    }
    const endpoint = `./${request[1].replace(/^\//, "")}?${request[2]}`;
    const version = request[3];

    const timetable =
      /function\s+QAjaxTimetable\s*\([^)]*\)\s*\{(?:(?!\bfunction\b).)*?url\s*:\s*'\.(\/\d+)\?'\s*\+\s*btoa\([^;{}]*?'_(enc\d+)'\s*\)/s.exec(
        content,
      );
    if (!timetable || timetable[2] !== version) {
      throw new Error("Comcigan timetable protocol mismatch");
    }

    const tokenMatch =
      /window\.__HourRequestToken\s*=\s*['"]([0-9a-fA-F]+)['"]\s*;/.exec(content);
    const column = /Math\.floor\(학교명단\[i\]\[0\]\s*\/\s*(\d+)\)\s*\+\s*(\d+)/.exec(
      content,
    );

    return {
      endpoint,
      apiStyle: "legacy-get",
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
      apiStyle: "legacy-get",
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