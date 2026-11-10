"""3D toon characters in the competitors' style: shaded sphere head with a camera-facing drawn face,
bean body with 3D clothes, thin ink limbs, thick inverted-hull outline, real cast shadows."""
import bpy, math
from mathutils import Vector
from toon import *

SKIN=(0.93,0.915,0.89)
FACEDIR=os.path.join(HERE,"assets","faces")

def striped(name,col,dark,scale,axis='Z',rough=0.6):
    """Base colour with thin darker ink stripes (hair strands / knit ribs), like the competitors' drawn inner lines."""
    m=mat(name,col,rough,0.25); nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    tc=n.new('ShaderNodeTexCoord'); w=n.new('ShaderNodeTexWave'); w.wave_type='BANDS'; w.bands_direction=axis; w.wave_profile='SAW'
    w.inputs['Scale'].default_value=scale; w.inputs['Distortion'].default_value=0.0
    cr=n.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation='CONSTANT'; e=cr.color_ramp.elements
    e[0].color=(*dark,1); e[1].position=0.12; e[1].color=(*col,1)
    nt.links.new(tc.outputs['Object'],w.inputs[0]); nt.links.new(w.outputs['Fac'],cr.inputs[0]); nt.links.new(cr.outputs[0],p.inputs['Base Color'])
    return m
