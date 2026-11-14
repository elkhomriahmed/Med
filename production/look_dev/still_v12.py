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

def night_sky_v12():
    from PIL import Image, ImageDraw, ImageFilter
    import numpy as np
    src = Image.open(EX.sky_image("night")).convert("RGB"); W_, H_ = src.size; d = ImageDraw.Draw(src); rng = np.random.default_rng(12)
    a = np.asarray(src).astype(np.float32); v = np.arange(H_)[:, None]
    glow = np.exp(-((v - H_ * 0.5) / (H_ * 0.06)) ** 2)[..., None] * np.array([70, 60, 85])     # moonlit haze on the horizon
    src = Image.fromarray(np.clip(a + glow, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(src)
    for _ in range(420):
        x, y = rng.integers(0, W_), rng.integers(int(H_ * 0.30), int(H_ * 0.495)); r = rng.choice([0.6, 0.9, 1.3]); b = int(rng.uniform(150, 245))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(b, b, int(b * 0.95)))
    p = os.path.join(SCR, "sky_night_v12.png"); src.save(p); return p

# ------------------------------------------------------------------ world: lamp room + outside + sky
KP0 = (-0.62, -0.62)
LR.build("night"); LR.lights("night")
EX.build("night")
bpy.ops.mesh.primitive_uv_sphere_add(radius=420, segments=64, ring_count=32); sky = bpy.context.object; sky.name = "sky"
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
sm = bpy.data.materials.new("sky"); sm.use_nodes = True; nt = sm.node_tree; n = nt.nodes; n.clear()
o_ = n.new('ShaderNodeOutputMaterial'); em = n.new('ShaderNodeEmission'); tx = n.new('ShaderNodeTexImage')
tx.image = bpy.data.images.load(night_sky_v12()); em.inputs[1].default_value = 1.0
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
roofw = wood("lr_ceiling", (0.22, 0.15, 0.11), (0.10, 0.07, 0.05), axis="Z", grain=9, bump=0.8)
bpy.data.objects["roof"].data.materials[0] = roofw
ironr = mat("lr_rafter_iron", (0.10, 0.10, 0.11), 0.4, 0.5)
for k in range(8):
    a = 2 * math.pi * k / 8 + math.pi / 8 * 0
    r0, z0, r1, z1 = 3.0, 2.97, 0.25, 4.05
    mid = Vector(((r0 + r1) / 2 * math.cos(a), (r0 + r1) / 2 * math.sin(a), (z0 + z1) / 2 - 0.06))
    ln = math.hypot(r0 - r1, z1 - z0); tilt = math.atan2(z1 - z0, r0 - r1)
    b = box(mid, (ln, 0.10, 0.12), wood("lr_rafter", (0.30, 0.19, 0.11), (0.15, 0.09, 0.05), axis="X", grain=7, bump=0.6), 0.01, rot=(0, tilt, a + math.pi), name="rafter")
torus((0, 0, 2.93), 2.75, 0.05, ironr, name="ceiling_ring")
cyl((0, 0, 3.9), 0.32, 0.25, ironr, verts=16, name="vent_hub")
def text3d(name, txt, size, col, loc, rot, emit=0.2):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = txt; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.size = size; cu.extrude = 0.003
    cu.font = bpy.data.fonts.load("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", check_existing=True)
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o); cu.materials.append(mat(name + "_m", col, 0.6, 0.2, emit=emit))
    o.rotation_euler = rot; o.location = loc; return o
BX, BY, BR = 1.55, -0.15, -0.45
def bxy(dx, dy): return (BX + dx * math.cos(BR) - dy * math.sin(BR), BY + dx * math.sin(BR) + dy * math.cos(BR))
box((*bxy(0, 0), 1.05), (0.62, 0.04, 0.46), painted("chalk", (0.10, 0.14, 0.12), grime=(0.2, 0.22, 0.2), bump=0.3, brush=60), 0.01, rot=(0, 0, BR), name="chalkboard")
box((*bxy(0, 0.02), 1.05), (0.68, 0.035, 0.52), wood("chalk_frame", (0.55, 0.36, 0.18), (0.35, 0.22, 0.10), axis="X", grain=6), 0.008, rot=(0, 0, BR), name="chalkframe")
for dx in (-0.22, 0.22): cyl((*bxy(dx, 0.05), 0.42), 0.018, 0.84, wood("easel", (0.5, 0.32, 0.16), (0.32, 0.2, 0.1), axis="Z", grain=6), rot=(0.12, 0, BR), name="easel")
for txt, dz, sz in (("DAYS WITHOUT A", 0.13, 0.06), ("SHIPWRECK:", 0.04, 0.07), ("3", -0.11, 0.16)):
    text3d("chalktext", txt, sz, (0.92, 0.92, 0.86), (*bxy(0, -0.025), 1.05 + dz), (math.pi / 2, 0, BR), emit=0.15)
