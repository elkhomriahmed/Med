"""Neighbour-frame pop check (CLAUDE.md "Short glitches"), motion tolerant.
A pop pixel: frame f matches NEITHER neighbour even allowing a small shift (+-S px, so normal motion is not flagged),
while the two neighbours agree with each other (|f-1 - f+1| small). Same test run backwards catches things that VANISH
for one frame (content of f-1 that has no match in f but is back in f+1). Clusters >= MINPX pixels are reported.
usage: python popcheck.py <dir of PNGs> [shift_px=12] [thresh=40] [minpx=30]
Works on a 1/4-res copy (shift and minpx are in full-res pixels).
"""
import sys, glob, os
import numpy as np
from PIL import Image

d = sys.argv[1]
S = int(sys.argv[2]) if len(sys.argv) > 2 else 12
TH = float(sys.argv[3]) if len(sys.argv) > 3 else 40.0
MINPX = int(sys.argv[4]) if len(sys.argv) > 4 else 30
DS = 4
files = sorted(glob.glob(os.path.join(d, "*.png")))
fr = []
for f in files:
    im = Image.open(f).convert("RGB"); w, h = im.size
    fr.append(np.asarray(im.resize((w // DS, h // DS), Image.BILINEAR), dtype=np.float32))
s = max(1, S // DS)


def minshift(a, b):
    """per pixel: min over shifts of mean-abs colour difference between a(x) and b(x+d)"""
    H, W, _ = a.shape
    bp = np.pad(b, ((s, s), (s, s), (0, 0)), mode="edge")
    best = np.full((H, W), 1e9, np.float32)
    for dy in range(-s, s + 1):
        for dx in range(-s, s + 1):
            best = np.minimum(best, np.abs(a - bp[s + dy:s + dy + H, s + dx:s + dx + W]).mean(axis=2))
    return best


pops = []
for i in range(1, len(fr) - 1):
    a, f, b = fr[i - 1], fr[i], fr[i + 1]
    agree = np.abs(a - b).mean(axis=2) < TH * 0.5
    appear = (minshift(f, a) > TH) & (minshift(f, b) > TH) & agree        # new content only in f
    vanish = (minshift(a, f) > TH) & (minshift(b, f) > TH) & agree        # neighbours' content missing in f
    m = appear | vanish
    n = int(m.sum()) * DS * DS
    if n >= MINPX:
        ys, xs = np.nonzero(m)
        pops.append((i, os.path.basename(files[i]), n, (int(xs.mean() * DS), int(ys.mean() * DS)), (int(xs.min() * DS), int(ys.min() * DS), int(xs.max() * DS), int(ys.max() * DS))))
print(f"frames {len(fr)}  shift +-{S}px  thresh {TH}  min cluster {MINPX}px")
print(f"POPS: {len(pops)}")
for p in pops: print("  pop frame", p[0], p[1], "px", p[2], "centre", p[3], "bbox", p[4])
