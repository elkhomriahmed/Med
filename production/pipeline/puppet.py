"""Puppet characters v2 (style formula v2): competitor-style bodies that ACT.

Look:  white sphere head with a camera-facing drawn face, a narrow pill/bean torso wearing real clothes
       (collar, seams, pockets, buttons, belt, hems, fabric grain), thin black ink limbs that BEND
       (two-joint noodle arms and legs), round ink hands, small dark boots, thick ink outline on head+torso.
Rig:   root -> pelvis (crouch / lean / squash) -> torso mesh -> head mesh (nod / tilt / turn) -> drawn face.
       Limbs are curves solved every frame with 2-bone IK; feet stay planted and step when the body moves.
Acting: pose-to-pose. A pose key is held, then the next key snaps in fast (default 0.18 s) with a small
       overshoot. Holds are calm (slow breathing) - no constant jitter.
Bodies are built + baked ONCE per character (assets/puppets/<name>.blend) and appended into every scene."""
import bpy, math, os, json, bmesh
from mathutils import Vector, Quaternion, Euler, Matrix
from toon import *
from characters import striped
import bake

FACEDIR=os.path.join(HERE,"assets","faces"); PUPDIR=os.path.join(HERE,"assets","puppets")
INKC=(0.035,0.025,0.02)

def clamp01(x): return max(0.0,min(1.0,x))
def ss(x): x=clamp01(x); return x*x*(3-2*x)
def back_out(u,s=1.5):
    u=clamp01(u)-1.0; return u*u*((s+1)*u+s)+1.0

# ------------------------------------------------------------------ OUTFITS
# All sizes in metres. Body faces -Y (towards a default camera). Root at the floor between the feet.
BASE=dict(R=0.25, hip=0.50, torso_h=0.76, torso_w=0.205, torso_d=0.16, upper=0.245, fore=0.245, thigh=0.25, shin=0.25,
          arm_w=0.0125, leg_w=0.0145, hand_r=0.030, boot=(0.05,0.10,0.045), boot_col=(0.16,0.10,0.06))

OUTFITS={
 "keeper":dict(coat=(0.96,0.72,0.12),coat_dark=(0.50,0.27,0.015),hat="beanie",hair=None,
               details=["collar","placket","toggles","pockets","hem"],face="keeper"),
 "engineer":dict(coat=(0.20,0.085,0.03),coat_dark=(0.10,0.04,0.015),shirt=(0.70,0.71,0.70),hat=None,hair=(0.26,0.13,0.05),
                 details=["shirt_collar","vest","tie","belt","trousers","vest_buttons"],tie=(0.22,0.36,0.62),trousers=(0.045,0.055,0.085),face="engineer",
                 R=0.245,torso_w=0.195),
}

def painted_mat(name,base,bands=(),stripe=None,vary=0.05):
    """Fabric colour with painted details: horizontal bands [(z0,z1,col)] (hems, belts, trousers) and an optional
    front stripe (half_width,col) - drawn on the cloth like the competitors' clothes, not floating rings."""
    m=mat(name,base,0.6,0.3,vary=vary); nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    src=p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].links else None
    geo=n.new('ShaderNodeNewGeometry'); sx=n.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'],sx.inputs[0])
    cur=src
    if cur is None:
        rgb=n.new('ShaderNodeRGB'); rgb.outputs[0].default_value=(*base,1); cur=rgb.outputs[0]
    def mix_in(fac_socket,col):
        nonlocal cur
        mx=n.new('ShaderNodeMix'); mx.data_type='RGBA'; nt.links.new(fac_socket,mx.inputs['Factor']); nt.links.new(cur,mx.inputs['A'])
        mx.inputs['B'].default_value=(*col,1); cur=mx.outputs['Result']
    for z0,z1,col in bands:
        a=n.new('ShaderNodeMath'); a.operation='GREATER_THAN'; a.inputs[1].default_value=z0; nt.links.new(sx.outputs['Z'],a.inputs[0])
        b=n.new('ShaderNodeMath'); b.operation='LESS_THAN'; b.inputs[1].default_value=z1; nt.links.new(sx.outputs['Z'],b.inputs[0])
        c=n.new('ShaderNodeMath'); c.operation='MULTIPLY'; nt.links.new(a.outputs[0],c.inputs[0]); nt.links.new(b.outputs[0],c.inputs[1]); mix_in(c.outputs[0],col)
    if stripe:
        hw,col=stripe
        ax=n.new('ShaderNodeMath'); ax.operation='ABSOLUTE'; nt.links.new(sx.outputs['X'],ax.inputs[0])
        a=n.new('ShaderNodeMath'); a.operation='LESS_THAN'; a.inputs[1].default_value=hw; nt.links.new(ax.outputs[0],a.inputs[0])
        f=n.new('ShaderNodeMath'); f.operation='LESS_THAN'; f.inputs[1].default_value=0.0; nt.links.new(sx.outputs['Y'],f.inputs[0])
        c=n.new('ShaderNodeMath'); c.operation='MULTIPLY'; nt.links.new(a.outputs[0],c.inputs[0]); nt.links.new(f.outputs[0],c.inputs[1]); mix_in(c.outputs[0],col)
    nt.links.new(cur,p.inputs['Base Color']); return m

