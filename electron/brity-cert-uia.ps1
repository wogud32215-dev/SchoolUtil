# K-SIGN 등 — 인증서 행 선택 후 암호 입력
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$pass = $env:SCHOOLUTIL_CERT_PASSWORD
$certLabel = $env:SCHOOLUTIL_CERT_LABEL
if (-not $pass) {
  Write-Output '{"error":"no password"}'
  exit 1
}

function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
$kCert = U 0xC778,0xC99D,0xC11C
$kPw = U 0xC554,0xD638
$kOk = U 0xD655,0xC778

Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
$AE = [Windows.Automation.AutomationElement]
$CT = [Windows.Automation.ControlType]
$root = $AE::RootElement
$editCond = New-Object Windows.Automation.PropertyCondition(
  $AE::ControlTypeProperty,
  $CT::Edit)

function Test-IsBlockedCertRowName([string]$name) {
  if (-not $name) { return $true }
  if ($name -like '*사용자*등록*') { return $true }
  if ($name -like '*인증센터*' -and $name -notmatch '\d{4}-\d{2}-\d{2}') { return $true }
  if ($name -like '*인증서*변경*' -or $name -like '*인증서*백업*') { return $true }
  if ($name -like '*교육행정*' -and $name -like '*로그인*') { return $true }
  return $false
}

function Test-IsCertRowName([string]$name) {
  if (Test-IsBlockedCertRowName $name) { return $false }
  if ($name -match '\d{4}-\d{2}-\d{2}') { return $true }
  if ($name -like '*/*') { return $true }
  if ($name -like '*일반인증서*') { return $true }
  return $false
}

function Test-WindowHasCertPickerDescendant($win, [int]$maxNodes = 240) {
  try {
    $walker = [Windows.Automation.TreeWalker]::RawViewWalker
    $queue = New-Object System.Collections.Generic.Queue[object]
    $queue.Enqueue($win)
    $n = 0
    while ($queue.Count -gt 0 -and $n -lt $maxNodes) {
      $node = $queue.Dequeue()
      $n++
      $name = ''
      try { $name = $node.Current.Name } catch { }
      if ($name -like '*K-SIGN*' -or $name -like '*K-Sign*' -or $name -like '*인증서 위치*') {
        return $true
      }
      if ($name -like "*$kPw*" -and $name -notlike '*로그인*') { return $true }
      if (Test-IsCertRowName $name) { return $true }
      try {
        if ($node.Current.IsPassword) { return $true }
      } catch { }
      $child = $walker.GetFirstChild($node)
      while ($child) {
        $queue.Enqueue($child)
        $child = $walker.GetNextSibling($child)
      }
    }
  } catch { }
  return $false
}

function Test-HasCertPickerUi($win) {
  $title = ''
  try { $title = $win.Current.Name } catch { }
  if ($title -like '*K-SIGN*' -or $title -like '*K-Sign*') { return $true }
  if ($title -like '*TouchEn*' -or $title -like '*교육기관*') { return $true }
  if (Test-KSignShallow $win) { return $true }
  if ($title -like '*Log in*' -or $title -like '*로그인*' -or $title -like '*인증서*') {
    if (Test-WindowHasCertPickerDescendant $win) { return $true }
  }
  $edits = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $editCond))
  foreach ($e in $edits) {
    try {
      if ($e.Current.IsPassword) { return $true }
      $ename = $e.Current.Name
      if ($ename -like "*$kPw*") { return $true }
    } catch { continue }
  }
  $listOr = New-Object Windows.Automation.OrCondition(
    (New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::ListItem)),
    (New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::DataItem)))
  $items = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $listOr))
  $n = 0
  foreach ($item in $items) {
    if ($n++ -gt 40) { break }
    $name = ''
    try { $name = $item.Current.Name } catch { continue }
    if (Test-IsCertRowName $name) { return $true }
  }
  return $false
}

