# Draws character card layers (head, body, faces) as transparent PNGs.
from PIL import Image, ImageDraw, ImageFilter, ImageChops
INK=(32,22,20,255); W=1024
def shaded_disc(size, col, shade, outline=26):
    im=Image.new("RGBA",(size,size),(0,0,0,0))
    m=Image.new("L",(size,size),0); ImageDraw.Draw(m).ellipse([outline,outline,size-outline,size-outline],fill=255)
    base=Image.new("RGBA",(size,size),col+(255,))
    # soft shading toward lower-right, like the competitors' heads
    g=Image.new("L",(size,size),0); gd=ImageDraw.Draw(g)
    gd.ellipse([int(size*0.38),int(size*0.42),int(size*1.25),int(size*1.3)],fill=255); g=g.filter(ImageFilter.GaussianBlur(size*0.12))
    sh=Image.new("RGBA",(size,size),shade+(255,)); base=Image.composite(sh,base,ImageChops.multiply(g,Image.new("L",(size,size),150)))
    im.paste(base,(0,0),m)
    ImageDraw.Draw(im).ellipse([outline//2,outline//2,size-outline//2,size-outline//2],outline=INK,width=outline)
    return im
def head(name, hat=None, beard=False):
    S=1024; pad=200; im=Image.new("RGBA",(S,S+pad),(0,0,0,0))
    disc=shaded_disc(S-80,(246,243,238),(214,200,205)); im.paste(disc,(40,pad+40),disc)
    d=ImageDraw.Draw(im)
    if beard:
        d.chord([170,pad+520,854,pad+1010],0,180,fill=(250,250,246,255),outline=INK,width=22)
    if hat=="souwester":
        d.chord([120,pad-80,904,pad+560],180,360,fill=(250,196,40,255),outline=INK,width=24)
        d.polygon([(40,pad+250),(984,pad+250),(1010,pad+330),(14,pad+330)],fill=(244,182,30,255),outline=INK); d.line([(40,pad+250),(984,pad+250)],fill=INK,width=22); d.line([(14,pad+330),(1010,pad+330)],fill=INK,width=22)
        d.line([(300,pad+150),(720,pad+150)],fill=(220,150,20,255),width=14)
    if hat=="cap":
        d.chord([150,pad-40,874,pad+520],180,360,fill=(48,86,170,255),outline=INK,width=24)
        d.rectangle([150,pad+200,874,pad+250],fill=(36,64,130,255)); d.line([(150,pad+250),(874,pad+250)],fill=INK,width=20)
        d.chord([300,pad+190,940,pad+330],0,180,fill=(30,50,100,255),outline=INK,width=18)
        d.ellipse([480,pad+90,550,pad+160],fill=(240,200,60,255),outline=INK,width=10)
    im.save(f"{name}_head.png"); return pad
def face(name, eyes, mouth, brows=None, glasses=False, beard=False, pad=200):
    S=1024; im=Image.new("RGBA",(S,S+pad),(0,0,0,0)); d=ImageDraw.Draw(im)
    EY=pad+470; DX=165
    for side in (-1,1):
        cx=512+side*DX; cy=EY
        if eyes=="smug":
            d.ellipse([cx-44,cy-22,cx+44,cy+46],fill=INK); d.rectangle([cx-60,cy-60,cx+60,cy+6],fill=(0,0,0,0)); d.line([cx-64,cy+6,cx+60,cy+6],fill=INK,width=22)
        elif eyes=="dot": d.ellipse([cx-30,cy-30,cx+30,cy+30],fill=INK)
        elif eyes=="wide":
            d.ellipse([cx-78,cy-78,cx+78,cy+78],fill=(255,255,255,255),outline=INK,width=16); d.ellipse([cx-24,cy-24,cx+24,cy+24],fill=INK)
        elif eyes=="happy": d.arc([cx-60,cy-30,cx+60,cy+70],200,340,fill=INK,width=22)
        elif eyes=="closed": d.line([cx-55,cy+10,cx+55,cy+10],fill=INK,width=20)
        if brows=="flat": d.line([cx-70,cy-110,cx+70,cy-110],fill=INK,width=22)
        elif brows=="up": d.arc([cx-80,cy-185,cx+80,cy-75],200,340,fill=INK,width=20)
        elif brows=="angry":
            a,b=(cy-140,cy-100) if side<0 else (cy-100,cy-140); d.line([cx-75,a,cx+75,b],fill=INK,width=24)
    MY=pad+680
    if mouth=="smirk": d.arc([430,MY-90,650,MY+30],15,150,fill=INK,width=22)
    elif mouth=="flat": d.line([440,MY,600,MY],fill=INK,width=22)
    elif mouth=="frown": d.arc([430,MY-10,600,MY+90],200,340,fill=INK,width=22)
    elif mouth=="o": d.ellipse([475,MY-45,555,MY+55],fill=INK)
    elif mouth=="grin":
        d.chord([360,MY-110,664,MY+110],0,180,fill=(255,255,255,255),outline=INK,width=16)
        for x in range(405,640,48): d.line([x,MY-2,x,MY+100],fill=INK,width=8)
        d.line([370,MY+40,654,MY+40],fill=INK,width=8)
    elif mouth=="open": d.chord([420,MY-70,604,MY+120],0,180,fill=(120,30,30,255),outline=INK,width=16)
    if glasses:
        for side in (-1,1):
            cx=512+side*DX; d.ellipse([cx-92,EY-92,cx+92,EY+92],outline=INK,width=16)
        d.line([420,EY,604,EY],fill=INK,width=14)
    im.save(f"{name}_face_{eyes}_{mouth}.png")
def body(name, kind):
    Wd,H=640,1100; im=Image.new("RGBA",(Wd,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    if kind=="raincoat":
        d.polygon([(150,40),(490,40),(600,1060),(40,1060)],fill=(250,196,40,255))
        d.rounded_rectangle([110,20,530,1080],radius=180,outline=None)
        body=Image.new("L",(Wd,H),0); bd=ImageDraw.Draw(body); bd.rounded_rectangle([120,20,520,1060],radius=190,fill=255); bd.polygon([(120,500),(520,500),(610,1060),(30,1060)],fill=255)
        coat=Image.new("RGBA",(Wd,H),(250,196,40,255)); im=Image.new("RGBA",(Wd,H),(0,0,0,0)); im.paste(coat,(0,0),body)
        g=Image.new("RGBA",(Wd,H),(222,150,20,255)); gm=Image.new("L",(Wd,H),0); ImageDraw.Draw(gm).rectangle([380,0,Wd,H],fill=110); gm=gm.filter(ImageFilter.GaussianBlur(60)); im=Image.composite(g,im,ImageChops.multiply(gm,body))
        d=ImageDraw.Draw(im)
        edge=body.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(23)); im.paste(Image.new("RGBA",(Wd,H),INK),(0,0),edge)
        d.line([(320,120),(320,1040)],fill=INK,width=12)
        for y in (260,450,640,830): d.ellipse([340,y-18,376,y+18],fill=INK)
        d.polygon([(190,30),(320,140),(450,30),(400,10),(320,90),(240,10)],fill=(240,180,30,255),outline=INK); 
    else:
        body=Image.new("L",(Wd,H),0); ImageDraw.Draw(body).rounded_rectangle([140,20,500,980],radius=180,fill=255)
        shirt=Image.new("RGBA",(Wd,H),(250,250,248,255)); im=Image.new("RGBA",(Wd,H),(0,0,0,0)); im.paste(shirt,(0,0),body)
        g=Image.new("RGBA",(Wd,H),(205,208,220,255)); gm=Image.new("L",(Wd,H),0); ImageDraw.Draw(gm).rectangle([380,0,Wd,H],fill=150); gm=gm.filter(ImageFilter.GaussianBlur(60)); im=Image.composite(g,im,ImageChops.multiply(gm,body))
        edge=body.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(23)); im.paste(Image.new("RGBA",(Wd,H),INK),(0,0),edge)
        d=ImageDraw.Draw(im)
        d.polygon([(300,60),(340,60),(370,140),(355,560),(320,620),(285,560),(270,140)],fill=(48,86,170,255),outline=INK)
        d.line([(285,170),(355,150)],fill=(250,210,70,255),width=14); d.line([(280,300),(360,280)],fill=(250,210,70,255),width=14); d.line([(282,430),(358,410)],fill=(250,210,70,255),width=14)
        d.polygon([(230,25),(320,80),(410,25)],fill=(250,250,248,255),outline=INK)
        d.ellipse([400,330,480,410],outline=INK,width=10); d.line([(440,300),(440,330)],fill=INK,width=8)  # pocket watch/pen in pocket
    im.save(f"{name}_body.png")
pad=head("keeper",hat="souwester",beard=True)
for e,m,b in [("smug","smirk","flat"),("wide","open","up"),("dot","frown","angry"),("closed","flat",None)]:
    face("keeper",e,m,b,pad=pad)
body("keeper","raincoat")
pad=head("engineer",hat="cap")
for e,m,b in [("happy","grin",None),("dot","flat","flat"),("wide","o","up"),("dot","frown","angry")]:
    face("engineer",e,m,b,glasses=True,pad=pad)
body("engineer","shirt")
print("ok")