def ink_ring(o_parent,loc,R,r,rot=(0,0,0)):
    """Thin dark torus = drawn inner line where two parts meet (hat/forehead, hair/forehead)."""
    return torus(loc,R,r,mat("ink",(0.035,0.025,0.02),0.6,0.1),rot=rot)

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
        if tie:  # tie painted onto the shirt front (flat, striped, ink outline)
            m=body.data.materials[0].copy(); m.name=self.name+"_shirt_tie"; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
            tc=n.new('ShaderNodeTexCoord'); sx=n.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'],sx.inputs[0])
            hw=0.105; top=z_t+torso/2-0.02; bot=z_t-torso/2*0.62
            u=n.new('ShaderNodeMapRange'); u.inputs[1].default_value=-hw; u.inputs[2].default_value=hw; u.clamp=False; nt.links.new(sx.outputs['X'],u.inputs[0])
            v=n.new('ShaderNodeMapRange'); v.inputs[1].default_value=bot; v.inputs[2].default_value=top; v.clamp=False; nt.links.new(sx.outputs['Z'],v.inputs[0])
            cx=n.new('ShaderNodeCombineXYZ'); nt.links.new(u.outputs[0],cx.inputs[0]); nt.links.new(v.outputs[0],cx.inputs[1])
            tx=n.new('ShaderNodeTexImage'); tx.image=bpy.data.images.load(os.path.join(HERE,"assets","tie.png"),check_existing=True); tx.extension='CLIP'
            nt.links.new(cx.outputs[0],tx.inputs[0])
            fr=n.new('ShaderNodeMath'); fr.operation='LESS_THAN'; fr.inputs[1].default_value=0.0; nt.links.new(sx.outputs['Y'],fr.inputs[0])
            al=n.new('ShaderNodeMath'); al.operation='MULTIPLY'; nt.links.new(tx.outputs['Alpha'],al.inputs[0]); nt.links.new(fr.outputs[0],al.inputs[1])
            mx=n.new('ShaderNodeMix'); mx.data_type='RGBA'; nt.links.new(al.outputs[0],mx.inputs['Factor']); mx.inputs['A'].default_value=(*shirt,1); nt.links.new(tx.outputs['Color'],mx.inputs['B'])
            nt.links.new(mx.outputs['Result'],p.inputs['Base Color'])
            body.data.materials[0]=m
        # head
        hz=z_t+torso/2+R*0.82; self.head_z=hz
        head=sph((0,0,hz),(R,R*0.93,R*0.97),mat("skin",SKIN,0.45,0.45,emit=0.18),seg=48); self.part(head,0.013)
        if hair:
            import bmesh
            o=sph((0,0,hz),(R*1.05,R*0.98,R*1.02),striped(self.name+"_hair",hair,tuple(x*0.45 for x in hair),9,'X',0.5),seg=48)
            bm=bmesh.new(); bm.from_mesh(o.data)
            cut=bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.3),plane_no=(0,0.55,1.0),clear_inner=True)
            bm.to_mesh(o.data); bm.free(); self.part(o)
            sol=o.modifiers.new("th",'SOLIDIFY'); sol.thickness=R*0.05; sol.offset=1
        if hat=="cap":
            hc=(0.17,0.3,0.62); self.part(sph((0,0.01,hz+R*0.5),(R*1.02,R*0.98,R*0.62),mat(self.name+"_cap",hc,0.5,0.3),seg=40),0.012)
            bill=cyl((0,-R*0.95,hz+R*0.42),R*0.62,0.025,mat(self.name+"_cap",hc,0.5,0.3),verts=40,rot=(0.15,0,0)); bill.scale=(1,0.55,1); self.part(bill,0.008)
            self.part(sph((0,-R*0.92,hz+R*0.72),(0.03,0.012,0.03),mat("brass",(0.85,0.6,0.15),0.3,0.6)))
        if hat=="beanie":
            bc=striped(self.name+"_beanie",(0.74,0.16,0.14),(0.5,0.09,0.08),26,'X',0.9)
            import bmesh
            o=sph((0,0,hz),(R*1.06,R*1.02,R*1.12),bc,seg=48); bm=bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.bisect_plane(bm,geom=bm.verts[:]+bm.edges[:]+bm.faces[:],plane_co=(0,0,hz+R*0.55),plane_no=(0,-0.1,1),clear_inner=True); bm.to_mesh(o.data); bm.free(); self.part(o)
            cuff=cyl((0,0.01,hz+R*0.6),R*1.0,R*0.3,striped(self.name+"_cuff",(0.66,0.13,0.12),(0.44,0.08,0.07),40,'X',0.9),verts=48,rot=(-0.15,0,0),bevel=0); self.part(cuff)
            bev=cuff.modifiers.new("round",'BEVEL'); bev.width=R*0.08; bev.segments=4
            self.part(torus((0,0.01,hz+R*0.6-R*0.15*math.cos(0.15)),R*1.0,R*0.018,mat("ink",(0.035,0.025,0.02),0.6,0.1),rot=(-0.15,0,0)))
            self.part(sph((0,0.03,hz+R*1.2),(R*0.24,R*0.24,R*0.24),mat(self.name+"_pom",(0.93,0.9,0.84),0.95,0.05),seg=20))
        if hat=="souwester":
            hc=(1.0,0.66,0.02); m=mat(self.name+"_hat",hc,0.35,0.5)
            self.part(sph((0,0.04,hz+R*0.62),(R*1.0,R*0.96,R*0.66),m,seg=40),0.012)
            brim=cyl((0,0.1,hz+R*0.62),R*1.3,0.07,m,verts=48,r2=R*0.98,rot=(-0.3,0,0)); self.part(brim,0.01)
        # face decal: always looks at the camera
        piv=bpy.data.objects.new(self.name+"_facepiv",None); self.faces_coll.objects.link(piv); piv.parent=self.root; piv.location=(0,0,hz)
        con=piv.constraints.new('TRACK_TO'); con.target=bpy.context.scene.camera; con.track_axis='TRACK_Z'; con.up_axis='UP_Y'
        # face mesh hugs the drawn features (so it never hides the head's outline); beards add a lower lobe
        pts=[(0.96*math.cos(math.radians(a)),0.96*math.sin(math.radians(a))) for a in range(0,360,10)]
        pts=sorted(pts,key=lambda p: math.atan2(p[1],p[0]))
        me=bpy.data.meshes.new(self.name+"_face"); me.from_pydata([(x*R,y*R,0) for x,y in pts]+[(0,0,0)],[],[[i for i in range(len(pts))]]); me.update()
        uv=me.uv_layers.new()
        for l in me.loops:
            co=me.vertices[l.vertex_index].co; uv.data[l.index].uv=(co.x/(2.6*R)+0.5,co.y/(2.6*R)+0.5)
        fp=bpy.data.objects.new(self.name+"_face",me)
        self.faces_coll.objects.link(fp); fp.parent=piv; fp.location=(0,0,R*1.02); fp.visible_shadow=False
        self.face_mat=image_mat(self.name+"_facemat",f"{FACEDIR}/{self.name}_{self.face_name}.png",emit=0.6,rough=0.9)
        fp.data.materials.append(self.face_mat); self.face_obj=fp
        # legs + shoes
        for s in (-1,1):
            self.limb(tube([(s*0.065,0.0,hip+0.05),(s*0.07,0.0,0.45),(s*0.075,0.0,0.07)],0.012,mat("limb",legs,0.6)))
            self.part(sph((s*0.075,-0.04,0.035),(0.045,0.08,0.035),mat(self.name+"_shoes",shoes,0.5,0.3)),0.007)
        self.sh_z=z_t+torso/2-0.16; self.sh_x=torso_w*(1.0 if coat else 0.9)
        for side,pts in zip((-1,1),arms or [None,None]):
            if pts is None: pts=[(0.05,0,-0.02),(0.12,-0.02,-0.25),(0.14,-0.05,-0.5)]
            P=[(side*(self.sh_x+a),b,self.sh_z+c) for a,b,c in pts]
            self.limb(tube([(side*(self.sh_x-0.04),0,self.sh_z)]+P,0.011,mat("limb",legs,0.6)))
            self.limb(sph(P[-1],(0.024,0.024,0.024),mat("limb",legs,0.6)))
        return self
    def set_face(self,face):
        img=bpy.data.images.load(f"{FACEDIR}/{self.name}_{face}.png",check_existing=True)
        for n in self.face_mat.node_tree.nodes:
            if n.type=='TEX_IMAGE': n.image=img

