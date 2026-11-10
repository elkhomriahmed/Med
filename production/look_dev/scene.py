import bpy, math, sys, time, os
D=os.path.dirname(os.path.abspath(__file__)); OUT=sys.argv[-1]; SHOT=os.environ.get('SHOT','wide')
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE'
sc.render.resolution_x=1080; sc.render.resolution_y=1920; sc.render.resolution_percentage=50
INK=(0.03,0.02,0.02)

def link(nt,a,b): nt.links.new(a,b)
def mat(name,col,rough=0.85,emit=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value=(*col,1); p.inputs["Roughness"].default_value=rough
    p.inputs["Specular IOR Level"].default_value=0.15
    if emit: p.inputs["Emission Color"].default_value=(*col,1); p.inputs["Emission Strength"].default_value=emit
    return m
def planks(name,c1,c2,line,scale=(1,1,1),vertical=False,brick=(0.9,0.12)):
    m=mat(name,c1); nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    tc=n.new('ShaderNodeTexCoord'); mp=n.new('ShaderNodeMapping'); bt=n.new('ShaderNodeTexBrick')
    mp.inputs['Scale'].default_value=scale
    if vertical: mp.inputs['Rotation'].default_value=(math.pi/2,0,math.pi/2)
    bt.inputs['Color1'].default_value=(*c1,1); bt.inputs['Color2'].default_value=(*c2,1); bt.inputs['Mortar'].default_value=(*line,1)
    bt.inputs['Scale'].default_value=1; bt.inputs['Mortar Size'].default_value=0.012; bt.inputs['Brick Width'].default_value=brick[0]; bt.inputs['Row Height'].default_value=brick[1]
    bt.offset=0.5; bt.squash=1.0
    link(nt,tc.outputs['Object'],mp.inputs[0]); link(nt,mp.outputs[0],bt.inputs[0]); link(nt,bt.outputs['Color'],p.inputs['Base Color'])
    return m
def box(name,loc,size,m,bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=(size[0]/2,size[1]/2,size[2]/2)
    bpy.ops.object.transform_apply(scale=True); o.data.materials.append(m)
    if bevel:
        b=o.modifiers.new("bv",'BEVEL'); b.width=bevel; b.segments=2
    return o
def cyl(name,loc,r,h,m,rot=(0,0,0),verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r,depth=h,location=loc,rotation=rot,vertices=verts); o=bpy.context.object; o.name=name; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def sph(name,loc,scale,m,seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,location=loc); o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
def tube(name,pts,r,m):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=r; cu.bevel_resolution=4; cu.use_fill_caps=True
    sp=cu.splines.new('POLY'); sp.points.add(len(pts)-1)
    for i,p in enumerate(pts): sp.points[i].co=(*p,1)
    o=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(o); cu.materials.append(m)
    for p in (pts[0],pts[-1]): sph(name+"_cap",p,(r,r,r),m,12)
    return o

# ---------- ROOM: lighthouse keeper's cottage at night ----------
wood_floor=planks("floor",(0.42,0.22,0.10),(0.36,0.18,0.08),(0.10,0.05,0.03),scale=(1,1,1),brick=(1.6,0.18))
wall=planks("wall",(0.22,0.38,0.62),(0.19,0.34,0.57),(0.06,0.08,0.14),vertical=True,brick=(2.5,0.16))
wall2=planks("wall2",(0.26,0.42,0.68),(0.23,0.38,0.63),(0.06,0.08,0.14),vertical=True,brick=(2.5,0.16))
trim=mat("trim",(0.30,0.16,0.07)); dark=mat("dark",(0.12,0.07,0.04)); ink=mat("ink",INK,0.6)
box("floor",(0,0,-0.05),(6,6,0.1),wood_floor)
box("ceiling",(0,0,2.85),(6,6,0.1),dark)
# back wall with a window hole (x -0.2..0.9, z 1.0..2.0)
WY=2.0
box("bw_l",(-1.85,WY,1.4),(3.3,0.15,2.8),wall); box("bw_r",(2.2,WY,1.4),(2.6,0.15,2.8),wall)
box("bw_b",(0.35,WY,0.5),(1.1,0.15,1.0),wall); box("bw_t",(0.35,WY,2.4),(1.1,0.15,0.8),wall)
box("lw",(-2.6,0,1.4),(0.15,6,2.8),wall2); box("rw",(3.0,0,1.4),(0.15,6,2.8),wall2)
box("baseboard",(-0.3,WY-0.09,0.08),(5.2,0.04,0.16),trim); box("baseboard_l",(-2.51,0,0.08),(0.04,4,0.16),trim)
for z in (1.0,2.0): box("wf_h",(0.35,WY-0.1,z),(1.25,0.12,0.08),trim)
for x in (-0.25,0.95): box("wf_v",(x,WY-0.1,1.5),(0.08,0.12,1.08),trim)
box("mullion_v",(0.35,WY-0.02,1.5),(0.04,0.04,1.0),trim); box("mullion_h",(0.35,WY-0.02,1.5),(1.1,0.04,0.04),trim)
box("sill",(0.35,WY-0.18,0.97),(1.35,0.3,0.06),trim,0.01)
for i,x in enumerate((-1.8,-0.9,0.2,1.3,2.4)): box("beam",(x,0,2.72),(0.18,6,0.18),dark,0.01)
# night sky outside the window
img=bpy.data.images.load(D+"/sky.png")
bpy.ops.mesh.primitive_plane_add(size=1,location=(0.6,3.6,1.6),rotation=(math.pi/2,0,0)); sky=bpy.context.object; sky.scale=(4,3,1)
sm=bpy.data.materials.new("sky"); sm.use_nodes=True; nt=sm.node_tree; n=nt.nodes; n.clear()
o=n.new('ShaderNodeOutputMaterial'); e=n.new('ShaderNodeEmission'); t=n.new('ShaderNodeTexImage'); t.image=img; e.inputs[1].default_value=1.2
link(nt,t.outputs[0],e.inputs[0]); link(nt,e.outputs[0],o.inputs[0]); sky.data.materials.append(sm)
# ---------- PROPS ----------
tabletop=mat("table",(0.50,0.27,0.12))
box("table_top",(1.25,-0.15,0.78),(1.1,0.75,0.06),tabletop,0.01)
for dx in (-0.48,0.48):
    for dy in (-0.3,0.3): box("table_leg",(1.25+dx,-0.15+dy,0.38),(0.06,0.06,0.76),tabletop)
cloth=planks("cloth",(0.75,0.12,0.12),(0.85,0.85,0.8),(0.75,0.12,0.12),brick=(0.12,0.12))
box("cloth",(1.25,-0.15,0.815),(0.8,0.55,0.012),cloth)
# oil lamp on table
brass=mat("brass",(0.75,0.5,0.15),0.4); glow=mat("glow",(1.0,0.62,0.25),0.5,emit=6)
cyl("lamp_base",(1.05,-0.1,0.86),0.08,0.08,brass); sph("lamp_glass",(1.05,-0.1,1.0),(0.07,0.07,0.1),glow); cyl("lamp_top",(1.05,-0.1,1.12),0.04,0.06,brass)
# mug + plate
cyl("mug",(1.45,-0.3,0.87),0.05,0.11,mat("mug",(0.85,0.85,0.8)))
# shelf with jars on left wall
box("shelf",(-2.42,0.6,1.6),(0.3,1.4,0.04),trim,0.005); box("shelf2",(-2.42,0.6,1.2),(0.3,1.4,0.04),trim,0.005)
for i,(y,c) in enumerate([(0.1,(0.2,0.5,0.3)),(0.35,(0.7,0.3,0.2)),(0.6,(0.8,0.7,0.3)),(0.9,(0.3,0.4,0.7)),(1.1,(0.6,0.6,0.6))]):
    cyl("jar",(-2.42,y,1.7),0.06,0.16 if i%2 else 0.12,mat(f"jar{i}",c,0.3))
    cyl("book",(-2.42,y+0.05,1.32),0.05,0.2,mat(f"bk{i}",(c[2],c[0],c[1])),rot=(0,0,0),verts=4)
# framed lighthouse picture
box("frame",(-1.3,WY-0.09,1.7),(0.6,0.04,0.8),trim,0.01); box("pic",(-1.3,WY-0.115,1.7),(0.48,0.01,0.66),mat("pic",(0.85,0.8,0.65)))
box("pic_tower",(-1.3,WY-0.125,1.62),(0.08,0.01,0.36),mat("pic_r",(0.8,0.2,0.15)))
# rocking chair
chair=mat("chair",(0.45,0.22,0.1))
box("seat",(-1.25,0.9,0.45),(0.5,0.5,0.05),chair,0.01); box("back",(-1.25,1.14,0.85),(0.5,0.05,0.8),chair,0.01)
for dx in (-0.22,0.22):
    arc=[(-1.25+dx,0.9+0.45*math.sin(t),0.62-0.6*math.cos(t*0.75)) for t in [i/8*1.6-0.8 for i in range(9)]]; tube("rocker",arc,0.022,chair)
    for dy in (-0.2,0.2): box("cleg",(-1.25+dx,0.9+dy,0.25),(0.04,0.04,0.42),chair)
# rug
bpy.ops.mesh.primitive_cylinder_add(radius=1.0,depth=0.01,location=(-0.2,0.4,0.005),vertices=64); rug=bpy.context.object; rug.scale=(1.2,0.8,1)
rm=mat("rug",(0.6,0.25,0.2)); rug.data.materials.append(rm)
rt=rm.node_tree; ring=rt.nodes.new('ShaderNodeTexWave'); ring.wave_type='RINGS'; ring.inputs['Scale'].default_value=3; ring.inputs['Distortion'].default_value=0
cr=rt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.interpolation='CONSTANT'; cr.color_ramp.elements[0].color=(0.55,0.2,0.15,1); cr.color_ramp.elements[1].position=0.5; cr.color_ramp.elements[1].color=(0.85,0.7,0.4,1)
link(rt,ring.outputs['Fac'],cr.inputs[0]); link(rt,cr.outputs[0],rt.nodes["Principled BSDF"].inputs['Base Color'])
# coat hooks + rope coil
box("hookboard",(2.0,WY-0.09,1.75),(0.8,0.04,0.12),trim)
for x in (1.75,2.0,2.25): cyl("hook",(x,WY-0.14,1.72),0.015,0.1,brass,rot=(math.pi/2,0,0))
# barrel in the corner
cyl("barrel",(2.4,1.4,0.4),0.3,0.8,mat("barrel",(0.45,0.25,0.12)))
for z in (0.15,0.65): cyl("hoop",(2.4,1.4,z),0.305,0.04,dark)

# ---------- CAMERA ----------
bpy.ops.object.camera_add(location=(1.05,-2.3,1.35)); cam=bpy.context.object; sc.camera=cam; cam.data.lens=24
tgt=bpy.data.objects.new("tgt",None); sc.collection.objects.link(tgt); tgt.location=(-0.1,0.45,0.95)
c=cam.constraints.new('TRACK_TO'); c.target=tgt; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
if SHOT=="close":
    cam.location=(0.75,-1.2,1.5); tgt.location=(-0.55,0.1,1.45); cam.data.lens=35; cam.data.dof.focus_distance=1.75
cam.data.dof.use_dof=True; cam.data.dof.focus_distance=2.6; cam.data.dof.aperture_fstop=4
# ---------- CHARACTERS (2D cards in the 3D room, always facing camera) ----------
CHARS=bpy.data.collections.new("chars"); sc.collection.children.link(CHARS)
def card_mat(name,path,emit=0.55):
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    t=n.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(path); t.extension='CLIP'
    link(nt,t.outputs['Color'],p.inputs['Base Color']); link(nt,t.outputs['Color'],p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value=emit
    p.inputs['Roughness'].default_value=1; p.inputs['Specular IOR Level'].default_value=0
    link(nt,t.outputs['Alpha'],p.inputs['Alpha']); m.surface_render_method='DITHERED'
    return m
def card(name,path,w,h,loc,parent):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc,rotation=(math.pi/2,0,0)); o=bpy.context.object; o.name=name; o.scale=(w,h,1)
    bpy.ops.object.transform_apply(scale=True,rotation=True); o.data.materials.append(card_mat(name,path))
    for c in o.users_collection: c.objects.unlink(o)
    CHARS.objects.link(o); o.parent=parent; return o
def ink_tube(name,pts,parent,r=0.012):
    o=tube(name,pts,r,ink)
    for ob in [o]+[x for x in bpy.data.objects if x.name.startswith(name+"_cap")]:
        for c in ob.users_collection: c.objects.unlink(ob)
        CHARS.objects.link(ob); ob.parent=parent
def character(name,pos,face,arms,turn_to_cam=True):
    x,y,z0=pos
    root=bpy.data.objects.new(name+"_root",None); CHARS.objects.link(root); root.location=(x,y,z0)
    if turn_to_cam:
        c=root.constraints.new('LOCKED_TRACK'); c.target=sc.camera; c.track_axis='TRACK_NEGATIVE_Y'; c.lock_axis='LOCK_Z'
    HW=0.62; HH=HW*1224/1024; hz=1.36+0.25+(0.582-0.5)*HH
    card(name+"_body",f"{D}/{name}_body.png",0.38,0.38*1100/640,(0,0,1.36-0.38*1100/640/2+0.02),root)
    card(name+"_head",f"{D}/{name}_head.png",HW,HH,(0,-0.006,hz),root)
    card(name+"_face",f"{D}/{name}_face_{face}.png",HW,HH,(0,-0.012,hz),root)
    for s in (-1,1):
        ink_tube(name+f"_leg{s}",[(s*0.07,0.05,0.8),(s*0.08,0.05,0.06)],root)
        sph(name+f"_shoe{s}",(s*0.08,-0.03,0.035),(0.055,0.085,0.035),ink).parent=root
    for i,pts in enumerate(arms):
        ink_tube(name+f"_arm{i}",[(px,-0.02,pz) for px,pz in pts],root)
        sph(name+f"_hand{i}",(pts[-1][0],-0.02,pts[-1][1]),(0.03,0.03,0.03),ink).parent=root
    for o in bpy.data.objects:
        if o.name.startswith((name+"_shoe",name+"_hand")):
            for c in o.users_collection: c.objects.unlink(o)
            CHARS.objects.link(o)
    return root

FACE_K=os.environ.get("KFACE","smug_smirk"); FACE_E=os.environ.get("EFACE","happy_grin")
character("keeper",(-0.55,0.05,0),FACE_K,[[(-0.17,1.25),(-0.3,1.0),(-0.32,0.78)],[(0.17,1.25),(0.32,1.05),(0.36,0.84)]])
character("engineer",(0.45,0.45,0),FACE_E,[[(-0.16,1.25),(-0.36,1.2),(-0.55,1.38)],[(0.16,1.25),(0.28,1.0),(0.3,0.8)]])
# ---------- LIGHT ----------
bpy.ops.object.light_add(type='SUN',rotation=(math.radians(55),0,math.radians(165))); moon=bpy.context.object.data; moon.energy=6; moon.color=(0.55,0.65,1.0); moon.angle=math.radians(1.5)
bpy.ops.object.light_add(type='POINT',location=(1.05,-0.1,1.02)); lamp=bpy.context.object.data; lamp.energy=220; lamp.color=(1.0,0.62,0.3); lamp.shadow_soft_size=0.05
bpy.ops.object.light_add(type='AREA',location=(1.5,-3,2.2),rotation=(math.radians(70),0,math.radians(20))); fill=bpy.context.object.data; fill.energy=260; fill.size=3; fill.color=(0.5,0.55,0.9)
w=bpy.data.worlds.new("w"); sc.world=w; w.use_nodes=True; w.node_tree.nodes["Background"].inputs[0].default_value=(0.10,0.13,0.25,1); w.node_tree.nodes["Background"].inputs[1].default_value=1
# light shafts
bpy.ops.mesh.primitive_cube_add(location=(0,0,1.4)); vol=bpy.context.object; vol.scale=(2.9,2.9,1.4)
vm=bpy.data.materials.new("haze"); vm.use_nodes=True; vn=vm.node_tree.nodes; vn.remove(vn["Principled BSDF"]); pv=vn.new('ShaderNodeVolumePrincipled'); pv.inputs['Density'].default_value=0.02; pv.inputs['Color'].default_value=(0.8,0.85,1,1)
vm.node_tree.links.new(pv.outputs[0],vn["Material Output"].inputs['Volume']); vol.data.materials.append(vm); vol.visible_shadow=False
# ---------- RENDER LOOK ----------
sc.render.use_freestyle=True; sc.render.line_thickness_mode='ABSOLUTE'; sc.render.line_thickness=1.0
fs=sc.view_layers[0].freestyle_settings; fs.crease_angle=math.radians(140)
ls=fs.linesets[0] if len(fs.linesets) else fs.linesets.new("ink")
ls.select_by_visibility=True; ls.select_silhouette=True; ls.select_border=True; ls.select_crease=True
ls.select_by_collection=True; ls.collection=CHARS; ls.collection_negation='EXCLUSIVE'
if not ls.linestyle: ls.linestyle=bpy.data.linestyles.new("ink")
ls.linestyle.thickness=3.2; ls.linestyle.color=INK
vol.hide_render=True
sc.view_settings.view_transform='AgX'; sc.view_settings.exposure=0.6
try: sc.view_settings.look='AgX - Punchy'
except Exception as e: print("look",e)
sc.eevee.taa_render_samples=64
for k,v in dict(shadow_ray_count=3,shadow_step_count=16,fast_gi_quality=1.0,fast_gi_ray_count=4,fast_gi_step_count=12).items():
    try: setattr(sc.eevee,k,v)
    except Exception as e: print("set",k,e)
try: sc.eevee.use_volumetric_shadows=True; sc.eevee.volumetric_tile_size='4'
except Exception as e: print("vol",e)
sc.render.filepath=OUT; t=time.time(); bpy.ops.render.render(write_still=True); print("RENDERED",round(time.time()-t,1))
