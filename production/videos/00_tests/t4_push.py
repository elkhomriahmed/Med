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
NIGHT=(0.92,0.94,1.0)   # the vivid night grade does the colour; keep characters bright
eng=PP.Puppet("engineer",(*EP,0),yaw_to(EP,(lx,ly)),cam=cam,tint=NIGHT)
kee=PP.Puppet("keeper",(*KP,0),yaw_to(KP,(0.6,-1.6)),cam=cam,tint=NIGHT)
RIM=Vector((0.51,0.08,1.24))
def rim_scratch(t):   # hand rides back and forth on the spinning rim like a DJ
    a=0.22*math.sin(2*math.pi*2.6*t); c=Vector((lx,ly,1.24)); d=(RIM-c); d.z=0
    return c+Vector((d.x*math.cos(a)-d.y*math.sin(a),d.x*math.sin(a)+d.y*math.cos(a),0))
hips={1:("body",(0.14,-0.02,-0.32)),-1:("body",(0.14,-0.02,-0.32))}
# ENGINEER: cocky stance -> big wind-up (arches back) -> poke (folds forward) -> blows the finger -> chest out, hands on hips
#           -> DJ scratch with a hand on his "headphones", head bopping -> turns to the keeper, deadpan
eng.keys=[(0.0,dict(sbend=0.22,side=0.05,tilt=-0.12,arms={1:("rest",),-1:("body",(0.14,-0.02,-0.32))})),
          (T(49)-0.08,dict(bend=-0.38,sbend=0.0,side=0.0,nod=-0.22,tilt=0.1,arms={1:("body",(0.20,-0.32,0.46)),-1:("body",(0.20,0.0,-0.22))},snap=0.22,damp=0.5)),
          (T(52)-0.1,dict(bend=0.45,lean=0.12,nod=0.08,tilt=0.0,arms={1:("world",RIM),-1:("body",(0.22,-0.08,-0.15))},snap=0.08,damp=0.32)),
          (T(54)-0.05,dict(bend=-0.12,lean=0.0,nod=-0.1,tilt=0.18,arms={1:("body",(-0.03,0.27,0.32)),-1:("rest",)},snap=0.18)),
          (T(57)-0.12,dict(bend=-0.28,nod=-0.14,tilt=-0.08,sbend=0.12,arms=hips,snap=0.2)),
          (T(61)-0.12,dict(bend=0.30,sbend=0.0,lean=0.05,nod=0.0,tilt=0.0,arms={1:("world",rim_scratch),-1:("body",(0.13,0.0,0.36))},snap=0.18)),
          (T(66)-0.05,dict(bend=0.0,lean=0.0,turn=-0.35,tilt=-0.15,sbend=-0.12,arms={1:("rest",),-1:("body",(0.14,-0.02,-0.32))},snap=0.25))]
for k in range(8):   # head bops to the 'record'
    eng.keys.append((T(61)+0.15+k*0.2,dict(nod=0.18 if k%2==0 else -0.04,snap=0.08)))
eng.keys.sort(key=lambda k:k[0])
# KEEPER: arms folded, weight on one leg, unimpressed -> jumps back in shock -> lands low -> leans right in, hands on knees
#         -> bursts out laughing (arches back) -> folds over slapping his knee, twice
fold={1:("body",(-0.15,0.17,-0.34)),-1:("body",(-0.11,0.20,-0.29))}
kee.keys=[(0.0,dict(sbend=-0.18,side=-0.05,bend=-0.08,tilt=0.14,arms=fold)),
          (T(52)+0.1,dict(tilt=-0.1,nod=0.1,snap=0.25)),
          (T(56)+0.02,dict(jump=(0.26,0.40),bend=-0.42,sbend=0.0,side=0.0,tilt=0.0,nod=-0.2,arms={1:("body",(0.24,0.05,0.38)),-1:("body",(0.24,0.05,0.38))},snap=0.1,damp=0.35,pos=(KP[0]-0.16,KP[1]-0.10),move=0.4)),
          (T(57)+0.25,dict(crouch=0.25,bend=0.25,nod=0.1,arms={1:("body",(0.28,0.12,-0.05)),-1:("body",(0.28,0.12,-0.05))},snap=0.15)),
          (T(58)+0.15,dict(crouch=0.25,bend=0.75,lean=0.08,tilt=0.25,nod=-0.1,arms={1:("body",(0.06,0.30,-0.62)),-1:("body",(0.06,0.30,-0.62))},snap=0.25)),
          (T(66)-0.08,dict(crouch=0.0,bend=-0.6,lean=-0.05,nod=-0.3,tilt=0.15,arms={1:("body",(-0.02,0.20,-0.30)),-1:("body",(-0.02,0.20,-0.36))},snap=0.16,damp=0.4)),
          (T(69)-0.02,dict(crouch=0.35,bend=0.9,lean=0.15,nod=-0.2,tilt=-0.15,arms={1:("body",(0.0,0.42,-0.55)),-1:("body",(0.22,0.05,0.14))},snap=0.1,damp=0.35)),
          (T(69)+0.34,dict(crouch=0.05,bend=-0.5,nod=-0.32,tilt=0.2,arms={1:("body",(-0.02,0.20,-0.30)),-1:("body",(-0.02,0.20,-0.36))},snap=0.14)),
          (T(69)+0.66,dict(crouch=0.35,bend=0.9,lean=0.15,nod=-0.2,tilt=-0.1,arms={1:("body",(0.0,0.42,-0.55)),-1:("body",(0.22,0.05,0.16))},snap=0.1,damp=0.35))]