function Should-SkipTopWindow([string]$title) {
  if (-not $title) { return $false }
  $skip = @(
    '*SchoolUtil*', '*Cursor*', '*Brity Messenger*',
    '*Chrome*', '*Edge*', '*Whale*', '*Firefox*',
    '*Program Manager*', '*작업 표시줄*', '*Taskbar*',
    '*Visual Studio*', '*Discord*', '*카카오*', '*Kakao*',
    '*Windows 입력*', '*Settings*', '*설정*'
  )
  foreach ($pat in $skip) {
    if ($title -like $pat) { return $true }
  }
  return $false
}

function Test-KSignShallow($win) {
  try {
    $kids = $win.FindAll(
      [Windows.Automation.TreeScope]::Children,
      [Windows.Automation.Condition]::TrueCondition)
    $n = 0
    foreach ($el in $kids) {
      if ($n++ -gt 40) { break }
      $name = ''
      try { $name = $el.Current.Name } catch { continue }
      if ($name -like '*K-SIGN*' -or $name -like '*인증서 위치*' -or $name -like "*$kPw*") {
        return $true
      }
    }
  } catch { }
  return $false
}

function Get-CertDialogWindows() {
  $list = New-Object System.Collections.ArrayList
  foreach ($w in $root.FindAll(
    [Windows.Automation.TreeScope]::Children,
    [Windows.Automation.Condition]::TrueCondition)) {
    try {
      if ($w.Current.IsOffscreen) { continue }
      $t = $w.Current.Name
      if (Should-SkipTopWindow $t) { continue }
      if (Test-HasCertPickerUi $w) { [void]$list.Add($w) }
    } catch { continue }
  }
  foreach ($p in Get-Process -ErrorAction SilentlyContinue) {
    if ($p.ProcessName -notmatch 'KSign|ksign|SignKorea|TouchEn|crosscert|CrossEX|UniSign|SignGATE|INISafe|MagicLine|Veraport|nx') { continue }
    try {
      $hwnd = $p.MainWindowHandle
      if (-not $hwnd -or $hwnd -eq [IntPtr]::Zero) { continue }
      $w = $AE::FromHandle($hwnd)
      if ($w) { [void]$list.Add($w) }
    } catch { continue }
  }
  return @($list)
}

function Click-Element($el) {
  try {
    $ip = $el.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
    $ip.Invoke()
    return $true
  } catch { }
  try {
    $sp = $el.GetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern)
    $sp.Select()
    return $true
  } catch { }
  return $false
}

function Select-CertificateRow($win, [string]$label) {
  $listOr = New-Object Windows.Automation.OrCondition(
    (New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::ListItem)),
    (New-Object Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::DataItem)))
  $desc = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $listOr))
  $n = 0
  $tokens = @()
  if ($label -and $label.Trim()) {
    $tokens = @($label.Trim())
    foreach ($part in ($label -split '[\s/]+')) {
      if ($part.Trim().Length -ge 4) { $tokens += $part.Trim() }
    }
  }
  foreach ($el in $desc) {
    if ($n++ -gt 80) { break }
    try {
      $name = $el.Current.Name
      if (-not $name) { continue }
      if (Test-IsBlockedCertRowName $name) { continue }
      $match = $false
      if ($tokens.Count -gt 0) {
        foreach ($tok in $tokens) {
          if ($name -like "*$tok*") { $match = $true; break }
        }
      } elseif (Test-IsCertRowName $name) {
        $match = $true
      }
      if (-not $match) { continue }
      if (Click-Element $el) { return $name }
    } catch { continue }
  }
  return $null
}

function Find-FirstCertificateElement($win) {
  $itemCond = New-Object Windows.Automation.PropertyCondition(
    $AE::ControlTypeProperty,
    $CT::ListItem)
  $items = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $itemCond))
  foreach ($item in $items) {
    try {
      $name = $item.Current.Name
      if (-not $name) { continue }
      if (Test-IsCertRowName $name) { return $item }
    } catch { continue }
  }
  return $null
}

