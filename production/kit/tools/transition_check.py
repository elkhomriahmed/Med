"""Transition sound check (2026-11-23): lists big visual changes and the 5-12 kHz sound accent around each (x median).
Every place change should show a clear accent (competitor ~8-14x). Usage: python -I tools/transition_check.py VIDEO.mp4"""
import sys, subprocess, numpy as np
p = sys.argv[1]; w, h = 54, 96
raw = subprocess.run(["ffmpeg","-loglevel","error","-i",p,"-vf",f"scale={w}:{h}","-f","rawvideo","-pix_fmt","gray","-"],capture_output=True).stdout
F = np.frombuffer(raw,np.uint8).reshape(-1,h,w).astype(np.float32)
d = np.abs(np.diff(F,axis=0)).mean((1,2))
# audio: 5-12 kHz band energy per frame (whoosh/shutter/impacts) and full energy
a = subprocess.run(["ffmpeg","-loglevel","error","-i",p,"-ac","1","-ar","32000","-f","f32le","-"],capture_output=True).stdout
A = np.frombuffer(a,np.float32); hop = 32000//30; n = len(A)//hop
spec = np.abs(np.fft.rfft(A[:n*hop].reshape(n,hop)*np.hanning(hop),axis=1)); fr = np.fft.rfftfreq(hop,1/32000)
hi = spec[:,(fr>5000)&(fr<12000)].sum(1); hi = hi/np.median(hi)
peaks = [i for i in range(2,len(d)-2) if d[i]>np.percentile(d,97) and d[i]==d[i-2:i+3].max()]
print(p, "| visual change peaks (s) with hi-band audio level (x median) within +-0.2 s:")
print("  " + "  ".join(f"{(i+1)/30:.2f}:{hi[max(0,i-6):i+7].max():.1f}" for i in peaks))
print("  median hi-band peak around random frames:", np.median([hi[max(0,i-6):i+7].max() for i in range(10,len(hi)-10,37)]).round(1))
