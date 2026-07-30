$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$classes = Join-Path $root "android\app\build\logic-test-classes"
$sources = @(
    (Join-Path $root "android\app\src\main\java\com\uu\harvestcollection\mobile\MergeLogic.java"),
    (Join-Path $root "android\app\src\main\java\com\uu\harvestcollection\mobile\LinkLogic.java")
)
$tests = @(
    (Join-Path $root "tests\android\MergeLogicSmoke.java"),
    (Join-Path $root "tests\android\LinkLogicSmoke.java")
)

if (Test-Path -LiteralPath $classes) {
    Remove-Item -LiteralPath $classes -Recurse -Force
}
New-Item -ItemType Directory -Path $classes | Out-Null

& javac -encoding UTF-8 -d $classes $sources $tests
if ($LASTEXITCODE -ne 0) {
    throw "Native merge test compilation failed."
}

& java -cp $classes com.uu.harvestcollection.mobile.MergeLogicSmoke
if ($LASTEXITCODE -ne 0) {
    throw "Native merge tests failed."
}

& java -cp $classes com.uu.harvestcollection.mobile.LinkLogicSmoke
if ($LASTEXITCODE -ne 0) {
    throw "Native link tests failed."
}
