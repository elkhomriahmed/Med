"""Video 1 in STYLE FORMULA v11 (locked). Usage: blender-python build_v11.py SEG OUTDIR
SEG: H (hook) | A (night: clockwork, ship, pour, push, dialogue, fly-out) | A2 (morning polish) | B1 (cottage) |
     B2 (cottage, winter, seagulls) | T (harbour town laughs) | C (night: mercury, vapour, sealed room, ships safe)
Env: WORDS, PCT, SPP, NPROC, KEYS (still checks), FSTOP"""
import bpy, sys, os, math, json, random
PIPE="/home/user/Med/production/pipeline"; sys.path.insert(0,PIPE)
from toon import *
from engine import *
import engine as EN, puppet as PP
from sets import lamp_room as LR, exterior as EX, cottage as CT, town as TW
from mathutils import Vector
SEG,OUT=sys.argv[-2],sys.argv[-1]; E=os.environ.get
W=json.load(open(E("WORDS"))); T=lambda i: W[i][0]
DUR=W[-1][1]+0.45
BOUNDS={"H":(0.0,4.25),"A":(4.25,29.0),"A2":(28.6,34.65),"B1":(34.3,40.5),"B2":(40.15,44.3),"T":(43.95,46.45),"C":(46.2,DUR)}
t0,t1=BOUNDS[SEG]
AS=os.path.join(os.path.dirname(os.path.abspath(__file__)),"assets")
FONT="/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"; FONT_SANS="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=8,focus=2); cam.data.clip_end=1000
animated=[]; EV=[]; SH={}; hooks=[]; pups=[]
def child(o,parent):
    mw=o.matrix_world.copy(); o.parent=parent; o.matrix_world=mw; return o
def group(name,parts):
    root=bpy.data.objects.new("LIVE_"+name,None); sc.collection.objects.link(root); animated.append(root)
    for p in parts: live(p); child(p,root)
    return root
def yaw_to(src,dst): d=Vector(dst)-Vector(src); return math.atan2(d.x,-d.y)
def yaw_mix(src,a,b,w):
    ya=yaw_to(src,a); yb=yaw_to(src,b); d=(yb-ya+math.pi)%(2*math.pi)-math.pi; return ya+d*w
def beside_head(who,dx,dz,dy=0.0):
    def f(t):
        m=cam.matrix_world; r=Vector((m[0][0],m[1][0],m[2][0])); u=Vector((m[0][1],m[1][1],m[2][1])); b=Vector((m[0][2],m[1][2],m[2][2]))
        return who.head_pos()+r*dx+u*dz+b*dy
    return f
def text3d(name,txt,size,col,loc,rot,font=FONT,emit=0.2):
    cu=bpy.data.curves.new(name,'FONT'); cu.body=txt; cu.align_x='CENTER'; cu.align_y='CENTER'; cu.size=size; cu.extrude=0.003
    cu.font=bpy.data.fonts.load(font,check_existing=True); o=bpy.data.objects.new(name,cu); sc.collection.objects.link(o)
    cu.materials.append(mat(name+"_m",col,0.6,0.2,emit=emit)); o.rotation_euler=rot; o.location=loc; return o
sitting=dict(crouch=0.92,feetfwd=0.30)
belly={1:("body",(-0.05,0.22,-0.36)),-1:("body",(-0.05,0.22,-0.42))}
pocket={1:("body",(0.10,0.02,-0.42)),-1:("body",(0.10,0.02,-0.42))}
fold={1:("body",(-0.15,0.17,-0.34)),-1:("body",(-0.11,0.20,-0.29))}
thighs={1:("body",(0.02,0.30,-0.42)),-1:("body",(0.02,0.30,-0.42))}
fists_up={1:("wave",0.20,0.16,0.30,0.035,4.0),-1:("wave",0.20,0.16,0.30,0.035,4.4)}

# =================================================================== LAMP ROOM + OUTSIDE WORLD
LAMP=SEG in ("H","A","A2","C")
if LAMP:
    state="morning" if SEG=="A2" else "night"
    LR.build(state); LR.lights(state); EX.build(state); EX.build_sky(state,image_live,live)
    lx,ly=LR.LENS_C; LENSPT=Vector((lx,ly,1.45))
    # dressing used in every lamp-room shot: crate seat + mug, chalkboard joke, foreground stool/cans/bucket, sign
    box((-0.62,-0.80,0.21),(0.44,0.40,0.42),wood("seat_crate",(0.58,0.40,0.22),(0.36,0.23,0.12),axis="X",grain=7,bump=0.2),0.012,name="seatcrate")
    for p_ in (cyl((-0.50,-0.66,0.48),0.045,0.11,mat("mug_b",(0.86,0.83,0.76),0.5,0.3),verts=18),torus((-0.445,-0.66,0.49),0.028,0.009,mat("mug_b",(0.86,0.83,0.76),0.5,0.3),rot=(math.pi/2,0,0))): pass
    BX,BY,BR=1.55,-0.15,-0.45
    def bxy(dx,dy): return (BX+dx*math.cos(BR)-dy*math.sin(BR),BY+dx*math.sin(BR)+dy*math.cos(BR))
    box((*bxy(0,0),1.05),(0.62,0.04,0.46),mat("chalk",(0.10,0.14,0.12),0.9,0.05),0.01,rot=(0,0,BR),name="chalkboard")
    box((*bxy(0,0.02),1.05),(0.68,0.035,0.52),wood("chalk_frame",(0.55,0.36,0.18),(0.35,0.22,0.10),axis="X",grain=6),0.008,rot=(0,0,BR),name="chalkframe")
    for dx in (-0.22,0.22): cyl((*bxy(dx,0.05),0.42),0.018,0.84,wood("easel",(0.5,0.32,0.16),(0.32,0.2,0.1),axis="Z",grain=6),rot=(0.12,0,BR),name="easel")
    days="3" if SEG in("H","A") else ("412" if SEG=="A2" else "1,204")
    for txt,dz,sz in (("DAYS WITHOUT A",0.13,0.06),("SHIPWRECK:",0.04,0.07),(days,-0.11,0.16)):
        text3d("chalktext",txt,sz,(0.92,0.92,0.86),(*bxy(0,-0.025),1.05+dz),(math.pi/2,0,BR),emit=0.15)
    stool=wood("fg_stool",(0.5,0.32,0.16),(0.32,0.2,0.1),axis="X",grain=6)
    cyl((-0.95,-2.05,0.45),0.20,0.04,stool,verts=24,name="fg_stool_top")
    for k in range(3): cyl((-0.95+0.13*math.cos(k*2.1),-2.05+0.13*math.sin(k*2.1),0.22),0.02,0.44,stool,verts=8,name="fg_stool_leg")
    cyl((-0.98,-2.02,0.55),0.06,0.16,mat("fg_can",(0.55,0.12,0.08),0.4,0.4),verts=16,name="fg_can")
    cyl((-0.88,-2.10,0.53),0.05,0.12,mat("fg_can2",(0.20,0.42,0.25),0.4,0.4),verts=16,name="fg_can2")
    cyl((0.95,-2.10,0.16),0.16,0.32,mat("fg_bucket",(0.45,0.47,0.50),0.4,0.6),verts=20,r2=0.19,name="fg_bucket")
    box((-1.05,2.35,1.78),(0.95,0.04,0.42),wood("sign_board",(0.55,0.36,0.18),(0.35,0.22,0.10),axis="X",grain=6),0.01,rot=(0,0,-0.35),name="signboard")
    for txt,dz,sz in (("KEEPER OF THE YEAR",0.07,0.085),("1871 - 1901",-0.08,0.11)):
        text3d("signtext",txt,sz,(0.92,0.80,0.40),(-1.05-0.03*math.sin(0.35),2.35-0.03*math.cos(0.35),1.78+dz),(math.pi/2,0,-0.35),emit=0.3)
    if SEG=="A":   # open hatch: the engineer climbs up through it
        for o in [o for o in sc.objects if o.name.startswith(("hatch","latch","hinge"))]: bpy.data.objects.remove(o,do_unlink=True)
        box((LR.HATCH[0],LR.HATCH[1],0.004),(0.70,0.70,0.01),mat("hatch_hole",(0.02,0.02,0.03),0.9,0.0),0.0,name="hatchhole")
    # mercury pool + highlight (live: fills during the pour)
    pool=live(cyl((lx,ly,LR.POOL_Z-0.005),0.62,0.03,solid("merc",(0.80,0.83,0.88)),verts=48,bevel=0)); animated.append(pool)
    hl=live(cyl((lx-0.25,ly-0.28,LR.POOL_Z+0.012),0.12,0.004,solid("merc_hi",(0.97,0.98,1.0)),verts=24,bevel=0)); child(hl,pool); hl.scale=(1.8,0.6,1)
    if state=="night":
        beam=light_beam("beam",(lx,ly,LR.POOL_Z+0.74),r1=70.0,far=(9.0,3.5,-4.0),sky=(0.16,0.27,0.59)); animated.append(beam)
        animated.extend(bpy.data.objects[n] for n in beam["beam_subs"])
        ship1=EX.make_ship("ship1",solid,live,scale=3.2); animated.append(ship1)
        ship2=EX.make_ship("ship2",solid,live,scale=2.2); animated.append(ship2)
    if SEG=="A":
        hatch_lid=group("hatchlid",[box((0,-0.35,0.015),(0.72,0.72,0.03),wood("lid",(0.40,0.24,0.12),(0.25,0.14,0.07),axis="Y",grain=5),0.01)])
        hatch_lid.location=(LR.HATCH[0],LR.HATCH[1]+0.36,0.0)
        jug=group("jug",[cyl((0,0,0.08),0.085,0.17,solid("jug_b",(0.62,0.66,0.72)),verts=20,bevel=0),
                         torus((0.095,0,0.09),0.05,0.012,solid("jug_k",(0.30,0.32,0.36)),rot=(math.pi/2,0,0)),
                         cyl((-0.10,0,0.15),0.032,0.08,solid("jug_s",(0.62,0.66,0.72)),rot=(0,-1.0,0),r2=0.016,verts=12,bevel=0),
                         cyl((0,0,0.165),0.078,0.008,solid("merc",(0.80,0.83,0.88)),verts=20,bevel=0)])
        stream=live(cyl((0,0,-0.5),0.02,1.0,solid("merc",(0.80,0.83,0.88)),verts=10,bevel=0)); animated.append(stream)
        bpy.ops.object.select_all(action='DESELECT'); stream.select_set(True); bpy.context.view_layer.objects.active=stream
        bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    if SEG=="A2":
        rag=group("rag",[box((0,0,0),(0.16,0.10,0.05),solid("rag_m",(0.82,0.18,0.15)),0.0)])
        notes=[text3d(f"LIVE_note{i}","♪",0.22,(0.10,0.105,0.20),(0,0,0),(0,0,0),font=FONT_SANS,emit=0) for i in range(3)]
        for n in notes: face_camera(n,cam); animated.append(n)
    if SEG=="C":
        wisps=[]
        for i in range(12):
            pts=[(0.05*math.sin(k*1.3+i),0.05*math.cos(k*1.1+i),k*0.1) for k in range(9)]
            w=tube(pts,0.028,solid("vapor",(0.62,0.98,0.66))); live(w); animated.append(w); wisps.append(w)
    movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048)
    set_pivot(movs["lens"],(lx,ly,0)); animated.append(movs["lens"])
    for g_,c_ in (("gear1",LR.GEAR1),("gear2",LR.GEAR2)): set_pivot(movs[g_],c_); animated.append(movs[g_])
    sc["passes"]=1; sc["shadow_light"]=json.dumps({"pos":[lx,ly,LR.POOL_Z+0.74],"fov":125}); sc["air_dens"]=0.012
    GRADE="night" if state=="night" else "morning"

