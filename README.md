# SchoolUtil

Windows용 설치형 바탕화면 종합 유틸 (Electron + React + Vite). **버전 0.4.0**

## Git

원격 저장소: [github.com/wogud32215/SchoolUtil](https://github.com/wogud32215/SchoolUtil)

소스만 Git으로 관리합니다. `dist`, `dist-electron`, `release`, `node_modules`는 커밋하지 않습니다.

```bash
git remote add origin https://github.com/wogud32215/SchoolUtil.git
# 최초 푸시 (브랜치 이름이 main이면 main으로 바꿉니다)
git push -u origin master
```

## 개발 워크플로

```bash
npm install
npm run dev
```

Vite 개발 서버와 Electron 창이 함께 실행됩니다. 개발 중 빌드 출력이 꼬이면:

```bash
npm run clean && npm run dev
```

타입 검사:

```bash
npm run typecheck
```

## 프로덕션 빌드 · 설치 파일

`npm run build`는 실행 전에 `dist` / `dist-electron`를 비웁니다 (`prebuild`). `release`까지 지우려면 앱을 종료한 뒤 `npm run clean`을 실행하세요.

```bash
npm run dist
```

`release/` 폴더에 NSIS 설치 프로그램(예: `SchoolUtil-Setup-0.4.0.exe`)과 자동 업데이트용 `latest.yml`이 생성됩니다.

설치만 빠르게 확인하려면:

```bash
npm run dist:dir
```

`release/win-unpacked/SchoolUtil.exe`로 실행해 보세요. **덮어쓰기 설치**는 `npm run dist`로 만든 Setup exe로 기존 설치 위에 다시 설치하면 됩니다.

### 로컬 패키징 체크리스트

1. 실행 중인 SchoolUtil·개발용 Electron을 모두 종료 (`release` 폴더 잠금 방지).
2. `npm run typecheck` → `npm run build` (또는 `npm run dist:dir`).
3. `win-unpacked`에서 실행: 트레이, 설정 저장, 위젯 모드, 백업 보내기/불러오기.
4. 필요 시 `npm run dist`로 Setup exe 생성 후 설치·재설치.

코드 서명이 없으면 PowerShell에서 다음을 설정한 뒤 `dist`를 실행하세요.

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
```

## 배포 · GitHub Releases · 자동 업데이트

`package.json`의 `build.publish`는 **GitHub Releases** (`provider: github`)로 설정되어 있습니다. 설치 파일을 빌드할 때 `app-update.yml`에 피드 URL이 들어가며, 설치판 앱의 **설정 → 데이터 백업 → 업데이트 확인**으로 새 버전을 받을 수 있습니다.

### 첫 배포 준비

1. `package.json`의 `repository`·`build.publish`는 **wogud32215/SchoolUtil** 로 맞춰 두었습니다.
2. `git remote`가 위 저장소를 가리키는지 확인한 뒤 `main` 또는 `master`에 푸시하면 `.github/workflows/ci.yml`이 타입 검사·빌드를 실행합니다.

### 릴리스 올리기 (권장: 태그 + Actions)

1. `package.json`의 `version`을 올립니다 (예: `0.4.1`).
2. 커밋 후 태그를 푸시합니다. **태그는 `v` + 버전**과 일치해야 합니다.

```bash
git tag v0.4.1
git push origin main --tags
```

3. `.github/workflows/release.yml`이 Windows에서 설치 파일을 빌드하고 GitHub Releases에 `latest.yml`·Setup exe를 올립니다.
4. 사용자는 Releases에서 Setup을 받거나, 이미 설치한 앱에서 **업데이트 확인**을 사용합니다.

### 로컬에서 Releases에 직접 올리기

[GitHub personal access token](https://github.com/settings/tokens) (`repo` 권한)을 `GH_TOKEN`으로 설정한 뒤:

```powershell
$env:GH_TOKEN = "<token>"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:publish
```

`git remote`와 `package.json`의 `repository`가 같은 저장소를 가리켜야 합니다.

### 자체 서버(generic URL)를 쓰는 경우

`build.publish`를 아래처럼 바꾸고, HTTPS에 `latest.yml`과 Setup exe를 함께 올립니다.

```json
"publish": {
  "provider": "generic",
  "url": "https://example.com/schoolutil-updates/"
}
```

## 아이콘 교체

| 파일 | 용도 |
|------|------|
| `build/icon.png` | 원본(256×256). 수정 후 `npm run icons` |
| `build/icon.ico` | Windows 설치·exe (스크립트가 PNG에서 생성) |
| `public/icon.png` | 트레이·앱 내 (`npm run icons`가 동기화) |

```bash
npm run icons
npm run dist
```

## 데이터 저장 위치

앱 데이터(할 일, 메모, 설정 등)는 **electron-store**로 저장됩니다.

- Windows: `%APPDATA%\SchoolUtil\schoolutil-data.json`

예전 빌드(`schoolutil` 폴더)에만 데이터가 있으면 첫 실행 시 자동으로 옮깁니다.

코드 서명 도구 오류로 `npm run dist`가 실패하면 PowerShell에서 `$env:CSC_IDENTITY_AUTO_DISCOVERY='false'` 를 설정한 뒤 다시 실행하세요.

`appId`(`com.schoolutil.app`)와 store 이름(`schoolutil-data`)을 바꾸지 않으면 재설치 후에도 데이터가 유지됩니다.

## 기능 (0.4.0)

- **학교 검색**: 설정에서 NEIS `schoolInfo` API로 학교 선택 → 교육청·학교 코드 자동 입력
- **데이터 백업**: 저장 시 `%APPDATA%\\SchoolUtil`에 자동 백업 · 설정에서 JSON 보내기/불러오기
- **NEIS API 키**: Windows `safeStorage`로 암호화 저장 (기존 평문은 첫 실행 시 이전)
- **자동 업데이트**: 설치판 `electron-updater` — GitHub Releases(기본) 또는 generic URL · 설정에서 업데이트 확인

## 기능 (0.3.0)

- **위젯 10종**: 시계, 날씨, 급식, 달력, D-Day, 메모, 할 일, 시간표, 학사일정, 설정 — 설정에서 카드 켜기/끄기
- **반응형 배치**: 창 너비에 맞춰 그리드가 늘어납니다
- **위젯 모드**: 설정에서 «위젯 (바탕화면에 얹기)» — 투명 배경, 카드 영역만 클릭, Win32로 바탕화면 아래 배치 시도
- **앞으로 보기**: Ctrl+Alt+D (트레이 더블클릭) · **비상 탈출**: Ctrl+Alt+Shift+D
- **할 일**: 마감일·분류(수업/담임/행정), 미완료 우선 정렬
- **시간표**: 월~금 · 교시별 **수동 입력**, 오늘 요약
- **학사일정**: [나이스 Open API](https://open.neis.go.kr/) `SchoolSchedule` (이번 달 자동 조회)
- 설정: NEIS 키·학교 코드, 테마, 시작 프로그램
- 트레이 · 위젯 드래그 배치

## NEIS API

[나이스 Open API](https://open.neis.go.kr/)에서 키를 발급한 뒤 **설정**에 API Key, 교육청 코드(`ATPT_OFCDC_SC_CODE`), 학교 코드(`SD_SCHUL_CODE`)를 입력하세요. 학교 검색은 [open.neis.go.kr](https://open.neis.go.kr/)에서 학교기본정보 API로 확인할 수 있습니다.

## SmartScreen

서명되지 않은 설치 파일은 Windows SmartScreen 경고가 뜰 수 있습니다. **추가 정보 → 실행**으로 설치할 수 있습니다.
