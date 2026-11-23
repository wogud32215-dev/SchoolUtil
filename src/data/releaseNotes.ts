/** 버전별 업데이트 요약 (배포 시 README·GitHub Release와 함께 갱신) */
export type ReleaseNotesEntry = {
  version: string;
  highlights: string[];
};

export const RELEASE_NOTES_CATALOG: ReleaseNotesEntry[] = [
  {
    version: "1.1.0",
    highlights: [
      "컴시간: 학교 검색·교사·과목 필드 암호화 복호화",
      "할 일: 연체 마감일 D+N 표기",
    ],
  },
  {
    version: "1.0.9",
    highlights: [
      "컴시간: 암호화 응답·사이트 구조 변경 대응",
      "메모: 쪽지 드래그로 위치 이동",
      "달력·할 일·업데이트 안내 사용성 개선",
    ],
  },
  {
    version: "1.0.8",
    highlights: [
      "문의·요청: GitHub Releases 설치본에서도 Web3Forms로 이메일 전송",
    ],
  },
  {
    version: "1.0.7",
    highlights: [
      "문의·요청: Web3Forms로 이메일 전송 (광고 차단·FormSubmit 활성화 없이 사용)",
    ],
  },
  {
    version: "1.0.6",
    highlights: ["문의·요청: 앱에서 문의·기능 요청 작성 후 이메일 전송"],
  },
  {
    version: "1.0.5",
    highlights: [
      "컴시간: 학급 시간표 가져오기, 시간표 위젯에서 교사·학생 표 전환",
      "내선번호: 2026.7.1 학교 배치도 기준 진학지원부 내선 보정(자동 반영)",
    ],
  },
  {
    version: "1.0.4",
    highlights: [
      "GitHub Release 빌드에 공용 NEIS 키 포함",
      "글꼴: 설치 용량 절감, «기본»·«시스템 글꼴» 표기 유지",
    ],
  },
  {
    version: "1.0.3",
    highlights: ["글꼴 설정 표기 «기본»·«시스템 글꼴»로 정리"],
  },
  {
    version: "1.0.1",
    highlights: [
      "메모: 글자에 맞춰 쪽지 높이 자동 조절",
      "위젯 모드 Ctrl+Alt+D 단축키 자동 복구",
      "Brity·업무포털 UIA 스크립트 설치본 포함",
    ],
  },
];

function parseSemver(version: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** semver 비교 — 파싱 실패 시 문자열 동등 비교 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa && pb) {
    for (let i = 0; i < 3; i += 1) {
      if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
    }
    return 0;
  }
  const sa = a.trim();
  const sb = b.trim();
  if (sa === sb) return 0;
  return sa < sb ? -1 : 1;
}

export function bundledHighlightsForVersion(version: string): string[] {
  const v = version.trim();
  const entry = RELEASE_NOTES_CATALOG.find((e) => e.version === v);
  return entry?.highlights ? [...entry.highlights] : [];
}

/** 이전 버전(미포함) ~ 대상 버전(포함) 사이 릴리스 요약 */
export function collectHighlightsBetween(
  fromVersion: string,
  toVersion: string,
): string[] {
  const from = fromVersion.trim();
  const to = toVersion.trim();
  if (!from || !to || compareSemver(from, to) >= 0) {
    return bundledHighlightsForVersion(to);
  }
  const out: string[] = [];
  for (const entry of RELEASE_NOTES_CATALOG) {
    if (
      compareSemver(entry.version, from) > 0 &&
      compareSemver(entry.version, to) <= 0
    ) {
      out.push(...entry.highlights);
    }
  }
  if (out.length > 0) return out.slice(0, 8);
  return mergeReleaseHighlights(to, []);
}

export function mergeReleaseHighlights(
  version: string,
  fromUpdater: string[],
): string[] {
  const bundled = bundledHighlightsForVersion(version);
  if (bundled.length > 0) return bundled.slice(0, 6);
  const cleaned = fromUpdater
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 6);
  if (cleaned.length > 0) return cleaned;
  return ["버그 수정 및 사용성 개선이 포함되어 있습니다."];
}

/** Windows 알림 본문 (짧게) */
export function formatReleaseNotesForNotification(
  version: string,
  highlights: string[],
): string {
  const head = `버전 ${version}`;
  const first = highlights[0];
  if (!first) return head;
  if (highlights.length === 1) return `${head} — ${first}`;
  return `${head} — ${first} 외 ${highlights.length - 1}건`;
}
