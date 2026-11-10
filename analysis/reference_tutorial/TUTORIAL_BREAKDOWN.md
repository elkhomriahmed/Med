# The Reference Tutorial: Everything It Reveals About the Style

**Source:** "How To Make Viral Ricks Clips Style Animations With Claude, Step-by-step Guide" (10 min 52 s, watched at 360p).

**How I went through it:**
- **Speech:** all of it transcribed with timestamps (`transcript.md`).
- **Picture:** one frame every 2 seconds for the whole video, plus full-size frames wherever there was text on screen (`frames/`).

**What the video is:** a guide and an advert for a paid tool called **Creatorize**: a desktop app plus a Skool community at $67 or $97 per month. The app runs Claude Code on your computer and drives **Blender** to build and render the video.

**How much of it is useful:**
- About **7.5 minutes** (0:00–8:25) teach the style and the workflow.
- 8:25–9:25 replays their finished Short.
- 9:25 to the end is the sales pitch.

They rebuild the **Grave Bell** Short (one of the 10 competitor videos) and put it side by side with the original.

---

## 1. How they describe the style (0:32–2:12)

> "It's **big-headed cartoon characters with drawn faces** acting out a **short, dark little story** inside **real 3D sets**, **about a minute long** with **a twist at the end**."

They give **three reasons it works**:

| # | Reason | What they say | What's on screen |
|---|---|---|---|
| 1 | **The hook** | "The very first line is a **problem you need solved**… and **every line pushes it further**." Bell rings at 2 a.m., then the street argues, then the doctor swears he's dead, then the wife just sits there with a shovel | A line diagram: a coffin underground → a string → a bell with a "?" → "2 AM" → houses with "!" marks above them. Each line of the script adds one new element to the same picture |
| 2 | **The faces** | "The heads are big, the eyes are big, the faces are drawn, so you **read the feeling in a split second**. This film has **49 different expressions**. The faces **change right on the words**. When the voice says *scared of waking up in a coffin*, his eyes go huge, and **the mouths move with the voice the whole way through**." | A face diagram labelled HEAD and EYES. A counter goes from 30 to "49 expressions". The words "*scared* of waking up in a coffin" highlight one by one, and the face switches to huge eyes on "scared" |
| 3 | **The look** | "Every place is a **real set**, dressed with **props**, with **toon shading** and **ink outlines** around everything. This one has **four places**… and **the light tells the story**: **blue-violet moonlight for the night, a warm candle for the flashback, gold for the sunrise. The colour tells you where you are.**" | An isometric room built up layer by layer: "Real set → Props → Toon shading → Ink outlines". Four location cards: Town street, The grave, Doctor's bedroom, Wife's front room. A timeline bar marked night (blue), flashback (candle), sunrise (gold) |

Also: "**nobody has to be on camera.** It's one voiceover and a cartoon, so it's a format you can post again and again."

---

## 2. How the characters are built (shown in diagrams at 0:34–0:42 and 4:56–5:40)

The explainer graphics show how the characters are made:

- **Each character is a stack of flat 2D cards, not a 3D model.** The diagram labels them **"head"** and **"body"**, and the cards are shown pulled apart in 3D space: a face card, a head card, and a body card.
- The card stack is **placed inside the 3D set**, on a floor grid. That's why the characters look flat but still sit in the scene, with lighting and shadows.
- **Faces are separate drawn layers that get swapped.** A timeline under the face shows segments, and each segment is a different expression. On the word "signed", the doctor's face snaps to a big grin.
- **Mouths** move with the voice, timed from the word timestamps.
- **The camera frames the face that matters.** A diagram shows a camera icon linked to a face in a focus frame. A hand or a lamp crossing in front gets flagged, and the shot is reframed onto the face.

This confirms what I found in the 10 competitor videos: **2D billboard characters inside 3D toon sets, with expressions swapped on cue.**

---

## 3. The camera (6:00–6:12)

> "Watch the camera too, it **never just sits there**. Inside the shot, it **flies through the set from one framing to the next**, and it **only cuts when the story jumps to a new place**. That's how **11 shots turn into 33 framings**."

The diagram shows a top-down plan of a set with a **camera moving along a curved path**. It passes through numbered framings (1, 2, 3), then a **"cut"** line, then Shot 2 in a different room (a bed and a camera on a new path).

**The rule:**
- **Shot = location.** A new place means a new shot, joined by a cut or dissolve.
- **Framing = line of narration.** Inside a shot, the camera glides to a new framing about every 2 seconds.
- For a 60-second video that works out to about 11 locations or setups and about 33 framings.

This matches my measurements on the 10 videos: a new picture every ~2 s, but only 0–7 hard cuts per video.

---

## 4. The workflow they show, step by step (2:12–8:25)

