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
 ("sneak",dict(crouch=0.55,bend=0.55,lean=0.15,nod=-0.3,arms={1:("body",(0.10,0.25,-0.05)),-1:("body",(0.16,0.10,-0.12))}),"evil"),
 ("lean-in-curious",dict(bend=0.7,lean=0.1,tilt=0.25,arms={1:("body",(-0.02,0.12,-0.40)),-1:("body",(-0.02,0.12,-0.40))}),"skeptical"),
 ("laugh-back",dict(bend=-0.55,lean=-0.1,nod=-0.25,arms={1:("body",(0.0,0.17,-0.24)),-1:("body",(0.0,0.17,-0.30))}),"laugh"),
 ("knee-slap",dict(crouch=0.4,bend=0.85,lean=0.25,tilt=-0.15,arms={1:("body",(0.0,0.42,-0.55)),-1:("body",(0.2,0.05,0.12))}),"laugh"),
 ("hip-cocked",dict(sbend=0.3,side=0.06,tilt=-0.2,arms={1:("body",(0.13,-0.02,-0.30)),-1:("rest",)}),"smug"),
 ("slump",dict(bend=0.5,crouch=0.15,nod=0.35,arms={1:("rest",),-1:("rest",)}),"sleepy"),
 ("point-lean",dict(bend=0.25,sbend=-0.2,lean=0.08,arms={1:("body",(0.25,0.40,0.15)),-1:("rest",)}),"angry")]
for i,(nm,k,face) in enumerate(POSES):
    k=dict(k); k['yaw']=float(os.environ.get('YAW','0.85'))
    p.keys=[(0.0,{'yaw':k['yaw']}),(0.2,k)]; p.feet={}; p.step={}; p.spr={c:PP.Spring() for c in PP.CH}; p.hspr={}; p.t_prev=None; p.spr['yaw'].x=float(os.environ.get('YAW','0.85'))
    p.settle(3.0,90)
    img=bpy.data.images.load(f"{PP.FACEDIR}/{p.face_char}_{face}.png",check_existing=True)
    for n in p.face_mat.node_tree.nodes:
        if n.type=='TEX_IMAGE': n.image=img
    bpy.context.view_layer.update(); sc.render.filepath=f"{OUT}/{who}_{i}_{nm}.png"; bpy.ops.render.render(write_still=True)
print("POSES DONE")
