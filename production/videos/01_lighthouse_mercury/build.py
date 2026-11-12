"""Video 1 - Why Lighthouse Keepers Went Mad.  Usage: blender-python build.py SEG OUTDIR   (SEG = A1 | A2 | B | C)
Env: WORDS=<words.json>  PCT (render %)  SPP  KEYS=frame,frame (still checks only)"""
import bpy, sys, os, math, json, random
PIPE="/home/user/Med/production/pipeline"; sys.path.insert(0,PIPE)
from toon import *
from engine import *
import engine as EN
import characters as ch
from sets import lamp_room as LR, cottage as CT
HERE_V=os.path.dirname(os.path.abspath(__file__)); AS=HERE_V+"/assets"
SEG,OUT=sys.argv[-2],sys.argv[-1]; E=os.environ.get
W=json.load(open(E("WORDS"))); T=lambda i: W[i][0]
DUR=W[-1][1]+0.45
BOUNDS={"A1":(0.0,29.0),"A2":(29.0,34.65),"B":(34.65,46.4),"C":(46.4,DUR)}
t0,t1=BOUNDS[SEG]
sc=reset(pct=int(E("PCT","100"))); sc.render.fps=FPS
cam,tgt=camera(sc,(0,-2,1.3),(0,0,1.2),lens=30,fstop=8,focus=2)
INK=(0.035,0.025,0.02)
animated=[]; swaps={}; rigs=[]; extra=[]
FONT_BLACK="/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"; FONT_SANS="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def empty(name,loc=(0,0,0)):
    o=bpy.data.objects.new("LIVE_"+name,None); sc.collection.objects.link(o); o.location=loc; animated.append(o); return o
def child(o,parent):
    mw=o.matrix_world.copy(); o.parent=parent; o.matrix_world=mw; return o
def mk(fn,*a,**k):
    o=fn(*a,**k); return live(o)

# ------------------------------------------------------------------ LAMP ROOM
if SEG in("A1","A2","C"):
    state="morning" if SEG=="A2" else "night"
    LR.build(state); LR.lights(state)
    lx,ly=LR.LENS_C
    # sky panorama around the room (inward-facing cylinder)
    bpy.ops.mesh.primitive_cylinder_add(radius=4.6,depth=8,location=(0,0,1.78),vertices=96)
    sky=bpy.context.object; sky.name="sky"
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
    sky.data.materials.append(image_live("sky_m",f"{AS}/pano_{state}.png")); live(sky)
    me=sky.data; uvl=me.uv_layers.active or me.uv_layers.new(); zmin=min(v.co.z for v in me.vertices); zmax=max(v.co.z for v in me.vertices)
    for poly in me.polygons:
        us=[]
        for li in poly.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co; us.append((math.atan2(co.y,co.x)/(2*math.pi))%1.0)
        if max(us)-min(us)>0.5: us=[u+1.0 if u<0.5 else u for u in us]
        for li,u in zip(poly.loop_indices,us):
            co=me.vertices[me.loops[li].vertex_index].co; uvl.data[li].uv=(u,(co.z-zmin)/(zmax-zmin))
    for p in sky.data.polygons: p.use_smooth=True
    # ship (night only)
    def make_ship(nm):
        root=empty(nm)
        parts=[mk(box,(0,0,0),(0.9,0.28,0.18),solid(nm+"h",(0.55,0.16,0.12)),0),
               mk(box,(-0.1,0,0.17),(0.35,0.2,0.16),solid(nm+"c",(0.93,0.9,0.82)),0),
               mk(cyl,(0.18,0,0.4),0.012,0.6,solid(nm+"m",(0.25,0.18,0.12)),verts=6,bevel=0),
               mk(cyl,(-0.05,-0.11,0.2),0.03,0.01,solid(nm+"l",(1.0,0.85,0.4)),rot=(math.pi/2,0,0),verts=10,bevel=0)]
        me=bpy.data.meshes.new(nm+"sail"); me.from_pydata([(0.2,0,0.15),(0.2,0,0.68),(0.5,0,0.18)],[],[[0,1,2]]); sail=bpy.data.objects.new(nm+"sail",me); sc.collection.objects.link(sail)
        sail.data.materials.append(solid(nm+"s",(0.96,0.95,0.9))); live(sail); parts.append(sail)
        for p in parts: child(p,root)
        return root
    if state=="night":
        ship=make_ship("ship")
        # light beams: two long flat wedges outside the windows, turning with the lens
        beam=empty("beam",(lx,ly,LR.POOL_Z+0.74))
        for a in (0,math.pi):
            me=bpy.data.meshes.new("beam"); r0,r1=3.05,8.5; ca,sa=math.cos(a),math.sin(a); px,py=-sa,ca
            def vx(r,w,h): return (r*ca+w*px,r*sa+w*py,h)
            v=[vx(r0,0.2,0.12),vx(r0,-0.2,0.12),vx(r0,-0.2,-0.12),vx(r0,0.2,-0.12),vx(r1,1.6,0.6),vx(r1,-1.6,0.6),vx(r1,-1.6,-0.9),vx(r1,1.6,-0.9)]
            f=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]; f+= [list(reversed(q)) for q in f]
            me.from_pydata(v,[],f); bo=bpy.data.objects.new("beamq",me); sc.collection.objects.link(bo); bo.location=beam.location
            bo.data.materials.append(solid("beam_m",(1.0,0.93,0.66))); live(bo); child(bo,beam)
    # mercury pool (fills during the pour in A1; full afterwards)
    pool=mk(cyl,(lx,ly,LR.POOL_Z-0.005),0.62,0.03,solid("merc",(0.80,0.83,0.88)),verts=48,bevel=0); animated.append(pool)
    hl=mk(cyl,(lx-0.25,ly-0.28,LR.POOL_Z+0.012),0.12,0.004,solid("merc_hi",(0.97,0.98,1.0)),verts=24,bevel=0); child(hl,pool)
    hl.scale=(1.8,0.6,1)

