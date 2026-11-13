"""The lighthouse OUTSIDE, built around the lamp room (lamp_room.py sits at the origin, floor z=0) so the camera can fly out of
the windows: gallery + railing, tower down to a rock in the sea, the sea, a harbour town across the water, a sky dome.
Static pieces are MOV_ groups (each baked into its own atlas); the sky dome and ships are LIVE (unlit)."""
import bpy, math, random, os
from toon import *

ROCK_Z=-20.0; SEA_Z=-21.4
TOWN_DIR=(-0.80,0.60)       # direction from the lighthouse to the harbour town
TOWN_DIST=150.0
ASSETS=os.path.join(HERE,"assets")

def _g(o,group):   # put an object into a baked group
    o.name="MOV_"+group; return o

def sky_image(state):
    """Vertical gradient sky with stars (night) or soft clouds (day), saved once per state."""
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np
    p=os.path.join(ASSETS,f"sky_{state}.png")
    if os.path.exists(p): return p
    W,H=1024,512; rng=np.random.default_rng(5)
    top,hor={"night":((6,10,40),(40,70,150)),"day":((60,130,215),(190,220,245)),"morning":((80,140,215),(250,205,170))}[state]
    v=np.linspace(0,1,H)[:,None]; t=np.clip((v-0.0)/0.5,0,1)**0.8          # row 0 = top of the sphere
    img=np.zeros((H,W,3),np.float32)
    for c in range(3): img[...,c]=top[c]+(hor[c]-top[c])*t
    img[H//2:]=np.array(hor,np.float32)*0.55
    im=Image.fromarray(img.astype(np.uint8)); d=ImageDraw.Draw(im)
    if state=="night":
        for _ in range(500):
            x,y=rng.integers(0,W),rng.integers(0,int(H*0.45)); r=rng.choice([0.6,0.9,1.4]); b=int(rng.uniform(170,255))
            d.ellipse([x-r,y-r,x+r,y+r],fill=(b,b,int(b*0.95)))
        d.ellipse([W*0.72-14,H*0.20-14,W*0.72+14,H*0.20+14],fill=(250,245,220))          # moon
    else:
        cl=Image.new("L",(W,H),0); dc=ImageDraw.Draw(cl)
        for _ in range(26):
            x,y=rng.integers(0,W),rng.integers(int(H*0.18),int(H*0.46)); w=rng.integers(30,90)
            for k in range(5): dc.ellipse([x+k*w*0.3-w*0.5,y-w*0.25-(k%2)*8,x+k*w*0.3+w*0.5,y+w*0.2],fill=210)
        cl=cl.filter(ImageFilter.GaussianBlur(3)); white=Image.new("RGB",(W,H),(250,248,244)); im=Image.composite(white,im,cl)
    im.save(p); return p

def build_sky(state, image_live, live):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=420,segments=64,ring_count=32,location=(0,0,0))
    o=bpy.context.object; o.name="sky"
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(image_live("sky_"+state,sky_image(state)))
    for p in o.data.polygons: p.use_smooth=True
    return live(o)

