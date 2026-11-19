"""FACE LIBRARY: many face identities in the exact project drawing style (same canvas, brush-stroke ink, flat white face),
each with the full set the characters code uses: 14 expressions x {plain, _talk, _A, _O, _E} x gaze {"", _L, _R} + _blink.
Identities differ in eye shape/size, brow style, eye spacing, mouth width, facial hair, glasses, freckles, lashes, wrinkles...
Usage (from production/): python -I kit/tools/face_library.py kit/public/faces [identity ...]   (no names = all)
Then: python -I kit/tools/face_index.py  (refresh characters/faceIndex.js) and see visual_library/FACES.md."""
import sys, os, math
from multiprocessing import Pool
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "pipeline"))
import faces as F
from PIL import Image, ImageDraw

# ------------------------------------------------------------------ identities (name -> look). Add new ones here, never edit old ones.
ID = {
 # young men
 "lib_youngman_a":   dict(desc="young man, small oval eyes, thick brows",               eyes="dot",   brows="thick",  ex=0.27, mouth=1.0),
 "lib_youngman_b":   dict(desc="young man, tall bean eyes, arched brows, freckles",      eyes="bean",  brows="arched", ex=0.26, mouth=1.05, freckles=True),
 "lib_toughguy":     dict(desc="tough guy, beady eyes, heavy unibrow, stubble",          eyes="beady", brows="unibrow", ex=0.25, mouth=1.15, hair="stubble"),
 "lib_nerd":         dict(desc="nerd, small oval eyes behind big round glasses, thin brows", eyes="dot", brows="thin",   ex=0.28, mouth=0.9, glasses="round"),
 "lib_sleepy":       dict(desc="tired guy, droopy eyes with bags, flat brows",           eyes="tired", brows="flat",   ex=0.27, mouth=1.0),
 # women
 "lib_woman_a":      dict(desc="woman, lashed oval eyes, thin arched brows, blush",      eyes="lash",  brows="arched_thin", ex=0.27, mouth=0.95, blush=True),
 "lib_woman_b":      dict(desc="woman, big lashed round eyes, thin brows, freckles",     eyes="lash_round", brows="thin", ex=0.28, mouth=0.9, freckles=True),
 "lib_woman_glasses":dict(desc="woman, lashed eyes, arched brows, square glasses",       eyes="lash",  brows="arched", ex=0.27, mouth=0.95, glasses="square"),
 "lib_oldwoman":     dict(desc="old woman, small lashed eyes, thin brows, wrinkles, round glasses", eyes="lash_small", brows="thin", ex=0.26, mouth=0.9, wrinkles=True, glasses="round"),
 # men with facial hair
 "lib_pencil":       dict(desc="man with a thin pencil moustache, thin brows",           eyes="dot",   brows="thin",   ex=0.26, mouth=0.95, hair="pencil"),
 "lib_goatee":       dict(desc="man with a goatee, beady eyes, thick brows",             eyes="beady", brows="thick",  ex=0.26, mouth=1.0, hair="goatee"),
 "lib_shortbeard":   dict(desc="man with a short trimmed beard, oval eyes",              eyes="dot",   brows="thick",  ex=0.27, mouth=1.0, hair="shortbeard"),
 "lib_oldman_moustache": dict(desc="old man, bushy brows, bushy scalloped moustache, wrinkles", eyes="tired", brows="bushy", ex=0.27, mouth=1.0, hair="bushy", wrinkles=True),
 "lib_oldman_handlebar": dict(desc="old man, handlebar moustache, bushy brows",          eyes="dot",   brows="bushy",  ex=0.27, mouth=1.0, hair="handlebar", wrinkles=True),
 # kids
 "lib_kid_a":        dict(desc="kid, big round eyes, thin brows, freckles, small mouth", eyes="round", brows="thin",   ex=0.29, mouth=0.8, freckles=True),
 "lib_kid_b":        dict(desc="kid, big lashed eyes, rosy cheeks, small mouth",         eyes="lash_round", brows="thin", ex=0.29, mouth=0.8, blush=True),
}
GAZE_GAIN = 1.9   # pupils shift ~0.12 R toward the look target (0.065 R read as "looking at the camera" on screen)
INK = F.INK; P = F.P; W = F.W; stroke = F.stroke; blob = F.blob; arc_pts = F.arc_pts