def lens_angle(t):
    if SEG=="H": return 2.0+1.6*t
    if SEG=="A2": return 0.9
    if SEG=="C": return 1.6*t
    tp=T(52)+0.05
    if t<tp: return 0.0
    u=t-tp; ramp=2.2; w=1.6
    return w*(u*u/(2*ramp)) if u<ramp else w*(ramp/2+(u-ramp))
def gear_angle(t):   # cranking: jerky, slow; stops on "stopped"
    a,b=T(24)-0.05,T(33)
    if t<a: return 0.0
    u=min(t,b)-a; return 1.8*u+0.25*math.sin(u*7)
def knob(t):
    a=-gear_angle(t); g=LR.GEAR1 if LAMP else (0,0,0)
    return Vector((g[0]+LR.KNOB_R*math.cos(a),g[1]-0.12,g[2]+LR.KNOB_R*math.sin(a)))
def ship_path(root,t,p0,p1,ta,tb,turn=None):
    u=ss((t-ta)/(tb-ta)); p=Vector(p0).lerp(Vector(p1),u); d=Vector(p1)-Vector(p0)
    yaw=math.atan2(d.y,d.x)
    if turn: k=ss((t-turn[0])/turn[1]); yaw+=turn[2]*k; p=p+Vector((math.cos(yaw),math.sin(yaw),0))*turn[3]*k
    root.location=(p.x,p.y,EX.SEA_Z+0.1); root.rotation_euler=(0.03*math.sin(t*1.7),0.03*math.sin(t*1.3),yaw); root.scale=(1,1,1)

