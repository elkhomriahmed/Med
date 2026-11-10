import bpy, sys, os, time, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("FAST","1")
from toon import *
from sets import cottage
import characters as ch, bake
OUT=sys.argv[-1]; T0=time.time()
sc=reset(pct=100)
SHOTP=os.environ.get("SHOT","two")
if SHOTP=="wide": cam,tgt=camera(sc,(1.25,-2.9,1.4),(-0.05,0.45,1.15),lens=34,fstop=16,focus=3.4)
else: cam,tgt=camera(sc,(0.45,-2.55,1.45),(0.0,0.4,1.15),lens=30,fstop=16,focus=2.9)
os.environ.update(SUN="4",KEY=os.environ.get("KEY","7500"),FILL=os.environ.get("FILL","6"),FRONT=os.environ.get("FRONT","14"))
cottage.build(); cottage.lights()
sc.world.node_tree.nodes["Background"].inputs[1].default_value=float(os.environ.get("WORLD","0.25"))
ch.keeper((-0.5,0.2,0),yaw=math.radians(28),face=os.environ.get("KF","skeptical"),pose=os.environ.get("KP","hips"))
ch.engineer((0.5,0.5,0),yaw=math.radians(-38),face=os.environ.get("EF","happy"),pose=os.environ.get("EP","explain"))
faces=set(bpy.data.collections["faces"].all_objects)
charobjs=set(bpy.data.collections["chars"].all_objects)|set(bpy.data.collections["limbs"].all_objects)
allobjs=[o for o in sc.objects if o.type in ('MESH','CURVE') and o not in faces]
allobjs=[o for o in bake.to_mesh(allobjs) if o.type=='MESH']
for o in allobjs:
    mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
names_c={o.name for o in charobjs}
setobjs=[o for o in allobjs if o.name not in names_c]; chobjs=[o for o in allobjs if o.name in names_c]
groups=[(bake.join(setobjs,"world"),int(os.environ.get("ATLAS","4096")),True),(bake.join(chobjs,"cast"),int(os.environ.get("CATLAS","2048")),False)]
import cv2, numpy as np
for g,AS,do_ink in groups:
    bake.unwrap([g],margin=0.004)
for g,AS,do_ink in groups:
    LS=AS//4 if do_ink else AS//2
    alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
    lit=bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,int(os.environ.get("SPP","256")),['DIRECT','INDIRECT']))
    emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
    ink=bake.ink_mask([g],AS,int(os.environ.get("INKW","3"))) if do_ink else np.zeros(alb.shape[:2],np.float32)
    lit=cv2.GaussianBlur(lit,(0,0),1.0)
    final=bake.compose(alb,lit,emi,ink,exposure=float(os.environ.get("EXPO","1.15")),sat=float(os.environ.get("SAT","1.25")),contrast=float(os.environ.get("CON","1.15")))
    bake.apply_baked([g],final,name="atlas_"+g.name)
bake.ink_shell([groups[0][0]],float(os.environ.get("INKSHELL","0.008")))
bake.ink_shell([groups[1][0]],float(os.environ.get("CSHELL","0.011")))
bake.workbench(sc)
bpy.ops.wm.save_as_mainfile(filepath=OUT+".blend")
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
for i in range(3):
    sc.render.filepath=f"{OUT}_f{i}.png"; t=time.time(); bpy.ops.render.render(write_still=True); print("FRAME",round(time.time()-t,2),flush=True)
