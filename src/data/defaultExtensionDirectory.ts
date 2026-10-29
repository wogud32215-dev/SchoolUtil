import type { ExtensionContact, ExtensionSection } from "../types/extensions";

function contact(label: string, extension: string): ExtensionContact {
  const slug = `${extension}-${label}`.replace(/\s+/g, "");
  return { id: `c-${slug}`, label, extension };
}

function section(
  areaLabel: string,
  department: string,
  sortOrder: number,
  contacts: ExtensionContact[],
): ExtensionSection {
  return {
    id: `s-${sortOrder}-${department.replace(/\s+/g, "")}`,
    areaLabel,
    department,
    sortOrder,
    contacts,
  };
}

/** 2026학년도 내선번호(초기 데이터). 사용자가 편집하면 저장값이 우선합니다. */
export function defaultExtensionSections(): ExtensionSection[] {
  return [
    section("본관 · 1층", "교장실", 10, [contact("손응태", "201")]),
    section("본관 · 1층", "교육행정실", 11, [
      contact("박용희", "202"),
      contact("이혜란", "203"),
      contact("노현희", "204"),
      contact("강인수", "205"),
      contact("김연주", "206"),
      contact("김지원", "207"),
      contact("박규리", "208"),
      contact("지혜린", "209"),
    ]),
    section("본관 · 1층", "특수 개별실", 12, [
      contact("장민지", "360"),
      contact("윤지환", "369"),
      contact("안민영", "370"),
    ]),
    section("본관 · 1층", "당직실", 13, [contact("당직실", "390")]),
    section("본관 · 2층", "교무기획부", 20, [
      contact("강경원", "210"),
      contact("류양근", "211"),
      contact("최예지", "213"),
      contact("이성경", "214"),
      contact("이태영", "215"),
      contact("전예은", "216"),
      contact("최연수", "234"),
      contact("문지인", "245"),
    ]),
    section("본관 · 2층", "미래환경부", 21, [
      contact("이수남", "212"),
      contact("김현찬", "217"),
      contact("임혜림", "266"),
      contact("이연숙", "267"),
      contact("오수경", "268"),
    ]),
    section("본관 · 2층", "교육과정부", 22, [
      contact("김지용", "218"),
      contact("이나래", "219"),
      contact("최진숙", "220"),
      contact("유치성", "241"),
      contact("이슬아", "242"),
      contact("이명진", "243"),
      contact("박정빈", "244"),
    ]),
    section("본관 · 2층", "연구부", 23, [
      contact("황유란", "231"),
      contact("김소리", "232"),
      contact("성흥연", "233"),
      contact("신혜경", "235"),
      contact("서재형", "236"),
      contact("이지연", "237"),
      contact("양운수", "270"),
    ]),
    section("본관 · 2층", "정보부", 24, [
      contact("윤명훈", "261"),
      contact("신나경", "262"),
      contact("윤태수", "263"),
      contact("박기영", "264"),
      contact("홍승완", "325"),
    ]),
    section("본관 · 2층", "학생생활부", 25, [
      contact("김지용", "271"),
      contact("최수미", "272"),
      contact("김대영", "273"),
      contact("곽동욱", "274"),
      contact("이혜린", "275"),
      contact("신혜원", "276"),
      contact("심재환", "277"),
    ]),
    section("본관 · 2층", "방송실", 26, [contact("방송실", "365")]),
    section("본관 · 2층", "상담실", 27, [contact("이경희", "366")]),
    section("본관 · 2층", "보건실", 28, [
      contact("김성경", "391"),
      contact("허선미", "395"),
    ]),
    section("본관 · 3–4층 · 실습동", "진학지원부", 30, [
      contact("김현승", "251"),
      contact("이재원", "252"),
      contact("전윤주", "254"),
      contact("이태영", "284"),
      contact("박준규", "324"),
    ]),
    section("본관 · 3–4층", "특수교육부", 31, [
      contact("신은정", "253"),
      contact("이혁기", "257"),
      contact("박현수", "258"),
      contact("박시연", "259"),
      contact("전윤선", "282"),
      contact("임은정", "397"),
    ]),
    section("실습동", "디지털전자부", 40, [
      contact("안채린", "279"),
      contact("박병규", "289"),
      contact("윤영규", "351"),
      contact("정용석", "352"),
      contact("민병관", "353"),
      contact("지선학", "354"),
      contact("김승수", "355"),
    ]),
    section("실습동", "진로상담부", 41, [
      contact("김봉근", "290"),
      contact("류명수", "291"),
      contact("김인태", "292"),
      contact("양진모", "293"),
    ]),
    section("실습동", "체육보건부", 42, [
      contact("제1체육관", "303"),
      contact("서철현", "326"),
      contact("준비실 박미아", "327"),
      contact("고한이", "328"),
      contact("운동부지도자 · 제2체육관", "329"),
    ]),
    section("실습동", "농업토목부", 43, [
      contact("이상헌", "331"),
      contact("이채은", "332"),
      contact("박민아", "333"),
    ]),
    section("실습동", "조경원예부", 44, [
      contact("이대형", "334"),
      contact("김건아", "335"),
      contact("이유진", "336"),
      contact("김희정", "337"),
    ]),
    section("실습동", "식품가공부", 45, [
      contact("엄기영", "338"),
      contact("이민희", "339"),
      contact("박수빈", "340"),
    ]),
    section("실습동", "전산응용기계부", 46, [
      contact("정연상", "341"),
      contact("최진현", "342"),
      contact("정지현", "343"),
      contact("장재필", "344"),
      contact("박원석", "345"),
      contact("안종남", "347"),
      contact("김현준", "348"),
      contact("강민수", "349"),
    ]),
    section("실습동", "요업디자인부", 47, [
      contact("최은주", "361"),
      contact("신한울", "362"),
      contact("신한울", "363"),
      contact("강승우", "364"),
    ]),
    section("실습동", "미술실", 48, [contact("미술실", "367")]),
    section("실습동", "음악실", 49, [contact("음악실", "368")]),
    section("실습동", "공동실습소", 50, [
      contact("박소연", "371"),
      contact("최동배", "372"),
      contact("김덕근", "373"),
      contact("황석현", "375"),
      contact("서명원", "376"),
      contact("이상호", "377"),
      contact("이동희", "378"),
    ]),
    section("본관 · 1층", "시설관리실", 15, [
      contact("양승대", "384"),
      contact("왕만식", "385"),
    ]),
    section("본관 · 1층", "도서실", 16, [contact("박보라", "388")]),
    section("후관 · 1층", "특성화교육부", 60, [
      contact("서영자", "221"),
      contact("최병설", "222"),
      contact("이경아", "223"),
      contact("박지성", "224"),
      contact("류소윤", "226"),
      contact("이지은", "228"),
    ]),
    section("후관 · 1층", "멀티미디어실", 61, [contact("멀티미디어실", "269")]),
    section("후관 · 1층", "영어전용실", 62, [contact("영어전용실", "379")]),
    section("후관 · 1층", "학부모상주실", 63, [contact("학부모상주실", "380")]),
    section("후관 · 1층", "급식실", 64, [contact("안혜진", "386")]),
    section("후관 · 2층", "보통과학부", 70, [
      contact("심하은", "265"),
      contact("최일주", "321"),
      contact("조세현", "322"),
      contact("강지애", "323"),
    ]),
    section("후관 · 2층", "시민인성안전부", 71, [
      contact("오은실", "295"),
      contact("최민숙", "311"),
      contact("김도윤", "313"),
      contact("정준영", "315"),
    ]),
    section("기타 시설", "인재관 2층 사감실", 80, [contact("사감실", "298")]),
    section("기타 시설", "인재관 3층 사감실", 81, [contact("사감실", "299")]),
    section("기타 시설", "휴게실", 82, [contact("휴게실", "381")]),
    section("기타 시설", "축구부 숙소", 83, [contact("축구부 숙소", "393")]),
    section("기타 시설", "공소급식실", 84, [contact("정희정", "396")]),
  ];
}

export function defaultExtensionDirectory(): {
  sections: ExtensionSection[];
} {
  return { sections: defaultExtensionSections() };
}
