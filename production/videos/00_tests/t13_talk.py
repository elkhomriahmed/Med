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
seat=box((-0.62,-0.80,0.21),(0.44,0.40,0.42),wood("seat_crate",(0.58,0.40,0.22),(0.36,0.23,0.12),axis="X",grain=7,bump=0.2),0.012,name="seatcrate")
signb=box((-1.05,2.35,1.78),(0.95,0.04,0.42),wood("sign_board",(0.55,0.36,0.18),(0.35,0.22,0.10),axis="X",grain=6,bump=0.2),0.01,rot=(0,0,-0.35),name="signboard")
for txt,dz,sz in (("KEEPER OF THE YEAR",0.07,0.085),("1871 - 1901",-0.08,0.11)):
    cu=bpy.data.curves.new("signtxt",'FONT'); cu.body=txt; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=sz; cu.extrude=0.003
    cu.font=bpy.data.fonts.load("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",check_existing=True)
    to=bpy.data.objects.new("signtext",cu); sc.collection.objects.link(to); cu.materials.append(mat("sign_ink",(0.92,0.80,0.40),0.5,0.4,emit=0.3))
    to.rotation_euler=(math.pi/2,0,-0.35); to.location=(-1.05-0.03*math.sin(0.35),2.35-0.03*math.cos(0.35),1.78+dz)
BX,BY,BR=1.55,-0.15,-0.45   # chalkboard on an easel, facing the camera side of the room
def bxy(dx,dy): return (BX+dx*math.cos(BR)-dy*math.sin(BR),BY+dx*math.sin(BR)+dy*math.cos(BR))
board=box((*bxy(0,0),1.05),(0.62,0.04,0.46),mat("chalk",(0.10,0.14,0.12),0.9,0.05),0.01,rot=(0,0,BR),name="chalkboard")
box((*bxy(0,0.02),1.05),(0.68,0.035,0.52),wood("chalk_frame",(0.55,0.36,0.18),(0.35,0.22,0.10),axis="X",grain=6),0.008,rot=(0,0,BR),name="chalkframe")
for dx in (-0.22,0.22):
    cyl((*bxy(dx,0.05),0.42),0.018,0.84,wood("easel",(0.5,0.32,0.16),(0.32,0.2,0.1),axis="Z",grain=6),rot=(0.12,0,BR),name="easel")
for txt,dz,sz in (("DAYS WITHOUT A",0.13,0.06),("SHIPWRECK:",0.04,0.07),("3",-0.11,0.16)):
    cu=bpy.data.curves.new("chalktxt",'FONT'); cu.body=txt; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=sz; cu.extrude=0.002
    cu.font=bpy.data.fonts.load("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",check_existing=True)
    to=bpy.data.objects.new("chalktext",cu); sc.collection.objects.link(to); cu.materials.append(mat("chalk_ink",(0.92,0.92,0.86),0.9,0.05,emit=0.15))
    to.rotation_euler=(math.pi/2,0,BR); to.location=(*bxy(0,-0.025),1.05+dz)
# foreground props near the camera (blurred by the lens): oil cans on a stool, a coiled rope, a bucket
stool=wood("fg_stool",(0.5,0.32,0.16),(0.32,0.2,0.1),axis="X",grain=6)
cyl((-0.95,-2.05,0.45),0.20,0.04,stool,verts=24,name="fg_stool_top")
for k in range(3): cyl((-0.95+0.13*math.cos(k*2.1),-2.05+0.13*math.sin(k*2.1),0.22),0.02,0.44,stool,verts=8,name="fg_stool_leg")
cyl((-0.98,-2.02,0.55),0.06,0.16,mat("fg_can",(0.55,0.12,0.08),0.4,0.4),verts=16,name="fg_can")
cyl((-0.88,-2.10,0.53),0.05,0.12,mat("fg_can2",(0.20,0.42,0.25),0.4,0.4),verts=16,name="fg_can2")
cyl((0.95,-2.10,0.16),0.16,0.32,mat("fg_bucket",(0.45,0.47,0.50),0.4,0.6),verts=20,r2=0.19,name="fg_bucket")
movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048)
set_pivot(movs["lens"],(lx,ly,0)); animated.append(movs["lens"])
# ---------------- characters (baked once, appended)
def yaw_to(src,dst): d=Vector(dst)-Vector(src); return math.atan2(d.x,-d.y)
EP=(0.55,-0.50); KP=(-0.62,-0.85); KP2=(-0.22,-0.78)
NIGHT=(1.0,1.0,1.0)   # characters keep their own soft light; post grades them lightly
def yaw_mix(src,a,b,w):   # body turned between two points (3/4 towards the partner, still open to camera)
    ya=yaw_to(src,a); yb=yaw_to(src,b); d=(yb-ya+math.pi)%(2*math.pi)-math.pi; return ya+d*w
