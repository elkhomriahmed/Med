"""Fast pipeline: bake lighting + ink lines into one texture atlas, then render frames with Workbench (~1 s/frame)."""
import bpy, bmesh, math, os, time
import numpy as np
from toon import INK

def to_mesh(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.convert(target='MESH')
    return [o for o in bpy.context.selected_objects]

def join(objs,name):
    """Merge into one mesh (Cycles bakes one object fast, hundreds slowly). Per-object random shade kept as attribute 'rand'."""
    import random
    for o in objs:
        oc=o.data.attributes.new("ocoord",'FLOAT_VECTOR','POINT')   # original object-space coords (patterns/decals survive the join)
        co=[0.0]*(3*len(o.data.vertices)); o.data.vertices.foreach_get("co",co); oc.data.foreach_set("vector",co)
        for m in o.data.materials:
            if not m or not m.node_tree or m.get("ocoord_done"): continue
            nt=m.node_tree
            for tc in [n for n in nt.nodes if n.type=='TEX_COORD']:
                links=[l for l in nt.links if l.from_node==tc and l.from_socket.name=='Object']
                if not links: continue
                at=nt.nodes.new('ShaderNodeAttribute'); at.attribute_name="ocoord"; at.attribute_type='GEOMETRY'
                for l in links: nt.links.new(at.outputs['Vector'],l.to_socket)
            m["ocoord_done"]=1
        a=o.data.attributes.get("rand") or o.data.attributes.new("rand",'FLOAT','POINT')
        r=random.random(); a.data.foreach_set("value",[r]*len(o.data.vertices))
        if len(o.data.uv_layers): o.data.uv_layers[0].name="UVMap"
        else: o.data.uv_layers.new(name="UVMap")
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.join(); j=bpy.context.view_layer.objects.active; j.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=False)
    return j

def unwrap(objs,margin=0.003):
    for o in objs:
        if "bake" not in o.data.uv_layers:
            if len(o.data.uv_layers)==0: o.data.uv_layers.new(name="UVMap")
            o.data.uv_layers[0].active_render=True
            uv=o.data.uv_layers.new(name="bake")
        o.data.uv_layers.active=o.data.uv_layers["bake"]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=0.0,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT'); bpy.ops.uv.average_islands_scale()
    bpy.ops.uv.pack_islands(rotate=True,margin=margin,shape_method='CONCAVE') if True else None   # guarantees no overlapping islands
    bpy.ops.object.mode_set(mode='OBJECT')

def _target(objs,img):
    seen=set()
    for o in objs:
        for m in o.data.materials:
            if not m or m.name in seen: continue
            seen.add(m.name); nt=m.node_tree
            n=nt.nodes.get("__bake") or nt.nodes.new('ShaderNodeTexImage'); n.name="__bake"; n.image=img
            for x in nt.nodes: x.select=False
            n.select=True; nt.nodes.active=n

def bake_pass(objs,kind,size,samples,filt=None,float_buf=True):
    img=bpy.data.images.new(f"bake_{kind}_{'_'.join(sorted(filt or []))}",size,size,float_buffer=float_buf,alpha=False)
    _target(objs,img); sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=samples; sc.cycles.use_denoising=False; sc.cycles.sample_clamp_direct=6; sc.cycles.sample_clamp_indirect=1.5
    sc.render.bake.margin=6; sc.render.bake.use_clear=True
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]
    t=time.time()
    if filt: bpy.ops.object.bake(type=kind,pass_filter=set(filt))
    else: bpy.ops.object.bake(type=kind)
    print(f"BAKE {kind} {filt} {size}px {samples}spp {time.time()-t:.1f}s",flush=True)
    return img

def img_np(img):
    a=np.empty(img.size[0]*img.size[1]*4,np.float32); img.pixels.foreach_get(a); return a.reshape(img.size[1],img.size[0],4)[::-1,:,:3].copy()   # top row first (matches ink mask + PIL)

def ink_mask(objs,size,width_px,min_angle=40,skip=()):
    """Rasterise sharp edges (crease > min_angle, or open borders) in bake-UV space -> ink line mask."""
    from PIL import Image, ImageDraw
    m=Image.new("L",(size,size),0); d=ImageDraw.Draw(m)
    for o in objs:
        if o.name.startswith(skip) or o.get("no_ink"): continue
        bm=bmesh.new(); bm.from_mesh(o.data); uvl=bm.loops.layers.uv["bake"]
        for f in bm.faces:
            for l in f.loops:
                e=l.edge
                if len(e.link_faces)==2:
                    ang=math.degrees(e.calc_face_angle(0))
                    if ang<min_angle: continue
                a=l[uvl].uv; b=l.link_loop_next[uvl].uv
                d.line([(a.x*size,(1-a.y)*size),(b.x*size,(1-b.y)*size)],fill=255,width=width_px)
        bm.free()
    return np.asarray(m,np.float32)/255.0

