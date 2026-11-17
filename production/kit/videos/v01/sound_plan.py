"""Video 1 sound plan: every effect pinned to its word (word index into public/audio/words_v4.json).
Run: python -I videos/v01/sound_plan.py  ->  writes videos/v01/sound.json (read by tools/mix_fx.py and the composition)."""
import json, os
K = os.path.dirname(os.path.abspath(__file__)) + "/../.."
W = json.load(open(K + "/public/audio/words_v4.json"))
T = lambda i: W[i][0]
END = W[-1][1] + 0.3
# (file, time, gain dB) — story sounds on their word; flights get whooshes just before the arrival
S = [
 ("finger_glass_glide", T(1), -8), ("mercury_wobble", T(8), -12),
 ("gears_creak_ping", T(22) - 0.1, -8),
 ("crank_ratchet", T(29), -9), ("clock_fast", T(33), -12),
 ("sandwich_bite", T(42) - 0.25, -8),
 ("flight_whoosh", T(43) - 0.45, -10), ("ship_creak_wave", T(46) - 0.1, -8), ("sailors_panic", T(47), -12),
 ("flight_long_whoosh", T(49) - 0.4, -11), ("rowboat_bump", T(52), -8), ("steps_toolbox", T(55), -10),
 ("flight_whoosh", T(56) - 0.4, -11), ("jump_back", T(59), -16),
 ("mercury_pour", T(64), -8),
 ("finger_poke", T(73), -7), ("blow_finger", T(76) + 0.15, -10),
 ("lens_spin", T(83) - 0.3, -8), ("record_scratch", T(86), -9), ("jump_back", T(86) + 0.35, -12),
 ("laugh_kneeslap", T(90) - 0.05, -9),
 ("chest_poke", T(92), -9), ("mercury_wobble", T(107), -12),
 ("flight_whoosh", T(108) - 0.3, -11), ("beam_sweep", T(115) - 0.2, -9),
 ("flight_long_whoosh", T(117) - 0.4, -12), ("rag_polish", T(122), -10), ("notes_pop", T(136) - 0.1, -10),
 ("flight_whoosh", T(137) - 0.4, -11), ("boat_horn", T(141), -12), ("question_boing", T(143), -10),
 ("post_handshake", T(148), -9), ("barrel_climb", T(156) - 0.1, -9),
 ("flight_whoosh", T(157) - 0.35, -11), ("oilcan_spill", T(163), -9), ("oilcan_spill", T(167), -9),
 ("keeper_yell", T(171), -12), ("seagulls", T(174) - 0.1, -10),
 ("flight_long_whoosh", T(180) - 0.45, -11), ("town_laugh", T(183) - 0.1, -10), ("head_knock", T(191), -9),
 ("flight_long_whoosh", T(193) - 0.2, -11),
 ("plaque_ding", T(204), -9), ("lens_spin", T(209) - 0.2, -11), ("vapour_hiss", T(218) - 0.2, -11),
 ("hatch_bolt", T(223), -9), ("snore", T(227), -14),
 ("flight_whoosh", T(232) - 0.35, -11), ("beam_sweep", T(233), -10), ("foghorn", T(237), -15),
]
# ambience beds per place: (file, from, to, gain dB)
B = [
 ("night_sea_loop", 0.0, T(117), -24), ("morning_sea", T(117), T(137), -22),
 ("night_sea_loop", T(137), T(168), -25), ("winter_wind_loop", T(168), T(180), -20),
 ("town_ambience_loop", T(180), T(193), -21), ("night_sea_loop", T(193), END, -24),
]
json.dump({"end": END, "music": {"src": "music/music_bed_v01.mp3", "gain_db": -12}, "sfx": [dict(src=f, at=round(t, 3), db=g) for f, t, g in S],
           "beds": [dict(src=f, a=round(a, 3), b=round(b, 3), db=g) for f, a, b, g in B]}, open(os.path.dirname(os.path.abspath(__file__)) + "/sound.json", "w"), indent=1)
print(len(S), "effects,", len({s[0] for s in S}), "distinct + beds", len({b[0] for b in B}), "| end", round(END, 2))