def eye(d, x, kind, s, L):
    """Expression eye `kind` drawn in the identity's eye style L['eyes']."""
    st = L["eyes"]; g = F.GAZE * 0.065; EY = F.EY
    sz = {"dot": 1.0, "bean": 1.0, "beady": 0.65, "round": 1.25, "tired": 0.95, "lash": 1.0, "lash_round": 1.25, "lash_small": 0.8}[st]
    if kind == "open":
        if st in ("round", "lash_round"):
            d.ellipse([*P(x - 0.11 * sz, EY + 0.11 * sz), *P(x + 0.11 * sz, EY - 0.11 * sz)], fill=F.WHITE, outline=INK, width=W(0.04))
            gr = max(-0.05 * sz, min(0.05 * sz, g))                       # keep the pupil inside the white
            d.ellipse([*P(x + gr - 0.055 * sz, EY + 0.055 * sz), *P(x + gr + 0.055 * sz, EY - 0.055 * sz)], fill=INK)
        elif st == "bean":
            d.ellipse([*P(x + g - 0.06, EY + 0.13), *P(x + g + 0.06, EY - 0.11)], fill=INK)
        else:
            d.ellipse([*P(x + g - 0.075 * sz, EY + 0.1 * sz), *P(x + g + 0.075 * sz, EY - 0.1 * sz)], fill=INK)
    elif kind == "lidded":
        r = 0.085 * sz
        d.pieslice([*P(x + g - r, EY + 0.07 * sz), *P(x + g + r, EY - 0.11 * sz)], 0, 180, fill=INK)
        stroke(d, [(x - 0.15 * sz, EY), (x + 0.13 * sz, EY + 0.0)], 0.06, 0.05, 0.075)
    elif kind == "wide":
        k = 1.15 if st in ("round", "lash_round") else 1.0
        d.ellipse([*P(x - 0.13 * k, EY + 0.15 * k), *P(x + 0.13 * k, EY - 0.15 * k)], fill=F.WHITE, outline=INK, width=W(0.045))
        gw = max(-0.07 * k, min(0.07 * k, g * 1.1))
        d.ellipse([*P(x + gw - 0.05, EY + 0.05), *P(x + gw + 0.05, EY - 0.05)], fill=INK)
    elif kind == "happy":
        stroke(d, arc_pts(x, EY - 0.03, 0.11 * sz ** 0.5, 0.09, 10, 170), 0.03, 0.03, 0.07)
    elif kind == "closed":
        stroke(d, arc_pts(x, EY + 0.04, 0.11, 0.06, 190, 350), 0.03, 0.03, 0.065)
    elif kind == "squint":
        stroke(d, [(x - 0.12, EY + 0.02), (x + 0.12, EY - 0.01)], 0.04, 0.04, 0.07)
    # identity details on top of the expression eye
    if st.startswith("lash") and kind in ("open", "lidded", "wide", "happy"):
        top = EY + (0.15 if kind == "wide" else 0.11 * sz)
        for i, dx in enumerate((-0.06, 0.0, 0.06)):
            ox = x + s * (0.09 + 0.02 * i) * 0 + dx * sz + (s * 0.05)
            stroke(d, [(ox, top - 0.01), (ox + s * 0.04, top + 0.05)], 0.02, 0.012, 0.025)
    if st == "tired" and kind in ("open", "lidded", "wide"):
        stroke(d, arc_pts(x, EY - 0.1, 0.09, 0.035, 200, 340), 0.012, 0.012, 0.022)          # eye bag

