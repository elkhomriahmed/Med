"""3D toon characters in the competitors' style: shaded sphere head with a camera-facing drawn face,
bean body with 3D clothes, thin ink limbs, thick inverted-hull outline, real cast shadows."""
import bpy, math
from mathutils import Vector
from toon import *

SKIN=(0.93,0.915,0.89)
FACEDIR=os.path.join(HERE,"assets","faces")

def _add(o,root,coll):
    for c in o.users_collection: c.objects.unlink(o)
    coll.objects.link(o); o.parent=root; return o

class Character:
    def __init__(self,name,loc,yaw=0,coll=None,face="neutral"):
        sc=bpy.context.scene; self.name=name
        chars=bpy.data.collections.get("chars") or bpy.data.collections.new("chars")
        if "chars" not in [c.name for c in sc.collection.children]: sc.collection.children.link(chars)
        self.coll=coll or bpy.data.collections.new(name)
        if self.coll.name not in [c.name for c in chars.children]: chars.children.link(self.coll)
        self.faces_coll=bpy.data.collections.get("faces") or bpy.data.collections.new("faces")
        if "faces" not in [c.name for c in sc.collection.children]: sc.collection.children.link(self.faces_coll)
        self.root=bpy.data.objects.new(name+"_root",None); self.coll.objects.link(self.root)
        self.root.location=loc; self.root.rotation_euler[2]=yaw; self.face_name=face
    def limb(self,o):
        lc=bpy.data.collections.get("limbs") or bpy.data.collections.new("limbs")
        if "limbs" not in [x.name for x in bpy.context.scene.collection.children]: bpy.context.scene.collection.children.link(lc)
        for c in o.users_collection: c.objects.unlink(o)
        lc.objects.link(o); o.parent=self.root; return o
    def part(self,o,outline=0.0):
        _add(o,self.root,self.coll)
        return o
    # ---------- builders ----------
    def build(self,R=0.25,hip=0.8,torso=0.6,torso_w=0.17,shirt=(0.96,0.96,0.95),legs=(0.035,0.025,0.02),beard=False,
              shoes=(0.12,0.08,0.06),hair=None,hat=None,tie=None,coat=None,buttons=0,arms=None,collar=True):
        self.R=R; self.beard=beard; z_t=hip+torso/2-0.04
        body=sph((0,0,z_t),(torso_w,torso_w*0.78,torso/2+0.03),mat(self.name+"_shirt",shirt,0.7,0.25,emit=0.08 if sum(shirt)>2.7 else 0),seg=40)
        self.part(body,0.011)
        if coat:  # long coat flaring to the knees
            c=cyl((0,0,hip-0.05),torso_w*1.02,0.62,mat(self.name+"_coat",coat,0.45,0.45),verts=40,r2=torso_w*1.45,rot=(math.pi,0,0),bevel=0.0)
            c.location=(0,0,hip+0.02); self.part(c,0.011)
            top=sph((0,0,z_t+0.05),(torso_w*1.07,torso_w*0.86,torso/2-0.02),mat(self.name+"_coat",coat,0.45,0.45),seg=40); self.part(top,0.011)
            for i in range(buttons):
                self.part(sph((0.0,-torso_w*0.88,z_t+0.18-i*0.17),(0.018,0.012,0.018),mat("btn",(0.15,0.1,0.06),0.4)))
            if collar:
                for s in (-1,1):
                    cl=cyl((s*0.06,-0.07,z_t+torso/2-0.04),0.07,0.02,mat(self.name+"_coat",coat,0.45,0.45),rot=(1.2,0,s*0.6),verts=3); self.part(cl,0.006)
        elif collar and not tie:
            for s in (-1,1):
                cl=cyl((s*0.045,-torso_w*0.62,z_t+torso/2-0.07),0.055,0.015,mat(self.name+"_shirt",shirt,0.7,0.25,emit=0.08 if sum(shirt)>2.7 else 0),rot=(1.35,0,s*0.5),verts=3); self.part(cl,0.006)
        if tie:
            # flat tie hugging the shirt front: kite shape
            me=bpy.data.meshes.new("tie"); yy=-torso_w*0.79
            me.from_pydata([(0,yy,z_t+0.2),(0.035,yy,z_t+0.12),(0.045,yy-0.02,z_t-0.16),(0,yy-0.025,z_t-0.22),(-0.045,yy-0.02,z_t-0.16),(-0.035,yy,z_t+0.12)],[],[[0,1,2,3,4,5]]); me.update()
            t=bpy.data.objects.new("tie",me); bpy.context.collection.objects.link(t); t.data.materials.append(mat(self.name+"_tie",tie,0.5,0.3))
            s_=t.modifiers.new("th",'SOLIDIFY'); s_.thickness=0.012; self.part(t)
            self.part(sph((0,-torso_w*0.74,z_t+0.2),(0.03,0.02,0.028),mat(self.name+"_tie",tie,0.5,0.3)),0.005)
        # head
        hz=z_t+torso/2+R*0.82; self.head_z=hz
        head=sph((0,0,hz),(R,R*0.93,R*0.97),mat("skin",SKIN,0.45,0.45,emit=0.18),seg=48); self.part(head,0.013)
        if hair:
            import bmesh
            o=sph((0,0,hz),(R*1.05,R*0.98,R*1.02),mat(self.name+"_hair",hair,0.5,0.4),seg=48)
            bm=bmesh.new(); bm.from_mesh(o.data)
            cut=bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.3),plane_no=(0,0.55,1.0),clear_inner=True)
            bm.to_mesh(o.data); bm.free(); self.part(o)
            sol=o.modifiers.new("th",'SOLIDIFY'); sol.thickness=R*0.06; sol.offset=1
            o["no_ink"]=1
        if hat=="cap":
            hc=(0.17,0.3,0.62); self.part(sph((0,0.01,hz+R*0.5),(R*1.02,R*0.98,R*0.62),mat(self.name+"_cap",hc,0.5,0.3),seg=40),0.012)
            bill=cyl((0,-R*0.95,hz+R*0.42),R*0.62,0.025,mat(self.name+"_cap",hc,0.5,0.3),verts=40,rot=(0.15,0,0)); bill.scale=(1,0.55,1); self.part(bill,0.008)
            self.part(sph((0,-R*0.92,hz+R*0.72),(0.03,0.012,0.03),mat("brass",(0.85,0.6,0.15),0.3,0.6)))
        if hat=="beanie":
            bc=mat(self.name+"_beanie",(0.82,0.12,0.12),0.85,0.1)
            import bmesh
            o=sph((0,0,hz),(R*1.06,R*1.02,R*1.12),bc,seg=48); bm=bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.55),plane_no=(0,-0.1,1),clear_inner=True); bm.to_mesh(o.data); bm.free(); self.part(o)
            cuff=cyl((0,0.01,hz+R*0.6),R*1.0,R*0.3,mat(self.name+"_cuff",(0.72,0.08,0.08),0.9,0.05),verts=48,rot=(-0.15,0,0),bevel=0); self.part(cuff)
            self.part(sph((0,0.03,hz+R*1.2),(R*0.24,R*0.24,R*0.24),mat(self.name+"_pom",(0.97,0.95,0.9),0.95,0.05),seg=20))
        if hat=="souwester":
            hc=(1.0,0.66,0.02); m=mat(self.name+"_hat",hc,0.35,0.5)
            self.part(sph((0,0.04,hz+R*0.62),(R*1.0,R*0.96,R*0.66),m,seg=40),0.012)
            brim=cyl((0,0.1,hz+R*0.62),R*1.3,0.07,m,verts=48,r2=R*0.98,rot=(-0.3,0,0)); self.part(brim,0.01)
        if self.beard:
            bw=mat("beard",(0.97,0.96,0.93),0.9,0.1,emit=0.12)
            # beard wraps only the lower jaw; three small scallops at the chin
            self.part(sph((0,-R*0.18,hz-R*0.62),(R*0.88,R*0.72,R*0.5),bw,seg=40))
            for bx,bz in [(-0.42,-1.0),(0,-1.08),(0.42,-1.0)]:
                self.part(sph((R*bx,-R*0.3,hz+R*bz),(R*0.26,R*0.22,R*0.22),bw,seg=20))
        # face decal: always looks at the camera
        piv=bpy.data.objects.new(self.name+"_facepiv",None); self.faces_coll.objects.link(piv); piv.parent=self.root; piv.location=(0,0,hz)
        con=piv.constraints.new('TRACK_TO'); con.target=bpy.context.scene.camera; con.track_axis='TRACK_Z'; con.up_axis='UP_Y'
        # face mesh hugs the drawn features (so it never hides the head's outline); beards add a lower lobe
        pts=[(0.8*math.cos(math.radians(a)),0.8*math.sin(math.radians(a))) for a in range(0,360,10)]
        if self.beard: pts=[p for p in pts if p[1]>-0.2]+[(0.94*math.sin(math.radians(t)),-0.26-1.04*math.cos(math.radians(t))) for t in range(92,-93,-8)]
        pts=sorted(pts,key=lambda p: math.atan2(p[1],p[0]))
        me=bpy.data.meshes.new(self.name+"_face"); me.from_pydata([(x*R,y*R,0) for x,y in pts]+[(0,0,0)],[],[[i for i in range(len(pts))]]); me.update()
        uv=me.uv_layers.new()
        for l in me.loops:
            co=me.vertices[l.vertex_index].co; uv.data[l.index].uv=(co.x/(2.6*R)+0.5,co.y/(2.6*R)+0.5)
        fp=bpy.data.objects.new(self.name+"_face",me)
        self.faces_coll.objects.link(fp); fp.parent=piv; fp.location=(0,0,R*(1.12 if self.beard else 1.03)); fp.visible_shadow=False
        self.face_mat=image_mat(self.name+"_facemat",f"{FACEDIR}/{self.name}_{self.face_name}.png",emit=0.6,rough=0.9)
        fp.data.materials.append(self.face_mat); self.face_obj=fp
        # legs + shoes
        for s in (-1,1):
            self.limb(tube([(s*0.065,0.0,hip+0.05),(s*0.07,0.0,0.45),(s*0.075,0.0,0.07)],0.012,mat("limb",legs,0.6)))
            self.part(sph((s*0.08,-0.05,0.045),(0.06,0.1,0.045),mat(self.name+"_shoes",shoes,0.5,0.3)),0.007)
        self.sh_z=z_t+torso/2-0.13; self.sh_x=torso_w*(1.15 if coat else 0.95)
        for side,pts in zip((-1,1),arms or [None,None]):
            if pts is None: pts=[(0.05,0,-0.02),(0.12,-0.02,-0.25),(0.14,-0.05,-0.5)]
            P=[(side*(self.sh_x+a),b,self.sh_z+c) for a,b,c in pts]
            self.limb(tube([(side*(self.sh_x-0.04),0,self.sh_z)]+P,0.011,mat("limb",legs,0.6)))
            self.limb(sph(P[-1],(0.017,0.017,0.017),mat("limb",legs,0.6)))
        return self
    def set_face(self,face):
        img=bpy.data.images.load(f"{FACEDIR}/{self.name}_{face}.png",check_existing=True)
        for n in self.face_mat.node_tree.nodes:
            if n.type=='TEX_IMAGE': n.image=img