box((-1.05, 2.35, 1.78), (0.95, 0.04, 0.42), wood("sign_board", (0.55, 0.36, 0.18), (0.35, 0.22, 0.10), axis="X", grain=6), 0.01, rot=(0, 0, -0.35), name="signboard")
for txt, dz, sz in (("KEEPER OF THE YEAR", 0.07, 0.085), ("1871 - 1901", -0.08, 0.11)):
    text3d("signtext", txt, sz, (0.92, 0.80, 0.40), (-1.05 - 0.03 * math.sin(0.35), 2.35 - 0.03 * math.cos(0.35), 1.78 + dz), (math.pi / 2, 0, -0.35), emit=0.3)
import random as _rr
_rr.seed(8)
# dust in the lamp light (tiny glowing motes), denser near the lens
dustm = bpy.data.materials.new("dust"); dustm.use_nodes = True; _dn = dustm.node_tree.nodes; _dn.clear()
_do = _dn.new('ShaderNodeOutputMaterial'); _de = _dn.new('ShaderNodeEmission'); _de.inputs[0].default_value = (1.0, 0.85, 0.6, 1); _de.inputs[1].default_value = 6.0
dustm.node_tree.links.new(_de.outputs[0], _do.inputs[0])
for k in range(110):
    r = 0.65 + 1.4 * _rr.random() ** 1.5; a = _rr.uniform(0, 2 * math.pi); z = _rr.uniform(0.9, 2.6)
    p_ = (r * math.cos(a), 0.3 + r * math.sin(a), z)
    if p_[1] < 0.0: continue          # dust only around/behind the lens, never in front of the faces
    sph(p_, (0.004,) * 3, dustm, seg=6, name="dust").visible_shadow = False
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