CAMPT=(0.1,-2.6)
eng=PP.Puppet("engineer",(*EP,0),yaw_mix(EP,CAMPT,KP,0.55),cam=cam,tint=NIGHT,light="soft")
kee=PP.Puppet("keeper",(*KP,0),yaw_mix(KP,CAMPT,EP,0.55),cam=cam,tint=NIGHT,light="soft")
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
SEAT_TOP=Vector((-0.50,-0.66,0.43))   # where he puts the mug down
mug_hand=1                              # far hand holds the mug, near hand (-1) gestures
sitting=dict(crouch=0.92,feetfwd=0.30)
thigh={-1:("body",(0.02,0.30,-0.42))}     # hand resting on his thigh
kee.keys=[(0.0,dict(**sitting,bend=-0.18,shake=0.8,look=0.86,tilt=0.10,arms={-1:("body",(-0.04,0.24,-0.34)),1:("body",(0.02,0.24,-0.22))})),   # sits laughing, mug in hand
          (T(69)+0.35,dict(**sitting,bend=0.42,shake=0.8,arms={-1:("body",(0.02,0.36,-0.50)),1:("body",(0.02,0.24,-0.22))},snap=0.35)),   # folds over, slaps his knee
          (T(70)-0.95,dict(**sitting,bend=0.20,shake=0.0,look=0.59,arms={-1:thigh[-1],1:("world",SEAT_TOP+Vector((0,0,0.06)))},snap=0.35)),   # puts the mug down beside him
          (T(70)-0.62,dict(**sitting,bend=0.50,lean=0.10,look=0.86,arms={-1:("body",(0.04,0.30,-0.50)),1:("body",(0.04,0.30,-0.50))},snap=0.3)),   # leans over his feet, hands on knees...
          (T(70)-0.40,dict(crouch=0.0,feetfwd=0.0,bend=0.05,lean=0.0,look=1.00,tilt=-0.08,arms={-1:("rest",),1:("rest",)},snap=0.32)),          # ...pushes up and stands
          (T(70)-0.18,dict(pos=KP2,move=0.5,yaw=yaw_mix(KP2,CAMPT,EP,0.6),arms={-1:("world",eng_shoulder),1:("rest",)},snap=0.4)),       # steps over: "Son," pat on the shoulder
          (T(71)+0.05,dict(bend=-0.12,look=0.73,tilt=0.08,arms={-1:("body",(-0.13,0.17,-0.06)),1:("rest",)},snap=0.4)),     # "I've" - thumb to his own chest
          (T(74)-0.05,dict(bend=0.0,look=0.39,tilt=-0.06,arms={-1:("world",LENSPT),1:("rest",)},snap=0.42)),                 # "that lens" - open hand to the lens
          (T(75)+0.05,dict(look=0.73,arms={-1:("wave",0.14,0.26,-0.06,0.07,1.6),1:("rest",)},snap=0.42)),                     # "by hand" - mimes cranking
          (T(77)+0.05,dict(bend=-0.16,tilt=0.14,look=0.46,arms={-1:("world",beside_head(kee,-0.40,0.06,0.10)),1:("body",(0.14,-0.02,-0.32))},snap=0.42)),  # "30 years" - finger up, chest out
          (T(80)-0.05,dict(bend=0.25,tilt=-0.08,look=1.00,arms={-1:("wave",0.12,0.36,0.06,0.035,2.4),1:("body",(0.14,-0.02,-0.32))},snap=0.38)),  # "You can't" - leans in, wags a finger
          (T(83),dict(bend=-0.05,tilt=0.16,look=0.86,arms={-1:("body",(0.30,0.14,-0.08)),1:("body",(0.30,0.14,-0.08))},snap=0.42)),  # "glass on metal" - shrug, palms up
          (T(86)+0.05,dict(bend=-0.08,look=0.00,tilt=0.0,yaw=yaw_mix(KP2,CAMPT,(lx,ly),0.5),arms={-1:("rest",),1:("rest",)},snap=0.45)),  # "but" - turns to the lens (head first, feet step round)
          (T(88)-0.05,dict(bend=-0.30,nod=-0.12,arms={-1:("body",(0.20,0.12,0.12)),1:("body",(0.20,0.12,0.12))},snap=0.28))]   # "works" - jaw drops