def _pup_dims(name):
    d=dict(BASE); d.update({k:v for k,v in OUTFITS[name].items() if k in BASE}); d["name"]=name; return d

# ------------------------------------------------------------------ BUILD (once per character)
def _bean(D,m):
    """Narrow pill torso: slightly wider at the hips, rounded top that disappears under the head."""
    h=D["torso_h"]; zc=D["hip"]-0.05+h/2
    o=sph((0,0,zc),(D["torso_w"],D["torso_d"],h/2),m,seg=48)
    bm=bmesh.new(); bm.from_mesh(o.data)
    for v in bm.verts:
        u=(v.co.z-zc)/(h/2)   # mesh coords are world coords
        rf=math.sqrt(max(1e-6,1-min(1.0,u*u))); tf=(1-min(1.0,abs(u))**3.2)**(1/3.2)
        k=(tf/rf if rf>0.02 else 1.0)*(1.0+0.10*max(0.0,-u))*(1.0-0.04*max(0.0,u))
        v.co.x*=k; v.co.y*=k
    bm.to_mesh(o.data); bm.free(); return o,zc

def build_puppet(name):
    """Build one character's body + head in rest pose at the origin (call inside a fresh scene)."""
    D=_pup_dims(name); O=OUTFITS[name]; R=D["R"]; parts_t=[]; parts_h=[]
    dark=mat(name+"_coatdark",O["coat_dark"],0.6,0.3)
    hip=D["hip"]; bands=[]; stripe=None
    if "hem" in O["details"]: bands.append((hip-0.2,hip+0.05,O["coat_dark"]))
    if "trousers" in O["details"]: bands.append((hip-0.2,hip+0.07,O["trousers"]))
    if "belt" in O["details"]: bands.append((hip+0.07,hip+0.115,(0.16,0.07,0.02)))
    if "placket" in O["details"]: stripe=(0.016,O["coat_dark"])
    if "vest" in O["details"]: stripe=(0.055,O["shirt"])
    coat=painted_mat(name+"_coat",O["coat"],bands,stripe)
    ink=mat("pup_ink",INKC,0.6,0.1)
    body,zc=_bean(D,coat); parts_t.append(body)
    top=D["hip"]-0.05+D["torso_h"]; D["torso_top"]=top
    hz=top+R*0.45; D["head_c"]=hz
    w,dp=D["torso_w"],D["torso_d"]
    def front_y(z):   # surface y at height z on the body front (approx ellipse)
        u=(z-zc)/(D["torso_h"]/2); return -dp*math.sqrt(max(0.0,1-u*u))*0.98
    det=O["details"]
    if "collar" in det:      # raincoat collar: two thick folded flaps around the neck
        for s in (-1,1):
            c=sph((s*0.075,-0.085,hz-R*0.92),(0.08,0.045,0.05),dark,seg=24,rot=(0.35,s*0.45,s*0.5)); parts_t.append(c)
    if "toggles" in det:
        for i,z in enumerate((hz-R-0.08,hz-R-0.24,hz-R-0.40)):
            parts_t.append(sph((0,front_y(z)-0.016,z),(0.022,0.012,0.022),mat("pup_btn",(0.20,0.12,0.06),0.4,0.3),seg=16))
    if "pockets" in det:
        for s in (-1,1):
            z=D["hip"]+0.14; y=front_y(z)
            parts_t.append(box((s*0.085,y+0.012,z),(0.075,0.02,0.085),dark,0.006,rot=(0,0,-s*0.35)))
            parts_t.append(box((s*0.085,y+0.002,z+0.045),(0.082,0.024,0.022),dark,0.004,rot=(0,0,-s*0.35)))
    if "shirt_collar" in det:
        for s in (-1,1):
            parts_t.append(cyl((s*0.05,-0.11,hz-R*0.95),0.06,0.016,mat(name+"_shirtc",O.get("shirt",O["coat"]),0.6,0.3),rot=(1.25,0,s*0.55),verts=3))
    if "tie" in det:
        tie=striped(name+"_tie",O["tie"],tuple(x*0.55 for x in O["tie"]),24,'Z',0.5)
        L=0.34; z0=hz-R-0.03
        for i in range(8):
            z=z0-i*L/8; wd=0.028+0.018*(i/7)
            parts_t.append(box((0,front_y(z)-0.006,z),(wd*2,0.012,L/8+0.004),tie,0.0))
        parts_t.append(sph((0,front_y(z0+0.02)-0.012,z0+0.02),(0.028,0.016,0.024),tie,seg=16))
    if "vest_buttons" in det:
        for z in (hip+0.20,hip+0.30,hip+0.40):
            for s_ in (-1,1): parts_t.append(sph((s_*0.075,front_y(z)-0.006,z),(0.016,0.01,0.016),mat("pup_vbtn",(0.75,0.55,0.18),0.3,0.6),seg=12))
    if "belt" in det:
        parts_t.append(box((0,front_y(D["hip"]+0.092)-0.012,D["hip"]+0.092),(0.06,0.014,0.045),mat("pup_buckle",(0.85,0.66,0.2),0.3,0.7),0.004))
    # ---- head
    head=sph((0,0,hz),(R,R*0.94,R*0.98),mat("pup_skin",(0.95,0.935,0.91),0.45,0.4,emit=0.12),seg=48); parts_h.append(head)
    if O["hat"]=="beanie":
        bc=striped(name+"_beanie",(0.56,0.06,0.05),(0.36,0.03,0.025),26,'X',0.9)
        o=sph((0,0,hz),(R*1.035,R*1.0,R*1.07),bc,seg=48); bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.55),plane_no=(0,-0.1,1),clear_inner=True)
        bm.to_mesh(o.data); bm.free(); parts_h.append(o)
        cuff=cyl((0,0.01,hz+R*0.58),R*0.99,R*0.24,striped(name+"_cuff",(0.48,0.05,0.04),(0.30,0.025,0.02),40,'X',0.9),verts=48,rot=(-0.15,0,0),bevel=0)
        b=cuff.modifiers.new("round",'BEVEL'); b.width=R*0.08; b.segments=4; parts_h.append(cuff)
        parts_h.append(sph((0,0.03,hz+R*1.13),(R*0.2,R*0.2,R*0.2),mat(name+"_pom",(0.94,0.91,0.85),0.95,0.05),seg=20))
    if O["hair"]:
        hc=O["hair"]; o=sph((0,0,hz),(R*1.05,R*0.99,R*1.03),striped(name+"_hair",hc,tuple(x*0.6 for x in hc),12,'X',0.5),seg=48)
        bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.3),plane_no=(0,0.55,1.0),clear_inner=True)
        bm.to_mesh(o.data); bm.free(); sol=o.modifiers.new("th",'SOLIDIFY'); sol.thickness=R*0.05; sol.offset=1; parts_h.append(o)
    D["shoulder"]=(w*0.78,0.0,hz-R-0.05); D["hipjoint"]=(0.07,0.0,D["hip"]+0.02)
    return D,parts_t,parts_h

