; SchoolUtil NSIS 확장 — electron-builder `include` (buildResources)
; 설치 완료 화면: «Windows 시작 시 SchoolUtil 자동 실행» 체크 시 플래그 파일 생성.
; 앱 첫 실행 시 electron/installer-pending.ts가 settings.openAtLogin과 동기화합니다.

!macro customFinishPage
  Function SchoolUtilStartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  Function SchoolUtilInstallerOpenAtLogin
    CreateDirectory "$APPDATA\SchoolUtil"
    ClearErrors
    FileOpen $0 "$APPDATA\SchoolUtil\installer-open-at-login.flag" w
    ${If} ${Errors}
      Return
    ${EndIf}
    FileWrite $0 ""
    FileClose $0
  FunctionEnd

  !ifndef HIDE_RUN_AFTER_FINISH
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "SchoolUtilStartApp"
  !endif

  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Windows 시작 시 SchoolUtil 자동 실행"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "SchoolUtilInstallerOpenAtLogin"

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  Delete "$APPDATA\SchoolUtil\installer-open-at-login.flag"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SchoolUtil"
!macroend
