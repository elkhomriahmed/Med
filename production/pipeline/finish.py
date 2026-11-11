"""Post: glow/shafts + word captions per frame, synth SFX, mix to -14 LUFS, encode 1080x1920 30fps."""
import sys, os, json, glob, subprocess, numpy as np, cv2, wave
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from post_fx import post
FR,WORDS,VO,OUT=sys.argv[1:5]; FPS=30
W=json.load(open(WORDS))
CH=[[0,1],[2,3,4],[5,6],[7],[8,9,10],[11,12,13],[14,15],[16],[17],[18,19]]  # word index groups (1-3 words)
chunks=[(W[g[0]][0],(W[CH[i+1][0]][0] if i+1<len(CH) else W[g[-1]][1]+0.3)," ".join(W[j][2] for j in g)) for i,g in enumerate(CH)]
FONT=ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",78)
def caption(img,text):
    d=ImageDraw.Draw(img); w=d.textlength(text,font=FONT); x=(img.width-w)/2; y=int(img.height*0.68)
    sh=Image.new("RGBA",img.size,(0,0,0,0)); ds=ImageDraw.Draw(sh); ds.text((x+4,y+6),text,font=FONT,fill=(0,0,0,150)); sh=sh.filter(ImageFilter.GaussianBlur(4))
    img.alpha_composite(sh); d=ImageDraw.Draw(img); d.text((x,y),text,font=FONT,fill=(255,255,255,255),stroke_width=7,stroke_fill=(0,0,0,255))
os.makedirs(FR+"/post",exist_ok=True)
fs=sorted(glob.glob(FR+"/f_*.png"))
for i,f in enumerate(fs):
    t=i/FPS; o=f"{FR}/post/p_{i:04d}.png"; post(f,o,shaft=0.35,bloom=0.4)
    im=Image.open(o).convert("RGBA")
    for a,b,txt in chunks:
        if a<=t<b: caption(im,txt)
    im.convert("RGB").save(o)
# ---- SFX ----
SR=44100; dur=len(fs)/FPS; sfx=np.zeros(int(SR*dur)+SR)
def add(sig,t,g): s=int(t*SR); sfx[s:s+len(sig)]+=sig[:len(sfx)-s]*g
rng=np.random.default_rng(1)
def whoosh(L=0.38):
    n=int(SR*L); x=rng.standard_normal(n); env=np.sin(np.linspace(0,np.pi,n))**2
    spec=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR); spec*=np.exp(-((fr-1200)/900)**2)+0.3*np.exp(-((fr-300)/200)**2); return np.fft.irfft(spec,n)*env/3
def clink():
    n=int(SR*0.5); tt=np.arange(n)/SR; return (np.sin(2*np.pi*3150*tt)+0.6*np.sin(2*np.pi*4730*tt)+0.3*np.sin(2*np.pi*6900*tt))*np.exp(-tt*9)*0.5
def crack():
    n=int(SR*0.35); tt=np.arange(n)/SR; x=rng.standard_normal(n)*np.exp(-tt*14); return np.convolve(x,np.ones(6)/6,'same')+0.6*np.sin(2*np.pi*110*tt)*np.exp(-tt*10)
add(clink(),W[4][0]+0.05,0.5); add(whoosh(),1.40,0.9); add(whoosh(),3.38,0.9); add(crack(),W[17][0]+0.05,0.8)
for k,(a,_,_) in enumerate([(1.85,0,0),(2.25,0,0),(2.65,0,0)]): add(clink()*0.6,a,0.25)
sfx/=max(1e-6,np.abs(sfx).max()); 
with wave.open(FR+"/sfx.wav","wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sfx*0.6*32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg","-v","error","-y","-framerate","30","-i",FR+"/post/p_%04d.png","-i",VO,"-i",FR+"/sfx.wav",
 "-filter_complex","[2:a]volume=0.35[s];[1:a][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=7[a]",
 "-map","0:v","-map","[a]","-c:v","libx264","-preset","medium","-crf","17","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest",OUT],check=True)
print("DONE",OUT)
