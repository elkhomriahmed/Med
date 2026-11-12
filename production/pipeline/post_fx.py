"""Style v2 post pass on rendered frames (runs in parallel, ~0.1 s/frame):
  1. soft contact shadows under characters (polygons projected from the scene, exported per frame)
  2. bloom/glow on bright things (lamps, sun, beams, sparks)
  3. colour grade per scene mood (gentle S-curve, saturation, warm highlights / cool shadows) + vignette
Usage: python post_fx.py IN_DIR OUT_DIR config.json
config: {"shadows": "<frames.json from shadow_hook>", "grade": "night|day|morning|interior", "bloom": 0.35}"""
import sys, os, json, glob, numpy as np, cv2
from multiprocessing import Pool

GRADES={  # (lift rgb, gain rgb, saturation, contrast)
 "day":     ((0.02,0.02,0.04),(1.08,1.04,0.98),1.28,1.08),
 "morning": ((0.02,0.01,0.03),(1.06,1.00,0.92),1.08,1.05),
 "night":   ((0.01,0.02,0.06),(1.02,0.99,1.02),1.06,1.08),
 "interior":((0.01,0.01,0.03),(1.06,1.01,0.93),1.08,1.06),
}
def night_vivid(x,tint=(0.66,0.78,1.22),lift=(0.02,0.03,0.12),sat=1.35,gam=0.85):
    """Competitor-style night (style v4): hue-preserving blue moonlight. Every object keeps its own colour, lit by
    strong blue light; warm sources and light pools stay warm; whites (faces, shirts) stay bright lavender-white."""
    r,b=x[...,0],x[...,2]; mx=x.max(-1); mn=x.min(-1); s=(mx-mn)/(mx+1e-4)
    warm=(np.clip((r-b)*2.2,0,1)*np.clip(s*2,0,1)*np.clip(mx*1.8-0.3,0,1))[...,None]
    white=0.15*(np.clip((mn-0.55)/0.3,0,1)*np.clip(1-s*3,0,1))[...,None]
    t=np.array(tint,np.float32)*(1-white)+np.array((0.86,0.88,1.04),np.float32)*white
    y=x*(t*(1-warm)+np.array((0.98,0.90,0.82),np.float32)*warm)
    Lx=(0.3*x[...,0]+0.55*x[...,1]+0.15*x[...,2])[...,None]; gate=np.clip((Lx-0.06)/0.12,0,1)   # ink lines stay dark
    y=y+np.array(lift,np.float32)*(1-y)*gate; y=np.clip(y,0,1)**gam
    g=(0.3*y[...,0]+0.55*y[...,1]+0.15*y[...,2])[...,None]; return np.clip(g+(y-g)*sat,0,1)

