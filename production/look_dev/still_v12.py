"""Style v12 look-dev STILL: one frame of video 1 (lamp room, night, keeper + engineer at the lens, ~21 s "Son,").
Rendered with real light (Cycles) instead of bake + Workbench, and new character build:
  - head = sphere lit by the scene lights (warm lamp side, cool moon side), warm cream skin, darker ring inside the outline
  - face drawn ON the sphere (projected from the look direction), so it wraps around the head and is hidden by the hat
  - bean-shaped torso about as wide as the head, clothes with collar / placket / buttons / fabric bump
  - thicker warm-dark ink outline (inverted hull), ink limbs, mitten hands
Usage: python still_v12.py OUT.png [pct] [samples]"""
import sys, os, math
sys.path.insert(0, "/home/user/Med/production/pipeline"); sys.path.insert(0, "/home/user/Med/production/pipeline/sets")
import bpy, bmesh
from mathutils import Vector, Matrix
from toon import *
import toon
import lamp_room as LR
import exterior as EX

OUT = sys.argv[1]; PCT = int(sys.argv[2]) if len(sys.argv) > 2 else 50; SPP = int(sys.argv[3]) if len(sys.argv) > 3 else 64
FACES = "/home/user/Med/production/pipeline/assets/faces"
SCR = os.path.dirname(os.path.abspath(OUT))
INK_W = (0.11, 0.075, 0.06)          # warm dark-brown ink (competitor outline colour)
toon.INK = INK_W

sc = reset(pct=PCT)

# ------------------------------------------------------------------ world: lamp room + outside + sky
LR.build("night"); LR.lights("night")
EX.build("night")
bpy.ops.mesh.primitive_uv_sphere_add(radius=420, segments=64, ring_count=32); sky = bpy.context.object; sky.name = "sky"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
sm = bpy.data.materials.new("sky"); sm.use_nodes = True; nt = sm.node_tree; n = nt.nodes; n.clear()
o_ = n.new('ShaderNodeOutputMaterial'); em = n.new('ShaderNodeEmission'); tx = n.new('ShaderNodeTexImage')
tx.image = bpy.data.images.load(EX.sky_image("night")); em.inputs[1].default_value = 1.0
nt.links.new(tx.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], o_.inputs[0]); sky.data.materials.append(sm)
for p in sky.data.polygons: p.use_smooth = True
sky.visible_shadow = False

import random as _r
_r.seed(3)
for o in bpy.data.objects:
    if o.type == 'MESH' and "rand" not in o.data.attributes:
        a = o.data.attributes.new("rand", 'FLOAT', 'POINT'); v = _r.random(); a.data.foreach_set("value", [v] * len(o.data.vertices))
# set surfaces: more relief so they catch the light like the competitors' worlds (deeper bump, painted walls)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    for nd in m.node_tree.nodes:
        if nd.type == 'BUMP': nd.inputs['Strength'].default_value = min(1.0, nd.inputs['Strength'].default_value * 2.2)
wall = painted("lr_wall_v12", (0.66, 0.17, 0.13), grime=(0.28, 0.12, 0.08), bump=0.6, brush=30)
for o in bpy.data.objects:
    if o.name.startswith("lowwall"): o.data.materials[0] = wall
for o in bpy.data.objects:
    if o.name.startswith("pedestal"): o.data.materials[0] = painted("lr_pedestal", (0.55, 0.52, 0.48), grime=(0.25, 0.22, 0.2), bump=0.8, brush=18)
# ceiling: dark planked wood with rafters and an iron ring (was a flat pale copper cone)
roofw = wood("lr_ceiling", (0.36, 0.21, 0.11), (0.18, 0.10, 0.05), axis="Z", grain=9, bump=0.8)
bpy.data.objects["roof"].data.materials[0] = roofw
ironr = mat("lr_rafter_iron", (0.10, 0.10, 0.11), 0.4, 0.5)
for k in range(8):
    a = 2 * math.pi * k / 8 + math.pi / 8 * 0
    r0, z0, r1, z1 = 3.0, 2.97, 0.25, 4.05
    mid = Vector(((r0 + r1) / 2 * math.cos(a), (r0 + r1) / 2 * math.sin(a), (z0 + z1) / 2 - 0.06))
    ln = math.hypot(r0 - r1, z1 - z0); tilt = math.atan2(z1 - z0, r0 - r1)
    b = box(mid, (ln, 0.10, 0.12), wood("lr_rafter", (0.42, 0.25, 0.12), (0.22, 0.12, 0.06), axis="X", grain=7, bump=0.6), 0.01, rot=(0, tilt, a + math.pi), name="rafter")
