# Competitor Shorts: Full Style Breakdown and How to Copy It

This covers 10 competitor Shorts: Ancient Jar, Job Nobody Wants, Pink Prison Cell, Window/Gambling Law, Roller Coaster Shape, Grave Bell, Dash Cam, Perfect Railroads, Storm Oil, Brain Idea Zone.

---

## 0. What was analyzed, and the limits

| What | How | Coverage |
|---|---|---|
| Every frame (17,679 frames at 30 fps) | Each frame was measured automatically: change from the previous frame, brightness, colour, saturation, and hard-cut and dissolve detection | 100% of frames |
| Visual review | I looked at 2 frames per second for all 10 videos (about 1,180 frames, with timestamps). Around transitions and on talking faces I looked at every frame (30 fps strips) | All 10 videos, start to finish |
| Every word spoken | Whisper speech-to-text with a timestamp on every word. See `transcripts/` | 2,161 words, all of them |
| Voice | Pitch tracking, pauses, words per minute, and how the voice shifts for character lines | All videos |
| Music and sound effects | Loudness (LUFS), how loud the music sits under the voice, tonal versus noise content, and onset detection | All videos |

**Limits:**
- **The breakdown YouTube video could not be opened.** YouTube is blocked in this cloud session's network. If you paste its transcript or key points, I can add them to this file.
- **Music is described, not named.** I can measure the music (level, tone, how steady it is), but I can't identify the exact tracks.
- **Sound effects** were checked with signal analysis, not by ear. What follows is what the numbers support, and anything inferred is marked as inferred.

---

## 1. The style in one paragraph

These are **55–65 second (sometimes 40–45 s) vertical "hidden-reason" mini-stories**. The structure is always the same: a weird act or a paradox, then people mocking it, then rising stakes, then a twist, then a one-sentence explanation of the real mechanism, then a punchline. One fast, very expressive narrator tells it with no pause before the first word and almost no pause after the last. Visually, **flat 2D "ball-head" cartoon characters** are placed inside **colourful, stylised 3D worlds**: either game-engine-looking or cel-shaded with outlines. The camera never stops moving, and the picture changes about **every 2 seconds**, almost always by **dissolve or camera move rather than a hard cut**. Every noun the narrator says shows up on screen at the moment it is said. Captions are **1–3 words at a time**, white with a black outline, about 70% of the way down the screen.

---

## 2. Hard numbers (all 10 videos)

| Video | Length | Words | Words/min | Visual changes | Avg shot | Hard cuts | Brightness (0–255) | Saturation |
|---|---|---|---|---|---|---|---|---|
| Ancient Jar | 64.9 s | 235 | 218 | 31 | 2.0 s | 1 | 112 | 23 |
| Job Nobody Wants | 60.6 s | 224 | 223 | 32 | 1.8 s | 0 | 130 | 29 |
| Pink Prison Cell | 65.3 s | 237 | 219 | 28 | 2.3 s | 1 | 131 | 25 |
| Window / Gambling | 45.1 s | 161 | 215 | 13 | 3.2 s | 0 | 90 | 22 |
| Roller Coaster | 63.2 s | 236 | 225 | 25 | 2.4 s | 1 | 107 | 27 |
| Grave Bell | 59.6 s | 220 | 223 | 27 | 2.1 s | 0 | 107 | 31 |
| Dash Cam | 62.3 s | 238 | 231 | 22 | 2.7 s | 7 | 104 | 24 |
| Railroads | 65.2 s | 218 | 201 | 31 | 2.0 s | 1 | 115 | 31 |
| Storm Oil | 64.6 s | 247 | 230 | 31 | 2.0 s | 0 | 105 | 42 |
| Brain Idea Zone | 39.1 s | 145 | 225 | 11 | 3.3 s | 0 | 73 | 15 |
| **Typical** | **~60 s** | **~220** | **~222** | **~25** | **~2.3 s** | **~0–1** | | |