def build(state="night"):
    random.seed(4); S=bpy.context.scene.collection
    white=mat("ext_white",(0.92,0.90,0.85),0.6,0.2,vary=0.03); red=mat("ext_red",(0.70,0.12,0.10),0.6,0.2,vary=0.03)
    iron=mat("ext_iron",(0.12,0.13,0.15),0.4,0.6); copper=mat("ext_copper",(0.30,0.56,0.50),0.55,0.35)
    stone=mat("ext_rock",(0.42,0.40,0.38),0.9,0.1,vary=0.12); sea=mat("ext_sea",(0.10,0.28,0.42),0.25,0.6,vary=0.05)
    deck=wood("ext_deck",(0.50,0.34,0.20),(0.32,0.21,0.12),axis="Y",grain=6,bump=0.15)
    # gallery deck + railing around the lamp room
    _g(cyl((0,0,-0.10),3.95,0.20,deck,verts=64),"tower")
    for k in range(40):
        a=2*math.pi*k/40; _g(cyl((3.8*math.cos(a),3.8*math.sin(a),0.55),0.025,1.1,iron,verts=8,bevel=0),"tower")
    _g(torus((0,0,1.10),3.8,0.035,iron),"tower"); _g(torus((0,0,0.6),3.8,0.02,iron),"tower")
    # outside of the roof (the lamp room's roof faces inward) + vent ball on top
    _g(cyl((0,0,3.55),3.25,1.2,copper,verts=8,r2=0.14,rot=(0,0,math.pi/8),bevel=0),"tower")
    _g(sph((0,0,4.25),(0.28,0.28,0.28),copper,seg=20),"tower")
    # tower: white with red bands, tapering out to the rock; windows up the side
    n=6
    for i in range(n):
        z0=-0.2-i*(-ROCK_Z-0.2)/n; z1=z0-(-ROCK_Z-0.2)/n
        r0=3.1+1.3*(i/n); r1=3.1+1.3*((i+1)/n)
        _g(cyl((0,0,(z0+z1)/2),r0,z0-z1,red if i%2 else white,verts=48,r2=r1,bevel=0),"tower")
    for i in range(4):
        z=-3.5-i*4.0; r=3.1+1.3*(-z/(-ROCK_Z)); a=-math.pi/2+0.35
        _g(box((r*math.cos(a)*0.99,r*math.sin(a)*0.99,z),(0.5,0.12,0.8),mat("ext_win",(1.0,0.78,0.40) if state=="night" else (0.15,0.18,0.22),0.4,0.2,emit=4.0 if state=="night" else 0),0.01,rot=(0,0,a+math.pi/2)),"tower")
    _g(box((0,-4.38,ROCK_Z+1.2),(1.0,0.15,2.0),mat("ext_door",(0.35,0.18,0.10),0.6,0.2),0.02),"tower")
    # rock island
    for k in range(14):
        a=2*math.pi*k/14+random.uniform(-0.2,0.2); rr=random.uniform(4.5,9.0)
        _g(sph((rr*math.cos(a),rr*math.sin(a),ROCK_Z-0.6+random.uniform(-0.4,0.4)),(random.uniform(2.0,3.4),random.uniform(1.8,3.0),random.uniform(1.0,1.8)),stone,seg=16),"rock")
    _g(cyl((0,0,ROCK_Z-0.6),6.0,1.4,stone,verts=24,r2=7.5,bevel=0),"rock")
    for k in range(6):   # rocks sticking out of the sea (the ones ships must miss)
        a=-0.6+k*0.25; rr=22+k*3
        _g(sph((rr*math.cos(a),rr*math.sin(a),SEA_Z+0.3),(random.uniform(1.0,2.0),random.uniform(1.0,1.6),random.uniform(0.8,1.6)),stone,seg=14),"rock")
    # the sea
    bpy.ops.mesh.primitive_plane_add(size=900,location=(0,0,SEA_Z)); o=bpy.context.object; o.data.materials.append(sea)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=40); bpy.ops.object.mode_set(mode='OBJECT')
    for v in o.data.vertices: v.co.z+=0.35*math.sin(v.co.x*0.09)*math.cos(v.co.y*0.07)
    _g(o,"sea")
    # the harbour town across the water: hill + rows of houses with lit windows
    tx,ty=TOWN_DIR[0]*TOWN_DIST,TOWN_DIR[1]*TOWN_DIST
    _g(sph((tx,ty,SEA_Z-14),(70,40,26),mat("ext_hill",(0.30,0.48,0.24),0.9,0.1,vary=0.08),seg=24),"town")
    cols=[(0.85,0.40,0.30),(0.95,0.80,0.45),(0.45,0.62,0.80),(0.92,0.90,0.84),(0.60,0.80,0.55),(0.80,0.55,0.75)]
    for k in range(26):
        u=random.uniform(-1,1); dx=u*48; dy=random.uniform(-12,14); z=SEA_Z+2.0+max(0,8-abs(u)*6)+dy*0.3
        px,py=tx+dx*0.6+dy*(-0.8),ty+dx*(-0.8)*-0.75+dy*0.6
        w=random.uniform(3,5); h=random.uniform(3.5,6)
        _g(box((px,py,z+h/2),(w,w*0.9,h),mat(f"ext_house{k%6}",cols[k%6],0.7,0.2),0.05,rot=(0,0,random.uniform(0,0.4))),"town")
        _g(cyl((px,py,z+h+0.9),w*0.75,1.8,mat("ext_roofs",(0.50,0.18,0.12),0.7,0.2),verts=4,r2=0.1,rot=(0,0,math.pi/4),bevel=0),"town")
        if state=="night":
            _g(box((px,py-w*0.46,z+h*0.55),(0.9,0.1,0.9),mat("ext_lit",(1.0,0.78,0.40),0.5,0.2,emit=6.0),0.0),"town")

def make_ship(name, solid, live, scale=1.0, lit=True):
    """A small steam/sail coaster (LIVE, unlit colours); returns the root empty."""
    sc=bpy.context.scene; root=bpy.data.objects.new("LIVE_"+name,None); sc.collection.objects.link(root)
    s=scale; parts=[]
    def add(o): live(o); mw=o.matrix_world.copy(); o.parent=root; o.matrix_world=mw; parts.append(o); return o
    add(box((0,0,0.35*s),(4.2*s,1.3*s,0.8*s),solid(name+"_hull",(0.55,0.14,0.10)),0))
    add(box((0,0,0.80*s),(4.3*s,1.35*s,0.12*s),solid(name+"_rail",(0.95,0.92,0.84)),0))
    add(box((-0.6*s,0,1.25*s),(1.6*s,1.0*s,0.8*s),solid(name+"_cabin",(0.93,0.90,0.82)),0))
    add(cyl((0.1*s,0,2.0*s),0.22*s,1.0*s,solid(name+"_funnel",(0.12,0.12,0.14)),verts=12,bevel=0))
    add(cyl((1.3*s,0,2.4*s),0.05*s,3.2*s,solid(name+"_mast",(0.30,0.20,0.12)),verts=6,bevel=0))
    if lit:
        for dx in (-1.0,-0.3): add(box(((-0.6+dx*0.5)*s,-0.52*s,1.3*s),(0.25*s,0.04,0.25*s),solid(name+"_win",(1.0,0.82,0.45)),0))
    return root