def compose(alb,light,emit,ink,exposure=1.0,sat=1.15,contrast=1.12,gloss=None):
    """final = albedo * light + emission, gentle filmic curve, saturation, ink lines."""
    import cv2  # only for fast resize
    H=alb.shape[0]
    L=cv2.resize(light,(H,H),interpolation=cv2.INTER_CUBIC); E=cv2.resize(emit,(H,H),interpolation=cv2.INTER_CUBIC)
    c=alb*L*exposure+E
    if gloss is not None: c=c+cv2.resize(gloss,(H,H),interpolation=cv2.INTER_CUBIC)*exposure
    c=c/(1+0.35*c)*1.35            # soft shoulder so lamps/sun don't clip harshly
    c=np.clip(c,0,1)**(1/2.2)      # linear -> display
    c=np.clip(0.5+(c-0.5)*contrast,0,1)  # contrast around mid-grey
    g=c.mean(-1,keepdims=True); c=np.clip(g+(c-g)*sat,0,1)
    k=cv2.GaussianBlur(ink,(0,0),0.8)[...,None]
    c=c*(1-k)+np.array([x**(1/2.2) for x in INK])*k
    return c

def apply_baked(objs,final,name="atlas"):
    """Swap every material for one flat texture material using the baked atlas (what Workbench shows)."""
    H=final.shape[0]; img=bpy.data.images.new(name,H,H,alpha=False)
    rgba=np.concatenate([final[::-1],np.ones((H,H,1),np.float32)],-1)   # numpy rows top->bottom, Blender bottom->top
    img.pixels.foreach_set(rgba.astype(np.float32).ravel()); img.pack()
    m=bpy.data.materials.new(name); m.use_nodes=True; nt=m.node_tree; n=nt.nodes; n.clear()
    out=n.new('ShaderNodeOutputMaterial'); em=n.new('ShaderNodeEmission'); uv=n.new('ShaderNodeUVMap'); uv.uv_map="bake"
    t=n.new('ShaderNodeTexImage'); t.image=img; nt.links.new(uv.outputs[0],t.inputs[0]); nt.links.new(t.outputs[0],em.inputs[0]); nt.links.new(em.outputs[0],out.inputs[0]); n.active=t
    for o in objs:
        o.data.materials.clear(); o.data.materials.append(m)
        o.data.polygons.foreach_set("material_index",[0]*len(o.data.polygons))
        for l in [l.name for l in o.data.uv_layers if l.name!="bake"]: o.data.uv_layers.remove(o.data.uv_layers[l])
        o.data.uv_layers["bake"].active=True; o.data.uv_layers["bake"].active_render=True
    return m

def ink_shell(objs,thick=0.008,min_dim=0.0,wobble=0.0):
    """Inverted-hull silhouette lines; with Workbench backface culling only the back shell shows -> outline."""
    hm=bpy.data.materials.get("inkshell") or bpy.data.materials.new("inkshell")
    hm.diffuse_color=(*INK,1)
    for o in objs:
        if o.get("no_shell"): continue
        o.data.materials.append(hm); s=o.modifiers.new("shell",'SOLIDIFY'); s.thickness=thick
        if wobble:   # hand-drawn line: thickness varies smoothly along the outline
            from mathutils import noise, Vector
            vg=o.vertex_groups.new(name="inkw")
            for v in o.data.vertices:
                w=0.5+0.5*noise.noise(Vector(v.co)*9.0); vg.add([v.index],max(0.0,min(1.0,w)),'REPLACE')
            s.vertex_group="inkw"; s.thickness_vertex_group=1.0-wobble; s.offset=1; s.use_flip_normals=True; s.material_offset=len(o.data.materials)-1; s.use_rim=False

def workbench(sc,aa='8'):
    sc.render.engine='BLENDER_WORKBENCH'; sh=sc.display.shading
    sh.light='FLAT'; sh.color_type='TEXTURE'; sh.show_backface_culling=True; sh.show_object_outline=False
    sh.show_cavity=False; sh.show_shadows=False; sc.display.render_aa=aa
    sc.view_settings.view_transform='Standard'; sc.view_settings.look='None'; sc.view_settings.exposure=0
