param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$resolvedRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$sourceDirectory = Join-Path $resolvedRoot 'assets/finishes/floors'
$outputDirectory = Join-Path $resolvedRoot 'output/enhanced-granite'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

for ($number = 1; $number -le 35; $number++) {
  $code = 'mg-{0:D2}.png' -f $number
  $sourcePath = Join-Path $sourceDirectory $code
  $outputPath = Join-Path $outputDirectory $code
  if (Test-Path -LiteralPath $outputPath) { throw "Refusing to overwrite an enhanced test image: $outputPath" }
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    if ($source.Width -ne 165 -or $source.Height -ne 105) {
      throw "Unexpected original swatch dimensions: $sourcePath"
    }
    $scaled = [System.Drawing.Bitmap]::new(330, 210)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($scaled)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 330, 210))
      } finally {
        $graphics.Dispose()
      }
      $scaled.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $scaled.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

Write-Output 'Enhanced 35 original granite swatches to 330x210 PNGs in output/enhanced-granite. Catalog colors and finishes remain source-backed.'
