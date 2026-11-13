"""Assemble video 1 (style v11): post pass per segment (its own grade) -> one frame sequence with dissolves where segments
overlap -> captions, sound effects, music, voice (finish_video.py).  Usage: python assemble_v11.py SCRATCH"""
import sys, os, json, glob, subprocess, numpy as np, cv2
S=sys.argv[1]; R=S+"/v11"; PIPE="/home/user/Med/production/pipeline"; PY=S+"/bvenv/bin/python"
V=os.path.dirname(os.path.abspath(__file__))
SEGS=["H","A","A2","B1","B2","T","C"]
for sg in SEGS:   # 1) post pass per segment
    d=f"{R}/{sg}"; meta=json.load(open(d+"/meta.json")); out=f"{R}/{sg}_post"
    if os.path.isdir(out) and len(glob.glob(out+"/f_*.png"))==len(glob.glob(d+"/f_*.png")): continue
    json.dump({"shadows":d+"/shadows.json","grade":meta["grade"],"bloom":0.22,"procs":4},open(d+"/post.json","w"))
    subprocess.run([PY,PIPE+"/post_fx.py",d,out,d+"/post.json"],check=True)
# 2) one sequence; overlapping frames are dissolves (linear blend from the earlier to the later segment)
frames={}
for sg in SEGS:
    for f in glob.glob(f"{R}/{sg}_post/f_*.png"): frames.setdefault(int(os.path.basename(f)[2:6]),[]).append((sg,f))
seq=R+"/seq"; os.makedirs(seq,exist_ok=True)
for f in glob.glob(seq+"/*"): os.remove(f)
N=max(frames); assert min(frames)==1 and len(frames)==N, f"gap in frames: {min(frames)}..{N} vs {len(frames)}"
spans={sg:(min(k for k,v in frames.items() if any(s==sg for s,_ in v)),max(k for k,v in frames.items() if any(s==sg for s,_ in v))) for sg in SEGS}
for f,lst in sorted(frames.items()):
    dst=f"{seq}/f_{f:04d}.png"
    if len(lst)==1: os.symlink(lst[0][1],dst); continue
    (sa,fa),(sb,fb)=sorted(lst,key=lambda x:SEGS.index(x[0]))[:2]
    a0,a1=spans[sb][0],spans[sa][1]; w=(f-a0+1)/(a1-a0+2)
    A=cv2.imread(fa).astype(np.float32); B=cv2.imread(fb).astype(np.float32)
    cv2.imwrite(dst,(A*(1-w)+B*w).astype(np.uint8))
# 3) sound + captions + music + voice
sfx=[]
for sg in SEGS: sfx+=json.load(open(f"{R}/{sg}/sfx.json"))
sfx+=[("whoosh",4.20,0.5),("whoosh",28.75,0.35),("whoosh",34.35,0.35),("whoosh",40.2,0.35),("whoosh",44.0,0.35),("whoosh",46.25,0.4)]
cfg={"segments":[seq],"words":S+"/v1/words.json","voice":S+"/v1/vo_fast.wav","sfx":sfx,"flashes":[],
     "music":"/home/user/Med/production/library/music/cartoon_funny_quirky_5min.mp3","music_gain":0.10,
     "out":V+"/lighthouse_mercury_v11.mp4","tmp":R+"/fin"}
json.dump(cfg,open(R+"/finish.json","w"))
subprocess.run(["python3","-I",PIPE+"/finish_video.py",R+"/finish.json"],check=True)
