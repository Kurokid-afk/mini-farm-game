param(
    [string]$ApkPath = "",
    [string]$PackageName = "com.uu.harvestcollection.mobile",
    [switch]$CleanInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
if (!(Test-Path -LiteralPath $adb)) {
    throw "adb was not found at $adb"
}

if (!$ApkPath) {
    $ApkPath = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\release\app-release.apk"
}
$ApkPath = (Resolve-Path -LiteralPath $ApkPath).Path

$devices = & $adb devices
if (!($devices -match "\sdevice$")) {
    throw "No running Android device or emulator was found."
}

if ($CleanInstall) {
    & $adb uninstall $PackageName 2>$null | Out-Null
    & $adb install $ApkPath
} else {
    & $adb install -r $ApkPath
}
if ($LASTEXITCODE -ne 0) {
    throw "APK installation failed."
}

& $adb logcat -c
$launch = (& $adb shell am start -W -n "$PackageName/.MainActivity") -join "`n"
if ($LASTEXITCODE -ne 0 -or $launch -notmatch "Status: ok") {
    throw "Cold launch failed.`n$launch"
}
Start-Sleep -Seconds 2

$activity = (& $adb shell dumpsys activity activities) -join "`n"
if ($activity -notmatch "topResumedActivity=.*$([regex]::Escape($PackageName))/.MainActivity") {
    throw "MainActivity is not the active screen."
}

$sizeLines = & $adb shell wm size
$sizeMatch = $sizeLines | Select-String "Override size" | Select-Object -Last 1
if (!$sizeMatch) {
    $sizeMatch = $sizeLines | Select-String "Physical size" | Select-Object -Last 1
}
$sizeText = if ($sizeMatch) { $sizeMatch.Line } else { "" }
if ($sizeText -notmatch "(\d+)x(\d+)") {
    throw "Could not determine the device screen size."
}
$width = [int]$Matches[1]
$height = [int]$Matches[2]
$windowDump = (& $adb shell dumpsys window windows) -join "`n"
$bottomInset = [int]($height * 0.08)
if ($windowDump -match "type=navigationBars[\s\S]{0,260}?insetsSize=Insets\{left=0, top=0, right=0, bottom=(\d+)\}") {
    $bottomInset = [int]$Matches[1]
}
$canvasScale = $width / 640.0
$navigationY = $height - $bottomInset - [int](36 * $canvasScale)

$output = Join-Path $PSScriptRoot "..\output\android\install-check"
New-Item -ItemType Directory -Path $output -Force | Out-Null

function Save-Screenshot([string]$Name) {
    $remote = "/sdcard/uu-$Name.png"
    & $adb shell screencap -p $remote
    & $adb pull $remote (Join-Path $output "$Name.png") | Out-Null
}

& $adb shell input tap ([int]($width * 0.10)) $navigationY
Start-Sleep -Milliseconds 500
Save-Screenshot "01-farm"

$pages = @(
    @{ Name = "02-link"; X = 0.30 },
    @{ Name = "03-puzzle"; X = 0.50 },
    @{ Name = "04-market"; X = 0.70 },
    @{ Name = "05-farm-return"; X = 0.10 }
)
foreach ($page in $pages) {
    & $adb shell input tap ([int]($width * $page.X)) $navigationY
    Start-Sleep -Milliseconds 500
    Save-Screenshot $page.Name
}

$pageHashes = @(Get-ChildItem -LiteralPath $output -File |
    Where-Object { $_.Name -match "^0[1-5]-.*\.png$" } |
    Get-FileHash -Algorithm SHA256 |
    Select-Object -ExpandProperty Hash -Unique)
if ($pageHashes.Count -lt 4) {
    throw "Page navigation did not produce distinct screens; check screen-size and inset detection."
}

& $adb shell input tap ([int]($width * 0.18)) ([int]($height * 0.35))
Start-Sleep -Milliseconds 500
Save-Screenshot "06-planted"

& $adb shell am force-stop $PackageName
& $adb shell am start -W -n "$PackageName/.MainActivity" | Out-Null
Start-Sleep -Seconds 1
Save-Screenshot "07-restarted"

$errors = (& $adb logcat -d "*:E") -join "`n"
$errors | Set-Content -LiteralPath (Join-Path $output "logcat-errors.txt") -Encoding UTF8
if ($errors -match "FATAL EXCEPTION|AndroidRuntime.*Process: $([regex]::Escape($PackageName))|OutOfMemoryError") {
    throw "The app produced a fatal runtime error. See $output\logcat-errors.txt"
}

Write-Output "APK_INSTALL_CHECK=PASS"
Write-Output "APK=$ApkPath"
Write-Output "SCREEN=${width}x${height}"
Write-Output "ARTIFACTS=$output"
