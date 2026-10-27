/** 렌더러용 교육청 프리셋 (electron/portal-offices.ts와 URL 동기화) */
export type EducationOfficeId =
  | "custom"
  | "seoul"
  | "busan"
  | "daegu"
  | "incheon"
  | "gwangju"
  | "daejeon"
  | "ulsan"
  | "sejong"
  | "gyeonggi"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju";

const NEIS = "https://www.neis.go.kr/";
const EDU = "https://www.edufine.go.kr/";
export const GOE_WORK_PORTAL_URL =
  "https://goe.eduptl.kr/bpm_lgn_lg00_001.do";

export const EDUCATION_OFFICE_OPTIONS: {
  id: EducationOfficeId;
  label: string;
  niceUrl: string;
  edufineUrl: string;
  goePortalUrl?: string;
}[] = [
  { id: "custom", label: "직접 입력 (URL 유지)", niceUrl: NEIS, edufineUrl: EDU },
  { id: "seoul", label: "서울특별시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "busan", label: "부산광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "daegu", label: "대구광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "incheon", label: "인천광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gwangju", label: "광주광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "daejeon", label: "대전광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "ulsan", label: "울산광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "sejong", label: "세종특별자치시교육청", niceUrl: NEIS, edufineUrl: EDU },
  {
    id: "gyeonggi",
    label: "경기도교육청",
    niceUrl: NEIS,
    edufineUrl: EDU,
    goePortalUrl: GOE_WORK_PORTAL_URL,
  },
  { id: "gangwon", label: "강원특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "chungbuk", label: "충청북도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "chungnam", label: "충청남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeonbuk", label: "전북특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeonnam", label: "전라남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gyeongbuk", label: "경상북도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gyeongnam", label: "경상남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeju", label: "제주특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
];

export function officePresetUrls(
  officeId: string,
): { nice: string; edufine: string; goePortal?: string } | null {
  const row = EDUCATION_OFFICE_OPTIONS.find((o) => o.id === officeId);
  if (!row || row.id === "custom") return null;
  return {
    nice: row.niceUrl,
    edufine: row.edufineUrl,
    goePortal: row.goePortalUrl,
  };
}
