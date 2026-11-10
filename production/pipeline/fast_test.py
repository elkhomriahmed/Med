import bpy, sys, os, time, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("FAST","1")
from toon import *
from sets import cottage
import characters as ch, bake
OUT=sys.argv[-1]; T0=time.time()
sc=reset(pct=100)
cam,tgt=camera(sc,(1.25,-2.9,1.4),(-0.05,0.45,1.15),lens=34,fstop=5.6,focus=3.4)
os.environ.update(SUN="4",KEY="6000",FILL="12",FRONT="25")
cottage.build(); cottage.lights()
ch.keeper((-0.45,0.25,0),yaw=math.radians(-25),face="smug",arms=[[(0.06,0,-0.05),(0.13,-0.03,-0.28),(0.16,-0.06,-0.5)],[(0.06,0,-0.05),(0.2,-0.05,-0.2),(0.34,-0.1,-0.02)]])
ch.engineer((0.5,0.65,0),yaw=math.radians(-40),face="happy",arms=[[(0.05,-0.02,-0.04),(0.16,-0.12,-0.12),(0.3,-0.25,0.08)],[(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.11,-0.04,-0.5)]])
faces=set(bpy.data.collections["faces"].all_objects)
objs=[o for o in sc.objects if o.type in ('MESH','CURVE') and o not in faces]
objs=bake.to_mesh(objs); objs=[o for o in objs if o.type=='MESH']
for o in objs:   # unparent with transforms kept so the merged mesh stays in place
    mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
objs=[bake.join(objs,"world")]
print("objects",len(objs),"build",round(time.time()-T0,1),flush=True)
t=time.time(); bake.unwrap(objs); print("UNWRAP",round(time.time()-t,1),flush=True)
AS=int(os.environ.get("ATLAS","4096")); LS=int(os.environ.get("LIGHT","2048")); SPP=int(os.environ.get("SPP","32"))
alb=bake.img_np(bake.bake_pass(objs,'DIFFUSE',AS,1,['COLOR']))
lit=bake.img_np(bake.bake_pass(objs,'DIFFUSE',LS,SPP,['DIRECT','INDIRECT']))
emi=bake.img_np(bake.bake_pass(objs,'EMIT',LS,1))
t=time.time(); ink=bake.ink_mask(objs,AS,int(os.environ.get("INKW","5")),skip=())
print("INK",round(time.time()-t,1),flush=True)
# light can be noisy at low spp: smooth it a little (shadow edges stay readable)
import cv2, numpy as np
lit=cv2.bilateralFilter(lit,7,0.15,4)
final=bake.compose(alb,lit,emi,ink,exposure=float(os.environ.get("EXPO","1.0")),sat=float(os.environ.get("SAT","1.2")))
cv2.imwrite(OUT+"_atlas.jpg",(final[...,::-1]*255).astype(np.uint8)[::4,::4])
bake.apply_baked(objs,final)
shell_objs=[o for o in objs]
bake.ink_shell(shell_objs,float(os.environ.get("SHELL","0.008")))
bake.workbench(sc)
bpy.ops.wm.save_as_mainfile(filepath=OUT+".blend")
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
for i in range(3):
    sc.render.filepath=f"{OUT}_f{i}.png"; t=time.time(); bpy.ops.render.render(write_still=True); print("FRAME",round(time.time()-t,2),flush=True)