kee.fx_seq=[(0,"none"),(T(87)+0.05,"sweat")]
eng.fx_seq=[(0,"none"),(T(70)-0.05,"anger"),(T(71)+0.4,"none"),(T(88),"blush")]
mug_state={"held":True,"pos":None}
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
CAM=[(t0,(0.85,-2.45,2.10),(-0.05,-0.55,0.95),22),                             # high wide: the room, the lamp, their shadows
     (T(69)+0.2,(0.05,-2.45,1.25),(-0.05,-0.65,1.20),24),                         # low two-shot, both whole in frame
     (T(70)-0.1,(0.30,-2.45,1.45),(0.10,-0.62,1.30),25),(T(73),(0.25,-2.35,1.45),(0.05,-0.66,1.32),27),   # medium two-shot: the pat on "Son,"
     (T(77)-0.05,(0.15,-2.25,1.15),(-0.20,-0.78,1.55),27),(T(79)+0.2,(0.12,-2.15,1.18),(-0.20,-0.78,1.55),29), # low medium on the keeper
     (T(80)-0.1,(-0.75,-2.30,1.45),(0.15,-0.62,1.35),25),(T(85),(-0.70,-2.20,1.45),(0.15,-0.62,1.36),27),     # 3/4 two-shot from the left, stool in the foreground
     (T(86)+0.05,(0.55,-2.25,1.50),(0.75,-0.25,1.25),23),(t1,(0.52,-2.15,1.50),(0.75,-0.25,1.27),25)]        # the engineer, the chalkboard, the spinning lens
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
mug=bpy.data.objects.new("LIVE_mug",None); sc.collection.objects.link(mug); animated.append(mug)
for p_ in (cyl((0,0,0.055),0.045,0.11,solid("mug_b",(0.86,0.83,0.76)),verts=18,bevel=0),torus((0.055,0,0.06),0.028,0.009,solid("mug_h",(0.86,0.83,0.76)),rot=(math.pi/2,0,0)),
           cyl((0,0,0.108),0.04,0.004,solid("mug_tea",(0.42,0.24,0.10)),verts=18,bevel=0)):
    live(p_); child(p_,mug)
pups=[eng,kee]; SH={}
sc["passes"]=1; sc["shadow_light"]=json.dumps({"pos":[lx,ly,LR.POOL_Z+0.74],"fov":125})   # style v8: depth/air + real shadow pass from the lamp
for p in pups: p.settle(t0,60)   # springs start at rest in the opening pose
def update(t):
    c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l*0.80
    movs["lens"].rotation_euler=(0,0,lens_angle(t))
    beam.rotation_euler=(0,0,lens_angle(t)+1.0); beam_update(beam,c,amount=1.0)
    bpy.context.view_layer.update()
    for p in pups: p.pose(t)
    bpy.context.view_layer.update()
    if t<T(70)-0.80: mug.location=kee.hand(1)+Vector((0,0,-0.05)); mug.rotation_euler=(0,0,0)
    else: mug.location=SEAT_TOP+Vector((0,0,0.0)); mug.rotation_euler=(0,0,0.4)
hooks=[p.key for p in pups]+[PP.shadow_hook(pups,SH)]
swaps={}
for p in pups: swaps.update(p.swaps(t0,t1))
EV=[("ocean_waves",t0,0.10,7.3),("wind",t0,0.06,7.3),("laughter_small_group",t0,0.16,1.4),("impact",T(69)+0.45,0.15),
    ("glass_clink",T(70)-0.78,0.35),("door_creak_wood",T(70)-0.55,0.18,0.5),("swish",T(70)-0.42,0.35),("footsteps_wood",T(70)-0.2,0.35,0.5),
    ("impact",T(70)+0.0,0.12),("swish",T(71)+0.05,0.25),("swish",T(74)-0.05,0.3),("swish",T(77)+0.05,0.3),("whoosh",T(77)-0.1,0.25),
    ("swish",T(80)-0.05,0.3),("whoosh",T(80)-0.15,0.25),("swish",T(83),0.25),("whoosh",T(86)+0.0,0.4),("footsteps_wood",T(86)+0.1,0.25,0.4),
    ("gasp",T(88)-0.05,0.4),("bell_ding",T(88),0.3)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
