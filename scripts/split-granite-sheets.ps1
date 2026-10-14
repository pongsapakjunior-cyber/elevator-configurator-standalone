param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$sourceDirectory = Join-Path $resolvedRoot 'assets/finishes/floors'
$left = @(40, 261, 481, 700)
$top = @(222, 432, 644, 857, 1077)
$width = 165
$height = 105

$planned = for ($index = 0; $index -lt 35; $index++) {
  $sheet = if ($index -lt 20) { 1 } else { 2 }
  $cell = if ($sheet -eq 1) { $index } else { $index - 20 }
  $code = 'mg-{0:D2}.png' -f ($index + 1)
  [pscustomobject]@{
    Sheet = $sheet
    Row = [math]::Floor($cell / 4)
    Column = $cell % 4
    Target = Join-Path $sourceDirectory $code
  }
}

foreach ($item in $planned) {
  if (Test-Path -LiteralPath $item.Target) { throw "Refusing to overwrite an existing finish: $($item.Target)" }
}

foreach ($sheet in @(1, 2)) {
  $sourcePath = Join-Path $sourceDirectory "granite-sheet-$sheet.jpg"
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    if ($source.Width -ne 904 -or $source.Height -ne 1280) {
      throw "Unexpected granite catalog dimensions for ${sourcePath}: $($source.Width)x$($source.Height)"
    }
    foreach ($item in $planned | Where-Object Sheet -EQ $sheet) {
      $rectangle = [System.Drawing.Rectangle]::new($left[$item.Column], $top[$item.Row], $width, $height)
      $swatch = $source.Clone($rectangle, $source.PixelFormat)
      try {
        $swatch.Save($item.Target, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        $swatch.Dispose()
      }
    }
  } finally {
    $source.Dispose()
  }
}

Write-Output "Split 35 Minburi Granite swatches into individual floor PNGs. Original supplier catalogs remain untouched."
