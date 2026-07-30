$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sandbox = [IO.Path]::GetFullPath((Join-Path $root "output\updater-test"))
$allowedRoot = [IO.Path]::GetFullPath((Join-Path $root "output")) + [IO.Path]::DirectorySeparatorChar
if (-not $sandbox.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Updater test sandbox escaped the project output directory."
}

$package = Get-Content -LiteralPath (Join-Path $root "package.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$updater = Join-Path $root "release\UU-Farm-Updater.exe"
$payload = Join-Path $root ("release\" + $package.build.win.artifactName)
$sandboxUpdater = Join-Path $sandbox "UU-Farm-Updater.exe"
$sandboxTarget = Join-Path $sandbox "UU Farm.exe"
$locator = Join-Path $sandbox "install-path.txt"

if (-not (Test-Path -LiteralPath $updater) -or -not (Test-Path -LiteralPath $payload)) {
    throw "Build the Windows EXE and updater before running this test."
}

Add-Type -AssemblyName System.Windows.Forms
$assembly = [Reflection.Assembly]::LoadFile($updater)
$formType = $assembly.GetType("UUFarmUpdater.UpdaterForm", $true)
$form = [Activator]::CreateInstance($formType, $true)
try {
    if ($form.ClientSize.Width -ne 620 -or $form.ClientSize.Height -ne 330) {
        throw "Updater content area has an unexpected size."
    }
    $pending = New-Object Collections.Generic.Queue[Windows.Forms.Control]
    $pending.Enqueue($form)
    while ($pending.Count -gt 0) {
        $parent = $pending.Dequeue()
        foreach ($control in $parent.Controls) {
            if ($control.Left -lt 0 -or $control.Top -lt 0 -or
                $control.Right -gt $parent.ClientSize.Width -or
                $control.Bottom -gt $parent.ClientSize.Height) {
                throw "Updater control is clipped: $($control.GetType().Name)"
            }
            $pending.Enqueue($control)
        }
    }
} finally {
    $form.Dispose()
}

if (Test-Path -LiteralPath $sandbox) {
    Remove-Item -LiteralPath $sandbox -Recurse -Force
}
New-Item -ItemType Directory -Path $sandbox | Out-Null

try {
    Copy-Item -LiteralPath $updater -Destination $sandboxUpdater
    Copy-Item -LiteralPath (Join-Path $env:WINDIR "System32\notepad.exe") -Destination $sandboxTarget
    $oldHash = (Get-FileHash -LiteralPath $sandboxTarget -Algorithm SHA256).Hash
    $payloadHash = (Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash
    $env:UU_UPDATER_LOCATOR = $locator

    $process = Start-Process -FilePath $sandboxUpdater -ArgumentList "--silent-auto" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Automatic updater test failed with exit code $($process.ExitCode)."
    }
    $updatedHash = (Get-FileHash -LiteralPath $sandboxTarget -Algorithm SHA256).Hash
    if ($updatedHash -ne $payloadHash) {
        throw "Updater did not replace the old executable with the embedded payload."
    }
    if ((Get-Content -LiteralPath $locator -Raw).Trim() -ne $sandboxTarget) {
        throw "Updater did not record the updated executable path."
    }

    Copy-Item -LiteralPath (Join-Path $env:WINDIR "System32\notepad.exe") -Destination $sandboxTarget -Force
    $lock = [IO.File]::Open($sandboxTarget, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
    try {
        $lockedProcess = Start-Process -FilePath $sandboxUpdater -ArgumentList "--silent-auto" -Wait -PassThru
    } finally {
        $lock.Dispose()
    }
    if ($lockedProcess.ExitCode -eq 0) {
        throw "Updater unexpectedly replaced a running or locked executable."
    }
    $lockedHash = (Get-FileHash -LiteralPath $sandboxTarget -Algorithm SHA256).Hash
    if ($lockedHash -ne $oldHash) {
        throw "Locked-target failure changed the original executable."
    }

    Write-Output "WINDOWS_UPDATER_TEST=PASS"
    Write-Output "AUTO_DISCOVERY=PASS"
    Write-Output "SAFE_REPLACE=PASS"
    Write-Output "LOCKED_TARGET_ROLLBACK=PASS"
    Write-Output "UI_BOUNDS=PASS"
} finally {
    Remove-Item Env:UU_UPDATER_LOCATOR -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $sandbox) {
        Remove-Item -LiteralPath $sandbox -Recurse -Force
    }
}
