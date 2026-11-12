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
BASE=dict(R=0.29, hip=0.64, torso_h=0.80, torso_w=0.20, torso_d=0.165, upper=0.27, fore=0.27, thigh=0.32, shin=0.32,
          arm_w=0.012, leg_w=0.013, hand_r=0.029, boot=(0.042,0.085,0.04), boot_col=(0.16,0.10,0.06))

OUTFITS={
 "keeper":dict(coat=(0.96,0.72,0.12),coat_dark=(0.50,0.27,0.015),hat="beanie",hair=None,
               details=["collar","placket","toggles","pockets","hem"],face="keeper"),
 "engineer":dict(coat=(0.20,0.085,0.03),coat_dark=(0.10,0.04,0.015),shirt=(0.70,0.71,0.70),hat=None,hair=(0.26,0.13,0.05),
                 details=["shirt_collar","vest","tie","belt","trousers","vest_buttons"],tie=(0.22,0.36,0.62),trousers=(0.045,0.055,0.085),face="engineer",
                 R=0.285,torso_w=0.195),
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
    hz=top+R*0.97; D["head_c"]=hz   # the head SITS on the body: a whole circle, jaw line outlined over the body
    w,dp=D["torso_w"],D["torso_d"]
    def front_y(z):   # surface y at height z on the body front (approx ellipse)
        u=(z-zc)/(D["torso_h"]/2); return -dp*math.sqrt(max(0.0,1-u*u))*0.98
    det=O["details"]
    if "collar" in det:      # raincoat collar: two thick folded flaps around the neck
        for s in (-1,1):
            c=sph((s*0.07,-0.075,top-0.06),(0.075,0.042,0.045),dark,seg=24,rot=(0.35,s*0.45,s*0.5)); parts_t.append(c)
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
            parts_t.append(cyl((s*0.05,-0.10,top-0.07),0.055,0.016,mat(name+"_shirtc",O.get("shirt",O["coat"]),0.6,0.3),rot=(1.25,0,s*0.55),verts=3))
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
        o=sph((0,0,hz),(R*1.035,R*1.0,R*1.28),bc,seg=48); bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.55),plane_no=(0,-0.1,1),clear_inner=True)
        bm.to_mesh(o.data); bm.free(); parts_h.append(o)
        cuff=cyl((0,0.01,hz+R*0.58),R*0.99,R*0.24,striped(name+"_cuff",(0.48,0.05,0.04),(0.30,0.025,0.02),40,'X',0.9),verts=48,rot=(-0.15,0,0),bevel=0)
        b=cuff.modifiers.new("round",'BEVEL'); b.width=R*0.08; b.segments=4; parts_h.append(cuff)
        parts_h.append(sph((0,0.04,hz+R*1.30),(R*0.2,R*0.2,R*0.2),mat(name+"_pom",(0.94,0.91,0.85),0.95,0.05),seg=20))
    if O["hair"]:
        hc=O["hair"]; o=sph((0,0,hz),(R*1.05,R*0.99,R*1.03),striped(name+"_hair",hc,tuple(x*0.6 for x in hc),12,'X',0.5),seg=48)
        bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.3),plane_no=(0,0.55,1.0),clear_inner=True)
        bm.to_mesh(o.data); bm.free(); sol=o.modifiers.new("th",'SOLIDIFY'); sol.thickness=R*0.05; sol.offset=1; parts_h.append(o)
    D["shoulder"]=(w*0.86,0.0,hz-R-0.04); D["hipjoint"]=(0.07,0.0,D["hip"]+0.02)
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

BENDS={"fwd":(0.95,"y"),"back":(-0.6,"y"),"right":(0.55,"x"),"left":(-0.55,"x")}
def bendmap(p,theta,axis,L,s0=0.03):
    """Curve the spine: points above s0 follow a circular arc of total angle theta over length L.
    axis 'y' = forward(+theta, towards -Y)/back, axis 'x' = sideways (+theta towards +X)."""
    x,y,z=p
    if abs(theta)<1e-5 or z<=s0: return Vector((x,y,z))
    k=theta/L; s=z-s0; a=k*s
    if axis=="y": return Vector((x,-(1-math.cos(a))/k+y*math.cos(a),s0+math.sin(a)/k+y*math.sin(a)))
    return Vector(((1-math.cos(a))/k+x*math.cos(a),y,s0+math.sin(a)/k-x*math.sin(a)))
