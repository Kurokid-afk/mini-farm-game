$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$classes = Join-Path $root "android\app\build\logic-test-classes"
$source = Join-Path $root "android\app\src\main\java\com\uu\harvestcollection\mobile\MergeLogic.java"
$test = Join-Path $root "tests\android\MergeLogicSmoke.java"

if (Test-Path -LiteralPath $classes) {
    Remove-Item -LiteralPath $classes -Recurse -Force
}
New-Item -ItemType Directory -Path $classes | Out-Null

& javac -encoding UTF-8 -d $classes $source $test
if ($LASTEXITCODE -ne 0) {
    throw "Native merge test compilation failed."
}

& java -cp $classes com.uu.harvestcollection.mobile.MergeLogicSmoke
if ($LASTEXITCODE -ne 0) {
    throw "Native merge tests failed."
}