# ------------------------------------------------------------------ COTTAGE
if SEG=="B":
    os.environ.update(SUN="4",KEY="14000",FILL="12",FRONT="4",WORLD="0.45",WINL="260",VIEWEMIT="2.2",LAMP="0")
    CT.build(); CT.lights()
    sc.world.node_tree.nodes["Background"].inputs[1].default_value=0.45
    view=[o for o in sc.objects if o.type=='MESH' and len(o.data.materials) and o.data.materials[0] and o.data.materials[0].name.startswith("view")][0]
    view.data.materials.clear(); view.data.materials.append(image_live("view_live",f"{AS}/view_day_boat.png")); live(view)
    swaps["view_live"]=[(0,f"{AS}/view_day_boat.png"),(T(133)-0.2,f"{AS}/view_winter.png")]
    # three seagulls on an outside ledge (baked with outlines, appear in winter)
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
            box((gx+sd*0.033*s,gy-0.125*s,gz+0.31*s),(0.034*s,0.008,0.007),gm("k",(0.03,0.03,0.03)),0,rot=(0,sd*0.35,0),name="MOV_gulls")   # suspicious brows
            cyl((gx+sd*0.04,gy,gz+0.02),0.008,0.06,gm("o",(0.98,0.6,0.1)),verts=6,bevel=0,name="MOV_gulls")

# ------------------------------------------------------------------ CHARACTERS
POS={"A1":{"keeper":((-1.33,-0.18,0),20),"engineer":((0.98,-0.48,0),-22)},
     "A2":{"keeper":((0.88,-0.48,0),-30)},
     "B": {"keeper":((0.55,1.45,0),0)},
     "C": {"keeper":((0.92,-0.42,0),-28)}}[SEG]
K=EN.keeper(POS["keeper"][0],math.radians(POS["keeper"][1])); NG=None
if "engineer" in POS: NG=EN.engineer(POS["engineer"][0],math.radians(POS["engineer"][1]))
rk=Rig("keeper",K); rigs.append(rk)
re_=None
if NG: re_=Rig("engineer",NG); rigs.append(re_)

# ------------------------------------------------------------------ props that need the rigs
def prop_group(name,parts):
    root=empty(name)
    for p in parts: child(live(p),root)
    return root
if SEG=="A1":
    jug=prop_group("jug",[cyl((0,0,0.06),0.075,0.15,solid("jug_b",(0.62,0.66,0.72)),verts=20,bevel=0),
                          torus((0.085,0,0.07),0.045,0.012,solid("jug_k",(0.30,0.32,0.36)),rot=(math.pi/2,0,0)),
                          cyl((-0.09,0,0.12),0.03,0.07,solid("jug_s",(0.62,0.66,0.72)),rot=(0,-1.0,0),r2=0.015,verts=12,bevel=0),
                          cyl((0,0,0.135),0.068,0.008,solid("merc",(0.80,0.83,0.88)),verts=20,bevel=0)])
    stream=mk(cyl,(0,0,-0.5),0.018,1.0,solid("merc",(0.80,0.83,0.88)),verts=10,bevel=0); animated.append(stream)
    bpy.ops.object.select_all(action='DESELECT'); stream.select_set(True); bpy.context.view_layer.objects.active=stream
    bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
if SEG=="A2":
    rag=prop_group("rag",[box((0,0,0),(0.16,0.1,0.05),solid("rag_m",(0.82,0.18,0.15)),0.0)])
    notes=[text_obj(f"note{i}","♪",FONT_SANS,0.24,INK) for i in range(3)]
    for n in notes: face_camera(n,cam); animated.append(n)
