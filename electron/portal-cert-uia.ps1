# SCHOOLUTIL_CERT_PASSWORD 환경 변수 필요.
# Windows PowerShell 5.1은 BOM 없는 스크립트를 ANSI로 읽으므로 한글 리터럴 대신 문자 코드로 만든다.
$ErrorActionPreference = 'Stop'
$pass = $env:SCHOOLUTIL_CERT_PASSWORD
if (-not $pass) {
  Write-Output '{"error":"no password"}'
  exit 1
}
function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kCert = U 0xC778,0xC99D,0xC11C        # 인증서
$kPw = U 0xC554,0xD638                 # 암호
$kSign = U 0xC804,0xC790,0xC11C,0xBA85 # 전자서명
$kOk = U 0xD655,0xC778                 # 확인

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
$AE = [Windows.Automation.AutomationElement]
$root = $AE::RootElement
$windows = $root.FindAll(
  [Windows.Automation.TreeScope]::Children,
  [Windows.Automation.Condition]::TrueCondition)

$skip = @('Chrome', 'Edge', 'Whale', 'SchoolUtil', 'Cursor', 'Visual Studio')
$targetWindow = $null
foreach ($win in $windows) {
  try {
    if ($win.Current.IsOffscreen) { continue }
    $title = $win.Current.Name
    if ($title -and ($skip | Where-Object { $title -like "*$_*" })) { continue }
  } catch { continue }
  $desc = $win.FindAll(
    [Windows.Automation.TreeScope]::Descendants,
    [Windows.Automation.Condition]::TrueCondition)
  $names = @($title)
  foreach ($el in $desc) {
    try { if ($el.Current.Name) { $names += $el.Current.Name } } catch { }
  }
  $blob = $names -join ' '
  if (($blob -like "*$kCert*$kPw*") -or ($blob -like '*K-SIGN*') -or ($blob -like "*$kSign*")) {
    $targetWindow = $win
    break
  }
}
if (-not $targetWindow) {
  Write-Output '{"error":"no cert window"}'
  exit 2
}
$hwnd = $targetWindow.Current.NativeWindowHandle

$editCond = New-Object Windows.Automation.PropertyCondition(
  $AE::ControlTypeProperty,
  [Windows.Automation.ControlType]::Edit)
$edits = @($targetWindow.FindAll([Windows.Automation.TreeScope]::Descendants, $editCond))
$edit = $edits | Where-Object { try { $_.Current.IsPassword } catch { $false } } | Select-Object -First 1
if (-not $edit -and $edits.Count -gt 0) { $edit = $edits[$edits.Count - 1] }

try { $targetWindow.SetFocus() } catch { }
Start-Sleep -Milliseconds 200

$filled = $false
if ($edit) {
  try {
    $edit.SetFocus()
    Start-Sleep -Milliseconds 200
    # 보안 입력 칸은 ValuePattern이 무시되는 경우가 많아 실제 키 입력을 우선한다.
    [System.Windows.Forms.SendKeys]::SendWait('^a{BACKSPACE}')
    $escaped = [regex]::Replace($pass, '[+^%~(){}\[\]]', { param($m) '{' + $m.Value + '}' })
    [System.Windows.Forms.SendKeys]::SendWait($escaped)
    $filled = $true
  } catch { }
  if (-not $filled) {
    try {
      $vp = $edit.GetCurrentPattern([Windows.Automation.ValuePattern]::Pattern)
      $vp.SetValue($pass)
      $filled = $true
    } catch { }
  }
}
if (-not $filled) {
  Write-Output (@{ hwnd = [int]$hwnd; filled = $false } | ConvertTo-Json -Compress)
  exit 0
}

Start-Sleep -Milliseconds 300
$clicked = $false
try {
  $okCond = New-Object Windows.Automation.PropertyCondition($AE::NameProperty, $kOk)
  $okBtn = $targetWindow.FindFirst([Windows.Automation.TreeScope]::Descendants, $okCond)
  if ($okBtn) {
    $ip = $okBtn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
    $ip.Invoke()
    $clicked = $true
  }
} catch { }
if (-not $clicked) {
  try { $edit.SetFocus() } catch { }
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}

Write-Output (@{ hwnd = [int]$hwnd; filled = $filled; clicked = $clicked } | ConvertTo-Json -Compress)
exit 0