function Activate-CertificateRow($win, [string]$label) {
  $el = $null
  $picked = Select-CertificateRow $win $label
  if ($picked) {
    $itemCond = New-Object Windows.Automation.PropertyCondition(
      $AE::ControlTypeProperty,
      $CT::ListItem)
    $items = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $itemCond))
    foreach ($item in $items) {
      try {
        if ($item.Current.Name -eq $picked) { $el = $item; break }
      } catch { continue }
    }
  }
  if (-not $el) { $el = Find-FirstCertificateElement $win }
  if (-not $el) { return $false }
  if (-not (Click-Element $el)) { return $false }
  Start-Sleep -Milliseconds 150
  Click-Element $el | Out-Null
  Start-Sleep -Milliseconds 350
  return $true
}

function Find-PasswordEdit($win) {
  $edits = @($win.FindAll([Windows.Automation.TreeScope]::Descendants, $editCond))
  foreach ($e in $edits) {
    try {
      $isPw = $false
      try { $isPw = $e.Current.IsPassword } catch { }
      $ename = ''
      try { $ename = $e.Current.Name } catch { }
      if ($isPw -or $ename -like "*$kPw*") { return $e }
    } catch { continue }
  }
  return $null
}

function Try-FillPassword($win) {
  $edit = Find-PasswordEdit $win
  if (-not $edit) { return $false }
  $isPw = $false
  try { $isPw = $edit.Current.IsPassword } catch { }
  $ename = ''
  try { $ename = $edit.Current.Name } catch { }
  if (-not $isPw -and $ename -notlike "*$kPw*") { return $false }
  try { $win.SetFocus() } catch { }
  try { $edit.SetFocus() } catch { }
  Start-Sleep -Milliseconds 250
  [System.Windows.Forms.SendKeys]::SendWait('^a{BACKSPACE}')
  $escaped = [regex]::Replace($pass, '[+^%~(){}\[\]]', { param($m) '{' + $m.Value + '}' })
  [System.Windows.Forms.SendKeys]::SendWait($escaped)
  Start-Sleep -Milliseconds 200
  $okCond = New-Object Windows.Automation.PropertyCondition($AE::NameProperty, $kOk)
  $okBtn = $win.FindFirst([Windows.Automation.TreeScope]::Descendants, $okCond)
  if ($okBtn) {
    $ip = $okBtn.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern)
    $ip.Invoke()
  } else {
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
  }
  return $true
}

$waitSec = 48
if ($env:SCHOOLUTIL_CERT_WAIT_SEC -match '^\d+$') {
  $waitSec = [Math]::Max(2, [int]$env:SCHOOLUTIL_CERT_WAIT_SEC)
}
$deadline = [datetime]::UtcNow.AddSeconds($waitSec)
$filledTitle = $null
$rowActivated = $false
$lastRowAttempt = [datetime]::UtcNow.AddSeconds(-5)

try {

while ([datetime]::UtcNow -lt $deadline) {
  $dialogs = Get-CertDialogWindows
  if ($dialogs.Count -eq 0) {
    Start-Sleep -Milliseconds 400
    continue
  }
  foreach ($win in $dialogs) {
    $now = [datetime]::UtcNow
    if (-not $rowActivated -or ($now - $lastRowAttempt).TotalSeconds -ge 3) {
      if (Activate-CertificateRow $win $certLabel) {
        $rowActivated = $true
        $lastRowAttempt = $now
      }
    }
    if (Try-FillPassword $win) {
      try { $filledTitle = $win.Current.Name } catch { $filledTitle = 'K-SIGN' }
      break
    }
  }
  if ($filledTitle) { break }
  Start-Sleep -Milliseconds 400
}

if (-not $filledTitle) {
  $dialogCount = (Get-CertDialogWindows).Count
  Write-Output (@{
    error = 'ksign password not filled'
    dialogCount = $dialogCount
    rowActivated = $rowActivated
  } | ConvertTo-Json -Compress)
  exit 3
}

Write-Output (@{
  filled = $true
  title = $filledTitle
  rowActivated = $rowActivated
} | ConvertTo-Json -Compress)
exit 0

} catch {
  Write-Output (@{
    error = ('script: ' + $_.Exception.Message)
    dialogCount = 0
    rowActivated = $false
  } | ConvertTo-Json -Compress)
  exit 3
}
