$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$gradle = Join-Path $root "android\gradlew.bat"
$apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
$target = Join-Path $root "release\UU-Harvest-Mobile.apk"
$keystoreProperties = Join-Path $root "android\keystore.properties"

$jdkCandidates = @()
$jdkCandidates += Get-ChildItem -Path "$env:LOCALAPPDATA\Java" -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^jdk-(1[7-9]|[2-9]\d)' } |
    Sort-Object Name -Descending |
    Select-Object -ExpandProperty FullName
$jdkCandidates += @(
    (Join-Path $env:ProgramFiles "Android\Android Studio\jbr"),
    "D:\Android Studio\jbr",
    $env:JAVA_HOME
)
foreach ($candidate in $jdkCandidates | Where-Object { $_ } | Select-Object -Unique) {
    $java = Join-Path $candidate "bin\java.exe"
    if (-not (Test-Path -LiteralPath $java)) {
        continue
    }
    $productVersion = (Get-Item -LiteralPath $java).VersionInfo.ProductVersion
    if ($productVersion -match '^(\d+)' -and [int]$Matches[1] -ge 17) {
        $env:JAVA_HOME = $candidate
        break
    }
}
if (-not $env:ANDROID_HOME -and (Test-Path -LiteralPath "$env:LOCALAPPDATA\Android\Sdk")) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}

Push-Location $root
try {
    if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        throw "JDK 17 is required."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME "build-tools\35.0.0\apksigner.bat"))) {
        throw "Android Build-Tools 35.0.0 is required."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME "platforms\android-35\android.jar"))) {
        throw "Android SDK Platform 35 is required."
    }
    if (-not (Test-Path -LiteralPath $keystoreProperties)) {
        throw "android\keystore.properties is required for a release-signed APK."
    }
    & $gradle -p android assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) {
        throw "Android release build failed."
    }
    if (-not (Test-Path -LiteralPath $apk)) {
        throw "Android build completed without producing an APK."
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $apk -Destination $target -Force
    & (Join-Path $env:ANDROID_HOME "build-tools\35.0.0\apksigner.bat") verify --verbose $target
    if ($LASTEXITCODE -ne 0) {
        throw "APK signature verification failed."
    }
    $hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    $size = (Get-Item -LiteralPath $target).Length
    Write-Host "Native APK: $target"
    Write-Host "Size: $size bytes"
    Write-Host "SHA256: $hash"
} finally {
    Pop-Location
}
