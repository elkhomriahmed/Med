"""Pose sheet for puppet v2: renders acting poses as stills on a plain studio floor."""
import bpy, sys, os, math
sys.path.insert(0,"/home/user/Med/production/pipeline")
from toon import *
import engine, bake, puppet as PP
from mathutils import Vector
OUT=sys.argv[-1]; os.makedirs(OUT,exist_ok=True)
sc=reset(pct=int(os.environ.get("PCT","40")))
cam,tgt=camera(sc,(0.25,-3.1,1.2),(0,0,0.85),lens=32)
fl=engine.solid("floorc",(0.58,0.50,0.40)); bpy.ops.mesh.primitive_plane_add(size=12); bpy.context.object.data.materials.append(fl)
bpy.ops.mesh.primitive_plane_add(size=12,location=(0,4,0),rotation=(math.pi/2,0,0)); bpy.context.object.data.materials.append(engine.solid("wallc",(0.62,0.72,0.82)))
who=os.environ.get("WHO","keeper")
p=PP.Puppet(who,(0,0,0),0.0,cam=cam)
bake.workbench(sc)
POSES=[("rest",{},"neutral"),
 ("crouch-reach",dict(crouch=0.9,lean=0.55,nod=0.2,arms={1:("body",(0.05,0.32,-0.55)),-1:("body",(0.12,0.1,-0.35))}),"skeptical"),
 ("point",dict(lean=0.1,side=-0.08,turn=0.25,arms={1:("body",(0.22,0.38,0.12)),-1:("rest",)}),"angry"),
 ("laugh-back",dict(lean=-0.35,nod=-0.3,arms={1:("body",(0.0,0.17,-0.24)),-1:("body",(0.0,0.17,-0.30))}),"laugh"),
 ("knee-slap",dict(crouch=0.45,lean=0.75,nod=-0.2,tilt=0.15,arms={1:("body",(0.0,0.30,-0.62)),-1:("body",(0.18,0.05,0.1))}),"laugh"),
 ("jump",dict(air=0.28,squash=-0.06,arms={1:("body",(0.25,0.05,0.30)),-1:("body",(0.25,0.05,0.30))}),"shock"),
 ("shrug",dict(side=0.08,tilt=0.25,arms={1:("body",(0.26,0.12,-0.12)),-1:("body",(0.26,0.12,-0.12))}),"skeptical"),
 ("facepalm",dict(lean=0.2,nod=0.25,tilt=-0.1,arms={1:("world",lambda t:p.head_pos()+Vector((0.06,-0.25,0.05))),-1:("rest",)}),"worried")]
for i,(nm,k,face) in enumerate(POSES):
    p.keys=[(0.0,{}),(1.0,k)]; p.feet={}; p.step={}
    for t in (0.99,2.0): p.pose(t)
    img=bpy.data.images.load(f"{PP.FACEDIR}/{p.face_char}_{face}.png",check_existing=True)
    for n in p.face_mat.node_tree.nodes:
        if n.type=='TEX_IMAGE': n.image=img
    bpy.context.view_layer.update(); sc.render.filepath=f"{OUT}/{who}_{i}_{nm}.png"; bpy.ops.render.render(write_still=True)
print("POSES DONE")