POSES={  # per arm: points relative to the shoulder (x outward, y forward is negative, z up)
 "rest":  ([(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.12,-0.04,-0.5)],)*2,
 "hips":  ([(0.08,0,-0.06),(0.2,0.02,-0.2),(0.04,-0.04,-0.36)],)*2,
 "shrug": ([(0.08,0,-0.06),(0.17,-0.02,-0.22),(0.32,-0.08,-0.08)],)*2,
 "panic": ([(0.08,0,0.02),(0.16,-0.04,0.2),(0.2,-0.08,0.44)],)*2,
 "hold":  ([(0.05,-0.04,-0.06),(0.08,-0.18,-0.22),(0.0,-0.34,-0.16)],)*2,
 "point": ([(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.12,-0.04,-0.5)],[(0.08,-0.06,-0.02),(0.18,-0.22,0.02),(0.3,-0.42,0.1)]),
 "wave":  ([(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.12,-0.04,-0.5)],[(0.08,0,0.0),(0.2,-0.02,0.08),(0.26,-0.06,0.34)]),
 "explain":([(0.05,-0.03,-0.06),(0.12,-0.16,-0.18),(0.24,-0.3,-0.08)],[(0.05,0,-0.05),(0.1,-0.02,-0.28),(0.12,-0.04,-0.5)]),
}
def keeper(loc,yaw=0,face="smug",arms=None,pose=None):
    arms=list(POSES[pose]) if pose else arms
    return Character("keeper",loc,yaw,face=face).build(R=0.3,torso_w=0.16,coat=(1.0,0.66,0.02),buttons=3,hat="beanie",beard=True,
        shirt=(1.0,0.66,0.02),shoes=(0.08,0.06,0.05),arms=arms)
def engineer(loc,yaw=0,face="happy",arms=None,pose=None):
    arms=list(POSES[pose]) if pose else arms
    return Character("engineer",loc,yaw,face=face).build(R=0.29,torso_w=0.15,hair=(0.4,0.22,0.1),tie=(0.62,0.12,0.1),arms=arms)
