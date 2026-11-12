"""Video engine: everything proven in the 5-second sample, made reusable.
A segment = one place + one lighting state + a time window. The director gives camera keys,
character expressions/arms/body, prop animation and sound events; the engine bakes, keys every
frame and renders the window in parallel with the fast renderer."""
import bpy, sys, os, time, math, json, subprocess
from mathutils import Vector, Quaternion, Euler
from toon import *
import characters as ch, bake
import cv2, numpy as np

FPS=30
def ss(x): x=min(1.0,max(0.0,x)); return x*x*(3-2*x)
def pulse(t,t0,up=0.08,down=0.25):
    if t<t0: return 0.0
    if t<t0+up: return ss((t-t0)/up)
    return 1-ss((t-t0-up)/down)
def window(t,a,b,ramp=0.15): return ss((t-a)/ramp)*(1-ss((t-b)/ramp))

def solid(name,col):
    """Unlit flat material the fast renderer always draws (image-texture based)."""
    if name in bpy.data.materials: return bpy.data.materials[name]
    im=bpy.data.images.new(name,4,4); im.pixels.foreach_set([c for _ in range(16) for c in (*col,1.0)]); im.pack()
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; n.clear()
    o=n.new('ShaderNodeOutputMaterial'); e=n.new('ShaderNodeEmission'); t=n.new('ShaderNodeTexImage'); t.image=im
    nt.links.new(t.outputs[0],e.inputs[0]); nt.links.new(e.outputs[0],o.inputs[0]); n.active=t; return m

def image_live(name,path):
    """Flat image material whose picture can be swapped per frame (window views)."""
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; n.clear()
    o=n.new('ShaderNodeOutputMaterial'); e=n.new('ShaderNodeEmission'); t=n.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(path,check_existing=True)
    nt.links.new(t.outputs[0],e.inputs[0]); nt.links.new(e.outputs[0],o.inputs[0]); n.active=t; return m

def live(o,coll=None):
    o.name="LIVE_"+o.name
    for c in o.users_collection: c.objects.unlink(o)
    (coll or bpy.context.scene.collection).objects.link(o); return o

def text_obj(name,txt,font,size,col,loc=(0,0,0),extrude=0.01):
    cu=bpy.data.curves.new(name,'FONT'); cu.body=txt; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=size; cu.extrude=extrude
    cu.font=bpy.data.fonts.load(font,check_existing=True)
    o=bpy.data.objects.new("LIVE_"+name,cu); bpy.context.scene.collection.objects.link(o); o.location=loc
    cu.materials.append(solid(name+"_m",col)); return o

def face_camera(o,cam):
    c=o.constraints.new('TRACK_TO'); c.target=cam; c.track_axis='TRACK_Z'; c.up_axis='UP_Y'

def HP(o):
    """Where an object is actually drawn (mesh centre), not its stored origin."""
    bb=[o.matrix_world@Vector(c) for c in o.bound_box]; return sum(bb,Vector())/8

# ---------------- characters ----------------
def keeper(loc,yaw):
    return ch.Character("keeper",loc,yaw,face="neutral").build(R=0.3,torso_w=0.16,coat=(0.93,0.68,0.16),buttons=3,hat="beanie",beard=True,
        shirt=(0.93,0.68,0.16),shoes=(0.08,0.06,0.05),arms=list(ch.POSES["rest"]))
def engineer(loc,yaw):
    return ch.Character("engineer",loc,yaw,face="neutral").build(R=0.29,torso_w=0.15,hair=(0.42,0.25,0.13),tie=(0.24,0.36,0.56),arms=list(ch.POSES["rest"]))