# =================================================================== CHARACTERS + DIRECTION
CAMPT=(0.1,-2.6)
if SEG in ("H","A"):
    EP=(0.55,-0.50); KP=(-0.62,-0.85); KP2=(-0.22,-0.78); KW=(-0.95,-0.62); KC=(-1.28,-0.12)
    RIM=Vector((lx,ly,1.0))+(Vector((EP[0]-lx,EP[1]-ly,0)).normalized()*0.56)
    def rim_scratch(t):
        a=0.22*math.sin(2*math.pi*2.6*t); c=Vector((lx,ly,1.0)); d=(RIM-c); d.z=0
        return c+Vector((d.x*math.cos(a)-d.y*math.sin(a),d.x*math.sin(a)+d.y*math.cos(a),0))
    if SEG=="H":
        eng=PP.Puppet("engineer",(*EP,0),yaw_mix(EP,CAMPT,(lx,ly),0.5),cam=cam,light="soft")
        kee=PP.Puppet("keeper",(*KW,0),yaw_mix(KW,CAMPT,(lx,ly),0.5),cam=cam,light="soft")
        eng.look_target=lambda t: LENSPT; kee.look_target=lambda t: LENSPT
        eng.keys=[(0.0,dict(look=0.8,bend=0.25,arms={1:("world",RIM),-1:("body",(0.2,-0.05,-0.2))})),
                  (1.75,dict(look=0.4,bend=-0.1,nod=-0.08,arms={1:("body",(-0.03,0.27,0.32)),-1:("rest",)},snap=0.25)),   # blows on his finger
                  (3.0,dict(look=0.6,bend=-0.05,sbend=0.12,arms={1:("body",(0.14,-0.02,-0.32)),-1:("body",(0.14,-0.02,-0.32))},snap=0.3))]
        kee.keys=[(0.0,dict(look=0.9,bend=0.30,crouch=0.2,arms={1:("body",(0.24,0.12,0.18)),-1:("body",(0.24,0.12,0.18))}))]
        eng.face_seq=[(0,"smug"),(1.0,"evil"),(1.75,"proud"),(2.8,"smug"),(3.6,"happy")]
        kee.face_seq=[(0,"shock"),(1.2,"scream"),(2.2,"shock"),(3.3,"worried")]
        kee.fx_seq=[(0,"sweat")]; eng.fx_seq=[(0,"none")]
        CAM=[(0.0,(-0.10,-2.25,2.05),(0.25,-0.05,1.00),20),(1.55,(-0.20,-1.70,1.45),(0.35,-0.10,1.08),29),   # the engineer's finger on the floating lens
             (2.35,(-0.20,-1.05,1.80),(0.05,0.15,0.80),31),(t1,(-0.15,-0.85,1.72),(0.05,0.18,0.80),36)]         # down into the silver pool
        EV=[("whoosh",0.0,0.5),("glass_clink",0.2,0.45),("ocean_waves",0.0,0.10,4.3),("wind",0.0,0.06,4.3),("swish",1.7,0.3),("whoosh",2.3,0.35),("splash",2.5,0.18)]
        def direct(t):
            pool.scale=(1,1,1); pool.location=(lx,ly,LR.POOL_Z+0.01)
            ship_path(ship1,t,(-40,-60,0),(-39,-60,0),0,1); ship_path(ship2,t,(60,-50,0),(61,-50,0),0,1)   # out at sea
    else:
        # ----- A: 4.25 .. 29.0
        eng=PP.Puppet("engineer",(LR.HATCH[0],LR.HATCH[1],0),yaw_to(LR.HATCH,EP),cam=cam,light="soft")
        kee=PP.Puppet("keeper",(-0.35,-0.95,0),yaw_to((-0.35,-0.95),(lx,ly)),cam=cam,light="soft")
        KNOBPT=lambda t: knob(t)
        WINPT=Vector((22,-12,-15))
        def eng_shoulder(t): return eng.head_pos()+Vector((-0.20,-0.02,-0.36))
        lens_push={1:("world",Vector((-0.22,-0.18,1.30))),-1:("world",Vector((-0.05,-0.30,1.25)))}
        kee.look_target=lambda t: LENSPT
        kee.keys=[(0.0,dict(bend=0.45,lean=0.18,look=0.8,arms=lens_push,shake=0.25)),                                            # shoves the heavy lens, straining
                  (T(21)+0.1,dict(bend=0.55,lean=0.25,shake=0.4,snap=0.35)),
                  (T(24)-0.75,dict(bend=0.05,lean=0.0,shake=0.0,pos=KC,move=0.6,yaw=yaw_to(KC,(LR.GEAR1[0]-0.05,LR.GEAR1[1])),arms={1:("rest",),-1:("rest",)},snap=0.4)),  # walks to the clockwork
                  (T(24)-0.05,dict(bend=0.35,lean=0.10,look=0.0,arms={-1:("world",KNOBPT,"track"),1:("world",Vector((LR.GEAR1[0]+0.32,LR.GEAR1[1]-0.04,1.05)))},snap=0.32)),  # cranks
                  (T(33)+0.05,dict(bend=0.15,nod=0.18,arms={-1:("world",beside_head(kee,0.05,0.20,0.10)),1:("rest",)},snap=0.35)),  # lets go, wipes his brow
                  (T(35)-0.15,dict(bend=-0.05,nod=-0.05,look=0.9,arms={-1:("rest",),1:("rest",)},snap=0.35)),                       # looks out at the ship
                  (T(40)-0.10,dict(pos=KW,move=0.7,yaw=yaw_mix(KW,CAMPT,EP,0.6),look=0.9,arms=fold,snap=0.4)),                      # goes to watch the engineer, arms folded
                  (T(56)+0.02,dict(jump=(0.26,0.40),bend=-0.42,nod=-0.2,pos=(KW[0]-0.16,KW[1]-0.10),move=0.4,arms={1:("body",(0.24,0.05,0.38)),-1:("body",(0.24,0.05,0.38))},snap=0.12,damp=0.35)),
                  (T(57)+0.25,dict(crouch=0.25,bend=0.25,nod=0.1,arms={1:("body",(0.28,0.12,-0.05)),-1:("body",(0.28,0.12,-0.05))},snap=0.15)),
                  (T(58)+0.15,dict(crouch=0.25,bend=0.70,lean=0.08,tilt=0.25,nod=-0.1,arms={1:("body",(0.06,0.30,-0.62)),-1:("body",(0.06,0.30,-0.62))},snap=0.25)),
                  (T(62)+0.45,dict(crouch=0.0,bend=0.0,tilt=0.0,pos=KP,move=0.45,yaw=yaw_mix(KP,CAMPT,EP,0.55),arms={1:("rest",),-1:("rest",)},snap=0.35)),   # stumbles back to the crate
                  (T(66)-0.20,dict(**sitting,bend=-0.18,shake=0.8,tilt=0.10,arms=belly,snap=0.3)),                                   # drops onto it laughing
                  (T(69)+0.35,dict(**sitting,bend=0.42,shake=0.8,arms={-1:("body",(0.02,0.36,-0.50)),1:("body",(-0.05,0.22,-0.42))},snap=0.35)),   # slaps his knee
                  (T(70)-0.95,dict(**sitting,bend=0.20,shake=0.0,arms=thighs,snap=0.35)),
                  (T(70)-0.62,dict(**sitting,bend=0.50,lean=0.10,arms={-1:("body",(0.04,0.30,-0.50)),1:("body",(0.04,0.30,-0.50))},snap=0.3)),   # leans over his feet, hands on knees
                  (T(70)-0.40,dict(crouch=0.0,feetfwd=0.0,bend=0.05,lean=0.0,tilt=-0.08,arms={-1:("rest",),1:("rest",)},snap=0.32)),          # pushes up and stands
                  (T(70)-0.18,dict(pos=KP2,move=0.5,yaw=yaw_mix(KP2,CAMPT,EP,0.6),arms={-1:("world",eng_shoulder),1:("rest",)},snap=0.4)),   # "Son," pat on the shoulder
                  (T(71)+0.05,dict(bend=-0.12,tilt=0.08,arms={-1:("body",(-0.13,0.17,-0.06)),1:("rest",)},snap=0.4)),
                  (T(74)-0.05,dict(bend=0.0,tilt=-0.06,arms={-1:("world",LENSPT),1:("rest",)},snap=0.42)),
                  (T(75)+0.05,dict(arms={-1:("wave",0.14,0.26,-0.06,0.07,1.6),1:("rest",)},snap=0.42)),
                  (T(77)+0.05,dict(bend=-0.16,tilt=0.14,arms={-1:("world",beside_head(kee,-0.40,0.06,0.10)),1:("body",(0.14,-0.02,-0.32))},snap=0.42)),
                  (T(80)-0.05,dict(bend=0.25,tilt=-0.08,arms={-1:("wave",0.12,0.36,0.06,0.035,2.4),1:("body",(0.14,-0.02,-0.32))},snap=0.38)),
                  (T(83),dict(bend=-0.05,tilt=0.16,arms={-1:("body",(0.30,0.14,-0.08)),1:("body",(0.30,0.14,-0.08))},snap=0.42)),
                  (T(86)+0.05,dict(bend=-0.08,tilt=0.0,yaw=yaw_mix(KP2,CAMPT,(lx,ly),0.5),arms={-1:("rest",),1:("rest",)},snap=0.45)),
                  (T(88)-0.05,dict(bend=-0.30,nod=-0.12,arms={-1:("body",(0.20,0.12,0.12)),1:("body",(0.20,0.12,0.12))},snap=0.28))]
        # who the keeper looks at: the lens, the window (ship), the engineer
        def kee_look(t):
            if t<T(24)-0.75: return LENSPT
            if t<T(35)-0.15: return knob(t)
            if t<T(40)-0.10: return WINPT
            if t<T(86): return eng.head_pos()
            return LENSPT
        kee.look_target=kee_look
        kee.talk(W,T(70)-0.01,T(85)+0.31,every=2,amp=1.0); kee.gest_side=-1
        kee.face_seq=[(0,"angry"),(T(18),"worried"),(T(21),"furious"),(T(23),"worried"),(T(24),"angry"),(T(26),"furious"),(T(28),"worried"),
                      (T(33),"sleepy"),(T(35)-0.1,"shock"),(T(37),"scream"),(T(39),"worried"),(T(41),"skeptical"),(T(44),"smug"),(T(47),"skeptical"),
                      (T(50),"sleepy"),(T(52),"skeptical"),(T(56),"shock"),(T(58),"worried"),(T(60),"shock"),(T(62),"skeptical"),(T(66)-0.1,"laugh"),
                      (T(68),"happy"),(T(69),"laugh"),(T(70)-0.3,"smug"),(T(71),"proud"),(T(73),"smug"),(T(75),"happy"),
                      (T(77),"proud"),(T(79),"smug"),(T(80),"skeptical"),(T(82),"smug"),(T(83),"laugh"),(T(84),"smug"),(T(86),"neutral"),(T(87),"worried"),(T(88)-0.05,"shock")]
        kee.fx_seq=[(0,"sweat"),(T(33)+0.6,"none"),(T(56),"sweat"),(T(58)+0.6,"none"),(T(87)+0.05,"sweat")]
        # ENGINEER: rises through the hatch with a jug, pours, pokes, DJs, then humours the old man
        JUG_DOWN=Vector((EP[0]+0.25,EP[1]-0.05,0.0))
        eng.keys=[(0.0,dict(zoff=-2.2,arms={1:("body",(0.06,0.18,-0.30)),-1:("rest",)})),
                  (T(40)-0.55,dict(zoff=0.0,snap=0.45)),                                                                         # climbs up
                  (T(42)-0.05,dict(pos=EP,move=0.75,yaw=yaw_to(EP,(lx,ly)),snap=0.4)),                                           # walks to the basin
                  (T(43)-0.05,dict(bend=0.30,arms={1:("world",Vector((lx+0.42,ly-0.38,1.05))),-1:("body",(0.10,0.25,-0.15))},snap=0.35)),   # pours
                  (T(48)+0.15,dict(bend=0.45,arms={1:("world",JUG_DOWN+Vector((0,0,0.2))),-1:("rest",)},snap=0.35)),             # puts the jug down
                  (T(49)-0.08,dict(bend=-0.38,nod=-0.22,tilt=0.1,yaw=yaw_mix(EP,CAMPT,(lx,ly),0.6),arms={1:("body",(0.10,-0.38,-0.12)),-1:("body",(0.20,0.10,-0.10))},snap=0.22,damp=0.5)),  # wind-up
                  (T(52)-0.10,dict(bend=0.45,lean=0.12,nod=0.08,tilt=0.0,arms={1:("world",RIM),-1:("body",(0.22,-0.08,-0.15))},snap=0.08,damp=0.32)),   # POKE
                  (T(54)-0.05,dict(bend=-0.12,lean=0.0,nod=-0.1,tilt=0.18,arms={1:("body",(-0.03,0.27,0.32)),-1:("rest",)},snap=0.18)),  # blows on the finger
                  (T(57)-0.12,dict(bend=-0.28,nod=-0.14,tilt=-0.08,sbend=0.12,arms={1:("body",(0.14,-0.02,-0.32)),-1:("body",(0.14,-0.02,-0.32))},snap=0.2)),
                  (T(61)-0.12,dict(bend=0.30,sbend=0.0,lean=0.05,nod=0.0,arms={1:("world",rim_scratch),-1:("body",(0.13,0.0,0.36))},snap=0.18)),  # DJ scratch
                  (T(66)-0.05,dict(bend=0.0,lean=0.0,tilt=-0.06,sbend=0.08,yaw=yaw_mix(EP,CAMPT,KP,0.55),arms=pocket,snap=0.35)),
                  (T(69),dict(shake=0.35,tilt=0.06,snap=0.5)),
                  (T(70)-0.2,dict(shake=0.0,bend=-0.12,tilt=0.12,snap=0.35)),
                  (T(72)+0.1,dict(bend=0.0,turn=0.35,tilt=-0.05,snap=0.5)),
                  (T(75),dict(turn=0.0,nod=0.10,snap=0.45)),(T(76),dict(nod=-0.04,snap=0.45)),(T(77),dict(nod=0.10,snap=0.45)),(T(78),dict(nod=-0.02,snap=0.45)),
                  (T(80)+0.1,dict(nod=0.0,tilt=0.14,sbend=0.14,arms=fold,snap=0.4)),(T(85),dict(tilt=-0.10,snap=0.4)),
                  (T(86)+0.05,dict(tilt=0.08,sbend=0.0,bend=-0.08,yaw=yaw_mix(EP,CAMPT,(lx,ly),0.45),arms={1:("body",(0.30,0.24,0.02)),-1:("body",(0.30,0.24,0.02))},snap=0.35))]
        for k in range(8): eng.keys.append((T(61)+0.15+k*0.2,dict(nod=0.18 if k%2==0 else -0.04,snap=0.08)))
        eng.keys.sort(key=lambda k:k[0])
        def eng_look(t):
            if t<T(66)-0.05 or t>=T(86): return LENSPT
            return kee.head_pos()
        eng.look_target=eng_look
        eng.face_seq=[(0,"neutral"),(T(42),"smug"),(T(44),"happy"),(T(46),"smug"),(T(49)-0.1,"evil"),(T(52)-0.05,"happy"),(T(54)-0.05,"proud"),(T(57)-0.1,"smug"),
                      (T(61)-0.1,"happy"),(T(63),"laugh"),(T(65),"happy"),(T(66),"neutral"),(T(69),"laugh"),(T(70)-0.2,"shock"),(T(71),"skeptical"),(T(72)+0.1,"neutral"),
                      (T(74),"smug"),(T(75),"happy"),(T(77),"sleepy"),(T(79),"skeptical"),(T(80)+0.1,"smug"),(T(82),"skeptical"),(T(84),"evil"),(T(86),"smug"),(T(87),"happy"),(T(88),"proud")]
        eng.fx_seq=[(0,"none"),(T(70)-0.05,"anger"),(T(71)+0.4,"none"),(T(88),"blush")]
        for p in (eng,kee):
            for i_,(tk,kd) in enumerate(p.keys):
                if "look" not in kd: kd["look"]=0.85
        CAM=[(t0,(0.95,-2.30,1.90),(-0.15,-0.45,1.15),23),                                                   # the keeper shoving the lens
             (T(21),(0.75,-2.0,1.55),(-0.25,-0.55,1.25),26),
             (T(24)-0.5,(-1.05,-1.95,1.45),(-1.55,0.05,0.95),27),(T(27),(-1.25,-1.55,1.25),(-1.58,0.08,0.88),32),   # the clockwork: gears + the keeper cranking
             (T(33)-0.05,(-1.10,-1.45,1.35),(-1.35,-0.10,1.25),31),
             (T(34)+0.0,(1.45,-1.80,2.35),(21.0,-12.0,-21.0),40),(T(39)+0.1,(1.50,-1.75,2.40),(22.0,-9.0,-21.0),46),  # out of the window: the ship and the rocks
             (T(40)+0.1,(0.10,-2.25,1.55),(1.05,0.60,0.80),24),(T(42)+0.1,(0.30,-2.20,1.50),(0.70,0.10,1.00),26),   # the hatch: the engineer climbs up
             (T(43)+0.1,(-0.35,-1.75,1.35),(0.35,-0.15,0.95),29),(T(48),(-0.25,-1.55,1.28),(0.32,-0.08,0.88),33),     # the pour, from the front
             (T(49)-0.1,(-0.55,-1.85,1.35),(0.30,-0.10,1.15),27),(T(52)+0.08,(-0.25,-1.30,1.20),(0.35,-0.05,1.05),33), # the push, from the front
             (T(55),(-0.45,-1.65,1.40),(0.40,-0.20,1.30),30),
             (T(56),(-0.15,-2.35,1.40),(-0.80,-0.55,1.05),24),(T(60)+0.1,(-0.10,-2.30,1.42),(-0.75,-0.50,1.05),25),   # the keeper jumps back
             (T(61)+0.1,(1.00,-2.20,1.45),(0.45,-0.20,1.20),28),(T(65),(1.02,-2.12,1.45),(0.47,-0.18,1.22),31),      # DJ scratch
             (T(66)+0.05,(0.85,-2.45,2.10),(-0.05,-0.55,0.95),22),                                                    # high wide: he drops onto the crate laughing
             (T(69)+0.2,(0.05,-2.45,1.25),(-0.05,-0.65,1.20),24),
             (T(70)-0.1,(0.30,-2.45,1.45),(0.10,-0.62,1.30),25),(T(73),(0.25,-2.35,1.45),(0.05,-0.66,1.32),27),
             (T(77)-0.05,(0.20,-2.05,1.18),(-0.18,-0.78,1.80),29),(T(79)+0.2,(0.17,-1.95,1.20),(-0.18,-0.78,1.80),31),
             (T(80)-0.1,(-0.75,-2.30,1.45),(0.15,-0.62,1.35),25),(T(85),(-0.70,-2.20,1.45),(0.15,-0.62,1.36),27),
             (T(86)+0.05,(0.55,-2.25,1.50),(0.75,-0.25,1.25),23),(T(88)+0.45,(0.52,-2.15,1.50),(0.75,-0.25,1.27),25),
             (T(89)+0.1,(0.25,-2.62,2.35),(0.60,-9.0,1.20),22),                                                       # through the window...
             (T(90)+0.15,(0.70,-5.60,2.60),(0.0,0.0,1.40),22),                                                        # ...out over the gallery
             (T(93),(9.0,-24.0,-6.0),(0.0,0.0,-1.0),20),(t1+0.1,(13.0,-31.0,-9.0),(0.0,0.0,-1.5),20)]                # the tower, the beam sweeping the sea, a ship passing safely
        EV=[("ocean_waves",t0,0.10,t1-t0),("wind",t0,0.06,t1-t0),("impact",t0+0.1,0.15),("swish",T(21),0.25),("footsteps_wood",T(24)-0.7,0.3,0.6),
            ("clock_ticking",T(24),0.45,T(33)-T(24)),("door_creak_wood",T(24)+0.3,0.15,1.2),("whoosh",T(34),0.5),("seagulls",T(35),0.2,1.4),("whoosh",T(40),0.5),
            ("door_creak_wood",T(40)-0.6,0.3,0.8),("footsteps_wood",T(42),0.3,0.7),("splash",T(43)+0.35,0.3),("swish",T(49)-0.1,0.3),("glass_clink",T(52),0.5),
            ("whoosh",T(56),0.45),("boing",T(56)+0.05,0.3),("impact",T(57)+0.25,0.2),("whoosh",T(61),0.4),("whoosh",T(66),0.4),
            ("laughter_small_group",T(66),0.14,1.6),("impact",T(69)+0.45,0.15),("door_creak_wood",T(70)-0.55,0.18,0.5),("swish",T(70)-0.42,0.35),
            ("footsteps_wood",T(70)-0.2,0.35,0.5),("impact",T(70),0.12),("swish",T(71)+0.05,0.25),("swish",T(74)-0.05,0.3),("swish",T(77)+0.05,0.3),
            ("whoosh",T(77)-0.1,0.25),("swish",T(80)-0.05,0.3),("whoosh",T(80)-0.15,0.25),("swish",T(83),0.25),("whoosh",T(86),0.4),
            ("gasp",T(88)-0.05,0.4),("bell_ding",T(88),0.3),("whoosh",T(89),0.55),("wind",T(89),0.25,2.4),("ocean_waves",T(90),0.3,2.0)]
        def direct(t):
            gl=gear_angle(t); movs["gear1"].rotation_euler=(0,gl,0); movs["gear2"].rotation_euler=(0,-gl*1.6,0)
            o=ss((t-(T(40)-0.95))/0.4); hatch_lid.rotation_euler=(-1.9*o,0,0); hatch_lid.location=(LR.HATCH[0],LR.HATCH[1]+0.36,0.0); hatch_lid.scale=(1,1,1)
            # the ship that nearly hits the rocks, then the one that passes safely under the sweeping beam
            ship_path(ship1,t,(44,-26,0),(21,-12,0),T(30),T(37),turn=(T(36),0.9,1.2,6.0))
            ship_path(ship2,t,(-34,-13,0),(16,-9,0),T(89),t1+0.4)
            # the jug: in his hand, poured, put down
            bpy.context.view_layer.update()
            h=eng.hand(1)
            if t<T(48)+0.35:
                pour=window(t,T(43),T(48)+0.1,0.25)
                jug.location=h+Vector((-0.04,-0.05,-0.06)); jug.rotation_euler=(0,-1.45*pour,yaw_to(EP,(lx,ly))+math.pi/2); jug.scale=(1,1,1)
            else:
                jug.location=JUG_DOWN; jug.rotation_euler=(0,0,0.4); jug.scale=(1,1,1)
            bpy.context.view_layer.update()
            spout=jug.matrix_world@Vector((-0.13,0,0.17)); flow=window(t,T(43)+0.2,T(48),0.12)
            stream.location=spout; L_=max(0.01,spout.z-LR.POOL_Z); stream.scale=(1,1,L_*flow if flow>0.01 else 0.001); stream.rotation_euler=(0,0,0)
            fill=ss((t-(T(43)+0.3))/(T(48)-T(43)-0.3))
            pool.scale=(max(0.02,0.35+0.65*fill),max(0.02,0.35+0.65*fill),max(0.001,fill)); pool.location=(lx,ly,LR.POOL_Z-0.02+0.03*fill)
    pups=[eng,kee]
    beam_amount=lambda t: 1.0 if SEG=="H" else ss((t-T(56))/0.8)

