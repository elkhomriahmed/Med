"""Style v8 second sample: the keeper's cottage by day.
VO: 'First he forgets the name of the supply boat, then his hands shake so hard he spills the lamp oil.'"""
import bpy, sys, os, math, json
PIPE="/home/user/Med/production/pipeline"; sys.path.insert(0,PIPE)
from toon import *
from engine import *
import engine as EN, puppet as PP
from sets import cottage as CT
from mathutils import Vector
OUT=sys.argv[-1]; E=os.environ.get
W=json.load(open(E("WORDS"))); T=lambda i: W[i][0]
t0,t1=34.6,40.55
AS="/home/user/Med/production/videos/01_lighthouse_mercury/assets"
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=8,focus=2)
animated=[]
def child(o,parent):
    mw=o.matrix_world.copy(); o.parent=parent; o.matrix_world=mw; return o
# ---------------- set: cottage, bright day, the supply boat outside the window
os.environ.update(SUN="4",KEY="14000",FILL="12",FRONT="4",WORLD="0.45",WINL="260",VIEWEMIT="2.2",LAMP="0")
CT.build(); CT.lights(); sc.world.node_tree.nodes["Background"].inputs[1].default_value=0.45
view=[o for o in sc.objects if o.type=='MESH' and len(o.data.materials) and o.data.materials[0] and o.data.materials[0].name.startswith("view")][0]
view.data.materials.clear(); view.data.materials.append(image_live("view_live",f"{AS}/view_day_boat.png")); live(view)
movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048)
# ---------------- props: oil can (in his hands), the oil stream, the puddle, a question mark
can_parts=[cyl((0,0,0.075),0.075,0.15,solid("can_b",(0.20,0.45,0.25)),verts=18,bevel=0),
           cyl((-0.09,0,0.13),0.016,0.14,solid("can_s",(0.15,0.32,0.18)),rot=(0,-0.9,0),verts=8,bevel=0),
           cyl((0,0,0.16),0.03,0.02,solid("can_c",(0.75,0.6,0.2)),verts=10,bevel=0),
           torus((0.07,0,0.10),0.04,0.01,solid("can_h",(0.12,0.12,0.12)),rot=(math.pi/2,0,0))]
can=bpy.data.objects.new("LIVE_can",None); sc.collection.objects.link(can); animated.append(can)
for p in can_parts: live(p); child(p,can)
drip=live(cyl((0,0,-0.5),0.012,1.0,solid("oil",(0.62,0.42,0.10)),verts=8,bevel=0)); animated.append(drip)
bpy.ops.object.select_all(action='DESELECT'); drip.select_set(True); bpy.context.view_layer.objects.active=drip
bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
puddle=live(cyl((0.5,1.05,0.012),0.30,0.006,solid("oilp",(0.42,0.27,0.06)),verts=32,bevel=0)); animated.append(puddle)
qm=text_obj("qmark","?","/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",0.30,(0.035,0.025,0.02)); face_camera(qm,cam); animated.append(qm)
# ---------------- the keeper (baked under the sunny window light)
def yaw_to(src,dst): d=Vector(dst)-Vector(src); return math.atan2(d.x,-d.y)
def yaw_mix(src,a,b,w):
    ya=yaw_to(src,a); yb=yaw_to(src,b); d=(yb-ya+math.pi)%(2*math.pi)-math.pi; return ya+d*w
KP=(0.55,1.35); WIN=(0.65,2.4); CAMPT=(0.4,-1.2)
kee=PP.Puppet("keeper",(*KP,0),yaw_mix(KP,CAMPT,WIN,0.6),cam=cam,tint=(0.90,0.88,0.84),light="day_window")
kee.look_target=lambda t: Vector((0.65,2.4,1.5))
def beside_head(dx,dz,dy=0.0):
    def f(t):
        m=cam.matrix_world; r=Vector((m[0][0],m[1][0],m[2][0])); u=Vector((m[0][1],m[1][1],m[2][1])); b=Vector((m[0][2],m[1][2],m[2][2]))
        return kee.head_pos()+r*dx+u*dz+b*dy
    return f
