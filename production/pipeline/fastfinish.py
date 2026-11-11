import sys,json,subprocess,numpy as np,wave
FR,WORDS,VO,OUT=sys.argv[1:5]; W=json.load(open(WORDS)); SR=44100; dur=W[-1][1]+0.5
sfx=np.zeros(int(SR*dur)+SR); rng=np.random.default_rng(1)
def add(s,t,g): i=int(max(0,t)*SR); sfx[i:i+len(s)]+=s[:len(sfx)-i]*g
def whoosh(L=0.38):
    n=int(SR*L); x=rng.standard_normal(n); sp=np.fft.rfft(x); fr=np.fft.rfftfreq(n,1/SR); sp*=np.exp(-((fr-1200)/900)**2)+0.3*np.exp(-((fr-300)/200)**2); return np.fft.irfft(sp,n)*np.sin(np.linspace(0,np.pi,n))**2/3
tt=np.arange(int(SR*0.5))/SR; clink=(np.sin(2*np.pi*3150*tt)+0.6*np.sin(2*np.pi*4730*tt))*np.exp(-tt*9)*0.5
t2=np.arange(int(SR*0.35))/SR; crack=np.convolve(rng.standard_normal(len(t2))*np.exp(-t2*14),np.ones(6)/6,'same')+0.6*np.sin(2*np.pi*110*t2)*np.exp(-t2*10)
t3=np.arange(int(SR*0.12))/SR; pop=np.sin(2*np.pi*(500-2500*t3)*t3)*np.exp(-t3*35)
F={"whoosh":(whoosh(),0.9,0.18),"clink":(clink,0.55,0),"clink2":(clink,0.22,0),"crack":(crack,0.8,0),"pop":(pop,0.25,0)}
for k,tm in json.load(open(FR+"/sfx.json")): s,g,o=F[k]; add(s,tm-o,g)
sfx/=np.abs(sfx).max()
with wave.open(FR+"/sfx.wav","wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sfx*0.6*32767).astype(np.int16).tobytes())
font="/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
dt=",".join(f"drawtext=fontfile={font}:text='{w.replace(chr(39),'').replace(',','\\,')}':fontsize='120*max(0.15\,1-exp(-abs(t-{a:.3f})*14)*cos(abs(t-{a:.3f})*22))':fontcolor=white:borderw=11:bordercolor=black:shadowx=4:shadowy=6:shadowcolor=black@0.5:x=(w-text_w)/2:y=h*0.68+60-text_h/2:enable='between(t,{a:.3f},{(W[i+1][0] if i+1<len(W) else b+0.3):.3f})'" for i,(a,b,w) in enumerate(W))
subprocess.run(["ffmpeg","-v","error","-y","-framerate","30","-i",FR+"/f_%04d.png","-i",VO,"-i",FR+"/sfx.wav","-filter_complex",
 f"[0:v]{dt}[v];[2:a]volume=0.35[s];[1:a][s]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=7[a]",
 "-map","[v]","-map","[a]","-c:v","libx264","-preset","veryfast","-crf","18","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest",OUT],check=True)
print("DONE",OUT)