def skin_mat(name, face_png, proj, R, shift=0.0, squeeze=1.0, light_side=1.0, drop=0.0, skin=(0.97, 0.965, 0.95)):
    """FLAT 2D face (competitor style): the head is a flat white disc as seen by the camera.
    - features are projected from the CAMERA direction (proj local +Z points at the camera), so they stay a flat drawing;
      the turn toward the partner is a sideways shift + slight horizontal squeeze of the drawing (no wrap-around)
    - no 3D sphere shading: flat colour (emission) + a soft 2D fade-shade on the side away from the light and a faint warm
      glow on the lit side (light_side = +1 when the key light is screen-right of the head, -1 when screen-left)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; n = nt.nodes; L = nt.links; n.clear()
    out = n.new('ShaderNodeOutputMaterial')
    tc = n.new('ShaderNodeTexCoord'); tc.object = proj; sp = n.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sp.inputs[0])
    def lin(src, k, b):
        a = n.new('ShaderNodeMath'); a.operation = 'MULTIPLY_ADD'; a.inputs[1].default_value = k; a.inputs[2].default_value = b
        L.new(src, a.inputs[0]); return a.outputs[0]
    FS = 2.15 * R   # drawing scale (smaller = more compact): features a compact group in the middle of the head
    u = lin(sp.outputs['X'], 1 / (FS * squeeze), 0.5 - shift / (FS * squeeze)); v = lin(sp.outputs['Y'], 1 / FS, 0.5 + drop / FS)
    cx = n.new('ShaderNodeCombineXYZ'); L.new(u, cx.inputs[0]); L.new(v, cx.inputs[1])
    im = n.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(face_png); im.extension = 'CLIP'; im.interpolation = 'Cubic'
    L.new(cx.outputs[0], im.inputs[0])
    # 2D side fade: g = 0 at the centre line .. 1 at the shaded edge (screen-space across the disc)
    g = lin(sp.outputs['X'], -light_side / R, 0.0)
    shade = n.new('ShaderNodeMapRange'); shade.interpolation_type = 'SMOOTHSTEP'; shade.inputs[1].default_value = -0.25; shade.inputs[2].default_value = 1.0
    L.new(g, shade.inputs[0])
    glow = n.new('ShaderNodeMapRange'); glow.interpolation_type = 'SMOOTHSTEP'; glow.inputs[1].default_value = -0.50; glow.inputs[2].default_value = 1.0
    L.new(lin(sp.outputs['X'], light_side / R, 0.0), glow.inputs[0])
    c1 = n.new('ShaderNodeMix'); c1.data_type = 'RGBA'; L.new(shade.outputs[0], c1.inputs['Factor'])
    c1.inputs['A'].default_value = (*skin, 1); c1.inputs['B'].default_value = (0.48, 0.48, 0.60, 1)       # soft cool-grey shade side
    c2 = n.new('ShaderNodeMix'); c2.data_type = 'RGBA'; L.new(glow.outputs[0], c2.inputs['Factor'])
    L.new(c1.outputs['Result'], c2.inputs['A']); c2.inputs['B'].default_value = (1.0, 0.68, 0.30, 1)       # warm lamp-beam light on the lit side
    gl = n.new('ShaderNodeMath'); gl.operation = 'MULTIPLY'; gl.inputs[1].default_value = 0.85; L.new(glow.outputs[0], gl.inputs[0]); L.new(gl.outputs[0], c2.inputs['Factor'])
    mx = n.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L.new(im.outputs['Alpha'], mx.inputs['Factor'])
    L.new(c2.outputs['Result'], mx.inputs['A']); L.new(im.outputs['Color'], mx.inputs['B'])
    em = n.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 6.0; L.new(mx.outputs['Result'], em.inputs['Color'])
    L.new(em.outputs[0], out.inputs['Surface'])
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

PCAP = 3.2
def cap_r(t):   # capsule-like profile: flat sides, rounded top and bottom
    return max(0.0, 1 - abs(t) ** PCAP) ** (1 / PCAP)
def egg(c, rx, ry, rz, taper, m, name):
    """Competitor torso: slim rounded capsule (flat-ish sides), slightly wider at the bottom."""
    o = sph(c, (rx, ry, rz), m, seg=256, name=name); c = Vector(c)
    for v in o.data.vertices:
        t = (v.co.z - c.z) / rz; ro = math.sqrt(max(1 - t * t, 0.0))
        f = (cap_r(t) / ro if ro > 1e-4 else 1.0) * (1 - taper * t)
        v.co.x = c.x + (v.co.x - c.x) * f; v.co.y = c.y + (v.co.y - c.y) * f
    for p in o.data.polygons: p.use_smooth = True
    return o

def mitten(c, d, m, name):
    """Small rounded mitten hand (palm + thumb), d = direction the hand points."""
    d = Vector(d).normalized()
    pal = sph(c, (0.045, 0.036, 0.05), m, seg=20, name=name)
    orient(pal, d.to_track_quat('Z', 'Y').to_euler(), c)
    th = sph(Vector(c) + Vector((0, -0.03, 0.02)), (0.018, 0.018, 0.026), m, seg=14, name=name + "_th")
    return pal, th

OUTM = bpy.data.materials.new("head_outline"); OUTM.use_nodes = True
_n = OUTM.node_tree.nodes; _n.clear(); _o = _n.new('ShaderNodeOutputMaterial'); _e = _n.new('ShaderNodeEmission'); _e.inputs[0].default_value = (*INK_W, 1)
_t = _n.new('ShaderNodeBsdfTransparent'); _lp = _n.new('ShaderNodeLightPath'); _m = _n.new('ShaderNodeMixShader')
OUTM.node_tree.links.new(_lp.outputs['Is Camera Ray'], _m.inputs[0]); OUTM.node_tree.links.new(_t.outputs[0], _m.inputs[1])
OUTM.node_tree.links.new(_e.outputs[0], _m.inputs[2]); OUTM.node_tree.links.new(_m.outputs[0], _o.inputs[0])

def head_outline(hc, R, cam, width=0.022, top_cut=None, name="outline"):
    """A drawn ring exactly on the head's silhouette as seen from the camera, placed 0.85 R in front of the head centre
    so the body never hides it (the full circle incl. the chin line over the body). top_cut: skip the arc above this height (hat)."""
    hc = Vector(hc); d = Vector(cam) - hc; D = d.length; nrm = d / D
    up = (Vector((0, 0, 1)) - nrm * nrm.z).normalized(); rt = up.cross(nrm)
    off = 0.85 * R; k = (D - off) / math.sqrt(D * D - R * R); r_in = R * k * 0.995; r_out = r_in + width * (D - off) / D
    c = hc + nrm * off; verts = []; faces = []; N = 240
    # HAND-DRAWN marker outline (competitor heads): the stroke eats irregularly into the head edge, so the visible head shape is a
    # slightly lumpy, not-perfect circle; the pen width varies along the stroke. Outer edge always covers the true silhouette.
    import random as _hr
    rg = _hr.Random(sum(map(ord, name))); ph = [rg.uniform(0, 6.283) for _ in range(7)]
    def bite(a): return min(0.13, max(0.010, 0.055 + 0.038 * math.sin(2 * a + ph[0]) + 0.022 * math.sin(3 * a + ph[1]) + 0.010 * math.sin(5 * a + ph[2]) + 0.006 * math.sin(8 * a + ph[6])))
    def wid(a): return 0.85 + 0.35 * math.sin(a + ph[3]) + 0.16 * math.sin(3 * a + ph[4]) + 0.08 * math.sin(6 * a + ph[5])
    wbase = width * (D - off) / D
    for i in range(N + 1):
        a = 2 * math.pi * i / N; dirv = rt * math.cos(a) + up * math.sin(a)
        ri = r_in * (1 - bite(a)); ro = max(r_in * 1.03, ri + wbase * wid(a))
        if top_cut is not None:   # the stroke tapers off as it runs under the hat brim (no blunt ends on the hat)
            t_ = max(0.0, min(1.0, (top_cut - math.sin(a) * R) / (0.12 * R))); ri = ro - (ro - ri) * (0.35 + 0.65 * t_)
        verts += [c + dirv * ri, c + dirv * ro]
    for i in range(N):
        a = 2 * math.pi * (i + 0.5) / N
        if top_cut is not None and math.sin(a) * R > top_cut: continue
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o); me.materials.append(OUTM); return o

def character(key, base, yaw, look_at, expr, coat, coat_dark, hat=None, hair=None, collar=(0.95, 0.93, 0.88), pose="talk"):
    R = 0.29; x0, y0 = base; ca, sa = math.cos(yaw), math.sin(yaw)
    def W(px, py, pz):            # local (x right, y forward=-Y... body faces -Y rotated by yaw) -> world
        return Vector((x0 + px * ca - py * sa, y0 + px * sa + py * ca, pz))
    TW, TD, TH, TP = 0.21, 0.15, 0.31, 0.06          # half width / depth / height, taper
    hip = 0.64; tz = hip + TH; top = tz + TH; head_z = top + R * 0.76   # head sits ON the body: chin outline shows
    def fy(z): t = (z - tz) / TH; return -TD * cap_r(t) * (1 - TP * t)   # front surface (local y) at height z
    parts = []
    coatm = tweed(key + "_coat", coat, coat_dark) if key == "engineer" else cloth(key + "_coat", coat, rib=14, bump=0.25); darkm = cloth(key + "_coatd", coat_dark, bump=0.2)
    t = egg(W(0, 0, tz), TW, TD, TH, TP, coatm, key + "_torso")
    if key == "engineer":   # open coat: a light-blue checked shirt down the front, painted into the torso surface (follows the curve)
        c0 = W(0, 0, tz); a = t.data.attributes.new("shirt", 'FLOAT', 'POINT'); vals = []
        for v in t.data.vertices:
            lx = v.co.x - c0.x; ly = v.co.y - c0.y          # mesh is still unrotated here (faces -Y)
            w = 0.055 + 0.025 * max(0.0, (v.co.z - tz) / TH)          # V-opening, wider toward the collar
            vals.append(1.0 if (abs(lx) < w and ly < 0) else 0.0)
        a.data.foreach_set("value", vals)
        nt = coatm.node_tree; n = nt.nodes; pb = n["Principled BSDF"]; src = pb.inputs['Base Color'].links[0].from_socket
        at = n.new('ShaderNodeAttribute'); at.attribute_name = "shirt"; at.attribute_type = 'GEOMETRY'
        edge = n.new('ShaderNodeMapRange'); edge.inputs[1].default_value = 0.45; edge.inputs[2].default_value = 0.55; nt.links.new(at.outputs['Fac'], edge.inputs[0])
        tc = n.new('ShaderNodeTexCoord'); ck = n.new('ShaderNodeTexChecker'); ck.inputs['Scale'].default_value = 70
        ck.inputs['Color1'].default_value = (0.55, 0.70, 0.88, 1); ck.inputs['Color2'].default_value = (0.40, 0.54, 0.74, 1); nt.links.new(tc.outputs['Object'], ck.inputs[0])
        mx = n.new('ShaderNodeMix'); mx.data_type = 'RGBA'; nt.links.new(edge.outputs[0], mx.inputs['Factor']); nt.links.new(src, mx.inputs['A']); nt.links.new(ck.outputs['Color'], mx.inputs['B'])
        nt.links.new(mx.outputs['Result'], pb.inputs['Base Color'])
    orient(t, (0, 0, yaw), W(0, 0, tz)); parts.append(t)
    # collar (two soft wedges) + placket + buttons + pocket flap
    pl = box(W(0, fy(tz) - 0.014, tz - 0.01), (0.03, 0.02, 0.46), darkm, 0.008, rot=(0.0, 0, yaw), name=key + "_placket"); parts.append(pl)
    for k in range(3):
        z = tz + 0.15 - k * 0.13; yy = fy(z) - 0.026
        parts.append(sph(W(0.0, yy, z), (0.022, 0.012, 0.022), mat(key + "_btn", (0.12, 0.08, 0.06), 0.4, 0.3), seg=12, name=key + "_btn"))
    for s in (-1, 1):
        yy = fy(tz - 0.10) - 0.004
        parts.append(box(W(s * 0.105, yy, tz - 0.10), (0.085, 0.02, 0.04), darkm, 0.01, rot=(0, 0, yaw), name=key + "_pocket"))
    # head + face projector
    hc = W(0, 0, head_z)
    tocam = Vector(CAMP) - hc; tocam.z = 0; hc = hc + tocam.normalized() * 0.10   # head always in front of the body from the camera
    proj = bpy.data.objects.new(key + "_faceproj", None); sc.collection.objects.link(proj); proj.location = hc
    tc_ = (Vector(CAMP) - hc).normalized(); proj.rotation_euler = tc_.to_track_quat('Z', 'Y').to_euler()   # faces the camera: flat drawing
    bpy.context.view_layer.update(); X = proj.matrix_world.to_3x3().col[0]
    lk = Vector(look_at) - hc; lk.z = 0; tch = Vector((tc_.x, tc_.y, 0))
    ang = min(0.87, lk.normalized().angle(tch.normalized()))                                  # how far the face turns (<= ~50 deg)
    side = 1.0 if lk.dot(X) > 0 else -1.0
    f_shift = side * math.sin(ang) * 0.62 * R; f_squeeze = 0.55 + 0.45 * math.cos(ang)
    lamp = Vector((LR.LENS_C[0], LR.LENS_C[1], 1.5)); l_side = 1.0 if (lamp - hc).dot(X) > 0 else -1.0
    face = warm_face(f"{FACES}/{key}_{expr}.png")
    head = sph(hc, (R, R * 0.96, R * 0.99), skin_mat(key + "_skin", face, proj, R, 0.0, 1.0, l_side, drop=(0.10 * R if hat else 0.0)), seg=64, name=key + "_head")   # features stay centred; the pupils look
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
        ank = W(s * 0.09, 0.0, 0.017); toe = W(s * 0.115, -0.105, 0.017)          # short forward foot stroke (an "L"), no boots
        ink_tube([W(s * 0.07, 0, hip + 0.10), W(s * 0.08, -0.02, hip * 0.5), ank], 0.015, key + f"_leg{s}")
        ink_tube([ank, (ank + toe) / 2, toe], 0.015, key + f"_foot{s}")
        for q in (ank, toe): sph(q, (0.015,) * 3, INKM, seg=12, name=key + "_joint")
    # arms: shoulder -> elbow -> mitten
    sh = {s: W(s * 0.185, -0.02, top - 0.14) for s in (-1, 1)}
    if pose == "talk":     # one hand opens toward the partner, the other rests
        arms = {1: (W(0.31, -0.10, tz + 0.04), W(0.25, -0.28, tz + 0.16)), -1: (W(-0.26, -0.03, tz - 0.06), W(-0.24, -0.07, tz - 0.30))}
    else:                  # listening, skeptical: both hands on the hips, elbows out
        arms = {s: (W(s * 0.36, -0.03, tz + 0.04), W(s * 0.215, -0.07, tz - 0.16)) for s in (-1, 1)}
    for s in (-1, 1):
        el, hd = arms[s]; ink_tube([sh[s], el, hd], 0.015, key + f"_arm{s}")
        d_ = (hd - el).normalized(); inward = (W(0, -0.05, hd.z) - hd); inward.z = 0
        tip = hd + (d_ * 0.35 + inward.normalized() * 0.55 + Vector((0, 0, 0.45))).normalized() * 0.038   # small finger hook
        ink_tube([hd, (hd + tip) / 2, tip], 0.014, key + f"_hand{s}")
        for q in (hd, tip): sph(q, (0.0145,) * 3, INKM, seg=12, name=key + "_joint")
    for o in parts:
        if o.type == 'MESH': hull(o, 0.006 if o.name.endswith("_head") else 0.012)
    head_outline(hc, R, CAMP, top_cut=(R * 0.47 if hat else (R * 0.25 if hair else None)), name=key + "_outline")
    return head

# keeper (left) and engineer (right) face each other ~50 deg, both still open to the camera
KP = (-0.62, -0.62); EP = (0.62, -0.70)
CAMP = (0.05, -2.48, 1.20)
yaw_k = math.radians(50); yaw_e = math.radians(-45)   # +yaw turns the body (faces -Y) toward +X
def gaze(me, other, w=0.6):   # look ~50 deg toward the partner, still open to the camera
    a = Vector((other[0], other[1], 1.5)); c = Vector(CAMP); return tuple(a * w + c * (1 - w))
character("keeper", KP, yaw_k, gaze(KP, EP), "skeptical_R", (0.86, 0.62, 0.10), (0.62, 0.42, 0.05), hat="beanie", collar=(0.62, 0.42, 0.05), pose="listen")
character("engineer", EP, yaw_e, gaze(EP, KP), "talk_A_L", (0.40, 0.20, 0.08), (0.24, 0.11, 0.04), hair=(0.26, 0.13, 0.05), collar=(0.70, 0.72, 0.74), pose="talk")

# soft fill from the camera side so faces read (the lamp is the key light, the moon the cool rim)
bpy.ops.object.light_add(type='SPOT', location=(0.3, -2.3, 2.1)); f = bpy.context.object; f.data.energy = 110; f.data.color = (1.0, 0.80, 0.58)
f.data.spot_size = math.radians(48); f.data.spot_blend = 0.8; f.data.shadow_soft_size = 0.5
f.rotation_euler = (Vector((0, -0.66, 1.25)) - f.location).to_track_quat('-Z', 'Y').to_euler()
for o in bpy.data.objects:
    if o.type == 'LIGHT' and o.data.type == 'SUN': o.data.energy = 7.0; o.data.color = (0.45, 0.58, 1.0)

cam, tgt = camera(sc, CAMP, (0.0, -0.3, 1.12), lens=16, fstop=4.0)
cam.data.dof.focus_distance = 2.0; cam.data.clip_end = 1000
render_settings(sc, "CYCLES", samples=SPP, exposure=0.25)
# warm bounce under the roof + brighter hanging lantern (the competitors' interiors never fall to black)
bpy.ops.object.light_add(type='POINT', location=(0.0, 0.3, 2.75)); u = bpy.context.object.data; u.energy = 35; u.color = (1.0, 0.66, 0.36); u.shadow_soft_size = 0.8
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