torus((0, 0, 2.93), 2.75, 0.05, ironr, name="ceiling_ring")
cyl((0, 0, 3.9), 0.32, 0.25, ironr, verts=16, name="vent_hub")
# the lens: warm glow from inside without blowing out
for m in bpy.data.materials:
    if m.name.startswith("lens_glass"):
        p = m.node_tree.nodes["Principled BSDF"]; p.inputs["Emission Strength"].default_value = 0.10
        p.inputs["Transmission Weight"].default_value = 0.2; p.inputs["Base Color"].default_value = (1.0, 0.70, 0.30, 1)
    if m.name.startswith("lens_lamp"):
        m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 12.0

# ------------------------------------------------------------------ characters (style v12)
def warm_face(src):
    """Face sheet with the navy ink turned warm dark-brown (outline colour), white parts kept."""
    from PIL import Image
    import numpy as np
    dst = os.path.join(SCR, "v12_" + os.path.basename(src))
    im = np.asarray(Image.open(src).convert("RGBA")).astype(np.float32) / 255
    lum = im[..., :3].mean(-1, keepdims=True); dark = np.clip((0.45 - lum) / 0.45, 0, 1)
    im[..., :3] = im[..., :3] * (1 - dark) + np.array(INK_W) * dark
    Image.fromarray((im * 255).astype(np.uint8)).save(dst); return dst

def skin_mat(name, face_png, proj, R, skin=(0.95, 0.88, 0.78)):
    """Lit sphere skin + face projected from `proj` (local +Z = where the face looks) + darker ring inside the outline."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links
    p = n["Principled BSDF"]; p.inputs["Roughness"].default_value = 0.55; p.inputs["Specular IOR Level"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 0.08
    tc = n.new('ShaderNodeTexCoord'); tc.object = proj; sp = n.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sp.inputs[0])
    def lin(src, k, b):
        a = n.new('ShaderNodeMath'); a.operation = 'MULTIPLY_ADD'; a.inputs[1].default_value = k; a.inputs[2].default_value = b
        L.new(src, a.inputs[0]); return a.outputs[0]
    u = lin(sp.outputs['X'], 1 / (2.6 * R), 0.5); v = lin(sp.outputs['Y'], 1 / (2.6 * R), 0.5)
    cx = n.new('ShaderNodeCombineXYZ'); L.new(u, cx.inputs[0]); L.new(v, cx.inputs[1])
    im = n.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(face_png); im.extension = 'CLIP'; im.interpolation = 'Cubic'
    L.new(cx.outputs[0], im.inputs[0])
    front = n.new('ShaderNodeMapRange'); front.inputs[1].default_value = 0.05 * R; front.inputs[2].default_value = 0.25 * R
    L.new(sp.outputs['Z'], front.inputs[0])
    fa = n.new('ShaderNodeMath'); fa.operation = 'MULTIPLY'; L.new(im.outputs['Alpha'], fa.inputs[0]); L.new(front.outputs[0], fa.inputs[1])
    # darker ring toward the silhouette (light bounce / roundness): facing-based
    lw = n.new('ShaderNodeLayerWeight'); lw.inputs[0].default_value = 0.5
    ring = n.new('ShaderNodeMapRange'); ring.inputs[1].default_value = 0.35; ring.inputs[2].default_value = 0.95
    ring.inputs[3].default_value = 1.0; ring.inputs[4].default_value = 0.70; L.new(lw.outputs['Facing'], ring.inputs[0])
    sk = n.new('ShaderNodeMix'); sk.data_type = 'RGBA'; sk.blend_type = 'MULTIPLY'; sk.inputs['Factor'].default_value = 1
    sk.inputs['A'].default_value = (*skin, 1); cr = n.new('ShaderNodeCombineColor'); L.new(ring.outputs[0], cr.inputs[0]); L.new(ring.outputs[0], cr.inputs[1]); L.new(ring.outputs[0], cr.inputs[2])
    L.new(cr.outputs[0], sk.inputs['B'])
    mx = n.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L.new(fa.outputs[0], mx.inputs['Factor']); L.new(sk.outputs['Result'], mx.inputs['A']); L.new(im.outputs['Color'], mx.inputs['B'])
    L.new(mx.outputs['Result'], p.inputs['Base Color'])
    # ink stays ink: no specular on the drawn lines
    rr = n.new('ShaderNodeMapRange'); rr.inputs[3].default_value = 0.55; rr.inputs[4].default_value = 1.0; L.new(fa.outputs[0], rr.inputs[0]); L.new(rr.outputs[0], p.inputs['Roughness'])
    return m

def tweed(name, col, col2):
    m = fabric(name, col, col2, scale=34.0, bump=0.5); return m

def cloth(name, col, rib=0.0, bump=0.35):
    """Clothes: soft cloth with weave bump and gentle tonal variation (optional knit ribs)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links; p = n["Principled BSDF"]
    p.inputs["Roughness"].default_value = 0.85; p.inputs["Specular IOR Level"].default_value = 0.12; p.inputs["Sheen Weight"].default_value = 0.25
    tc = n.new('ShaderNodeTexCoord'); nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9; nz.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], nz.inputs[0])
    c = n.new('ShaderNodeMix'); c.data_type = 'RGBA'; c.inputs['A'].default_value = (*[x * 0.86 for x in col], 1); c.inputs['B'].default_value = (*[min(1, x * 1.08) for x in col], 1)
    L.new(nz.outputs['Fac'], c.inputs['Factor']); L.new(c.outputs['Result'], p.inputs['Base Color'])
    if rib:
        wv = n.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = rib; L.new(tc.outputs['Object'], wv.inputs[0]); h = wv.outputs['Fac']
    else:
        wv = n.new('ShaderNodeTexNoise'); wv.inputs['Scale'].default_value = 140; wv.inputs['Detail'].default_value = 2; L.new(tc.outputs['Object'], wv.inputs[0]); h = wv.outputs['Fac']
    bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.002
    L.new(h, bp.inputs['Height']); L.new(bp.outputs[0], p.inputs['Normal'])
    return m