def brow(d, x, kind, s, L):
    st = L["brows"]; by = F.EY + 0.22 + (0.03 if L["eyes"] in ("round", "lash_round") else 0)
    shapes = {"calm": [(x + 0.13 * s, by - 0.01), (x, by + 0.02), (x - 0.13 * s, by)],
              "raised": [(x + 0.13 * s, by + 0.04), (x, by + 0.1), (x - 0.13 * s, by + 0.05)],
              "angry": [(x + 0.14 * s, by + 0.06), (x, by + 0.02), (x - 0.12 * s, by - 0.06)],
              "worried": [(x + 0.14 * s, by - 0.03), (x, by + 0.03), (x - 0.12 * s, by + 0.08)],
              "flat": [(x - 0.13, by), (x + 0.13, by)]}
    p = shapes[kind]
    if st in ("arched", "arched_thin") and kind in ("calm", "raised"):
        p = [(p[0][0], p[0][1] - 0.02), (p[1][0], p[1][1] + 0.04), (p[2][0], p[2][1] - 0.01)]
    if st == "flat" and kind == "calm": p = [(x - 0.13, by), (x + 0.13, by)]
    w = {"thick": (0.03, 0.05, 0.075), "thin": (0.018, 0.022, 0.035), "arched": (0.022, 0.03, 0.05), "arched_thin": (0.015, 0.018, 0.03),
         "bushy": (0.05, 0.07, 0.1), "unibrow": (0.045, 0.06, 0.085), "flat": (0.03, 0.04, 0.06)}[st]
    stroke(d, p, *w)
    if st == "bushy":                                            # tufts
        for t in (0.25, 0.6):
            q = (p[0][0] + (p[-1][0] - p[0][0]) * t, p[0][1] + (p[-1][1] - p[0][1]) * t + 0.02)
            stroke(d, [q, (q[0] - 0.02 * s, q[1] + 0.05)], 0.02, 0.01, 0.03)
    if st == "unibrow" and s == 1:                               # bridge between the brows
        stroke(d, [(-0.12, by + 0.0), (0.0, by - 0.015), (0.12, by + 0.0)], 0.035, 0.035, 0.045)

def facial_hair(d, kind):
    if kind == "bushy":
        for s in (-1, 1):
            pts = [(s * 0.015, -0.17)] + [(s * (0.015 + 0.36 * t), -0.17 + 0.07 * math.sin(math.pi * t) - 0.05 * t) for t in [i / 10 for i in range(1, 11)]]
            pts += [(s * 0.40, -0.25)]
            for c in (0.32, 0.20, 0.08):
                for i in range(9):
                    a = math.pi * i / 8; pts.append((s * (c + 0.06 * math.cos(a)), -0.255 - 0.045 * math.sin(a)))
            pts += [(s * 0.015, -0.25)]
            blob(d, pts, F.BEARD, True, 0.04)
    elif kind == "pencil":
        for s in (-1, 1): stroke(d, [(s * 0.02, -0.2), (s * 0.12, -0.19), (s * 0.2, -0.215)], 0.02, 0.012, 0.028)
    elif kind == "handlebar":
        for s in (-1, 1):
            pts = [(s * 0.01, -0.18), (s * 0.14, -0.17), (s * 0.26, -0.2), (s * 0.34, -0.17), (s * 0.38, -0.1), (s * 0.35, -0.08),
                   (s * 0.33, -0.13), (s * 0.27, -0.23), (s * 0.14, -0.25), (s * 0.01, -0.235)]
            blob(d, pts, F.INK, False);
    elif kind == "goatee":                                      # small pointed ink goatee on the chin + thin moustache
        blob(d, [(-0.07, -0.43), (0.07, -0.43), (0.05, -0.5), (0.0, -0.56), (-0.05, -0.5)], F.INK, False)
        for s in (-1, 1): stroke(d, [(s * 0.03, -0.205), (s * 0.13, -0.215), (s * 0.17, -0.25)], 0.028, 0.016, 0.034)
    elif kind == "shortbeard":
        top = [(-0.46, -0.3), (-0.3, -0.22), (0.3, -0.22), (0.46, -0.3)]
        bot = arc_pts(0, -0.3, 0.46, 0.26, 180, 360, 16)
        blob(d, [top[0]] + [(x, y - 0.01) for x, y in bot] + top[::-1][:-1], F.BEARD, True, 0.04)
    elif kind == "stubble":                                     # short ink hatch strokes along the jaw (5 o'clock shadow)
        import random; r = random.Random(7)
        for i in range(26):
            a = math.radians(205 + 130 * i / 25); rr = 0.5 + r.uniform(-0.03, 0.03)
            x, y = rr * math.cos(a), -0.12 + rr * 0.75 * math.sin(a)
            stroke(d, [(x, y), (x + 0.012, y - 0.03)], 0.012, 0.008, 0.014)