def _studio_lights():
    sc=bpy.context.scene
    w=bpy.data.worlds.new("pupw"); sc.world=w; w.use_nodes=True; bg=w.node_tree.nodes["Background"]; bg.inputs[0].default_value=(0.55,0.58,0.62,1); bg.inputs[1].default_value=0.22
    def L(kind,loc,rot,energy,col,size=1.0):
        bpy.ops.object.light_add(type=kind,location=loc,rotation=rot); l=bpy.context.object.data; l.energy=energy; l.color=col
        if kind=='AREA': l.size=size
        if kind=='SUN': l.angle=math.radians(8)
    L('SUN',(0,0,5),(math.radians(48),0,math.radians(-38)),3.6,(1.0,0.95,0.86))     # key: front-left-top, warm
    L('AREA',(1.6,-1.4,1.4),(math.radians(70),0,math.radians(50)),22,(0.75,0.85,1.0),2.0)  # fill: right, cool
    L('AREA',(0,1.6,2.0),(math.radians(-55),0,0),70,(1.0,0.97,0.92),1.5)                 # rim: behind
    bpy.ops.mesh.primitive_plane_add(size=6,location=(0,0,0)); fl=bpy.context.object; fl.name="studio_floor"
    fl.data.materials.append(mat("studio_floor",(0.5,0.5,0.5),0.9,0.1)); return fl

