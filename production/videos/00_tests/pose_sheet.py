"""Pose sheet for puppet v2: renders acting poses as stills on a plain studio floor."""
import bpy, sys, os, math
sys.path.insert(0,"/home/user/Med/production/pipeline")
from toon import *
import engine, bake, puppet as PP
from mathutils import Vector
OUT=sys.argv[-1]; os.makedirs(OUT,exist_ok=True)
sc=reset(pct=int(os.environ.get("PCT","40")))
cam,tgt=camera(sc,(0.6,-3.6,1.35),(0,0,1.0),lens=32)
fl=engine.solid("floorc",(0.58,0.50,0.40)); bpy.ops.mesh.primitive_plane_add(size=12); bpy.context.object.data.materials.append(fl)
bpy.ops.mesh.primitive_plane_add(size=12,location=(0,4,0),rotation=(math.pi/2,0,0)); bpy.context.object.data.materials.append(engine.solid("wallc",(0.62,0.72,0.82)))
who=os.environ.get("WHO","keeper")
p=PP.Puppet(who,(0,0,0),float(os.environ.get('YAW','0.85')),cam=cam)
bake.workbench(sc)
POSES=[("rest",{},"neutral"),
 ("sit",dict(crouch=0.92,feetfwd=0.30,bend=0.05,arms={1:("body",(0.0,0.30,-0.40)),-1:("body",(0.0,0.30,-0.40))}),"smug"),
 ("sit-crossed",dict(crouch=0.92,feetfwd=0.30,cross=1.0,bend=-0.05,tilt=0.1,arms={1:("body",(0.0,0.30,-0.40)),-1:("body",(0.02,0.22,-0.22))}),"happy"),
 ("talk-gesture",dict(tilt=0.1,arms={-1:("body",(0.22,0.24,-0.02)),1:("rest",)}),"talk"),
 ("hands-hips",dict(sbend=0.15,arms={1:("body",(0.14,-0.02,-0.32)),-1:("body",(0.14,-0.02,-0.32))}),"skeptical"),
 ("lean-in",dict(bend=0.35,tilt=-0.1,arms={-1:("body",(0.12,0.36,0.04)),1:("rest",)}),"angry")]
for i,(nm,k,face) in enumerate(POSES):
    k=dict(k); k['yaw']=float(os.environ.get('YAW','0.85'))
    p.keys=[(0.0,{'yaw':k['yaw']}),(0.2,k)]; p.feet={}; p.step={}; p.spr={c:PP.Spring() for c in PP.CH}; p.hspr={}; p.t_prev=None; p.spr['yaw'].x=float(os.environ.get('YAW','0.85'))
    p.settle(3.0,120)
    img=bpy.data.images.load(f"{PP.FACEDIR}/{p.face_char}_{face}.png",check_existing=True)
    for n in p.face_mat.node_tree.nodes:
        if n.type=='TEX_IMAGE': n.image=img
    bpy.context.view_layer.update(); sc.render.filepath=f"{OUT}/{who}_{i}_{nm}.png"; bpy.ops.render.render(write_still=True)
print("POSES DONE")
