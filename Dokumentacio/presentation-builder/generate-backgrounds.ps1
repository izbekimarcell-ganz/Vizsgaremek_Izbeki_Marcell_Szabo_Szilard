$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$assetDir = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

function New-ArgbColor([int]$a, [string]$hex) {
    $hex = $hex.TrimStart("#")
    return [System.Drawing.Color]::FromArgb(
        $a,
        [Convert]::ToInt32($hex.Substring(0, 2), 16),
        [Convert]::ToInt32($hex.Substring(2, 2), 16),
        [Convert]::ToInt32($hex.Substring(4, 2), 16)
    )
}

function Get-HexColor([string]$hex) {
    return New-ArgbColor 255 $hex
}

function New-Canvas([int]$width, [int]$height) {
    $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    return @{
        Bitmap = $bitmap
        Graphics = $graphics
    }
}

function Save-Canvas($canvas, [string]$path) {
    $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Graphics.Dispose()
    $canvas.Bitmap.Dispose()
}

function Draw-FilledEllipse($graphics, [int]$x, [int]$y, [int]$width, [int]$height, [System.Drawing.Color]$color) {
    $brush = New-Object System.Drawing.SolidBrush($color)
    $graphics.FillEllipse($brush, $x, $y, $width, $height)
    $brush.Dispose()
}

function Draw-Wave($graphics, [System.Drawing.Color]$color, [float]$width, [System.Drawing.PointF[]]$points) {
    $pen = New-Object System.Drawing.Pen($color, $width)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $graphics.DrawCurve($pen, $points, 0.55)
    $pen.Dispose()
}

function New-PointArray([double[]]$coords) {
    $list = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
    for ($i = 0; $i -lt $coords.Length; $i += 2) {
        $list.Add((New-Object System.Drawing.PointF([float]$coords[$i], [float]$coords[$i + 1])))
    }
    return $list.ToArray()
}

function Draw-TitleBackground {
    $canvas = New-Canvas 1600 900
    $g = $canvas.Graphics

    $bgRect = New-Object System.Drawing.Rectangle(0, 0, 1600, 900)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        (Get-HexColor "F8FBFA"),
        (Get-HexColor "D9EEF2"),
        0
    )
    $g.FillRectangle($brush, $bgRect)
    $brush.Dispose()

    Draw-FilledEllipse $g 930 -120 760 760 (New-ArgbColor 85 "61C2C0")
    Draw-FilledEllipse $g 1080 100 440 440 (New-ArgbColor 70 "8ED8F8")
    Draw-FilledEllipse $g -140 560 560 260 (New-ArgbColor 95 "EED7AA")
    Draw-FilledEllipse $g 280 690 340 180 (New-ArgbColor 50 "61C2C0")

    Draw-Wave $g (New-ArgbColor 110 "2E8E97") 7 (New-PointArray @(0, 620, 220, 570, 500, 645, 790, 590, 1100, 665, 1600, 595))
    Draw-Wave $g (New-ArgbColor 65 "49A9B2") 4 (New-PointArray @(0, 680, 260, 635, 560, 705, 900, 655, 1220, 710, 1600, 660))
    Draw-Wave $g (New-ArgbColor 50 "FFFFFF") 2.5 (New-PointArray @(0, 725, 230, 695, 560, 745, 920, 705, 1270, 760, 1600, 715))

    $stripeBrush = New-Object System.Drawing.SolidBrush((New-ArgbColor 255 "123C4A"))
    $g.FillRectangle($stripeBrush, 0, 0, 150, 900)
    $stripeBrush.Dispose()

    $dotBrush = New-Object System.Drawing.SolidBrush((New-ArgbColor 120 "FFFFFF"))
    foreach ($coords in @(
        @(74, 150), @(74, 250), @(74, 350), @(74, 450), @(74, 550), @(74, 650), @(74, 750)
    )) {
        $g.FillEllipse($dotBrush, $coords[0], $coords[1], 10, 10)
    }
    $dotBrush.Dispose()

    Save-Canvas $canvas (Join-Path $assetDir "title-background.png")
}

function Draw-LightBackground {
    $canvas = New-Canvas 1600 900
    $g = $canvas.Graphics

    $bgRect = New-Object System.Drawing.Rectangle(0, 0, 1600, 900)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        (Get-HexColor "FCFEFD"),
        (Get-HexColor "E9F4F8"),
        90
    )
    $g.FillRectangle($brush, $bgRect)
    $brush.Dispose()

    Draw-FilledEllipse $g 1080 -180 620 620 (New-ArgbColor 70 "70C9D0")
    Draw-FilledEllipse $g 1220 80 280 280 (New-ArgbColor 95 "FFFFFF")
    Draw-FilledEllipse $g -180 640 560 240 (New-ArgbColor 90 "EFDDB7")
    Draw-FilledEllipse $g 900 650 520 220 (New-ArgbColor 55 "70C9D0")

    Draw-Wave $g (New-ArgbColor 70 "6BB6BF") 5.5 (New-PointArray @(0, 735, 250, 690, 560, 765, 900, 710, 1280, 780, 1600, 725))
    Draw-Wave $g (New-ArgbColor 50 "A9D9E3") 3.5 (New-PointArray @(0, 785, 220, 760, 520, 815, 890, 770, 1240, 835, 1600, 790))

    $panelBrush = New-Object System.Drawing.SolidBrush((New-ArgbColor 120 "FFFFFF"))
    $g.FillRectangle($panelBrush, 0, 0, 1040, 900)
    $panelBrush.Dispose()

    Save-Canvas $canvas (Join-Path $assetDir "light-background.png")
}

function Draw-DarkBackground {
    $canvas = New-Canvas 1600 900
    $g = $canvas.Graphics

    $bgRect = New-Object System.Drawing.Rectangle(0, 0, 1600, 900)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $bgRect,
        (Get-HexColor "0F2430"),
        (Get-HexColor "18435A"),
        15
    )
    $g.FillRectangle($brush, $bgRect)
    $brush.Dispose()

    Draw-FilledEllipse $g 960 -120 720 720 (New-ArgbColor 60 "1D6F85")
    Draw-FilledEllipse $g -180 560 600 280 (New-ArgbColor 65 "D7B56D")
    Draw-FilledEllipse $g 1140 620 420 180 (New-ArgbColor 40 "68D0DE")

    Draw-Wave $g (New-ArgbColor 90 "8BDCE3") 5.5 (New-PointArray @(0, 655, 270, 590, 560, 680, 900, 615, 1210, 700, 1600, 625))
    Draw-Wave $g (New-ArgbColor 50 "F6E5C2") 3 (New-PointArray @(0, 715, 240, 670, 530, 740, 870, 700, 1230, 760, 1600, 715))
    Draw-Wave $g (New-ArgbColor 35 "FFFFFF") 2 (New-PointArray @(0, 770, 230, 738, 560, 790, 920, 748, 1260, 815, 1600, 770))

    $leftGlowBrush = New-Object System.Drawing.SolidBrush((New-ArgbColor 90 "0B1822"))
    $g.FillRectangle($leftGlowBrush, 0, 0, 780, 900)
    $leftGlowBrush.Dispose()

    Save-Canvas $canvas (Join-Path $assetDir "dark-background.png")
}

Draw-TitleBackground
Draw-LightBackground
Draw-DarkBackground
