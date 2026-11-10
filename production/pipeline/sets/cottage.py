"""Lighthouse keeper's cottage: warm wooden interior, built board by board so every edge gets an ink line."""
import bpy, math, random
from toon import *
A=os.path.join(HERE,"assets")
X0,X1,Y0,Y1,ZT=-2.6,2.6,-3.4,2.2,2.75
WIN=(0.05,1.25,1.0,2.0)   # back-wall window: x0,x1,z0,z1

def boards_h(axis_pos,span,z0,z1,h,m,coll,wall="back",holes=(),th=0.045,gap=0.003):
    """Horizontal boards along a wall, split around holes (x0,x1,z0,z1)."""
    z=z0
    while z<z1-0.01:
        zt=min(z+h,z1); segs=[span]
        for hx0,hx1,hz0,hz1 in holes:
            if zt>hz0 and z<hz1:
                new=[]
                for a,b in segs:
                    if hx1<=a or hx0>=b: new.append((a,b))
                    else:
                        if hx0>a: new.append((a,hx0))
                        if hx1<b: new.append((hx1,b))
                segs=new
        for a,b in segs:
            if b-a<0.02: continue
            L=b-a; c=(a+b)/2
            if wall=="back": box((c,axis_pos,(z+zt)/2),(L,th,zt-z-gap),m,0.006,coll=coll,name="board")
            else: box((axis_pos,c,(z+zt)/2),(th,L,zt-z-gap),m,0.006,coll=coll,name="board")
        z+=h

