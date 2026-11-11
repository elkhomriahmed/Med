"""5 s sample v3: animated bodies/arms, coin toss, opening push-in, punch-ins, shake. One bake, Workbench frames."""
import bpy, sys, os, time, math, json, random
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from toon import *
from sets import cottage
import characters as ch, bake
import cv2, numpy as np
from mathutils import Vector
OUT=sys.argv[-1]; os.makedirs(OUT,exist_ok=True); T0=time.time(); E=os.environ.get
W=json.load(open(E("WORDS")))
def tw(word,nth=0): return [w for w in W if w[2].strip(",.").lower()==word][nth][0]
FPS=30; DUR=W[-1][1]+0.35; NF=int(math.ceil(DUR*FPS))
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS; sc.frame_start=1; sc.frame_end=NF
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=2.4,focus=2)
os.environ.update(SUN="4",KEY="14000",FILL="12",FRONT="4",WORLD="0.45",WINL="260",VIEWEMIT="2.2",LAMP="0")
cottage.build(); cottage.lights()
sc.world.node_tree.nodes["Background"].inputs[1].default_value=0.45
S=bpy.data.collections["set"]; random.seed(3)
gold=mat("gold",(1.0,0.78,0.2),0.2,0.8,emit=0.35); hole=mat("hole",(0.06,0.04,0.03),0.9,0.0)
fl=wood("liftboard",(0.78,0.52,0.28),(0.5,0.3,0.15),axis="Y",grain=5,bump=0.15)
HOLE=(-1.0,-0.05)
def lifted(x,y,ang=0.55,coin=True,side=1):
    box((x,y,0.003),(0.19,0.62,0.004),hole,0,coll=S,name="hole")
    box((x+side*0.2,y,0.09),(0.19,0.62,0.05),fl,0.008,rot=(0,side*ang,random.uniform(-0.15,0.15)),coll=S,name="lift")
    if coin:
        for k in range(random.choice((1,2,3))):
            cyl((x+random.uniform(-0.05,0.05),y+random.uniform(-0.2,0.2),0.012+0.006*k),0.032,0.008,gold,verts=24,coll=S,name="coin")
for i,x in enumerate((-1.75,-1.3,-0.85,-0.4)): lifted(x,-1.0,side=1 if i%2 else -1)
lifted(*HOLE)
for x in (-0.05,0.35,0.75): lifted(x,0.35,coin=False,side=-1)
for k in range(6):
    box((random.uniform(-0.3,0.8),random.uniform(0.0,0.6),0.03+0.05*k),(0.19,random.uniform(0.5,0.9),0.05),fl,0.008,rot=(random.uniform(-0.2,0.2),random.uniform(-0.2,0.2),random.uniform(0,3.1)),coll=S,name="torn")
K=ch.Character("keeper",(-1.35,0.35,0),math.radians(25),face="smug").build(R=0.3,torso_w=0.16,coat=(0.93,0.68,0.16),buttons=3,hat="beanie",beard=True,shirt=(0.93,0.68,0.16),shoes=(0.08,0.06,0.05),arms=list(ch.POSES["rest"]))
N=ch.Character("engineer",(0.38,0.95,0),math.radians(-15),face="worried").build(R=0.29,torso_w=0.15,hair=(0.42,0.25,0.13),tie=(0.24,0.36,0.56),arms=list(ch.POSES["hold"]))
bpy.context.view_layer.update()
# ---------- split each character: body (baked) / arms (live, animated) ----------
def wmaxz(o): return max((o.matrix_world@Vector(c)).z for c in o.bound_box)
def solid(name,col,emit=1.0):
    im=bpy.data.images.new(name,4,4); im.pixels.foreach_set(list(col)+[1.0]*0 if False else [c for _ in range(16) for c in (*col,1.0)]); im.pack()
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; n.clear()
    o=n.new('ShaderNodeOutputMaterial'); e=n.new('ShaderNodeEmission'); t=n.new('ShaderNodeTexImage'); t.image=im
    nt.links.new(t.outputs[0],e.inputs[0]); nt.links.new(e.outputs[0],o.inputs[0]); n.active=t; return m
