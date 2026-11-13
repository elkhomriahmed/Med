"""Harbour town square (day): cobbled square, a row of coloured houses with readable shop signs, quay + water, boats, a well,
lamp posts, bunting, barrels/crates/nets, and the lighthouse on its rock across the water (same world geography)."""
import bpy, math, random
from toon import *

SIGN_FONT="/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"

def sign(text,loc,rot_z,size,col=(0.95,0.88,0.62),board=(0.32,0.18,0.08),w=None,h=None):
    w=w or size*len(text)*0.62+0.25; h=h or size*1.6
    box(loc,(w,0.06,h),wood("tw_board",board,tuple(c*0.7 for c in board),axis="X",grain=6),0.01,rot=(0,0,rot_z),name="signboard")
    cu=bpy.data.curves.new("sign",'FONT'); cu.body=text; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=size; cu.extrude=0.004
    cu.font=bpy.data.fonts.load(SIGN_FONT,check_existing=True); o=bpy.data.objects.new("signtext",cu); bpy.context.scene.collection.objects.link(o)
    cu.materials.append(mat("tw_signink",col,0.5,0.3,emit=0.2)); o.rotation_euler=(math.pi/2,0,rot_z)
    o.location=(loc[0]-0.04*math.sin(rot_z),loc[1]-0.04*math.cos(rot_z),loc[2]); return o

def house(x,y,w,h,col,roof,label=None,door_col=(0.35,0.18,0.10)):
    wall=mat(f"tw_wall{int(x*10)}",col,0.75,0.2,vary=0.05); trim=mat("tw_trim",(0.94,0.92,0.86),0.5,0.3)
    box((x,y,h/2),(w,2.4,h),wall,0.03,name="house")
    rf=mat(f"tw_roof{int(roof[0]*100)}",roof,0.7,0.2,vary=0.06)
    bpy.ops.mesh.primitive_cylinder_add(vertices=3,radius=1.55,depth=w+0.3,location=(x,y,h+0.5),rotation=(0,math.pi/2,0))
    o=bpy.context.object; o.scale=(1,1.0,1); o.data.materials.append(rf); o.name="roof"
    box((x,y-1.22,1.0),(0.95,0.06,2.0),mat(f"tw_door{int(door_col[0]*100)}",door_col,0.6,0.2),0.02,name="door")
    for dx in (-w*0.28,w*0.28):
        for z in (h*0.42,h*0.75):
            if z<2.3 and abs(dx)<0.8: continue
            box((x+dx,y-1.22,z),(0.75,0.06,0.85),mat("tw_glass",(0.55,0.70,0.85),0.2,0.8),0.0,name="window")
            box((x+dx,y-1.24,z),(0.86,0.04,0.96),trim,0.0,name="wtrim")
            box((x+dx,y-1.32,z-0.5),(0.9,0.22,0.06),trim,0.0,name="sill")
    if label: sign(label,(x,y-1.30,2.45),0,0.26)

