"""Shared toolkit: materials, primitives, outlines, lights, render settings."""
import bpy, math, random, os
from mathutils import Vector
INK=(0.10,0.105,0.20)
HERE=os.path.dirname(os.path.abspath(__file__))
_mats={}

def reset(res=(1080,1920),pct=50):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc=bpy.context.scene; sc.render.resolution_x,sc.render.resolution_y=res; sc.render.resolution_percentage=pct
    _mats.clear(); return sc

def link(nt,a,b): nt.links.new(a,b)

def mat(name,col,rough=0.75,spec=0.2,emit=0.0,vary=0.0,ink=False,metal=0.0):
    """Soft 'game-toon' material. vary>0 gives each object a slightly different shade (per-board variation)."""
    key=(name,col,rough,spec,emit,vary)
    if key in _mats: return _mats[key]
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    p.inputs["Roughness"].default_value=rough; p.inputs["Specular IOR Level"].default_value=spec
    if vary:
        oi=n.new('ShaderNodeAttribute'); oi.attribute_name='rand'; oi.attribute_type='GEOMETRY'; mr=n.new('ShaderNodeMapRange'); mr.inputs[3].default_value=1-vary; mr.inputs[4].default_value=1+vary*0.6
        link(nt,oi.outputs['Fac'],mr.inputs[0])
        mx=n.new('ShaderNodeMix'); mx.data_type='RGBA'; mx.blend_type='MULTIPLY'; mx.inputs['Factor'].default_value=1
        mx.inputs['A'].default_value=(*col,1); link(nt,mr.outputs[0],mx.inputs['B'])
        # faint grain so surfaces are not dead flat
        nz=n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value=18; nz.inputs['Detail'].default_value=3
        tc=n.new('ShaderNodeTexCoord'); mp=n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value=(1,1,6)
        link(nt,tc.outputs['Object'],mp.inputs[0]); link(nt,mp.outputs[0],nz.inputs[0])
        mx2=n.new('ShaderNodeMix'); mx2.data_type='RGBA'; mx2.blend_type='MULTIPLY'; mx2.inputs['Factor'].default_value=0.12
        link(nt,mx.outputs['Result'],mx2.inputs['A']); link(nt,nz.outputs['Color'],mx2.inputs['B'])
        link(nt,mx2.outputs['Result'],p.inputs['Base Color'])
    else:
        p.inputs["Base Color"].default_value=(*col,1)
    if emit:
        p.inputs["Emission Color"].default_value=(*col,1); p.inputs["Emission Strength"].default_value=emit
    _mats[key]=m; return m