INKM=solid("inksolid",(0.035,0.025,0.02))
limbs=bpy.data.collections["limbs"]
rigs={}
for name,C in (("keeper",K),("engineer",N)):
    L=[o for o in limbs.objects if o.parent==C.root]
    arms=[o for o in L if o.type=='CURVE' and wmaxz(o)>1.0]
    hands=[o for o in L if o.type=='MESH' and wmaxz(o)>0.4]
    body=[o for o in C.coll.all_objects if o.type in('MESH','CURVE')]+[o for o in L if o not in arms and o not in hands]
    A=bpy.data.objects.new(name+"_anim",None); sc.collection.objects.link(A); A.location=C.root.location.copy(); A.rotation_euler=C.root.rotation_euler.copy()
    piv=[]
    ends=[]; used=set()
    for a in arms:
        sp=a.data.splines[0]; p0=a.matrix_world@(sp.bezier_points[0].co if len(sp.bezier_points) else sp.points[0].co.xyz)
        pend=a.matrix_world@(sp.bezier_points[-1].co if len(sp.bezier_points) else sp.points[-1].co.xyz)
        ends.append((p0,pend))
    arms=[o for o in bake.to_mesh(arms)]
    for a in arms:
        mw=a.matrix_world.copy(); a.parent=None; a.matrix_world=mw
    for a,(p0,pend) in zip(arms,ends):
        h=min([o for o in hands if o not in used],key=lambda o:(o.matrix_world.translation-pend).length); used.add(h)
        mw=h.matrix_world.copy(); h.parent=None; h.matrix_world=mw
        P=bpy.data.objects.new(name+"_shoulder",None); sc.collection.objects.link(P); P.location=p0; bpy.context.view_layer.update()
        for o in (a,h):
            mw=o.matrix_world.copy(); o.parent=P; o.matrix_world=mw
            o.data.materials.clear(); o.data.materials.append(INKM)
        side=1 if (p0-A.location).dot(Vector((math.cos(A.rotation_euler.z),math.sin(A.rotation_euler.z),0)))>0 else -1
        piv.append((P,side,h))
    rigs[name]=dict(A=A,body=body,piv=piv,face=C)
bpy.context.view_layer.update()
for r in rigs.values():
    for P,_,_ in r["piv"]:
        mw=P.matrix_world.copy(); P.parent=r["A"]; P.matrix_world=mw
    fp=bpy.data.objects[r["face"].name+"_facepiv"]; mw=fp.matrix_world.copy(); fp.parent=r["A"]; fp.matrix_world=mw
if E("DBG"):
    for n,r in rigs.items():
        for P,side,h in r["piv"]:
            for c in P.children:
                bb=[c.matrix_world@Vector(x) for x in c.bound_box]; print("DBG",n,c.name,c.type,side,[round(min(v[i] for v in bb),2) for i in range(3)],[round(max(v[i] for v in bb),2) for i in range(3)],"P",tuple(round(x,2) for x in P.matrix_world.translation))
    fp=bpy.data.objects["engineer_facepiv"]; print("DBG face",[ (o.name,o.type) for o in fp.children])
    print("DBG faces coll",[o.name for o in bpy.data.collections["faces"].all_objects])
    sys.exit(0)
# live props
coin=bpy.data.objects.new("tosscoin",bpy.data.meshes.new("tc")); sc.collection.objects.link(coin)
bpy.ops.mesh.primitive_cylinder_add(radius=0.085,depth=0.018,vertices=32); tc=bpy.context.object; coin.data=tc.data; bpy.data.objects.remove(tc)
coin.data.materials.append(solid("goldsolid",(1.0,0.85,0.2))); coin.scale=(1,1,1)
# ---------- bake: set + each character body ----------
faces=set(bpy.data.collections["faces"].all_objects); live={coin}|{o for r in rigs.values() for P,_,h in r["piv"] for o in (h,)}
armset={c for r in rigs.values() for P,_,_ in r["piv"] for c in P.children}
groups=[]
bodyall=set()
for name,r in rigs.items():
    objs=[o for o in bake.to_mesh(r["body"]) if o.type=='MESH']
    for o in objs:
        mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
    j=bake.join(objs,name+"_body"); bodyall.add(j.name); r["mesh"]=j