INKM = bpy.data.materials.new("ink12"); INKM.use_nodes = True
pi_ = INKM.node_tree.nodes["Principled BSDF"]; pi_.inputs["Base Color"].default_value = (0.035, 0.022, 0.018, 1); pi_.inputs["Roughness"].default_value = 0.5

def orient(o, euler, pivot):
    """toon.box/sph/cyl bake the location into the mesh (origin at the world origin): rotate the mesh about its own pivot."""
    from mathutils import Euler
    P = Vector(pivot); o.data.transform(Matrix.Translation(P) @ Euler(euler).to_matrix().to_4x4() @ Matrix.Translation(-P)); o.data.update()

def ink_tube(pts, r, name):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('NURBS'); sp.points.add(len(pts) - 1); sp.order_u = 3; sp.use_endpoint_u = True
    for i, q in enumerate(pts): sp.points[i].co = (*q, 1)
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); cu.materials.append(INKM); return o

def egg(c, rx, ry, rz, taper, m, name):
    """Bean torso: sphere stretched tall, wider at the bottom."""
    o = sph(c, (rx, ry, rz), m, seg=48, name=name); c = Vector(c)
    for v in o.data.vertices:
        t = -(v.co.z - c.z) / rz
        f = 1 + taper * t; v.co.x = c.x + (v.co.x - c.x) * f; v.co.y = c.y + (v.co.y - c.y) * f
    for p in o.data.polygons: p.use_smooth = True
    return o

def mitten(c, d, m, name):
    """Small rounded mitten hand (palm + thumb), d = direction the hand points."""
    d = Vector(d).normalized()
    pal = sph(c, (0.045, 0.036, 0.05), m, seg=20, name=name)
    orient(pal, d.to_track_quat('Z', 'Y').to_euler(), c)
    th = sph(Vector(c) + Vector((0, -0.03, 0.02)), (0.018, 0.018, 0.026), m, seg=14, name=name + "_th")
    return pal, th