def build(time="day"):
    random.seed(7); sc=bpy.context.scene
    S=bpy.data.collections.new("set"); sc.collection.children.link(S)
    upper=mat("upper_wall",(0.72,0.62,0.42),0.8,0.15,vary=0.06)
    lower=mat("wainscot",(0.42,0.22,0.11),0.6,0.25,vary=0.12)
    floor=mat("floor",(0.55,0.3,0.13),0.55,0.3,vary=0.18)
    trim=mat("trim",(0.33,0.17,0.08),0.5,0.3,vary=0.05)
    beamm=mat("beam",(0.30,0.16,0.08),0.6,0.2,vary=0.1)
    # floor boards with staggered ends
    x=X0
    while x<X1:
        w=0.2; y=Y0-random.uniform(0,1.2)
        while y<Y1:
            L=random.uniform(1.0,2.2); y1=min(y+L,Y1+0.05)
            box((x+w/2,(max(y,Y0)+y1)/2,-0.03),(w-0.012,y1-max(y,Y0)-0.012,0.06),floor,0.006,coll=S,name="floorboard"); y=y1
        x+=w
    # back wall: lower vertical wainscot, upper horizontal boards
    xx=X0
    while xx<X1:
        if not (WIN[0]-0.01<xx<WIN[1]+0.01 and False): box((xx+0.09,Y1,0.45),(0.168,0.05,0.9),lower,0.006,coll=S,name="wainscot")
        xx+=0.18
    boards_h(Y1+0.01,(X0,X1),0.9,ZT,0.2,upper,S,"back",holes=[WIN])
    box(((X0+X1)/2,Y1-0.04,0.92),(X1-X0,0.06,0.05),trim,0.01,coll=S,name="chair_rail")
    # left wall
    yy=Y0
    while yy<Y1:
        box((X0,yy+0.09,0.45),(0.05,0.168,0.9),lower,0.006,coll=S,name="wainscot"); yy+=0.18
    boards_h(X0-0.01,(Y0,Y1),0.9,ZT,0.2,upper,S,"left")
    box((X0+0.04,(Y0+Y1)/2,0.92),(0.06,Y1-Y0,0.05),trim,0.01,coll=S,name="chair_rail")
    # right wall (mostly off camera, closes the room)
    box((X1,(Y0+Y1)/2,ZT/2),(0.06,Y1-Y0,ZT),upper,0,coll=S,name="rwall")
    box(((X0+X1)/2,Y0-0.4,ZT/2),(X1-X0,0.06,ZT),upper,0,coll=S,name="fwall")
    # ceiling + beams
    box(((X0+X1)/2,(Y0+Y1)/2,ZT+0.03),(X1-X0,Y1-Y0+1,0.06),lower,0,coll=S,name="ceiling")
    for bx in (-1.9,-0.7,0.5,1.7): box((bx,(Y0+Y1)/2,ZT-0.1),(0.2,Y1-Y0+1,0.2),beamm,0.012,coll=S,name="beam")
    # baseboards
    box(((X0+X1)/2,Y1-0.05,0.07),(X1-X0,0.04,0.14),trim,0.006,coll=S); box((X0+0.05,(Y0+Y1)/2,0.07),(0.04,Y1-Y0,0.14),trim,0.006,coll=S)
    # ---- window: frame, mullions, sill, curtains, view ----
    x0,x1,z0,z1=WIN; cx=(x0+x1)/2; fm=mat("window_frame",(0.93,0.93,0.9),0.5,0.3)
    for z in (z0,z1): box((cx,Y1-0.02,z),(x1-x0+0.16,0.14,0.08),fm,0.01,coll=S,name="wframe")
    for xw in (x0,x1): box((xw,Y1-0.02,(z0+z1)/2),(0.08,0.14,z1-z0+0.08),fm,0.01,coll=S,name="wframe")
    box((cx,Y1,(z0+z1)/2),(0.04,0.05,z1-z0),fm,0.006,coll=S); box((cx,Y1,(z0+z1)/2),(x1-x0,0.05,0.04),fm,0.006,coll=S)
    box((cx,Y1-0.12,z0-0.03),(x1-x0+0.3,0.26,0.05),fm,0.01,coll=S,name="sill")
    cur=mat("curtain",(0.78,0.2,0.18),0.8,0.1)
    for s,xc in ((-1,x0-0.12),(1,x1+0.12)):
        for k in range(4): cyl((xc+s*0.04*k,Y1-0.1-0.02*(k%2),(z0+z1)/2+0.1),0.05,1.25,cur,verts=12,bevel=0,coll=S,name="curtain")
    cyl((cx,Y1-0.12,z1+0.18),0.02,x1-x0+0.7,mat("brass",(0.85,0.6,0.15),0.3,0.6),rot=(0,math.pi/2,0),coll=S)
    pot=cyl((x0+0.25,Y1-0.12,z0+0.08),0.07,0.12,mat("pot",(0.75,0.35,0.2),0.7),r2=0.09,coll=S)
    for k in range(5): sph((x0+0.25+random.uniform(-0.06,0.06),Y1-0.12+random.uniform(-0.04,0.04),z0+0.2+random.uniform(0,0.1)),(0.06,0.05,0.07),mat("leaf",(0.25,0.55,0.2),0.6),seg=12,coll=S)
    bpy.ops.mesh.primitive_plane_add(size=1,location=(cx+0.3,Y1+1.6,1.6),rotation=(math.pi/2,0,0)); v=bpy.context.object; v.scale=(4.8,3.6,1)
    v.data.materials.append(image_mat("view",f"{A}/sky_golden.png",emit=0.9,alpha=False)); v.visible_shadow=False
    for c in v.users_collection: c.objects.unlink(v)
    S.objects.link(v)
    # ---- props ----
    wood=mat("furniture",(0.55,0.3,0.14),0.55,0.3,vary=0.08); dark=mat("iron",(0.12,0.11,0.11),0.4,0.5)
    # table + cloth + lamp + mug + bread
    tx,ty=1.35,-0.6
    box((tx,ty,0.76),(1.2,0.8,0.06),wood,0.012,coll=S,name="tabletop")
    for dx in (-0.52,0.52):
        for dy in (-0.32,0.32): cyl((tx+dx,ty+dy,0.37),0.035,0.74,wood,verts=12,coll=S)
    cl=mat("cloth",(0.85,0.22,0.2),0.8,0.1)
    for i in range(6):
        for j in range(4):
            box((tx-0.45+i*0.18,ty-0.27+j*0.18,0.795),(0.18,0.18,0.008),cl if (i+j)%2 else mat("cloth2",(0.95,0.93,0.88),0.8,0.1),0,coll=S)
    brass=mat("brass",(0.85,0.6,0.15),0.3,0.6); glow=mat("lampglow",(1.0,0.7,0.35),0.4,0.2,emit=12)
    cyl((tx-0.3,ty+0.15,0.83),0.09,0.06,brass,coll=S); cyl((tx-0.3,ty+0.15,0.88),0.03,0.06,brass,coll=S)
    sph((tx-0.3,ty+0.15,1.0),(0.075,0.075,0.11),glow,coll=S,name="lampglass"); cyl((tx-0.3,ty+0.15,1.13),0.045,0.04,brass,coll=S)
    mug=cyl((tx+0.25,ty-0.1,0.86),0.055,0.12,mat("mug",(0.25,0.45,0.7),0.5,0.4),coll=S); torus((tx+0.31,ty-0.1,0.86),0.035,0.01,mat("mug",(0.25,0.45,0.7),0.5,0.4),rot=(math.pi/2,0,0),coll=S)
    cyl((tx+0.05,ty+0.1,0.81),0.15,0.015,mat("plate",(0.95,0.95,0.92),0.4,0.4),coll=S); sph((tx+0.05,ty+0.1,0.85),(0.1,0.06,0.045),mat("bread",(0.8,0.5,0.2),0.7),coll=S)
    for s in (-1,1):  # chairs
        chx,chy=tx+s*0.45,ty+(0.62 if s<0 else -0.62)
        box((chx,chy,0.46),(0.42,0.42,0.05),wood,0.01,coll=S)
        for dx in (-0.17,0.17):
            for dy in (-0.17,0.17): cyl((chx+dx,chy+dy,0.23),0.025,0.46,wood,verts=10,coll=S)
        by=chy+0.19*(1 if s<0 else -1)
        for dx in (-0.17,0.17): cyl((chx+dx,by,0.75),0.025,0.6,wood,verts=10,coll=S)
        box((chx,by,1.0),(0.4,0.04,0.12),wood,0.008,coll=S)
    # cast-iron stove with pipe in back-left corner
    sx,sy=-1.85,1.6
    cyl((sx,sy,0.45),0.33,0.7,dark,coll=S); cyl((sx,sy,0.83),0.36,0.06,dark,coll=S); cyl((sx,sy,1.8),0.07,2.0,dark,verts=16,coll=S)
    box((sx,sy-0.33,0.4),(0.24,0.03,0.2),mat("stoveglow",(1.0,0.45,0.1),0.5,0.1,emit=6),0.004,coll=S)
    for dx in (-0.2,0.2):
        for dy in (-0.2,0.2): cyl((sx+dx,sy+dy,0.06),0.04,0.12,dark,verts=8,coll=S)
    cyl((sx+0.22,sy-0.05,0.93),0.11,0.16,mat("kettle",(0.2,0.45,0.4),0.35,0.5),coll=S)
    # shelf on left wall with jars and books
    box((X0+0.15,0.2,1.55),(0.26,1.5,0.04),wood,0.006,coll=S); box((X0+0.15,0.2,1.15),(0.26,1.5,0.04),wood,0.006,coll=S)
    cols=[(0.3,0.55,0.35),(0.75,0.3,0.2),(0.85,0.7,0.3),(0.3,0.4,0.75),(0.65,0.6,0.55),(0.5,0.25,0.5)]
    for i in range(6):
        cyl((X0+0.15,-0.4+i*0.24,1.64 if i%2 else 1.62),0.07,0.16 if i%2 else 0.12,mat(f"jar{i}",cols[i],0.25,0.6),coll=S)
    for i in range(9):
        h=random.uniform(0.2,0.3); box((X0+0.15,-0.45+i*0.1,1.17+h/2),(0.2,0.07,h),mat(f"book{i%5}",cols[(i*2)%6],0.7,0.2),0.004,rot=(random.uniform(-0.05,0.05),0,0),coll=S)
    # life buoy, clock, picture
    torus((X0+0.07,1.3,1.75),0.26,0.07,mat("buoy",(0.92,0.2,0.18),0.5,0.3),rot=(0,math.pi/2,0),coll=S)
    for k in range(4):
        a=k*math.pi/2+math.pi/4; box((X0+0.07,1.3+0.26*math.cos(a),1.75+0.26*math.sin(a)),(0.16,0.07,0.15),mat("buoyw",(0.97,0.97,0.95),0.5,0.3),0.02,rot=(-a,0,0),coll=S)
    c=cyl((-0.9,Y1-0.06,2.05),0.2,0.06,mat("clockrim",(0.3,0.16,0.08),0.4,0.4),rot=(math.pi/2,0,0),coll=S)
    bpy.ops.mesh.primitive_circle_add(radius=0.18,fill_type='NGON',location=(-0.9,Y1-0.095,2.05),rotation=(math.pi/2,0,0),vertices=48); f=bpy.context.object
    f.data.materials.append(image_mat("clockface",f"{A}/clock.png",rough=0.6)); f.data.uv_layers.new(); 
    for c_ in f.users_collection: c_.objects.unlink(f)
    S.objects.link(f)
    for l in f.data.loops: 
        co=f.data.vertices[l.vertex_index].co; f.data.uv_layers[0].data[l.index].uv=(co.x/0.36+0.5,co.y/0.36+0.5)
    box((-1.7,Y1-0.04,1.55),(0.56,0.05,0.7),trim,0.01,coll=S)
    bpy.ops.mesh.primitive_plane_add(size=1,location=(-1.7,Y1-0.07,1.55),rotation=(math.pi/2,0,0)); pc=bpy.context.object; pc.scale=(0.44,0.58,1)
    pc.data.materials.append(image_mat("picture",f"{A}/picture.png",alpha=False))
    for c_ in pc.users_collection: c_.objects.unlink(pc)
    S.objects.link(pc)
    # rocking chair near the stove
    rx,ry=-1.0,1.1; rw=mat("rocker",(0.5,0.26,0.12),0.55,0.3)
    box((rx,ry,0.5),(0.5,0.48,0.05),rw,0.01,rot=(0,0,0.4),coll=S)
    for k in range(5): cyl((rx-0.2+k*0.1+0.08*math.sin(0.4)*0,ry+0.22,0.88),0.02,0.7,rw,verts=8,coll=S)
    box((rx,ry+0.22,1.24),(0.52,0.05,0.1),rw,0.01,coll=S)
    for s in (-1,1):
        tube([(rx+s*0.24,ry-0.42,0.12),(rx+s*0.24,ry-0.1,0.03),(rx+s*0.24,ry+0.25,0.03),(rx+s*0.24,ry+0.5,0.14)],0.025,rw,coll=S)
        for dy in (-0.2,0.2): cyl((rx+s*0.22,ry+dy,0.27),0.022,0.45,rw,verts=8,coll=S)
    # braided round rug: one disc with ring pattern (no stacked edges -> no heavy rings of ink)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.1,depth=0.015,location=(-0.1,0.2,0.008),vertices=96); rug=bpy.context.object; rug.scale=(1.25,0.85,1)
    rm=bpy.data.materials.new("rug"); rm.use_nodes=True; nt=rm.node_tree; p=nt.nodes["Principled BSDF"]; p.inputs["Roughness"].default_value=0.95
    tc=nt.nodes.new('ShaderNodeTexCoord'); w=nt.nodes.new('ShaderNodeTexWave'); w.wave_type='RINGS'; w.wave_profile='SAW'; w.inputs['Scale'].default_value=3.2; w.inputs['Distortion'].default_value=0.0; w.inputs['Detail'].default_value=1
    cr=nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation='CONSTANT'; els=cr.color_ramp.elements
    cols=[(0.72,0.24,0.16),(0.92,0.72,0.42),(0.3,0.48,0.58),(0.85,0.5,0.25)]
    els[0].color=(*cols[0],1); els[1].position=0.25; els[1].color=(*cols[1],1)
    for i,c_ in enumerate(cols[2:]): e=els.new(0.5+0.25*i); e.color=(*c_,1)
    nt.links.new(tc.outputs['Object'],w.inputs[0]); nt.links.new(w.outputs['Fac'],cr.inputs[0]); nt.links.new(cr.outputs[0],p.inputs['Base Color'])
    rug.data.materials.append(rm)
    for c_ in rug.users_collection: c_.objects.unlink(rug)
    S.objects.link(rug)
    # barrel, crate, rope coil in the corners
    cyl((2.15,1.65,0.4),0.3,0.8,mat("barrel",(0.55,0.32,0.15),0.6,0.2),coll=S)
    for z in (0.15,0.65): cyl((2.15,1.65,z),0.31,0.05,dark,coll=S)
    box((1.65,1.75,0.25),(0.5,0.45,0.5),wood,0.015,rot=(0,0,0.2),coll=S)
    for k in range(4): torus((1.65,1.75,0.52+k*0.035),0.16-k*0.015,0.025,mat("rope",(0.8,0.65,0.4),0.9,0.1),coll=S)
    # hanging lantern
    cyl((0.5,-0.2,ZT-0.45),0.006,0.5,dark,verts=6,coll=S); cyl((0.5,-0.2,ZT-0.75),0.08,0.16,mat("lantglass",(1,0.8,0.5),0.3,0.2,emit=8),verts=12,coll=S)
    cyl((0.5,-0.2,ZT-0.65),0.1,0.03,dark,verts=12,coll=S); cyl((0.5,-0.2,ZT-0.85),0.1,0.03,dark,verts=12,coll=S)
    # coat hooks with a yellow coat-ish hat on the back wall
    box((1.95,Y1-0.04,1.75),(0.7,0.04,0.1),trim,0.006,coll=S)
    for hx in (1.75,1.95,2.15): cyl((hx,Y1-0.1,1.74),0.015,0.1,brass,rot=(math.pi/2,0,0),coll=S)
    return S

