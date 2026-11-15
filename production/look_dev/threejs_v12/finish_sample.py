"""Finish the three.js sample: voice slice + captions + sound effects + music -> mp4 (pipeline/finish_video.py).
Usage: python3 finish_sample.py FRAMES_DIR OUT.mp4"""
import sys, os, json, subprocess
FR, OUT = sys.argv[1], sys.argv[2]
ROOT = "/home/user/Med/production"; AU = f"{ROOT}/videos/01_lighthouse_mercury/audio"
T0, T1 = 19.25, 26.55
W = json.load(open(f"{AU}/words.json")); T = lambda i: W[i][0] - T0
tmp = FR + "_fin"; os.makedirs(tmp, exist_ok=True)
json.dump([[a - T0, b - T0, w] for a, b, w in W if a >= T0 - 0.05 and a < T1], open(tmp + "/words.json", "w"))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(T0), "-to", str(T1), "-i", f"{AU}/vo_fast.wav", tmp + "/voice.wav"], check=True)
EV = [("ocean_waves", 0, 0.10, 7.3), ("wind", 0, 0.06, 7.3), ("laughter_small_group", 0, 0.16, 1.4), ("impact", T(69) + 0.45, 0.15),
      ("swish", T(70) - 0.1, 0.35), ("swish", T(71) + 0.05, 0.25), ("swish", T(74) - 0.05, 0.3), ("swish", T(77) + 0.05, 0.3),
      ("whoosh", T(77) - 0.1, 0.25), ("swish", T(80) - 0.05, 0.3), ("swish", T(83), 0.25), ("whoosh", T(86), 0.4),
      ("footsteps_wood", T(86) + 0.1, 0.25, 0.4), ("gasp", T(88) - 0.05, 0.4), ("bell_ding", T(88), 0.3)]
cfg = {"segments": [FR], "words": tmp + "/words.json", "voice": tmp + "/voice.wav", "sfx": [list(e) for e in EV], "flashes": [],
       "music": f"{ROOT}/library/music/cartoon_funny_quirky_5min.mp3", "music_gain": 0.10, "out": OUT, "tmp": tmp + "/fv"}
json.dump(cfg, open(tmp + "/finish.json", "w"))
subprocess.run(["python3", "-I", f"{ROOT}/pipeline/finish_video.py", tmp + "/finish.json"], check=True)
