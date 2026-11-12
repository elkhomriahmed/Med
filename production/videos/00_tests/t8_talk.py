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
EP=(0.55,-0.50); KP=(-0.62,-0.85); KP2=(-0.22,-0.78)
NIGHT=(0.80,0.82,0.95)   # face whites sit in the room's light too
def yaw_mix(src,a,b,w):   # body turned between two points (3/4 towards the partner, still open to camera)
    ya=yaw_to(src,a); yb=yaw_to(src,b); d=(yb-ya+math.pi)%(2*math.pi)-math.pi; return ya+d*w
CAMPT=(0.1,-2.6)
eng=PP.Puppet("engineer",(*EP,0),yaw_mix(EP,CAMPT,KP,0.55),cam=cam,tint=NIGHT,light="night_lamp")
kee=PP.Puppet("keeper",(*KP,0),yaw_mix(KP,CAMPT,EP,0.55),cam=cam,tint=NIGHT,light="night_lamp")
eng.look_target=kee; kee.look_target=eng
LENSPT=Vector((lx,ly,1.45))
def beside_head(who,dx,dz,dy=0.0):   # camera-space point beside a head (never in front of the face)
    def f(t):
        m=cam.matrix_world; r=Vector((m[0][0],m[1][0],m[2][0])); u=Vector((m[0][1],m[1][1],m[2][1])); b=Vector((m[0][2],m[1][2],m[2][2]))
        return who.head_pos()+r*dx+u*dz+b*dy
    return f
def eng_shoulder(t):   # where the keeper pats the engineer
    return eng.head_pos()+Vector((-0.20,-0.02,-0.36))
