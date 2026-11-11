# Sample v3 review (no new render)

## 1. Characters have no body outline
- Checked at full size (frame 141): the son's head and body edges have no dark ink outline, just a soft white edge. The keeper is the same. Only the face drawings, beanie lines and stick arms are dark.
- The outline layer is in the scene but doesn't show up in the fast renderer. **Likely cause, not yet confirmed:** the outline uses a plain colour, while the fast renderer only draws texture-based materials (the arms had to be switched to a texture-based ink material for the same reason).
- **Fix:** give the outline that same texture-based ink material, at the approved thickness, and check one still frame before any full render.

## 2. The coin throw can't be seen
- Frames 12–22 (0.37–0.73 s): the camera stays on the keeper's upper body while he winds up. The throwing hand is at the edge of the frame, and the coin isn't visible in his hand or in the air.
- It only appears in the last 2–3 frames as a small yellow blur near the floor, so only the clink is noticeable.
- **Causes:**
  - the flight lasts about 0.33 s (about 10 frames)
  - the coin is small (5 cm)
  - it starts at a hand that's barely in frame
  - the camera only tilts down after the coin lands
- **Fix:**
  - start the throw on "hid" so the flight lasts about 0.6–0.7 s
  - show the coin clearly in his hand first (bigger, about 9 cm, with a gold glint)
  - make the camera follow the coin from hand to floor
  - add a small bounce and sparkle on landing, timed with the clink

## 3. Render time vs. estimates
Real times for the final v3 run:

| Step | Time |
|---|---|
| Lighting setup | 4.4 min |
| 186 frames | 6.2 min (2.0 s each) |
| Finishing (glow, captions, mix, encode) | 4.0 min (I had not counted this step) |
| **Total** | **≈ 14.5 min** for 6.2 s of video |

**Why it felt like more than 20 minutes:** the delivery also included
- three low-resolution previews and a debug run
- a full render with the arm bug (about 12 min)
- a run lost to the container restart

**Projected for a 60 s video at current speed:** ≈ 4.5 min setup + 60 min frames + 40 min finishing ≈ **1.75 h**, far over the 30–40 min target.

**Speed changes needed before the full video:**
- background blur in post instead of the renderer: frames from 2.0 s to about 1.2 s
- faster finishing: glow on a smaller image, captions drawn by ffmpeg in a single pass
- render the frames on all 4 CPU cores
- one low-res preview at most, no full test renders