class Rig:
    """Character split into: baked body (with ink outline), two live ink arms on shoulder pivots, live drawn face."""
    def __init__(self,name,C):
        sc=bpy.context.scene; self.name=name; self.C=C
        bpy.context.view_layer.update()
        def wmaxz(o): return max((o.matrix_world@Vector(c)).z for c in o.bound_box)
        limbs=bpy.data.collections["limbs"]
        L=[o for o in limbs.objects if o.parent==C.root]
        arms=[o for o in L if o.type=='CURVE' and wmaxz(o)>1.0]
        hands=[o for o in L if o.type=='MESH' and wmaxz(o)>0.4]
        self.body=[o for o in C.coll.all_objects if o.type in('MESH','CURVE')]+[o for o in L if o not in arms and o not in hands]
        A=bpy.data.objects.new(name+"_anim",None); sc.collection.objects.link(A); A.location=C.root.location.copy(); A.rotation_euler=C.root.rotation_euler.copy()
        self.A=A; self.loc0=A.location.copy(); self.rot0=A.rotation_euler.copy()
        ends=[]
        for a in arms:
            sp=a.data.splines[0]; pts=sp.bezier_points if len(sp.bezier_points) else sp.points
            ends.append((a.matrix_world@(pts[0].co if len(sp.bezier_points) else pts[0].co.xyz),a.matrix_world@(pts[-1].co if len(sp.bezier_points) else pts[-1].co.xyz)))
        arms=[o for o in bake.to_mesh(arms)]
        for a in arms:
            mw=a.matrix_world.copy(); a.parent=None; a.matrix_world=mw
        used=set(); self.arms=[]
        inkm=solid("inksolid",(0.035,0.025,0.02))
        for a,(p0,pend) in zip(arms,ends):
            h=min([o for o in hands if o not in used],key=lambda o:(HP(o)-pend).length); used.add(h)
            mw=h.matrix_world.copy(); h.parent=None; h.matrix_world=mw
            P=bpy.data.objects.new(name+"_shoulder",None); sc.collection.objects.link(P); P.location=p0; bpy.context.view_layer.update()
            for o in (a,h):
                mw=o.matrix_world.copy(); o.parent=P; o.matrix_world=mw
                o.data.materials.clear(); o.data.materials.append(inkm)
            bpy.context.view_layer.update()
            Vp=HP(h)-P.matrix_world.translation          # rest arm vector in pivot space (pivot has no rotation yet)
            local_x=(Quaternion(A.rotation_euler.to_quaternion()).inverted()@(HP(h)-A.location)).x
            self.arms.append(dict(P=P,h=h,arm=a,Vp=Vp,side=1 if local_x>0 else -1,L=Vp.length))
        bpy.context.view_layer.update()
        for d in self.arms:
            P=d["P"]; mw=P.matrix_world.copy(); P.parent=A; P.matrix_parent_inverse.identity()
            P.matrix_basis=A.matrix_world.inverted()@mw; P.rotation_mode='QUATERNION'
            d["q0"]=(A.matrix_world.inverted()@mw).to_quaternion(); P.rotation_quaternion=d["q0"]
        fp=bpy.data.objects[C.name+"_facepiv"]; mw=fp.matrix_world.copy(); fp.parent=A; fp.matrix_world=mw
        self.face_seq=[(0,"neutral")]; self.arm_seq={0:[(0,("rest",))],1:[(0,("rest",))]}
        self.body_fn=lambda t:{}; self.bob=0.012; self.prev_q={}
    def arm_near(self,point):
        return min(range(len(self.arms)),key=lambda i:(HP(self.arms[i]["h"])-Vector(point)).length)
    def _q(self,d,spec,t):
        kind=spec[0]; A=self.A
        if kind=="rest": return d["q0"]@Euler((0,-d["side"]*0.12,0)).to_quaternion()
        if kind=="euler":   # (fwd, raise[, osc_amp, osc_freq])
            fwd,rai=spec[1],spec[2]; amp=spec[3] if len(spec)>3 else 0; fr=spec[4] if len(spec)>4 else 0
            o=amp*math.sin(2*math.pi*fr*t)
            return d["q0"]@Euler((fwd+o,-d["side"]*(rai+0.6*o),0)).to_quaternion()
        if kind=="aim":     # (point or callable(t)[, jitter_amp, jitter_freq])
            p=spec[1](t) if callable(spec[1]) else Vector(spec[1])
            if len(spec)>2:
                j=spec[2]; f=spec[3]; p=Vector(p)+Vector((j*math.sin(2*math.pi*f*t),j*0.6*math.sin(2*math.pi*f*1.3*t+1),j*math.sin(2*math.pi*f*0.9*t+2)))
            Arot=A.matrix_world.to_quaternion(); want=Arot.inverted()@(Vector(p)-d["P"].matrix_world.translation)
            q_rest=d["q0"]; vp=q_rest@d["Vp"]
            return vp.rotation_difference(want)@q_rest
    def pose(self,t):
        # body
        b=self.body_fn(t); A=self.A
        bob=b.get("bob",self.bob)*math.sin(2*math.pi*2.3*t+hash(self.name)%7)
        A.location=self.loc0+Vector((b.get("dx",0),b.get("dy",0),bob+b.get("dz",0)))
        A.rotation_euler=(self.rot0.x+b.get("rx",0),self.rot0.y+b.get("ry",0)+0.035*math.sin(2*math.pi*1.1*t),self.rot0.z+b.get("rz",0))
        A.scale=(1+b.get("sx",0),1+b.get("sx",0),1+b.get("sz",0))
        bpy.context.view_layer.update()
        for i,d in enumerate(self.arms):
            seq=self.arm_seq.get(i,[(0,("rest",))]); cur=[k for k in seq if k[0]<=t]
            tc,spec=cur[-1]; prev=cur[-2][1] if len(cur)>1 else spec
            q=self._q(d,spec,t)
            if len(cur)>1 and t<tc+0.28:
                q=self._q(d,prev,t).slerp(q,ss((t-tc)/0.28))
            d["P"].rotation_quaternion=q
    def key(self,f):
        for o in [self.A]:
            o.keyframe_insert("location",frame=f); o.keyframe_insert("rotation_euler",frame=f); o.keyframe_insert("scale",frame=f)
        for d in self.arms: d["P"].keyframe_insert("rotation_quaternion",frame=f)
    def hand(self,i): return HP(self.arms[i]["h"])

