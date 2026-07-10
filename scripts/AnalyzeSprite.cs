using System;
using System.Drawing;

class SpriteAnalyzer
{
    static Bitmap bmp;
    static Color bg;
    const int TOL = 20;

    static bool IsBg(int x, int y)
    {
        Color p = bmp.GetPixel(x, y);
        return Math.Abs(p.R - bg.R) < TOL && Math.Abs(p.G - bg.G) < TOL && Math.Abs(p.B - bg.B) < TOL;
    }

    static Rectangle? FindBBox(int x1, int y1, int x2, int y2)
    {
        int minX = x2, minY = y2, maxX = x1, maxY = y1;
        bool found = false;
        for (int y = y1; y < y2; y++)
            for (int x = x1; x < x2; x++)
                if (!IsBg(x, y))
                {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
        return found ? Rectangle.FromLTRB(minX, minY, maxX, maxY) : null;
    }

    static void Main()
    {
        string path = @"d:\code\code\program\4-观微\docs\1.front\person.jpg";
        bmp = new Bitmap(path);
        bg = bmp.GetPixel(0, 0);
        int w = bmp.Width, h = bmp.Height;
        Console.WriteLine($"Image: {w} x {h}");
        Console.WriteLine($"BG color: R={bg.R} G={bg.G} B={bg.B}");
        Console.WriteLine();

        // Character rows (left 300px)
        Console.WriteLine("=== Character Rows (left 300px) ===");
        var rows = new System.Collections.Generic.List<(int start, int end, Rectangle bbox)>();
        bool inRow = false; int rs = 0;
        for (int y = 0; y < h; y++)
        {
            bool has = false;
            for (int x = 0; x < 300; x++) if (!IsBg(x, y)) { has = true; break; }
            if (has && !inRow) { inRow = true; rs = y; }
            if (!has && inRow)
            {
                inRow = false;
                var bb = FindBBox(0, rs, 300, y);
                if (bb.HasValue) rows.Add((rs, y - 1, bb.Value));
            }
        }
        for (int i = 0; i < rows.Count; i++)
        {
            var r = rows[i];
            Console.WriteLine($"Row {i + 1}: y={r.start}-{r.end} (h={r.end - r.start + 1})  bbox: x={r.bbox.X}-{r.bbox.Right} y={r.bbox.Y}-{r.bbox.Bottom} w={r.bbox.Width} h={r.bbox.Height}");
        }

        // Top buildings
        Console.WriteLine();
        Console.WriteLine("=== Top Row Buildings (x=280-1080, y=0-230) ===");
        var topB = new System.Collections.Generic.List<(int sx, int ex, Rectangle bb)>();
        bool inB = false; int bs = 0;
        for (int x = 280; x < 1080; x++)
        {
            bool has = false;
            for (int y = 0; y < 230; y++) if (!IsBg(x, y)) { has = true; break; }
            if (has && !inB) { inB = true; bs = x; }
            if (!has && inB)
            {
                inB = false;
                var bb = FindBBox(bs, 0, x - 1, 230);
                if (bb.HasValue) topB.Add((bs, x - 1, bb.Value));
            }
        }
        for (int i = 0; i < topB.Count; i++)
        {
            var b = topB[i];
            Console.WriteLine($"Top {i + 1}: x={b.sx}-{b.ex}  bbox: x={b.bb.X}-{b.bb.Right} y={b.bb.Y}-{b.bb.Bottom} w={b.bb.Width} h={b.bb.Height}");
        }

        // Bottom buildings
        Console.WriteLine();
        Console.WriteLine("=== Bottom Row Buildings (x=280-1080, y=230-460) ===");
        var botB = new System.Collections.Generic.List<(int sx, int ex, Rectangle bb)>();
        inB = false; bs = 0;
        for (int x = 280; x < 1080; x++)
        {
            bool has = false;
            for (int y = 230; y < 460; y++) if (!IsBg(x, y)) { has = true; break; }
            if (has && !inB) { inB = true; bs = x; }
            if (!has && inB)
            {
                inB = false;
                var bb = FindBBox(bs, 230, x - 1, 460);
                if (bb.HasValue) botB.Add((bs, x - 1, bb.Value));
            }
        }
        for (int i = 0; i < botB.Count; i++)
        {
            var b = botB[i];
            Console.WriteLine($"Bot {i + 1}: x={b.sx}-{b.ex}  bbox: x={b.bb.X}-{b.bb.Right} y={b.bb.Y}-{b.bb.Bottom} w={b.bb.Width} h={b.bb.Height}");
        }

        // Individual chars in row 1
        if (rows.Count > 0)
        {
            Console.WriteLine();
            Console.WriteLine("=== Individual Characters in Row 1 (x=50-280) ===");
            var r1 = rows[0];
            var chars = new System.Collections.Generic.List<(int sx, int ex, Rectangle bb)>();
            bool inC = false; int cs = 0;
            for (int x = 50; x < 280; x++)
            {
                bool has = false;
                for (int y = r1.start; y <= r1.end; y++) if (!IsBg(x, y)) { has = true; break; }
                if (has && !inC) { inC = true; cs = x; }
                if (!has && inC)
                {
                    inC = false;
                    var bb = FindBBox(cs, r1.start, x - 1, r1.end + 1);
                    if (bb.HasValue) chars.Add((cs, x - 1, bb.Value));
                }
            }
            for (int i = 0; i < chars.Count; i++)
            {
                var c = chars[i];
                Console.WriteLine($"Char {i + 1}: x={c.sx}-{c.ex}  bbox: x={c.bb.X}-{c.bb.Right} y={c.bb.Y}-{c.bb.Bottom} w={c.bb.Width} h={c.bb.Height}");
            }
        }

        bmp.Dispose();
    }
}
