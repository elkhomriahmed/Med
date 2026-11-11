"""5 s style test: 3 shots in the approved cottage, one bake, fast Workbench frames."""
import bpy, sys, os, time, math, json, random
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from toon import *
from sets import cottage
import characters as ch, bake
import cv2, numpy as np
from mathutils import Vector
OUT=sys.argv[-1]; os.makedirs(OUT,exist_ok=True); T0=time.time(); E=os.environ.get
FPS=30; DUR=float(E("DUR","6.9")); NF=int(round(DUR*FPS))
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS; sc.frame_start=1; sc.frame_end=NF
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=2.4,focus=2)
os.environ.update(SUN="4",KEY="14000",FILL="12",FRONT="4",WORLD="0.45",WINL="260",VIEWEMIT="2.2",LAMP="0")
cottage.build(); cottage.lights()
sc.world.node_tree.nodes["Background"].inputs[1].default_value=0.45
S=bpy.data.collections["set"]; random.seed(3)
gold=mat("gold",(1.0,0.78,0.2),0.2,0.8,emit=0.35); hole=mat("hole",(0.06,0.04,0.03),0.9,0.0)
fl=wood("liftboard",(0.78,0.52,0.28),(0.5,0.3,0.15),axis="Y",grain=5,bump=0.15)
def lifted(x,y,ang=0.55,coin=True,side=1):
    box((x,y,0.003),(0.19,0.62,0.004),hole,0,coll=S,name="hole")
    b=box((x+side*0.2,y,0.09),(0.19,0.62,0.05),fl,0.008,rot=(0,side*ang,random.uniform(-0.15,0.15)),coll=S,name="lift")
    if coin:
        for k in range(random.choice((1,2,3))):
            cyl((x+random.uniform(-0.05,0.05),y+random.uniform(-0.2,0.2),0.012+0.006*k),0.032,0.008,gold,verts=24,coll=S,name="coin")
# row of opened boards (shot 2) in the front-left floor
for i,x in enumerate((-1.75,-1.3,-0.85,-0.4)): lifted(x,-1.0,side=1 if i%2 else -1)
# keeper's board (shot 1)
lifted(-1.05,0.0)
# torn-out area around the son (shot 3)
for x in (-0.05,0.35,0.75): lifted(x,0.35,coin=False,side=-1)
for k in range(6):
    box((random.uniform(-0.3,0.8),random.uniform(0.0,0.6),0.03+0.05*k),(0.19,random.uniform(0.5,0.9),0.05),fl,0.008,rot=(random.uniform(-0.2,0.2),random.uniform(-0.2,0.2),random.uniform(0,3.1)),coll=S,name="torn")
# characters (approved design)
K=ch.Character("keeper",(-1.35,0.35,0),math.radians(25),face="smug").build(R=0.3,torso_w=0.16,coat=(0.93,0.68,0.16),buttons=3,hat="beanie",beard=True,shirt=(0.93,0.68,0.16),shoes=(0.08,0.06,0.05),arms=list(ch.POSES["hold"]))
Sn=ch.Character("engineer",(0.38,0.95,0),math.radians(-15),face="worried").build(R=0.29,torso_w=0.15,hair=(0.42,0.25,0.13),tie=(0.24,0.36,0.56),arms=list(ch.POSES["hold"]))
bpy.context.view_layer.update()
def hands(root):
    hs=[o for o in bpy.data.collections["limbs"].objects if o.parent==root and o.type=='MESH' and max(o.dimensions)<0.06]
    return [o.matrix_world.translation.copy() for o in hs]
kh=hands(K.root); mid=sum(kh,Vector())/len(kh); cyl((mid.x,mid.y-0.1,mid.z+0.03),0.055,0.012,gold,rot=(math.pi/2,0,0),coll=S,name="heldcoin")
sh=hands(Sn.root); m2=sum(sh,Vector())/len(sh); box((m2.x,m2.y-0.12,m2.z+0.02),(0.62,0.17,0.05),fl,0.008,rot=(0.25,0.35,0),coll=S,name="heldboard")
# ---------- camera: 3 shots, fast whoosh moves between them ----------
KH=Vector((-1.35,0.35,1.55)); SH=Vector((0.75,0.75,1.5))
shots=[ # (t_start, t_end, cam_from, cam_to, tgt_from, tgt_to, lens, focus)
 (0.0, 1.45, (-0.55,-1.35,1.3),(-0.7,-1.05,1.35), (-1.2,0.3,1.12),(-1.25,0.32,1.2), 30),
 (1.70, 3.40,(-2.1,-1.85,0.95),(-0.15,-1.95,0.95),(-1.55,-1.0,0.03),(-0.55,-1.0,0.03), 30),
 (3.65, DUR, (-0.15,-0.95,1.25),(-0.05,-0.7,1.3),(0.38,0.8,1.05),(0.38,0.85,1.15), 30)]