def bake_puppet(name,spp=48,size=1024):
    """Build + bake a character once and save it to assets/puppets/<name>.blend. Returns the dims dict."""
    import cv2, numpy as np, engine
    reset(pct=100); D,pt,ph=build_puppet(name); fl=_studio_lights()
    groups={}
    for gname,parts in (("torso",pt),("head",ph)):
        objs=[o for o in bake.to_mesh(parts) if o.type=='MESH']
        groups[gname]=bake.join(objs,f"PUP_{name}_{gname}")
    for g in groups.values(): bake.unwrap([g],margin=0.004)
    inkm=engine.solid("inksolid",INKC)
    for gname,g in groups.items():
        alb=bake.img_np(bake.bake_pass([g],'DIFFUSE',size,1,['COLOR']))
        lit=cv2.GaussianBlur(bake.img_np(bake.bake_pass([g],'DIFFUSE',512,spp,['DIRECT','INDIRECT'])),(0,0),2.0)
        emi=bake.img_np(bake.bake_pass([g],'EMIT',512,1))
        inkmask=bake.ink_mask([g],size,3,min_angle=65)
        bake.apply_baked([g],bake.compose(alb,lit,emi,inkmask,exposure=0.92,sat=1.15,contrast=1.08),name=f"atlas_PUP_{name}_{gname}")
        engine._shell(g,0.016 if gname=="torso" else 0.017,inkm)
    # origins: torso at the hip pivot, head at the neck
    engine.set_pivot(groups["torso"],(0,0,D["hip"])); engine.set_pivot(groups["head"],(0,0,D["torso_top"]-0.03))
    for o in list(bpy.data.objects):
        if o not in groups.values(): bpy.data.objects.remove(o,do_unlink=True)
    for im in bpy.data.images: im.pack() if im.packed_file is None and im.source=='GENERATED' else None
    os.makedirs(PUPDIR,exist_ok=True)
    D["neck"]=D["torso_top"]-0.03
    groups["torso"]["dims"]=json.dumps(D)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(PUPDIR,f"{name}.blend"),compress=True)
    json.dump(D,open(os.path.join(PUPDIR,f"{name}.json"),"w"),indent=1)
    return D

# ------------------------------------------------------------------ RIG (in a scene)
def _ik(S,T,a,b,hint):
    """2-bone IK: joint position for root S, target T, bone lengths a,b, bend towards hint."""
    d=T-S; L=d.length
    if L<1e-6: return S+hint.normalized()*a,T
    L2=min(L,(a+b)*0.999); T2=S+d.normalized()*L2
    x=(a*a-b*b+L2*L2)/(2*L2); h=math.sqrt(max(0.0,a*a-x*x))
    n=d.normalized(); hv=hint-n*hint.dot(n)
    if hv.length<1e-6: hv=Vector((0,0,1))-n*n.z
    J=S+n*x+hv.normalized()*h
    return J,T2

def _noodle(S,J,T,n=9):
    """Smooth ink-limb curve through S, J, T (quadratic Bezier whose control point makes it pass through J)."""
    C=2*J-0.5*(S+T); pts=[]
    for i in range(n):
        u=i/(n-1); pts.append(S*(1-u)**2+C*2*u*(1-u)+T*u*u)
    return pts

