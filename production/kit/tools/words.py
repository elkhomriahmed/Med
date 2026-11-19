"""Time every word of a voiceover with Whisper and match the words to the script (punctuation from the script).
Usage: python -I tools/words.py VO.wav SCRIPT.txt OUT.json"""
import sys, json, re, whisper
m = whisper.load_model("small")
script = open(sys.argv[2], encoding="utf-8").read().replace("\n", " ")
r = m.transcribe(sys.argv[1], language="en", word_timestamps=True, initial_prompt=script, condition_on_previous_text=False)
w = [[round(x["start"], 3), round(x["end"], 3), x["word"].strip()] for s in r["segments"] for x in s["words"]]
w = [x for x in w if x[1] - x[0] > 0.001]
o = []
for x in w:
    if (x[2].startswith("-") or x[2].startswith("'")) and o: o[-1][1] = x[1]; o[-1][2] += x[2]   # two-ton, o'clock
    else: o.append(list(x))
s = script.split()
norm = lambda t: re.sub(r"\W", "", t.lower())
print(len(o), "timed words vs", len(s), "script words")
if len(o) == len(s):
    bad = [(i, a[2], b) for i, (a, b) in enumerate(zip(o, s)) if norm(a[2]) != norm(b)]
    print("mismatches:", bad[:10])
    for a, b in zip(o, s): a[2] = b
json.dump(o, open(sys.argv[3], "w"), separators=(",", ":"))
print("last word ends", o[-1][1])
