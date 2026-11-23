"""Palette check (2026-11-23): hue share of saturated pixels, saturation, darks/brights, dominant hue family per second.
Usage: python -I tools/palette_check.py VIDEO.mp4 [REFERENCE.mp4]  (compare against analysis/astronauts_flush numbers)"""
import sys, subprocess, numpy as np, colorsys
def frames(path, fps=1, w=90):
    h = int(w*16/9)
    raw = subprocess.run(["ffmpeg","-loglevel","error","-i",path,"-vf",f"fps={fps},scale={w}:{h}","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(-1,h,w,3)/255.0
def stats(path):
    F = frames(path)
    mx = F.max(-1); mn = F.min(-1); s = np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0); v = mx
    r,g,b = F[...,0],F[...,1],F[...,2]
    hue = (np.degrees(np.arctan2(np.sqrt(3)*(g-b), 2*r-g-b)) % 360)
    sig = s>0.25
    hist = np.histogram(hue[sig], bins=12, range=(0,360))[0]; hist = hist/hist.sum()
    print(path)
    print("  mean sat %.2f | sat of saturated px %.2f | share px sat>0.25: %.2f | share px sat>0.6: %.3f" % (s.mean(), s[sig].mean(), sig.mean(), (s>0.6).mean()))
    print("  mean value %.2f | dark px (v<0.25) %.2f | bright px (v>0.85) %.2f" % (v.mean(), (v<0.25).mean(), (v>0.85).mean()))
    print("  hue share (30deg bins from red):", " ".join(f"{int(i*30)}:{h:.2f}" for i,h in enumerate(hist)))
    # per-second dominant hue family
    fam = []
    for f, ss, hh in zip(F, s, hue):
        m = ss>0.25
        if m.mean() < 0.05: fam.append("grey"); continue
        hb = np.histogram(hh[m],bins=6,range=(0,360))[0].argmax(); fam.append(["red","yel","grn","cyn","blu","mag"][hb])
    print("  per-second dominant:", " ".join(fam))
for p in sys.argv[1:]: stats(p)
