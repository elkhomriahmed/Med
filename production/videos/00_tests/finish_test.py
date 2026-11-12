"""Finish a test clip: post pass (shadows, glow, grade) -> renumber -> voice slice + words shifted -> finish_video.
Usage: python finish_test.py RENDER_DIR T0 T1 GRADE OUT.mp4 WORDS.json VOICE.wav"""
import sys, os, json, glob, subprocess
R,t0,t1,grade,out,words,voice=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),sys.argv[4],sys.argv[5],sys.argv[6],sys.argv[7]
PIPE="/home/user/Med/production/pipeline"; PY=sys.executable
tmp=R+"_fin"; os.makedirs(tmp,exist_ok=True)
json.dump({"shadows":R+"/shadows.json","grade":grade,"bloom":0.22,"procs":4},open(tmp+"/post.json","w"))
subprocess.run([PY,PIPE+"/post_fx.py",R,tmp+"/post",tmp+"/post.json"],check=True)
seq=tmp+"/seq"; os.makedirs(seq,exist_ok=True)
for f in glob.glob(seq+"/*"): os.remove(f)
for i,f in enumerate(sorted(glob.glob(tmp+"/post/f_*.png"))): os.symlink(f,f"{seq}/f_{i+1:04d}.png")
W=[[a-t0,b-t0,w] for a,b,w in json.load(open(words)) if a>=t0-0.05 and a<t1]
json.dump(W,open(tmp+"/words.json","w"))
subprocess.run(["ffmpeg","-v","error","-y","-ss",str(t0),"-to",str(t1),"-i",voice,tmp+"/voice.wav"],check=True)
ev=[[e[0],e[1]-t0]+list(e[2:]) for e in json.load(open(R+"/sfx.json"))]
cfg={"segments":[seq],"words":tmp+"/words.json","voice":tmp+"/voice.wav","sfx":ev,"flashes":[],
     "music":"/home/user/Med/production/library/music/cartoon_funny_quirky_5min.mp3","music_gain":0.10,"out":out,"tmp":tmp+"/fv"}
json.dump(cfg,open(tmp+"/finish.json","w"))
subprocess.run(["python3","-I",PIPE+"/finish_video.py",tmp+"/finish.json"],check=True)
