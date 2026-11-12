"""Style v2 post pass on rendered frames (runs in parallel, ~0.1 s/frame):
  1. soft contact shadows under characters (polygons projected from the scene, exported per frame)
  2. bloom/glow on bright things (lamps, sun, beams, sparks)
  3. colour grade per scene mood (gentle S-curve, saturation, warm highlights / cool shadows) + vignette
Usage: python post_fx.py IN_DIR OUT_DIR config.json
config: {"shadows": "<frames.json from shadow_hook>", "grade": "night|day|morning|interior", "bloom": 0.35}"""
import sys, os, json, glob, numpy as np, cv2
from multiprocessing import Pool

GRADES={  # (lift rgb, gain rgb, saturation, contrast)
 "day":     ((0.00,0.01,0.03),(1.04,1.01,0.95),1.10,1.06),
 "morning": ((0.02,0.01,0.03),(1.06,1.00,0.92),1.08,1.05),
 "night":   ((0.01,0.02,0.06),(1.02,0.99,1.02),1.06,1.08),
 "interior":((0.01,0.01,0.03),(1.06,1.01,0.93),1.08,1.06),
}
def grade(img,kind,bloom):
    x=img.astype(np.float32)/255.0
    # bloom: bright parts glow
    if bloom>0:
        lum=x.max(-1,keepdims=True); hi=np.clip((lum-0.86)/0.14,0,1)*x
        h,w=x.shape[:2]; sm=cv2.resize(hi,(w//4,h//4),interpolation=cv2.INTER_AREA)
        g=cv2.GaussianBlur(sm,(0,0),6)+cv2.GaussianBlur(sm,(0,0),18)*0.8
        x=x+cv2.resize(g,(w,h),interpolation=cv2.INTER_LINEAR)*bloom
    lift,gain,sat,con=GRADES.get(kind,GRADES["day"])
    x=x*np.array(gain,np.float32)+np.array(lift,np.float32)*(1-x)
    x=np.clip(x,0,1); x=x+(x-x*x)*(con-1)*1.6*(x-0.5)*2   # soft S-curve around mid grey
    g=x.mean(-1,keepdims=True); x=g+(x-g)*sat
    h,w=x.shape[:2]; yy,xx=np.mgrid[0:h,0:w].astype(np.float32); d=((xx-w/2)/(w*0.75))**2+((yy-h/2)/(h*0.72))**2
    x=x*(1-0.22*np.clip(d,0,1.3)[...,None])
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
    img=shadows(img,polys); img=grade(img,kind,bloom)
    cv2.imwrite(os.path.join(out,os.path.basename(f)),img[:,:,::-1])

if __name__=="__main__":
    IN,OUT,CF=sys.argv[1],sys.argv[2],sys.argv[3]; C=json.load(open(CF)); os.makedirs(OUT,exist_ok=True)
    SH=json.load(open(C["shadows"])) if C.get("shadows") and os.path.exists(C["shadows"]) else {}
    fs=sorted(glob.glob(IN+"/f_*.png"))
    args=[(f,OUT,SH.get(str(int(os.path.basename(f)[2:6])),[]),C.get("grade","day"),C.get("bloom",0.3)) for f in fs]
    with Pool(int(C.get("procs",4))) as p: p.map(job,args,chunksize=8)
    print("POST",len(fs),"frames")
