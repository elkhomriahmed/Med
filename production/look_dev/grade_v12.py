"""Style v12 grade for linear EXR renders: exposure -> soft filmic shoulder (no clipped faces) -> sRGB -> rich saturation,
warm highlights / cooler shadows, gentle S-contrast, bloom on light sources, vignette.  Usage: grade_v12.py IN.exr OUT.png [ev] [sat]"""
import os, sys
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"
import cv2, numpy as np
def grade(lin, ev=0.0, sat=1.35, warm=0.06, contrast=0.18, bloom=0.35, vig=0.28):
    x = lin[..., :3].astype(np.float32) * (2.0 ** ev)
    w = 6.0; x = x * (1 + x / (w * w)) / (1 + x)                       # Reinhard with white point: soft shoulder
    x = np.clip(x, 0, 1)
    x = np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)   # sRGB
    l = (x * np.array([0.0722, 0.7152, 0.2126])).sum(-1, keepdims=True)         # BGR luma
    x = l + (x - l) * sat
    x = x + warm * np.clip(l - 0.45, 0, 1) * np.array([-0.6, 0.15, 1.0]) - warm * 0.5 * np.clip(0.45 - l, 0, 1) * np.array([1.0, 0.1, -0.5])
    x = np.clip(x, 0, 1); x = x + contrast * (x - x * x) * (2 * x - 1) * 2      # S-curve around mid grey
    br = np.clip((x - 0.82) / 0.18, 0, 1) ** 2 * x
    h, w_ = x.shape[:2]; g = cv2.GaussianBlur(br, (0, 0), w_ * 0.02) + 0.6 * cv2.GaussianBlur(br, (0, 0), w_ * 0.006)
    x = 1 - (1 - x) * (1 - np.clip(g * bloom, 0, 1))                              # screen
    yy, xx = np.mgrid[0:h, 0:w_]; r = np.sqrt(((xx - w_ / 2) / (w_ / 2)) ** 2 * 0.6 + ((yy - h / 2) / (h / 2)) ** 2)
    x = x * (1 - vig * np.clip(r - 0.55, 0, 1) ** 1.5)[..., None]
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)
def read_exr(path):
    """Linear float BGR from an EXR (Blender's loader; this OpenCV build has no EXR support)."""
    import bpy
    im = bpy.data.images.load(path); w, h = im.size; px = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(px)
    return px.reshape(h, w, 4)[::-1, :, [2, 1, 0]].copy()
if __name__ == "__main__":
    lin = read_exr(sys.argv[1])
    ev = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0; sat = float(sys.argv[4]) if len(sys.argv) > 4 else 1.35
    cv2.imwrite(sys.argv[2], grade(lin, ev, sat))
