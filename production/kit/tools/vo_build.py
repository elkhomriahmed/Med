"""Build the final voiceover from parts (narrator + character quotes), for every video.
Usage: python -I tools/vo_build.py OUT.wav TARGET_SECONDS PART1.mp3 [GAP] PART2.mp3 [GAP] ...
  GAP = a number (seconds of silence between parts, default 0.12)
Steps: loudness-match every part (-18 LUFS), join with the gaps, shorten every pause over 0.26 s to 0.26 s, speed up (atempo,
pitch kept) so the result lands on TARGET_SECONDS (must stay > 60 s), trim leading/trailing silence. Prints length + pace."""
import sys, subprocess, numpy as np, scipy.io.wavfile as wf, tempfile, os
SR = 44100
def load(p, norm=True):
    af = ["-af", "loudnorm=I=-18:TP=-2:LRA=7"] if norm else []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, *af, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
out, target, rest = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
seq, pending = [], None                      # pending gap (s) before the next part; default 0.12 between parts
for a in rest:
    try: pending = float(a); continue
    except ValueError: pass
    if seq: seq.append(np.zeros(int((0.12 if pending is None else pending) * SR), np.float32))
    pending = None
    x = load(a); nz = np.nonzero(np.abs(x) > 0.003)[0]; seq.append(x[max(0, nz[0] - 400): nz[-1] + 800])
y = np.concatenate(seq)
# shorten pauses: any run of quiet (20 ms frames under -40 dB) longer than 0.26 s is cut down to 0.26 s
fr = int(0.02 * SR); n = len(y) // fr; e = np.sqrt((y[:n * fr].reshape(n, fr) ** 2).mean(1)); quiet = e < 0.01
keep = np.ones(n, bool); i = 0
OPEN = float(os.environ.get("VO_OPEN_SEC", "18"))      # opening (pre-speed-up seconds) where pauses are cut harder: retention rule
while i < n:
    if quiet[i]:
        j = i
        while j < n and quiet[j]: j += 1
        maxq = int((0.14 if i * 0.02 < OPEN else 0.26) / 0.02)
        if j - i > maxq: keep[i + maxq // 2: j - maxq // 2] = False
        i = j
    else: i += 1
y = np.concatenate([y[k * fr:(k + 1) * fr] for k in range(n) if keep[k]])
tmp = tempfile.mktemp(suffix=".wav"); wf.write(tmp, SR, y)
tempo = len(y) / SR / target
chain = []; t = tempo
while t > 2.0: chain.append("atempo=2.0"); t /= 2.0
chain.append(f"atempo={t:.5f}")
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", tmp, "-af", ",".join(chain), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
z = np.frombuffer(raw, np.float32).copy(); nz = np.nonzero(np.abs(z) > 0.003)[0]; z = z[max(0, nz[0] - 200): nz[-1] + 400]
fade = int(0.04 * SR); z[-fade:] *= np.linspace(1, 0, fade)
wf.write(out, SR, z); os.remove(tmp)
print(f"speed-up x{tempo:.3f} -> {len(z) / SR:.2f} s")
