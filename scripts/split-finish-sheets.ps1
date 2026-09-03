param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class FinishBackdrop {
  public static void RemoveEdgeConnectedLight(Bitmap bitmap) {
    var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
    var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    try {
      int stride = Math.Abs(data.Stride);
      byte[] pixels = new byte[stride * bitmap.Height];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      bool[] visited = new bool[bitmap.Width * bitmap.Height];
      var queue = new Queue<int>();

      Action<int, int> add = (x, y) => {
        if (x < 0 || y < 0 || x >= bitmap.Width || y >= bitmap.Height) return;
        int point = y * bitmap.Width + x;
        if (visited[point]) return;
        visited[point] = true;
        int offset = y * stride + x * 4;
        int b = pixels[offset], g = pixels[offset + 1], r = pixels[offset + 2];
        int maximum = Math.Max(r, Math.Max(g, b));
        int minimum = Math.Min(r, Math.Min(g, b));
        int average = (r + g + b) / 3;
        if (maximum - minimum <= 16 && average >= 222) queue.Enqueue(point);
      };

      for (int x = 0; x < bitmap.Width; x++) { add(x, 0); add(x, bitmap.Height - 1); }
      for (int y = 0; y < bitmap.Height; y++) { add(0, y); add(bitmap.Width - 1, y); }

      while (queue.Count > 0) {
        int point = queue.Dequeue();
        int x = point % bitmap.Width, y = point / bitmap.Width;
        pixels[y * stride + x * 4 + 3] = 0;
        add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
      }
      Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
    } finally {
      bitmap.UnlockBits(data);
    }
  }
}
'@

$sourceRoot = Join-Path $ProjectRoot 'assets\finish-sources'
$outputRoot = Join-Path $ProjectRoot 'assets\finishes'

function Test-BackdropPixel([System.Drawing.Color]$Color) {
  $maximum = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $minimum = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $average = ($Color.R + $Color.G + $Color.B) / 3
  return (($maximum - $minimum) -le 16 -and $average -ge 222)
}

function Remove-EdgeBackdrop([System.Drawing.Bitmap]$Bitmap) {
  [FinishBackdrop]::RemoveEdgeConnectedLight($Bitmap)
}

function Export-GridCell {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$Column,
    [int]$Row,
    [int]$Columns,
    [int]$Rows,
    [string]$OutputPath
  )

  $x0 = [Math]::Floor($Column * $Source.Width / $Columns)
  $x1 = [Math]::Floor(($Column + 1) * $Source.Width / $Columns)
  $y0 = [Math]::Floor($Row * $Source.Height / $Rows)
  $y1 = [Math]::Floor(($Row + 1) * $Source.Height / $Rows)
  Export-CellBox -Source $Source -X0 $x0 -Y0 $y0 -X1 $x1 -Y1 $y1 -OutputPath $OutputPath
}

function Export-CellBox {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$X0,
    [int]$Y0,
    [int]$X1,
    [int]$Y1,
    [string]$OutputPath
  )

  $cell = [System.Drawing.Bitmap]::new($x1 - $x0, $y1 - $y0, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($cell)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($Source, [System.Drawing.Rectangle]::new(0, 0, $cell.Width, $cell.Height), [System.Drawing.Rectangle]::new($x0, $y0, $cell.Width, $cell.Height), [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  Remove-EdgeBackdrop $cell
  $cell.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $cell.Dispose()
}

function Export-Grid {
  param(
    [string]$SourceName,
    [string]$Category,
    [int]$Columns,
    [int]$Rows,
    [string[]]$Codes
  )

  $destination = Join-Path $outputRoot $Category
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $source = [System.Drawing.Bitmap]::FromFile((Join-Path $sourceRoot $SourceName))
  try {
    for ($index = 0; $index -lt $Codes.Count; $index++) {
      Export-GridCell -Source $source -Column ($index % $Columns) -Row ([Math]::Floor($index / $Columns)) -Columns $Columns -Rows $Rows -OutputPath (Join-Path $destination ($Codes[$index].ToLowerInvariant() + '.png'))
    }
  } finally {
    $source.Dispose()
  }
}

$ceilingCodes = @('CD-001', 'CD-003', 'CD-004', 'CD-005', 'CD-010', 'CD-012', 'CD-013', 'CD-014', 'CD-016', 'CD-018', 'CD-019', 'CD-020')
$handrailCodes = @('HR-05', 'HR-06', 'HR-08-1', 'HR-08', 'HR-09', 'HR-10', 'HR-17', 'HR-18', 'HR-19', 'HR-20')
$floorGridCodes = @('FL-020', 'FL-021', 'FL-022', 'FL-023', 'FL-024', 'FL-025', 'FL-026', 'FL-027', 'HM-776', 'HM-780', 'HM-785', 'FL-009', 'HM-798', 'HM-7110', 'HM-7112', 'FL-010', 'HM-7113', 'HM-702', 'HM-727', 'FL-012')
$homeFloorCodes = @('FL-013', 'FL-014', 'FL-015', 'FL-016', 'FL-017')

Export-Grid -SourceName 'ceilings-clean.png' -Category 'ceilings' -Columns 2 -Rows 6 -Codes $ceilingCodes
Export-Grid -SourceName 'handrails-clean.png' -Category 'handrails' -Columns 1 -Rows 10 -Codes $handrailCodes

$floorSource = [System.Drawing.Bitmap]::FromFile((Join-Path $sourceRoot 'floors-clean.png'))
try {
  $floorRowBounds = @(0, 285, 530, 770, 995, 1222, $floorSource.Height)
  $floorColumnBounds = @(0, 285, 525, 780, $floorSource.Width)
  for ($index = 0; $index -lt $floorGridCodes.Count; $index++) {
    $column = $index % 4
    $row = [Math]::Floor($index / 4)
    Export-CellBox -Source $floorSource -X0 $floorColumnBounds[$column] -Y0 $floorRowBounds[$row] -X1 $floorColumnBounds[$column + 1] -Y1 $floorRowBounds[$row + 1] -OutputPath (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $outputRoot 'floors')) ($floorGridCodes[$index].ToLowerInvariant() + '.png'))
  }
  $homeFloorColumnBounds = @(0, 260, 463, 646, 844, $floorSource.Width)
  for ($index = 0; $index -lt $homeFloorCodes.Count; $index++) {
    Export-CellBox -Source $floorSource -X0 $homeFloorColumnBounds[$index] -Y0 $floorRowBounds[5] -X1 $homeFloorColumnBounds[$index + 1] -Y1 $floorRowBounds[6] -OutputPath (Join-Path (Join-Path $outputRoot 'floors') ($homeFloorCodes[$index].ToLowerInvariant() + '.png'))
  }
} finally {
  $floorSource.Dispose()
}

Get-ChildItem -Path $outputRoot -Recurse -Filter '*.png' | Sort-Object FullName | Select-Object FullName, Length