def extras(d, L):
    if L.get("freckles"):
        for s in (-1, 1):
            for (dx, dy) in ((0.0, 0.0), (0.06, 0.02), (0.03, -0.04), (-0.04, -0.02)):
                q = P(s * (0.36 + dx), -0.1 + dy); d.ellipse([q[0] - 9, q[1] - 9, q[0] + 9, q[1] + 9], fill=(150, 95, 70, 255))
    if L.get("blush"):
        for s in (-1, 1): d.ellipse([*P(s * 0.4 - 0.11, -0.08), *P(s * 0.4 + 0.11, -0.17)], fill=(240, 150, 160, 120))
    if L.get("wrinkles"):
        for s in (-1, 1):
            stroke(d, [(s * 0.46, F.EY + 0.06), (s * 0.52, F.EY + 0.02)], 0.012, 0.01, 0.018)     # crow's feet
            stroke(d, [(s * 0.46, F.EY - 0.02), (s * 0.52, F.EY - 0.04)], 0.012, 0.01, 0.018)
        stroke(d, [(-0.14, 0.42), (0.0, 0.44), (0.14, 0.42)], 0.012, 0.012, 0.02)                  # forehead line
    g = L.get("glasses")
    if g == "round":
        for s in (-1, 1): d.ellipse([*P(s * L["ex"] - 0.17, F.EY + 0.17), *P(s * L["ex"] + 0.17, F.EY - 0.17)], outline=INK, width=W(0.035))
        stroke(d, [(-L["ex"] + 0.17, F.EY + 0.02), (L["ex"] - 0.17, F.EY + 0.02)], 0.03)
    elif g == "square":
        for s in (-1, 1): d.rounded_rectangle([*P(s * L["ex"] - 0.18, F.EY + 0.14), *P(s * L["ex"] + 0.18, F.EY - 0.14)], radius=18, outline=INK, width=W(0.035))
        stroke(d, [(-L["ex"] + 0.18, F.EY + 0.03), (L["ex"] - 0.18, F.EY + 0.03)], 0.03)

def make(job):
    name, expr, variant, gv, path = job
    L = ID[name]; F.GAZE = gv * GAZE_GAIN; F.EX = L["ex"]
    e, b, m = F.EXPR[expr]
    if variant == "blink": e = "closed"
    if variant == "A": m = "open"
    if variant == "O": m = "o"
    if variant == "E": m = "grit"
    if variant == "talk": m = {"flat": "o", "smirk": "open", "smile": "open", "frown": "o", "grin": "open", "grit": "shout", "o": "open", "open": "o", "shout": "open"}.get(m, "open")
    im = Image.new("RGBA", (F.S, F.S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    extras_under = dict(L); extras_under["glasses"] = None
    extras(d, extras_under)
    if L.get("hair") in ("shortbeard", "goatee"): facial_hair(d, L["hair"])
    for s in (-1, 1): x = s * L["ex"]; eye(d, x, e, s, L); brow(d, x, b, s, L)
    if L.get("glasses"): extras(d, {"glasses": L["glasses"], "ex": L["ex"]})
    # mouth (scaled about the face centre by the identity's mouth width)
    sub = Image.new("RGBA", (F.S, F.S), (0, 0, 0, 0)); F.mouth(ImageDraw.Draw(sub), m)
    k = L["mouth"]
    if abs(k - 1) > 1e-3:
        cy = int(F.P(0, F.MY)[1]); sub = sub.resize((int(F.S * k), F.S), Image.LANCZOS)
        tmp = Image.new("RGBA", (F.S, F.S), (0, 0, 0, 0)); tmp.paste(sub, ((F.S - sub.width) // 2, 0)); sub = tmp
    im.alpha_composite(sub)
    if L.get("hair") in ("bushy", "pencil", "handlebar", "stubble"): facial_hair(d, L["hair"])
    im.resize((1024, 1024), Image.LANCZOS).save(path)

def jobs(out, names):
    J = []
    for n in names:
        for k in F.EXPR:
            gz = [0.0] + ([-1.0, 1.0] if F.EXPR[k][0] in F.GAZE_KINDS else [])
            for gv in gz:
                suf = "" if gv == 0 else ("_L" if gv < 0 else "_R")
                J.append((n, k, None, gv, f"{out}/{n}_{k}{suf}.png")); J.append((n, k, "talk", gv, f"{out}/{n}_{k}_talk{suf}.png"))
                for v in ("A", "O", "E"): J.append((n, k, v, gv, f"{out}/{n}_{k}_{v}{suf}.png"))
                if gv == 0: J.append((n, k, "blink", gv, f"{out}/{n}_{k}_blink.png"))
    return J

if __name__ == "__main__":
    out = sys.argv[1]; names = sys.argv[2:] or list(ID)
    J = jobs(out, names)
    with Pool(max(2, os.cpu_count() - 1)) as p: p.map(make, J, chunksize=8)
    print(len(J), "faces for", len(names), "identities")
