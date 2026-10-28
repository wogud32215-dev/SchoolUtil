param(
  [ValidateSet("probe", "login")]
  [string]$Action = "login"
)

# Brity Messenger — UI Automation (가벼운 트리 탐색)
$ErrorActionPreference = 'Stop'
function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kLogin = U 0xB85C,0xADF8,0xC778 # 로그인
$kCert = U 0xC778,0xC99D,0xC11C # 인증서
$kCertLogin = U 0xC778,0xC99D,0xC11C,0x0020,0xB85C,0xADF8,0xC778 # 인증서 로그인

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$AE = [Windows.Automation.AutomationElement]
$CT = [Windows.Automation.ControlType]
$root = $AE::RootElement
$windows = $root.FindAll(
  [Windows.Automation.TreeScope]::Children,
  [Windows.Automation.Condition]::TrueCondition)

$targetWin = $null
foreach ($win in $windows) {
  try {
    if ($win.Current.IsOffscreen) { continue }
    $title = $win.Current.Name
    if (-not $title) { continue }
    if ($title -notlike '*Brity*' -and $title -notlike '*브리티*') { continue }
    if ($title -like '*SchoolUtil*' -or $title -like '*Cursor*') { continue }
    $targetWin = $win
    break
  } catch { continue }
}

if (-not $targetWin) {
  Write-Output '{"error":"no brity window"}'
  exit 2
}

if ($Action -eq 'probe') {
  Write-Output (@{ found = $true; title = $targetWin.Current.Name } | ConvertTo-Json -Compress)
  exit 0
}

try { $targetWin.SetFocus() } catch { }
Start-Sleep -Milliseconds 150

$certRadioSelected = $false
$radioCond = New-Object Windows.Automation.PropertyCondition(
  $AE::ControlTypeProperty,
  $CT::RadioButton)
$radios = $targetWin.FindAll([Windows.Automation.TreeScope]::Descendants, $radioCond)
foreach ($el in $radios) {
  try {
    $n = $el.Current.Name
    if (-not $n) { continue }
    if ($n -notlike "*$kCert*") { continue }
    $rp = $el.GetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern)
    if (-not $rp.Current.IsSelected) { $rp.Select() }
    $certRadioSelected = $true
    break
  } catch { continue }
}

if (-not $certRadioSelected) {
  $textCond = New-Object Windows.Automation.PropertyCondition(
    $AE::ControlTypeProperty,
    $CT::Text)
  $texts = $targetWin.FindAll([Windows.Automation.TreeScope]::Descendants, $textCond)
  foreach ($el in $texts) {
    try {
      $n = $el.Current.Name
      if (-not $n) { continue }
      $compact = ($n -replace '\s', '')
      if ($compact -ne ($kCertLogin -replace '\s', '') -and $n -notlike "*$kCert*로그인*") { continue }
      $rect = $el.Current.BoundingRectangle
      if ($rect.Width -le 0) { continue }
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point([int]($rect.X + $rect.Width / 2), [int]($rect.Y + $rect.Height / 2))
      Start-Sleep -Milliseconds 80
      [System.Windows.Forms.SendKeys]::SendWait(' ')
      $certRadioSelected = $true
      break
    } catch { continue }
  }
}

$clicked = $false
$loginCond = New-Object Windows.Automation.PropertyCondition(
  $AE::NameProperty,
  $kLogin)
$btn = $targetWin.FindFirst([Windows.Automation.TreeScope]::Descendants, $loginCond)

if ($btn) {
  try {
    $ct = $btn.Current.ControlType.ProgrammaticName
    if ($ct -like '*Button*' -or $ct -like '*Hyperlink*') {
      $ip = $btn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
      $ip.Invoke()
      $clicked = $true
    }
  } catch {
    try {
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
  Write-Output '{"error":"no login button"}'
  exit 3
}

Write-Output (@{
  clicked = $true
  title = $targetWin.Current.Name
  certRadio = $certRadioSelected
} | ConvertTo-Json -Compress)
exit 0