if SEG=="B":
    can=prop_group("oilcan",[cyl((0,0,0.06),0.07,0.13,solid("can_b",(0.20,0.45,0.25)),verts=18,bevel=0),
                             cyl((-0.08,0,0.12),0.016,0.13,solid("can_s",(0.15,0.32,0.18)),rot=(0,-0.9,0),verts=8,bevel=0),
                             cyl((0,0,0.135),0.03,0.02,solid("can_c",(0.75,0.6,0.2)),verts=10,bevel=0)])
    drip=mk(cyl,(0,0,-0.5),0.01,1.0,solid("oil",(0.62,0.42,0.10)),verts=8,bevel=0); animated.append(drip)
    bpy.ops.object.select_all(action='DESELECT'); drip.select_set(True); bpy.context.view_layer.objects.active=drip
    bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    puddle=mk(cyl,(0.42,1.12,0.012),0.28,0.006,solid("oilp",(0.42,0.27,0.06)),verts=32,bevel=0); animated.append(puddle)
    qm=text_obj("qmark","?",FONT_BLACK,0.32,INK); face_camera(qm,cam); animated.append(qm)
if SEG=="C":
    wisps=[]
    for i in range(7):
        random.seed(20+i)
        pts=[(0.04*math.sin(k*1.3+i),0.04*math.cos(k*1.1+i),k*0.09) for k in range(8)]
        w=tube(pts,0.014,solid("vapor",(0.62,0.98,0.66))); live(w); animated.append(w); wisps.append(w)

# ------------------------------------------------------------------ BAKE
movs=bake_scene(sc,rigs,spp=int(E("SPP","24")),set_atlas=2048,mov_shell=("gulls",))
if "lens" in movs: set_pivot(movs["lens"],(LR.LENS_C[0],LR.LENS_C[1],0)); animated.append(movs["lens"])
for g,c in (("gear1",LR.GEAR1),("gear2",LR.GEAR2)):
    if g in movs: set_pivot(movs[g],c); animated.append(movs[g])
if "gulls" in movs: animated.append(movs["gulls"]); gulls=movs["gulls"]; gl0=gulls.location.copy()
for r in rigs:
    swaps[r.C.name+"_facemat"]=[(s,os.path.join(ch.FACEDIR,f"{r.C.name}_{e}.png")) for s,e in r.face_seq]

# ------------------------------------------------------------------ DIRECTION
EV=[]   # sound events: (name, time, gain)
def lens_angle(t):
    if SEG=="A2": return 0.9
    if SEG=="C": return 1.6*t
    tp=T(52)+0.05
    if t<tp: return 0.0
    u=t-tp; ramp=2.2; w=1.6
    return w*(u*u/(2*ramp)) if u<ramp else w*(ramp/2+(u-ramp))
def gear_angle(t):
    a,b=T(24)-0.1,T(33)
    if t<a: return 0.15*t
    if t<b:   # barely turning: slow, jerky
        u=t-a; return 0.15*a+0.35*u+0.06*math.sin(u*9)
    return 0.15*a+0.35*(b-a)+0.06*math.sin((b-a)*9)
def knob(t):
    a=-gear_angle(t); g=LR.GEAR1
    return Vector((g[0]+LR.KNOB_R*math.cos(a),g[1]-0.12,g[2]+LR.KNOB_R*math.sin(a)))