def lights(time="day"):
    sc=bpy.context.scene
    bpy.ops.object.light_add(type='SUN',rotation=(math.radians(-52),0,math.radians(-30)))
    sun=bpy.context.object.data; sun.energy=float(os.environ.get('SUN','6')); sun.color=(1.0,0.78,0.52); sun.angle=math.radians(2.5)
    bpy.ops.object.light_add(type='SPOT',location=(0.9,4.6,3.6)); sp=bpy.context.object; sp.data.energy=float(os.environ.get('KEY','2500')); sp.data.color=(1.0,0.76,0.48)
    sp.data.spot_size=math.radians(38); sp.data.spot_blend=0.15; sp.data.shadow_soft_size=0.05
    tg=bpy.data.objects.new("key_tgt",None); bpy.context.scene.collection.objects.link(tg); tg.location=(-0.3,0.0,0.0)
    cn=sp.constraints.new('TRACK_TO'); cn.target=tg; cn.track_axis='TRACK_NEGATIVE_Z'; cn.up_axis='UP_Y'
    bpy.ops.object.light_add(type='POINT',location=(0.75,-0.45,1.0)); l=bpy.context.object.data; l.energy=70; l.color=(1.0,0.66,0.33); l.shadow_soft_size=0.08
    bpy.ops.object.light_add(type='POINT',location=(0.5,-0.2,ZT-0.75)); l=bpy.context.object.data; l.energy=60; l.color=(1.0,0.7,0.4); l.shadow_soft_size=0.05
    bpy.ops.object.light_add(type='POINT',location=(-1.85,1.2,0.4)); l=bpy.context.object.data; l.energy=40; l.color=(1.0,0.45,0.15)
    # soft overall fill so the room reads bright like the competitors' game-style lighting
    bpy.ops.object.light_add(type='AREA',location=(0.3,-0.8,ZT-0.35),rotation=(0,0,0)); a=bpy.context.object.data; a.energy=float(os.environ.get('FILL','45')); a.size=3.0; a.color=(1.0,0.93,0.85)
    bpy.ops.object.light_add(type='AREA',location=(1.5,-3.2,1.6),rotation=(math.radians(80),0,math.radians(15))); a=bpy.context.object.data; a.energy=float(os.environ.get('FRONT','55')); a.size=2.5; a.color=(0.9,0.92,1.0)
    w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(0.75,0.82,0.95,1); bg.inputs[1].default_value=0.4