def ease(t): return t*t*(3-2*t)
def keyf(obj,frame,loc):
    obj.location=loc; obj.keyframe_insert("location",frame=frame)
for (a,b,c0,c1,t0,t1,lens) in shots:
    fa=int(a*FPS)+1; fb=int(b*FPS)+1
    keyf(cam,fa,c0); keyf(cam,fb,c1); keyf(tgt,fa,t0); keyf(tgt,fb,t1)
    for f,(cc,tt) in ((fa,(c0,t0)),(fb,(c1,t1))):
        cam.data.dof.focus_distance=(Vector(cc)-Vector(tt)).length; cam.data.dof.keyframe_insert("focus_distance",frame=f)
for o in (cam,tgt):
    for fc in o.animation_data.action.fcurves if hasattr(o.animation_data.action,'fcurves') else []:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'; kp.easing='EASE_IN_OUT'
# ---------- bake (once) ----------
faces=set(bpy.data.collections["faces"].all_objects)
names_c={o.name for o in bpy.data.collections["chars"].all_objects}|{o.name for o in bpy.data.collections["limbs"].all_objects}
allobjs=[o for o in sc.objects if o.type in ('MESH','CURVE') and o not in faces]
allobjs=[o for o in bake.to_mesh(allobjs) if o.type=='MESH']
for o in allobjs:
    mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
setl=[o for o in allobjs if o.name not in names_c]; chl=[o for o in allobjs if o.name in names_c]
setg=bake.join(setl,"world"); cast=bake.join(chl,"cast")
bake.unwrap([setg],margin=0.0012); bake.unwrap([cast],margin=0.003)
for g,AS,LS,is_set in ((setg,4096,1024,True),(cast,2048,1024,False)):
    alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
    lit=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,int(E("SPP","128")),['DIRECT','INDIRECT'])),(0,0),2.5)
    emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
    if is_set:
        ao=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'AO',LS,32)),(0,0),0.8); lit=lit*(0.3+0.7*ao)
    ink=np.zeros(alb.shape[:2],np.float32) if is_set else bake.ink_mask([g],AS,3,min_angle=70)
    bake.apply_baked([g],bake.compose(alb,lit,emi,ink,exposure=1.0,sat=1.15,contrast=1.1),name="atlas_"+g.name)
bake.ink_shell([cast],0.011)
bake.workbench(sc); sc.display.shading.use_dof=True; sc.display.render_aa=E("AA","5")
# ---------- expressions on words ----------
W=json.load(open(E("WORDS")))
def t_of(word,nth=0):
    hits=[w for w in W if w[2].strip(",.").lower()==word]; return hits[nth][0]
FACES={"keeper":[(0,"smug"),(t_of("hid"),"evil"),(t_of("coin"),"smug")],
       "engineer":[(0,"worried"),(t_of("years"),"worried"),(t_of("tearing"),"furious"),(t_of("out"),"angry")]}
chars={"keeper":K,"engineer":Sn}
def on_frame(scene,*a):
    t=(scene.frame_current-1)/FPS
    for n,seq in FACES.items():
        cur=[f for s,f in seq if s<=t][-1]; chars[n].set_face(cur)
bpy.app.handlers.frame_change_pre.append(on_frame)
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
sc.render.filepath=OUT+"/f_"; sc.render.image_settings.file_format='PNG'
if E("KEYS"):
    for f in map(int,E("KEYS").split(",")):
        sc.frame_set(f); sc.render.filepath=f"{OUT}/k_{f:04d}.png"; bpy.ops.render.render(write_still=True)
    sys.exit(0)
t=time.time(); bpy.ops.render.render(animation=True); print("FRAMES",NF,round(time.time()-t,1),flush=True)
