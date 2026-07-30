$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$source = Join-Path $root "updater\Program.cs"
$package = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$payload = Join-Path $root ("release\" + $package.build.win.artifactName)
$target = Join-Path $root "release\UU-Farm-Updater.exe"
$icon = Join-Path $root "build\icon.ico"
$buildDirectory = Join-Path $root "output\updater-build"
$hashFile = Join-Path $buildDirectory "payload.sha256"
$compilerCandidates = @(
    (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
    (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $compiler) {
    throw ".NET Framework C# compiler was not found."
}
if (-not (Test-Path -LiteralPath $payload)) {
    throw "Build the Windows game executable before building the updater."
}

New-Item -ItemType Directory -Path $buildDirectory -Force | Out-Null
$payloadHash = (Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash
[IO.File]::WriteAllText($hashFile, $payloadHash, [Text.Encoding]::ASCII)

& $compiler `
    /nologo `
    /target:winexe `
    /optimize+ `
    /platform:anycpu `
    /win32icon:$icon `
    /out:$target `
    /resource:"$payload",UUFarmPayload `
    /resource:"$hashFile",UUFarmPayloadHash `
    /reference:System.dll `
    /reference:System.Core.dll `
    /reference:System.Drawing.dll `
    /reference:System.Windows.Forms.dll `
    $source
if ($LASTEXITCODE -ne 0) {
    throw "Windows updater build failed."
}

$updaterHash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
$size = (Get-Item -LiteralPath $target).Length
Write-Output "WINDOWS_UPDATER=$target"
Write-Output "SIZE=$size"
Write-Output "PAYLOAD_SHA256=$payloadHash"
Write-Output "UPDATER_SHA256=$updaterHash"