Other constants:
- Your files are 720×1280 at 30 fps. Export yours at 1080×1920, 30 fps.
- **The voice starts on the very first frame in all 10 videos** (the first word's timestamp is 0.00 s). The last word ends **0.07–0.5 s before the video ends**, so the video loops cleanly back into the hook.
- The mix sits at **–14 LUFS** in every video (YouTube's loudness target) with very little loudness range (LRA 1.7–3.5 LU). The audio is heavily compressed and stays at one constant level.

---

## 3. Voiceover and script

### 3.1 Topics

Each video is **"the hidden reason behind a real, slightly obscure thing,"** told as a **dramatised mini-story with a protagonist** rather than as facts.

| Category | Examples |
|---|---|
| Weird history and inventions | Seismoscope jar (Zhang Heng), grave safety bells, storm oil, origin of the dash cam |
| Engineering "why" | Rail expansion gaps, clothoid (teardrop) roller-coaster loops |
| Strange laws and culture (Japan, twice) | Pachinko prize/token loophole, "oidashi beya" boredom rooms |
| Psychology and science experiments | Baker-Miller pink cell, Edison's hypnagogia steel-ball nap |

What the topics share:
1. A **physical, visual object** at the centre (jar, bell, oil, gap, loop, pink paint, window, camera, steel balls).
2. A **counter-intuitive cause** that can be explained in one sentence.
3. A **human conflict** wrapped around it: a genius who gets mocked, a scammer, a schemer, an underdog.

### 3.2 The hook (first 2–5 seconds)

All 10 hooks:

| # | Hook | Type |
|---|---|---|
| Jar | "He put a bronze ball in a dragon's mouth and told the emperor, if this ever falls out, run!" | Weird deliberate act plus warning |
| Pink | "They painted the jail cell pink, and not just any pink." | Weird deliberate act |
| Roller | "He bent the rollercoaster's loop out of shape." | Weird deliberate act |
| Grave | "They buried a man alive with a bell tied to his finger." | Weird deliberate act |
| Dash cam | "He slammed the brakes on the highway, and the car behind him smashes right into his bumper." | Weird deliberate act |
| Railroad | "He sawed gaps into a railroad every 39 feet." | Weird deliberate act |
| Oil | "He poured cooking oil into the sea." | Weird deliberate act |
| Job | "It's impossible to get fired in Japan, but companies found something way worse." | Paradox |
| Window | "Gambling is illegal in Japan, yet there's a gambling hall on almost every street." | Paradox |
| Brain | "If you fall asleep holding two steel balls, you might wake up a genius!" | If-then promise |

**The hook formula (7 of 10):** `He/They` + **past-tense verb of a deliberate act** + **an everyday object** + **somewhere it doesn't belong**. It's 6–19 words long and has no setup, no "did you know", and no greeting.

- The act sounds **stupid or wrong on purpose**, so the viewer stays to find out why.
- The **title asks the "why" question**, the hook shows the "what", and the answer is held back until about 65–90% of the way through.

### 3.3 Beat structure

Measured with word timestamps (percentage = position in the video):

| Beat | Where | What happens | Example |
|---|---|---|---|
| 1. Hook | 0–7% | The weird act | "He poured cooking oil into the sea." |
| 2. "You see," context | 7–15% | One sentence of setting | "You see, two companies are racing to build a railroad…" |
| 3. Mockery or doubt | 10–35% | Someone laughs or objects, often in a quoted line | Court bursts out laughing · boss's face goes purple · "We're about to get boarded and you're making soup?" |
| 4. Hero stays calm | 20–40% | Deadpan refusal or a cryptic instruction | "Trust the oil." · "But he won't close a single one." |
| 5. Escalation with time jumps | 25–65% | "Weeks later…", "Then one night…", "In May… By July…", "Every Friday…" | |
| 6. Twist or crisis | 55–75% | Things flip | Bell rings and the wife doesn't move · the guy disappears · the pink cell is forgotten |
| 7. Mechanism ("You see," again) | 63–90% | The real science or law in 1–3 sentences, often with an everyday analogy | "Ever blown on a bowl of soup?" · "a car can creep around a hairpin at five, but take it at 60 and it flips" |
| 8. Payoff and punchline | Last 5–10% | Visual payoff, often a catastrophe for the mocker, then a one-line ironic close, then the video ends | "…and on paper, nobody gambles." · "…and the house was all hers." · "And that's how the dash cam was invented." |

**"You see,"** is the signature connector. It appears **11 times across 9 of the 10 videos**, usually twice: once at about 10% to set the scene and once at about 75–90% to deliver the reveal.

### 3.4 Language and storytelling devices

- **Historical present tense.** The story starts in past tense in the hook, then switches to present for immediacy: "He's the youngest engineer… his boss sees…", "the captain yells", "she just sits there".
- **Second-person immersion** in the explainer topics: "Imagine your boss walks you past your desk…", "So, you win a bucket yourself…".
- **Quoted character lines** in 7 of 10 videos (1–3 per video). They are snarky, short, and funny:
  - "Barbie's gonna love it in here."
  - "Hey, it's the toy guy! Did your frogs get hungry again?"
  - "Sir, this is your fifth neck injury this year." / "Yeah, I've got a really weak neck."
- **The narrator voices the audience's confusion**, then answers it: "Wait, what? Well, nobody can explain it." · "Wait, practiced? Well, he was never dead." · "Does he know what he's doing? Not really."
- **Hyper-specific numbers** for credibility: 39 feet, 15 minutes, 300 pounds, one pint of red into a gallon of white, 50 yards, fifth neck injury, every Friday until six.
- **Rule of three and staccato fragments** to build tension: "Then, one night, a ball dropped. Then another. Then all eight at once." · "At 15 minutes, he's sitting quietly. At 20, he's pacing…"
- **Vocabulary is plain**, about grade 4–6. Sentences average **10–18 words**. Long run-on sentences of 27–42 words, joined with "and… and…", are used for chaos and montage moments.
- **No CTA, no "subscribe", no intro, no outro, no "in this video".** The last sentence is the punchline.

### 3.5 Pacing, intensity, and suspense

- **201–231 words per minute** (average 222). That's fast, about 1.5× normal conversation.
- **Very few pauses.** Each video has only 6–19 gaps longer than 0.25 s, and the longest is 0.46 s. Speech fills about 92% of the runtime.
- Pauses fall in three places: after the hook, before "You see," and before the punchline. **Tension is built with words, not silence.**
- Intensity is **flat-high**: the mix has almost no loudness range. Suspense comes from the **information gap** (the "why" is withheld) and from **"until one night…"** reversals, not from slowing down.

### 3.6 Voice and delivery

- **One narrator** in all 10 videos: the same timbre and the same delivery.
- Median pitch is about **195 Hz**, with a **very wide range** (10th–90th percentile: 113 to 309 Hz). The delivery is animated and sing-song, like a storyteller, not a documentary voice.
- **The narrator does all the character voices** by pitch-acting:

| Line type | Example | Pitch |
|---|---|---|
| Mocking or angry | "You're wrecking my railroad!" | ~344 Hz |
| Mocking or angry | "you go check!" | ~397 Hz |
| Deadpan or smug | "Barbie's gonna love it in here" | ~151 Hz |

- The pitch range suggests either an expressive human narrator or a top-tier expressive AI voice. Either way, the important thing is **range**, not gender.

---

## 4. Background sound

### 4.1 Music

**Measured:**
- A **music bed runs under the voice the whole time.** It is tonal, not noise: spectral flatness is about 0.01.
- In the tiny gaps between words it sits **about 10 dB below the voice**: roughly –27 dBFS RMS against about –17 for the voice.
- It **stays flat**: no big drops or swells.
- Its tonal centre is usually around **D or C** in most videos.
- It **ends with the voice.** Ancient Jar's tail is at –62 dB, i.e. silence.

**Inferred** (the exact tracks can't be named from analysis):
- The bed is a **light, quirky or "mischievous-mysterious" underscore** of the kind used by animated explainer channels: plucked or pizzicato strings, soft mallets or bells, gentle low pulse.
- It works because it **never competes with the 222-words-per-minute voice**. Its job is to fill silence and set a "curious story" mood, not to signal emotion.
- Darker topics (Grave Bell, Brain, Window) have a darker, lower bed. Lighter ones (Railroad, Roller Coaster) are brighter. All of them are low and constant.

**To copy it:** pick one instrumental per video from the "quirky / curious / mischievous / mystery-pizzicato" mood in your music library (YouTube Audio Library, Epidemic, Artlist). Duck it to **–24 to –28 dB under the voice**, keep it steady, and cut it at the last word.

### 4.2 Sound effects

- I checked whether the audio does anything distinctive at the ~250 visual transitions compared with random moments. **There was no systematic whoosh on every transition.**
- So **transitions are mostly carried by the music and the voice, not by whooshes.**
- Sound effects are **literal and sparse**, on story actions only (based on what's on screen and the brief transients that line up with it):
  - Bell rings (Grave)
  - Splash and pour (Oil)
  - Crash and impact (Dash Cam)
  - Balls hitting plates, drawn on screen as white "sound ripple" arcs (Brain)
  - Ball drops and clinks (Jar)
  - Clack (Railroad)
  - Explosion booms at the finales (Roller Coaster, Railroad, Oil)
  - Laughter and crowd moments
- Keep them **short and under the voice**.

### 4.3 Mix recipe

| Element | Level |
|---|---|
| Voice | Peaks around –1 dBTP, heavily compressed, about –17 dB RMS |
| Music | About –27 dB, steady |
| SFX | Under the voice, except the finale explosion |
| Whole mix | Master to **–14 LUFS integrated** |

---

## 5. Visuals

### 5.1 Render style: 2D characters inside 3D worlds

This is the core of the style.

**Environments are 3D scenes** with real perspective, parallax, depth of field and volumetric light. There are two flavours:
- **A. Bright game-engine look.** Realistic grass and clouds, glossy cars, sky domes. Used in Roller Coaster, Dash Cam and Railroads. It looks like Unity or Unreal with stylised asset packs.
- **B. Cel-shaded or "toon" 3D.** Thick black outlines on the geometry, painterly flat textures, stylised waves and snow. Used in Grave Bell, Storm Oil, Window, Job, Ancient Jar, Pink Cell and Brain.

**Characters are flat 2D sprites** standing in those 3D sets like cardboard cut-outs ("billboards"):
- They **cast soft ground shadows** that match the scene's light.
- They **take on the scene's colour grade**: blue at night, orange by candle, magenta in the pink cell, purple under neon, a moonbeam across the widow's face.

This mix is the "secret": cheap 2D acting combined with expensive-looking 3D camera work.

### 5.2 Character design system ("ball-head" characters)

| Part | Spec |
|---|---|
| Head | Large **white or off-white circle**, about 40% of body height, thick dark-brown or black outline (3–5 px at 720p), soft pink cheek shading on the lower half |
| Hair | A single flat shape on top: bob, swoop, bun, curls, topknot. Often grey or brown |
| Face | **Dot eyes** (neutral), **circle eyes with dots** (shocked), **closed "^ ^" arcs** (happy or smug), **half-lid lines** (deadpan), **slanted brows** (angry), **"><"** (laughing or pain). Mouth: line, small "o", wide open, or **grid of teeth** (big grin or grimace) |
| Body | **Bean or capsule torso** in a solid colour that carries the costume: vest, apron, overalls, suit, tie, polo, robe |
| Limbs | **Thin black stick arms and legs**, no hands or feet (rounded ends), bending in smooth arcs |
| Identity | **Hat or prop = role**: chef toque, captain's bicorne, bowler hat with cane, newsboy cap, nightcap, red cap, police cap, plumed helmet, top hat, rice-hat cap. Each character keeps **one signature colour** for the whole video |
| Acting extras | **Sweat drop**, **steam puffs from the head**, **face turning purple** (anger), Zzz, sparkles, sunglasses snapping on |

The roles are archetypes:

| Archetype | Behaviour | Examples |
|---|---|---|
| Deadpan genius or schemer | Half-lidded, smug, barely moves | Chef, engineer, inventor, quiet driver, widow |
| Mocker or authority | Laughs, yells, turns purple | Boss, captain, emperor, rival, guards |
| Crowd | Laughing in sync, cheering, standing in line | |
| Victim of karma | Gets the explosion | Rival's cart, pirates, perfect railroad |

### 5.3 How characters move

- **Limited motion, like a cut-out or puppet.** There is no full walk-cycle realism. Characters:
  - Slide in and out
  - Bob gently
  - Lean, tilt the head, gesture with one arm (pointing, raising a mug, swinging a hammer or shovel)
  - Pop into a new pose between shots
- When a character "walks", it's a short **bouncy leg swing while the body glides**.
- Big actions are sold by **the camera, effects and props**, not by body animation: cash explosions, splashes, rails glowing, a wave curling.
- **Characters often sit inside vehicles or rides** (cars, a coaster cart, a train window, a ship deck). The 3D object moves and the sprite rides along with it.

### 5.4 Facial expressions and lip sync

- **Expressions change about every 1–2 seconds**, usually **at each shot change** (each new shot shows a new pose and face). They also swap mid-shot on key words: "laughs" → "><" laughing face; "purple" → face turns purple with steam.
- **Lip sync is simple.** The mouth only moves on **quoted dialogue** (captain yelling, boss "You're wrecking my railroad!", guard "Hey, it's the toy guy!"). During narration the mouth is a fixed expression.
- Mouth changes are **2–4 shape swaps or scale changes**, not phoneme-accurate. Frame by frame, the boss's teeth-grid grin **shrinks over about 8 frames and disappears** into a closed smile.
- **Eyes do the acting.** Most emotion is in the eye and brow swaps plus sweat drops.

### 5.5 Camera and visual pacing

- **The camera never stops moving.** Every shot has a push-in, pull-out, orbit, crane, dolly or fly-through. About 20–45% of frames are near-still, and those are usually close-ups on a face.
- Shot types used constantly:
  - Low angle looking up at a character (power and comedy)
  - Over-the-shoulder two-shots
  - Big establishing **flythroughs**: canyon dive, city night aerial, theme-park drone
  - **First-person POV**: coaster cart, driver's seat, dash-cam HUD
  - **Macro inserts** of the key object: wine surface, rail gap with calipers, soup bowl from above, paint being mixed
- **About one new visual every 2.3 s** (1.8–3.3 s). Shot length tracks the script: **one shot per clause**, each one illustrating the main noun of that clause.
- **Transitions:** 0–7 hard cuts per video (Dash Cam has the most). Everything else is a **soft 6–12 frame cross-dissolve** or a **continuous camera move into the next scene** (whip or blur). You can see ghosted dissolve frames at Roller Coaster 22.0 s, Grave Bell 10.0 s and 23.5 s, Storm Oil 22.5 s, and Pink Cell 11 s and 30 s.
- Speed ramps and motion blur appear on the big reveals: the Railroad canyon dive and the Window street flythrough.

### 5.6 How visuals sync with the voice

- **Literal visual matching.** When the narrator says a noun, that noun is on screen.
  - "one pint of red into a gallon of white" → a top-down macro of red pouring into white paint with a label reading "1 PINT RED : 1 GAL WHITE".
  - "eight dragons… a frog's open mouth" → the camera orbits the jar over the frogs.
- **Shot changes land on the start of a new clause**, often on the stressed word ("**Then** one night…", "**The next morning**…").
- **On-screen text props reinforce the script as visual jokes:**
  - "GRAND OPENING", "FIRST!", "FIRST LINE IN GETS IT ALL!"
  - "STORM OIL" tin, "CERTIFICATE OF DEATH"
  - "DAYS SINCE LAST NECK INJURY 2" flipping to "0"
  - "CAREER DEVELOPMENT ROOM" (the euphemism for the boredom room)
  - "GAMBLING: NONE ☑" clipboard
  - "The Red Mesa Herald – THE CLICKETY CLACK LINE!", "HYPNAGOGIA"
- **Explainer inserts at the "You see" reveal** switch to diagram mode:
  - Cross-section of grave soil, coffin and string
  - X-ray body with glowing nerve
  - Sleep-depth gauge drawn as water depth
  - Cork board with red strings
  - Jar interior mechanism
  - Earth cross-section with a glowing fault line
  - Glowing trace along the coaster loop showing curvature
  - Rails glowing heat-map colours
  - Dash-cam HUD (REC dot, date, MPH counting down)

### 5.7 Lighting and time of day

Time of day tracks the story:

| Story phase | Lighting | Examples |
|---|---|---|
| **Setup and normal life** | Bright midday, saturated sky, puffy clouds | Railroad canyon, theme park, Dash Cam suburb, office |
| **Scheme, sabotage, danger** | **Night**: deep blue or violet, a full moon, stars, rain or snow | Roller Coaster sabotage, Grave Bell 2 a.m., storm at sea, Window alley, Ancient Jar quake night |
| **Exile or emotion** | **Golden-hour sunset** silhouette | Inventor dragging the jar up the hill |
| **Resolution** | **Dawn or sunrise** pink-blue sky, or "the next morning" bright | Grave Bell ending, Ancient Jar rubble, Roller Coaster opening day |

Interiors are always lit by **visible lamps**:
- A single hanging bulb with a spotlight pool (Brain)
- A candle on the nightstand (Grave bedroom)
- Fluorescent ceiling strips (pachinko hall, prison, office)
- String lights (pool party, coaster)
- Lanterns (porches, galley)

**Windows act as light sources:** moonlight god-rays across a face, a warm window glowing in a dark alley. The strategy is **warm interior against cold exterior**. Brightness ranges from about 73 (Brain, the darkest) to about 131 (Pink Cell, Job, the brightest). Saturation is moderate, except the cel-shaded sea in Storm Oil, which is the most saturated.

### 5.8 Shadows

- Characters always have a **soft contact shadow** under their feet, plus a **directional cast shadow** in sunny 3D scenes. For example, the engineer's shadow falls across the rails, and the coaster characters cast shadows on the platform.
- At night the shadows are soft blobs. Interiors have **pools of light** with hard falloff (the Brain bulb, the Grave candle).
- Shadows **move with the camera** because they're rendered in 3D. This is the main thing that makes a 2D sprite feel "in" the world.

### 5.9 Locations by video

| Video | Locations in order |
|---|---|
| Ancient Jar | Imperial stone throne hall → jar macro and dragon orbit → courtyard with a huge army → wine goblet macro → city gate → hill at sunset → night on the hill (moon) → city gate seen through bars → rampart with guards → morning rubble with smoke → inside-jar mechanism → earth cross-section with glowing quake |
| Job | "FIRE" button desk → boss office with calligraphy → open office → green-wall "Career Development Room" with clock → coworkers' office → empty inbox phone → night office tower exterior → cleared desk → hallway with "LABOR LAW" fire alarm → door label close-up |
| Pink Cell | Grey prison wall → paint shop → paint-mixing macro → hot-pink cell → prison pod C common area → pink cell (inmate) → arm-wrestle table → aerial farmland → prison yard with pink truck → night guard desk with CCTV monitor → pink cell rampage → knitting inmate (callback) |
| Window | Night alley nook → neon street flythrough → city aerial → pachinko aisle → "PRIZE HALL" doorway with cop → machine → prize counter → "THANK YOU" exit → dark alley window → cop with "GAMBLING: NONE" clipboard |
| Roller Coaster | Sunny theme park with blueprint easel → night platform "GRAND OPENING TOMORROW" → moonlit loop under string lights → morning carnival with red carpet → coaster POV → hairpin road with car flip → glowing loop diagram → loop ride → mushroom-cloud explosion |
| Grave Bell | Dusk cemetery → open grave → soil cross-section → snowy night bell → candlelit bedroom → snowy street of porches → doctor with certificate → widow's moonlit parlour → wall chart of ring codes → sunny flashback (creditors' line, cabbage garden) → "WEST" signpost → parlour (all night) → sunrise grave |
| Dash Cam | Car interior → highway crash → suburb lawn (insurance adjuster) → cash explosion → sunset highway (picking targets) → night driveway crash of the supercar → skyscraper insurance office → pool party → night driveway with police → rainy highway → interior of the quiet guy's car → dash-cam HUD footage → camera reveal |
| Railroads | Canyon tracks → flythrough into a bottomless canyon → desert → grand station "FIRST LINE IN GETS IT ALL" → workers on a beam → boss on the tracks (purple face) → rival bridge construction → luxury train car interior → train-window passenger → station with newspaper → calendar and thermometer → rail-gap macro with calipers, coin and paper → perfect bridge with tycoon under a parasol → hottest-day heat glow → rails buckle like a snake → explosion |
| Storm Oil | Ship deck (chef pouring) → pirate ship with dog figurehead → deck argument → storm sky → grappling hook → laughing pirates with mugs → night storm with giant waves → galley interior with porthole → soup bowl macro (analogy) → oily patch glow → wave curls onto the pirates → explosion |
| Brain | Dark room with a single bulb and concentric rug → plates and balls → X-ray body → Edison's Menlo Park lab → sleep depth drawn as an ocean → underwater face "HYPNAGOGIA" → cork board idea map → "elevator of sleep" → holding up the "MAGNET CAR!" sketch |

### 5.10 Captions

- **1–3 words per caption**, one chunk at a time, synced to the word.
- Text is **lowercase or sentence case as spoken**, with punctuation kept ("the sea.", "No, you").
- **White, bold, rounded geometric sans** (closest free fonts: *Montserrat ExtraBold*, *Poppins Bold*, *Nunito Black*) with a **thin black outline plus a small drop shadow**.
- **No colour highlighting, no emojis, no pop or bounce animation.** Captions just switch.
- Position: **centred, about 70% down the frame** (about y = 900 of 1280), clear of YouTube's bottom UI and away from characters' faces.

### 5.11 Endings

The ending is **visual karma or a catastrophe, then a smug reaction close-up**:
- Mushroom-cloud explosions in Roller Coaster, Railroad and Storm Oil
- Rubble in Ancient Jar
- The camera reveal in Dash Cam
- A **callback image**: the inmate knitting a pink scarf, the widow tamping the grave at sunrise, the empty "Career Development Room" door

It ends on the last word, with no hold.

---

## 6. Why it works (the logic)

1. **A curiosity gap that lasts 45 seconds.** The hook shows a weird act, and the "why" only arrives at about 75%. Viewers stay for the answer.
2. **Story instead of facts.** There's a hero, mockers, escalating stakes and karma. The facts are hidden inside a revenge or underdog plot, so it feels like entertainment rather than education.
3. **Sensory overload with zero dead air.** About 222 words per minute, a new image every ~2 s, the camera always moving, captions every ~0.5 s. There's no moment to swipe away.
4. **Literal visuals.** Every sentence is shown, so the video is understandable with the sound off and rewatchable with it on.
5. **Cheap characters, expensive-looking worlds.** The 2D ball-heads are fast to produce. The 3D environments and camera moves give a premium, "animated movie" feel.
6. **A seamless loop.** It starts at the first frame and ends on the last word, which pushes replays and raises the watch-time percentage.

---

## 7. How to replicate it without making it hard

### 7.1 Tool stack, three levels

| Step | Level 1: easiest (solo, about 3–5 h per video) | Level 2: closer match | Level 3: full match |
|---|---|---|---|
| Script | Template in 7.2 + any LLM | Same | Same |
| Voice | ElevenLabs or a similar expressive voice, stability low (~30–40%), style high | Your own voice, energetic, with character pitch-acting | Pro VO |
| Characters | Build **one ball-head kit** as PNG layers (head, 8–10 eye sets, 6 mouths, brows, sweat drop, steam, 6 bodies, 10 hats) in Figma, Illustrator or Procreate. Reuse it forever | Same kit rigged in **Adobe Character Animator** or **Moho**, with mouth swaps triggered by audio | Same |
| Backgrounds | **AI images** in "stylized 3D toon-shaded game environment, cel shading, thick outlines, vertical 9:16" (Midjourney, Flux, Ideogram), then fake the camera move with **2.5D parallax** (CapCut "3D zoom", After Effects with depth maps, or LeiaPix-style tools) | **AI image-to-video** (Kling, Veo, Runway, Hailuo) on each background for real camera moves: push-in, orbit, flythrough | **Blender, Unreal or Unity** with stylised asset packs (e.g. Synty POLYGON / "toon" packs) and **2D character planes inside the 3D scene**, so shadows and parallax are real. This is how the originals appear to be made |
| Compositing | CapCut or After Effects: place sprites, add a **soft drop shadow under the feet**, and **colour-tint the sprite to match the scene** (blue at night, orange by lamp) | Same, plus light wraps | Rendered in engine |
| Edit | CapCut or Premiere: one shot per clause, 6–10 frame dissolves, auto-captions restyled | Same | Same |
| Audio | Music library bed at –27 dB, a few literal SFX, master –14 LUFS | Same | Same |

**Easiest high-quality route:** Level 1 characters, Level 2 backgrounds (AI image-to-video for the moving 3D look), and CapCut for everything else.

### 7.2 Script template (fill in the blanks)

```
TITLE: "Why ___" / "The ___ That ___" / "What ___ Really Meant"   (the question)

[0–4s HOOK]  He/They [did a weird deliberate act] with/to [everyday object] [where it doesn't belong].
[4–8s]       You see, [one-sentence setting + stakes].
[8–20s]      [Authority/rival] mocks it. "[Snarky 6–10 word quote]."
             But he [deadpan refusal / cryptic instruction].
[20–40s]     [Time jump]. [Escalation]. [Time jump]. [Bigger escalation].
             (Use a staccato rule of three: "Then X. Then Y. Then Z.")
[40–48s]     TWIST: "Until one night/morning, ___." Optional: "Wait, ___? Well, ___."
[48–58s]     You see, [the real mechanism in 1–2 sentences].
             [Everyday analogy: "Ever ___? ___."]
[58–62s]     [Visual payoff: the mocker gets karma] + [one-line ironic punchline]. END.
```

Rules:
- 210–240 words for about 60 s (about 150–165 for 40–45 s).
- Sentences of 8–15 words, with one long run-on chaos sentence allowed.
- At least 3 hyper-specific numbers.
- 1–3 quoted lines from characters.
- No CTA or outro.

**LLM prompt to generate scripts:**

> Write a 230-word YouTube Shorts narration about [TOPIC / REAL FACT]. Structure: (1) a hook of 6–15 words where "He/They" does a weird deliberate act with an everyday object, with no context. (2) "You see," plus a one-sentence setting. (3) Someone mocks it in a short, funny quoted line. (4) The hero stays deadpan. (5) Two time-jump escalations ("Weeks later", "Then one night"). (6) A twist. (7) "You see," plus the real mechanism in plain words with an everyday analogy. (8) The mocker gets karma, then a one-line ironic punchline, then stop. Use present tense after the hook, grade-5 words, 3 specific numbers, no call to action, and never say "did you know".

### 7.3 Shot list rule (turn the script into visuals in minutes)

1. Split the script into **clauses** (break at commas and periods). You get about 25–30 clauses for 60 s.
2. For each clause, write **one shot**: `[location] + [character + expression] + [camera move] + [key object from the clause]`.
3. Choose time of day by beat: **setup = day**, **scheme or danger = night**, **resolution = dawn**.
4. At the "You see" mechanism, switch to **diagram mode**: cross-section, X-ray, glowing trace, or a macro of the object.
5. Add 2–4 **text props** that echo the script as jokes (signs, labels, newspapers, counters).
6. End on a **catastrophe or callback**, then a **reaction close-up**.

### 7.4 Edit settings checklist

- [ ] 1080×1920, 30 fps, voice starts at frame 0, video ends ≤0.3 s after the last word
- [ ] New visual every 1.8–2.7 s. Mostly **cross-dissolves of 6–10 frames** or whip pans; hard cuts only on impacts
- [ ] Every shot has a camera move: 5–15% push-in or pull-out, or parallax
- [ ] Characters: expression swap on every shot plus on key words. Mouth moves **only on quoted lines**. Sweat drops and steam for emotion
- [ ] Sprites: contact shadow, scene-matched colour tint, slight bob
- [ ] Captions: 1–3 words, white bold rounded sans, black stroke, small shadow, centred at about 70% height, no highlight colour
- [ ] Voice about 222 words per minute (speed up 1.05–1.15× if needed), pauses ≤0.4 s
- [ ] Quirky or mystery instrumental at about –27 dB, steady, ending at the last word. SFX only on literal actions plus a finale boom
- [ ] Master to –14 LUFS

---

## 8. Files in this folder

- `STYLE_BREAKDOWN.md`: this report
- `transcripts/*.md`: full transcript of every video, line by line with times, plus **every word with start and end timestamps** and the list of visual-change times
- `data/*.json`: raw measurements per video (words, visual-change times, per-frame statistics summary)

**Still to add:** the breakdown video (youtu.be/v6fu76wmfjg) could not be loaded because YouTube is blocked in this session's network. Paste its transcript or notes and they can be merged into section 7.