setobjs=[o for o in sc.objects if o.type in('MESH','CURVE') and o not in faces and o not in live and o not in armset and o.name not in bodyall]
setobjs=[o for o in bake.to_mesh(setobjs) if o.type=='MESH']
for o in setobjs:
    mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
setg=bake.join(setobjs,"world")
bake.unwrap([setg],margin=0.0012)
for r in rigs.values(): bake.unwrap([r["mesh"]],margin=0.003)
def do(g,AS,LS,is_set):
    alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
    lit=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,int(E("SPP","128")),['DIRECT','INDIRECT'])),(0,0),2.5)
    emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
    if is_set:
        ao=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'AO',LS,32)),(0,0),0.8); lit=lit*(0.3+0.7*ao)
    ink=np.zeros(alb.shape[:2],np.float32) if is_set else bake.ink_mask([g],AS,3,min_angle=70)
    bake.apply_baked([g],bake.compose(alb,lit,emi,ink,exposure=1.0,sat=1.15,contrast=1.1),name="atlas_"+g.name)
do(setg,int(E('ATLAS','2048')),512,True)
for r in rigs.values():
    do(r["mesh"],1024,512,False); bake.ink_shell([r["mesh"]],float(E("CSHELL","0.017")))
    ms=r["mesh"].data.materials
    for i,m in enumerate(ms):
        if m and m.name.startswith("inkshell"): ms[i]=INKM
    bpy.ops.object.select_all(action='DESELECT'); r["mesh"].select_set(True); bpy.context.view_layer.objects.active=r["mesh"]
    bpy.ops.object.modifier_apply(modifier="shell")
    mw=r["mesh"].matrix_world.copy(); r["mesh"].parent=r["A"]; r["mesh"].matrix_world=mw
bake.workbench(sc); sc.display.shading.use_dof=False; sc.display.render_aa=E("AA","8")
print("PREP TOTAL",round(time.time()-T0,1),flush=True)
# ---------- animation (procedural, keyed per frame) ----------
def ss(x): x=min(1,max(0,x)); return x*x*(3-2*x)
def pulse(t,t0,up=0.08,down=0.25):   # 0->1->0 quick bump
    if t<t0: return 0
    if t<t0+up: return ss((t-t0)/up)
    return 1-ss((t-t0-up)/down)
T_HID,T_COIN,T_HOUSE=tw("hid"),tw("coin"),tw("house")
T_SON,T_YEARS,T_TEAR,T_OUT=tw("son"),tw("years"),tw("tearing"),tw("out")
T_UNDER,T_FLOOR=tw("under"),tw("floorboard")
REL=T_UNDER-0.05; LAND=T_FLOOR+0.12
KF=Vector((-1.35,0.35,1.55))
CAMK=[ # t, cam, tgt, lens  -- close on the keeper's face, punch-ins on his expressions
 (0.00,(1.7,-3.1,2.5),(-1.2,0.3,1.3),22),
 (0.30,(-0.95,-0.55,1.58),(-1.33,0.33,1.5),34),
 (T_HID+0.08,(-0.97,-0.5,1.58),(-1.33,0.33,1.5),40),
 (T_COIN,(-0.97,-0.48,1.58),(-1.33,0.33,1.52),40),
 (T_COIN+0.1,(-0.95,-0.55,1.56),(-1.33,0.33,1.5),46),
 (REL,(-0.92,-0.62,1.52),(-1.3,0.33,1.45),38),
 (LAND,(-0.5,-1.5,1.35),(-1.1,0.12,0.8),27),
 (1.98,(-0.48,-1.55,1.33),(-1.1,0.12,0.78),28),
 (2.22,(-2.1,-1.85,0.95),(-1.55,-1.0,0.03),30),
 (T_HOUSE,(-0.6,-1.92,0.9),(-0.75,-1.0,0.03),31),
 (T_HOUSE+0.12,(-0.5,-1.75,0.8),(-0.7,-1.0,0.03),35),
 (3.02,(-0.25,-1.85,0.85),(-0.55,-1.0,0.03),34),
 (3.27,(-0.15,-0.95,1.25),(0.38,0.8,1.08),30),
 (T_TEAR,(-0.06,-0.8,1.28),(0.38,0.85,1.12),33),
 (T_TEAR+0.1,(0.02,-0.6,1.3),(0.38,0.85,1.25),40),
 (T_OUT,(0.0,-0.65,1.3),(0.38,0.85,1.22),38),
 (T_OUT+0.15,(-0.12,-1.0,1.24),(0.38,0.82,1.1),29),
 (DUR+0.1,(-0.15,-1.05,1.22),(0.38,0.82,1.08),28)]
