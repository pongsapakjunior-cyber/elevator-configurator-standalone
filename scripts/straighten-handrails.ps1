param(
  [string]$SourceSheet = (Join-Path $PSScriptRoot '..\assets\finish-sources\handrails-clean.png'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\finishes\handrails-v2')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

if (-not ('Schneider.HandrailImage' -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.IO;

namespace Schneider
{
    public static class HandrailImage
    {
        public static void RemoveEdgeBackdrop(Bitmap bitmap)
        {
            var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            try
            {
                int stride = Math.Abs(data.Stride);
                byte[] pixels = new byte[stride * bitmap.Height];
                Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
                bool[] visited = new bool[bitmap.Width * bitmap.Height];
                var queue = new Queue<int>();

                Action<int, int> add = (x, y) =>
                {
                    if (x < 0 || y < 0 || x >= bitmap.Width || y >= bitmap.Height) return;
                    int point = y * bitmap.Width + x;
                    if (visited[point]) return;
                    visited[point] = true;
                    int offset = y * stride + x * 4;
                    int b = pixels[offset];
                    int g = pixels[offset + 1];
                    int r = pixels[offset + 2];
                    int maximum = Math.Max(r, Math.Max(g, b));
                    int minimum = Math.Min(r, Math.Min(g, b));
                    int average = (r + g + b) / 3;
                    if (maximum - minimum <= 12 && average >= 238) queue.Enqueue(point);
                };

                for (int x = 0; x < bitmap.Width; x++)
                {
                    add(x, 0);
                    add(x, bitmap.Height - 1);
                }
                for (int y = 0; y < bitmap.Height; y++)
                {
                    add(0, y);
                    add(bitmap.Width - 1, y);
                }

                while (queue.Count > 0)
                {
                    int point = queue.Dequeue();
                    int x = point % bitmap.Width;
                    int y = point / bitmap.Width;
                    pixels[y * stride + x * 4 + 3] = 0;
                    add(x - 1, y);
                    add(x + 1, y);
                    add(x, y - 1);
                    add(x, y + 1);
                }

                Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
            }
            finally
            {
                bitmap.UnlockBits(data);
            }
        }

        public static Bitmap Extract(Bitmap sheet, int top, int bottom)
        {
            var crop = new Bitmap(sheet.Width, bottom - top, PixelFormat.Format32bppArgb);
            using (var graphics = Graphics.FromImage(crop))
            {
                graphics.Clear(Color.Transparent);
                graphics.DrawImage(
                    sheet,
                    new Rectangle(0, 0, crop.Width, crop.Height),
                    new Rectangle(0, top, sheet.Width, crop.Height),
                    GraphicsUnit.Pixel
                );
            }
            RemoveEdgeBackdrop(crop);
            return crop;
        }

        public static double PrincipalAngle(Bitmap source)
        {
            double count = 0;
            double sumX = 0;
            double sumY = 0;

            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    if (source.GetPixel(x, y).A == 0) continue;
                    count++;
                    sumX += x;
                    sumY += y;
                }
            }

            if (count == 0) return 0;

            double meanX = sumX / count;
            double meanY = sumY / count;
            double xx = 0;
            double yy = 0;
            double xy = 0;

            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    if (source.GetPixel(x, y).A == 0) continue;
                    double dx = x - meanX;
                    double dy = y - meanY;
                    xx += dx * dx;
                    yy += dy * dy;
                    xy += dx * dy;
                }
            }

            double angle = 0.5 * Math.Atan2(2 * xy, xx - yy) * 180.0 / Math.PI;
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;
            return angle;
        }

        public static void Straighten(Bitmap source, string outputPath, int canvasWidth, int canvasHeight)
        {
            using (var output = new Bitmap(canvasWidth, canvasHeight, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(output))
            {
                double angle = PrincipalAngle(source);
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceOver;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.SmoothingMode = SmoothingMode.HighQuality;

                graphics.TranslateTransform(canvasWidth / 2f, canvasHeight / 2f);
                graphics.RotateTransform((float)-angle);
                graphics.TranslateTransform(-source.Width / 2f, -source.Height / 2f);
                graphics.DrawImage(source, new Rectangle(0, 0, source.Width, source.Height));
                graphics.ResetTransform();

                output.Save(outputPath, ImageFormat.Png);
            }
        }

        public static void RestoreHr06TripleRail(string outputPath)
        {
            string tempPath = outputPath + ".tmp.png";
            using (var leveled = new Bitmap(outputPath))
            using (var triple = new Bitmap(1200, 220, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(triple))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceOver;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

                var topRail = new Rectangle(0, 55, 1200, 58);
                var lowerRail = new Rectangle(0, 108, 1200, 58);
                graphics.DrawImage(leveled, new Rectangle(0, 25, 1200, 55), topRail, GraphicsUnit.Pixel);
                graphics.DrawImage(leveled, new Rectangle(0, 82, 1200, 55), lowerRail, GraphicsUnit.Pixel);
                graphics.DrawImage(leveled, new Rectangle(0, 139, 1200, 55), lowerRail, GraphicsUnit.Pixel);
                triple.Save(tempPath, ImageFormat.Png);
            }
            File.Copy(tempPath, outputPath, true);
            File.Delete(tempPath);
        }
    }
}
'@
}

$sourcePath = [IO.Path]::GetFullPath($SourceSheet)
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
  throw "Handrail source sheet not found: $sourcePath"
}

[IO.Directory]::CreateDirectory($outputRoot) | Out-Null

$products = @(
  @{ Code = 'HR-05'; Top = 20; Bottom = 135 },
  @{ Code = 'HR-06'; Top = 175; Bottom = 315 },
  @{ Code = 'HR-08-1'; Top = 355; Bottom = 485 },
  @{ Code = 'HR-08'; Top = 530; Bottom = 655 },
  @{ Code = 'HR-09'; Top = 690; Bottom = 810 },
  @{ Code = 'HR-10'; Top = 820; Bottom = 955 },
  @{ Code = 'HR-17'; Top = 980; Bottom = 1090 },
  @{ Code = 'HR-18'; Top = 1095; Bottom = 1220 },
  @{ Code = 'HR-19'; Top = 1220; Bottom = 1345 },
  @{ Code = 'HR-20'; Top = 1345; Bottom = 1525 }
)

$sheet = [Drawing.Bitmap]::new($sourcePath)
try {
  foreach ($product in $products) {
    $source = [Schneider.HandrailImage]::Extract($sheet, $product.Top, $product.Bottom)
    try {
      $angle = [Schneider.HandrailImage]::PrincipalAngle($source)
      $stem = $product.Code.ToLowerInvariant()
      $destination = Join-Path $outputRoot "$stem-straight-v2.png"
      [Schneider.HandrailImage]::Straighten($source, $destination, 1200, 220)
      if ($product.Code -eq 'HR-06') {
        # The catalog defines HR-06 as three rails; the cleaned source sheet lost one
        # during its earlier enhancement, so restore it from the matching lower rail.
        [Schneider.HandrailImage]::RestoreHr06TripleRail($destination)
      }

      [pscustomobject]@{
        Code = $product.Code
        CorrectionDegrees = [Math]::Round(-$angle, 3)
        Output = $destination
      }
    }
    finally {
      $source.Dispose()
    }
  }
}
finally {
  $sheet.Dispose()
}