def build():
    random.seed(9); sc=bpy.context.scene
    cob=mat("tw_cobble",(0.70,0.60,0.48),0.85,0.1,vary=0.18)
    box((0,0,-0.10),(16,12,0.1),mat("tw_mortar",(0.38,0.33,0.28),0.9,0.1),0.0,name="MOV_cobble")
    # cobbled square: many small, slightly different stones
    for i in range(-17,18):
        for j in range(-11,12):
            x=i*0.36+(0.18 if j%2 else 0); y=j*0.32
            box((x,y,-0.03),(0.33,0.29,0.07),cob,0.03,name="MOV_cobble")   # own atlas: keeps the houses' colours crisp
    # houses along the back
    pal=[((0.92,0.38,0.26),(0.45,0.16,0.10),"FISH"),((0.98,0.80,0.36),(0.30,0.32,0.40),"BAKERY"),((0.30,0.62,0.66),(0.45,0.16,0.10),"TAVERN"),
         ((0.92,0.90,0.84),(0.30,0.32,0.40),None),((0.62,0.80,0.56),(0.45,0.16,0.10),"GOSSIP & TEA")]
    for k,(c,r,lab) in enumerate(pal):
        house(-6.0+k*3.0,4.8,2.9,4.0+0.5*(k%2),c,r,lab)
    # quay edge + water in front (towards -y), boats, the lighthouse on its rock far away
    stone=mat("tw_quay",(0.55,0.52,0.48),0.85,0.1,vary=0.1)
    box((0,-4.1,-0.5),(13,0.8,1.0),stone,0.04,name="quay")
    for k in range(6): cyl((-5+k*2,-3.8,0.25),0.12,0.5,mat("tw_bollard",(0.15,0.15,0.17),0.4,0.6),verts=12,name="bollard")
    bpy.ops.mesh.primitive_plane_add(size=400,location=(0,-180,-1.0)); o=bpy.context.object; o.name="water"
    o.data.materials.append(mat("tw_sea",(0.14,0.40,0.55),0.25,0.6,vary=0.05))
    for k,(x,y,c) in enumerate(((-3.5,-7.5,(0.75,0.20,0.15)),(2.8,-9.0,(0.20,0.45,0.70)),(7,-14,(0.90,0.85,0.75)))):
        box((x,y,-0.7),(3.2,1.1,0.6),mat(f"tw_boat{k}",c,0.6,0.2),0.15,rot=(0,0,0.3*k),name="boat")
        cyl((x,y,0.6),0.04,2.4,mat("tw_mast",(0.35,0.22,0.12),0.6,0.2),verts=6,name="mast")
    white=mat("tw_lh_white",(0.92,0.90,0.85),0.6,0.2); red=mat("tw_lh_red",(0.70,0.12,0.10),0.6,0.2)
    for i in range(5): cyl((40,-120,2+i*3.2),2.6-i*0.2,3.2,red if i%2 else white,verts=24,r2=2.4-i*0.2,name="lh")
    cyl((40,-120,18.5),1.8,2.6,mat("tw_lh_glass",(1.0,0.86,0.55),0.3,0.3,emit=2.0),verts=16,name="lh_lamp")
    cyl((40,-120,20.6),2.1,1.4,mat("tw_lh_roof",(0.30,0.56,0.50),0.55,0.35),verts=8,r2=0.2,name="lh_roof")
    sph((40,-120,-0.5),(9,7,3),mat("tw_lh_rock",(0.42,0.40,0.38),0.9,0.1,vary=0.12),seg=16,name="lh_rock")
    # props: well, lamp posts, barrels, crates, fishing nets, bunting
    cyl((0.8,1.2,0.4),0.75,0.8,mat("tw_well",(0.55,0.52,0.48),0.85,0.1,vary=0.12),verts=24,name="well")
    for dx in (-0.7,0.7): cyl((0.8+dx,1.2,1.1),0.06,1.5,wood("tw_post",(0.45,0.30,0.16),(0.30,0.19,0.10),axis="Z",grain=6),verts=8,name="wellpost")
    cyl((0.8,1.2,1.95),0.95,0.5,mat("tw_wellroof",(0.45,0.16,0.10),0.7,0.2),verts=4,r2=0.1,rot=(0,0,math.pi/4),name="wellroof")
    iron=mat("tw_iron",(0.12,0.12,0.14),0.4,0.6)
    for x in (-4.5,4.5):
        cyl((x,-2.8,1.4),0.06,2.8,iron,verts=8,name="lamppost"); cyl((x,-2.8,2.95),0.18,0.35,mat("tw_lamp",(1.0,0.86,0.55),0.3,0.3,emit=1.5),verts=8,name="lamp")
    barrel=wood("tw_barrel",(0.48,0.30,0.15),(0.30,0.18,0.08),axis="Z",grain=10,bump=0.2)
    for (x,y) in ((-6.8,2.8),(-6.2,3.1),(5.6,2.9)):
        cyl((x,y,0.42),0.32,0.84,barrel,verts=20,name="barrel"); torus((x,y,0.15),0.325,0.02,iron,name="hoop"); torus((x,y,0.7),0.325,0.02,iron,name="hoop")
    crate=wood("tw_crate",(0.58,0.40,0.22),(0.36,0.23,0.12),axis="X",grain=7,bump=0.2)
    for (x,y,s) in ((6.3,2.6,0.6),(6.4,2.6,0.0),(-5.2,-3.1,0.5)):
        if s: box((x,y,s/2),(s,s,s),crate,0.02,rot=(0,0,0.3),name="crate")
    box((3.4,3.3,0.45),(1.2,0.8,0.9),mat("tw_net",(0.55,0.62,0.48),0.9,0.05,vary=0.2),0.2,name="nets")
    cols=[(0.95,0.25,0.25),(0.98,0.85,0.25),(0.25,0.55,0.95),(0.30,0.80,0.40)]
    for k in range(18):
        u=k/17; x=-6+12*u; z=4.6-0.9*math.sin(math.pi*u)
        cyl((x,1.0,z),0.16,0.02,mat(f"tw_flag{k%4}",cols[k%4],0.6,0.2),verts=3,rot=(math.pi/2,0,0),name="flag")
    tube([(-6,1.0,4.6),(0,1.0,3.7),(6,1.0,4.6)],0.008,iron,name="bunting_line")

def lights():
    sc=bpy.context.scene
    bpy.ops.object.light_add(type='SUN',rotation=(math.radians(50),0,math.radians(-40))); s=bpy.context.object.data; s.energy=5.5; s.color=(1.0,0.90,0.74); s.angle=math.radians(2)
    bpy.ops.object.light_add(type='AREA',location=(0,-6,6),rotation=(math.radians(40),0,0)); a=bpy.context.object.data; a.energy=220; a.size=8; a.color=(1.0,0.96,0.90)
    w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(0.80,0.84,0.92,1); bg.inputs[1].default_value=0.6