if SEG=="A1":
    POOL=(lx,ly,LR.POOL_Z)
    rim=Vector((lx+0.5,ly-0.32,1.45))
    CAM=[(0.00,(1.55,-1.7,2.55),(0.3,-0.1,1.3),16),
         (0.45,(1.85,-1.55,1.45),(0.8,-0.38,1.2),30),
         (T(6),(1.75,-1.7,1.5),(0.5,-0.2,1.3),26),
         (T(9),(1.6,-1.65,1.35),(0.35,-0.05,0.95),28),
         (T(11),(1.45,-1.45,1.35),(0.85,-0.45,1.05),36),
         (T(13)-0.05,(1.4,-1.45,1.3),(0.8,-0.45,1.05),35),
         (T(13)+0.3,(0.75,-1.75,0.85),(0.0,0.3,1.5),24),
         (T(21),(0.7,-1.7,0.85),(0.0,0.3,1.55),26),
         (T(21)+0.12,(0.68,-1.6,0.85),(0.0,0.3,1.6),30),
         (T(24)-0.25,(0.6,-1.6,0.9),(0.0,0.3,1.55),29),
         (T(24)+0.1,(-0.6,-1.25,1.3),(-1.55,0.12,0.95),30),
         (T(33)-0.05,(-0.68,-1.12,1.25),(-1.6,0.14,0.92),33),
         (T(33)+0.1,(-0.75,-1.0,1.22),(-1.62,0.14,0.92),38),
         (T(34)-0.15,(-0.75,-0.98,1.22),(-1.6,0.15,0.95),37),
         (T(34)+0.25,(-0.45,0.55,1.75),(-1.55,3.6,1.55),30),
         (T(40)-0.25,(-0.42,0.6,1.75),(-1.3,3.6,1.5),31),
         (T(40)+0.1,(1.55,-1.4,1.4),(0.65,-0.25,1.1),30),
         (T(43)+0.1,(1.45,-1.35,1.35),(0.35,0.0,0.85),31),
         (T(48),(1.3,-1.25,1.3),(0.25,0.05,0.82),33),
         (T(49)-0.05,(1.95,-1.7,1.5),(0.6,-0.15,1.25),31),
         (T(52)+0.05,(1.85,-1.6,1.5),(0.6,-0.15,1.3),36),
         (T(56)-0.1,(1.8,-1.65,1.5),(0.55,-0.1,1.3),34),
         (T(56)+0.25,(1.2,-1.95,1.2),(0.0,0.3,1.45),24),
         (T(65),(0.55,-2.0,1.25),(0.0,0.3,1.45),25),
         (T(66)-0.1,(0.5,-2.0,1.25),(0.0,0.3,1.45),25),
         (T(66)+0.2,(-0.55,-1.4,1.35),(-1.35,-0.15,1.15),30),
         (T(69)+0.1,(-0.58,-1.35,1.35),(-1.35,-0.15,1.2),34),
         (T(78),(-0.6,-1.32,1.4),(-1.35,-0.15,1.25),33),
         (T(78)+0.12,(-0.62,-1.28,1.4),(-1.35,-0.15,1.3),37),
         (T(81),(-0.6,-1.35,1.38),(-1.35,-0.15,1.2),32),
         (T(86)-0.15,(-0.58,-1.38,1.36),(-1.35,-0.15,1.2),31),
         (T(86)+0.15,(1.35,-1.8,1.3),(0.3,0.05,1.4),26),
         (T(88)+0.1,(1.3,-1.75,1.3),(0.3,0.05,1.4),30),
         (T(89)-0.2,(1.25,-1.7,1.3),(0.3,0.05,1.4),30),
         (T(89)+0.25,(0.65,0.95,1.75),(2.1,4.1,1.45),28),
         (29.1,(0.7,1.05,1.75),(2.3,4.1,1.4),30)]
    def update(t):
        c,g,l=camstate(CAM,t)
        if T(33)<=t<T(33)+0.5: c=c+Vector((0.012*math.sin(t*90),0,0.01*math.sin(t*77)))*(1-(t-T(33))/0.5)
        cam.location=c; tgt.location=g; cam.data.lens=l
        movs["lens"].rotation_euler=(0,0,lens_angle(t))
        movs["gear1"].rotation_euler=(0,gear_angle(t),0); movs["gear2"].rotation_euler=(0,-gear_angle(t)*1.6,0)
        beam=bpy.data.objects["LIVE_beam"]; beam.rotation_euler=(0,0,lens_angle(t)); bs=ss((t-T(56))/0.8)
        beam.scale=(max(bs,0.001),max(bs,0.001),1)
        sh=bpy.data.objects["LIVE_ship"]; u=ss((t-(T(34)-0.3))/2.6); sh.location=(-3.3+2.4*u,3.85,1.05); sh.rotation_euler=(0,0.03*math.sin(t*2.1),0); sh.scale=(1,1,1)
        for r in rigs: r.pose(t)
        bpy.context.view_layer.update()
        # jug in the engineer's hand; pour into the basin
        jh=re_.hand(JUG_ARM); pour=window(t,T(43),T(48)+0.1,0.25)
        jug=bpy.data.objects["LIVE_jug"]; jug.location=jh+Vector((-0.04,-0.05,-0.02)); jug.rotation_euler=(0,-1.45*pour,0.4); jug.scale=(1,1,1)
        bpy.context.view_layer.update()
        spout=jug.matrix_world@Vector((-0.12,0,0.15))
        flow=window(t,T(43)+0.2,T(48),0.12)
        stream.location=spout; L_=max(0.01,spout.z-LR.POOL_Z); stream.scale=(1,1,L_*flow if flow>0.01 else 0.001); stream.rotation_euler=(0,0,0)
        fill=ss((t-(T(43)+0.3))/(T(48)-T(43)-0.3))
        pool.scale=(max(0.02,0.35+0.65*fill),max(0.02,0.35+0.65*fill),max(0.001,fill)); pool.location=(lx,ly,LR.POOL_Z-0.02+0.015*fill)
    # characters
    PUSH_ARM=re_.arm_near(rim); JUG_ARM=1-PUSH_ARM
    KN_ARM=rk.arm_near(knob(0)); KO=1-KN_ARM
    re_.face_seq=[(0,"smug"),(T(9),"happy"),(T(13),"neutral"),(T(40),"smug"),(T(43),"happy"),(T(49),"evil"),(T(52),"smug"),(T(57),"happy"),(T(62),"laugh"),(T(66),"neutral"),(T(70),"skeptical"),(T(86)-0.1,"proud"),(T(88),"happy")]
    rk.face_seq=[(0,"neutral"),(T(24)-0.1,"worried"),(T(27),"angry"),(T(33),"shock"),(T(35),"worried"),(T(66)-0.1,"smug"),(T(69)-0.05,"laugh")]+talk(T(70),T(85)+0.3,"smug")+[(T(86),"shock"),(T(89),"worried")]
    re_.arm_seq={JUG_ARM:[(0,("aim",lambda t:re_.A.location+Vector((-0.18,-0.32,1.0))))],
                 PUSH_ARM:[(0,("euler",-0.15,0.45)),(T(49),("aim",rim)),(T(52)+0.35,("euler",-0.1,0.5)),(T(86),("euler",0.1,1.1))]}
    re_.body_fn=lambda t:{"dz":0.05*pulse(t,T(52),0.08,0.3)+0.06*pulse(t,T(88),0.08,0.3),"rx":-0.12*pulse(t,T(52),0.08,0.3),"sz":-0.06*pulse(t,T(52),0.06,0.25)+0.05*pulse(t,T(62),0.1,0.4)}
    rk.arm_seq={KN_ARM:[(0,("euler",-0.2,0.3)),(T(24)-0.4,("aim",knob)),(T(33)+0.2,("euler",-0.25,1.1,0.1,3)),(T(66)-0.2,("euler",-0.3,0.4)),(T(69)-0.1,("euler",-0.2,1.0,0.25,4)),(T(70),("aim",lambda t:Vector((0.1,0.2,1.5)),0.06,2.2)),(T(86),("euler",0,0.4))],
                KO:[(0,("rest",)),(T(24),("euler",-0.2,0.35)),(T(33)+0.2,("euler",-0.25,1.1,0.1,3)),(T(69)-0.1,("euler",-0.2,1.0,0.25,4)),(T(70),("euler",-0.1,0.6)),(T(79),("aim",lambda t:rk.A.location+Vector((0.0,-0.18,1.25)))),(T(80),("euler",-0.15,0.5))]}
    rk.body_fn=lambda t:{"rx":-0.06*window(t,T(24),T(33),0.2)+0.04*math.sin(t*14)*window(t,T(24),T(33),0.2),"dz":0.07*pulse(t,T(33),0.06,0.3)+0.04*abs(math.sin(t*12))*window(t,T(69),T(70),0.1),
                          "sz":0.06*pulse(t,T(69),0.08,0.5)-0.05*pulse(t,T(33),0.05,0.2),"rz":0.08*math.sin(t*3)*window(t,T(70),T(85),0.2)}
    EV=[("whoosh",0.0,0.8),("glass_clink",T(6),0.25),("whoosh",T(13),0.6),("whoosh",T(24)-0.2,0.6),("clock_ticking",T(24),0.5,T(33)-T(24)),("impact",T(33),0.6),
        ("whoosh",T(34)-0.2,0.6),("ocean_waves",T(34)-0.1,0.35,1.9),("whoosh",T(40),0.6),("splash",T(43)+0.35,0.3),("glass_clink",T(52),0.5),("whoosh",T(56),0.5),
        ("whoosh",T(66)-0.05,0.6),("boing",T(69),0.25),("whoosh",T(86)-0.1,0.6),("bell_ding",T(88),0.45),("whoosh",T(89)-0.1,0.6),("ocean_waves",T(89),0.35,2.3)]

