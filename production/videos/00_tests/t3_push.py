"""Style v2 test (about 6 s): puppet acting + DOF + contact shadows + post grade, in the lamp room at night.
VO: '...gives it one push with his finger, and two tons of glass start spinning like a record. The old keeper laughs.'
Usage: blender-python t3_push.py OUTDIR   env: WORDS, PCT, SPP, NPROC, KEYS"""
import bpy, sys, os, math, json
PIPE="/home/user/Med/production/pipeline"; sys.path.insert(0,PIPE)
from toon import *
from engine import *
import engine as EN, puppet as PP
from sets import lamp_room as LR
from mathutils import Vector
OUT=sys.argv[-1]; E=os.environ.get
W=json.load(open(E("WORDS"))); T=lambda i: W[i][0]
t0,t1=14.35,20.75
AS="/home/user/Med/production/videos/01_lighthouse_mercury/assets"
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=8,focus=2)
animated=[]
def child(o,parent):
    mw=o.matrix_world.copy(); o.parent=parent; o.matrix_world=mw; return o
# ---------------- set (night lamp room) + far sky + beam + mercury pool
LR.build("night"); LR.lights("night"); lx,ly=LR.LENS_C
bpy.ops.mesh.primitive_cylinder_add(radius=13.8,depth=24,location=(0,0,1.78),vertices=128); sky=bpy.context.object; sky.name="sky"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
sky.data.materials.append(image_live("sky_m",f"{AS}/pano_night.png")); live(sky)
me=sky.data; uvl=me.uv_layers.active or me.uv_layers.new(); zmin=min(v.co.z for v in me.vertices); zmax=max(v.co.z for v in me.vertices)
for poly in me.polygons:
    us=[(math.atan2(me.vertices[me.loops[li].vertex_index].co.y,me.vertices[me.loops[li].vertex_index].co.x)/(2*math.pi))%1.0 for li in poly.loop_indices]
    if max(us)-min(us)>0.5: us=[u+1.0 if u<0.5 else u for u in us]
    for li,u in zip(poly.loop_indices,us): uvl.data[li].uv=(u,(me.vertices[me.loops[li].vertex_index].co.z-zmin)/(zmax-zmin))
beam=light_beam("beam",(lx,ly,LR.POOL_Z+0.74),r1=12.5,far=(3.0,1.3,-1.6)); animated.append(beam)
animated.extend(bpy.data.objects[n] for n in beam["beam_subs"])
pool=live(cyl((lx,ly,LR.POOL_Z+0.01),0.62,0.03,solid("merc",(0.80,0.83,0.88)),verts=48,bevel=0))
hl=live(cyl((lx-0.25,ly-0.28,LR.POOL_Z+0.027),0.12,0.004,solid("merc_hi",(0.97,0.98,1.0)),verts=24,bevel=0)); hl.scale=(1.8,0.6,1)
movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048)
set_pivot(movs["lens"],(lx,ly,0)); animated.append(movs["lens"])
# ---------------- characters (baked once, appended)
def yaw_to(src,dst): d=Vector(dst)-Vector(src); return math.atan2(d.x,-d.y)
EP=(0.98,-0.12); KP=(-0.95,-0.62)
NIGHT=(0.66,0.70,0.90)
eng=PP.Puppet("engineer",(*EP,0),yaw_to(EP,(lx,ly)),cam=cam,tint=NIGHT)
kee=PP.Puppet("keeper",(*KP,0),yaw_to(KP,(0.6,-1.6)),cam=cam,tint=NIGHT)
RIM=Vector((0.40,0.13,1.02))
def rim_scratch(t):   # hand rides back and forth on the spinning rim like a DJ
    a=0.22*math.sin(2*math.pi*2.6*t); c=Vector((lx,ly,1.02)); d=(RIM-c); d.z=0
    return c+Vector((d.x*math.cos(a)-d.y*math.sin(a),d.x*math.sin(a)+d.y*math.cos(a),0))
# engineer: wind-up -> poke -> blow the finger like a smoking gun -> proud -> DJ scratch -> deadpan at the keeper
eng.keys=[(0.0,dict(lean=0.05,arms={1:("rest",),-1:("rest",)})),
          (T(49)-0.05,dict(lean=-0.25,nod=-0.2,tilt=0.1,arms={1:("body",(0.10,-0.12,0.50)),-1:("body",(0.18,0.0,-0.25))},snap=0.22)),
          (T(52)-0.08,dict(lean=0.30,nod=0.05,tilt=0.0,arms={1:("world",RIM),-1:("body",(0.2,-0.05,-0.2))},snap=0.09,overshoot=2.2)),
          (T(54)-0.05,dict(lean=-0.05,nod=-0.08,arms={1:("body",(-0.04,0.24,0.22)),-1:("rest",)},snap=0.2)),
          (T(57)-0.1,dict(lean=-0.12,nod=-0.15,arms={1:("body",(0.13,-0.02,-0.30)),-1:("body",(0.13,-0.02,-0.30))},snap=0.18)),
          (T(61)-0.1,dict(lean=0.18,nod=0.0,arms={-1:("world",rim_scratch),1:("body",(0.10,0.0,0.24))},snap=0.18)),
          (T(66)-0.05,dict(lean=0.0,nod=0.0,turn=0.0,tilt=-0.12,arms={1:("rest",),-1:("rest",)},snap=0.25))]
