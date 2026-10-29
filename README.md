# SchoolUtil

Windows용 설치형 바탕화면 종합 유틸 (Electron + React + Vite). **버전 1.0.1**

## 다운로드 (설치)

최신 설치 파일: **[GitHub Releases — latest](https://github.com/wogud32215-dev/SchoolUtil/releases/latest)**  
파일 이름 예: `SchoolUtil-Setup-1.0.1.exe`

설치 후 **설정**(하단 톱니바퀴)에서 «데이터 백업 · 업데이트»를 볼 수 있습니다. 새 버전은 **설정을 열지 않아도** 상단 배너로 안내되며, 필요할 때 «업데이트 확인»으로 수동 확인도 할 수 있습니다.

### 사용 설명서

설치 폴더의 **`docs`** 에 초기 설정 안내가 포함됩니다.

| 파일 | 용도 |
|------|------|
| `docs/사용설명서.html` | 더블 클릭으로 브라우저에서 보기 (권장) |
| `docs/사용설명서.md` | Markdown 원본 |
| `docs/assets/설정-예시.jpg` | 이천제일고 연동 예시 화면 |
| `docs/assets/스마트앱컨트롤-*.png` | 설치 전 스마트 앱 컨트롤 끄기 안내 |

저장소 사본: [`docs/사용설명서.md`](docs/사용설명서.md)

## Git

원격 저장소: [github.com/wogud32215-dev/SchoolUtil](https://github.com/wogud32215-dev/SchoolUtil)

소스만 Git으로 관리합니다. `dist`, `dist-electron`, `release`, `node_modules`는 커밋하지 않습니다.

```bash
git remote add origin https://github.com/wogud32215-dev/SchoolUtil.git
git push -u origin main
```

## 개발 환경

- **Node.js**: 20.x 또는 22.x LTS 권장 (24.x에서도 동작하도록 Windows 런처를 쓰지만, LTS가 안전합니다).
- **실행 창**: `npm run dev`는 **Electron 앱 창**이 떠야 합니다. 브라우저에서 `http://localhost:5173`만 열면 저장·NEIS·날씨 IPC가 동작하지 않습니다.
- **프로젝트 경로**: 폴더 이름에 **공백·한글**이 있어도 dev는 [`electron/launch-dev.ts`](electron/launch-dev.ts)가 단축 경로·cmd 배치로 Electron을 띄웁니다.

### Electron 바이너리가 없을 때 (`spawn UNKNOWN` 등)

`npm install` 직후 `node_modules/electron/dist/electron.exe`가 없으면 Vite는 뜨지만 Electron이 안 열립니다.

1. 수동 설치:
   ```bash
   npm run electron:install
   ```
2. **npm 11**에서 install 스크립트가 막혀 있으면:
   ```bash
   npm install-scripts approve electron
   npm rebuild electron
   ```
3. 확인:
   ```powershell
   node -e "console.log(require('electron'))"
   Test-Path node_modules\electron\dist\electron.exe
   ```
   PowerShell에서 직접 실행할 때는 **경로를 한 줄에 넣지 말고** 변수에 담으세요 (한글 경로 깨짐 방지):
   ```powershell
   $exe = node -p "require('electron')"
   Start-Process -FilePath $exe -ArgumentList '.','--no-sandbox' -WorkingDirectory (Get-Location)
   ```
   `Start-Process`가 **애플리케이션 제어 정책**으로 막히면 `Start-Process` 대신 `npm run dev` 또는 아래 unblock을 쓰세요.

4. **경로에 공백·한글이 있는데 `spawn UNKNOWN`이면** — 최신 코드로 `npm run dev`를 다시 실행하세요.

5. **보안 정책으로 `electron.exe` 차단** — 콘솔에 `blocked by your organization's Device Guard policy`가 보이면 **학교·기관 WDAC**입니다. `npm run electron:unblock`이나 경로 이동으로는 해결되지 않으며, IT에 개발 도구 예외를 요청하거나 **정책이 없는 개인 PC**에서 `npm run dev`를 실행해야 합니다. 개인 PC에서는 Smart App Control·백신 예외(`node_modules\electron\dist`)를 검토하세요. `npm run dist:dir`로 만든 `SchoolUtil.exe`도 **서명 없으면** 같은 정책에 막힐 수 있습니다.

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

`release/` 폴더에 NSIS 설치 프로그램(예: `SchoolUtil-Setup-1.0.1.exe`)과 자동 업데이트용 `latest.yml`이 생성됩니다.

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

### publish 설정 (현재)

`package.json` → `build.publish`:

| 항목 | 값 |
|------|-----|
| provider | `github` |
| owner / repo | `wogud32215-dev` / `SchoolUtil` |
| releaseType | `release` |

설치 파일을 **빌드할 때** exe 안에 `app-update.yml`이 들어가고, 앱은 GitHub Releases의 **`latest.yml`**(및 Setup exe)을 참조합니다. Releases에 올라가는 자산 예:

- `SchoolUtil-Setup-<version>.exe`
- `latest.yml` — `electron-updater`가 버전 비교에 사용

### 새 버전 올리기 (유지보수자)

1. `package.json`의 **`version`**만 올립니다 (README 상단 버전 문구도 맞춥니다).
2. 변경을 커밋한 뒤 `main`에 푸시합니다.
3. **태그 = `v` + version** (Release 워크플로가 `package.json`과 일치하는지 검사합니다).

```bash
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

4. [Actions → Release](https://github.com/wogud32215-dev/SchoolUtil/actions)가 성공하면 [Releases](https://github.com/wogud32215-dev/SchoolUtil/releases)에 설치 파일이 생깁니다.

**릴리스 = 사용자 알림:** 설치판 앱은 실행 후 약 8초 뒤·12시간마다·절전 복귀 시 GitHub에서 새 버전을 확인합니다. 새 버전이 있으면 **화면 상단 배너**와 (창이 가려져 있으면) **Windows 알림**으로 안내하며, «지금 받기»로 Setup을 내려받아 재시작 설치할 수 있습니다. 별도 푸시 서버는 없습니다.

### 사용자에게 GitHub 설치 1회 안내 (배포자)

| 상황 | 안내 |
|------|------|
| **앞으로 (권장)** | [Releases — latest](https://github.com/wogud32215-dev/SchoolUtil/releases/latest)의 **Setup exe**로 한 번 설치 → 이후는 앱이 자동으로 업데이트합니다. |
| **예전 USB·직접 전달 빌드** | GitHub `publish`가 없거나 구버전 설치 파일이면 자동 업데이트가 동작하지 않을 수 있습니다. Releases Setup으로 **한 번 덮어쓰기 설치**하면 `%APPDATA%\SchoolUtil` 데이터는 유지된 채 자동 업데이트 경로로 전환됩니다. |

로컬에서만 올릴 때: [PAT](https://github.com/settings/tokens) (`repo`)를 `GH_TOKEN`으로 두고 `npm run dist:publish` (서명 없을 때 `CSC_IDENTITY_AUTO_DISCOVERY=false`).

### 설치 · 덮어쓰기 · 업데이트 확인 (검증 절차)

| 단계 | 확인 내용 |
|------|-----------|
| **신규 설치** | Releases의 Setup exe 실행 → 설정에 «설치 버전 1.0.1» 표시 |
| **덮어쓰기** | 같은 `appId`로 새 Setup을 다시 실행 → `%APPDATA%\SchoolUtil\schoolutil-data.json` 유지 |
| **업데이트 없음** | 설치판에서 **업데이트 확인** → «현재 최신 버전입니다.» |
| **업데이트 있음** | 더 높은 버전을 Releases에 올린 뒤 **업데이트 확인** → 다운로드·재시작 안내 |

업데이트 경로를 테스트하려면: PC에 **1.0.0** 설치 → 저장소에서 **1.0.1** 릴리스 후 앱에서 업데이트 확인.

개발 모드(`npm run dev`)에서는 업데이트 확인이 거부됩니다 (설치판만 해당).

### generic URL로 바꿀 때

`build.publish`를 아래처럼 바꾸고, HTTPS 폴더에 **`latest.yml`과 Setup exe를 같은 경로**에 올립니다.

```json
"publish": {
  "provider": "generic",
  "url": "https://example.com/schoolutil-updates/"
}
```

변경 후 **반드시 다시 `dist`로 설치 파일을 빌드**해야 exe 안의 업데이트 주소가 바뀝니다.

## 아이콘 교체

| 파일 | 용도 |
|------|------|
| `build/icon.png` | 원본(256×256). 수정 후 `npm run icons` |
| `build/icon-source.png` | 있으면 이 PNG를 256으로 리사이즈해 아이콘 생성 (임시·교체용) |
| `build/icon.ico` | Windows 설치·exe (스크립트가 PNG에서 생성) |
| `public/icon.png` | 창·앱 내 (`npm run icons`가 동기화) |
| `public/tray-icon.png` | 트레이 16px용 단순 아이콘 (`npm run icons`가 생성) |

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

## 변경 (1.0.1)

- **메모**: 쪽지 높이가 글자 수에 맞춰 아래로 자동 늘어남
- **위젯 모드**: Ctrl+Alt+D 전역 단축키 등록이 풀렸을 때 자동 복구·한글 키보드 보강
- **Brity·업무포털 UIA**: 설치본에 PowerShell 스크립트 포함 (`asarUnpack`), dev와 동일하게 자동 로그인 시도

## 기능 (1.0.0)

### 대시보드 · UI

- **위젯**: 시계, 날씨, 급식, 달력, D-Day, 메모, 할 일, 시간표, 학사일정, 업무포털 — 설정에서 카드 켜기/끄기 (설정 UI는 그리드가 아니라 **하단 독·모달**)
- **반응형 배치** · 드래그로 위치 조정 · 레이아웃 프리셋(벤토, 클래식, 달력/시간표 중심, 간결, 와이드)
- **테마·글꼴·밀도·카드 투명도** · 시작 프로그램 등록
- **«제일 메이트»**: 실행 시 하루 한 번 오늘 할 일·시간표·급식 등 요약 모달 (설정에서 on/off)

### 창 · 트레이 · 위젯 모드

- **일반 창** / **위젯 모드**(바탕화면에 얹기): 투명 배경, 카드 영역만 클릭, Win32로 바탕화면 아래 배치 시도 (Win+D와 완전 동기는 아님)
- **앞으로 보기**: Ctrl+Alt+D (트레이 더블클릭) · **비상 탈출**: Ctrl+Alt+Shift+D
- 창 닫기 → **트레이** 유지, 트레이 «종료»로만 완전 종료

### 할 일 · 메모 · 달력 · 시간표

- **할 일**: 마감일·분류(수업/담임/행정 등), 미완료 우선 정렬
- **메모** · **D-Day** · **달력 일정**
- **시간표**: 월~금 교시별 수동 입력, 오늘 요약
- **컴시간 연동**(설정에서 켜기): 교체 수업 반영 시간표 · 수동 칸 보정 (학교·환경에 따라 동작)

### NEIS · 날씨

- **학교 검색**: NEIS `schoolInfo`로 학교 선택 → 교육청·학교 코드 자동 입력
- **학사일정** · **급식**: [나이스 Open API](https://open.neis.go.kr/) (이번 달·오늘)
- **NEIS API 키**: Windows `safeStorage` 암호화 (평문 JSON은 첫 실행 시 이전). 빌드 시 `config/neis-shared.key`를 넣으면 설치본에 **공용 키** 포함 가능 (GitHub Actions 기본 빌드에는 없음)
- **날씨**: Open-Meteo (기본 서울, 설정에서 좌표·라벨)

### 데이터 · 업데이트

- **저장**: `%APPDATA%\SchoolUtil\schoolutil-data.json` · 저장 시 자동 백업
- **JSON 보내기/불러오기** (구버전·필드 누락 데이터도 느슨하게 복원)
- **자동 업데이트**: 설치판 `electron-updater` — GitHub Releases(기본) · 설정에서 업데이트 확인

### 업무포털 · Brity (고급)

- **업무포털**: 나이스·에듀파인·교육청 업무포털 — 기본 **URL만 열기**; 설정 «자동 로그인 시도»는 Chrome/Edge CDP **POC** (인증서 OS 입력은 실험·opt-in). `portal.log`·마지막 실행 결과
- **자격 증명**: `safeStorage`·`schoolutil-secrets.json`만 (데이터·백업 JSON에는 없음)
- **Brity 메신저**(설정에서 켜기): exe 경로·인증서 라벨 등 opt-in

## NEIS API

[나이스 Open API](https://open.neis.go.kr/)에서 키를 발급한 뒤 **설정**에 API Key, 교육청 코드(`ATPT_OFCDC_SC_CODE`), 학교 코드(`SD_SCHUL_CODE`)를 입력하세요. 학교 검색은 [open.neis.go.kr](https://open.neis.go.kr/)에서 학교기본정보 API로 확인할 수 있습니다.

## SmartScreen

서명되지 않은 설치 파일은 Windows SmartScreen 경고가 뜰 수 있습니다. **추가 정보 → 실행**으로 설치할 수 있습니다.

## 배포 전 확인

릴리스 태그·Setup exe를 올리기 전에, **설치판**(`npm run dist` → `release/win-unpacked` 또는 Setup exe)으로 아래를 순서대로 점검합니다. 개발 모드(`npm run dev`)만으로는 저장·암호화·자동 업데이트가 완전히 같지 않습니다.

### 빌드

| 항목 | 확인 |
|------|------|
| 타입·빌드 | `npm run typecheck` → `npm run build` (또는 `npm run dist:dir`) 성공 |
| 버전 | `package.json` `version` = README 상단 = 태그 `v…` 예정 버전 |
| 잠금 | SchoolUtil·dev Electron 종료 후 패키징 (`release` EBUSY 방지) |

### 데이터·호환

| 항목 | 확인 |
|------|------|
| 신규 설치 | 할 일·설정 저장 후 `%APPDATA%\SchoolUtil\schoolutil-data.json` 생성 |
| 덮어쓰기 설치 | 기존 `schoolutil-data.json`·위젯 배치 유지 |
| 구버전 JSON | `memos`/`ddays` 없는 예전 `schoolutil-data.json` 또는 백업 JSON을 **설정 → 불러오기**로 복원 (필드 없으면 빈 배열·기본 시간표로 채움) |
| 레거시 경로 | `%APPDATA%\schoolutil\` 에만 데이터 있을 때 첫 실행 시 `SchoolUtil`로 복사 |
| 자동 백업 | 저장 후 `schoolutil-data.backup.json`, `schoolutil-data.day-YYYY-MM-DD.json` 생성 |

### NEIS · 급식 · 날씨

| 항목 | 확인 |
|------|------|
| API 키 | 설정에 키 저장 → 디스크 JSON의 `neisApiKey`는 비어 있고 `schoolutil-secrets.json`에 암호화 |
| 업무포털 비밀번호 | `schoolutil-secrets.json`만 (백업 JSON·`schoolutil-data.json`에 없음) |
| 키 삭제 | API 키 칸 비우고 저장 → 급식·학사일정이 «키 없음» 안내로 동작 |
| 평문 이전 | 예전 JSON에 평문 `neisApiKey`만 있을 때 첫 실행 후 secrets로 이전·JSON에서 제거 |
| 학교 검색 | 설정에서 학교 검색 → 교육청·학교 코드·학교명 반영 |
| 학사일정 | 코드·키 입력 후 이번 달 일정 로드 (키 오류 시 NEIS 메시지) |
| 급식 | 오늘 급식 표시 또는 휴일·데이터 없음 안내 |
| 날씨 | 기본(서울) 또는 설정 좌표로 온도·코드 표시 |

### 백업 · 가져오기

| 항목 | 확인 |
|------|------|
| 보내기 | JSON에 `state` 래퍼·버전 필드 포함, 할 일·설정 포함 |
| 불러오기 | 확인 후 덮어쓰기·화면 reload, 직전 상태는 자동 백업에 남음 |
| 키 포함 백업 | 보낸 JSON에 API 키가 있을 수 있음 — 파일 보관 주의 |

### 앱 동작 · 업데이트

| 항목 | 확인 |
|------|------|
| 트레이 | 창 닫기 → 트레이 유지, 트레이 «종료»로만 완전 종료 |
| 위젯 모드 | 바탕화면 모드·Ctrl+Alt+D·비상 Ctrl+Alt+Shift+D |
| 업데이트 확인 | 설치판에서 «현재 최신» 또는 새 버전 다운로드 안내 (dev에서는 거부) |
| SmartScreen | 미서명 exe 시 «추가 정보 → 실행» 안내 유지 |
