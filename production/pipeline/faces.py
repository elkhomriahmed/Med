"""Face layers in the competitors' style: small eyes with heavy upper lids, thick tapered brows, small mouths,
brush-like tapered strokes. Canvas = 2.6 x head radius, centred on the head. Drawn at 2x, downsampled."""
from PIL import Image, ImageDraw
import math, os
INK=(32,22,20,255); WHITE=(255,255,255,255); MOUTH=(120,36,34,255); TEETH=(250,248,244,255); BEARD=(168,170,182,255)
S=2048; C=S//2; RP=S/2.6
FS=0.92
def P(x,y): return (C+x*RP*FS, C-y*RP*FS)
SC=1.35
def W(w): return max(2,int(w*RP*1.35))

def stroke(d,pts,w0,w1=None,w_mid=None):
    """Tapered brush stroke along points (head-radius units). Width: w0 at start, w_mid in the middle, w1 at end."""
    w1=w0 if w1 is None else w1; w_mid=max(w0,w1) if w_mid is None else w_mid
    import random
    rnd=random.Random(int(sum(abs(a)+abs(b) for a,b in pts)*1000))
    pts=[(a+rnd.uniform(-0.006,0.006),b+rnd.uniform(-0.006,0.006)) for a,b in pts]   # hand-drawn wobble
    n=len(pts)
    for i in range(n-1):
        t=(i+0.5)/(n-1); w=(w0*(1-2*t)+w_mid*2*t) if t<0.5 else (w_mid*(2-2*t)+w1*(2*t-1))
        d.line([P(*pts[i]),P(*pts[i+1])],fill=INK,width=W(w))
        r=W(w)/2; x,y=P(*pts[i+1]); d.ellipse([x-r,y-r,x+r,y+r],fill=INK)
def arc_pts(cx,cy,rx,ry,a0,a1,n=24): return [(cx+rx*math.cos(math.radians(a0+(a1-a0)*i/(n-1))),cy+ry*math.sin(math.radians(a0+(a1-a0)*i/(n-1)))) for i in range(n)]
def blob(d,pts,fill,outline=True,w=0.055):
    d.polygon([P(*p) for p in pts],fill=fill)
    if outline: stroke(d,pts+[pts[0]],w)

EX,EY=0.25,0.07
def eye(d,x,kind,s):
    if kind=="open":        # small oval pupil
        d.ellipse([*P(x-0.075,EY+0.1),*P(x+0.075,EY-0.1)],fill=INK)
    elif kind=="lidded":    # heavy upper lid over a half pupil (smug / bored)
        d.chord([*P(x-0.09,EY+0.08),*P(x+0.09,EY-0.12)],180,360,fill=INK) if False else None
        d.pieslice([*P(x-0.085,EY+0.07),*P(x+0.085,EY-0.11)],0,180,fill=INK)
        stroke(d,[(x-0.15,EY+0.0),(x+0.13,EY+0.02*s*0)],0.06,0.05,0.075)
    elif kind=="wide":
        d.ellipse([*P(x-0.13,EY+0.15),*P(x+0.13,EY-0.15)],fill=WHITE,outline=INK,width=W(0.045))
        d.ellipse([*P(x-0.05,EY+0.05),*P(x+0.05,EY-0.05)],fill=INK)
    elif kind=="happy":     # upward arcs
        stroke(d,arc_pts(x,EY-0.03,0.11,0.09,10,170),0.03,0.03,0.07)
    elif kind=="closed":
        stroke(d,arc_pts(x,EY+0.04,0.11,0.06,190,350),0.03,0.03,0.065)
    elif kind=="squint":
        stroke(d,[(x-0.12,EY+0.02),(x+0.12,EY-0.01)],0.04,0.04,0.07)
def brow(d,x,kind,s):
    by=EY+0.22; i=-s   # i: +1 toward the nose
    if kind=="cocked":   # asymmetric: right brow raised, left flat
        kind="raised" if s>0 else "calm"
    shapes={
     "calm":   [(x-0.13*s*-1,by-0.01),(x,by+0.02),(x+0.13*s*-1,by)],
     "raised": [(x-0.13*s*-1,by+0.04),(x,by+0.1),(x+0.13*s*-1,by+0.05)],
     "angry":  [(x+0.14*s,by+0.06),(x,by+0.02),(x-0.12*s,by-0.06)],
     "worried":[(x+0.14*s,by-0.03),(x,by+0.03),(x-0.12*s,by+0.08)],
     "flat":   [(x-0.13,by),(x+0.13,by)],
    }
    p=shapes[kind]; p=sorted(p,key=lambda q:q[0]) if kind in("flat",) else p
    stroke(d,p,0.03,0.05,0.075)