| Step | What they do | Detail on screen |
|---|---|---|
| 1. New project | Name it exactly like the Short ("What the Grave Bell Really Meant") and drop in the voiceover | |
| 2. Style | **"3D cartoon shorts: big-headed 3D cartoon characters with expressive faces"**, Vertical 9:16 | Other built-in styles in the list: *Pixel art (Hi-Bit 640)*, *MS Paint stick figures*, *Low poly shorts*, *3D reconstruction (matte clay)*, plus Vox collage, Flat explainer, Paint |
| 3. Engine | **Blender**, not Three.js | "Rendered in Blender, which runs hidden; you preview, scrub and play the video here (Solid for speed, Look for the real light)" |
| 4. Quality | **Ultraedit**, the highest of Standard, Verified and Ultraedit | Ultraedit means the most capable Claude model reviews **every shot by looking at still frames** and fixes what looks bad |
| 5. Look | The style's built-in description (the most useful text in the video) | "**1080×1920 for Shorts, Reels and TikTok. Rendered in Blender: toon shading with brush-weight ink outlines, drawn faces, dressed sets, soft EEVEE light with contact shadows, depth of field and motion blur, a measured colour grade.**" |
| 6. Script | They paste the exact voiceover text, "so the timing matches word for word" | |
| 7. Voiceover | Your own recording, **ElevenLabs**, **Fish Audio**, or a free local voice | |
| 8. Clean and time | Cleans the audio, then **times every word** with a local speech model (Parakeet) | "This step matters a lot for this style… the faces change on the words, and the mouths move with the voice. **None of that works without a time on every word.**" A diagram shows face changes pinned to word markers on the waveform. When they're not lined up it shows "out of sync" in red |
| 9. Build direction | A short plain-language brief covering **story → where → who** | The full text is in section 5. They call one line "the line that matters most" |
| 10. Build | Runs by itself: writes the **storyboard**, builds **every shot timed to the narration**, **checks each shot against rendered frames**, designs the ambience | Result: **11 shots, 33 framings**. The timeline has tracks for Shots, Narration, Cues, Audio, and Cards/Auto beds |
| 11. Review | Checks every shot (see section 6) | |
| 12. Sound mix | "Builds the final soundtrack around the voiceover. **It reads where every shot starts and ends, so the sound follows the picture.**" | Log line: "Collecting shot boundaries, card entrances and accents…". The diagram shows voiceover on top, **music beds** (purple bars) underneath, **SFX hits** (grey pills) at shot boundaries and card entrances, and **accents** (orange ticks) on key words |
| 13. Export | **1080×1920, 30 fps, H.264**, mixed soundtrack, **captions saved as .srt** | Options: 4K upscale, separate WAV stems (voice, music, SFX), separate clips per shot plus an .edl timeline for Premiere, DaVinci or CapCut, YouTube chapters, YouTube text |

---

## 5. The build direction they typed (4:05, verbatim)

> A dark comedy in an old American town at night. A man buried alive with a bell on his grave, a sly wife in a teal dress in her dark front room, a nosy neighbour in a nightcap, a grumpy doctor. Show the grave in cross-section so we see him in the coffin. **The bell rings right on the words, big faces that change on every word**, a camera that flies through each set, and a warm candle-lit flashback for the twist.

How it's built (story, then where, then who, then signature shots, then sync, then camera, then lighting change):

1. **Genre and tone plus setting and time:** "A dark comedy in an old American town at night."
2. **Each character with one visual identifier:** sly wife, *teal dress*; nosy neighbour, *nightcap*; grumpy doctor.
3. **The "strangest picture" shot:** the grave in cross-section.
4. **"The line that matters most":** sound and faces locked to the words. "The bell has to ring right on the words, and the faces have to change on every word."
5. **The camera rule:** it flies through each set.
6. **A lighting change for the twist:** a warm candle-lit flashback.

---

## 6. Their checklist for each shot (4:52–6:40)

They look for **three things** on every shot:

1. **Does every face change on its word?**
   - The doctor grins right when he says he signed the paper himself.
   - The neighbour steps out with his candle and a bored face exactly on "it's probably the wind".
2. **Do sound effects land on their word?**
   - The bell rings on the word "rings".
   - "Three short, one long" has to be three short rings and one long one.
   - The **background plays along too**: when the voice says "graves came with a little bell", you see a bell post on every grave.
3. **Is anything blocking the face the shot is about?** A lamp, a door or a hand. "In this shot it's all about the wife's face, so nothing sits in front of it."

Plus:
- **Twist acting:** "Watch the wife's face when the voice says *she knows that ring*. She already knows, and **you can see it before anyone tells you**. That's the faces doing the storytelling, and it's what makes a **second watch** worth it."
- **The mute test:** "Watch it once with the sound on and once with the sound off. **With the sound off, every face should still tell you what's going on.** If one doesn't, that's the shot to look at first."
- **Character tip:** "**Give every character one thing you can spot from across the room.** A colour, a hat, a candle." The graphic shows five faces (shocked, angry, smug, laughing, worried) on one strip.

---

## 7. Four rules and two mistakes (6:40–7:40)

**"Four things that make or break this format, and none of them are technical":**