def _bend_keys(torso,D):
    """Shape keys that curve the torso (forward, back, left, right). Reference points (neck, shoulders) are stored
    for each key so the head and arms follow the curved spine exactly."""
    L=D["torso_top"]-D["hip"]; torso.shape_key_add(name="Basis"); ref={}
    pts={"neck":(0,0,D["neck"]-D["hip"]),"sh_r":(D["shoulder"][0],0,D["shoulder"][2]-D["hip"]),"sh_l":(-D["shoulder"][0],0,D["shoulder"][2]-D["hip"])}
    for nm,(th,ax) in BENDS.items():
        kb=torso.shape_key_add(name=nm)
        for i,v in enumerate(torso.data.vertices): kb.data[i].co=bendmap(v.co,th,ax,L)
        ref[nm]={k:list(bendmap(Vector(p),th,ax,L)) for k,p in pts.items()}
        ref[nm]["angle"]=th*(D["neck"]-D["hip"])/L
    ref["basis"]={k:list(p) for k,p in pts.items()}
    D["bend_ref"]=ref

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
        engine._shell(g,0.015 if gname=="torso" else 0.019,inkm)
    # origins: torso at the hip pivot, head at the neck
    D["neck"]=D["head_c"]-D["R"]*0.85
    engine.set_pivot(groups["torso"],(0,0,D["hip"])); engine.set_pivot(groups["head"],(0,0,D["neck"]))
    _bend_keys(groups["torso"],D)
    for o in list(bpy.data.objects):
        if o not in groups.values(): bpy.data.objects.remove(o,do_unlink=True)
    for im in bpy.data.images: im.pack() if im.packed_file is None and im.source=='GENERATED' else None
    os.makedirs(PUPDIR,exist_ok=True)
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

class Spring:
    """Second-order spring: organic motion with overshoot and settle (follow-through)."""
    def __init__(self,x=0.0): self.x=x; self.v=0.0
    def step(self,target,f,z,dt):
        w=2*math.pi*f; n=4; h=dt/n
        for _ in range(n):
            a=w*w*(target-self.x)-2*z*w*self.v; self.v+=a*h; self.x+=self.v*h
        return self.x