if SEG=="A2":
    def BATH(t):
        th=-0.95+0.32*math.sin(2*math.pi*1.25*t); return Vector((lx+0.66*math.cos(th),ly+0.66*math.sin(th),LR.POOL_Z+0.04))
    CAM=[(29.0,(-0.9,-2.15,1.65),(0.5,-0.3,1.0),24),(29.45,(-0.5,-1.8,1.4),(0.55,-0.32,1.0),28),
         (T(100),(-0.45,-1.75,1.35),(0.5,-0.3,0.95),28),(T(100)+0.12,(-0.25,-1.6,1.2),(0.45,-0.25,0.85),33),
         (T(108)-0.15,(-0.25,-1.62,1.25),(0.5,-0.3,0.95),32),(T(108)+0.25,(-0.35,-1.75,1.65),(0.85,-0.45,1.65),28),
         (T(112)-0.1,(-0.32,-1.72,1.65),(0.85,-0.45,1.6),29),(T(112)+0.25,(0.05,-1.45,1.62),(0.88,-0.48,1.55),36),(34.8,(0.08,-1.42,1.62),(0.88,-0.48,1.55),37)]
    WIPE=rk.arm_near(BATH(0)); OTH=1-WIPE
    rk.face_seq=[(29.0,"proud"),(T(100),"happy"),(T(108),"proud"),(T(111),"neutral"),(T(112),"sleepy")]
    rk.arm_seq={WIPE:[(29.0,("aim",BATH)),(T(111)+0.1,("aim",lambda t:BATH(T(111)+0.1)))],OTH:[(29.0,("euler",-0.1,0.45))]}
    hum=lambda t: window(t,T(108)-0.1,T(111),0.15)
    rk.body_fn=lambda t:{"rx":-0.08,"rz":0.07*math.sin(t*2*math.pi*1.25)*(1-ss((t-T(111))/0.2)),"bob":0.012*(1-ss((t-T(111))/0.2)),"sz":0.03*hum(t)*math.sin(t*9)}
    def update(t):
        c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l
        movs["lens"].rotation_euler=(0,0,lens_angle(t)); movs["gear1"].rotation_euler=(0,0.4,0); movs["gear2"].rotation_euler=(0,-0.64,0)
        pool.scale=(1,1,1)
        for r in rigs: r.pose(t)
        bpy.context.view_layer.update()
        rag=bpy.data.objects["LIVE_rag"]; rag.location=rk.hand(WIPE)+Vector((0,-0.02,-0.03)); rag.rotation_euler=(0,0,0.3*math.sin(t*7)); rag.scale=(1,1,1)
        head=rk.A.location+Vector((0,0,2.05))
        for i,n in enumerate(notes):
            ph=(t-T(108)+i*0.25)
            vis=hum(t)*(1 if ph>0 else 0)
            n.location=head+Vector((0.18*(i-1)+0.05*math.sin(ph*5),-0.1,0.1+0.35*(ph%1.0)))
            s=max(0.001,vis*(0.8+0.3*math.sin(ph*6))); n.scale=(s,s,s)
    EV=[("ocean_waves",29.0,0.25,5.6),("whoosh",T(100)-0.05,0.35),("whoosh",T(108)-0.1,0.4),("gasp",T(112),0.45)]

