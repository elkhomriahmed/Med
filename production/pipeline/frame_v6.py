"""Look v6 test frame: no set ink, two-family palette, gloss pass, action composition, post light shafts."""
import bpy, sys, os, time, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from toon import *
from sets import cottage
import characters as ch, bake
import cv2, numpy as np
OUT=sys.argv[-1]; T0=time.time(); E=os.environ.get
sc=reset(pct=100)
cam,tgt=camera(sc,(0.95,-1.55,0.98),(-0.05,0.45,1.3),lens=26,fstop=float(E("FSTOP","2.0")),focus=2.25)
os.environ.update(SUN="3",KEY=E("KEY","9000"),FILL=E("FILL","10"),FRONT=E("FRONT","22"))
cottage.build(); cottage.lights()
sc.world.node_tree.nodes["Background"].inputs[1].default_value=float(E("WORLD","0.5"))
# foreground hero prop: glass jar of mercury on the table (closest to camera)
S=bpy.data.collections["set"]
glass=mat("jarglass",(0.75,0.88,0.95),0.05,1.0); merc=mat("mercury",(0.82,0.84,0.88),0.04,1.0)
cyl((0.95,-0.85,0.87),0.075,0.17,glass,coll=S,name="jar"); cyl((0.95,-0.85,0.97),0.06,0.03,mat("cork",(0.6,0.42,0.25),0.9,0.05),coll=S)
sph((0.95,-0.85,0.83),(0.062,0.062,0.045),merc,coll=S,name="mercury")
k=ch.keeper((-0.42,0.3,0),yaw=math.radians(30),face=E("KF","skeptical"),pose="hips",look=0.09)
e=ch.engineer((0.38,0.42,0),yaw=math.radians(-38),face=E("EF","happy"),pose="point",look=-0.09)
faces=set(bpy.data.collections["faces"].all_objects)
names_c={o.name for o in bpy.data.collections["chars"].all_objects}|{o.name for o in bpy.data.collections["limbs"].all_objects}
allobjs=[o for o in sc.objects if o.type in ('MESH','CURVE') and o not in faces]
allobjs=[o for o in bake.to_mesh(allobjs) if o.type=='MESH']
for o in allobjs:
    mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
setl=[o for o in allobjs if o.name not in names_c]; chl=[o for o in allobjs if o.name in names_c]
setg=bake.join(setl,"world"); cast=bake.join(chl,"cast")
bake.unwrap([setg],margin=0.0012); bake.unwrap([cast],margin=0.003)
def do(g,AS,LS,spp,is_set):
    alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
    lit=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,spp,['DIRECT','INDIRECT'])),(0,0),0.7)
    emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
    gl=None
    if is_set:
        ao=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'AO',LS,32)),(0,0),0.8); lit=lit*(0.3+0.7*ao)
    ink=np.zeros(alb.shape[:2],np.float32) if is_set else bake.ink_mask([g],AS,3,min_angle=70)
    final=bake.compose(alb,lit,emi,ink,exposure=float(E("EXPO","1.15")),sat=float(E("SAT","1.3")),contrast=float(E("CON","1.08")),gloss=gl)
    bake.apply_baked([g],final,name="atlas_"+g.name)
do(setg,int(E("ATLAS","8192")),2048,int(E("SPP","64")),True)
do(cast,2048,1024,int(E("SPP","64")),False)
bake.ink_shell([cast],0.012,wobble=0.55)   # characters only: hand-drawn outline
bake.workbench(sc)
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
def post(src,dst):
    im=cv2.imread(src).astype(np.float32)/255
    g=im.mean(-1)
    # light shafts from the sunlit window: directional smear of the brightest pixels, warm tint
    m=np.clip((g-0.9)*8,0,1); h,w=m.shape; acc=np.zeros_like(m); dx,dy=-0.012*w,0.02*h
    for i in range(1,28):
        M=np.float32([[1,0,dx*i],[0,1,dy*i]]); acc+=cv2.warpAffine(m,M,(w,h))*(1-i/28)
    acc=cv2.GaussianBlur(acc/10,(0,0),9)
    im+=acc[...,None]*np.array([0.55,0.8,1.0])*float(E("SHAFT","0.35"))   # BGR
    # bloom
    br=np.clip(im-0.95,0,None); im+=cv2.GaussianBlur(br,(0,0),w*0.02)*0.8+cv2.GaussianBlur(br,(0,0),w*0.006)*0.5
    # soft vignette
    yy,xx=np.mgrid[0:h,0:w]; r=np.sqrt(((xx-w/2)/(w/2))**2+((yy-h/2)/(h/2))**2); im*=(1-0.18*np.clip(r-0.55,0,1))[...,None]
    cv2.imwrite(dst,(np.clip(im,0,1)*255).astype(np.uint8))
for i,(dof,aa) in enumerate([(True,'8'),(True,'5'),(False,'8')]):
    sc.display.shading.use_dof=dof; sc.display.render_aa=aa
    sc.render.filepath=f"{OUT}_raw{i}.png"; t=time.time(); bpy.ops.render.render(write_still=True); print(f"FRAME dof={dof} aa={aa}",round(time.time()-t,2),flush=True)
    t=time.time(); post(f"{OUT}_raw{i}.png",f"{OUT}_f{i}.png"); print("POST",round(time.time()-t,2),flush=True)
