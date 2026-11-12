"""Extra render passes for the fast renderer (style v8), run per frame inside render_range.py:

  depth pass   - every vertex gets its camera-space depth written into a colour attribute (FLOAT_COLOR), then the scene is
                 rendered again with the renderer showing vertex colours (no lighting, no AA). Perspective-correct
                 interpolation makes camera-space depth exact on every flat polygon -> a real depth image.
                 R = depth / DEPTH_MAX, G = 1 on characters (actor mask), B = 0.  Saved as 16-bit PNG  d_####.png
  shadow map   - the characters alone, seen from the scene's main light (a camera at the light), as a silhouette.
                 Saved as 16-bit PNG  s_####.png  (R = light-space depth of the nearest character, 1 = nothing)
  matrices     - camera + light-camera matrices per frame (m_####.json) so post can rebuild world positions from depth
                 and test them against the shadow map (real shadow mapping in post).
"""
import bpy, json, math, os
import numpy as np
from mathutils import Vector, Matrix

DEPTH_MAX=40.0
ATTR="pass_depth"

def actors(sc):
    return {o for c in bpy.data.collections if c.name.startswith("PUPPET_") for o in c.all_objects}

def setup(sc):
    """Create the colour attribute on every mesh and cache static world coordinates."""
    st={"objs":[],"actors":actors(sc)}
    for o in sc.objects:
        if o.type!='MESH' or o.hide_render: continue
        me=o.data
        if ATTR not in me.color_attributes: me.color_attributes.new(ATTR,'FLOAT_COLOR','POINT')
        st["objs"].append(o)
    st["sky"]=[o for o in st["objs"] if o.name.startswith("LIVE_sky")]
    return st

def _write_depth(sc,st):
    dg=bpy.context.evaluated_depsgraph_get(); cam=sc.camera
    cm=cam.matrix_world; cpos=np.array(cm.translation); fwd=-np.array(cm.to_3x3().col[2])
    for o in st["objs"]:
        me=o.data; n=len(me.vertices)
        if n==0: continue
        ev=o.evaluated_get(dg); em=ev.data
        if len(em.vertices)!=n: continue
        co=np.empty(n*3,np.float32); em.vertices.foreach_get("co",co); co=co.reshape(n,3)
        M=np.array(o.matrix_world); w=co@M[:3,:3].T+M[:3,3]
        d=np.clip(((w-cpos)@fwd)/DEPTH_MAX,0,1)
        col=np.zeros((n,4),np.float32); col[:,0]=d; col[:,1]=1.0 if o in st["actors"] else 0.0; col[:,3]=1
        me.color_attributes[ATTR].data.foreach_set("color",col.ravel())
        me.color_attributes.active_color=me.color_attributes[ATTR]
        me.update()

def _state(sc):
    sh=sc.display.shading
    return dict(color_type=sh.color_type,light=sh.light,aa=sc.display.render_aa,dof=sh.use_dof,vt=sc.view_settings.view_transform,
                pct=sc.render.resolution_percentage,depth=sc.render.image_settings.color_depth)
def _restore(sc,s):
    sh=sc.display.shading; sh.color_type=s["color_type"]; sh.light=s["light"]; sc.display.render_aa=s["aa"]; sh.use_dof=s["dof"]
    sc.view_settings.view_transform=s["vt"]; sc.render.resolution_percentage=s["pct"]; sc.render.image_settings.color_depth=s["depth"]

def render_depth(sc,st,path,pct=50):
    _write_depth(sc,st); s=_state(sc); sh=sc.display.shading
    sh.color_type='VERTEX'; sh.light='FLAT'; sc.display.render_aa='OFF'; sh.use_dof=False
    try: sc.view_settings.view_transform='Raw'
    except Exception: sc.view_settings.view_transform='Standard'
    sc.render.resolution_percentage=pct; sc.render.image_settings.color_depth='16'
    hidden=[]
    for o in sc.objects:   # curves (ink limbs) have no attribute: hide them from the depth pass
        if o.type in('CURVE','FONT') and not o.hide_render: o.hide_render=True; hidden.append(o)
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
    for o in hidden: o.hide_render=False
    _restore(sc,s)

def light_cam(sc):
    """Camera at the scene's main light, aimed at the characters (sc['shadow_light'] = {pos, fov})."""
    L=json.loads(sc.get("shadow_light","{}") or "{}")
    if not L: return None
    lc=bpy.data.objects.get("PASS_lightcam")
    if lc is None:
        cd=bpy.data.cameras.new("PASS_lightcam"); lc=bpy.data.objects.new("PASS_lightcam",cd); sc.collection.objects.link(lc)
        cd.angle=math.radians(L.get("fov",120)); cd.clip_start=0.05; cd.clip_end=60
    act=[o for o in actors(sc) if o.type=='MESH']
    if not act: return None
    c=sum((o.matrix_world.translation for o in act),Vector())/len(act); c.z=max(c.z,0.6)
    p=Vector(L["pos"]); lc.location=p
    lc.rotation_euler=(c-p).to_track_quat('-Z','Y').to_euler()
    return lc

def render_shadowmap(sc,st,path,res=768):
    lc=light_cam(sc)
    if lc is None: return None
    s=_state(sc); sh=sc.display.shading; cam0=sc.camera; rx,ry=sc.render.resolution_x,sc.render.resolution_y
    act=st["actors"]; hidden=[]
    for o in sc.objects:
        if o.type in('MESH','CURVE','FONT') and o not in act and not o.hide_render: o.hide_render=True; hidden.append(o)
    # silhouette as depth from the light: reuse the depth attribute machinery with the light camera
    sc.camera=lc; bpy.context.view_layer.update(); _write_depth(sc,{"objs":[o for o in st["objs"] if o in act],"actors":act})
    sh.color_type='VERTEX'; sh.light='FLAT'; sc.display.render_aa='OFF'; sh.use_dof=False
    try: sc.view_settings.view_transform='Raw'
    except Exception: pass
    w0=sc.world.color.copy() if sc.world else None
    sc.render.resolution_x=res; sc.render.resolution_y=res; sc.render.resolution_percentage=100; sc.render.image_settings.color_depth='16'
    sc.render.film_transparent=True
    sc.render.filepath=path; bpy.ops.render.render(write_still=True)
    sc.render.film_transparent=False
    sc.camera=cam0; sc.render.resolution_x=rx; sc.render.resolution_y=ry
    for o in hidden: o.hide_render=False
    _restore(sc,s); bpy.context.view_layer.update()
    return lc

def matrices(sc,lc,path):
    def camdata(c,rx,ry):
        cd=c.data; M=[list(r) for r in c.matrix_world]; h=cd.sensor_width/2/cd.lens
        if rx>=ry: tw=h; th=h*ry/rx
        else: th=h; tw=h*rx/ry
        return dict(M=M,tw=tw,th=th)   # half view size at distance 1 (camera looks down -Z)
    r=sc.render; out={"cam":camdata(sc.camera,r.resolution_x,r.resolution_y),"depth_max":DEPTH_MAX}
    if lc is not None: out["light"]=camdata(lc,1,1)
    json.dump(out,open(path,"w"))