if SEG=="A2":
    KB=(0.86,-0.56)
    kee=PP.Puppet("keeper",(*KB,0),yaw_mix(KB,CAMPT,(lx,ly),0.65),cam=cam,light="soft")
    def BATH(t):
        th=-0.95+0.32*math.sin(2*math.pi*1.1*min(t,T(109)+0.1)); return Vector((lx+0.66*math.cos(th),ly+0.66*math.sin(th),LR.POOL_Z+0.06))
    kee.look_target=lambda t: Vector((lx+0.5,ly-0.4,0.85))
    kee.keys=[(0.0,dict(bend=0.45,look=0.9,arms={-1:("world",BATH,"track"),1:("world",Vector((lx+0.40,ly-0.52,0.86)))})),
              (T(108)-0.2,dict(bend=0.30,tilt=0.12,snap=0.4)),
              (T(109)+0.05,dict(bend=0.20,nod=-0.08,tilt=0.0,look=0.0,snap=0.35)),            # stops; lifts his head
              (T(112),dict(bend=0.12,nod=-0.12,snap=0.6))]
    for k in range(6): kee.keys.append((T(108)+0.05+k*0.18,dict(tilt=0.16 if k%2==0 else 0.02,snap=0.12)))   # head bops to his tune
    kee.keys.sort(key=lambda k:k[0])
    kee.face_seq=[(t0,"happy"),(T(97),"proud"),(T(99),"happy"),(T(101),"proud"),(T(103),"happy"),(T(105),"proud"),(T(108),"happy"),
                  (T(109),"neutral"),(T(111),"worried"),(T(112),"neutral")]
    kee.fx_seq=[(0,"none"),(T(98),"blush"),(T(108)+0.3,"none")]
    CAM=[(t0,(-0.75,-2.30,1.85),(0.55,-0.25,1.05),23),(T(97),(-0.40,-2.0,1.45),(0.62,-0.30,0.95),27),       # bright morning, sea through the windows
         (T(100),(0.10,-1.75,1.20),(0.60,-0.20,0.85),32),(T(104),(0.15,-1.65,1.15),(0.55,-0.15,0.83),34),      # the rag on the silver bath
         (T(107),(0.05,-1.90,1.60),(0.86,-0.56,1.50),29),(T(109)-0.05,(0.08,-1.85,1.60),(0.86,-0.56,1.52),31), # humming
         (T(112)+0.2,(0.40,-1.55,1.62),(0.86,-0.56,1.58),38),(t1,(0.45,-1.45,1.62),(0.86,-0.56,1.60),42)]     # the humming stops
    EV=[("ocean_waves",t0,0.12,t1-t0),("seagulls",t0+0.3,0.12,2.5),("whoosh",T(100)-0.05,0.3),("swish",T(101),0.15),("swish",T(104),0.15),
        ("whoosh",T(107),0.3),("bell_ding",T(108),0.12),("gasp",T(112),0.35)]
    def direct(t):
        movs["gear1"].rotation_euler=(0,0.4,0); movs["gear2"].rotation_euler=(0,-0.64,0); pool.scale=(1,1,1)
        bpy.context.view_layer.update()
        rag.location=kee.hand(-1)+Vector((0,-0.02,-0.03)); rag.rotation_euler=(0,0,0.3*math.sin(t*7)); rag.scale=(1,1,1)
        head=kee.head_pos(); hum=window(t,T(108)-0.1,T(109)+0.05,0.12)
        for i,n in enumerate(notes):
            ph=(t-T(108)+i*0.25); drop=ss((t-T(109))/0.35)
            n.location=head+Vector((0.22*(i-1)+0.05*math.sin(ph*5),-0.1,0.25+0.35*(ph%1.0)-1.2*drop))
            s=max(0.001,(hum+0.0001)*(1 if ph>0 else 0)*(0.8+0.3*math.sin(ph*6))); n.scale=(s,s,s)
    pups=[kee]; beam_amount=None

