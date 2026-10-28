# «교육행정 전자서명 인증서 로그인» 단추 (Brity 로그인 후 새 창)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kCert = U 0xC778,0xC99D,0xC11C
$kLogin = U 0xB85C,0xADF8,0xC778
$kSign = U 0xC804,0xC790,0xC11C,0xBA85
$kEdu = U 0xAD50,0xC721,0xD589,0xC815

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
$AE = [Windows.Automation.AutomationElement]
$CT = [Windows.Automation.ControlType]
$root = $AE::RootElement
$windows = $root.FindAll(
  [Windows.Automation.TreeScope]::Children,
  [Windows.Automation.Condition]::TrueCondition)

function NameMatchesGovCertLogin([string]$n) {
  if (-not $n) { return $false }
  $t = ($n -replace '\s', '')
  if ($t -notlike "*$kEdu*") { return $false }
  return ($t -like "*$kCert*$kLogin*") -or ($t -like "*$kSign*$kCert*")
}

function ShouldSkipWindowTitle([string]$title) {
  if (-not $title) { return $false }
  if ($title -like '*SchoolUtil*' -or $title -like '*Cursor*') { return $true }
  if ($title -like '*Chrome*' -or $title -like '*Edge*' -or $title -like '*Whale*') { return $true }
  if ($title -eq 'Log in' -or $title -like 'Log in *') { return $true }
  if ($title -like '*Brity Messenger*') { return $true }
  return $false
}

$ordered = New-Object System.Collections.ArrayList
foreach ($win in $windows) {
  try {
    if ($win.Current.IsOffscreen) { continue }
    $title = $win.Current.Name
    if (ShouldSkipWindowTitle $title) { continue }
    [void]$ordered.Add($win)
  } catch { continue }
}

$clicked = $false
$btnName = ''
$winTitle = ''

foreach ($targetWin in $ordered) {
  try { $targetWin.SetFocus() } catch { }
  $desc = $targetWin.FindAll(
    [Windows.Automation.TreeScope]::Descendants,
    [Windows.Automation.Condition]::TrueCondition)
  $n = 0
  foreach ($el in $desc) {
    if ($n++ -gt 500) { break }
    try {
      $name = $el.Current.Name
      if (-not (NameMatchesGovCertLogin $name)) { continue }
      $ct = $el.Current.ControlType.ProgrammaticName
      if ($ct -notlike '*Button*' -and $ct -notlike '*Hyperlink*' -and $ct -notlike '*Text*') { continue }
      $btn = $el
      $btnName = $name
      try { $winTitle = $targetWin.Current.Name } catch { $winTitle = '' }
      try {
        $ip = $btn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
        $ip.Invoke()
        $clicked = $true
        break
      } catch {
        try {
          $rect = $btn.Current.BoundingRectangle
          [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]($rect.X + $rect.Width / 2), [int]($rect.Y + $rect.Height / 2))
          Start-Sleep -Milliseconds 100
          [System.Windows.Forms.SendKeys]::SendWait(' ')
          $clicked = $true
          break
        } catch { }
      }
    } catch { continue }
  }
  if ($clicked) { break }
}

if (-not $clicked) {
  Write-Output '{"error":"no gov cert login button"}'
  exit 3
}

Write-Output (@{
  clicked = $true
  button = $btnName
  title = $winTitle
} | ConvertTo-Json -Compress)
exit 0
