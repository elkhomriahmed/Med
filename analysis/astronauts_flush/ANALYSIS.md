# Competitor deep-dive: "Why Astronauts Can't Flush in Space" (2026-11-23)

Source: YouTube Short NpRAk-5VKlo (61.3 s, 1080×1920, 30 fps); a local copy `astro.mp4` is here but not in git. Measured with Whisper
(`words.json`), frame sheets (`sheet0-3.jpg`), transition frames (`trans.jpg`), `kit/tools/palette_check.py` and
`kit/tools/transition_check.py`. Compared against our video 2 (lemon juice robber) after the user's 2026-11-23 feedback.

## 1. Story: one question, one chain of cause and effect, paid off in the last line

Script: 205 words in 60.7 s (3.4 words/s). One protagonist ("the new guy"), one place cluster (the ship + mission control).

| Time | Beat | What it does to the viewer |
|---|---|---|
| 0.0–3.4 | **"If you flush the toilet on a spaceship, you'll never make it back to Earth."** | Second person + a harmless everyday act + a deadly stake. The question is *how?* and it is open for 57 s |
| 3.9–7.4 | "You see, mission control tells astronauts exactly when they're allowed to flush." | Plants the RULE (setup that must pay off) |
| 8.0–13.0 | Tonight: no flushing. The new guy rolls his eyes: "It's a toilet! What's it gonna do?" | The rule-breaker with attitude. Dramatic irony: we know from the hook it will go wrong |
| 13.6–16.7 | That night, while everyone's asleep, he floats to the back and flushes | The transgression, shown (sneaking) |
| 17.5–24.8 | Next morning: hundreds of NEW STARS glittering beside the ship. "Stars that aren't on any map." | A MYSTERY PICTURE: strange, beautiful, unexplained. A second open loop |
| 25.3–28.2 | The radio crackles: "You're drifting off course! Who flushed?" | Consequence + blame. Stakes become real |
| 28.8–32.4 | Every hour they drift, another few thousand miles from home | Ticking clock: stakes ESCALATE |
| 32.9–34.6 | **"But how do you get lost from one flush?"** | The narrator says the viewer's question out loud at the midpoint and promises the answer |
| 35.3–43.4 | No pipes, a hose that sprays into space; every flush kicks the ship sideways like a tiny rocket | Mechanism part 1 explains the DRIFT |
| 44.0–55.2 | The spray boils and freezes into ice crystals that glitter like stars; even astronauts can't tell which are real | Mechanism part 2 explains the NEW STARS (the mystery picture pays off) |
| 55.5–60.4 | No GPS out here: the only way home is lining up the real stars | Ties both loops to the hook's stake ("never make it back"): the circle closes on the last word |

Why it holds attention: (1) the hook makes a promise ("never make it back") that only the LAST line fully pays; (2) every beat is
caused by the one before it (rule → broken rule → mystery → consequence → bigger consequence → explanation); (3) each new beat
raises the stakes or opens a question before the previous one is answered; (4) every setup pays off (rule, flush, new stars,
drifting, "home"); (5) no new main character, no lecture, no tangent; the explanation is told through the ship we already know.

### Where video 2 broke this
- The hook gave away the trick and the "why" was answered at 5 s ("lemon juice is invisible ink"). Nothing was left to wait for.
- No escalating stakes: he robs, he waves, he's caught at 43 s. The story is over with 20 s left.
- Then a NEW protagonist (the professor) and an abstract lecture (Dunning-Kruger) with no picture of danger → viewers left.
- The payoff ("ended up in textbooks") didn't close a question that the hook had opened.

## 2. Hook: "If you…" (second person) or a strange act + a deadly/absurd stake
- "If you flush the toilet on a spaceship, you'll never make it back to Earth." It puts the VIEWER in the act, names an
  everyday action and attaches an outsized consequence. The first picture is the funniest version of it (astronaut on a toilet,
  Earth in the window), then the ship flying with a plume.
- This format works for "what if" topics (what happens if you do X) as well as for real stories told in second person.

## 3. Transitions: cut between far places, glide only within a place; a sound on every change

Measured visual changes vs a 5–12 kHz sound accent within ±0.2 s (× median level):
- Competitor: 1.1 s (2.9), 4.6 (11.1), 10.0 (8.5), 26.8 (12.7), 28.9 (14.0), 37.7–39.1 (11–12), 52.0 (12.3). Almost every
  place change carries a strong accent (whoosh, shutter, crackle, impact). Only the calm last 5 s cut without one.
- Video 2: several place changes without any accent: 16.9 (2.0), 27.4 (1.8), 32.6–32.9 (1.0–2.0), 35.3 (3.1), 39.7 (1.4),
  59.9 (4.7).

How they change place (`trans.jpg`):
- **Mission control → crew quarters:** the "NO FLUSHING TONIGHT" message on mission control's wall screen MATCH-CUTS to the same
  message on the crew's monitor, then pulls back to the crew. Two far places joined by the same picture.
- **Ship radio → mission control:** the radio crackles in close-up, hard cut to the controller shouting the line (sound bridge).
- **Mission control → ship porthole → ship exterior:** hard cuts on new sentences, each with an accent sound.
- **Within the ship:** continuous moves (push out of the cockpit window into space, glide down the hull to the hose).
- They NEVER fly from Earth's mission control to the ship. Long flights would be dead time.
Video 2 flew apartment → bank 1 → bank 2 → apartment → police (≈1 s each, across the street). The user: that is where viewers
were lost. The kitchen → couch glide (same room, ~4 m) was good.

## 4. Colour: one cool base for the whole video + hot accents, deep darks, saturation in the right places

`palette_check.py` (1 frame/s, saturated pixels = sat > 0.25):

| | Competitor | Video 2 |
|---|---|---|
| Hue share of saturated pixels | **82% blue/cyan (210–270°)**, ~8% red/orange/yellow accents | **78% red/orange (0–60°)**: brown wood, brick, beige walls, orange couch |
| Strongly saturated pixels (sat > 0.6) | 38.5% | 24.4% |
| Dark pixels (v < 0.25) | 53% | 34% |
| Bright pixels (v > 0.85) | 7% | 3% |
| Dominant family per second | blue/cyan almost every second, red only on alarm beats | "red" (orange-brown) every second |

What that means:
- One video-wide colour SCHEME (cool navy/blue base + complementary warm accents: yellow suit, orange hull stripe, red alerts).
  Every place belongs to it, so cuts between places feel like one world.
- The saturation lives in the ACCENTS and the characters' clothes (yellow, red, purple), set against dark, cool, low-detail
  backgrounds. The midtones are not muddy.
- Deep darks + a few crisp highlights (stars, screens, white toilet) give contrast; the eye always knows where to look.
- Alarm/turning-point beats switch the accent (red "OFF COURSE"), a colour signal for tension.
Video 2: every place had its own warm palette and the warm grade pushed everything toward brown/orange. Saturated, but in the
midtones (wood, brick, beige), so it reads as muddy, with no cool counterweight and nothing popping.

## 5. Other measurements
- Shots: a new framing every ~1.5–2.5 s, a new PLACE every ~4–8 s; inserts (star map, radio, phone "No GPS", telescope POV)
  are used as quick cutaways to make an idea concrete.
- Text on screen inside the world (NO FLUSHING TONIGHT, OFF COURSE, LODESTAR, No GPS Signal) carries the story with sound off.
- Characters: 3 main faces + crowd; the protagonist's yellow suit is the brightest object in almost every shot.
