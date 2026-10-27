# AGENTS.md — SchoolUtil 에이전트 작업 지침

이 문서는 SchoolUtil을 계속 수정·보완할 때 AI 에이전트와 개발자가 따르는 규칙이다.
최우선 원칙은 **기존 기능과 사용자 데이터의 무결성을 깨지 않는 것**이다.

## 1. 프로젝트 개요

- 목적: 교사/개인용 Windows 바탕화면 유틸 (시간표, 할 일, 학사일정 등). 추후 일반 배포 예정.
- 형태: **설치형 앱** (Electron + React 19 + Vite + TypeScript, NSIS 설치 파일).
- 현재 버전: `package.json`의 `version`이 유일한 기준.
- 참고 제품: TeacherDesk 2 (kimju.kr/td2). 기능 아이디어만 참고하고 코드·문구·이미지는 베끼지 않는다.

### 로드맵 (진행 순서)

1. 기반 정리: Git, 버전, 빌드 정리, 아이콘 (완료)
2. 위젯 모드: 투명 창, `setShape`, Win32 `HWND_BOTTOM`, 앞으로 보기·비상 단축키 (Win+D·해상도 동기화 1차, WorkerW 부모 창은 미구현)
3. 위젯 연결·반응형 레이아웃·카드 켜기/끄기 (완료)
4. 학교 검색 온보딩, 데이터 백업, API 키 암호화, IPC 검증, 자동 업데이트 (완료 — `build.publish` GitHub Releases, `.github/workflows/release.yml`)
5. 업무포털: URL 열기·브라우저 선택·자격 증명 safeStorage (완료 — 기본 `url_only`; CDP·OS 인증 입력은 설정 «고급» opt-in POC)

로드맵 밖의 큰 기능을 임의로 시작하지 않는다. 필요하면 먼저 사용자에게 확인한다.

## 2. 구조 지도

```
electron/            Electron 메인 프로세스 (Node 권한)
  bootstrap.ts       userData 경로 고정 -> main 동적 import (순서 변경 금지)
  main.ts            창, 트레이, IPC 등록, 시작 프로그램
  preload.ts         contextBridge로 window.schoolUtil 노출
  store.ts           electron-store 영속 계층 + 기본값
  neis.ts            NEIS 학사일정 API 호출
  settings-normalize.ts  settings 병합·기본값
  win32-zorder.ts    바탕화면 아래 배치 (Windows)
  win32-desktop.ts   Progman/WorkerW 전경 감지 (Win+D 근사)
  widget-window.ts   위젯 창 주 모니터 workArea 맞춤
  portal-launch.ts   업무포털 URL을 기본/Chrome/Edge/Whale로 열기
  portal-automation.ts  CDP 자동 로그인(POC)·portal.log
  portal-cert-ui.ts  인증서 비밀번호 OS 입력(실험·opt-in)
  secrets.ts         NEIS 키·업무포털 자격 증명 safeStorage (`schoolutil-secrets.json`, 백업·로그에 미포함)
src/                 렌더러 (React, 브라우저 권한)
  App.tsx            대시보드 + react-grid-layout
  hooks/usePersistedState.ts   상태 로드/저장 훅
  types/state.ts     렌더러 쪽 상태 타입
  widgets/           위젯 컴포넌트
  utils/ styles/
scripts/generate-icons.mjs     임시 아이콘 생성
build/               electron-builder 리소스 (icon.ico, icon.png)
public/icon.png      트레이/앱 내 아이콘
```

데이터 흐름: `위젯 -> patch() -> window.schoolUtil.patchState -> ipc "store:patch" -> electron-store(JSON)`.

## 3. 절대 깨면 안 되는 불변 조건

아래 항목은 사용자 데이터 보존과 배포 안정성에 직결된다. 변경이 필요하면 반드시 사용자 승인과 마이그레이션 계획을 먼저 낸다.

### 3.1 식별자·경로 (바꾸면 재설치 시 데이터 유실)

- `build.appId`: `com.schoolutil.app`
- `productName`: `SchoolUtil`
- store 이름: `schoolutil-data` (`electron/store.ts`)
- userData 경로: `%APPDATA%\SchoolUtil` (`electron/bootstrap.ts`에서 설정)
- 데이터 파일: `%APPDATA%\SchoolUtil\schoolutil-data.json`