# faces change about every second
eng.face_seq=[(0,"smug"),(T(47),"skeptical"),(T(49)-0.1,"evil"),(T(52)-0.05,"happy"),(T(54)-0.05,"proud"),(T(57)-0.1,"smug"),
              (T(61)-0.1,"happy"),(T(63),"laugh"),(T(65),"happy"),(T(66),"skeptical"),(T(68),"neutral")]
kee.face_seq=[(0,"skeptical"),(T(51),"smug"),(T(53),"sleepy"),(T(56)+0.0,"shock"),(T(57)+0.25,"scream"),(T(58)+0.15,"worried"),
              (T(60),"shock"),(T(62),"skeptical"),(T(66)-0.1,"laugh"),(T(68),"happy"),(T(69),"laugh")]
# ---------------- camera: one continuous move, focus slides over people/objects
CAM=[(t0,(0.95,-2.5,1.55),(0.70,-0.05,1.3),27),
     (T(52)-0.2,(0.85,-2.15,1.5),(0.70,-0.02,1.32),30),(T(52)+0.08,(0.72,-1.65,1.35),(0.58,0.04,1.25),35),
     (T(55),(0.8,-1.95,1.5),(0.82,-0.1,1.45),32),
     (T(56)+0.0,(-0.15,-2.6,1.6),(-0.55,-0.3,1.15),24),(T(60)+0.1,(-0.1,-2.55,1.62),(-0.45,-0.2,1.18),25),
     (T(61)+0.1,(1.0,-2.45,1.55),(0.66,-0.02,1.3),29),(T(65)+0.1,(1.02,-2.38,1.55),(0.68,0.0,1.32),32),
     (T(66)+0.15,(-0.42,-2.6,1.6),(-0.97,-0.62,1.12),29),(t1,(-0.45,-2.45,1.58),(-0.97,-0.62,1.14),32)]
def lens_angle(t):
    tp=T(52)+0.05
    if t<tp: return 0.0
    u=t-tp; ramp=2.2; w=1.6
    return w*(u*u/(2*ramp)) if u<ramp else w*(ramp/2+(u-ramp))
pups=[eng,kee]; SH={}
for p in pups: p.settle(t0,60)   # springs start at rest in the opening pose
def update(t):
    c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l*0.80
    movs["lens"].rotation_euler=(0,0,lens_angle(t))
    beam.rotation_euler=(0,0,lens_angle(t)+1.0); bs=ss((t-T(56))/0.8); beam_update(beam,c,amount=bs)
    bpy.context.view_layer.update()
    for p in pups: p.pose(t)
hooks=[p.key for p in pups]+[PP.shadow_hook(pups,SH)]
swaps={}
for p in pups: swaps.update(p.swaps(t0,t1))
EV=[("whoosh",t0,0.5),("whoosh",T(52)-0.2,0.5),("glass_clink",T(52)+0.02,0.7),("whoosh",T(56)-0.1,0.6),("boing",T(56)+0.05,0.35),
    ("whoosh",T(61)-0.05,0.5),("whoosh",T(66)+0.0,0.6),("impact",T(69)+0.1,0.25),("impact",T(69)+0.72,0.25)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
