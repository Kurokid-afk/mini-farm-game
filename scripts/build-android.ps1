$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$gradle = Join-Path $root "android\gradlew.bat"
$apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
$target = Join-Path $root "release\UU-Harvest-Mobile.apk"

if (Test-Path -LiteralPath "D:\JAVA JDK11") {
    $env:JAVA_HOME = "D:\JAVA JDK11"
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath "$env:LOCALAPPDATA\Android\Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}

Push-Location $root
try {
    $aapt2 = Join-Path $env:ANDROID_HOME "build-tools\36.0.0\aapt2.exe"
    if (-not (Test-Path -LiteralPath $aapt2)) {
        throw "Android Build-Tools 36.0.0 is required."
    }
    $aapt2Property = "-Pandroid.aapt2FromMavenOverride=$($aapt2.Replace('\', '/'))"
    & $gradle -p android $aapt2Property assembleRelease
    if (-not (Test-Path -LiteralPath $apk)) {
        throw "Android build completed without producing an APK."
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $apk -Destination $target -Force
    Write-Host "Native APK: $target"
} finally {
    Pop-Location
}