for k in range(8):   # head bops to the 'record'
    eng.keys.append((T(61)+0.12+k*0.2,dict(nod=0.16 if k%2==0 else -0.04,snap=0.09)))
eng.keys.sort(key=lambda k:k[0])
# keeper: arms folded, unimpressed -> jumps back in shock -> leans in staring -> bursts out laughing, slaps his knee
fold={1:("body",(-0.14,0.16,-0.30)),-1:("body",(-0.10,0.19,-0.25))}
kee.keys=[(0.0,dict(lean=-0.08,tilt=0.12,arms=fold)),
          (T(56)+0.05,dict(air=0.22,lean=-0.25,squash=-0.05,arms={1:("body",(0.22,0.05,0.32)),-1:("body",(0.22,0.05,0.32))},snap=0.12,pos=(KP[0]-0.12,KP[1]-0.08),move=0.3)),
          (T(57)+0.05,dict(air=0.0,squash=0.10,lean=0.05,snap=0.1)),
          (T(58)+0.0,dict(squash=0.0,lean=0.25,crouch=0.25,tilt=-0.1,arms={1:("body",(0.06,0.24,-0.52)),-1:("body",(0.06,0.24,-0.52))},snap=0.2)),
          (T(66)-0.05,dict(lean=-0.38,crouch=0.0,nod=-0.35,tilt=0.15,arms={1:("body",(-0.02,0.18,-0.26)),-1:("body",(-0.02,0.18,-0.32))},snap=0.18)),
          (T(69),dict(lean=0.7,crouch=0.45,nod=-0.25,tilt=-0.15,arms={1:("body",(0.0,0.30,-0.62)),-1:("body",(0.2,0.05,0.12))},snap=0.12,overshoot=2.0)),
          (T(69)+0.32,dict(lean=-0.30,crouch=0.05,nod=-0.35,tilt=0.2,arms={1:("body",(-0.02,0.18,-0.26)),-1:("body",(-0.02,0.18,-0.32))},snap=0.16)),
          (T(69)+0.62,dict(lean=0.65,crouch=0.42,nod=-0.2,tilt=-0.1,arms={1:("body",(0.0,0.30,-0.62)),-1:("body",(0.2,0.05,0.14))},snap=0.12,overshoot=2.0))]
eng.face_seq=[(0,"smug"),(T(49),"evil"),(T(54),"proud"),(T(57),"smug"),(T(61),"happy"),(T(66),"neutral")]
kee.face_seq=[(0,"skeptical"),(T(56)+0.05,"shock"),(T(58),"worried"),(T(66)-0.1,"laugh")]
# ---------------- camera: one continuous move, focus moves over the people/objects
CAM=[(t0,(0.85,-2.25,1.3),(0.62,-0.05,1.05),27),
     (T(52)-0.2,(0.75,-1.9,1.25),(0.62,-0.02,1.08),30),(T(52)+0.08,(0.6,-1.5,1.15),(0.52,0.05,1.05),36),
     (T(55),(0.68,-1.7,1.25),(0.75,-0.1,1.2),33),
     (T(56)+0.0,(-0.15,-2.35,1.4),(-0.55,-0.3,1.0),24),(T(60)+0.1,(-0.1,-2.3,1.42),(-0.45,-0.2,1.02),25),
     (T(61)+0.1,(0.9,-2.2,1.35),(0.62,-0.02,1.1),29),(T(65)+0.1,(0.92,-2.12,1.35),(0.64,0.0,1.12),32),
     (T(66)+0.15,(-0.42,-2.35,1.45),(-0.97,-0.62,0.95),29),(t1,(-0.45,-2.2,1.42),(-0.97,-0.62,0.97),32)]
def lens_angle(t):
    tp=T(52)+0.05
    if t<tp: return 0.0
    u=t-tp; ramp=2.2; w=1.6
    return w*(u*u/(2*ramp)) if u<ramp else w*(ramp/2+(u-ramp))
pups=[eng,kee]; SH={}
def update(t):
    c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l*0.80
    movs["lens"].rotation_euler=(0,0,lens_angle(t))
    beam.rotation_euler=(0,0,lens_angle(t)+1.0); bs=ss((t-T(56))/0.8); beam_update(beam,c,amount=bs)
    bpy.context.view_layer.update()
    for p in pups: p.pose(t)
hooks=[p.key for p in pups]+[PP.shadow_hook(pups,SH)]
swaps={}
for p in pups: swaps.update(p.swaps())
EV=[("whoosh",t0,0.5),("whoosh",T(52)-0.2,0.5),("glass_clink",T(52)+0.02,0.7),("whoosh",T(56)-0.1,0.6),("boing",T(56)+0.05,0.35),
    ("whoosh",T(61)-0.05,0.5),("whoosh",T(66)+0.0,0.6),("impact",T(69)+0.1,0.25),("impact",T(69)+0.72,0.25)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