MY=-0.3
def mouth(d,kind):
    if kind=="smirk": stroke(d,[(-0.12,MY+0.01),(0.0,MY-0.035),(0.1,MY-0.02),(0.17,MY+0.05)],0.025,0.035,0.05)
    elif kind=="smile": stroke(d,arc_pts(0,MY+0.06,0.15,0.1,200,340),0.025,0.025,0.05)
    elif kind=="flat": stroke(d,[(-0.09,MY),(0.09,MY)],0.035,0.035,0.045)
    elif kind=="frown": stroke(d,arc_pts(0,MY-0.08,0.12,0.07,20,160),0.025,0.025,0.05)
    elif kind=="o": d.ellipse([*P(-0.05,MY+0.06),*P(0.05,MY-0.07)],fill=MOUTH,outline=INK,width=W(0.035))
    elif kind=="open":
        pts=arc_pts(0,MY+0.04,0.13,0.15,180,360); blob(d,[(-0.13,MY+0.04)]+pts,MOUTH,True,0.04)
    elif kind=="grin":
        pts=[(-0.2,MY+0.05)]+arc_pts(0,MY+0.05,0.2,0.15,180,360); blob(d,pts,TEETH,True,0.04)
        for k in (-0.1,0,0.1): stroke(d,[(k,MY+0.04),(k,MY-0.08)],0.015)
        stroke(d,[(-0.18,MY-0.02),(0.18,MY-0.02)],0.015)
    elif kind=="shout":
        d.ellipse([*P(-0.12,MY+0.08),*P(0.12,MY-0.18)],fill=MOUTH,outline=INK,width=W(0.04))
        d.chord([*P(-0.09,MY+0.06),*P(0.09,MY-0.04)],180,360,fill=TEETH)
    elif kind=="grit":
        blob(d,[(-0.16,MY+0.04),(0.16,MY+0.04),(0.16,MY-0.07),(-0.16,MY-0.07)],TEETH,True,0.035)
        for k in (-0.08,0,0.08): stroke(d,[(k,MY+0.04),(k,MY-0.07)],0.012)
        stroke(d,[(-0.16,MY-0.015),(0.16,MY-0.015)],0.012)
def beard(d):
    # compact chin beard + moustache (small, like the competitors' facial hair)
    pts=[(-0.26,-0.33),(-0.12,-0.31),(0.0,-0.33),(0.12,-0.31),(0.26,-0.33),(0.24,-0.42),(0.17,-0.5),(0.1,-0.47),(0.05,-0.56),(0.0,-0.5),(-0.05,-0.56),(-0.1,-0.47),(-0.17,-0.5),(-0.24,-0.42)]
    blob(d,pts,BEARD,True,0.045)
    for s in (-1,1):
        blob(d,[(0.0,-0.2),(s*0.09,-0.15),(s*0.2,-0.17),(s*0.25,-0.24),(s*0.15,-0.27),(s*0.03,-0.25)],BEARD,True,0.035)
    return
def _old_beard(d):
    # drawn beard inside the head silhouette, scalloped lower edge, ink outline -> clean inner line
    top=[(-0.56,-0.37),(-0.4,-0.22),(-0.2,-0.2),(-0.08,-0.23),(0.08,-0.23),(0.2,-0.2),(0.4,-0.22),(0.56,-0.37)]
    bot=[]
    for i in range(9):
        a=math.radians(-160+140*i/8); x=0.6*math.cos(a); y=-0.2+0.5*math.sin(a)
        bot.append((x,y))
    scal=[]
    for i in range(len(bot)-1):
        (x0,y0),(x1,y1)=bot[i],bot[i+1]; mx,my=(x0+x1)/2,(y0+y1)/2
        nx,ny=mx,my+0.2; L=math.hypot(nx,ny); scal+= [(x0,y0),(mx+0.04*nx/L,my+0.04*ny/L)]
    scal.append(bot[-1])
    pts=list(reversed(top))[::-1]
    shape=top[::-1]+scal  # right-to-left top, then left-to-right bottom
    shape=[(x,y) for x,y in shape]
    blob(d,[(0.56,-0.37)]+[p for p in reversed(top)][1:]+scal[1:],BEARD,True,0.05)
    # moustache
    for s in (-1,1):
        blob(d,[(0.0,-0.2),(s*0.1,-0.13),(s*0.22,-0.15),(s*0.28,-0.23),(s*0.17,-0.26),(s*0.04,-0.25)],BEARD,True,0.035)
def glasses(d):
    for s in (-1,1): d.ellipse([*P(s*EX-0.17,EY+0.17),*P(s*EX+0.17,EY-0.17)],outline=INK,width=W(0.035))
    stroke(d,[(-0.16,EY+0.02),(0.16,EY+0.02)],0.03)

EXPR={ # eyes, brows, mouth
 "neutral":("open","calm","flat"), "smug":("lidded","cocked","smirk"), "happy":("happy","raised","grin"),
 "laugh":("happy","raised","open"), "shock":("wide","raised","o"), "scream":("wide","raised","shout"),
 "angry":("open","angry","grit"), "furious":("squint","angry","shout"), "worried":("open","worried","frown"),
 "skeptical":("lidded","cocked","flat"), "sleepy":("closed","calm","flat"), "evil":("lidded","angry","smirk"),
 "proud":("closed","raised","smile"), "talk":("open","calm","o"),
}
def make(path,expr,extra=()):
    e,b,m=EXPR[expr]
    im=Image.new("RGBA",(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if "beard" in extra: beard(d)
    for s in (-1,1):
        x=s*EX; eye(d,x,e,s); brow(d,x,b,s)
    if "glasses" in extra: glasses(d)
    if "beard" in extra:
        if m in ("open","shout","o","grin","grit"): mouth(d,m)
    else: mouth(d,m)
    im.resize((1024,1024),Image.LANCZOS).save(path)
CAST={"keeper":("beard",),"engineer":("glasses",)}
def build(outdir):
    os.makedirs(outdir,exist_ok=True)
    for name,extra in CAST.items():
        for k in EXPR: make(f"{outdir}/{name}_{k}.png",k,extra)
if __name__=="__main__":
    import sys; build(sys.argv[1] if len(sys.argv)>1 else "assets/faces")
    print("faces ok")
