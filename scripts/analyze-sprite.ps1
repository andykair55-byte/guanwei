Add-Type -AssemblyName System.Drawing

$imgPath = "d:\code\code\program\4-观微\docs\1.front\person.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)
$w = $bmp.Width
$h = $bmp.Height
$bg = $bmp.GetPixel(0, 0)
$tol = 20

Write-Host "Image: ${w} x ${h}"
Write-Host "BG: R=$($bg.R) G=$($bg.G) B=$($bg.B)"
Write-Host ""

# Helper
function IsBg([System.Drawing.Bitmap]$b, [int]$x, [int]$y, [System.Drawing.Color]$bgc, [int]$t) {
    $p = $b.GetPixel($x, $y)
    $dr = [Math]::Abs($p.R - $bgc.R)
    $dg = [Math]::Abs($p.G - $bgc.G)
    $db = [Math]::Abs($p.B - $bgc.B)
    return ($dr -lt $t -and $dg -lt $t -and $db -lt $t)
}

function BBox([System.Drawing.Bitmap]$b, [int]$x1, [int]$y1, [int]$x2, [int]$y2, [System.Drawing.Color]$bgc, [int]$t) {
    $minX = $x2; $minY = $y2; $maxX = $x1; $maxY = $y1
    $found = $false
    for ($y = $y1; $y -lt $y2; $y++) {
        for ($x = $x1; $x -lt $x2; $x++) {
            if (-not (IsBg $b $x $y $bgc $t)) {
                $found = $true
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    if ($found) {
        return [PSCustomObject]@{
            minX = $minX; minY = $minY
            maxX = $maxX; maxY = $maxY
            w = $maxX - $minX + 1
            h = $maxY - $minY + 1
        }
    }
    return $null
}

Write-Host "=== Character Rows (left 300px) ==="
$rows = @()
$inRow = $false
$rs = 0
for ($y = 0; $y -lt $h; $y++) {
    $has = $false
    for ($x = 0; $x -lt 300; $x++) {
        if (-not (IsBg $bmp $x $y $bg $tol)) { $has = $true; break }
    }
    if ($has -and -not $inRow) { $inRow = $true; $rs = $y }
    if (-not $has -and $inRow) {
        $inRow = $false
        $bb = BBox $bmp 0 $rs 300 $y $bg $tol
        if ($bb) { $rows += [PSCustomObject]@{ start = $rs; end = $y - 1; bbox = $bb } }
    }
}
for ($i = 0; $i -lt $rows.Count; $i++) {
    $r = $rows[$i]
    $b = $r.bbox
    Write-Host ("Row {0}: y={1}-{2} h={3} | bbox x={4}-{5} y={6}-{7} w={8} h={9}" -f `
        ($i+1), $r.start, $r.end, ($r.end - $r.start + 1), `
        $b.minX, $b.maxX, $b.minY, $b.maxY, $b.w, $b.h)
}

Write-Host ""
Write-Host "=== Top Buildings (x=280-1080, y=0-230) ==="
$topB = @()
$inB = $false
$bs = 0
for ($x = 280; $x -lt 1080; $x++) {
    $has = $false
    for ($y = 0; $y -lt 230; $y++) {
        if (-not (IsBg $bmp $x $y $bg $tol)) { $has = $true; break }
    }
    if ($has -and -not $inB) { $inB = $true; $bs = $x }
    if (-not $has -and $inB) {
        $inB = $false
        $bb = BBox $bmp $bs 0 ($x-1) 230 $bg $tol
        if ($bb) { $topB += [PSCustomObject]@{ sx = $bs; ex = $x - 1; bb = $bb } }
    }
}
for ($i = 0; $i -lt $topB.Count; $i++) {
    $b = $topB[$i]
    $bb = $b.bb
    Write-Host ("Top {0}: x={1}-{2} | bbox x={3}-{4} y={5}-{6} w={7} h={8}" -f `
        ($i+1), $b.sx, $b.ex, $bb.minX, $bb.maxX, $bb.minY, $bb.maxY, $bb.w, $bb.h)
}

Write-Host ""
Write-Host "=== Bottom Buildings (x=280-1080, y=230-460) ==="
$botB = @()
$inB = $false
$bs = 0
for ($x = 280; $x -lt 1080; $x++) {
    $has = $false
    for ($y = 230; $y -lt 460; $y++) {
        if (-not (IsBg $bmp $x $y $bg $tol)) { $has = $true; break }
    }
    if ($has -and -not $inB) { $inB = $true; $bs = $x }
    if (-not $has -and $inB) {
        $inB = $false
        $bb = BBox $bmp $bs 230 ($x-1) 460 $bg $tol
        if ($bb) { $botB += [PSCustomObject]@{ sx = $bs; ex = $x - 1; bb = $bb } }
    }
}
for ($i = 0; $i -lt $botB.Count; $i++) {
    $b = $botB[$i]
    $bb = $b.bb
    Write-Host ("Bot {0}: x={1}-{2} | bbox x={3}-{4} y={5}-{6} w={7} h={8}" -f `
        ($i+1), $b.sx, $b.ex, $bb.minX, $bb.maxX, $bb.minY, $bb.maxY, $bb.w, $bb.h)
}

if ($rows.Count -gt 0) {
    Write-Host ""
    Write-Host "=== Chars in Row 1 (x=50-280) ==="
    $r1 = $rows[0]
    $chars = @()
    $inC = $false
    $cs = 0
    for ($x = 50; $x -lt 280; $x++) {
        $has = $false
        for ($y = $r1.start; $y -le $r1.end; $y++) {
            if (-not (IsBg $bmp $x $y $bg $tol)) { $has = $true; break }
        }
        if ($has -and -not $inC) { $inC = $true; $cs = $x }
        if (-not $has -and $inC) {
            $inC = $false
            $bb = BBox $bmp $cs $r1.start ($x-1) ($r1.end + 1) $bg $tol
            if ($bb) { $chars += [PSCustomObject]@{ sx = $cs; ex = $x - 1; bb = $bb } }
        }
    }
    for ($i = 0; $i -lt $chars.Count; $i++) {
        $c = $chars[$i]
        $bb = $c.bb
        Write-Host ("Char {0}: x={1}-{2} | bbox x={3}-{4} y={5}-{6} w={7} h={8}" -f `
            ($i+1), $c.sx, $c.ex, $bb.minX, $bb.maxX, $bb.minY, $bb.maxY, $bb.w, $bb.h)
    }
}

$bmp.Dispose()