def camstate(t):
    for (a,c0,t0,l0),(b,c1,t1,l1) in zip(CAMK,CAMK[1:]):
        if a<=t<=b:
            u=ss((t-a)/(b-a)); L=lambda p,q: Vector(p).lerp(Vector(q),u); return L(c0,c1),L(t0,t1),l0+(l1-l0)*u
    k=CAMK[-1]; return Vector(k[1]),Vector(k[2]),k[3]
rng=np.random.default_rng(5); SHAKE=rng.standard_normal((NF+5,3))
FACES={"keeper":[(0,"smug"),(T_HID,"evil"),(T_COIN,"smug"),(REL,"evil"),(LAND,"proud")],
       "engineer":[(0,"worried"),(T_YEARS,"sleepy"),(T_TEAR,"furious"),(T_OUT,"angry")]}
EV=[("whoosh",0.0),("whoosh",1.98),("whoosh",3.02),("clink",LAND),("pop",T_HID),("pop",T_COIN),("pop",T_HOUSE),("crack",T_TEAR),("pop",T_OUT)]
json.dump(EV,open(OUT+"/sfx.json","w"))
KA=rigs["keeper"]; NA=rigs["engineer"]
k0=(KA["A"].location.copy(),KA["A"].rotation_euler.copy()); n0=(NA["A"].location.copy(),NA["A"].rotation_euler.copy())
def arm(P,side,raise_,fwd=0.0): P.rotation_euler=(fwd,-side*raise_,0)
for f in range(1,NF+1):
    t=(f-1)/FPS; sc.frame_set(f)
    c,g,l=camstate(t)
    sh=0.02*max(0,1-(t-T_TEAR)/0.45) if t>=T_TEAR else 0
    c=c+Vector(SHAKE[f])*sh; cam.location=c; tgt.location=g; cam.data.lens=l; cam.data.dof.focus_distance=(c-g).length
    for o,p in ((cam,"location"),(tgt,"location")): o.keyframe_insert(p,frame=f)
    cam.data.keyframe_insert("lens",frame=f); cam.data.dof.keyframe_insert("focus_distance",frame=f)
    # keeper: bob, sway, lean-in on 'hid', wind-up + throw
    A=KA["A"]; bob=0.014*math.sin(2*math.pi*2.4*t); hid=pulse(t,T_HID,0.1,0.35)
    wind=ss((t-(REL-0.22))/0.18)*(1-ss((t-REL)/0.06)); throw=ss((t-REL)/0.12)*(1-ss((t-REL-0.35)/0.3))
    A.location=k0[0]+Vector((0,0,bob+0.03*throw)); A.rotation_euler=(k0[1].x-0.18*hid+0.1*throw,k0[1].y+0.05*math.sin(2*math.pi*1.2*t),k0[1].z)
    A.scale=(1+0.05*hid,1+0.05*hid,1-0.07*hid+0.05*throw)
    for P,side,h in KA["piv"]:
        if side>0: arm(P,side,0.45+0.6*wind+0.5*throw,fwd=-0.5*wind+0.9*throw)
        else: arm(P,side,0.55+0.3*hid+0.12*math.sin(2*math.pi*1.5*t))
    # engineer: tired slump, then the yank
    A=NA["A"]; bob=0.012*math.sin(2*math.pi*2.1*t+1); sl=ss((t-T_YEARS)/0.25)*(1-ss((t-T_TEAR)/0.05))
    yk=ss((t-T_TEAR)/0.1); shk=0.09*math.sin(2*math.pi*9*t)*max(0,1-(t-T_TEAR)/0.5) if t>T_TEAR else 0; fl_=ss((t-T_OUT)/0.12)
    A.location=n0[0]+Vector((0,0.0,bob+0.07*yk*(1-fl_*0.6)-0.03*sl)); A.rotation_euler=(n0[1].x+0.12*sl-0.22*yk+0.15*fl_,n0[1].y+shk,n0[1].z)
    A.scale=(1-0.04*yk+0.05*sl,1,1+0.08*yk-0.06*sl)
    for P,side,h in NA["piv"]: arm(P,side,0.3+0.35*yk+0.5*fl_+0.06*math.sin(2*math.pi*1.7*t+side),fwd=-0.15*sl-0.8*yk*(1-fl_))
    for r in (KA,NA):
        for o in [r["A"]]+[p for p,_,_ in r["piv"]]:
            o.keyframe_insert("location",frame=f); o.keyframe_insert("rotation_euler",frame=f); o.keyframe_insert("scale",frame=f)
    # coin toss: from keeper's throwing hand to the open board
    bpy.context.view_layer.update()
    rh=[h for P,s,h in KA["piv"] if s>0][0].matrix_world.translation
    if t<REL: coin.scale=(1,1,1); coin.location=rh; coin.rotation_euler=(1.4,0,0)
    else:
        u=min(1,(t-REL)/(LAND-REL)); p0=Vector(rh) if u==0 else coin.get("p0",None)
        if "p0" not in coin: coin["p0"]=list(rh)
        a=Vector(coin["p0"]); b=Vector((HOLE[0],HOLE[1],0.02)); p=a.lerp(b,u); p.z+=0.35*math.sin(math.pi*u)
        if t>LAND:
            v=t-LAND; p.z+=abs(math.sin(v*18))*0.06*math.exp(-v*9)
        coin.location=p; coin.rotation_euler=(1.4+min(u,1)*10,min(u,1)*5,0); coin.scale=(1,1,1)
    # camera follows the coin during the flight
    if REL-0.05<=t<=LAND+0.25:
        w=ss((t-(REL-0.05))/0.12)*(1-ss((t-LAND-0.1)/0.15))
        tgt.location=tgt.location.lerp(coin.location,0.75*w); cam.data.lens=cam.data.lens*(1-w)+26*w
        cam.data.dof.focus_distance=(cam.location-tgt.location).length
        tgt.keyframe_insert("location",frame=f); cam.data.keyframe_insert("lens",frame=f)
    coin.keyframe_insert("location",frame=f); coin.keyframe_insert("rotation_euler",frame=f); coin.keyframe_insert("scale",frame=f)
