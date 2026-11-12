"""Assemble a video: frames from segment folders + voice + library sound effects + music bed + captions + shutter flashes.
Usage: python finish_video.py config.json"""
import sys, os, json, glob, subprocess, numpy as np, wave
C=json.load(open(sys.argv[1])); FPS=30
LIB=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","library")
W=json.load(open(C["words"])); OUT=C["out"]; TMP=C["tmp"]; os.makedirs(TMP,exist_ok=True)
# 1) one continuous frame sequence (links, no copies)
seq=TMP+"/seq"; os.makedirs(seq,exist_ok=True)
for d in C["segments"]:
    for f in glob.glob(d+"/f_*.png"):
        n=os.path.basename(f); dst=f"{seq}/{n}"
        if os.path.lexists(dst): os.remove(dst)
        os.symlink(os.path.abspath(f),dst)
frames=sorted(glob.glob(seq+"/f_*.png")); n=len(frames)
first=int(os.path.basename(frames[0])[2:6]); last=int(os.path.basename(frames[-1])[2:6])
assert first==1 and last==n, f"frame gap: {first}..{last} but {n} files"
DUR=n/FPS
# 2) sound effects track (library files, trimmed, faded) + synthetic shutter clicks
SR=44100; mix=np.zeros(int(SR*(DUR+1)),np.float32)
def load(name):
    p=f"{LIB}/sfx/{name}.mp3"; raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout
    a=np.frombuffer(raw,np.float32).copy(); nz=np.where(np.abs(a)>0.02*np.abs(a).max())[0]
    return a[nz[0]:] if len(nz) else a
CAP={"whoosh":0.75,"impact":1.0,"glass_clink":0.9,"bell_ding":1.8,"gasp":0.9,"boing":0.9,"splash":1.4,"thunder":3.0,"door_creak_wood":1.6}
cache={}
def add(sig,t,g):
    i=int(max(0,t)*SR); j=min(len(mix),i+len(sig)); mix[i:j]+=sig[:j-i]*g
for ev in C["sfx"]:
    name,t,g=ev[0],ev[1],ev[2]; dur=ev[3] if len(ev)>3 else CAP.get(name,2.0)
    if name=="swish":   # soft cloth/arm swish for gestures (filtered noise, quick swell)
        n_=int(SR*0.28); tt=np.arange(n_)/SR; rng=np.random.default_rng(int(t*100)%997)
        nz=rng.standard_normal(n_); k=np.ones(18)/18; nz=np.convolve(nz,k,mode="same")
        env=np.sin(np.pi*np.clip(tt/0.28,0,1))**2; add((nz*env*0.5).astype(np.float32),t,g); continue
    if name=="shutter":
        tt=np.arange(int(SR*0.12))/SR; rng=np.random.default_rng(3)
        s=rng.standard_normal(len(tt))*np.exp(-tt*90)*0.6; s[int(SR*0.045):]+=rng.standard_normal(len(tt)-int(SR*0.045))*np.exp(-(tt[:len(tt)-int(SR*0.045)])*120)*0.5
        add(s.astype(np.float32),t,g); continue
    if name not in cache: cache[name]=load(name)
    a=cache[name]
    if len(a)<int(dur*SR): a=np.tile(a,int(dur*SR)//len(a)+1)
    a=a[:int(dur*SR)].copy(); fo=min(len(a),int(0.2*SR)); a[-fo:]*=np.linspace(1,0,fo); fi=min(len(a),int(0.03*SR)); a[:fi]*=np.linspace(0,1,fi)
    a/=max(1e-6,np.abs(a).max()); add(a,t,g)
mix/=max(1.0,np.abs(mix).max())
with wave.open(TMP+"/sfx.wav","wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767*0.9).astype(np.int16).tobytes())
# 3) captions (one word, bounce-in, fixed spot) + white flash on place changes
font="/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
def esc(s): return s.replace("\\","").replace("'","\u2019").replace(":","\\:").replace(",","\\,").replace("%","\\%")
dt=[]
for i,(a,b,w) in enumerate(W):
    e=W[i+1][0] if i+1<len(W) else min(DUR,b+0.4)
    dt.append(f"drawtext=fontfile={font}:text='{esc(w)}':fontsize='120*max(0.15\\,1-exp(-abs(t-{a:.3f})*14)*cos(abs(t-{a:.3f})*22))':fontcolor=white:borderw=11:bordercolor=black:shadowx=4:shadowy=6:shadowcolor=black@0.5:x=(w-text_w)/2:y=h*0.68+60-text_h/2:enable='gte(t,{a:.3f})*lt(t,{e:.3f})'")
for t in C.get("flashes",[]):
    dt.append(f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.85:t=fill:enable='between(t,{t-0.001:.3f},{t+1/FPS:.3f})'")
    dt.append(f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.4:t=fill:enable='between(t,{t+1/FPS:.3f},{t+2/FPS:.3f})'")
open(TMP+"/vf.txt","w").write(",".join(dt))
mus=C["music"]; mv=C.get("music_gain",0.10)
fc=(f"[0:v]{','.join(dt)}[v];"
    f"[2:a]volume=0.55[s];[3:a]atrim=0:{DUR+0.5},volume='{mv}*(1-0.4*gte(t,{C.get('music_dip',1e9)}))':eval=frame,afade=t=out:st={DUR-1.2:.2f}:d=1.2[m];"
    f"[1:a][s][m]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]")
cmd=["ffmpeg","-v","error","-y","-framerate",str(FPS),"-i",seq+"/f_%04d.png","-i",C["voice"],"-i",TMP+"/sfx.wav","-i",mus,
     "-filter_complex",fc,"-map","[v]","-map","[a]","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-t",f"{DUR:.3f}",OUT]
subprocess.run(cmd,check=True); print("DONE",OUT,round(DUR,2),"s")
