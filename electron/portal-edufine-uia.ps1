# 에듀파인(Nexacro) «교육행정 전자서명 인증서 로그인» 단추 — UI Automation
$ErrorActionPreference = 'Stop'
function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kEdufine = U 0xC5D0,0xB4,0xC11C,0xD30C,0xC778 # 에듀파인
$kCert = U 0xC778,0xC99D,0xC11C # 인증서
$kLogin = U 0xB85C,0xADF8,0xC778 # 로그인
$kSign = U 0xC804,0xC790,0xC11C,0xBA85 # 전자서명
$kEdu = U 0xAD50,0xC721,0xD589,0xC815 # 교육행정

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$AE = [Windows.Automation.AutomationElement]
$root = $AE::RootElement
$windows = $root.FindAll(
  [Windows.Automation.TreeScope]::Children,
  [Windows.Automation.Condition]::TrueCondition)

function NameMatchesCertLogin([string]$n) {
  if (-not $n) { return $false }
  $t = ($n -replace '\s', '')
  if ($t -like "*$kCert*$kLogin*") { return $true }
  if ($t -like "*$kSign*$kCert*") { return $true }
  if ($t -like "*$kEdu*$kCert*") { return $true }
  return $false
}

$targetWin = $null
foreach ($win in $windows) {
  try {
    if ($win.Current.IsOffscreen) { continue }
    $title = $win.Current.Name
    if (-not $title) { continue }
    if ($title -notlike "*$kEdufine*" -and $title -notlike '*K-*' -and $title -notlike '*klef*') { continue }
    if ($title -like '*SchoolUtil*' -or $title -like '*Cursor*') { continue }
    $targetWin = $win
    break
  } catch { continue }
}

if (-not $targetWin) {
  foreach ($win in $windows) {
    try {
      if ($win.Current.IsOffscreen) { continue }
      $title = $win.Current.Name
      if (-not $title) { continue }
      if ($title -notlike '*Chrome*' -and $title -notlike '*Edge*') { continue }
      if ($title -notlike "*$kEdufine*" -and $title -notlike '*로그인*') { continue }
      $targetWin = $win
      break
    } catch { continue }
  }
}

if (-not $targetWin) {
  Write-Output '{"error":"no edufine window"}'
  exit 2
}

$clicked = $false
$btn = $null
$desc = $targetWin.FindAll(
  [Windows.Automation.TreeScope]::Descendants,
  [Windows.Automation.Condition]::TrueCondition)
foreach ($el in $desc) {
  try {
    $n = $el.Current.Name
    if (-not (NameMatchesCertLogin $n)) { continue }
    $ct = $el.Current.ControlType.ProgrammaticName
    if ($ct -notlike '*Button*' -and $ct -notlike '*Hyperlink*' -and $ct -notlike '*Text*') { continue }
    $btn = $el
    break
  } catch { continue }
}

if ($btn) {
  try {
    $ip = $btn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
    $ip.Invoke()
    $clicked = $true
  } catch {
    try {
      $targetWin.SetFocus()
      Start-Sleep -Milliseconds 200
      $rect = $btn.Current.BoundingRectangle
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]($rect.X + $rect.Width / 2), [int]($rect.Y + $rect.Height / 2))
      Start-Sleep -Milliseconds 80
      [System.Windows.Forms.SendKeys]::SendWait(' ')
      $clicked = $true
    } catch { }
  }
}

if (-not $clicked) {
  Write-Output '{"error":"no cert login button"}'
  exit 3
}

Write-Output (@{ clicked = $true; title = $targetWin.Current.Name } | ConvertTo-Json -Compress)
exit 0