def talk(t0,t1,base="smug",rate=0.12,open_="talk"):
    seq=[]; t=t0; k=0
    while t<t1: seq.append((t,open_ if k%2==0 else base)); t+=rate*(0.8+0.4*((k*37)%10)/10); k+=1
    seq.append((t1,base)); return seq

# ---------------- baking ----------------
def bake_scene(sc,rigs,spp=24,set_atlas=2048,shell=0.017,mov_shell=()):
    """Bake set (static), each MOV_<group> (separately, keeps its own pivot), and each character body."""
    faces=set(bpy.data.collections["faces"].all_objects) if "faces" in bpy.data.collections else set()
    armset={c for r in rigs for d in r.arms for c in (d["arm"],d["h"])}
    inkm=solid("inksolid",(0.035,0.025,0.02))
    def is_live(o): return o.name.startswith("LIVE_") or o in faces or o in armset
    for r in rigs:
        objs=[o for o in bake.to_mesh(r.body) if o.type=='MESH']
        for o in objs:
            mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
        r.mesh=bake.join(objs,r.name+"_body")
    bodies={r.mesh.name for r in rigs}
    # movable groups
    groups={}
    for o in list(sc.objects):
        if o.type in('MESH','CURVE','FONT') and o.name.startswith("MOV_"):
            groups.setdefault(o.name[4:].split(".")[0],[]).append(o)
    movs={}
    for g,objs in groups.items():
        objs=[o for o in bake.to_mesh(objs) if o.type=='MESH']
        for o in objs:
            mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
        j=bake.join(objs,"MOVJ_"+g)
        bpy.ops.object.select_all(action='DESELECT'); j.select_set(True); bpy.context.view_layer.objects.active=j
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        movs[g]=j
    setobjs=[o for o in sc.objects if o.type in('MESH','CURVE','FONT') and not is_live(o) and o.name not in bodies and not o.name.startswith(("MOVJ_","MOV_"))]
    setobjs=[o for o in bake.to_mesh(setobjs) if o.type=='MESH']
    for o in setobjs:
        mw=o.matrix_world.copy(); o.parent=None; o.matrix_world=mw
    setg=bake.join(setobjs,"world")
    bake.unwrap([setg],margin=0.0012)
    for j in list(movs.values())+[r.mesh for r in rigs]: bake.unwrap([j],margin=0.003)
    def do(g,AS,LS,is_set,ink):
        alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',AS,1,['COLOR']))
        lit=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'DIFFUSE',LS,spp,['DIRECT','INDIRECT'])),(0,0),2.5)
        emi=bake.img_np(bake.bake_pass([g],'EMIT',LS,1))
        if is_set:
            ao=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'AO',LS,32)),(0,0),0.8); lit=lit*(0.3+0.7*ao)
        inkmask=bake.ink_mask([g],AS,3,min_angle=70) if ink else np.zeros(alb.shape[:2],np.float32)
        bake.apply_baked([g],bake.compose(alb,lit,emi,inkmask,exposure=1.0,sat=1.15,contrast=1.1),name="atlas_"+g.name)
    do(setg,set_atlas,512,True,False)
    for g,j in movs.items(): do(j,1024,512,False,False)
    for r in rigs:
        do(r.mesh,1024,512,False,True); _shell(r.mesh,shell,inkm)
        mw=r.mesh.matrix_world.copy(); r.mesh.parent=r.A; r.mesh.matrix_world=mw
    for g in mov_shell:
        if g in movs: _shell(movs[g],0.012,inkm)
    return movs

