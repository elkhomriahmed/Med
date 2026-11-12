"""Style v2 test (about 6 s): puppet acting + DOF + contact shadows + post grade, in the lamp room at night.
VO: 'The old keeper laughs. "Son, I've turned that lens by hand for 30 years. You can't float glass on metal," but it works.'
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
t0,t1=19.25,26.55
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
EP=(0.80,-0.50); KP=(-0.62,-0.80)
NIGHT=(1.0,1.0,1.0)
eng=PP.Puppet("engineer",(*EP,0),yaw_to(EP,(-0.2,-1.6)),cam=cam,tint=NIGHT)
kee=PP.Puppet("keeper",(*KP,0),yaw_to(KP,(0.6,-1.7)),cam=cam,tint=NIGHT)
LENS=(lx,ly,1.45)
# KEEPER (the talker): calm body, slow readable hand gestures, face never stops changing.
kee.keys=[(0.0,dict(bend=-0.18,tilt=0.06,arms={-1:("body",(-0.05,0.22,-0.34)),1:("body",(-0.05,0.22,-0.40))})),          # laughing, hands on belly
          (T(69)+0.15,dict(bend=-0.26,nod=-0.08,snap=0.45)),
          (T(70)-0.25,dict(bend=0.0,nod=0.0,tilt=-0.05,yaw=yaw_to(KP,(0.4,-0.9)),pos=(KP[0]+0.18,KP[1]+0.08),move=0.7,
                         arms={-1:("body",(0.06,0.20,-0.12)),1:("rest",)},snap=0.45)),                                   # steps towards the engineer
          (T(71),dict(arms={-1:("body",(-0.13,0.17,-0.06)),1:("rest",)},snap=0.35)),                                    # "I've" - thumb to his chest
          (T(74)-0.05,dict(tilt=0.08,arms={-1:("body",(0.26,0.22,0.02)),1:("rest",)},snap=0.4)),                          # "that lens" - open hand to the lens
          (T(75),dict(arms={-1:("wave",0.14,0.26,-0.06,0.07,1.6),1:("rest",)},snap=0.4)),                                  # "by hand" - mimes cranking
          (T(77)+0.05,dict(tilt=-0.1,bend=-0.06,arms={-1:("body",(0.26,0.14,0.30)),1:("rest",)},snap=0.4)),                # "30 years" - finger up, proud
          (T(80)-0.05,dict(tilt=0.06,bend=0.10,arms={-1:("wave",0.10,0.30,0.06,0.035,2.4),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),  # "can't" - wags his finger
          (T(85),dict(bend=0.0,arms={-1:("body",(0.20,0.20,-0.05)),1:("body",(0.14,-0.02,-0.32))},snap=0.45)),              # "metal" - palm up
          (T(86)+0.1,dict(tilt=0.0,bend=-0.05,yaw=yaw_to((KP[0]+0.18,KP[1]+0.08),(0.0,0.3)),arms={-1:("rest",),1:("rest",)},snap=0.5))]  # turns to the lens
kee.gest_side=-1
kee.talk(W,T(70)-0.01,T(85)+0.31,every=2,amp=1.0)
kee.face_seq=[(0,"laugh"),(T(68),"happy"),(T(69),"laugh"),(T(69)+0.4,"happy"),(T(70),"smug"),(T(72),"proud"),(T(74),"smug"),(T(75),"happy"),
              (T(77),"proud"),(T(79),"smug"),(T(80),"skeptical"),(T(82),"smug"),(T(83),"skeptical"),(T(85),"smug"),(T(86)+0.1,"neutral"),(T(87),"shock"),(T(88)+0.1,"worried")]
# ENGINEER (listener): stands still, reacts with the face and small head tilts, one hand in his pocket
eng.keys=[(0.0,dict(sbend=0.10,tilt=-0.05,arms={1:("rest",),-1:("body",(0.14,-0.02,-0.32))})),
          (T(72),dict(tilt=0.10,snap=0.5)),(T(78),dict(tilt=-0.08,snap=0.5)),
          (T(82),dict(arms={1:("body",(-0.05,0.22,0.10)),-1:("body",(0.14,-0.02,-0.32))},tilt=0.04,snap=0.45)),      # rubs his chin
          (T(86),dict(sbend=0.18,tilt=-0.12,arms={1:("body",(0.20,0.15,-0.10)),-1:("body",(0.14,-0.02,-0.32))},snap=0.45))]   # "but it works" - presents the lens
eng.face_seq=[(0,"neutral"),(T(69),"skeptical"),(T(70)+0.2,"neutral"),(T(72),"smug"),(T(74),"sleepy"),(T(76),"skeptical"),(T(78),"neutral"),
              (T(80),"smug"),(T(82),"skeptical"),(T(84),"sleepy"),(T(86),"smug"),(T(87),"happy"),(T(88),"proud")]
# camera: slow, steady pushes; one glide at the end to the lens
CAM=[(t0,(0.15,-3.05,1.6),(0.05,-0.55,1.35),26),
     (T(70)-0.2,(0.05,-2.85,1.6),(-0.05,-0.6,1.38),27),
     (T(71),(-0.2,-2.45,1.6),(-0.35,-0.7,1.4),30),(T(79),(-0.25,-2.25,1.6),(-0.38,-0.72,1.42),33),
     (T(80),(-0.2,-2.3,1.6),(-0.32,-0.7,1.42),32),(T(85),(-0.22,-2.15,1.6),(-0.35,-0.7,1.42),35),
     (T(86)+0.1,(0.55,-2.35,1.65),(0.25,-0.05,1.45),28),(t1,(0.55,-2.15,1.62),(0.22,0.0,1.45),30)]
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
    beam.rotation_euler=(0,0,lens_angle(t)+1.0); beam_update(beam,c,amount=1.0)
    bpy.context.view_layer.update()
    for p in pups: p.pose(t)
hooks=[p.key for p in pups]+[PP.shadow_hook(pups,SH)]
swaps={}
for p in pups: swaps.update(p.swaps(t0,t1))
EV=[("laughter_small_group",t0,0.18,1.3),("footsteps_wood",T(70)-0.25,0.35,0.7),("whoosh",T(86)+0.0,0.45),("bell_ding",T(88),0.35)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