def image_mat(name,path,emit=0.0,alpha=True,rough=0.8):
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    t=n.new('ShaderNodeTexImage'); t.image=bpy.data.images.load(path,check_existing=True); t.extension='CLIP'
    link(nt,t.outputs['Color'],p.inputs['Base Color']); p.inputs['Roughness'].default_value=rough; p.inputs['Specular IOR Level'].default_value=0.1
    if emit: link(nt,t.outputs['Color'],p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value=emit
    if alpha: link(nt,t.outputs['Alpha'],p.inputs['Alpha'])
    return m

FAST=os.environ.get('FAST','1')=='1'
ROUND=float(os.environ.get('ROUND','0.018'))   # fast pipeline: crisp boxes (no bevels), ink lines get baked into textures
def _finish(o,m,bevel,coll):
    if m: o.data.materials.append(m)
    if bevel:
        # rounded, toy-like edges (competitor sets): wide bevel, several segments
        b=o.modifiers.new("bevel",'BEVEL'); b.width=max(bevel,ROUND); b.segments=3; b.limit_method='ANGLE'; b.harden_normals=False
        dims=sorted(o.dimensions); b.width=min(b.width,dims[0]*0.45) if dims[0]>0 else b.width
        o.data.shade_smooth() if hasattr(o.data,'shade_smooth') else None
    if coll:
        for c in o.users_collection: c.objects.unlink(o)
        coll.objects.link(o)
    return o

def box(loc,size,m=None,bevel=0.008,rot=(0,0,0),coll=None,name="box"):
    bpy.ops.mesh.primitive_cube_add(location=loc,rotation=rot); o=bpy.context.object; o.name=name
    o.scale=(size[0]/2,size[1]/2,size[2]/2); bpy.ops.object.transform_apply(scale=True)
    return _finish(o,m,bevel,coll)

def cyl(loc,r,h,m=None,rot=(0,0,0),verts=32,bevel=0.006,coll=None,name="cyl",r2=None):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(radius=r,depth=h,location=loc,rotation=rot,vertices=verts)
    else: bpy.ops.mesh.primitive_cone_add(radius1=r,radius2=r2,depth=h,location=loc,rotation=rot,vertices=verts)
    o=bpy.context.object; o.name=name; bpy.ops.object.shade_smooth()
    o.data.set_sharp_from_angle(angle=math.radians(40)) if hasattr(o.data,'set_sharp_from_angle') else None
    return _finish(o,m,bevel,coll)

def sph(loc,scale,m=None,seg=32,coll=None,name="sph",rot=(0,0,0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=seg//2,location=loc,rotation=rot); o=bpy.context.object; o.name=name
    o.scale=scale; bpy.ops.object.transform_apply(scale=True); bpy.ops.object.shade_smooth()
    return _finish(o,m,0,coll)

def torus(loc,R,r,m=None,rot=(0,0,0),coll=None,name="torus"):
    bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,location=loc,rotation=rot,major_segments=48,minor_segments=16)
    o=bpy.context.object; o.name=name; bpy.ops.object.shade_smooth(); return _finish(o,m,0,coll)

def tube(pts,r,m,coll=None,name="tube",smooth=True):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=r; cu.bevel_resolution=4; cu.use_fill_caps=True
    sp=cu.splines.new('BEZIER' if smooth else 'POLY')
    if smooth:
        sp.bezier_points.add(len(pts)-1)
        for i,p in enumerate(pts):
            bp=sp.bezier_points[i]; bp.co=p; bp.handle_left_type=bp.handle_right_type='AUTO'
    else:
        sp.points.add(len(pts)-1)
        for i,p in enumerate(pts): sp.points[i].co=(*p,1)
    o=bpy.data.objects.new(name,cu); (coll or bpy.context.scene.collection).objects.link(o); cu.materials.append(m)
    return o

def hull(o,thick=0.012):
    """Inverted-hull ink outline (thick line around the silhouette, like the competitors' characters)."""
    hm=_mats.get("__hull")
    if not hm:
        hm=bpy.data.materials.new("hull"); hm.use_nodes=True; nt=hm.node_tree; n=nt.nodes; n.clear()
        out=n.new('ShaderNodeOutputMaterial'); em=n.new('ShaderNodeEmission'); em.inputs[0].default_value=(*INK,1)
        tr=n.new('ShaderNodeBsdfTransparent'); mx=n.new('ShaderNodeMixShader'); geo=n.new('ShaderNodeNewGeometry')
        link(nt,geo.outputs['Backfacing'],mx.inputs[0]); link(nt,em.outputs[0],mx.inputs[1]); link(nt,tr.outputs[0],mx.inputs[2]); link(nt,mx.outputs[0],out.inputs[0])
        # front faces of the shell are transparent, back faces are ink -> works in Cycles and EEVEE
        hm.use_backface_culling=False; _mats["__hull"]=hm
    o.data.materials.append(hm); s=o.modifiers.new("ink",'SOLIDIFY'); s.thickness=thick; s.offset=1; s.use_flip_normals=True
    s.material_offset=len(o.data.materials)-1; s.use_rim=False
    o.visible_shadow=True
    return o

def freestyle(sc,sets=(),chars=(),set_thick=1.6,char_thick=3.2,crease=134):
    """Ink lines: thinner on the set, thick silhouettes on characters (faces are drawn, so excluded)."""
    sc.render.use_freestyle=True; sc.render.line_thickness_mode='RELATIVE'
    k=1.0
    fs=sc.view_layers[0].freestyle_settings; fs.crease_angle=math.radians(crease); fs.use_smoothness=True
    while len(fs.linesets): fs.linesets.remove(fs.linesets[0])
    def ls(name,coll,th,crease_on):
        l=fs.linesets.new(name); l.select_by_visibility=True; l.select_by_collection=True; l.collection=coll
        l.select_silhouette=True; l.select_border=True; l.select_crease=crease_on; l.select_contour=True; l.select_external_contour=True
        st=bpy.data.linestyles.new(name); l.linestyle=st; st.thickness=th*k; st.color=INK; st.caps='ROUND'; st.chaining='PLAIN'
        return l
    for c in sets: ls("set_"+c.name,c,set_thick,True)
    for c in chars: ls("char_"+c.name,c,char_thick,False)
def render_settings(sc,engine="CYCLES",samples=48,exposure=0.0):
    sc.render.engine=engine
    if engine=="CYCLES":
        c=sc.cycles; c.samples=samples; c.use_denoising=True; c.max_bounces=5; c.diffuse_bounces=3; c.glossy_bounces=2; c.transparent_max_bounces=8
        c.caustics_reflective=False; c.caustics_refractive=False; c.sample_clamp_indirect=4; c.device='CPU'; c.use_adaptive_sampling=True; c.adaptive_threshold=0.03
        sc.render.threads_mode='AUTO'
    else:
        sc.eevee.taa_render_samples=samples
    vt=os.environ.get("VT","AgX"); sc.view_settings.view_transform=vt; sc.view_settings.exposure=exposure
    if vt=="AgX":
        for lk in ('AgX - Punchy','AgX - Medium High Contrast'):
            try: sc.view_settings.look=lk; break
            except Exception: pass
    sc.render.film_transparent=False

def camera(sc,loc,target,lens=26,fstop=5.6,focus=None):
    bpy.ops.object.camera_add(location=loc); cam=bpy.context.object; sc.camera=cam; cam.data.lens=lens; cam.data.clip_start=0.05
    t=bpy.data.objects.new("cam_target",None); sc.collection.objects.link(t); t.location=target
    c=cam.constraints.new('TRACK_TO'); c.target=t; c.track_axis='TRACK_NEGATIVE_Z'; c.up_axis='UP_Y'
    cam.data.dof.use_dof=True; cam.data.dof.aperture_fstop=fstop; cam.data.dof.focus_distance=focus or (Vector(loc)-Vector(target)).length
    return cam,t

def post(path_in,path_out,bloom=0.45,sat=1.08,warm=0.0):
    """Glow on bright areas + slight saturation, like the competitors' soft glowing lamps/windows."""
    from PIL import Image, ImageFilter, ImageChops, ImageEnhance
    im=Image.open(path_in).convert("RGB")
    br=im.point(lambda v: max(0,(v-228))*8)
    glow=br.filter(ImageFilter.GaussianBlur(im.width*0.025))
    glow2=br.filter(ImageFilter.GaussianBlur(im.width*0.008))
    out=ImageChops.add(im,ImageEnhance.Brightness(glow).enhance(bloom))
    out=ImageChops.add(out,ImageEnhance.Brightness(glow2).enhance(bloom*0.6))
    out=ImageEnhance.Color(out).enhance(sat)
    if warm:
        r,g,b=out.split(); r=r.point(lambda v:min(255,int(v*(1+warm)))); b=b.point(lambda v:int(v*(1-warm*0.6))); out=Image.merge("RGB",(r,g,b))
    out.save(path_out)

# ---------------- surface detail materials (make sets read as real 3D) ----------------
def _coord(nt,scale=(1,1,1),rand_offset=True):
    """Object coords (survive join via 'ocoord' remap in bake.join), offset per board by its random value."""
    n=nt.nodes; tc=n.new('ShaderNodeTexCoord'); mp=n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value=scale
    src=tc.outputs['Object']
    if rand_offset:
        at=n.new('ShaderNodeAttribute'); at.attribute_name='rand'; at.attribute_type='GEOMETRY'
        mul=n.new('ShaderNodeVectorMath'); mul.operation='SCALE'; mul.inputs[3].default_value=37.0
        cv=n.new('ShaderNodeCombineXYZ'); link(nt,at.outputs['Fac'],cv.inputs[0]); link(nt,at.outputs['Fac'],cv.inputs[1]); link(nt,at.outputs['Fac'],cv.inputs[2])
        link(nt,cv.outputs[0],mul.inputs[0])
        add=n.new('ShaderNodeVectorMath'); add.operation='ADD'; link(nt,src,add.inputs[0]); link(nt,mul.outputs[0],add.inputs[1]); src=add.outputs[0]
    link(nt,src,mp.inputs[0]); return mp.outputs[0]

def wood(name,light,dark,axis='Y',grain=6.0,rough=0.55,bump=0.35):
    """Stylised wood: thin wavy dark grain lines along the board, a few knots, per-board tone, bump into the lighting."""
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    p.inputs["Roughness"].default_value=rough; p.inputs["Specular IOR Level"].default_value=0.25
    co=_coord(nt,(1,1,1))
    sep=n.new('ShaderNodeSeparateXYZ'); link(nt,co,sep.inputs[0])
    across={'X':'Y','Y':'X','Z':'X'}[axis]; across2={'X':'Z','Y':'Z','Z':'Y'}[axis]
    # slow wobble along the board
    wob=n.new('ShaderNodeTexNoise'); wob.inputs['Scale'].default_value=1.6; wob.inputs['Detail'].default_value=2; link(nt,co,wob.inputs[0])
    wv=n.new('ShaderNodeMath'); wv.operation='MULTIPLY'; wv.inputs[1].default_value=0.04; link(nt,wob.outputs['Fac'],wv.inputs[0])
    sx=n.new('ShaderNodeMath'); sx.operation='ADD'; link(nt,sep.outputs[across],sx.inputs[0]); link(nt,wv.outputs[0],sx.inputs[1])
    sx2=n.new('ShaderNodeMath'); sx2.operation='ADD'; link(nt,sx.outputs[0],sx2.inputs[0]); link(nt,sep.outputs[across2],sx2.inputs[1])
    g1=n.new('ShaderNodeMath'); g1.operation='MULTIPLY'; g1.inputs[1].default_value=grain*14; link(nt,sx2.outputs[0],g1.inputs[0])
    sn=n.new('ShaderNodeMath'); sn.operation='SINE'; link(nt,g1.outputs[0],sn.inputs[0])
    # second finer grain set
    g2=n.new('ShaderNodeMath'); g2.operation='MULTIPLY'; g2.inputs[1].default_value=grain*37; link(nt,sx2.outputs[0],g2.inputs[0])
    sn2=n.new('ShaderNodeMath'); sn2.operation='SINE'; link(nt,g2.outputs[0],sn2.inputs[0])
    l1=n.new('ShaderNodeMapRange'); l1.inputs[1].default_value=0.88; l1.inputs[2].default_value=1.0; link(nt,sn.outputs[0],l1.inputs[0])
    l2=n.new('ShaderNodeMapRange'); l2.inputs[1].default_value=0.93; l2.inputs[2].default_value=1.0; l2.inputs[4].default_value=0.55; link(nt,sn2.outputs[0],l2.inputs[0])
    gl=n.new('ShaderNodeMath'); gl.operation='MAXIMUM'; link(nt,l1.outputs[0],gl.inputs[0]); link(nt,l2.outputs[0],gl.inputs[1])
    knots=n.new('ShaderNodeTexVoronoi'); knots.inputs['Scale'].default_value=0.9; link(nt,co,knots.inputs[0])
    kr=n.new('ShaderNodeMapRange'); kr.inputs[1].default_value=0.0; kr.inputs[2].default_value=0.035; kr.inputs[3].default_value=1; kr.inputs[4].default_value=0
    link(nt,knots.outputs['Distance'],kr.inputs[0])
    g=n.new('ShaderNodeMath'); g.operation='MAXIMUM'; link(nt,gl.outputs[0],g.inputs[0]); link(nt,kr.outputs[0],g.inputs[1])
    # soft tonal streaks
    st=n.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value=3.0; st.inputs['Detail'].default_value=3; link(nt,co,st.inputs[0])
    base=n.new('ShaderNodeMix'); base.data_type='RGBA'; link(nt,st.outputs['Fac'],base.inputs['Factor'])
    base.inputs['A'].default_value=(*[c*0.88 for c in light],1); base.inputs['B'].default_value=(*[min(1,c*1.08) for c in light],1)
    cr=n.new('ShaderNodeMix'); cr.data_type='RGBA'; link(nt,g.outputs[0],cr.inputs['Factor']); link(nt,base.outputs['Result'],cr.inputs['A']); cr.inputs['B'].default_value=(*dark,1)
    at=n.new('ShaderNodeAttribute'); at.attribute_name='rand'; at.attribute_type='GEOMETRY'
    tone=n.new('ShaderNodeMapRange'); tone.inputs[3].default_value=0.84; tone.inputs[4].default_value=1.08; link(nt,at.outputs['Fac'],tone.inputs[0])
    mul=n.new('ShaderNodeMix'); mul.data_type='RGBA'; mul.blend_type='MULTIPLY'; mul.inputs['Factor'].default_value=1
    link(nt,cr.outputs['Result'],mul.inputs['A']); link(nt,tone.outputs[0],mul.inputs['B']); link(nt,mul.outputs['Result'],p.inputs['Base Color'])
    bp=n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value=bump; bp.inputs['Distance'].default_value=0.003; bp.invert=True
    link(nt,g.outputs[0],bp.inputs['Height']); link(nt,bp.outputs[0],p.inputs['Normal'])
    return m

def painted(name,col,grime=(0.35,0.3,0.25),rough=0.8,bump=0.25,brush=40.0):
    """Painted surface: brush-stroke texture, slight dents, grime toward the floor."""
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    p.inputs["Roughness"].default_value=rough; p.inputs["Specular IOR Level"].default_value=0.15
    co=_coord(nt,(brush,brush,brush*0.25),rand_offset=True)
    st=n.new('ShaderNodeTexNoise'); st.inputs['Scale'].default_value=1.0; st.inputs['Detail'].default_value=6; st.inputs['Roughness'].default_value=0.6; link(nt,co,st.inputs[0])
    co2=_coord(nt,(3,3,3),rand_offset=False)
    big=n.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value=1.2; big.inputs['Detail'].default_value=3; link(nt,co2,big.inputs[0])
    # grime: darker toward the floor (z low)
    tc=n.new('ShaderNodeTexCoord'); sep=n.new('ShaderNodeSeparateXYZ'); link(nt,tc.outputs['Object'],sep.inputs[0])
    gz=n.new('ShaderNodeMapRange'); gz.inputs[1].default_value=0.0; gz.inputs[2].default_value=0.9; gz.inputs[3].default_value=0.22; gz.inputs[4].default_value=0.0
    link(nt,sep.outputs['Z'],gz.inputs[0])
    gm=n.new('ShaderNodeMath'); gm.operation='MULTIPLY'; link(nt,gz.outputs[0],gm.inputs[0]); link(nt,big.outputs['Fac'],gm.inputs[1])
    c1=n.new('ShaderNodeMix'); c1.data_type='RGBA'; c1.blend_type='MULTIPLY'; c1.inputs['A'].default_value=(*col,1)
    link(nt,st.outputs['Color'],c1.inputs['B']); c1.inputs['Factor'].default_value=0.12
    c2=n.new('ShaderNodeMix'); c2.data_type='RGBA'; link(nt,gm.outputs[0],c2.inputs['Factor']); link(nt,c1.outputs['Result'],c2.inputs['A']); c2.inputs['B'].default_value=(*grime,1)
    link(nt,c2.outputs['Result'],p.inputs['Base Color'])
    bp=n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value=bump; bp.inputs['Distance'].default_value=0.002
    link(nt,st.outputs['Fac'],bp.inputs['Height']); link(nt,bp.outputs[0],p.inputs['Normal'])
    return m

def fabric(name,col,col2,scale=60.0,bump=0.4):
    """Woven fabric / braided rug texture."""
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; p=n["Principled BSDF"]
    p.inputs["Roughness"].default_value=0.95; p.inputs["Specular IOR Level"].default_value=0.05
    co=_coord(nt,(scale,scale,scale),rand_offset=False)
    ch=n.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value=1.0; ch.inputs['Color1'].default_value=(*col,1); ch.inputs['Color2'].default_value=(*col2,1); link(nt,co,ch.inputs[0])
    nz=n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value=0.3; link(nt,co,nz.inputs[0])
    mx=n.new('ShaderNodeMix'); mx.data_type='RGBA'; mx.blend_type='MULTIPLY'; mx.inputs['Factor'].default_value=0.25
    link(nt,ch.outputs['Color'],mx.inputs['A']); link(nt,nz.outputs['Color'],mx.inputs['B']); link(nt,mx.outputs['Result'],p.inputs['Base Color'])
    bp=n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value=bump; bp.inputs['Distance'].default_value=0.002
    link(nt,ch.outputs['Fac'],bp.inputs['Height']); link(nt,bp.outputs[0],p.inputs['Normal'])
    return m