def particles(x,fidx,kind,n=30,seed=7):
    """Floating dust motes / light specks (style v7): a few sharp small motes + some big soft out-of-focus ones in
    front of everything (depth). Drift slowly and continuously from frame to frame."""
    h,w=x.shape[:2]; rng=np.random.default_rng(seed); t=fidx/30.0
    col=np.array((1.0,0.86,0.62) if kind!="night" else (0.85,0.88,1.0),np.float32)
    layer=np.zeros((h//2,w//2,3),np.float32)
    for i in range(n):
        bx,by=rng.random(),rng.random(); vx,vy=(rng.random()-0.5)*0.012,-0.006-rng.random()*0.012
        big=rng.random()<0.12; r=(rng.uniform(12,26) if big else rng.uniform(1.4,3.0)); a=(0.035 if big else 0.45)*rng.uniform(0.5,1.0)
        px=((bx+vx*t+0.01*np.sin(t*0.7+i))%1.0)*w/2; py=((by+vy*t)%1.0)*h/2
        cv2.circle(layer,(int(px),int(py)),int(max(1,r/2)),(a*col).tolist(),-1,lineType=cv2.LINE_AA)
    layer=cv2.GaussianBlur(layer,(0,0),2.2)
    return x+cv2.resize(layer,(w,h),interpolation=cv2.INTER_LINEAR)

def grade(img,kind,bloom,fidx=0):
    x=img.astype(np.float32)/255.0
    # haze: wide warm glow around light sources (lamps, lanterns, windows) - air in the room
    lum=x.max(-1,keepdims=True); hz=np.clip((lum-0.88)/0.12,0,1)*x
    h0,w0=x.shape[:2]; sm=cv2.resize(hz,(w0//8,h0//8),interpolation=cv2.INTER_AREA)
    x=x+cv2.resize(cv2.GaussianBlur(sm,(0,0),14),(w0,h0),interpolation=cv2.INTER_LINEAR)*0.12
    # bloom: bright parts glow
    if bloom>0:
        lum=x.max(-1,keepdims=True); hi=np.clip((lum-0.93)/0.07,0,1)*x
        h,w=x.shape[:2]; sm=cv2.resize(hi,(w//4,h//4),interpolation=cv2.INTER_AREA)
        g=cv2.GaussianBlur(sm,(0,0),6)+cv2.GaussianBlur(sm,(0,0),18)*0.8
        x=x+cv2.resize(g,(w,h),interpolation=cv2.INTER_LINEAR)*bloom
    if kind=="night":
        x=night_vivid(np.clip(x,0,1)); lift,gain,sat,con=(0,0,0),(1,1,1),1.0,1.04
    else:
        lift,gain,sat,con=GRADES.get(kind,GRADES["day"])
    x=x*np.array(gain,np.float32)+np.array(lift,np.float32)*(1-x)
    x=np.clip(x,0,1); x=x+(x-x*x)*(con-1)*1.6*(x-0.5)*2   # soft S-curve around mid grey
    g=x.mean(-1,keepdims=True); x=g+(x-g)*sat
    h,w=x.shape[:2]; yy,xx=np.mgrid[0:h,0:w].astype(np.float32); d=((xx-w/2)/(w*0.75))**2+((yy-h/2)/(h*0.72))**2
    x=particles(x,fidx,kind)
    x=x*(1-0.34*np.clip(d,0,1.4)[...,None])   # cinematic vignette
    return np.clip(x*255,0,255).astype(np.uint8)

def shadows(img,polys):
    if not polys: return img
    h,w=img.shape[:2]; s=4; m=np.zeros((h//s,w//s),np.float32)
    for P in polys:
        pts=np.array([[p[0]*w/s,(1-p[1])*h/s] for p in P["pts"]],np.int32)
        layer=np.zeros_like(m); cv2.fillPoly(layer,[pts],1.0)
        layer=cv2.GaussianBlur(layer,(0,0),max(1.0,P.get("soft",0.25)*np.ptp(pts[:,1]+1)))
        m=np.maximum(m,layer*P.get("strength",0.4))
    m=cv2.resize(m,(w,h),interpolation=cv2.INTER_LINEAR)[...,None]
    return (img.astype(np.float32)*(1-m)).astype(np.uint8)

def job(a):
    f,out,polys,kind,bloom=a
    img=cv2.imread(f,cv2.IMREAD_COLOR)[:,:,::-1]
    img=shadows(img,polys); img=grade(img,kind,bloom,int(os.path.basename(f)[2:6]))
    cv2.imwrite(os.path.join(out,os.path.basename(f)),img[:,:,::-1])

if __name__=="__main__":
    IN,OUT,CF=sys.argv[1],sys.argv[2],sys.argv[3]; C=json.load(open(CF)); os.makedirs(OUT,exist_ok=True)
    SH=json.load(open(C["shadows"])) if C.get("shadows") and os.path.exists(C["shadows"]) else {}
    fs=sorted(glob.glob(IN+"/f_*.png"))
    args=[(f,OUT,SH.get(str(int(os.path.basename(f)[2:6])),[]),C.get("grade","day"),C.get("bloom",0.3)) for f in fs]
    with Pool(int(C.get("procs",4))) as p: p.map(job,args,chunksize=8)
    print("POST",len(fs),"frames")