### 3.2 저장 데이터 스키마

- 최상위 키 `todos`, `memos`, `ddays`, `timetable`, `layout`, `settings`의 **이름과 의미를 바꾸거나 삭제하지 않는다.**
- 새 필드는 **선택값(optional) 또는 기본값이 있는 추가만** 허용한다. 기존 사용자의 JSON에는 새 필드가 없다는 것을 항상 가정한다.
- 필드 이름 변경, 타입 변경, 삭제가 필요하면 **마이그레이션 코드**(스키마 버전 필드 + 변환 함수)를 함께 작성하고, 구버전 데이터가 그대로 열리는지 확인한다.
- `patchState`는 **키 단위로 통째로 덮어쓴다** (얕은 병합). `settings`나 `timetable`을 patch할 때 일부 필드만 담아 보내면 나머지가 사라진다. 항상 전체 객체를 보내거나, 병합 로직을 추가한다.
- 상태 타입이 **세 곳에 중복**되어 있다. 하나를 바꾸면 모두 같이 바꾼다.
  1. `electron/store.ts` (타입 + `defaults`)
  2. `src/types/state.ts`
  3. `src/hooks/usePersistedState.ts`의 `fallback`
- 렌더러 `fallback`과 메인 `defaults`가 서로 다른 값을 갖지 않게 유지한다.

### 3.3 IPC 계약

- IPC 채널 이름(`store:get`, `store:patch`, `store:path`, `app:minimize`, `app:hide`, `shell:openExternal`, `neis:schedule`, `portal:launch` 등)은 **기존 이름과 반환 형태를 유지**한다. 추가는 가능, 삭제·변경은 승인 필요.
- 새 IPC를 추가할 때는 아래 세 곳을 **한 번에** 수정한다.
  1. `electron/main.ts` (`ipcMain.handle`)
  2. `electron/preload.ts` (`api` 객체)
  3. `src/vite-env.d.ts` (`Window.schoolUtil` 타입)
- 렌더러에서 Node API(`fs`, `child_process` 등)를 직접 쓰지 않는다. 필요한 기능은 메인에 IPC로 만든다.

### 3.4 Electron 보안 기본값

- `contextIsolation: true`, `nodeIntegration: false`를 유지한다.
- 새로 추가하는 IPC 핸들러는 **입력을 검증**한다 (타입, 길이, 허용 목록).
- `shell.openExternal`에 넘기는 URL은 `https:`(필요 시 `http:`)만 허용하도록 개선하는 방향으로만 수정한다. 더 느슨하게 만들지 않는다.
- 외부 API 응답은 신뢰하지 않는다 (`neis.ts`처럼 방어적으로 파싱).
- API 키 등 비밀값을 로그, 에러 메시지, 커밋에 노출하지 않는다.

### 3.5 앱 동작

- 창을 닫으면 종료가 아니라 **트레이로 숨김**이다 (`isQuitting` 플래그). 완전 종료는 트레이 메뉴의 "종료"뿐이다. 이 흐름을 깨지 않는다.
- 종료 불가 상태(창이 안 닫히고 트레이도 없음)를 만들지 않는다. 위젯 모드 작업 시 **비상 탈출 경로**(트레이 메뉴, 단축키)를 반드시 남긴다.
- 시작 프로그램 등록(`applyLoginItem`)은 개발 모드에서 `process.argv[1]`을 쓴다. 이 분기를 유지한다.
- 기존 위젯(할 일, 시간표, 학사일정, 설정)의 입력, 저장, 정렬 동작을 변경할 때는 변경 전후 동작을 비교해 확인한다.

## 4. 수정 작업 절차

### 4.1 작업 전

1. 변경 대상 파일과 **그 파일을 사용하는 곳**을 검색(`Grep`)으로 모두 확인한다.
2. 위 3장 불변 조건에 닿는지 판단한다. 닿으면 사용자에게 알리고 승인을 받는다.
3. 큰 변경(창 구조, 저장 구조, 빌드 구조)은 먼저 계획을 제시하고 승인받은 뒤 구현한다.
4. 실행 중인 앱/개발 서버가 빌드 산출물을 잠글 수 있으므로, 패키징 전 상태를 확인한다.

### 4.2 작업 중

