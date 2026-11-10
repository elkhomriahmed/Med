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
else: cam,tgt=camera(sc,(0.3,-2.05,1.45),(0.0,0.4,1.25),lens=30,fstop=float(os.environ.get('FSTOP','2.2')),focus=2.35)
os.environ.update(SUN="4",KEY=os.environ.get("KEY","7500"),FILL=os.environ.get("FILL","6"),FRONT=os.environ.get("FRONT","14"))
cottage.build(); cottage.lights()
sc.world.node_tree.nodes["Background"].inputs[1].default_value=float(os.environ.get("WORLD","0.25"))
ch.keeper((-0.42,0.25,0),yaw=math.radians(24),face=os.environ.get("KF","skeptical"),pose=os.environ.get("KP","hips"))
ch.engineer((0.42,0.42,0),yaw=math.radians(-30),face=os.environ.get("EF","happy"),pose=os.environ.get("EP","explain"))
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
    bake.unwrap([g],margin=0.0012 if do_ink else 0.003)
for g,AS,do_ink in groups:
    LS=min(AS//2,int(os.environ.get("LMAX","2048")))
    alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
    cv2.imwrite(OUT+'_alb_'+g.name+'.jpg',(np.clip(alb,0,1)[...,::-1]**(1/2.2)*255).astype(np.uint8))
    lit=bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,int(os.environ.get("SPP","256")),['DIRECT','INDIRECT']))
    emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
    ink=np.zeros(alb.shape[:2],np.float32) if do_ink else bake.ink_mask([g],AS,int(os.environ.get("CINKW","3")),min_angle=70)
    lit=cv2.GaussianBlur(lit,(0,0),0.7)
    if do_ink:
        ao=bake.img_np(bake.bake_pass([g],'AO',LS,32))
        ao=cv2.GaussianBlur(ao,(0,0),0.8); lit=lit*(0.35+0.65*ao)
    final=bake.compose(alb,lit,emi,ink,exposure=float(os.environ.get("EXPO","1.15")),sat=float(os.environ.get("SAT","1.25")),contrast=float(os.environ.get("CON","1.15")))
    bake.apply_baked([g],final,name="atlas_"+g.name)
bake.ink_shell([groups[0][0]],float(os.environ.get("INKSHELL","0.008")))
bake.ink_shell([groups[1][0]],float(os.environ.get("CSHELL","0.011")))
bake.workbench(sc)
sc.display.shading.use_dof=True if hasattr(sc.display.shading,'use_dof') else None
bpy.ops.wm.save_as_mainfile(filepath=OUT+".blend")
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
for i,dof in enumerate((True,)):
    sc.display.shading.use_dof=dof
    sc.render.filepath=f"{OUT}_f{i}.png"; t=time.time(); bpy.ops.render.render(write_still=True); print("FRAME dof" if dof else "FRAME nodof",round(time.time()-t,2),flush=True)
