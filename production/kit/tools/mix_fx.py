"""Pre-mix music + ambience beds + effects from a sound.json into one WAV (no voice), with fades, so Remotion only plays VO + this.
Usage: python -I tools/mix_fx.py videos/v01/sound.json public/audio/fx_v01.wav [public/audio/vo_v4.wav check_mix.wav]"""
import sys, json, subprocess, numpy as np
SR = 44100
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def fade(x, a, b):
    n = len(x); a = min(int(a * SR), n // 2); b = min(int(b * SR), n // 2)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None]
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None]
    return x
plan = json.load(open(sys.argv[1])); N = int((plan["end"]) * SR); out = np.zeros((N, 2), np.float32)
db = lambda g: 10 ** (g / 20)
m = load("public/" + plan["music"]["src"])[:N]; m = fade(m, 0.3, 0.5) * db(plan["music"]["gain_db"]); out[:len(m)] += m
for b in plan["beds"]:
    src = load("public/sfx/v01/" + b["src"] + ".mp3"); a0, a1 = int(b["a"] * SR), min(N, int(b["b"] * SR)); L = a1 - a0
    reps = int(np.ceil(L / len(src))) + 1; xf = int(0.08 * SR); seg = np.zeros((L + xf, 2), np.float32); pos = 0
    while pos < L:                                   # loop with short crossfades so the seam never clicks
        piece = fade(src.copy(), 0.08, 0.08); k = min(len(piece), L + xf - pos); seg[pos:pos + k] += piece[:k]; pos += len(src) - xf
    seg = fade(seg[:L], 0.3, 0.3) * db(b["db"]); out[a0:a1] += seg
for s in plan["sfx"]:
    x = fade(load("public/sfx/v01/" + s["src"] + ".mp3"), 0.005, 0.06) * db(s["db"]); a = int(s["at"] * SR)
    if a < 0: x = x[-a:]; a = 0
    k = min(len(x), N - a); out[a:a + k] += x[:k]
pk = np.abs(out).max(); print("fx peak %.2f" % pk)
import scipy.io.wavfile as wf
wf.write(sys.argv[2], SR, np.clip(out, -1, 1))
if len(sys.argv) > 4:
    v = load(sys.argv[3]); n = max(len(v), N); mix = np.zeros((n, 2), np.float32); mix[:len(v)] += v; mix[:N] += out
    wf.write(sys.argv[4], SR, np.clip(mix, -1, 1))