belly={1:("body",(-0.05,0.22,-0.36)),-1:("body",(-0.05,0.22,-0.42))}
pocket={1:("body",(0.10,0.02,-0.42)),-1:("body",(0.10,0.02,-0.42))}
fold={1:("body",(-0.15,0.17,-0.34)),-1:("body",(-0.11,0.20,-0.29))}
# KEEPER: laughs at the "kid" -> pats his shoulder ("Son,") -> brags with his hands -> wags a finger at him -> shrugs
#         -> turns to the lens on "but it works" and his jaw drops
kee.keys=[(0.0,dict(bend=-0.30,shake=1.0,look=0.6,tilt=0.10,arms=belly)),
          (T(69)+0.35,dict(bend=0.55,crouch=0.2,shake=1.0,arms={-1:("body",(0.02,0.36,-0.62)),1:("body",(-0.05,0.22,-0.40))},snap=0.3)),   # folds over, slaps his knee
          (T(70)-0.40,dict(bend=0.05,crouch=0.0,shake=0.0,look=0.8,tilt=-0.08,pos=KP2,move=0.55,yaw=yaw_mix(KP2,CAMPT,EP,0.6),
                         arms={-1:("world",eng_shoulder),1:("rest",)},snap=0.4)),                                           # "Son," - pats the engineer's shoulder
          (T(71)+0.05,dict(bend=-0.12,look=0.5,tilt=0.08,arms={-1:("body",(-0.13,0.17,-0.06)),1:("rest",)},snap=0.35)),     # "I've" - thumb to his own chest
          (T(74)-0.05,dict(bend=0.0,look=0.25,tilt=-0.06,arms={-1:("world",LENSPT),1:("rest",)},snap=0.4)),                 # "that lens" - open hand to the lens
          (T(75)+0.05,dict(look=0.5,arms={-1:("wave",0.14,0.26,-0.06,0.07,1.6),1:("rest",)},snap=0.4)),                     # "by hand" - mimes cranking
          (T(77)+0.05,dict(bend=-0.16,tilt=0.14,look=0.3,arms={-1:("world",beside_head(kee,-0.40,0.06,0.10)),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),  # "30 years" - finger up, chest out
          (T(80)-0.05,dict(bend=0.28,tilt=-0.08,look=0.85,arms={-1:("wave",0.12,0.36,0.06,0.035,2.4),1:("body",(0.14,-0.02,-0.32))},snap=0.35)),  # "You can't" - leans in, wags a finger
          (T(83),dict(bend=-0.05,tilt=0.16,look=0.6,arms={-1:("body",(0.30,0.14,-0.08)),1:("body",(0.30,0.14,-0.08))},snap=0.4)),  # "glass on metal" - shrug, palms up
          (T(86)+0.05,dict(bend=-0.10,look=0.0,tilt=0.0,yaw=yaw_mix(KP2,CAMPT,(lx,ly),0.5),arms={-1:("rest",),1:("rest",)},snap=0.45)),  # "but" - turns to the lens
          (T(88)-0.05,dict(bend=-0.32,nod=-0.12,arms={-1:("body",(0.20,0.12,0.12)),1:("body",(0.20,0.12,0.12))},snap=0.25))]   # "works" - jaw drops, hands up
kee.gest_side=-1
kee.talk(W,T(70)-0.01,T(85)+0.31,every=2,amp=1.0)
kee.face_seq=[(0,"laugh"),(T(68),"happy"),(T(69),"laugh"),(T(70)-0.3,"smug"),(T(71),"proud"),(T(73),"smug"),(T(75),"happy"),
              (T(77),"proud"),(T(79),"smug"),(T(80),"skeptical"),(T(82),"smug"),(T(83),"laugh"),(T(84),"smug"),(T(86),"neutral"),(T(87),"worried"),(T(88)-0.05,"shock")]
# ENGINEER: polite, patient, confident - humours the old man, then lets the lens do the talking
eng.keys=[(0.0,dict(look=0.55,tilt=-0.06,sbend=0.08,arms=pocket)),
          (T(69),dict(shake=0.35,tilt=0.06,snap=0.5)),                                                     # polite chuckle
          (T(70)-0.2,dict(shake=0.0,bend=-0.12,look=0.8,tilt=0.12,snap=0.35)),                             # "Son?" - eyebrows up, leans back
          (T(72)+0.1,dict(bend=0.0,look=0.25,turn=0.35,tilt=-0.05,snap=0.5)),                               # glances at the lens
          (T(75),dict(look=0.7,turn=0.0,nod=0.10,snap=0.45)),(T(76),dict(nod=-0.04,snap=0.45)),(T(77),dict(nod=0.10,snap=0.45)),(T(78),dict(nod=-0.02,snap=0.45)),  # polite nods
          (T(80)+0.1,dict(nod=0.0,tilt=0.14,sbend=0.14,look=0.8,arms=fold,snap=0.4)),                          # "can't float glass" - folds his arms, unbothered
          (T(85),dict(tilt=-0.10,snap=0.4)),
          (T(86)+0.05,dict(look=0.0,tilt=0.08,sbend=0.0,bend=-0.08,yaw=yaw_mix(EP,CAMPT,(lx,ly),0.45),
                           arms={1:("body",(0.30,0.24,0.02)),-1:("body",(0.30,0.24,0.02))},snap=0.35))]    # "but it works" - ta-da, presents the lens
eng.face_seq=[(0,"happy"),(T(69),"laugh"),(T(70)-0.2,"shock"),(T(71),"skeptical"),(T(72)+0.1,"neutral"),(T(74),"smug"),(T(75),"happy"),(T(77),"sleepy"),
              (T(79),"skeptical"),(T(80)+0.1,"smug"),(T(82),"skeptical"),(T(84),"evil"),(T(86),"smug"),(T(87),"happy"),(T(88),"proud")]
# camera: dynamic angles, always inside the room (r < 2.55)
CAM=[(t0,(0.00,-2.15,1.05),(-0.05,-0.62,1.45),28),                              # low two-shot: laughing
     (T(69)+0.2,(0.05,-2.08,1.08),(-0.12,-0.66,1.42),30),
     (T(70)-0.1,(0.40,-2.00,1.45),(0.12,-0.66,1.50),30),(T(73),(0.35,-1.85,1.50),(0.02,-0.72,1.50),33),   # two-shot: the pat on "Son,"
     (T(77)-0.05,(0.15,-1.62,1.15),(-0.18,-0.78,1.62),34),(T(79)+0.2,(0.12,-1.52,1.18),(-0.18,-0.78,1.62),37), # low push: face fills the frame
     (T(80)-0.1,(-0.65,-1.95,1.50),(0.20,-0.62,1.50),30),(T(85),(-0.58,-1.85,1.50),(0.20,-0.62,1.52),33),     # front-left 3/4 two-shot
     (T(86)+0.05,(0.85,-1.75,1.45),(0.35,-0.25,1.42),30),(t1,(0.80,-1.65,1.45),(0.32,-0.22,1.44),32)]        # the engineer + the spinning lens
def _clamp(k):
    t_,c,g,l=k; v=Vector(c); r=math.hypot(v.x,v.y)
    if r>2.55: v.x*=2.55/r; v.y*=2.55/r
    return (t_,tuple(v),g,l)
CAM=[_clamp(k) for k in CAM]
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
EV=[("laughter_small_group",t0,0.16,1.4),("footsteps_wood",T(70)-0.4,0.35,0.6),("impact",T(70)-0.02,0.12),("whoosh",T(70)-0.15,0.35),
    ("whoosh",T(77)-0.1,0.35),("whoosh",T(80)-0.15,0.35),("whoosh",T(86)+0.0,0.45),("bell_ding",T(88),0.35),("gasp",T(88)-0.05,0.4)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