class Puppet:
    def __init__(self,name,loc=(0,0,0),yaw=0.0,cam=None,inst=None,tint=(1.0,1.0,1.0)):
        sc=bpy.context.scene; self.name=inst or name; self.cam=cam or sc.camera; self.tint=tuple(tint)
        D=json.load(open(os.path.join(PUPDIR,f"{name}.json"))); self.D=D
        with bpy.data.libraries.load(os.path.join(PUPDIR,f"{name}.blend")) as (src,dst):
            dst.objects=[n for n in src.objects if n.startswith("PUP_")]
        coll=bpy.data.collections.new("PUPPET_"+self.name); sc.collection.children.link(coll); self.coll=coll
        objs={o.name.split("_")[-1].split(".")[0]:o for o in dst.objects}
        for o in objs.values(): coll.objects.link(o); o.name="LIVE_"+self.name+"_"+o.name.split("_")[-1].split(".")[0]
        self.torso=objs["torso"]; self.head=objs["head"]
        if self.tint!=(1.0,1.0,1.0):   # scene lighting tint (night = cooler/darker) baked into copies of the atlases
            import numpy as np
            for o in (self.torso,self.head):
                for m in o.data.materials:
                    if not m or not m.use_nodes: continue
                    for nd in m.node_tree.nodes:
                        if nd.type=='TEX_IMAGE' and nd.image and nd.image.name.startswith("atlas"):
                            im=nd.image.copy(); px=np.empty(len(im.pixels),np.float32); im.pixels.foreach_get(px)
                            px=px.reshape(-1,4); px[:,:3]*=np.array(self.tint,np.float32); im.pixels.foreach_set(px.ravel()); im.pack(); nd.image=im
        def E(n,parent=None,loc=(0,0,0)):
            e=bpy.data.objects.new(f"LIVE_{self.name}_{n}",None); coll.objects.link(e); e.parent=parent; e.location=loc; return e
        self.A=E("root"); self.A.location=Vector(loc); self.A.rotation_euler=(0,0,yaw)
        self.P=E("pelvis",self.A,(0,0,D["hip"]))
        self.torso.parent=self.P; self.torso.location=(0,0,0); self.torso.rotation_euler=(0,0,0)
        self.head.parent=self.torso; self.head.location=(0,0,D["neck"]-D["hip"]); self.head.rotation_mode='YXZ'
        # drawn face: pivot tracks a LOOK target (camera, nudged towards where the head points), roll = head tilt
        self.LOOK=E("look"); self.fpiv=E("facepiv",self.head,(0,0,D["head_c"]-D["neck"]))
        c=self.fpiv.constraints.new('TRACK_TO'); c.target=self.LOOK; c.track_axis='TRACK_Z'; c.up_axis='UP_Y'
        self.froll=E("faceroll",self.fpiv)
        R=D["R"]; pts=[(0.96*R*math.cos(math.radians(a)),0.96*R*math.sin(math.radians(a))) for a in range(0,360,10)]
        me=bpy.data.meshes.new(self.name+"_face"); me.from_pydata([(x,y,0) for x,y in pts],[],[list(range(len(pts)))]); uv=me.uv_layers.new()
        for l in me.loops:
            co=me.vertices[l.vertex_index].co; uv.data[l.index].uv=(co.x/(2.6*R)+0.5,co.y/(2.6*R)+0.5)
        fp=bpy.data.objects.new("LIVE_"+self.name+"_face",me); coll.objects.link(fp); fp.parent=self.froll; fp.location=(0,0,R*1.02)
        self.face_char=OUTFITS[name]["face"]; self.face_mat=image_mat(self.name+"_facemat",self.face_path("neutral"),emit=0.6,rough=0.9)
        fp.data.materials.append(self.face_mat); self.face=fp
        # ink limbs (curves) + hands + boots
        inkm=bpy.data.materials.get("inksolid")
        if inkm is None:
            import engine; inkm=engine.solid("inksolid",INKC)
        import engine
        bootm=engine.solid(f"{name}_boot",D["boot_col"])
        self.limbs={}
        for kind in ("arm","leg"):
            for s in (-1,1):
                cu=bpy.data.curves.new(f"{self.name}_{kind}{s}",'CURVE'); cu.dimensions='3D'; cu.bevel_depth=D["arm_w" if kind=="arm" else "leg_w"]; cu.bevel_resolution=3
                sp=cu.splines.new('POLY'); sp.points.add(8); cu.materials.append(inkm)
                o=bpy.data.objects.new(f"LIVE_{self.name}_{kind}{s}",cu); coll.objects.link(o); self.limbs[(kind,s)]=o
        self.hands={s:None for s in (-1,1)}; self.boots={}
        for s in (-1,1):
            h=sph((0,0,0),(D["hand_r"],)*3,inkm,seg=16); h.name=f"LIVE_{self.name}_hand{s}"
            for c_ in h.users_collection: c_.objects.unlink(h)
            coll.objects.link(h); self.hands[s]=h
            bx,by,bz=D["boot"]; b=sph((0,0,0),(bx,by,bz),bootm,seg=20); b.name=f"LIVE_{self.name}_boot{s}"
            bm=bmesh.new(); bm.from_mesh(b.data)
            for v in bm.verts:
                if v.co.z<0: v.co.z*=0.35   # flat sole
                v.co.y-=0.25*(1+v.co.z) if v.co.y<0 else 0   # toe a bit longer than the heel
            bm.to_mesh(b.data); bm.free()
            for c_ in b.users_collection: c_.objects.unlink(b)
            coll.objects.link(b); self.boots[s]=b
        # acting state
        self.keys=[(0.0,{})]; self.face_seq=[(0.0,"neutral")]; self.feet={}; self.step={}; self.t_prev=None
        self.anim=[self.A,self.P,self.torso,self.head,self.LOOK,self.froll]+list(self.hands.values())+list(self.boots.values())
        self.pose0=dict(pos=tuple(loc[:2]),yaw=yaw,crouch=0.0,lean=0.0,side=0.0,twist=0.0,nod=0.0,tilt=0.0,turn=0.0,air=0.0,squash=0.0,
                        arms={-1:("rest",),1:("rest",)},snap=0.18)
    # ---------------- pose evaluation
    def _pose_at(self,t):
        """Blend the active pose key with the previous one (snap with overshoot)."""
        ks=self.keys; cur=[k for k in ks if k[0]<=t]
        def full(i):
            p=dict(self.pose0)
            for _,k in ks[:i+1]:
                for a,b in k.items():
                    if a=="arms": p["arms"]=dict(p["arms"]); p["arms"].update(b)
                    else: p[a]=b
            return p
        i=len(cur)-1; P1=full(i)
        if i==0: return P1,P1,1.0,1.0
        P0=full(i-1); tk=ks[i][0]; snap=ks[i][1].get("snap",self.pose0["snap"])
        move=ks[i][1].get("move",snap)        # root travel time (walks are slower than gesture snaps)
        return P0,P1,back_out((t-tk)/snap,ks[i][1].get("overshoot",1.5)),ss((t-tk)/max(1e-3,move))
    def _hand_target(self,spec,s,t):
        D=self.D; kind=spec[0]; Tm=self.torso.matrix_world; Am=self.A.matrix_world
        sh=Tm@Vector((s*D["shoulder"][0],D["shoulder"][1],D["shoulder"][2]-D["hip"]))
        if kind=="rest":     # hangs at the side, tiny calm sway
            sway=0.01*math.sin(2*math.pi*0.4*t+s)
            return sh+Am.to_3x3()@Vector((s*0.07,-0.02+sway,-(D["upper"]+D["fore"])*0.93))
        if kind=="body":     # point in the character's own frame: (x outward, y forward, z up) from the shoulder
            x,y,z=spec[1]; return sh+Am.to_3x3()@Vector((s*x,-y,z))
        if kind=="world":
            p=spec[1](t) if callable(spec[1]) else spec[1]; return Vector(p)
        if kind=="wave":     # (x,y,z, amp, freq)
            x,y,z,amp,fr=spec[1:6]; return sh+Am.to_3x3()@Vector((s*(x+amp*math.sin(2*math.pi*fr*t)),-y,z+0.4*amp*math.cos(2*math.pi*fr*t)))
        return sh
    def pose(self,t):
        D=self.D; P0,P1,u,um=self._pose_at(t)
        def L(k): return P0[k]+(P1[k]-P0[k])*u
        breath=math.sin(2*math.pi*0.33*t+hash(self.name)%5)
        # root travel (walks): ease over 'move'; body bob + forward lean while moving
        x0,y0=P0["pos"]; x1,y1=P1["pos"]; x=x0+(x1-x0)*um; y=y0+(y1-y0)*um
        moving=(abs(x1-x0)+abs(y1-y0))>0.02 and 0<um<1
        yaw=P0["yaw"]+(P1["yaw"]-P0["yaw"])*min(1.0,u*1.0)
        air=L("air"); self.A.location=Vector((x,y,0)); self.A.rotation_euler=(0,0,yaw)
        crouch=L("crouch"); bob=0.0
        if moving: bob=0.025*abs(math.sin(math.pi*t/0.17))
        self.P.location=(0,0,D["hip"]-0.20*crouch+air+bob)
        lean=L("lean")+(0.12 if moving else 0.0)
        self.P.rotation_euler=(-lean,L("side"),L("twist"))
        sq=L("squash"); self.P.scale=(1-0.5*sq,1-0.5*sq,1+sq+0.008*breath)
        bpy.context.view_layer.update()
        hc0=self.torso.matrix_world@Vector((0,0,D["head_c"]-D["hip"])); cam0=self.cam.matrix_world.translation
        dv=cam0-hc0; want=math.atan2(dv.x,-dv.y); body=yaw+L("twist")
        dturn=(want-body+math.pi)%(2*math.pi)-math.pi; dturn=max(-1.25,min(1.25,dturn))
        self.head.rotation_euler=(-L("nod")-0.6*lean*0.3,L("tilt"),0.8*dturn+L("turn"))
        bpy.context.view_layer.update()
        # face: look at camera, nudged towards where the head points; roll follows head tilt
        hc=self.fpiv.matrix_world.translation; cam=self.cam.matrix_world.translation
        fwd=(self.head.matrix_world.to_3x3()@Vector((0,-1,0))).normalized(); tc=(cam-hc).normalized()
        self.LOOK.location=hc+(tc*0.72+fwd*0.28).normalized()
        self.froll.rotation_euler=(0,0,-(L("tilt")+L("side"))*0.9)
        # feet: planted; step when the body leaves them behind (or when in the air they follow the body)
        Am=self.A.matrix_world
        for s in (-1,1):
            rest=Am@Vector((s*D["hipjoint"][0]*1.05,0,0))
            if s not in self.feet: self.feet[s]=rest.copy()
            st=self.step.get(s)
            if air>0.02:
                self.feet[s]=rest+Vector((0,0,air*0.85)); self.step.pop(s,None)
            elif st:
                k=(t-st[0])/0.15
                if k>=1: self.feet[s]=st[2]; self.step.pop(s)
                else:
                    p=st[1].lerp(st[2],ss(k)); p.z+=0.07*math.sin(math.pi*k); self.feet[s]=p
            else:
                other=self.step.get(-s)
                if (Vector((self.feet[s].x,self.feet[s].y))-Vector((rest.x,rest.y))).length>0.10 and not other:
                    self.step[s]=(t,self.feet[s].copy(),rest+(rest-self.feet[s])*0.25*Vector((1,1,0)))
            self.feet[s].z=max(self.feet[s].z,0.0) if air<=0.02 else self.feet[s].z
        Tm=self.torso.matrix_world
        for s in (-1,1):
            # legs
            hipj=Tm@Vector((s*D["hipjoint"][0],0,D["hipjoint"][2]-D["hip"]))
            ankle=self.feet[s]+Vector((0,0,D["boot"][2]*0.9))
            knee_hint=Am.to_3x3()@Vector((s*0.15,-1.0,0.0))
            J,T2=_ik(hipj,ankle,D["thigh"],D["shin"],knee_hint)
            self._set_curve(self.limbs[("leg",s)],_noodle(hipj,J,T2))
            b=self.boots[s]; b.location=self.feet[s]+Vector((0,-0.025,D["boot"][2]*0.5)); b.rotation_euler=(0,0,yaw)
            # arms: blend hand targets between the previous and current spec
            a0=P0["arms"].get(s,("rest",)); a1=P1["arms"].get(s,("rest",))
            h0=self._hand_target(a0,s,t); h1=self._hand_target(a1,s,t); H=h0.lerp(h1,u)
            if moving and a1[0]=="rest": H=H+Am.to_3x3()@Vector((0,-0.08*math.sin(math.pi*t/0.17*1.0+(0 if s>0 else math.pi)),0.02))
            sh=Tm@Vector((s*D["shoulder"][0],D["shoulder"][1],D["shoulder"][2]-D["hip"]))
            elbow_hint=Am.to_3x3()@Vector((s*0.8,0.45,-0.35))
            J,H2=_ik(sh,H,D["upper"],D["fore"],elbow_hint)
            self._set_curve(self.limbs[("arm",s)],_noodle(sh,J,H2))
            self.hands[s].location=H2
        self.t_prev=t
    def _set_curve(self,o,pts):
        for p,q in zip(o.data.splines[0].points,pts): p.co=(q.x,q.y,q.z,1.0)
    def key(self,f):
        for o in self.anim:
            o.keyframe_insert("location",frame=f); o.keyframe_insert("rotation_euler",frame=f); o.keyframe_insert("scale",frame=f)
        for o in self.limbs.values():
            for p in o.data.splines[0].points: p.keyframe_insert("co",frame=f)
    def hand(self,s): return self.hands[s].matrix_world.translation.copy()
    def head_pos(self): return self.fpiv.matrix_world.translation.copy()
    def face_path(self,e):
        p=f"{FACEDIR}/{self.face_char}_{e}.png"
        if self.tint==(1.0,1.0,1.0): return p
        from PIL import Image
        import numpy as np
        d=os.path.join(PUPDIR,"tinted","%.2f_%.2f_%.2f"%self.tint); os.makedirs(d,exist_ok=True); q=os.path.join(d,os.path.basename(p))
        if not os.path.exists(q):
            a=np.asarray(Image.open(p).convert("RGBA")).astype(np.float32); a[...,:3]*=np.array(self.tint,np.float32)
            Image.fromarray(np.clip(a,0,255).astype(np.uint8)).save(q)
        return q
    def swaps(self):
        return {self.face_mat.name:[(t,self.face_path(e)) for t,e in self.face_seq]}