def _shell(o,thick,inkm):
    bake.ink_shell([o],thick)
    ms=o.data.materials
    for i,m in enumerate(ms):
        if m and m.name.startswith("inkshell"): ms[i]=inkm
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier="shell")

def set_pivot(o,pivot):
    """Move an object's origin to a world point without moving its mesh."""
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.context.scene.cursor.location=pivot; bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ---------------- camera ----------------
def camstate(keys,t):
    for (a,c0,t0,l0),(b,c1,t1,l1) in zip(keys,keys[1:]):
        if a<=t<=b:
            u=ss((t-a)/(b-a)); return Vector(c0).lerp(Vector(c1),u),Vector(t0).lerp(Vector(t1),u),l0+(l1-l0)*u
    k=keys[-1] if t>keys[-1][0] else keys[0]; return Vector(k[1]),Vector(k[2]),k[3]

# ---------------- run ----------------
def run(sc,cam,tgt,t0,t1,update,animated,swaps,out,nproc=2,keys_only=None):
    """Key every frame of [t0,t1) then render. update(t) sets everything for time t.
    animated: objects whose loc/rot/scale get keyed. swaps: {material_name:[(t,image_path),...]}"""
    f0=int(round(t0*FPS))+1; f1=int(round(t1*FPS))
    sc.frame_start=f0; sc.frame_end=f1
    bake.workbench(sc); sc.display.shading.use_dof=False; sc.display.render_aa='8'
    for f in range(f0,f1+1):
        t=(f-1)/FPS; sc.frame_set(f)
        update(t)
        for o in (cam,tgt): o.keyframe_insert("location",frame=f)
        cam.data.keyframe_insert("lens",frame=f)
        for o in animated:
            o.keyframe_insert("location",frame=f); o.keyframe_insert("rotation_euler",frame=f); o.keyframe_insert("scale",frame=f)
    def apply_swaps(scene,*a):
        t=(scene.frame_current-1)/FPS
        for mn,seq in swaps.items():
            p=[x for s,x in seq if s<=t]; p=p[-1] if p else seq[0][1]
            img=bpy.data.images.load(p,check_existing=True)
            for nd in bpy.data.materials[mn].node_tree.nodes:
                if nd.type=='TEX_IMAGE': nd.image=img
    os.makedirs(out,exist_ok=True)
    sc.render.image_settings.file_format='PNG'
    if keys_only:
        bpy.app.handlers.frame_change_pre.append(apply_swaps)
        for f in keys_only:
            sc.frame_set(f); sc.render.filepath=f"{out}/k_{f:04d}.png"; bpy.ops.render.render(write_still=True)
        return
    json.dump({mn:[(s,p) for s,p in seq] for mn,seq in swaps.items()},open(out+"/swaps.json","w"))
    bpy.ops.wm.save_as_mainfile(filepath=out+"/scene.blend")
    t_=time.time(); n=f1-f0+1; step=math.ceil(n/nproc); procs=[]
    for i in range(nproc):
        a=f0+i*step; b=min(f1,f0+(i+1)*step-1)
        if a>b: continue
        procs.append(subprocess.Popen([sys.executable,os.path.join(HERE,"render_range.py"),out,str(a),str(b)],env=dict(os.environ)))
    for p in procs: p.wait()
    print("FRAMES",f0,f1,round(time.time()-t_,1),flush=True)