hold={1:("body",(0.02,0.28,-0.22)),-1:("body",(0.02,0.28,-0.22))}           # both hands on the can, in front of him
shake={1:("wave",0.02,0.30,-0.20,0.025,9.0),-1:("wave",0.02,0.30,-0.20,0.025,9.5)}
kee.keys=[(0.0,dict(look=0.7,bend=0.12,tilt=0.05,arms={-1:("body",(0.10,0.22,-0.30)),1:("body",(0.14,-0.02,-0.32))})),   # at the window, can by his side
          (T(115)-0.05,dict(look=0.8,bend=0.35,lean=0.05,tilt=-0.12,arms={-1:("world",beside_head(-0.18,-0.26,0.12)),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),  # squints at the boat, hand to chin
          (T(117)-0.05,dict(look=0.5,bend=0.05,tilt=0.22,arms={-1:("world",beside_head(-0.34,0.12,0.06)),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),  # scratches his head: what's it called?
          (T(120),dict(look=0.3,tilt=-0.18,sbend=0.12,arms={-1:("body",(0.30,0.14,-0.06)),1:("body",(0.30,0.14,-0.06))},snap=0.4)),  # shrugs
          (T(122)-0.1,dict(look=0.0,tilt=0.0,sbend=0.0,bend=0.10,yaw=yaw_mix(KP,CAMPT,WIN,0.15),arms=hold,snap=0.45)),   # turns round with the oil can
          (T(124),dict(shake=0.9,bend=0.18,arms=shake,snap=0.3)),                                                         # hands shake, whole body shivers
          (T(129)-0.05,dict(shake=1.0,bend=-0.15,nod=-0.1,snap=0.3)),                                                     # oil pours out
          (T(132),dict(shake=0.3,bend=-0.25,nod=-0.18,arms={1:("body",(0.22,0.22,-0.05)),-1:("body",(0.22,0.22,-0.05))},snap=0.3))]  # recoils, hands up
kee.face_seq=[(0,"skeptical"),(T(114),"sleepy"),(T(115),"skeptical"),(T(117),"worried"),(T(119),"skeptical"),(T(120),"worried"),(T(121),"neutral"),
              (T(122),"worried"),(T(124),"shock"),(T(126),"worried"),(T(127),"shock"),(T(129),"scream"),(T(131),"shock"),(T(132),"scream")]
CAM=[(t0,(-1.2,-1.6,2.0),(0.55,1.45,1.15),22),                          # wide: the cottage, the keeper at the window, the boat outside
     (T(115)-0.1,(-0.1,-0.35,1.6),(0.60,1.45,1.55),27),(T(117),(0.05,-0.15,1.62),(0.60,1.45,1.55),30),   # push in on his face
     (T(120),(0.15,0.25,1.7),(0.70,2.9,1.45),28),                         # past his shoulder to the supply boat outside
     (T(122)-0.05,(0.15,-0.30,1.45),(0.55,1.30,1.25),27),(T(128),(0.18,-0.15,1.42),(0.55,1.30,1.20),30),    # front: the shaking can
     (T(129)+0.1,(0.10,0.10,1.10),(0.50,1.15,0.35),27),                   # tilt down to the spill
     (T(132)-0.05,(0.15,-0.05,1.45),(0.55,1.35,1.55),29),(t1,(0.17,0.02,1.45),(0.55,1.35,1.55),31)]   # his face: scream
pups=[kee]; SH={}
sc["passes"]=1; sc["shadow_light"]=json.dumps({"pos":[0.65,4.6,3.6],"fov":80})   # the sun through the window
kee.settle(t0,60)
def update(t):
    c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l*0.80
    bpy.context.view_layer.update()
    kee.pose(t); bpy.context.view_layer.update()
    # can sits between his hands; tips over on "spills"
    hm=(kee.hand(1)+kee.hand(-1))/2; held=t>=T(122)-0.1
    if not held: hm=kee.hand(1)
    tip=ss((t-(T(129)-0.2))/0.35)*(1-ss((t-(T(132)+0.1))/0.3))
    can.location=hm+Vector((0,-0.03,-0.08)); can.rotation_euler=(0,-1.4*tip,yaw_to((0,0),(0,0))+kee.A.rotation_euler.z)
    bpy.context.view_layer.update()
    sp=can.matrix_world@Vector((-0.16,0,0.19)); fl=window(t,T(129),T(132)+0.15,0.1)
    drip.location=sp; drip.scale=(1,1,max(0.001,(sp.z-0.012)*fl)); drip.rotation_euler=(0,0,0)
    pu=ss((t-T(129)-0.1)/(T(132)-T(129)+0.4)); puddle.location=(sp.x,sp.y,0.012) if t<T(132) else puddle.location
    puddle.scale=(max(0.001,pu),max(0.001,pu*0.8),1)
    q=ss((t-T(117))/0.15)*(1-ss((t-(T(121)+0.3))/0.15)); sq=max(0.001,q)
    qm.location=kee.head_pos()+Vector((0.30,-0.05,0.30+0.03*math.sin(t*5))); qm.scale=(sq,sq,sq)
hooks=[kee.key,PP.shadow_hook(pups,SH)]
swaps=dict(kee.swaps(t0,t1))
EV=[("seagulls",t0,0.25,2.0),("whoosh",T(115)-0.15,0.35),("boing",T(117),0.3),("whoosh",T(120)-0.1,0.35),("ocean_waves",T(120),0.25,1.6),
    ("whoosh",T(122)-0.15,0.4),("glass_clink",T(124),0.25),("splash",T(129)+0.1,0.45),("gasp",T(132),0.45)]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w"))
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","2.2")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("TEST DONE")