if SEG=="B":
    head=lambda: rk.A.location+Vector((0,0,1.75))
    CAN_ARM=rk.arm_near(rk.A.location+Vector((0.2,-0.3,1.0))); OTH=1-CAN_ARM
    CAM=[(34.65,(1.65,-0.1,1.55),(0.6,1.9,1.45),24),(35.0,(1.35,0.35,1.5),(0.6,1.85,1.45),30),
         (T(115),(1.32,0.38,1.5),(0.6,1.85,1.5),30),(T(115)+0.12,(1.25,0.48,1.52),(0.58,1.7,1.55),35),
         (T(120)-0.1,(1.25,0.5,1.5),(0.6,1.8,1.5),34),(T(121)+0.1,(1.3,0.6,1.45),(0.7,2.5,1.35),32),
         (T(122)-0.15,(1.3,0.6,1.45),(0.7,2.5,1.35),32),(T(122)+0.25,(1.25,0.45,1.1),(0.62,1.3,0.98),33),
         (T(129)-0.2,(1.3,0.35,1.05),(0.6,1.2,0.75),30),(T(129)+0.3,(1.4,0.15,0.95),(0.6,1.2,0.4),27),
         (T(133)-0.2,(1.42,0.12,0.95),(0.6,1.2,0.35),27),(T(133)+0.2,(1.45,0.55,1.6),(0.62,2.3,1.35),27),
         (T(136),(1.4,0.6,1.58),(0.62,2.25,1.35),29),(T(136)+0.12,(1.35,0.68,1.58),(0.6,2.15,1.45),32),
         (T(140)-0.1,(1.3,0.75,1.55),(0.62,2.3,1.3),31),(T(140)+0.25,(1.0,1.3,1.4),(0.68,2.42,1.2),36),
         (T(142),(0.98,1.32,1.38),(0.66,2.42,1.22),37),(T(142)+0.12,(0.92,1.45,1.35),(0.66,2.42,1.24),44),
         (T(145)-0.15,(0.92,1.45,1.35),(0.66,2.42,1.24),43),(T(145)+0.3,(2.25,-2.75,2.3),(0.5,1.35,0.95),22),(46.6,(2.1,-2.55,2.2),(0.5,1.35,1.0),23)]
    rk.face_seq=[(34.65,"neutral"),(T(115),"worried"),(T(118),"skeptical"),(T(122),"worried"),(T(125),"shock"),(T(129),"scream"),(T(131),"worried"),
                 (T(133),"furious"),(T(136),"scream"),(T(139)+0.2,"furious"),(T(140),"skeptical"),(T(142),"evil"),(T(145),"worried"),(T(149),"sleepy")]
    rk.arm_seq={OTH:[(34.65,("euler",-0.1,0.45)),(T(115)-0.1,("aim",lambda t:head()+Vector((0.2,0.0,0.15)),0.03,4)),(T(121),("euler",-0.15,0.4)),
                     (T(122),("aim",lambda t:rk.A.location+Vector((0.0,-0.32,1.0)),0.035,9)),(T(133),("euler",-0.2,1.5,0.25,4)),(T(140),("euler",-0.5,0.35,0.06,5)),(T(145),("euler",0.05,0.15))],
                CAN_ARM:[(34.65,("euler",-0.05,0.3)),(T(122),("aim",lambda t:rk.A.location+Vector((0.18,-0.34,1.02)),0.035,9)),(T(133),("euler",-0.2,1.5,0.25,4)),(T(145),("euler",0.05,0.15))]}
    rk.body_fn=lambda t:{"rx":0.02*math.sin(t*40)*window(t,T(122),T(133),0.15)+0.1*ss((t-T(145))/0.6),"rz":0.06*math.sin(t*25)*window(t,T(136),T(140),0.1),
                          "dz":0.06*pulse(t,T(136),0.06,0.3)+0.03*abs(math.sin(t*14))*window(t,T(136),T(140),0.1)-0.05*ss((t-T(149))/0.6),
                          "sz":-0.06*ss((t-T(149))/0.6)+0.06*pulse(t,T(115),0.08,0.3),"bob":0.012*(1-0.7*ss((t-T(149))/0.6))}
    def update(t):
        c,g,l=camstate(CAM,t)
        if T(136)<=t<T(136)+0.45: c=c+Vector((0.012*math.sin(t*95),0,0.01*math.sin(t*71)))*(1-(t-T(136))/0.45)
        cam.location=c; tgt.location=g; cam.data.lens=l
        for r in rigs: r.pose(t)
        bpy.context.view_layer.update()
        # question mark pops above his head when he forgets
        q=ss((t-T(115))/0.12)*(1-ss((t-(T(121)+0.3))/0.15))
        sq=max(0.001,q*(1+0.25*math.sin(min(1.0,max(0.0,(t-T(115))/0.25))*math.pi)))
        qm.location=head()+Vector((0.28,-0.05,0.25+0.03*math.sin(t*5))); qm.scale=(sq,sq,sq)
        # oil can shakes in his hand, tips on "spills", drips, puddle spreads
        hv=window(t,T(122)-0.05,T(133)-0.1,0.05)
        can.location=rk.hand(CAN_ARM)+Vector((0,-0.03,0)); tip=ss((t-(T(129)-0.25))/0.3)*(1-ss((t-(T(132)+0.2))/0.3))
        can.rotation_euler=(0,-1.3*tip+0.1*math.sin(t*38)*hv,0); s=max(0.001,hv); can.scale=(s,s,s)
        bpy.context.view_layer.update()
        sp=can.matrix_world@Vector((-0.13,0,0.18)); fl=window(t,T(129),T(132)+0.1,0.1)*hv
        drip.location=sp; drip.scale=(1,1,max(0.001,(sp.z-0.012)*fl)); drip.rotation_euler=(0,0,0)
        pu=ss((t-T(129)-0.15)/(T(132)-T(129)+0.4)); puddle.location=(sp.x if t<T(132) else puddle.location.x,sp.y if t<T(132) else puddle.location.y,0.012)
        if t>=T(132): puddle.location=(PUD[0],PUD[1],0.012)
        else: PUD[0],PUD[1]=sp.x,sp.y
        ps=max(0.001,pu); puddle.scale=(ps,ps*0.8,1)
        # seagulls arrive with winter, bob, lean in when "spying"
        on=t>=T(133)-0.25; spy=window(t,T(142),T(145)+0.4,0.2)
        gulls.location=gl0+Vector((0,-0.05*spy,0.015*math.sin(t*6)+(0 if on else -6)))
    PUD=[0.42,1.12]
    EV=[("whoosh",T(115)-0.15,0.3),("whoosh",T(122)-0.1,0.6),("glass_clink",T(125),0.25),("splash",T(129)+0.1,0.35),("whoosh",T(133)-0.15,0.6),("thunder",T(134),0.3),
        ("wind",T(133),0.35,T(145)-T(133)+0.5),("seagulls",T(136)-0.3,0.6,T(145)-T(136)+0.6),("whoosh",T(140),0.5),("whoosh",T(145),0.6),("clock_ticking",T(146),0.25,46.4-T(146))]