def character(key, base, yaw, look_at, expr, coat, coat_dark, hat=None, hair=None, collar=(0.95, 0.93, 0.88), pose="talk"):
    R = 0.29; x0, y0 = base; ca, sa = math.cos(yaw), math.sin(yaw)
    def W(px, py, pz):            # local (x right, y forward=-Y... body faces -Y rotated by yaw) -> world
        return Vector((x0 + px * ca - py * sa, y0 + px * sa + py * ca, pz))
    hip = 0.56; tz = hip + 0.36; head_z = tz + 0.40 + R * 0.62
    parts = []
    coatm = tweed(key + "_coat", coat, coat_dark) if key == "engineer" else cloth(key + "_coat", coat, rib=14, bump=0.25); darkm = cloth(key + "_coatd", coat_dark, bump=0.2)
    t = egg(W(0, 0, tz), 0.30, 0.25, 0.44, 0.13, coatm, key + "_torso"); orient(t, (0, 0, yaw), W(0, 0, tz)); parts.append(t)
    # collar (two soft wedges) + placket + buttons + pocket flap
    cr = torus(W(0, 0, tz + 0.385), 0.135, 0.035, cloth(key + "_collar", collar), name=key + "_collar"); cr.scale = (1, 1, 0.6)
    bpy.ops.object.select_all(action='DESELECT'); cr.select_set(True); bpy.context.view_layer.objects.active = cr
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); parts.append(cr)
    pl = box(W(0, -0.245, tz - 0.02), (0.035, 0.02, 0.60), darkm, 0.008, rot=(0.0, 0, yaw), name=key + "_placket"); parts.append(pl)
    for k in range(4):
        z = tz + 0.22 - k * 0.15; yy = -0.25 * math.sqrt(max(0.0, 1 - ((z - tz) / 0.44) ** 2)) - 0.012
        parts.append(sph(W(0.0, yy, z), (0.022, 0.012, 0.022), mat(key + "_btn", (0.12, 0.08, 0.06), 0.4, 0.3), seg=12, name=key + "_btn"))
    for s in (-1, 1):
        yy = -0.25 * math.sqrt(1 - (0.12 / 0.44) ** 2) * (1 + 0.13 * 0.12 / 0.44) + 0.01
        parts.append(box(W(s * 0.15, yy, tz - 0.12), (0.12, 0.02, 0.05), darkm, 0.01, rot=(0, 0, yaw), name=key + "_pocket"))
    # head + face projector
    hc = W(0, 0, head_z)
    proj = bpy.data.objects.new(key + "_faceproj", None); sc.collection.objects.link(proj); proj.location = hc
    dv = (Vector(look_at) - hc); dv.z *= 0.3
    proj.rotation_euler = dv.normalized().to_track_quat('Z', 'Y').to_euler()
    face = warm_face(f"{FACES}/{key}_{expr}.png")
    head = sph(hc, (R, R * 0.96, R * 0.99), skin_mat(key + "_skin", face, proj, R), seg=64, name=key + "_head")
    for p in head.data.polygons: p.use_smooth = True
    parts.append(head)
    if hat == "beanie":
        knit = cloth(key + "_knit", (0.78, 0.12, 0.08), rib=55, bump=0.6)
        b = sph(hc, (R * 1.04, R * 1.01, R * 1.26), knit, seg=48, name=key + "_beanie")
        bm = bmesh.new(); bm.from_mesh(b.data)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(hc.x, hc.y, hc.z + R * 0.42), plane_no=(0, 0.12, 1), clear_inner=True)
        bm.to_mesh(b.data); bm.free(); orient(b, (0, 0, yaw), hc)
        for p in b.data.polygons: p.use_smooth = True
        cuff = cyl(Vector(hc) + Vector((0, 0, R * 0.47)), R * 1.03, R * 0.26, cloth(key + "_cuff", (0.66, 0.09, 0.06), rib=55, bump=0.6), verts=64, rot=(0.12, 0, yaw), bevel=0, name=key + "_cuff")
        bv = cuff.modifiers.new("r", 'BEVEL'); bv.width = R * 0.09; bv.segments = 5
        for p in cuff.data.polygons: p.use_smooth = True
        pom = sph(Vector(hc) + Vector((0, 0.02, R * 1.30)), (R * 0.2,) * 3, cloth(key + "_pom", (0.95, 0.92, 0.86), bump=0.8), seg=24, name=key + "_pom")
        parts += [b, cuff, pom]
    if hair:
        hm = cloth(key + "_hair", hair, rib=30, bump=0.5)
        h = sph(hc, (R * 1.05, R * 1.0, R * 1.04), hm, seg=48, name=key + "_hair")
        bm = bmesh.new(); bm.from_mesh(h.data)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(hc.x, hc.y, hc.z + R * 0.30), plane_no=(0, 0.55, 1.0), clear_inner=True)
        bm.to_mesh(h.data); bm.free(); orient(h, (0, 0, yaw), hc)
        for p in h.data.polygons: p.use_smooth = True
        parts.append(h)
    # legs + boots
    for s in (-1, 1):
        ink_tube([W(s * 0.08, 0, hip + 0.10), W(s * 0.09, -0.02, hip * 0.5), W(s * 0.10, 0, 0.05)], 0.017, key + f"_leg{s}")
        bt = sph(W(s * 0.10, -0.04, 0.035), (0.055, 0.085, 0.04), INKM, seg=20, name=key + "_boot"); orient(bt, (0, 0, yaw), W(s * 0.10, -0.04, 0.035)); parts.append(bt)
    # arms: shoulder -> elbow -> mitten
    sh = {s: W(s * 0.25, -0.02, tz + 0.24) for s in (-1, 1)}
    if pose == "talk":     # one hand opens toward the partner, the other rests
        arms = {1: (W(0.36, -0.10, tz + 0.02), W(0.28, -0.30, tz + 0.14)), -1: (W(-0.33, -0.03, tz - 0.05), W(-0.30, -0.08, tz - 0.32))}
    else:                  # listening, skeptical: both hands on the hips, elbows out
        arms = {s: (W(s * 0.43, -0.02, tz + 0.02), W(s * 0.30, -0.08, tz - 0.20)) for s in (-1, 1)}
    for s in (-1, 1):
        el, hd = arms[s]; ink_tube([sh[s], el, hd], 0.016, key + f"_arm{s}")
        mitten(hd, hd - el, INKM, key + f"_hand{s}")
    for o in parts:
        if o.type == 'MESH': hull(o, 0.012)
    return head

