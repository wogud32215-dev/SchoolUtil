# «교육행정 전자서명 인증서 로그인» 단추 — UI Automation
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$anyWindow = $env:SCHOOLUTIL_ANY_WINDOW -eq '1'

function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kEdufine = U 0xC5D0,0xB4,0xC11C,0xD30C,0xC778
$kCert = U 0xC778,0xC99D,0xC11C
$kLogin = U 0xB85C,0xADF8,0xC778
$kSign = U 0xC804,0xC790,0xC11C,0xBA85
$kEdu = U 0xAD50,0xC721,0xD589,0xC815

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System.Runtime.InteropServices;
public class SuMouse {
  public const int LEFTDOWN = 0x02;
  public const int LEFTUP = 0x04;
  [DllImport("user32.dll")]
  public static extern void mouse_event(int dwFlags, int dx, int dy, int cData, int dwExtraInfo);
}
'@
$AE = [Windows.Automation.AutomationElement]
$root = $AE::RootElement
$windows = $root.FindAll(
  [Windows.Automation.TreeScope]::Children,
  [Windows.Automation.Condition]::TrueCondition)

function NameMatchesCertLogin([string]$n) {
  if (-not $n) { return $false }
  if ($n -like '*사용자*등록*') { return $false }
  if ($n -like '*인증서*변경*' -or $n -like '*인증서*백업*') { return $false }
  if ($n -like '*인증센터*' -and $n -notlike '*교육행정*') { return $false }
  $t = ($n -replace '\s', '')
  if ($t.Length -lt 10) { return $false }
  if ($t -like "*$kEdu*$kCert*") { return $true }
  if ($t -like "*$kEdu*$kSign*") { return $true }
  if ($t -like "*$kSign*$kCert*$kLogin*") { return $true }
  if ($t -like "*$kCert*$kLogin*" -and $t -like "*$kEdu*") { return $true }
  return $false
}

function Score-CertLoginName([string]$n) {
  if (-not (NameMatchesCertLogin $n)) { return -1 }
  $score = $n.Length
  if ($n -like "*$kEdu*") { $score += 120 }
  if ($n -like "*$kSign*") { $score += 40 }
  return $score
}

function Click-MouseAt([int]$x, [int]$y) {
  [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
  Start-Sleep -Milliseconds 70
  [SuMouse]::mouse_event([SuMouse]::LEFTDOWN, 0, 0, 0, 0)
  Start-Sleep -Milliseconds 40
  [SuMouse]::mouse_event([SuMouse]::LEFTUP, 0, 0, 0, 0)
}

function Invoke-CertLoginClick($targetWin, $btn) {
  try { $targetWin.SetFocus() } catch { }
  Start-Sleep -Milliseconds 180
  try {
    $ip = $btn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
    $ip.Invoke()
  } catch { }
  try {
    $rect = $btn.Current.BoundingRectangle
    if ($rect.Width -le 2 -or $rect.Height -le 2) { return $false }
    $x = [int]($rect.X + $rect.Width / 2)
    $y = [int]($rect.Y + $rect.Height / 2)
    Click-MouseAt $x $y
    Start-Sleep -Milliseconds 220
    Click-MouseAt $x $y
    return $true
  } catch { }
  return $false
}

function Window-Priority([string]$title) {
  if ($title -like '*Log in*' -or $title -like '*로그인*') { return 300 }
  if ($title -like '*Brity*') { return 200 }
  if ($title -like "*$kEdufine*") { return 150 }
  return 0
}

function Should-SkipScanWindow([string]$title) {
  if ($title -like '*SchoolUtil*' -or $title -like '*Cursor*') { return $true }
  if ($title -like '*Chrome*' -or $title -like '*Edge*' -or $title -like '*Whale*') {
    return $true
  }
  return $false
}

function Find-BestCertLoginButton() {
  $bestBtn = $null
  $bestWin = $null
  $bestScore = -1
  $bestName = ''
  $ordered = @($windows | Sort-Object {
    try { -Window-Priority($_.Current.Name) } catch { 0 }
  } -Descending)
  foreach ($win in $ordered) {
    try {
      if ($win.Current.IsOffscreen) { continue }
      $title = $win.Current.Name
      if (Should-SkipScanWindow $title) { continue }
      $winBoost = Window-Priority $title
      $desc = $win.FindAll(
        [Windows.Automation.TreeScope]::Descendants,
        [Windows.Automation.Condition]::TrueCondition)
      $n = 0
      foreach ($el in $desc) {
        if ($n++ -gt 500) { break }
        try {
          $name = $el.Current.Name
          $score = Score-CertLoginName $name
          if ($score -lt 0) { continue }
          $ct = $el.Current.ControlType.ProgrammaticName
          if ($ct -notlike '*Button*' -and $ct -notlike '*Hyperlink*' -and $ct -notlike '*Text*') {
            continue
          }
          $score += $winBoost
          if ($score -gt $bestScore) {
            $bestScore = $score
            $bestBtn = $el
            $bestWin = $win
            $bestName = $name
          }
        } catch { continue }
      }
    } catch { continue }
  }
  return @{ btn = $bestBtn; win = $bestWin; name = $bestName }
}

if ($anyWindow) {
  $found = Find-BestCertLoginButton
  if (-not $found.btn) {
    Write-Output '{"error":"no cert login button"}'
    exit 3
  }
  if (-not (Invoke-CertLoginClick $found.win $found.btn)) {
    Write-Output '{"error":"click failed"}'
    exit 4
  }
  $t = ''
  try { $t = $found.win.Current.Name } catch { }
  $bn = ''
  try { $bn = $found.name } catch { }
  Write-Output (@{ clicked = $true; title = $t; buttonName = $bn } | ConvertTo-Json -Compress)
  exit 0
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
  $clicked = Invoke-CertLoginClick $targetWin $btn
}

if (-not $clicked) {
  Write-Output '{"error":"no cert login button"}'
  exit 3
}

Write-Output (@{ clicked = $true; title = $targetWin.Current.Name } | ConvertTo-Json -Compress)
exit 0