if SEG=="C":
    KP=(-0.62,-0.85)
    kee=PP.Puppet("keeper",(*KP,0),yaw_mix(KP,CAMPT,(lx,ly),0.45),cam=cam,light="soft")
    kee.look_target=lambda t: LENSPT
    kee.keys=[(0.0,dict(**sitting,bend=0.25,nod=0.10,look=0.7,arms=thighs)),
              (T(160),dict(**sitting,bend=0.18,tilt=0.12,nod=-0.05,look=0.8,snap=0.6)),
              (T(176),dict(**sitting,bend=0.30,nod=0.25,tilt=-0.08,look=0.3,snap=0.8)),                 # nodding off
              (T(183),dict(**sitting,bend=0.38,nod=0.38,tilt=0.15,look=0.0,shake=0.0,snap=0.9)),        # asleep, breathing the vapour
              (T(199)-0.1,dict(**sitting,bend=0.70,nod=0.48,side=0.12,tilt=0.25,arms={1:("rest",),-1:("rest",)},snap=0.7))]   # slumps
    for k in range(5): kee.keys.append((T(183)+0.2+k*0.65,dict(squash=0.05 if k%2==0 else -0.02,snap=0.5)))  # slow breaths
    kee.keys.sort(key=lambda k:k[0])
    kee.face_seq=[(t0,"sleepy"),(T(160),"skeptical"),(T(163),"sleepy"),(T(168),"worried"),(T(172),"sleepy"),(T(176),"neutral"),(T(179),"sleepy")]
    kee.fx_seq=[(0,"none"),(T(168),"sweat"),(T(176),"none")]
    CAM=[(t0,(0.05,-1.75,0.80),(0.0,-0.30,0.45),28),(T(158),(0.05,-1.35,0.62),(0.0,-0.32,0.43),38),          # the MERCURY plaque
         (T(159)-0.05,(0.85,-1.85,1.35),(0.0,0.30,1.25),27),(T(167),(0.75,-1.65,1.30),(0.0,0.30,1.25),31),     # the lens spinning, the keeper watching
         (T(168)+0.1,(0.55,-1.40,1.00),(0.0,0.05,0.95),31),(T(175),(0.50,-1.30,1.05),(0.0,0.05,1.05),35),      # vapour rising
         (T(176)+0.2,(-1.45,-1.55,2.45),(0.60,0.60,0.45),19),(T(180)+0.1,(0.25,1.75,2.35),(1.30,1.15,0.0),30),   # the sealed room, the bolted hatch
         (T(183)+0.1,(0.20,-1.85,1.35),(-0.62,-0.85,1.25),31),(T(189)+0.2,(0.10,-1.70,1.32),(-0.62,-0.85,1.25),39), # breathing it
         (T(190)+0.05,(0.15,-2.62,2.35),(0.40,-9.0,1.20),22),(T(191)+0.1,(0.70,-5.60,2.60),(0.0,0.0,1.40),22),  # out of the window
         (T(192)+0.1,(10.0,-26.0,-7.0),(0.0,0.0,-1.0),20),(T(193)+0.35,(11.0,-27.0,-7.5),(0.0,0.0,-1.0),21),    # ships stay safe
         (T(194)+0.2,(2.10,-5.40,1.85),(-0.62,-0.85,1.15),28),(t1+0.1,(1.35,-4.20,1.80),(-0.62,-0.85,1.15),36)]  # the man inside didn't
    EV=[("ocean_waves",t0,0.10,t1-t0),("wind",t0,0.06,t1-t0),("glass_clink",T(158),0.3),("whoosh",T(159)-0.1,0.45),("whoosh",T(168),0.4),
        ("whoosh",T(176),0.45),("door_creak_wood",T(180),0.3),("whoosh",T(183),0.4),("whoosh",T(190),0.55),("ocean_waves",T(190),0.3,2.0),
        ("bell_ding",T(192),0.15),("whoosh",T(194),0.5),("impact",T(199)+0.1,0.3)]
    def direct(t):
        movs["gear1"].rotation_euler=(0,0.4,0); movs["gear2"].rotation_euler=(0,-0.64,0); pool.scale=(1,1,1)
        ship_path(ship2,t,(-34,-13,0),(16,-9,0),T(189),T(194)+0.5); ship_path(ship1,t,(60,40,0),(60,41,0),0,1)
        bpy.context.view_layer.update(); fc=kee.head_pos()+Vector((0,-0.15,-0.08))
        for i,w in enumerate(wisps):
            ph=((t-T(168))*0.45+i/len(wisps))%1.0; on=ss((t-T(168))/0.6)
            base=Vector((lx+0.4*math.cos(i*2.1),ly-0.35+0.25*math.sin(i*1.7),LR.POOL_Z))
            up=base+Vector((0.05*math.sin(t*2+i),0,0.15+0.9*ph)); drift=ss((t-T(183)+0.3)/0.8)
            p=up.lerp(fc+Vector((0.08*math.sin(i*2.3),-0.05,-0.15+0.1*math.cos(i))),drift*(0.4+0.5*ph))
            w.location=p; w.rotation_euler=(0.3*math.sin(t+i),0,t*0.8+i); s=max(0.001,on*math.sin(math.pi*ph)); w.scale=(s,s,s)
    pups=[kee]; beam_amount=lambda t: 1.0

