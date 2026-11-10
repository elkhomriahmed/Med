"""Draws face layers. Canvas covers 2.6 x head radius so beards can hang below the chin.
Drawn at 2x and downsampled for smooth, thick ink lines."""
from PIL import Image, ImageDraw
import os
INK=(30,20,18,255); WHITE=(255,255,255,255)
S=2048; C=S//2; RP=S/2.6          # pixels per head radius
def P(x,y): return (C+x*RP, C-y*RP)
def box(x0,y0,x1,y1): a=P(x0,y1); b=P(x1,y0); return [a[0],a[1],b[0],b[1]]
LW=int(0.08*RP)
def eyes(d,kind,ex=0.3,ey=0.1,size=1.25):
    for s in (-1,1):
        x=s*ex
        if kind=="dot": d.ellipse(box(x-0.075*size,ey-0.1*size,x+0.075*size,ey+0.1*size),fill=INK)
        elif kind=="smug":
            d.chord(box(x-0.17,ey-0.15,x+0.17,ey+0.15),180,360,fill=INK); d.line([P(x-0.21,ey),P(x+0.2,ey)],fill=INK,width=LW)
        elif kind=="wide":
            d.ellipse(box(x-0.2,ey-0.24,x+0.2,ey+0.24),fill=WHITE,outline=INK,width=int(LW*0.8)); d.ellipse(box(x-0.08,ey-0.09,x+0.08,ey+0.09),fill=INK)
        elif kind=="happy": d.arc(box(x-0.18,ey-0.15,x+0.18,ey+0.18),200,340,fill=INK,width=LW)
        elif kind=="closed": d.line([P(x-0.17,ey-0.02),P(x+0.17,ey-0.02)],fill=INK,width=LW)
        elif kind=="squint": d.line([P(x-0.13,ey+0.04),P(x+0.13,ey-0.04*s*-1)],fill=INK,width=LW)
def brows(d,kind,ex=0.3,by=0.36):
    for s in (-1,1):
        x=s*ex
        if kind=="flat": d.line([P(x-0.15,by),P(x+0.15,by)],fill=INK,width=LW)
        elif kind=="up": d.arc(box(x-0.16,by-0.08,x+0.16,by+0.14),200,340,fill=INK,width=LW)
        elif kind=="angry": d.line([P(x-0.16,by+(0.08 if s<0 else -0.04)),P(x+0.16,by+(-0.04 if s<0 else 0.08))],fill=INK,width=LW)
        elif kind=="skeptical":
            if s<0: d.arc(box(x-0.16,by-0.02,x+0.16,by+0.24),200,340,fill=INK,width=LW)
            else: d.line([P(x-0.16,by-0.04),P(x+0.16,by-0.04)],fill=INK,width=LW)
        elif kind=="worried": d.line([P(x-0.16,by+(-0.04 if s<0 else 0.08)),P(x+0.16,by+(0.08 if s<0 else -0.04))],fill=INK,width=LW)
def mouth(d,kind,my=-0.4):
    if kind=="smirk": d.arc(box(-0.18,my-0.06,0.32,my+0.22),20,150,fill=INK,width=LW)
    elif kind=="smile": d.arc(box(-0.26,my-0.06,0.26,my+0.26),20,160,fill=INK,width=LW)
    elif kind=="flat": d.line([P(-0.18,my),P(0.18,my)],fill=INK,width=LW)
    elif kind=="frown": d.arc(box(-0.2,my-0.14,0.2,my+0.14),200,340,fill=INK,width=LW)
    elif kind=="o": d.ellipse(box(-0.09,my-0.13,0.09,my+0.1),fill=INK)
    elif kind=="grin":
        d.chord(box(-0.3,my-0.2,0.3,my+0.14),0,180,fill=WHITE,outline=INK,width=int(LW*0.8))
        for i in range(-2,3): d.line([P(i*0.1,my+0.02),P(i*0.1,my-0.18)],fill=INK,width=LW//3)
        d.line([P(-0.29,my-0.06),P(0.29,my-0.06)],fill=INK,width=LW//3)
    elif kind=="open": d.chord(box(-0.17,my-0.24,0.17,my+0.1),0,180,fill=(120,32,30,255),outline=INK,width=int(LW*0.8))
    elif kind=="shout":
        d.ellipse(box(-0.17,my-0.26,0.17,my+0.08),fill=(120,32,30,255),outline=INK,width=int(LW*0.8))
def beard(d):
    BW=(248,247,242,255)
    import math
    pts=[]
    for i in range(0,41):
        th=math.radians(-92+184*i/40); k=1+0.03*math.cos(i*math.pi/2.5)
        pts.append(P(0.9*math.sin(th)*k,-0.26-1.0*math.cos(th)*k))
    d.polygon(pts,fill=BW)
    d.line(pts,fill=INK,width=LW,joint="curve")
    d.chord(box(-0.42,-0.42,0.02,-0.12),180,360,fill=BW,outline=INK,width=int(LW*0.7))
    d.chord(box(-0.02,-0.42,0.42,-0.12),180,360,fill=BW,outline=INK,width=int(LW*0.7))
def moustache(d):
    BW=(248,247,242,255)
    d.chord(box(-0.36,-0.4,0.02,-0.14),180,360,fill=BW,outline=INK,width=int(LW*0.7))
    d.chord(box(-0.02,-0.4,0.36,-0.14),180,360,fill=BW,outline=INK,width=int(LW*0.7))
def glasses(d,ex=0.3,ey=0.1):
    for s in (-1,1): d.ellipse(box(s*ex-0.21,ey-0.21,s*ex+0.21,ey+0.21),outline=INK,width=int(LW*0.8))
    d.line([P(-0.09,ey),P(0.09,ey)],fill=INK,width=int(LW*0.7))
def make(path,e,m,b=None,extra=()):
    im=Image.new("RGBA",(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if "beard" in extra: moustache(d)
    eyes(d,e); brows(d,b) if b else None; mouth(d,m,-0.42)
    if "glasses" in extra: glasses(d)
    im.resize((1024,1024),Image.LANCZOS).save(path)
EXPR={"smug":("smug","smirk","flat"),"happy":("happy","grin",None),"neutral":("dot","flat","flat"),
      "shock":("wide","open","up"),"angry":("dot","shout","angry"),"worried":("dot","frown","worried"),
      "laugh":("happy","open",None),"sleepy":("closed","flat",None),
      "skeptical":("dot","flat","skeptical"),"evil":("smug","smirk","angry"),"panic":("wide","shout","worried")}
def build(name,extra,outdir):
    os.makedirs(outdir,exist_ok=True)
    for k,(e,m,b) in EXPR.items(): make(f"{outdir}/{name}_{k}.png",e,m,b,extra)
if __name__=="__main__":
    import sys; out=sys.argv[1] if len(sys.argv)>1 else "assets/faces"
    build("keeper",("beard",),out); build("engineer",("glasses",),out); print("faces ok")
