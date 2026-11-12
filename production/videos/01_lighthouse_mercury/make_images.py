"""Backdrops for video 1: panoramas around the lamp room (night / morning) and cottage window views."""
from PIL import Image, ImageDraw, ImageFilter
import random, math, os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets"); os.makedirs(OUT,exist_ok=True)
def grad(d,W,H,top,bot,y0=0,y1=None):
    y1=y1 or H
    for y in range(y0,y1):
        t=(y-y0)/max(1,y1-y0-1); d.line([0,y,W,y],fill=tuple(int(a+(b-a)*t) for a,b in zip(top,bot)))
def pano(name,night):
    W,H=4096,1024; im=Image.new("RGB",(W,H)); d=ImageDraw.Draw(im); HZ=int(H*0.56); random.seed(4)
    if night:
        grad(d,W,H,(10,16,48),(38,62,118),0,HZ); grad(d,W,H,(14,30,66),(6,14,36),HZ,H)
        for _ in range(500):
            x,y=random.randrange(W),random.randrange(int(HZ*0.9)); r=random.choice((1,1,1,2,3)); d.ellipse([x-r,y-r,x+r,y+r],fill=(235,240,255))
        mx=int(W*0.62); d.ellipse([mx-70,140,mx+70,280],fill=(250,246,215))
        for y in range(HZ+6,H,9):   # moonlight path on the water
            w=int(14+(y-HZ)*0.5); d.line([mx-w+random.randint(-20,20),y,mx+w+random.randint(-20,20),y],fill=(190,200,230),width=3)
        for _ in range(220):
            x=random.randrange(W); y=random.randrange(HZ+8,H); d.line([x,y,x+random.randint(20,70),y],fill=(40,70,120),width=2)
        isl=(30,40,62)
    else:
        grad(d,W,H,(120,178,236),(250,214,170),0,HZ); grad(d,W,H,(66,140,190),(30,92,150),HZ,H)
        sx=int(W*0.30); d.ellipse([sx-90,HZ-260,sx+90,HZ-80],fill=(255,244,200))
        for _ in range(14):
            cx,cy=random.randrange(W),random.randrange(80,HZ-200); s=random.uniform(0.7,1.4)
            for dx,dy,r in((-60,10,48),(0,-14,62),(60,8,50),(25,24,44),(-25,24,44)): d.ellipse([cx+dx*s-r*s,cy+dy*s-r*s,cx+dx*s+r*s,cy+dy*s+r*s],fill=(255,255,255))
        for _ in range(260):
            x=random.randrange(W); y=random.randrange(HZ+8,H); d.line([x,y,x+random.randint(20,70),y],fill=(150,200,235),width=2)
        isl=(92,120,96)
    for cx,w,h in ((int(W*0.12),520,70),(int(W*0.83),700,90),(int(W*0.45),300,40)):
        d.polygon([(cx-w//2,HZ),(cx-w//6,HZ-h),(cx+w//8,HZ-h*0.7),(cx+w//2,HZ)],fill=isl)
    im.filter(ImageFilter.GaussianBlur(0.8)).save(f"{OUT}/{name}.png")
def view(name,winter):
    W,H=1024,768; im=Image.new("RGB",(W,H)); d=ImageDraw.Draw(im); HZ=520; random.seed(9)
    if not winter:
        grad(d,W,H,(70,140,230),(170,215,250),0,HZ); d.rectangle([0,HZ,W,H],fill=(26,96,168))
        for cx,cy in ((200,140),(640,100),(860,240)):
            for dx,dy,r in((-60,10,48),(0,-14,62),(60,8,50),(25,24,44),(-25,24,44)): d.ellipse([cx+dx-r,cy+dy-r,cx+dx+r,cy+dy+r],fill=(255,255,255))
        for y in range(HZ+8,H,16): x=random.randint(0,W); d.line([x,y,x+random.randint(40,120),y],fill=(150,200,240),width=3)
        # supply boat
        bx,by=560,500
        d.polygon([(bx-130,by),(bx+130,by),(bx+95,by+52),(bx-95,by+52)],fill=(200,60,40),outline=(40,25,20)); d.rectangle([bx-60,by-60,bx+20,by],fill=(245,240,225),outline=(40,25,20))
        d.rectangle([bx-48,by-48,bx-28,by-28],fill=(120,180,230)); d.line([bx+60,by,bx+60,by-120],fill=(60,40,30),width=6); d.polygon([(bx+64,by-118),(bx+64,by-20),(bx+140,by-20)],fill=(250,250,245),outline=(40,25,20))
        d.polygon([(0,HZ),(240,HZ-60),(420,HZ)],fill=(70,140,80))
    else:
        grad(d,W,H,(120,132,150),(190,198,210),0,HZ); d.rectangle([0,HZ,W,H],fill=(52,70,92))
        d.polygon([(0,HZ),(240,HZ-60),(420,HZ)],fill=(235,240,248))
        for y in range(HZ+8,H,16): x=random.randint(0,W); d.line([x,y,x+random.randint(40,120),y],fill=(110,130,150),width=3)
        for _ in range(260):
            x,y=random.randrange(W),random.randrange(H); r=random.choice((2,3,4)); d.ellipse([x-r,y-r,x+r,y+r],fill=(250,252,255))
    im.filter(ImageFilter.GaussianBlur(0.6)).save(f"{OUT}/{name}.png")
pano("pano_night",True); pano("pano_morning",False); view("view_day_boat",False); view("view_winter",True)
print("images ok")
