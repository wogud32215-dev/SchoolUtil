import type { PortalId } from "./portal-ids";
import { DEFAULT_PORTAL_URLS } from "./portal-ids";

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

export type EducationOffice = {
  id: EducationOfficeId;
  label: string;
  /** 교육청 업무포털(나이스 진입) — 학교망·교육청마다 다를 수 있음 */
  niceUrl: string;
  edufineUrl: string;
};

/** 공통 기본값. 실제 학교 URL은 설정에서 수정 가능 */
const EDU = DEFAULT_PORTAL_URLS.edufine;
const NEIS = DEFAULT_PORTAL_URLS.nice;

export const EDUCATION_OFFICES: EducationOffice[] = [
  { id: "custom", label: "직접 입력 (아래 URL 유지)", niceUrl: NEIS, edufineUrl: EDU },
  { id: "seoul", label: "서울특별시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "busan", label: "부산광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "daegu", label: "대구광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "incheon", label: "인천광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gwangju", label: "광주광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "daejeon", label: "대전광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "ulsan", label: "울산광역시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "sejong", label: "세종특별자치시교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gyeonggi", label: "경기도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gangwon", label: "강원특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "chungbuk", label: "충청북도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "chungnam", label: "충청남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeonbuk", label: "전북특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeonnam", label: "전라남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gyeongbuk", label: "경상북도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "gyeongnam", label: "경상남도교육청", niceUrl: NEIS, edufineUrl: EDU },
  { id: "jeju", label: "제주특별자치도교육청", niceUrl: NEIS, edufineUrl: EDU },
];

export function isEducationOfficeId(value: string): value is EducationOfficeId {
  return EDUCATION_OFFICES.some((o) => o.id === value);
}

export function officeById(id: string): EducationOffice | undefined {
  return EDUCATION_OFFICES.find((o) => o.id === id);
}

export function urlsForOffice(
  officeId: string,
  portalId: PortalId,
): string | null {
  const office = officeById(officeId);
  if (!office || office.id === "custom") return null;
  return portalId === "nice" ? office.niceUrl : office.edufineUrl;
}