| # | Rule | Detail |
|---|---|---|
| 1 | **Voiceover = setup, turn, twist** | "You get the setup in **one line**. The turn is where you find out what's really going on. **The twist lands right before the end.**" The graphic is a curve: flat setup, a rising "Turn", then a sharp spike "Twist" at the far right |
| 2 | **Keep it short** | "This one is **59.5 seconds** and **there isn't a second in it that's just waiting**." |
| 3 | **The first two seconds** | "**Put your strangest picture right at the start.** Here it's a man in a coffin underground with a string running up to a bell." The graphic labels it bell, string, underground, coffin, all inside 0–2 s |
| 4 | **Every line needs a picture** | "**If you can't say what we see on a line, rewrite that line.**" The graphic is a grid of 12 frames, one per line |

**Two mistakes to avoid:**

1. **Too many characters.** "Every new face costs the viewer a second to figure out who that is." Keep a few, each with its own look.
2. **A twist that shows up too early.** "If people can guess the ending halfway through, they're gone." The reveal belongs in the **last few seconds**. The graphic moves the flag from "halfway" to "last few seconds".

---

## 8. Their version compared with the original

From the side-by-side clips (0:00–0:30, 1:52–2:10, 8:25–9:25):

| | Original (competitor) | Their remake (Creatorize + Blender) |
|---|---|---|
| Story and script | The same voiceover word for word (they reused the original script) | Same |
| Sets | Painterly, hand-textured, rich detail, stylised snow and soil | Cleaner, more "plastic" 3D, simpler textures, less painterly |
| Characters | Hand-drawn feel, many unique outfits, very expressive | Same card-stack design, but simpler and more uniform |
| Lighting | Strong moonbeams, candle pools, sunrise gradient | The same lighting plan (blue-violet night, candle flashback, gold sunrise), but flatter |
| Captions | 1–3 words, white bold with black outline, about 70% down | Same caption style, slightly smaller |
| Camera | Flythroughs, about 2 s framings | Same rule (11 shots, 33 framings) |

**Verdict:** the remake copies the **structure** exactly (timing, framing rhythm, lighting plan, face swaps on words, caption style), but the **art quality is noticeably lower** than the original. The style's power comes mostly from the structure. The art quality is what makes it look premium.

---

## 9. What this adds to my earlier analysis

My earlier report (`../STYLE_BREAKDOWN.md`) already matched most of this, measured from the 10 competitor videos. The tutorial **confirms**:
- 2D card characters inside 3D toon sets
- Faces changing on words
- About 2 s framings with very few hard cuts
- Lighting tied to the story beat
- Every line shown on screen
- The twist late in the video

It **adds or corrects**:

1. **Word timing is the foundation.** Everything (face swaps, SFX hits, framing changes) is pinned to word timestamps. Get the word times first, then build.
2. **Shot versus framing:** one shot per location, about 3 framings per shot, with the camera gliding between them. Cut only when the place changes.
3. **The 3D renderer they use is Blender EEVEE** with toon shading, brush-weight ink outlines, contact shadows, depth of field, motion blur and a colour grade. This is the look recipe to aim for.
4. **Sound effects:**
   - They place hits at **shot boundaries, card entrances and word accents**, over music beds.
   - On the originals I measured no *consistent* whoosh at every transition, so keep these hits subtle.
   - The most important sound effects are **story sounds landing exactly on their word** (the bell on "rings").
5. **Lip sync:** in their version mouths move through all dialogue and narration attached to a character. In the originals the mouth moves mostly on quoted lines. Either works, but **the expression swap on the key word** is what matters.
6. **Characters:** 3–4 at most, each with **one signature item** (colour, hat or prop).
7. **The mute test** as the final quality check.
8. **Extra rules:** the strangest picture in the first 2 s, and "if you can't say what we see on a line, rewrite it".

---

## 10. Do you need Creatorize?

**No.** What it does is a pipeline you can rebuild:

| Their step | Free or cheaper equivalent |
|---|---|
| Voiceover | ElevenLabs / Fish Audio / your own voice (they offer the same choices) |
| "Clean and time" | Free word-timestamp transcription: Whisper or Parakeet. This is what I used to time every word of your 10 competitor videos |
| Storyboard + "build every shot" | Any Claude plan: give it the script with word timings plus the shot rules above, and ask for a shot list (location, framing, character, expression per word, camera path, SFX cues) |
| Blender toon render | **Blender (free)**: EEVEE + toon shader + Line Art/Freestyle outlines, characters as image planes (head, face and body PNG layers) with face textures swapped on keyframes |
| Easier alternative to Blender | My earlier "Level 1–2" route: AI-generated toon-style 3D backgrounds + image-to-video camera moves + your 2D character PNG kit composited in CapCut or After Effects |
| Sound mix | Music bed at about –27 dB, SFX on their words, master to –14 LUFS |
| Export | 1080×1920, 30 fps, plus an .srt for captions |

The paid tool mostly saves you from setting up Blender. Its Grave Bell remake is **lower quality than the original**, so what decides results is following the rules above, not the tool.
