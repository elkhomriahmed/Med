"""Lighthouse lamp room: octagonal room with low painted walls, glass windows all round,
the big lens on a mercury basin, clockwork with two gears, a floor hatch and a brass plaque.
Moving parts are named MOV_<group> (baked separately so they can rotate); LIVE_* objects are not baked."""
import bpy, math, random
from toon import *

R=2.9           # room radius (to wall centre)
WZ0,WZ1=1.0,2.85  # window band
LENS_C=(0.0,0.3)  # lens axis (x,y)
POOL_Z=0.80       # mercury surface height
GEAR1=(-1.75,0.17,0.78); GEAR2=(-1.58,0.17,1.12)   # gear centres (front face of the clockwork box)
GEAR1_R=0.22; KNOB_R=0.17
HATCH=(1.3,1.15)

def _coll(name):
    c=bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c); return c

def build(state="night"):
    random.seed(11); S=_coll("set"); M=_coll("movables")
    n=8; side=2*R*math.tan(math.pi/n)
    floorw=wood("lr_floor",(0.62,0.40,0.22),(0.36,0.22,0.11),axis="Y",grain=5,bump=0.15)
    wallp=mat("lr_wall",(0.70,0.18,0.15),0.6,0.3,vary=0.04)          # red painted low wall
    trim=mat("lr_trim",(0.92,0.90,0.84),0.45,0.35)
    brass=mat("lr_brass",(0.88,0.64,0.22),0.25,0.8)
    iron=mat("lr_iron",(0.16,0.17,0.19),0.35,0.6)
    copper=mat("lr_roof",(0.30,0.56,0.50),0.55,0.35)
    stone=mat("lr_stone",(0.62,0.62,0.60),0.8,0.15,vary=0.05)
    # floor: boards clipped to the octagon
    x=-R-0.2
    while x<R+0.2:
        half=math.sqrt(max(0,(R+0.15)**2-x**2))
        if half>0.05: box((x+0.1,0,-0.03),(0.195,2*half,0.06),floorw,0.006,coll=S,name="floorboard")
        x+=0.2
    for i in range(n):
        a=2*math.pi*i/n; cx,cy=R*math.cos(a),R*math.sin(a)
        rot=(0,0,a+math.pi/2)
        box((cx,cy,WZ0/2),(side+0.02,0.14,WZ0),wallp,0.01,rot=rot,coll=S,name="lowwall")
        box((cx*0.985,cy*0.985,WZ0+0.03),(side+0.06,0.24,0.06),trim,0.01,rot=rot,coll=S,name="sill")
        box((cx,cy,WZ1+0.04),(side+0.04,0.16,0.1),trim,0.01,rot=rot,coll=S,name="topring")
        box((cx,cy,(WZ0+WZ1)/2+0.15),(side,0.05,0.04),trim,0.0,rot=rot,coll=S,name="mullion")
        ca=a+math.pi/n; rr=R/math.cos(math.pi/n)
        cyl((rr*math.cos(ca),rr*math.sin(ca),(WZ0+WZ1)/2),0.045,WZ1-WZ0,trim,verts=12,coll=S,name="post")
    # roof: cone with normals flipped inward so it is visible from inside
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=R/math.cos(math.pi/n)+0.15,radius2=0.12,depth=1.2,location=(0,0,WZ1+0.7),rotation=(0,0,math.pi/n))
    roof=bpy.context.object; roof.name="roof"; roof.data.materials.append(copper)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    for c in roof.users_collection: c.objects.unlink(roof)
    S.objects.link(roof)
    # pedestal + mercury basin
    lx,ly=LENS_C
    cyl((lx,ly,0.37),0.62,0.74,stone,verts=40,coll=S,name="pedestal")
    cyl((lx,ly,0.755),0.7,0.03,iron,verts=48,coll=S,name="basin_floor")
    torus((lx,ly,0.79),0.68,0.06,iron,coll=S,name="basin_rim")
    # brass plaque on the pedestal front
    box((lx,ly-0.63,0.42),(0.5,0.02,0.16),brass,0.004,coll=S,name="plaque")
    cu=bpy.data.curves.new("plaquetext",'FONT'); cu.body="MERCURY"; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=0.085; cu.extrude=0.004
    try: cu.font=bpy.data.fonts.load("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",check_existing=True)
    except Exception: pass
    tx=bpy.data.objects.new("plaquetext",cu); S.objects.link(tx); tx.location=(lx,ly-0.645,0.42); tx.rotation_euler=(math.pi/2,0,0)
    cu.materials.append(mat("plaque_ink",(0.10,0.07,0.04),0.6,0.1))
    # clockwork box against the back-left wall
    box((GEAR1[0],GEAR1[1]+0.36,0.62),(0.62,0.7,1.24),wood("lr_box",(0.50,0.30,0.15),(0.30,0.17,0.08),axis="Z",grain=6),0.02,coll=S,name="clockbox")
    for gi,(gc,gr,teeth) in enumerate(((GEAR1,GEAR1_R,14),(GEAR2,0.14,10))):
        parts=[]
        parts.append(cyl(gc,gr,0.05,brass,rot=(math.pi/2,0,0),verts=40,coll=M,name=f"MOV_gear{gi+1}"))
        for k in range(teeth):
            a=2*math.pi*k/teeth
            parts.append(box((gc[0]+(gr+0.025)*math.cos(a),gc[1],gc[2]+(gr+0.025)*math.sin(a)),(0.05,0.05,0.05),brass,0.004,rot=(0,-a,0),coll=M,name=f"MOV_gear{gi+1}"))
        parts.append(cyl((gc[0],gc[1]-0.04,gc[2]),0.04,0.06,iron,rot=(math.pi/2,0,0),verts=16,coll=M,name=f"MOV_gear{gi+1}"))
        for k in range(4):
            a=math.pi/2*k
            parts.append(box((gc[0]+gr*0.5*math.cos(a),gc[1]-0.03,gc[2]+gr*0.5*math.sin(a)),(gr*0.9,0.02,0.04),iron,0.0,rot=(0,-a,0),coll=M,name=f"MOV_gear{gi+1}"))
        if gi==0:   # crank handle on the big gear
            parts.append(box((gc[0]+KNOB_R/2,gc[1]-0.07,gc[2]),(KNOB_R,0.025,0.03),iron,0.004,coll=M,name="MOV_gear1"))
            parts.append(cyl((gc[0]+KNOB_R,gc[1]-0.12,gc[2]),0.025,0.1,mat("lr_knob",(0.55,0.20,0.12),0.5,0.3),rot=(math.pi/2,0,0),verts=12,coll=M,name="MOV_gear1"))
    # floor hatch with a bolted latch (the room is sealed)
    hx,hy=HATCH
    box((hx,hy,0.005),(0.75,0.75,0.03),wood("lr_hatch",(0.40,0.24,0.12),(0.25,0.14,0.07),axis="Y",grain=5),0.01,coll=S,name="hatch")
    box((hx,hy,0.03),(0.5,0.08,0.03),iron,0.005,coll=S,name="latch")
    for k in (-0.3,0.3): box((hx+k,hy+0.3,0.03),(0.1,0.12,0.03),iron,0.005,coll=S,name="hinge")
    # small shelf with oil cans and a rag
    box((1.85,-0.75,1.0),(0.12,0.6,0.04),trim,0.004,rot=(0,0,math.radians(-25)),coll=S,name="shelf")
    for k,c in enumerate(((0.2,0.45,0.25),(0.75,0.2,0.15))): cyl((1.86-0.06*k,-0.9+0.25*k,1.1),0.06,0.16,mat(f"lr_can{k}",c,0.4,0.4),coll=S,name="can")
    # LENS: beehive of glass rings with brass ribs and two bullseye panels, lamp inside
    glass=mat("lens_glass",(0.62,0.84,0.92),0.08,0.9,emit=0.08 if state=="night" else 0.0)
    lamp=mat("lens_lamp",(1.0,0.86,0.55),0.4,0.2,emit=30.0 if state=="night" else 0.0)
    base_z=POOL_Z+0.02; H=1.5; lens=[]
    lens.append(cyl((lx,ly,base_z+0.04),0.58,0.08,brass,verts=48,coll=M,name="MOV_lens"))
    for k in range(9):
        z=base_z+0.12+k*0.15; f=math.sin(math.pi*(0.15+0.7*(k/8)))
        lens.append(torus((lx,ly,z),0.25+0.28*f,0.065,glass,coll=M,name="MOV_lens"))
    for k in range(8):
        a=2*math.pi*k/8
        pts=[(lx+(0.27+0.3*math.sin(math.pi*(0.15+0.7*j/8)))*math.cos(a),ly+(0.27+0.3*math.sin(math.pi*(0.15+0.7*j/8)))*math.sin(a),base_z+0.12+j*0.15) for j in range(9)]
        o=tube(pts,0.018,brass,coll=M,name="MOV_lens"); lens.append(o)
    for a in (0,math.pi):
        c=(lx+0.62*math.cos(a),ly+0.62*math.sin(a),base_z+0.72)
        lens.append(cyl(c,0.26,0.06,glass,rot=(0,math.pi/2,a),verts=40,coll=M,name="MOV_lens"))
        lens.append(torus(c,0.26,0.03,brass,rot=(0,math.pi/2,a),coll=M,name="MOV_lens"))
        lens.append(torus(c,0.14,0.02,brass,rot=(0,math.pi/2,a),coll=M,name="MOV_lens"))
    lens.append(sph((lx,ly,base_z+0.72),(0.16,0.16,0.2),lamp,coll=M,name="MOV_lens"))
    lens.append(cyl((lx,ly,base_z+1.40),0.3,0.08,brass,verts=40,coll=M,name="MOV_lens"))   # cap sits on the top ring
    for o in M.objects:
        if o.name.startswith("MOV_lens") and o.data and len(o.data.materials) and o.data.materials[0] and o.data.materials[0].name.startswith(("lens_glass","lens_lamp")):
            o.visible_shadow=False   # let the lamp light pass through the glass
    return S