if SEG=="C":
    face=lambda: rk.A.location+Vector((0,-0.1,1.6))
    CAM=[(46.4,(0.0,-2.15,1.1),(0.0,-0.35,0.6),26),(46.85,(0.05,-1.4,0.9),(0.0,-0.5,0.55),32),
         (T(158),(0.05,-1.38,0.88),(0.0,-0.5,0.5),33),(T(158)+0.12,(0.05,-1.25,0.82),(0.0,-0.58,0.45),42),
         (T(159)-0.15,(0.05,-1.25,0.82),(0.0,-0.58,0.45),41),(T(159)+0.2,(0.65,-1.65,1.25),(0.0,0.3,1.4),30),
         (T(163),(0.6,-1.62,1.25),(0.0,0.3,1.4),31),(T(163)+0.12,(0.55,-1.5,1.3),(0.0,0.3,1.45),36),
         (T(168)-0.15,(0.55,-1.5,1.3),(0.0,0.3,1.45),35),(T(168)+0.25,(0.55,-1.35,1.05),(0.0,0.0,0.9),32),
         (T(176)-0.2,(0.55,-1.35,1.35),(0.1,-0.05,1.55),31),(T(176)+0.3,(-1.45,-1.55,2.4),(0.35,0.2,0.85),18),
         (T(180),(-1.42,-1.5,2.38),(0.6,0.45,0.6),20),(T(180)+0.15,(-1.3,-1.35,2.3),(1.2,1.0,0.2),26),
         (T(183)-0.2,(-1.3,-1.35,2.3),(1.2,1.0,0.25),26),(T(183)+0.25,(1.6,-1.35,1.6),(0.92,-0.45,1.5),34),
         (T(188),(1.55,-1.3,1.6),(0.92,-0.45,1.52),36),(T(188)+0.12,(1.5,-1.22,1.6),(0.92,-0.45,1.55),41),
         (T(190)-0.15,(1.5,-1.22,1.6),(0.92,-0.45,1.55),40),(T(190)+0.25,(0.65,0.95,1.75),(2.1,4.1,1.35),28),
         (T(194)-0.15,(0.7,1.0,1.75),(2.3,4.1,1.3),29),(T(194)+0.25,(1.75,-1.5,1.55),(0.92,-0.45,1.3),30),(T(199),(1.65,-1.42,1.5),(0.92,-0.45,1.25),33),(DUR+0.1,(1.55,-1.32,1.45),(0.92,-0.45,1.2),37)]
    rk.face_seq=[(46.4,"sleepy"),(T(171),"worried"),(T(176),"neutral"),(T(183),"sleepy"),(T(188),"worried"),(T(194),"sleepy")]
    A0=rk.arm_near(Vector((0,0,0)))
    rk.arm_seq={0:[(46.4,("euler",0.0,0.25)),(T(199),("euler",0.15,0.08))],1:[(46.4,("euler",0.0,0.25)),(T(199),("euler",0.15,0.08))]}
    breath=lambda t: window(t,T(183),T(190),0.3)*math.sin(t*2*math.pi*0.9)
    rk.body_fn=lambda t:{"sx":0.03*breath(t),"sz":0.02*breath(t)-0.07*ss((t-T(199))/0.5),"rx":0.16*ss((t-T(199))/0.5),"dz":-0.04*ss((t-T(199))/0.5),"bob":0.01*(1-ss((t-T(199))/0.5))}
    def update(t):
        c,g,l=camstate(CAM,t); cam.location=c; tgt.location=g; cam.data.lens=l
        movs["lens"].rotation_euler=(0,0,lens_angle(t)); movs["gear1"].rotation_euler=(0,0.4,0); movs["gear2"].rotation_euler=(0,-0.64,0)
        bm=bpy.data.objects["LIVE_beam"]; bm.rotation_euler=(0,0,lens_angle(t)); bm.scale=(1,1,1)
        sh=bpy.data.objects["LIVE_ship"]; u=ss((t-(T(190)-0.2))/2.2); sh.location=(0.9+2.2*u,3.9,1.05); sh.rotation_euler=(0,0.03*math.sin(t*2.1),math.pi); sh.scale=(1,1,1)
        pool.scale=(1,1,1)
        for r in rigs: r.pose(t)
        bpy.context.view_layer.update()
        fc=face()
        for i,w in enumerate(wisps):
            ph=((t-T(168))*0.45+i/len(wisps))%1.0; on=ss((t-T(168))/0.6)
            base=Vector((lx+0.4*math.cos(i*2.1),ly-0.35+0.25*math.sin(i*1.7),LR.POOL_Z))
            up=base+Vector((0.05*math.sin(t*2+i),0,0.15+0.9*ph))
            drift=ss((t-T(183)+0.3)/0.8)
            p=up.lerp(fc+Vector((0.08*math.sin(i*2.3),-0.05,-0.15+0.1*math.cos(i))),drift*(0.4+0.5*ph))
            w.location=p; w.rotation_euler=(0.3*math.sin(t+i),0,t*0.8+i); s=max(0.001,on*math.sin(math.pi*ph)); w.scale=(s,s,s)
    EV=[("whoosh",T(159)-0.1,0.6),("glass_clink",T(158),0.3),("whoosh",T(168),0.5),("whoosh",T(176),0.6),("door_creak_wood",T(180),0.35),
        ("whoosh",T(183)-0.1,0.6),("whoosh",T(190)-0.1,0.6),("ocean_waves",T(190),0.35,1.6),("whoosh",T(194)-0.1,0.6),("impact",T(199)+0.15,0.4)]

for r in rigs:
    swaps[r.C.name+"_facemat"]=[(s,os.path.join(ch.FACEDIR,f"{r.C.name}_{e}.png")) for s,e in r.face_seq]
json.dump(EV,open(OUT+"/sfx.json","w")) if os.path.isdir(OUT) else (os.makedirs(OUT,exist_ok=True),json.dump(EV,open(OUT+"/sfx.json","w")))
class AnimList(list): pass
def clampcam():
    if SEG in("A1","A2","C"):
        c=cam.location; r=math.hypot(c.x,c.y)
        if r>2.65: cam.location=(c.x*2.65/r,c.y*2.65/r,c.z)
LENS_SCALE=0.74   # framing: keep whole characters in frame
def full_update(t):
    update(t); clampcam(); cam.data.lens=cam.data.lens*LENS_SCALE
    for r in rigs: r.key(sc.frame_current)
keys=[int(k) for k in E("KEYS").split(",")] if E("KEYS") else None
run(sc,cam,tgt,t0,t1,full_update,animated,swaps,OUT,nproc=int(E("NPROC","2")),keys_only=keys)
print("SEGMENT DONE",SEG,flush=True)