# =================================================================== COTTAGE (B1 day, B2 winter)
if SEG in ("B1","B2"):
    os.environ.update(SUN="4",KEY="14000",FILL="12",FRONT="4",WORLD="0.45",WINL="260",VIEWEMIT="2.2",LAMP="0")
    CT.build(); CT.lights(); sc.world.node_tree.nodes["Background"].inputs[1].default_value=0.45
    view=[o for o in sc.objects if o.type=='MESH' and len(o.data.materials) and o.data.materials[0] and o.data.materials[0].name.startswith("view")][0]
    img=f"{AS}/view_day_boat.png" if SEG=="B1" else f"{AS}/view_winter.png"
    view.data.materials.clear(); view.data.materials.append(image_live("view_live",img)); live(view)
    if SEG=="B2":
        gm=lambda n,c: mat("gull_"+n,c,0.6,0.2)
        box((0.65,2.42,0.96),(1.4,0.22,0.06),wood("gull_ledge",(0.6,0.4,0.22),(0.38,0.24,0.12),axis="X",grain=6),0.01,name="MOV_gulls")
        for i,gx in enumerate((0.25,0.65,1.05)):
            gz=1.0; gy=2.42; s=0.95+0.1*i
            sph((gx,gy,gz+0.13*s),(0.11*s,0.16*s,0.11*s),gm("w",(0.96,0.96,0.95)),name="MOV_gulls")
            sph((gx,gy-0.06*s,gz+0.27*s),(0.075*s,0.075*s,0.075*s),gm("w",(0.96,0.96,0.95)),name="MOV_gulls")
            for sd in (-1,1): sph((gx+sd*0.1*s,gy+0.02,gz+0.15*s),(0.03*s,0.13*s,0.07*s),gm("g",(0.55,0.58,0.62)),name="MOV_gulls")
            cyl((gx,gy-0.15*s,gz+0.26*s),0.022*s,0.09*s,gm("o",(0.98,0.6,0.1)),rot=(math.pi/2,0,0),r2=0.004,verts=10,name="MOV_gulls")
            for sd in (-1,1):
                sph((gx+sd*0.032*s,gy-0.12*s,gz+0.29*s),(0.016*s,0.008,0.016*s),gm("k",(0.03,0.03,0.03)),name="MOV_gulls")
                box((gx+sd*0.033*s,gy-0.125*s,gz+0.31*s),(0.034*s,0.008,0.007),gm("k",(0.03,0.03,0.03)),0,rot=(0,sd*0.35,0),name="MOV_gulls")
                cyl((gx+sd*0.04,gy,gz+0.02),0.008,0.06,gm("o",(0.98,0.6,0.1)),verts=6,bevel=0,name="MOV_gulls")
            # a tiny spyglass on the middle gull
            if i==1: cyl((gx+0.05,gy-0.20,gz+0.29),0.018,0.12,gm("brass",(0.85,0.62,0.20)),rot=(math.pi/2,0,0),verts=10,name="MOV_gulls")
    movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048,mov_shell=("gulls",))
    KP=(0.55,1.35); WIN=(0.65,2.4)
    kee=PP.Puppet("keeper",(*KP,0),yaw_mix(KP,(0.4,-1.2),WIN,0.6),cam=cam,light="soft")
    sc["passes"]=1; sc["shadow_light"]=json.dumps({"pos":[0.65,4.6,3.6],"fov":80}); sc["air_dens"]=0.02; GRADE="interior"
    if SEG=="B1":
        can=group("can",[cyl((0,0,0.075),0.075,0.15,solid("can_b",(0.20,0.45,0.25)),verts=18,bevel=0),
                         cyl((-0.09,0,0.13),0.016,0.14,solid("can_s",(0.15,0.32,0.18)),rot=(0,-0.9,0),verts=8,bevel=0),
                         cyl((0,0,0.16),0.03,0.02,solid("can_c",(0.75,0.6,0.2)),verts=10,bevel=0),
                         torus((0.07,0,0.10),0.04,0.01,solid("can_h",(0.12,0.12,0.12)),rot=(math.pi/2,0,0))])
        drip=live(cyl((0,0,-0.5),0.012,1.0,solid("oil",(0.62,0.42,0.10)),verts=8,bevel=0)); animated.append(drip)
        bpy.ops.object.select_all(action='DESELECT'); drip.select_set(True); bpy.context.view_layer.objects.active=drip
        bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        puddle=live(cyl((0.5,1.05,0.012),0.30,0.006,solid("oilp",(0.42,0.27,0.06)),verts=32,bevel=0)); animated.append(puddle)
        qm=text_obj("qmark","?",FONT,0.30,(0.10,0.105,0.20)); face_camera(qm,cam); animated.append(qm)
        hold={1:("body",(0.02,0.28,-0.22)),-1:("body",(0.02,0.28,-0.22))}
        shakeh={1:("wave",0.02,0.30,-0.20,0.025,9.0),-1:("wave",0.02,0.30,-0.20,0.025,9.5)}
        kee.look_target=lambda t: Vector((0.65,2.4,1.5))
        kee.keys=[(0.0,dict(look=0.9,bend=0.12,tilt=0.05,arms={-1:("body",(0.10,0.22,-0.30)),1:("body",(0.14,-0.02,-0.32))})),
                  (T(115)-0.05,dict(look=0.9,bend=0.35,lean=0.05,tilt=-0.12,arms={-1:("world",beside_head(kee,-0.18,-0.26,0.12)),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),
                  (T(117)-0.05,dict(look=0.6,bend=0.05,tilt=0.22,arms={-1:("world",beside_head(kee,-0.34,0.12,0.06)),1:("body",(0.14,-0.02,-0.32))},snap=0.4)),
                  (T(120),dict(look=0.4,tilt=-0.18,sbend=0.12,arms={-1:("body",(0.30,0.14,-0.06)),1:("body",(0.30,0.14,-0.06))},snap=0.4)),
                  (T(122)-0.1,dict(look=0.0,tilt=0.0,sbend=0.0,bend=0.10,yaw=yaw_mix(KP,(0.4,-1.2),WIN,0.15),arms=hold,snap=0.45)),
                  (T(124),dict(shake=0.9,bend=0.18,arms=shakeh,snap=0.3)),
                  (T(129)-0.05,dict(shake=1.0,bend=-0.15,nod=-0.1,snap=0.3)),
                  (T(132),dict(shake=0.3,bend=-0.25,nod=-0.18,arms={1:("body",(0.22,0.22,-0.05)),-1:("body",(0.22,0.22,-0.05))},snap=0.3))]
        kee.face_seq=[(0,"skeptical"),(T(114),"sleepy"),(T(115),"skeptical"),(T(117),"worried"),(T(119),"skeptical"),(T(120),"worried"),(T(121),"neutral"),
                      (T(122),"worried"),(T(124),"shock"),(T(126),"worried"),(T(127),"shock"),(T(129),"scream"),(T(131),"shock"),(T(132),"scream")]
        kee.fx_seq=[(0,"none"),(T(117),"sweat"),(T(121)+0.3,"none"),(T(124),"sweat")]
        CAM=[(t0,(-1.2,-1.6,2.0),(0.55,1.45,1.15),22),
             (T(115)-0.1,(-0.1,-0.35,1.6),(0.60,1.45,1.55),27),(T(117),(0.05,-0.15,1.62),(0.60,1.45,1.55),30),
             (T(120),(1.25,0.30,1.65),(0.55,3.4,1.25),26),(T(121)+0.15,(1.20,0.35,1.62),(0.45,3.4,1.20),28),     # past him, out of the window to the supply boat
             (T(122)-0.05,(0.15,-0.30,1.45),(0.55,1.30,1.25),27),(T(128),(0.18,-0.15,1.42),(0.55,1.30,1.20),30),
             (T(129)+0.1,(0.10,0.10,1.10),(0.50,1.15,0.35),27),
             (T(132)-0.05,(0.15,-0.05,1.45),(0.55,1.35,1.55),29),(t1,(0.17,0.02,1.45),(0.55,1.35,1.55),31)]
        EV=[("seagulls",t0,0.2,2.0),("whoosh",T(115)-0.15,0.35),("boing",T(117),0.3),("whoosh",T(120)-0.1,0.35),("ocean_waves",T(120),0.25,1.6),
            ("whoosh",T(122)-0.15,0.4),("glass_clink",T(124),0.25),("splash",T(129)+0.1,0.45),("gasp",T(132),0.45)]
        def direct(t):
            bpy.context.view_layer.update()
            hm=(kee.hand(1)+kee.hand(-1))/2 if t>=T(122)-0.1 else kee.hand(1)
            tip=ss((t-(T(129)-0.2))/0.35)*(1-ss((t-(T(132)+0.1))/0.3))
            can.location=hm+Vector((0,-0.03,-0.08)); can.rotation_euler=(0,-1.4*tip,kee.A.rotation_euler.z); can.scale=(1,1,1)
            bpy.context.view_layer.update()
            sp=can.matrix_world@Vector((-0.16,0,0.19)); fl=window(t,T(129),T(132)+0.15,0.1)
            drip.location=sp; drip.scale=(1,1,max(0.001,(sp.z-0.012)*fl)); drip.rotation_euler=(0,0,0)
            pu=ss((t-T(129)-0.05)/(0.8)); puddle.location=(sp.x,sp.y,0.012) if t<T(129)+0.3 else puddle.location
            puddle.scale=(max(0.001,pu),max(0.001,pu*0.8),1)
            q=ss((t-T(117))/0.15)*(1-ss((t-(T(121)+0.3))/0.15)); sq=max(0.001,q)
            qm.location=kee.head_pos()+Vector((0.30,-0.05,0.30+0.03*math.sin(t*5))); qm.scale=(sq,sq,sq)
    else:
        gulls=movs["gulls"]; animated.append(gulls); gl0=gulls.location.copy()
        GULLS=Vector((0.65,2.42,1.25))
        kee.look_target=lambda t: GULLS
        kee.keys=[(0.0,dict(look=0.95,bend=0.10,arms=fists_up)),
                  (T(136)-0.05,dict(look=1.0,bend=0.30,lean=0.08,shake=0.6,arms=fists_up,snap=0.3)),                           # yelling
                  (T(140)-0.05,dict(look=1.0,bend=0.40,shake=0.0,tilt=-0.15,arms={-1:("world",GULLS+Vector((0,-0.3,0.05))),1:("body",(0.14,-0.02,-0.32))},snap=0.35)),  # points: "spying!"
                  (T(142),dict(bend=0.55,lean=0.12,tilt=0.15,snap=0.4))]                                                     # leans in, squinting
        kee.face_seq=[(t0,"angry"),(T(135),"furious"),(T(136),"scream"),(T(138),"furious"),(T(139),"scream"),(T(140),"skeptical"),(T(141),"evil"),(T(142),"skeptical"),(T(143),"angry")]
        kee.fx_seq=[(0,"anger")]
        kee.talk(W,T(136),T(139)+0.4,every=2,amp=0.6)
        CAM=[(t0,(-0.9,-1.2,1.9),(0.55,1.6,1.3),23),(T(136)-0.1,(0.05,-0.10,1.60),(0.58,1.45,1.55),28),            # winter: he yells at the window
             (T(139),(0.10,0.05,1.62),(0.58,1.45,1.58),31),
             (T(140)+0.05,(1.30,0.95,1.45),(0.65,2.42,1.20),30),(T(142)+0.2,(1.00,1.55,1.32),(0.65,2.42,1.22),38),    # the gulls, eyebrows down, one with a spyglass
             (t1,(0.95,1.65,1.30),(0.65,2.42,1.22),42)]
        EV=[("wind",t0,0.25,t1-t0),("seagulls",t0+0.2,0.45,t1-t0),("whoosh",T(136)-0.1,0.35),("thunder",T(134),0.15),("whoosh",T(140),0.4),("boing",T(142)+0.1,0.25)]
        def direct(t):
            spy=window(t,T(142),t1+1,0.25); gulls.location=gl0+Vector((0,-0.06*spy,0.012*math.sin(t*6)))
    pups=[kee]; beam_amount=None

# =================================================================== HARBOUR TOWN (T)
if SEG=="T":
    TW.build(); TW.lights(); EX.build_sky("day",image_live,live)
    movs=bake_scene(sc,[],spp=int(E("SPP","24")),set_atlas=2048)
    sc["passes"]=1; sc["shadow_light"]=json.dumps({"pos":[7,-9,12],"fov":70}); sc["air_dens"]=0.006; GRADE="interior"
    LH=Vector((40,-120,15))
    F=PP.Puppet("fisher",(-1.4,0.1,0),yaw_to((-1.4,0.1),(1.0,-3.0)),cam=cam,light="soft")
    L=PP.Puppet("lady",(1.55,0.55,0),yaw_to((1.55,0.55),(2.35,0.95)),cam=cam,light="soft")
    B=PP.Puppet("baker",(2.40,0.90,0),yaw_to((2.40,0.90),(1.55,0.55)),cam=cam,light="soft")
    K=PP.Puppet("kid",(-0.25,-0.55,0),yaw_to((-0.25,-0.55),(0.5,-3.0)),cam=cam,light="soft")
    F.look_target=lambda t: LH; L.look_target=B; B.look_target=L; K.look_target=F
    laugh=lambda **kw: dict(shake=0.9,bend=-0.25,**kw)
    F.keys=[(0.0,dict(look=0.6,arms={-1:("world",LH),1:("body",(-0.05,0.22,-0.38))})),(T(146),dict(**laugh(look=0.6),snap=0.3)),
            (T(149)-0.05,dict(shake=0.4,bend=0.0,look=0.0,arms={-1:("world",beside_head(F,-0.30,0.08,0.05)),1:("body",(-0.05,0.22,-0.38))},snap=0.35))]  # taps his head
    L.keys=[(0.0,dict(look=0.9,arms={-1:("world",beside_head(L,0.20,-0.18,0.10)),1:("body",(-0.05,0.22,-0.30))})),(T(147),dict(**laugh(look=0.9),snap=0.3))]
    B.keys=[(0.0,dict(look=0.9,bend=0.15,arms=belly)),(T(146)+0.1,dict(**laugh(look=0.9),arms=belly,snap=0.3))]
    K.keys=[(0.0,dict(look=0.5,arms=fists_up,shake=0.5)),(T(148),dict(jump=(0.15,0.30),snap=0.25)),(T(150),dict(jump=(0.15,0.30),snap=0.25))]   # mimics the keeper yelling
    F.face_seq=[(t0,"laugh"),(T(147),"happy"),(T(149),"smug"),(T(150),"laugh")]
    L.face_seq=[(t0,"evil"),(T(146),"laugh"),(T(148),"happy"),(T(150),"laugh")]
    B.face_seq=[(t0,"happy"),(T(146),"laugh"),(T(149),"skeptical"),(T(150),"laugh")]
    K.face_seq=[(t0,"scream"),(T(147),"furious"),(T(148),"scream"),(T(150),"laugh")]
    for p in (F,L,B,K): p.fx_seq=[(0,"none")]
    L.fx_seq=[(0,"blush")]
    CAM=[(t0,(1.5,-15.0,4.2),(0.6,1.0,1.4),24),(T(145)+0.35,(1.0,-3.1,1.75),(0.55,0.55,1.25),24),       # over the water, into the square
         (T(148),(0.95,-2.65,1.60),(0.55,0.55,1.25),26),(t1,(0.92,-2.45,1.58),(0.55,0.55,1.25),28)]
    EV=[("ocean_waves",t0,0.2,t1-t0),("seagulls",t0,0.3,t1-t0),("whoosh",t0+0.05,0.5),("laughter_small_group",T(145),0.6,t1-T(145)+0.2),("boing",T(148),0.2)]
    def direct(t): pass
    pups=[F,L,B,K]; beam_amount=None

# =================================================================== RUN
for p in pups: p.settle(t0,60)
OUTSIDE={"A":lambda t: t>=T(89)+0.05,"C":lambda t: t>=T(190)+0.05}
def update(t):
    c,g,l=camstate(CAM,t)
    if LAMP and not OUTSIDE.get(SEG,lambda t:False)(t):   # interior cameras never touch the walls/windows
        r=math.hypot(c.x,c.y)
        if r>2.55: c=Vector((c.x*2.55/r,c.y*2.55/r,c.z))
    cam.location=c; tgt.location=g; cam.data.lens=l*0.80
    if LAMP:
        movs["lens"].rotation_euler=(0,0,lens_angle(t))
        if beam_amount is not None:
            beam.rotation_euler=(0,0,lens_angle(t)+1.0); beam_update(beam,c,amount=beam_amount(t))
    bpy.context.view_layer.update()
    for p in pups: p.pose(t)
    direct(t)
hooks=[p.key for p in pups]+[PP.shadow_hook(pups,SH,floor_z=(0.0))]
swaps={}
for p in pups: swaps.update(p.swaps(t0,t1))
if SEG in("B2",): swaps["view_live"]=[(0,f"{AS}/view_winter.png")]
os.makedirs(OUT,exist_ok=True); json.dump(EV,open(OUT+"/sfx.json","w")); json.dump({"grade":GRADE},open(OUT+"/meta.json","w"))
if E("PROBE"):
    for f in [int(x) for x in E("PROBE").split(",")]:
        t=(f-1)/FPS; sc.frame_set(f); update(t); bpy.context.view_layer.update(); dg=bpy.context.evaluated_depsgraph_get()
        o=cam.matrix_world.translation
        for dd in ((0,0,-1),(0,0.4,-1),(0,-0.4,-1),(0.2,0,-1)):
            v=(cam.matrix_world.to_3x3()@Vector(dd)).normalized(); hit,loc,nor,idx,ob,m=sc.ray_cast(dg,o,v)
            print("PROBE",f,dd,ob.name if ob else None,tuple(round(x,2) for x in loc),round((loc-o).length,2))
    sys.exit(0)
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,update,animated,swaps,OUT,nproc=int(E("NPROC","3")),keys_only=keys,key_hooks=hooks,dof=float(E("FSTOP","1.8")))
json.dump(SH,open(OUT+"/shadows.json","w"))
print("SEGMENT DONE",SEG)