- **작은 단위로 수정**하고, 요청과 무관한 리팩터링·포맷 변경·의존성 업그레이드를 섞지 않는다.
- 기존 코드 스타일을 따른다: 2칸 들여쓰기, 더블 쿼트, 세미콜론, 함수형 컴포넌트, `@/` 경로 별칭.
- 사용자에게 보이는 문구는 **한국어**로 쓰고 기존 톤(짧고 명확한 안내)을 맞춘다.
- 새 위젯은 `src/widgets/`에 만들고, `App.tsx`의 `WIDGET_IDS`, `DEFAULT_LAYOUT`, `TITLES`에 등록한다. 기존 위젯의 레이아웃 키(`todo`, `timetable`, `schoolsched`, `settings`)는 바꾸지 않는다.
- 위젯 레이아웃 병합은 `{ ...DEFAULT_LAYOUT, ...state.layout }` 방식이라 새 위젯을 추가해도 기존 저장 레이아웃이 유지된다. 이 성질을 깨지 않는다.
- 새 의존성은 꼭 필요할 때만 추가하고, 이유를 설명한다. 네이티브 모듈은 설치 파일 빌드(`@electron/rebuild`)에 영향을 주므로 특히 신중히 선택한다.
- 사용하지 않는 코드는 `noUnusedLocals`/`noUnusedParameters` 때문에 빌드가 실패한다. 임시로 남기지 않는다.

### 4.3 작업 후 검증 (필수)

변경 규모와 관계없이 아래를 순서대로 실행하고 결과를 보고한다.

```powershell
npm run typecheck
npm run build
```

변경 범위에 따라 추가로 확인한다.

| 변경 범위 | 추가 검증 |
|-----------|-----------|
| 렌더러 UI | `npm run dev`로 Electron 창에서 직접 확인 (Chrome 탭에서는 저장이 동작하지 않음) |
| 저장/스키마 | 기존 `schoolutil-data.json`을 복사해 둔 뒤 새 코드로 열어 데이터가 보존되는지 확인 |
| IPC/메인 | 앱 재시작 후 저장값 유지, 트레이 열기/숨기기/종료 동작 확인 |
| 빌드/패키징 | `npm run dist:dir`로 `win-unpacked` 실행 확인 |
| 배포 직전 | `npm run dist`로 설치 파일 생성, 클린 설치와 **덮어쓰기 설치** 모두 확인 |

검증하지 못한 항목은 "확인하지 못함"이라고 명확히 적는다. 확인하지 않고 동작한다고 말하지 않는다.

### 4.4 데이터 보호 테스트 습관

- 스키마나 저장 로직을 만지기 전에 `%APPDATA%\SchoolUtil\schoolutil-data.json`을 **복사해서 백업**한다.
- 테스트용 데이터로 실제 사용자 데이터 파일을 덮어쓰지 않는다. 필요하면 별도 userData 경로를 쓴다.
- 마이그레이션은 **멱등**(여러 번 실행해도 결과 동일)이어야 하고, 실패 시 원본을 보존해야 한다.

## 5. 빌드·배포 규칙

- 명령어 (PowerShell 기준, `&&` 대신 `;` 사용):
  - 개발: `npm run dev`
  - 타입 검사: `npm run typecheck`
  - 빌드: `npm run build` (실행 전 `dist`, `dist-electron` 자동 정리)
  - 전체 정리: `npm run clean` (앱 종료 후 사용, `release` 포함)
  - 폴더 패키징: `npm run dist:dir` / 설치 파일: `npm run dist`
  - 아이콘 재생성: `npm run icons`
- `release/`가 실행 중인 앱에 잠겨 `EBUSY`가 나면 앱과 dev Electron을 모두 종료한 뒤 재시도한다. 임시로 다른 출력 폴더(`release-staging`)에 패키징할 수 있다.
- 빌드 산출물(`dist`, `dist-electron`, `release`, `release-staging`)과 `node_modules`는 커밋하지 않는다.
- **버전 올리기**: `package.json`의 `version`만 수정하고, README 표기를 함께 맞춘다. 사용자에게 보이는 변경은 README의 기능 목록에 반영한다.
- 코드 서명이 없는 설치 파일은 SmartScreen 경고가 뜬다 (README에 안내됨). 서명 설정을 임의로 바꾸지 않는다.
- 자동 업데이트를 도입할 때는 `appId`, 산출물 이름 규칙, 배포 채널(GitHub Releases 등)을 먼저 사용자와 정한다.

