"""Neighbour-frame pop check (CLAUDE.md "Short glitches").
A pop = a tile where frame f differs from BOTH neighbours while the neighbours agree with each other.
Also flags sudden motion jumps: |f - f-1| much larger than the average of its neighbours' diffs.
usage: python popcheck.py <dir of PNGs> [tile=24] [thresh=18]
"""
import sys, glob, os
import numpy as np
from PIL import Image

d = sys.argv[1]
T = int(sys.argv[2]) if len(sys.argv) > 2 else 24
TH = float(sys.argv[3]) if len(sys.argv) > 3 else 18.0
files = sorted(glob.glob(os.path.join(d, "*.png")))
fr = [np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) for f in files]
H, W, _ = fr[0].shape
h, w = H // T, W // T


def tiles(a, b):
    x = np.abs(a - b).mean(axis=2)[: h * T, : w * T]
    return x.reshape(h, T, w, T).mean(axis=(1, 3))


pops, jumps = [], []
for i in range(1, len(fr) - 1):
    dp, dn, dpn = tiles(fr[i], fr[i - 1]), tiles(fr[i], fr[i + 1]), tiles(fr[i - 1], fr[i + 1])
    score = np.minimum(dp, dn) - dpn          # big only if f differs from both while they agree
    m = score > TH
    if m.any():
        ys, xs = np.nonzero(m)
        k = int(np.argmax(score))
        pops.append((i, os.path.basename(files[i]), int(m.sum()), float(score.max()), (int(xs[0] * T), int(ys[0] * T)), (int((k % w) * T), int((k // w) * T))))
gd = [tiles(fr[i], fr[i - 1]).mean() for i in range(1, len(fr))]
for i in range(1, len(gd) - 1):
    nb = (gd[i - 1] + gd[i + 1]) / 2
    if gd[i] > 3.0 * nb + 1.5:
        jumps.append((i + 1, os.path.basename(files[i + 1]), round(float(gd[i]), 2), round(float(nb), 2)))
print(f"frames {len(fr)}  {W}x{H}  tile {T}  thresh {TH}")
print(f"POPS: {len(pops)}")
for p in pops: print("  pop", p)
print(f"JUMPS: {len(jumps)}")
for j in jumps: print("  jump", j)
print("mean frame diff", round(float(np.mean(gd)), 2), "max", round(float(np.max(gd)), 2))
