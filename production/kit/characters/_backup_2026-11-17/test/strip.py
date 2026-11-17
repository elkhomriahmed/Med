"""strip.py dir out.png x y w h f1 f2 ... : crops of the given frames side by side (labels on top)"""
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; x, y, w, h = map(int, sys.argv[3:7]); fs = [int(v) for v in sys.argv[7:]]
files = sorted(glob.glob(os.path.join(d, "*.png")))
S = Image.new("RGB", (w * len(fs), h + 20), "black"); D = ImageDraw.Draw(S)
for k, f in enumerate(fs):
    S.paste(Image.open(files[f]).convert("RGB").crop((x, y, x + w, y + h)), (k * w, 20)); D.text((k * w + 4, 4), str(f), fill="white")
S.save(out)
