"""Face set 'folkm' = the folk face with a bushy scalloped MOUSTACHE (no beard), drawn in the exact face style
(same canvas, ink strokes, BEARD fill + ink outline as the keeper's moustache, larger and standalone).
Usage (from production/): python -I kit/tools/faces_moustache.py kit/public/faces"""
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "pipeline"))
import faces as F
from PIL import Image, ImageDraw
def moustache(d):
    # two bushy rounded lobes under the nose, parted in the middle; lower edge = 3 soft round scallops per side
    for s in (-1, 1):
        pts = [(s * 0.015, -0.17)]
        pts += [(s * (0.015 + 0.36 * t), -0.17 + 0.07 * math.sin(math.pi * t) - 0.05 * t) for t in [i / 10 for i in range(1, 11)]]  # arched top
        pts += [(s * 0.40, -0.25)]                                                               # rounded outer tip
        cx = [0.32, 0.20, 0.08]                                                                  # scallop centres, outer -> inner
        for c in cx:
            for i in range(9):                                                                   # half-circle bump hanging down
                a = math.pi * i / 8; pts.append((s * (c + 0.06 * math.cos(a)), -0.255 - 0.045 * math.sin(a)))
        pts += [(s * 0.015, -0.25)]
        F.blob(d, pts, F.BEARD, True, 0.04)
def make(path, expr, variant=None):
    e, b, m = F.EXPR[expr]
    if variant == "blink": e = "closed"
    if variant == "A": m = "open"
    if variant == "O": m = "o"
    if variant == "E": m = "grit"
    if variant == "talk": m = {"flat": "o", "smirk": "open", "smile": "open", "frown": "o", "grin": "open", "grit": "shout", "o": "open", "open": "o", "shout": "open"}.get(m, "open")
    im = Image.new("RGBA", (F.S, F.S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for s in (-1, 1):
        x = s * F.EX; F.eye(d, x, e, s); F.brow(d, x, b, s)
    F.mouth(d, m)                     # mouth first, the moustache sits over its top edge like a real one
    moustache(d)
    im.resize((1024, 1024), Image.LANCZOS).save(path)
out = sys.argv[1]; n = 0
for k in F.EXPR:
    gz = [0.0] + ([-1.0, 1.0] if F.EXPR[k][0] in F.GAZE_KINDS else [])
    for gv in gz:
        F.GAZE = gv; suf = "" if gv == 0 else ("_L" if gv < 0 else "_R")
        make(f"{out}/folkm_{k}{suf}.png", k); make(f"{out}/folkm_{k}_talk{suf}.png", k, "talk")
        for v in ("A", "O", "E"): make(f"{out}/folkm_{k}_{v}{suf}.png", k, v)
        n += 5
        if gv == 0: make(f"{out}/folkm_{k}_blink.png", k, "blink"); n += 1
print(n, "folkm faces")