CH=("lean","side","twist","bend","sbend","crouch","nod","tilt","turn","squash","air","yaw")
HEADCH=("nod","tilt","turn")
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
        if self.torso.data.users>1: self.torso.data=self.torso.data.copy()
        if self.tint!=(1.0,1.0,1.0):   # scene lighting tint baked into copies of the atlases
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
        import engine
        inkm=bpy.data.materials.get("inksolid") or engine.solid("inksolid",INKC)
        bootm=engine.solid(f"{name}_boot",D["boot_col"])
        self.limbs={}
        for kind in ("arm","leg"):
            for s in (-1,1):
                cu=bpy.data.curves.new(f"{self.name}_{kind}{s}",'CURVE'); cu.dimensions='3D'; cu.bevel_depth=D["arm_w" if kind=="arm" else "leg_w"]; cu.bevel_resolution=3
                sp=cu.splines.new('POLY'); sp.points.add(8); cu.materials.append(inkm)
                o=bpy.data.objects.new(f"LIVE_{self.name}_{kind}{s}",cu); coll.objects.link(o); self.limbs[(kind,s)]=o
        self.hands={}; self.boots={}
        for s in (-1,1):
            h=sph((0,0,0),(D["hand_r"],)*3,inkm,seg=16); h.name=f"LIVE_{self.name}_hand{s}"
            for c_ in h.users_collection: c_.objects.unlink(h)
            coll.objects.link(h); self.hands[s]=h
            bx,by,bz=D["boot"]; b=sph((0,0,0),(bx,by,bz),bootm,seg=20); b.name=f"LIVE_{self.name}_boot{s}"
            bm=bmesh.new(); bm.from_mesh(b.data)
            for v in bm.verts:
                if v.co.z<0: v.co.z*=0.35
                v.co.y-=0.25*(1+v.co.z) if v.co.y<0 else 0
            bm.to_mesh(b.data); bm.free()
            for c_ in b.users_collection: c_.objects.unlink(b)
            coll.objects.link(b); self.boots[s]=b
        self.kb=self.torso.data.shape_keys.key_blocks
        # acting state
        self.keys=[(0.0,{})]; self.face_seq=[(0.0,"neutral")]; self.speak=[]; self.beats=[]; self.gest_side=1
        self.feet={}; self.step={}; self.t_prev=None; self.spr={c:Spring() for c in CH}; self.hspr={}
        self.anim=[self.A,self.P,self.torso,self.head,self.LOOK,self.froll]+list(self.hands.values())+list(self.boots.values())
        self.pose0=dict(pos=tuple(loc[:2]),yaw=yaw,crouch=0.0,lean=0.0,side=0.0,twist=0.0,bend=0.0,sbend=0.0,nod=0.0,tilt=0.0,turn=0.0,
                        air=0.0,squash=0.0,arms={-1:("rest",),1:("rest",)},snap=0.38,damp=0.72,jump=None)
        self.spr["yaw"].x=yaw; self.phase=(hash(self.name)%100)/100.0*6.28; self.landed=set()
    # ---------------- pose keys
    def _full(self,i):
        p=dict(self.pose0)
        for _,k in self.keys[:i+1]:
            for a,b in k.items():
                if a=="arms": p["arms"]=dict(p["arms"]); p["arms"].update(b)
                elif a not in ("snap","damp","jump","move","overshoot"): p[a]=b
        k=self.keys[i][1]; p["snap"]=k.get("snap",self.pose0["snap"]); p["damp"]=k.get("damp",self.pose0["damp"])
        return p
    def _key_index(self,t): return max([i for i,k in enumerate(self.keys) if k[0]<=t] or [0])
    def _hand_target(self,spec,s,t,sh):
        D=self.D; kind=spec[0]; Am=self.A.matrix_world
        if kind=="rest":
            return sh+Am.to_3x3()@Vector((s*0.06,-0.015,-(D["upper"]+D["fore"])*0.92))
        if kind=="body":
            x,y,z=spec[1]; return sh+Am.to_3x3()@Vector((s*x,-y,z))
        if kind=="world":
            p=spec[1](t) if callable(spec[1]) else spec[1]; return Vector(p)
        if kind=="wave":
            x,y,z,amp,fr=spec[1:6]; return sh+Am.to_3x3()@Vector((s*(x+amp*math.sin(2*math.pi*fr*t)),-y,z+0.4*amp*math.cos(2*math.pi*fr*t)))
        return sh
    def _beat(self,t):
        g=0.0
        for ti,amp in self.beats:
            u=t-ti
            if 0<u<1.2: g+=amp*math.exp(-u*6.5)*math.sin(u*13)
        return g
    def talk(self,words,a,b,every=2,amp=1.0):
        """Speaking: mouth flaps over [a,b] and beat gestures (head nod + hand bump) on every n-th word."""
        self.speak.append((a,b)); ws=[w for w in words if a<=w[0]<b]; self.speak_words=getattr(self,'speak_words',[])+ws
        for i,w in enumerate(ws):
            if i%every==0: self.beats.append((w[0],amp*(1.0 if len(w[2])>3 else 0.6)))
    def _bend_point(self,name,wts):
        r=self.D["bend_ref"]; p=Vector(r["basis"][name])
        for k,w in wts.items():
            if w: p+=(Vector(r[k][name])-Vector(r["basis"][name]))*w
        return p
    # ---------------- evaluate one frame (call in time order)
    def pose(self,t):
        D=self.D; dt=(t-self.t_prev) if self.t_prev is not None else 1/30
        if dt<=0 or dt>0.5: dt=1/30
        i=self._key_index(t); P1=self._full(i); P0=self._full(i-1) if i>0 else P1
        f=0.9/max(0.05,P1["snap"]); z=P1["damp"]
        tk=self.keys[i][0]; move=self.keys[i][1].get("move",P1["snap"]*1.4)
        x0,y0=P0["pos"]; x1,y1=P1["pos"]; um=ss((t-tk)/max(1e-3,move)) if i>0 else 1.0
        x=x0+(x1-x0)*um; y=y0+(y1-y0)*um; moving=(abs(x1-x0)+abs(y1-y0))>0.02 and 0<um<1
        V={}
        for c in CH:
            tgt=P1[c] if c!="yaw" else P1["yaw"]
            ff=f*(0.6 if c in HEADCH else 1.0)
            V[c]=self.spr[c].step(tgt,ff,z,dt)
        # jumps: gravity arcs, squash on landing
        air=V["air"]
        for kt,k in self.keys:
            j=k.get("jump")
            if not j: continue
            h,du=j; u=(t-kt)/du
            if 0<=u<=1: air+=4*h*u*(1-u)
            elif u>1 and kt not in self.landed: self.landed.add(kt); self.spr["squash"].v-=1.6
        # calm life: weight shift + breathing + slow head drift (no jitter)
        ph=self.phase; g=self._beat(t)
        side=V["side"]+0.012*math.sin(2*math.pi*0.17*t+ph)
        nod=V["nod"]+0.012*math.sin(2*math.pi*0.13*t+ph*1.7)+0.03*g
        breath=math.sin(2*math.pi*0.3*t+ph)
        self.A.location=Vector((x,y,0)); self.A.rotation_euler=(0,0,V["yaw"])
        bob=0.025*abs(math.sin(math.pi*t/0.17)) if moving else 0.0
        self.P.location=(0,0,D["hip"]-0.22*V["crouch"]+air+bob)
        lean=V["lean"]+(0.10 if moving else 0.0)
        self.P.rotation_euler=(-lean,side*0.5,V["twist"])
        sq=V["squash"]; self.P.scale=(1-0.5*sq,1-0.5*sq,1+sq+0.007*breath)
        # curved spine via shape keys
        bend=V["bend"]+0.02*g; sb=V["sbend"]+side*0.5
        wts={"fwd":max(0.0,bend)/BENDS["fwd"][0],"back":max(0.0,-bend)/-BENDS["back"][0],"right":max(0.0,sb)/BENDS["right"][0],"left":max(0.0,-sb)/-BENDS["left"][0]}
        for k_,w in wts.items(): self.kb[k_].value=min(1.2,w)
        self.head.location=self._bend_point("neck",wts)
        ax=sum(BENDS[k][0]*w for k,w in wts.items() if BENDS[k][1]=="y")*0.85; ay=sum(BENDS[k][0]*w for k,w in wts.items() if BENDS[k][1]=="x")*0.85
        bpy.context.view_layer.update()
        hc0=self.torso.matrix_world@(self.head.location+Vector((0,0,D["head_c"]-D["neck"]))); cam0=self.cam.matrix_world.translation
        dv=cam0-hc0; want=math.atan2(dv.x,-dv.y); body=V["yaw"]+V["twist"]
        dturn=(want-body+math.pi)%(2*math.pi)-math.pi; dturn=max(-1.25,min(1.25,dturn))
        self.head.rotation_euler=(ax-nod-0.18*lean,ay+V["tilt"],0.8*dturn+V["turn"])
        bpy.context.view_layer.update()
        hc=self.fpiv.matrix_world.translation; cam=self.cam.matrix_world.translation
        fwd=(self.head.matrix_world.to_3x3()@Vector((0,-1,0))).normalized(); tc=(cam-hc).normalized()
        self.LOOK.location=hc+(tc*0.72+fwd*0.28).normalized()
        self.froll.rotation_euler=(0,0,-(V["tilt"]+side+ay)*0.9)
        # feet
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
                if (Vector((self.feet[s].x,self.feet[s].y))-Vector((rest.x,rest.y))).length>0.10 and not self.step.get(-s):
                    self.step[s]=(t,self.feet[s].copy(),rest+(rest-self.feet[s])*0.25*Vector((1,1,0)))
            if air<=0.02: self.feet[s].z=max(self.feet[s].z,0.0)
        Tm=self.torso.matrix_world
        for s in (-1,1):
            hipj=Tm@Vector((s*D["hipjoint"][0],0,D["hipjoint"][2]-D["hip"]))
            ankle=self.feet[s]+Vector((0,0,D["boot"][2]*0.9))
            J,T2=_ik(hipj,ankle,D["thigh"],D["shin"],Am.to_3x3()@Vector((s*0.15,-1.0,0.0)))
            self._set_curve(self.limbs[("leg",s)],_noodle(hipj,J,T2))
            b=self.boots[s]; b.location=self.feet[s]+Vector((0,-0.02,D["boot"][2]*0.5)); b.rotation_euler=(0,0,V["yaw"])
            sh=Tm@self._bend_point("sh_r" if s>0 else "sh_l",wts)
            spec=P1["arms"].get(s,("rest",)); H=self._hand_target(spec,s,t,sh)
            if s==self.gest_side and spec[0] in("rest","body"): H=H+Am.to_3x3()@Vector((s*0.02,-0.05,0.06))*g
            if moving and spec[0]=="rest": H=H+Am.to_3x3()@Vector((0,-0.08*math.sin(math.pi*t/0.17+(0 if s>0 else math.pi)),0.02))
            if s not in self.hspr: self.hspr[s]=[Spring(c) for c in H]
            hf=(14.0 if spec[0]=="world" and len(spec)>2 and spec[2]=="track" else f*0.95)
            H=Vector([sp.step(c,hf,max(0.35,z),dt) for sp,c in zip(self.hspr[s],H)])
            J,H2=_ik(sh,H,D["upper"],D["fore"],Am.to_3x3()@Vector((s*0.8,0.45,-0.35)))
            self._set_curve(self.limbs[("arm",s)],_noodle(sh,J,H2))
            self.hands[s].location=H2
        self.t_prev=t
    def settle(self,t,n=60):
        """Run the springs to rest at time t (for stills)."""
        for k in range(n): self.pose(t-(n-k)/30.0+1/30.0)
    def _set_curve(self,o,pts):
        for p,q in zip(o.data.splines[0].points,pts): p.co=(q.x,q.y,q.z,1.0)
    def key(self,f):
        for o in self.anim:
            o.keyframe_insert("location",frame=f); o.keyframe_insert("rotation_euler",frame=f); o.keyframe_insert("scale",frame=f)
        for kb in self.kb: kb.keyframe_insert("value",frame=f)
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
    def face_track(self,t0,t1,fps=30):
        """Expression per frame: base expression + lip-sync visemes while speaking (A open / O round / E teeth,
        picked from the word's letters, ~0.11 s each, closed on m/b/p) + automatic blinks."""
        import random
        rnd=random.Random(hash(self.name)%1000); blinks=[]; t=t0+rnd.uniform(0.4,1.6)
        while t<t1: blinks.append(t); t+=rnd.uniform(1.8,3.6)
        vis=[]
        for a,b,w in getattr(self,"speak_words",[]):
            letters=[c for c in w.lower() if c.isalpha()] or ["a"]
            n=max(1,int(round((b-a)/0.11))); 
            for k in range(n):
                c=letters[min(len(letters)-1,int(k*len(letters)/n))]
                v=("O" if c in "ouw" else "E" if c in "eiy" else "A" if c in "a" else None if c in "mbp" else ("A" if k%2==0 else "E"))
                vis.append((a+k*(b-a)/n,a+(k+1)*(b-a)/n-0.02,v))
        out=[]; prev=None; NOBLINK=("sleepy","proud","laugh","happy")
        for fr in range(int(t0*fps),int(t1*fps)+2):
            t=fr/fps; e=[x for s,x in self.face_seq if s<=t]; e=e[-1] if e else self.face_seq[0][1]
            vv=[v for a,b,v in vis if a<=t<b]
            if vv and vv[0]: v=e+"_"+vv[0]
            elif e not in NOBLINK and any(0<=t-b<0.1 for b in blinks): v=e+"_blink"
            else: v=e
            if v!=prev: out.append((t,v)); prev=v
        return out
    def swaps(self,t0=0.0,t1=None):
        if t1 is None: return {self.face_mat.name:[(t,self.face_path(e)) for t,e in self.face_seq]}
        return {self.face_mat.name:[(t,self.face_path(e)) for t,e in self.face_track(t0,t1)]}

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

if __name__=="__main__":
    import sys
    for n in sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else ["keeper","engineer"]:
        print("BAKED",n,bake_puppet(n)["name"])