# keeper (left) and engineer (right) face each other ~50 deg, both still open to the camera
KP = (-0.62, -0.62); EP = (0.62, -0.70)
CAMP = (0.05, -2.48, 1.20)
yaw_k = math.radians(50); yaw_e = math.radians(-45)   # +yaw turns the body (faces -Y) toward +X
def gaze(me, other, w=0.6):   # look ~50 deg toward the partner, still open to the camera
    a = Vector((other[0], other[1], 1.5)); c = Vector(CAMP); return tuple(a * w + c * (1 - w))
character("keeper", KP, yaw_k, gaze(KP, EP), "skeptical", (0.86, 0.62, 0.10), (0.62, 0.42, 0.05), hat="beanie", collar=(0.62, 0.42, 0.05), pose="listen")
character("engineer", EP, yaw_e, gaze(EP, KP), "happy_A", (0.40, 0.20, 0.08), (0.24, 0.11, 0.04), hair=(0.26, 0.13, 0.05), collar=(0.70, 0.72, 0.74), pose="talk")

# soft fill from the camera side so faces read (the lamp is the key light, the moon the cool rim)
bpy.ops.object.light_add(type='SPOT', location=(0.3, -2.3, 2.1)); f = bpy.context.object; f.data.energy = 110; f.data.color = (1.0, 0.80, 0.58)
f.data.spot_size = math.radians(48); f.data.spot_blend = 0.8; f.data.shadow_soft_size = 0.5
f.rotation_euler = (Vector((0, -0.66, 1.25)) - f.location).to_track_quat('-Z', 'Y').to_euler()
for o in bpy.data.objects:
    if o.type == 'LIGHT' and o.data.type == 'SUN': o.data.energy = 4.5

cam, tgt = camera(sc, CAMP, (0.0, -0.3, 1.12), lens=16, fstop=4.0)
cam.data.dof.focus_distance = 2.0; cam.data.clip_end = 1000
render_settings(sc, "CYCLES", samples=SPP, exposure=0.25)
# warm bounce under the roof + brighter hanging lantern (the competitors' interiors never fall to black)
bpy.ops.object.light_add(type='POINT', location=(0.0, 0.3, 2.75)); u = bpy.context.object.data; u.energy = 70; u.color = (1.0, 0.66, 0.36); u.shadow_soft_size = 0.8
for o in bpy.data.objects:
    if o.type == 'LIGHT' and o.data.type == 'POINT' and abs(o.location.x - 1.4) < 0.01: o.data.energy = 220
sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = -0.35
try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
sc.render.image_settings.file_format = "OPEN_EXR"; sc.render.image_settings.color_depth = "32"
sc.view_settings.view_transform = "Standard"; sc.view_settings.exposure = 0.0
sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)
print("STILL DONE", OUT)
