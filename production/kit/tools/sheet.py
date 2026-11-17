"""Contact sheet: grab frames at given times from a video and tile them with labels.
Usage: python -I tools/sheet.py VIDEO.mp4 OUT.jpg t1,t2,... [cols]"""
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw
v, out, ts = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
tw, th = 270, 480; ims = []
for t in ts:
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-ss", f"{t:.3f}", "-frames:v", "1", "-vf", f"scale={tw}:{th}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    im = Image.fromarray(np.frombuffer(b, np.uint8).reshape(th, tw, 3)) if len(b) == tw * th * 3 else Image.new("RGB", (tw, th))
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 70, 16], fill=(0, 0, 0)); d.text((3, 2), f"{t:.2f}s", fill=(255, 255, 0)); ims.append(im)
rows = (len(ims) + cols - 1) // cols; S = Image.new("RGB", (cols * tw, rows * th))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * tw, (i // cols) * th))
S.save(out, quality=88); print(out)
