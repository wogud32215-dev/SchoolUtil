/** 버전별 업데이트 요약 (배포 시 README·GitHub Release와 함께 갱신) */
export type ReleaseNotesEntry = {
  version: string;
  highlights: string[];
};

export const RELEASE_NOTES_CATALOG: ReleaseNotesEntry[] = [
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

export function bundledHighlightsForVersion(version: string): string[] {
  const v = version.trim();
  const entry = RELEASE_NOTES_CATALOG.find((e) => e.version === v);
  return entry?.highlights ? [...entry.highlights] : [];
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
