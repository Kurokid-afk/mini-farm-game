Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root "build"
$assets = Join-Path $root "assets"
New-Item -ItemType Directory -Force -Path $build, $assets | Out-Null

function New-Canvas([int]$width, [int]$height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  return @($bitmap, $graphics)
}

$sheetPair = New-Canvas 192 32
$sheet = $sheetPair[0]
$g = $sheetPair[1]
$g.Clear([System.Drawing.Color]::Transparent)
$cropColors = @("#f4c8c4", "#78c978", "#d5a96e", "#ef6b62", "#efcf55", "#df4560")

for ($index = 0; $index -lt 6; $index += 1) {
  $offset = $index * 32
  $green = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#4c9d59"))
  $body = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($cropColors[$index]))
  $shine = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#fff8d8"))
  $outline = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#34464a"), 2)
  $g.FillRectangle($green, $offset + 14, 2, 4, 10)
  $g.FillRectangle($green, $offset + 7, 5, 8, 4)
  $g.FillRectangle($green, $offset + 17, 5, 8, 4)
  if ($index -eq 1) {
    $g.FillRectangle($body, $offset + 5, 10, 22, 18)
    $g.DrawRectangle($outline, $offset + 5, 10, 22, 18)
    $g.FillRectangle($shine, $offset + 13, 12, 6, 14)
  } elseif ($index -eq 4) {
    $g.FillRectangle($body, $offset + 9, 9, 14, 21)
    $g.DrawRectangle($outline, $offset + 9, 9, 14, 21)
    for ($row = 0; $row -lt 4; $row += 1) {
      $g.FillRectangle($shine, $offset + 12, 11 + $row * 5, 3, 3)
      $g.FillRectangle($shine, $offset + 18, 11 + $row * 5, 3, 3)
    }
  } elseif ($index -eq 5) {
    $points = @(
      [System.Drawing.Point]::new($offset + 6, 10),
      [System.Drawing.Point]::new($offset + 26, 10),
      [System.Drawing.Point]::new($offset + 16, 30)
    )
    $g.FillPolygon($body, $points)
    $g.DrawPolygon($outline, $points)
    $g.FillRectangle($shine, $offset + 11, 15, 2, 2)
    $g.FillRectangle($shine, $offset + 19, 18, 2, 2)
  } else {
    $g.FillRectangle($body, $offset + 7, 10, 18, 18)
    $g.DrawRectangle($outline, $offset + 7, 10, 18, 18)
    $g.FillRectangle($shine, $offset + 10, 13, 4, 8)
  }
  $green.Dispose()
  $body.Dispose()
  $shine.Dispose()
  $outline.Dispose()
}

$sheet.Save((Join-Path $assets "crops.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$sheet.Dispose()

$iconPair = New-Canvas 256 256
$icon = $iconPair[0]
$ig = $iconPair[1]
$ig.Clear([System.Drawing.ColorTranslator]::FromHtml("#9bd7cf"))
$paper = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#fff8d8"))
$soil = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#a86549"))
$leaf = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#4c9d59"))
$radish = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#f4c8c4"))
$ink = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#34464a"), 12)
$ig.FillRectangle($paper, 24, 24, 208, 208)
$ig.DrawRectangle($ink, 24, 24, 208, 208)
$ig.FillRectangle($soil, 45, 145, 166, 58)
$ig.FillRectangle($leaf, 119, 52, 18, 70)
$ig.FillRectangle($leaf, 76, 69, 50, 23)
$ig.FillRectangle($leaf, 132, 69, 50, 23)
$ig.FillRectangle($radish, 88, 107, 82, 72)
$ig.DrawRectangle($ink, 88, 107, 82, 72)
$iconPath = Join-Path $build "icon.png"
$icon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$icon.Save((Join-Path $assets "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$handle = $icon.GetHicon()
$winIcon = [System.Drawing.Icon]::FromHandle($handle)
$stream = [System.IO.File]::Create((Join-Path $build "icon.ico"))
$winIcon.Save($stream)
$stream.Dispose()
$winIcon.Dispose()
$ig.Dispose()
$icon.Dispose()
$paper.Dispose()
$soil.Dispose()
$leaf.Dispose()
$radish.Dispose()
$ink.Dispose()

Write-Output "Generated pixel crops and application icons."
