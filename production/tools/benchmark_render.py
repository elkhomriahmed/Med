"""Render benchmark for the LOCKED style v12 frame — run it on any computer to see how fast that machine renders our style.

It prints the machine's CPU / RAM / GPUs, builds the exact locked lamp-room frame (look_dev/still_v12_LOCKED.py), renders it at
1080x1920 on the CPU and on every GPU Blender can use, and estimates the time for the sample scene and the full video.

Run (Blender 4.2 or newer, from the repository root):
    Windows:  "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe" -b --python production/tools/benchmark_render.py
    macOS:    /Applications/Blender.app/Contents/MacOS/Blender -b --python production/tools/benchmark_render.py
    Linux:    blender -b --python production/tools/benchmark_render.py
Options after "--":  --spp 32   --devices cpu,gpu   --pct 100
It installs Pillow into Blender's own Python the first time (needs internet once)."""
import sys, os, time, platform, subprocess, tempfile, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
def opt(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
SPP = int(opt("--spp", "32")); PCT = int(opt("--pct", "100")); DEVICES = opt("--devices", "cpu,gpu").split(",")
SAMPLE_FRAMES, SAMPLE_SEC = 218, 7.3          # the lamp-room sample scene (t13 sample length)
VIDEO_FRAMES, VIDEO_SEC = 1871, 62.4          # video 1 (lighthouse mercury)

import bpy

def ram_gb():
    try:
        if sys.platform.startswith("linux"):
            for l in open("/proc/meminfo"):
                if l.startswith("MemTotal"): return int(l.split()[1]) / 1024 / 1024
        if sys.platform == "darwin":
            return int(subprocess.check_output(["sysctl", "-n", "hw.memsize"])) / 1024 ** 3
        if sys.platform == "win32":
            import ctypes
            class M(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("p", ctypes.c_ulong), ("t", ctypes.c_ulonglong), ("a", ctypes.c_ulonglong),
                            ("tp", ctypes.c_ulonglong), ("ap", ctypes.c_ulonglong), ("tv", ctypes.c_ulonglong), ("av", ctypes.c_ulonglong), ("e", ctypes.c_ulonglong)]
            m = M(); m.l = ctypes.sizeof(M); ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)); return m.t / 1024 ** 3
    except Exception: pass
    return float("nan")

def cpu_name():
    try:
        if sys.platform.startswith("linux"):
            for l in open("/proc/cpuinfo"):
                if l.startswith("model name"): return l.split(":", 1)[1].strip()
        if sys.platform == "darwin":
            return subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"]).decode().strip()
    except Exception: pass
    return platform.processor() or platform.machine()

def ensure_pillow():
    try: import PIL  # noqa
    except ImportError:
        print("Installing Pillow into Blender's Python (one time)...")
        subprocess.call([sys.executable, "-m", "ensurepip", "--user"])
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "pillow"])
        import site; sys.path.append(site.getusersitepackages())

def gpu_devices():
    """Enable the best GPU backend Blender finds; returns (backend, [device names])."""
    try: prefs = bpy.context.preferences.addons["cycles"].preferences
    except Exception: return None, []
    for backend in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
        try: prefs.compute_device_type = backend
        except Exception: continue
        try: prefs.get_devices()
        except Exception: pass
        gpus = [d for d in prefs.devices if d.type == backend]
        if gpus:
            for d in prefs.devices: d.use = (d.type == backend)
            return backend, [d.name for d in gpus]
    return None, []

def find_font():
    for p in ("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(p): return p
    return None

RESULTS = {}
def bench(sc):
    """Called by the locked frame script instead of its own render: time the frame on each device."""
    sc.render.resolution_percentage = PCT; sc.cycles.samples = SPP
    out = os.path.join(TMP, "bench.png"); sc.render.image_settings.file_format = "PNG"; sc.render.filepath = out
    for dev in DEVICES:
        if dev == "gpu":
            backend, names = gpu_devices()
            if not backend: print("GPU: none usable by Blender Cycles on this machine"); continue
            sc.cycles.device = "GPU"; label = f"GPU {backend}: {', '.join(names)}"
        else:
            sc.cycles.device = "CPU"; label = f"CPU: {cpu_name()} ({os.cpu_count()} threads)"
        print(f"\nRendering on {label} ..."); t = time.time(); bpy.ops.render.render(write_still=True); dt = time.time() - t
        RESULTS[label] = dt; print(f"  -> {dt:.1f} s per frame")

TMP = tempfile.mkdtemp(prefix="bench_v12_")
print("=" * 70); print("Machine:", platform.platform())
print("CPU:", cpu_name(), "|", os.cpu_count(), "threads"); print(f"RAM: {ram_gb():.1f} GB"); print("Blender:", bpy.app.version_string)
print(f"Test: locked style v12 frame, {1080 * PCT // 100}x{1920 * PCT // 100}, {SPP} samples + denoiser"); print("=" * 70)
ensure_pillow()
src = open(os.path.join(ROOT, "production", "look_dev", "still_v12_LOCKED.py"), encoding="utf-8").read()
src = src.replace("/home/user/Med", ROOT.replace("\\", "/"))
font = find_font()
if font: src = src.replace("/usr/share/fonts/opentype/inter/InterDisplay-Black.otf", font.replace("\\", "/"))
src = src.replace("sc.render.filepath = OUT; bpy.ops.render.render(write_still=True)", "__BENCH__(sc)")
sys.argv = [sys.argv[0], os.path.join(TMP, "still.exr"), str(PCT), str(SPP)]
t0 = time.time(); exec(compile(src, "still_v12_LOCKED.py", "exec"), {"__BENCH__": bench, "__name__": "__bench__", "__file__": "still_v12_LOCKED.py"})

print("\n" + "=" * 70); print("RESULTS (render time per frame; scene build is extra, once per shot)")
for label, dt in RESULTS.items():
    s, v = dt * SAMPLE_FRAMES, dt * VIDEO_FRAMES
    print(f"\n{label}\n  one frame:   {dt:7.1f} s\n  sample scene ({SAMPLE_SEC} s, {SAMPLE_FRAMES} frames): {s / 3600:6.1f} h"
          f"\n  full video   ({VIDEO_SEC} s, {VIDEO_FRAMES} frames): {v / 3600:6.1f} h")
print("\nThese are straight per-frame renders of the locked frame. The planned speed-up (room lighting pre-computed once per")
print("place, only the characters lit per frame) should cut these further; it will be measured on the sample scene.")
json.dump(RESULTS, open(os.path.join(ROOT, "benchmark_result.json"), "w"), indent=1); print("Saved benchmark_result.json")