## 6. 코딩 규칙

- TypeScript `strict`. `any`와 `@ts-ignore`는 쓰지 않는다. 불가피하면 이유를 주석으로 남긴다.
- 렌더러의 상태 변경은 `usePersistedState`의 `patch`를 거친다. 위젯이 직접 디스크에 쓰지 않는다.
- 날짜는 `YYYYMMDD`(NEIS) 또는 ISO 문자열을 쓰던 기존 위치의 형식을 유지한다. 타임존 문제가 생기지 않도록 로컬 날짜 계산을 섞어 쓰지 않는다.
- 시간표는 `normalizeTimetable`을 거쳐 읽는다 (교시 1~12, 5일). 이 범위를 벗어나는 값이 저장돼 있어도 깨지지 않아야 한다.
- 네트워크 호출은 메인 프로세스에서 하고, **타임아웃**과 **오류 메시지**를 반드시 둔다 (`neis.ts` 방식).
- 주석은 "무엇"이 아니라 "왜"가 필요한 곳에만 쓴다.

## 7. 알려진 제약과 주의 지점

- `GridLayout` 너비는 `useDashboardWidth`로 대시보드 영역에 맞춘다.
- `displayMode`가 `widget`이면 창이 투명·주 모니터 workArea이며 `setIgnoreMouseEvents(forward)`로 빈 영역 클릭이 통과한다 (Windows `setShape`는 그리기까지 잘라 사용 안 함). `window`면 기존 불투명 전체 창. 모드 전환 시 창을 재생성한다.
- Win+D·바탕화면 전환: `isDesktopForeground` 폴링·blur 시 Z-order·`setShape` 재동기화 (완전 동기는 아님). WorkerW 부모 창 방식은 미구현. Z-order 실패 시 화면 상단 배너로 안내한다.
- 위젯 id·기본 레이아웃은 `src/widgets/registry.ts`에 등록한다. 새 위젯 추가 시 registry, `App.tsx` `renderWidgetBody`, 설정 토글 목록을 함께 수정한다. **설정 UI는 그리드 카드가 아니라 하단 도크(톱니바퀴)·제목줄 버튼 → `SettingsModal`**.
- 급식·날씨 API는 메인 IPC(`neis:meal`, `weather:current`)로 호출한다.
- NEIS API 키는 현재 평문 JSON에 저장된다. 개선(암호화) 시 기존 평문 값을 읽어 이전하는 경로를 반드시 둔다.
- `store:patch`는 입력 검증이 없다. 스키마 검증을 추가할 때 **기존 정상 데이터를 거부하지 않도록** 느슨한 기준부터 적용한다.

## 8. 에이전트 행동 규칙

- 사용자가 요청하지 않은 파일(문서, README 등)을 새로 만들지 않는다. 이 문서의 갱신은 예외다.
- Git 커밋, 푸시, 브랜치 변경은 **사용자가 요청할 때만** 한다.
- 파괴적 작업(데이터 파일 삭제, `release` 강제 삭제, 프로세스 강제 종료)은 대상을 확인하고 필요한 범위로만 한다. 다른 프로젝트의 프로세스를 건드리지 않는다.
- 요구가 모호하거나 여러 구현이 가능하면 구현 전에 질문한다.
- 작업 종료 시 보고 형식:
  1. 무엇을 바꿨는지 (파일 단위)
  2. 불변 조건(3장)에 영향이 있었는지
  3. 실행한 검증과 결과, 확인하지 못한 항목
  4. 사용자가 해야 할 후속 작업

## 9. 변경 체크리스트 (복사해서 사용)

```
[ ] 변경 대상과 사용처를 검색으로 확인했다
[ ] 3장 불변 조건(식별자, 스키마, IPC, 보안, 트레이 동작)을 침해하지 않는다
[ ] 상태 타입을 바꿨다면 store.ts / state.ts / usePersistedState.ts를 모두 맞췄다
[ ] IPC를 추가했다면 main.ts / preload.ts / vite-env.d.ts를 모두 수정했다
[ ] 기존 사용자 데이터(구버전 JSON)로 열어 보았다
[ ] npm run typecheck 통과
[ ] npm run build 통과
[ ] 필요한 경우 dist:dir로 패키징 실행 확인
[ ] README / 버전 표기를 갱신했다
```
