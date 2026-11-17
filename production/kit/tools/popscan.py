"""Glitch scan: find things that appear/vanish for 1-3 frames (a frame that differs from both neighbours while they agree).
Usage: python -I tools/popscan.py VIDEO.mp4 [--mask-captions] [--skip t1,t2,...] [--top 30]
Prints flagged frames (time, pixel count, bbox) sorted by size. Captions area (y 60-80%) can be masked: words change on purpose."""
import sys, subprocess, numpy as np
W, H = 270, 480
def frames(p):
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    while True:
        b = pr.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.int16)
args = sys.argv[1:]; path = args[0]; mask = "--mask-captions" in args
skip = [float(x) for x in args[args.index("--skip") + 1].split(",")] if "--skip" in args else []
top = int(args[args.index("--top") + 1]) if "--top" in args else 30
TH = 40
F = list(frames(path)); fps = 30; out = []
for k in (1, 2, 3):                                      # pops lasting k frames: f[i-1] ~ f[i+k], frames i..i+k-1 differ from both
    for i in range(1, len(F) - k):
        a, b = F[i - 1], F[i + k]
        same = np.abs(a - b).max(-1) < TH // 2
        diff = np.ones((H, W), bool)
        for j in range(k): diff &= (np.abs(F[i + j] - a).max(-1) > TH) & (np.abs(F[i + j] - b).max(-1) > TH)
        m = same & diff
        if mask: m[int(H * 0.60):int(H * 0.80), :] = False
        n = int(m.sum())
        if n >= 12:
            t = i / fps
            ys, xs = np.nonzero(m)
            bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
            if bw * bh > 0.35 * W * H: continue          # whole-frame change = camera motion / flight, not a local pop
            if n < 0.04 * bw * bh and n < 60: continue   # scattered texture shimmer in a moving shot
            if any(abs(t - s) < 0.1 for s in skip): continue
            out.append((n, i, k, (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))))
out.sort(reverse=True)
print(f"{len(F)} frames scanned, {len(out)} pops flagged (>=12 px at {W}x{H})")
for n, i, k, bb in out[:top]: print(f"  frame {i:5d}  t={i/fps:6.2f}s  len {k}  px {n:5d}  bbox {bb}")