def lights(state="night"):
    sc=bpy.context.scene; lx,ly=LENS_C
    w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes["Background"]
    if state=="night":
        bpy.ops.object.light_add(type='POINT',location=(lx,ly,POOL_Z+0.74)); l=bpy.context.object.data; l.energy=2600; l.color=(1.0,0.74,0.40); l.shadow_soft_size=0.2
        bpy.ops.object.light_add(type='SUN',rotation=(math.radians(60),0,math.radians(200))); s=bpy.context.object.data; s.energy=1.2; s.color=(0.55,0.65,1.0); s.angle=math.radians(4)
        bpy.ops.object.light_add(type='AREA',location=(0,-1.6,2.6),rotation=(math.radians(20),0,0)); a=bpy.context.object.data; a.energy=60; a.size=3; a.color=(0.6,0.7,1.0)
        bg.inputs[0].default_value=(0.08,0.12,0.28,1); bg.inputs[1].default_value=0.6
    else:
        bpy.ops.object.light_add(type='SUN',rotation=(math.radians(62),0,math.radians(-35))); s=bpy.context.object.data; s.energy=6.0; s.color=(1.0,0.90,0.74); s.angle=math.radians(2)
        bpy.ops.object.light_add(type='AREA',location=(0,-1.6,2.6),rotation=(math.radians(20),0,0)); a=bpy.context.object.data; a.energy=80; a.size=3; a.color=(1.0,0.95,0.9)
        bg.inputs[0].default_value=(0.62,0.74,0.92,1); bg.inputs[1].default_value=0.9
