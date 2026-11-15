"""SAMPLE export (animated): like export_scene.py, but the lens and each character's body / hat are separate movable parts,
limbs and outlines are rebuilt live in three.js.

Export the LOCKED v12 frame (look_dev/still_v12_LOCKED.py) for three.js — surfaces only, NO lighting baked:
  - room / outside / characters each joined into one mesh with an atlas: base colour (DIFFUSE colour), relief (tangent normal map),
    glow (EMIT, float EXR)
  - heads exported plain (three.js draws the flat 2D face with its own shader), outline rings exported as dark meshes
  - scene.json: camera, lights (Blender units), head/face parameters, sky image
Usage: python export_scene.py OUT_DIR"""
import sys, os, json, math, shutil
OUTD = os.path.abspath(sys.argv[1]); os.makedirs(OUTD, exist_ok=True)
ROOT = "/home/user/Med/production"
sys.argv = [sys.argv[0], os.path.join(OUTD, "_still.exr"), "100", "8"]
src = open(f"{ROOT}/look_dev/still_v12_LOCKED.py").read()
src = src.replace("sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)", "__EXPORT__()")

def __EXPORT__():
    import bpy
    from mathutils import Vector
    sys.path.insert(0, f"{ROOT}/pipeline"); import bake as B
    sc = bpy.context.scene; cam = sc.camera
    info = {"camera": {"matrix": [list(r) for r in cam.matrix_world], "lens": cam.data.lens, "sensor": cam.data.sensor_width,
                       "res": [sc.render.resolution_x, sc.render.resolution_y]}, "lights": [], "heads": []}
    for o in bpy.data.objects:
        if o.type == 'LIGHT':
            d = o.data; fwd = o.matrix_world.to_3x3() @ Vector((0, 0, -1))
            info["lights"].append({"type": d.type, "pos": list(o.matrix_world.translation), "dir": list(fwd), "color": list(d.color),
                                   "energy": d.energy, "spot": getattr(d, "spot_size", 0), "blend": getattr(d, "spot_blend", 0),
                                   "size": getattr(d, "shadow_soft_size", 0) if d.type != 'AREA' else d.size})
    lamp = Vector((0.0, 0.3, 1.5))
    for o in bpy.data.objects:
        if o.name.endswith("_head") and o.type == 'MESH':
            key = o.name[:-5]; proj = bpy.data.objects[key + "_faceproj"]; m = o.data.materials[0]
            img = [n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'][0].image
            png = os.path.basename(img.filepath); srcp = bpy.path.abspath(img.filepath)
            if os.path.abspath(srcp) != os.path.join(OUTD, png): shutil.copy(srcp, os.path.join(OUTD, png))
            X = proj.matrix_world.to_3x3().col[0]; Y = proj.matrix_world.to_3x3().col[1]; hc = proj.matrix_world.translation
            vs = [v.co for v in o.data.vertices]; R = (max(v.x for v in vs) - min(v.x for v in vs)) / 2
            info["heads"].append({"key": key, "center": list(hc), "X": list(X), "Y": list(Y), "R": R, "face": png,
                                  "drop": 0.10 * R if key == "keeper" else 0.0, "light_side": 1.0 if (lamp - hc).dot(X) > 0 else -1.0})
    shutil.copy(os.path.join(OUTD, "sky_night_v12.png"), os.path.join(OUTD, "sky.png"))
    # ---- sort objects into groups
    skip = lambda o: o.name in ("sky",) or o.name.startswith(("dust", "cam_target"))
    groups = {}; heads = []; setin, setout = [], []
    BODY = ("_torso", "_btn", "_placket", "_pocket"); HAT = ("_beanie", "_cuff", "_pom", "_hair")
    for o in list(bpy.data.objects):
        if o.type not in ('MESH', 'CURVE', 'FONT') or skip(o): continue
        n = o.name; base = n.split(".")[0]
        if n.startswith("MOV_lens"): groups.setdefault("lens", []).append(o); continue
        if n.startswith(("keeper", "engineer")):
            key = n.split("_")[0]
            if base.endswith("_head"): heads.append(o)
            elif base.endswith(BODY): groups.setdefault(key + "_body", []).append(o)
            elif base.endswith(HAT): groups.setdefault(key + "_hat", []).append(o)
            continue                                   # limbs, joints, outline rings: rebuilt live in three.js
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]; c = sum(bb, Vector()) / 8; size = max((bb[6] - bb[0]).length, 0)
        (setin if (c.xy.length < 3.6 and -0.5 < c.z < 4.5 and size < 9) else setout).append(o)
    for o in [x for g in groups.values() for x in g] + setin + setout + heads:
        for md in [m for m in o.modifiers if m.type == 'SOLIDIFY']: o.modifiers.remove(md)
    info["chars"] = {k: {"base": list(G[p]), "yaw": G[y], "hip": 0.64, "top": 0.64 + 2 * 0.31, "R": 0.29, "hat": k == "keeper"}
                     for k, p, y in (("keeper", "KP", "yaw_k"), ("engineer", "EP", "yaw_e"))}
    for o in heads: info["chars"][o.name.split("_")[0]]["head_center"] = list(sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8)
    info["lens_axis"] = [0.0, 0.3]
    out = []
    for name, objs, size in [("set_in", setin, 4096), ("set_out", setout, 2048)] + [(k, v, 1024) for k, v in groups.items()]:
        objs = B.to_mesh(objs); j = B.join(objs, name); B.unwrap([j], margin=0.002)
        alb = B.bake_pass([j], 'DIFFUSE', size, 1, filt=['COLOR'])
        sc.render.bake.normal_space = 'TANGENT'; nrm = B.bake_pass([j], 'NORMAL', size, 1)
        emi = B.bake_pass([j], 'EMIT', size, 1)
        import numpy as np
        from PIL import Image
        a = B.img_np(alb); nm = B.img_np(nrm); e = B.img_np(emi)
        print("STATS", name, a.mean(), nm.mean(), e.max(), flush=True)
        srgb = lambda x: np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(np.clip(x, 0, None), 1 / 2.4) - 0.055)
        Image.fromarray((np.clip(srgb(a), 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUTD, f"{name}_albedo.png"))
        Image.fromarray((np.clip(nm, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUTD, f"{name}_normal.png"))
        Image.fromarray((np.clip(srgb(e / 16.0), 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUTD, f"{name}_emit.png"))   # x16 in three.js
        # replace materials by one plain material (keeps glTF clean); UV "bake" becomes the only UV map
        j.data.materials.clear(); m = bpy.data.materials.new(name + "_mat"); j.data.materials.append(m)
        for uv in [u for u in j.data.uv_layers if u.name != "bake"]: j.data.uv_layers.remove(uv)
        out.append(j)
    for o in heads:
        o.data.materials.clear(); m = bpy.data.materials.new(o.name + "_mat"); o.data.materials.append(m); out.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in out: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUTD, "scene.glb"), use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=True, export_normals=True, export_tangents=True, export_materials='PLACEHOLDER')
    json.dump(info, open(os.path.join(OUTD, "scene.json"), "w"), indent=1)
    print("EXPORT DONE", OUTD)

G = {"__EXPORT__": __EXPORT__, "__name__": "__export__"}
exec(compile(src, "still_v12_LOCKED.py", "exec"), G)