POSES={  # per arm (left, right): points relative to the shoulder; x outward, y negative = toward camera, z up
 "rest":   ([(0.03,0,-0.06),(0.07,-0.01,-0.24),(0.08,-0.03,-0.42)],)*2,
 "hips":   ([(0.05,0.0,-0.06),(0.15,0.02,-0.17),(0.05,-0.02,-0.3)],)*2,
 "explain":([(0.03,0,-0.06),(0.07,-0.01,-0.24),(0.08,-0.03,-0.42)],[(0.04,-0.02,-0.06),(0.1,-0.12,-0.22),(0.2,-0.24,-0.12)]),
 "point":  ([(0.03,0,-0.06),(0.07,-0.01,-0.24),(0.08,-0.03,-0.42)],[(0.05,-0.03,-0.03),(0.18,-0.14,-0.04),(0.34,-0.24,0.0)]),
 "shrug":  ([(0.05,0,-0.07),(0.14,-0.03,-0.2),(0.26,-0.08,-0.1)],)*2,
 "panic":  ([(0.05,0,-0.02),(0.13,-0.03,0.14),(0.14,-0.06,0.34)],)*2,
 "wave":   ([(0.03,0,-0.06),(0.07,-0.01,-0.24),(0.08,-0.03,-0.42)],[(0.05,0,-0.02),(0.16,-0.02,0.06),(0.2,-0.05,0.28)]),
 "hold":   ([(0.03,-0.02,-0.07),(0.06,-0.14,-0.22),(-0.02,-0.26,-0.18)],)*2,
 "thinking":([(0.03,0,-0.06),(0.07,-0.01,-0.24),(0.08,-0.03,-0.42)],[(0.03,-0.03,-0.07),(0.06,-0.14,-0.2),(-0.06,-0.24,0.06)]),
}
def keeper(loc,yaw=0,face="smug",arms=None,pose=None):
    arms=list(POSES[pose]) if pose else arms
    return Character("keeper",loc,yaw,face=face).build(R=0.3,torso_w=0.16,coat=(0.93,0.68,0.16),buttons=3,hat="beanie",beard=True,
        shirt=(0.93,0.68,0.16),shoes=(0.08,0.06,0.05),arms=arms)
def engineer(loc,yaw=0,face="happy",arms=None,pose=None):
    arms=list(POSES[pose]) if pose else arms
    return Character("engineer",loc,yaw,face=face).build(R=0.29,torso_w=0.15,hair=(0.42,0.25,0.13),tie=(0.24,0.36,0.56),arms=arms)