if __name__=="__main__":
    import sys
    for n in sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else ["keeper","engineer"]:
        print("BAKED",n,bake_puppet(n))

def shadow_hook(puppets,store,floor_z=0.0,light=(0.07,0.05)):
    """Key hook: per frame, project each puppet's soft floor shadow (ellipse under the body, shrinking/fading
    when it jumps) and two small boot contact shadows into screen space for post_fx.py."""
    from bpy_extras.object_utils import world_to_camera_view
    def hook(f):
        sc=bpy.context.scene; bpy.context.view_layer.update(); cam=sc.camera; polys=[]
        for p in puppets:
            if not p.A.visible_get(): continue
            c=p.P.matrix_world.translation; air=max(0.0,c.z-p.D["hip"]-floor_z)
            k=1.0/(1.0+3.0*air); cx,cy=c.x+light[0],c.y+light[1]
            pts=[]
            for i in range(24):
                a=2*math.pi*i/24; v=world_to_camera_view(sc,cam,Vector((cx+0.27*math.cos(a)*(1+air),cy+0.20*math.sin(a)*(1+air),floor_z+0.003)))
                if v.z<=0: break
                pts.append((v.x,v.y))
            if len(pts)==24: polys.append(dict(pts=pts,strength=0.42*k,soft=0.22))
            for s in (-1,1):
                b=p.boots[s].matrix_world.translation; h=max(0.0,b.z-floor_z-p.D["boot"][2]*0.5)
                if h>0.05: continue
                pts=[]
                for i in range(16):
                    a=2*math.pi*i/16; v=world_to_camera_view(sc,cam,Vector((b.x+0.07*math.cos(a),b.y-0.02+0.09*math.sin(a),floor_z+0.003)))
                    if v.z<=0: break
                    pts.append((v.x,v.y))
                if len(pts)==16: polys.append(dict(pts=pts,strength=0.55*(1-h/0.05),soft=0.18))
        store[str(f)]=polys
    return hook