for fc_owner in (cam,tgt,coin,cam.data,cam.data.dof):
    ad=getattr(fc_owner,"animation_data",None)
chars={"keeper":K,"engineer":N}
def on_frame(scene,*a):
    t=(scene.frame_current-1)/FPS
    for n,seq in FACES.items(): chars[n].set_face([fc for s,fc in seq if s<=t][-1])
bpy.app.handlers.frame_change_pre.append(on_frame)
if E("KEYS"):
    for f in map(int,E("KEYS").split(",")):
        sc.frame_set(f); sc.render.filepath=f"{OUT}/k_{f:04d}.png"; bpy.ops.render.render(write_still=True)
    sys.exit(0)
sc.render.filepath=OUT+"/f_"; sc.render.image_settings.file_format='PNG'
NP=int(E("NPROC","2"))
if NP>1:
    import subprocess
    json.dump({n:[(s,os.path.join(ch.FACEDIR,f"{n}_{fc}.png")) for s,fc in seq] for n,seq in FACES.items()},open(OUT+"/faces.json","w"))
    bpy.ops.wm.save_as_mainfile(filepath=OUT+"/scene.blend")
    t=time.time(); step=math.ceil(NF/NP); procs=[]
    for i in range(NP):
        a=1+i*step; b=min(NF,(i+1)*step)
        procs.append(subprocess.Popen([sys.executable,os.path.join(os.path.dirname(os.path.abspath(__file__)),"render_range.py"),OUT,str(a),str(b)],env=dict(os.environ)))
    for p in procs: p.wait()
    print("FRAMES",NF,round(time.time()-t,1),flush=True); sys.exit(0)
t=time.time(); bpy.ops.render.render(animation=True); print("FRAMES",NF,round(time.time()-t,1),flush=True)
