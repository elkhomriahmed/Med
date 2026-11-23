"""Video 3 sound plan: every effect pinned to its word (index into public/audio/words_v03.json). Library: ../asset_library.
Accent on EVERY cut/transition (STYLE_BIBLE 2026-11-23 C). Run from production/kit: python -I videos/v03/sound_plan.py"""
import json, os
K = os.path.dirname(os.path.abspath(__file__)) + "/../.."
W = json.load(open(K + "/public/audio/words_v03.json"))
T = lambda i: W[i][0]
END = W[-1][1] + 0.3
S = [  # (file, time, gain dB[, length s]) — RULE 2026-11-23: every effect is cut to its moment (CAP below), never played raw to the end
 ("match_strike_candle", T(2) - 0.05, -10), ("explosion_big", T(9) - 0.05, -19, 1.1), ("walls_collapse_debris", T(11), -19, 0.8),
 ("whoosh", T(13) - 0.12, -12), ("sign_slap", T(17) - 0.04, -9),
 ("flight_whoosh", T(20) - 0.12, -14), ("buzzer_nope", T(21), -12), ("flight_whoosh", T(22) - 0.12, -14), ("buzzer_nope", T(23), -12),
 ("flight_whoosh", T(24) - 0.12, -14), ("buzzer_nope", T(27), -11),
 ("flight_whoosh", T(31) - 0.12, -11), ("laugh_kneeslap", T(31) + 0.05, -12),
 ("whoosh", T(44) - 0.12, -11), ("wind", T(44), -15, 1.2),
 ("flight_whoosh", T(50) - 0.12, -12), ("tiptoe_stairs", T(52), -12), ("match_strike_candle", T(64) - 0.08, -11),
 ("sparkle_twinkle", T(76), -12), ("sparks_crackle", T(79), -11, 2.6),
 ("whoosh", T(89) - 0.1, -11), ("fireball_whump", T(90) - 0.05, -10), ("laugh_kneeslap", T(104), -13),
 ("flight_whoosh", T(107) - 0.12, -11), ("beams_rattle_creak", T(112) - 0.1, -10), ("ship_creak_wave", T(114), -16, 1.0),
 ("dust_pour", T(121), -11, 1.6), ("dust_pour", T(127), -13, 1.6),
 ("whoosh", T(138) - 0.1, -15, 0.45),                                        # snap to his face (cut accent only)
 ("flight_whoosh", T(151) - 0.1, -11), ("vapour_hiss", T(156), -15, 1.0), ("flour_poof", T(159), -11),
 ("whoosh", T(171) - 0.1, -16, 0.4),                                         # cut to the chain-reaction stage (quiet accent only)
 ("flight_whoosh", T(189) - 0.1, -10), ("dust_pour", T(197), -12, 1.4),
 ("explosion_big", T(206) - 0.04, -17, 1.5), ("walls_collapse_debris", T(215), -15, 1.6), ("impact", T(221), -12, 0.6),
 ("flight_whoosh", T(225) - 0.12, -10), ("window_smash", T(230) - 0.05, -10, 0.9), ("cartoon_fall_whistle", T(230) + 0.1, -12, 1.0),
 ("splash", T(234), -9, 1.1),
 ("whoosh", T(245) - 0.08, -10), ("polaroid_flash_eject", T(245) - 0.1, -12, 0.45),
 ("distant_boom_echo", T(257), -9, 2.0),
 ("flight_whoosh", T(267) - 0.12, -12),
]
CAP = {"whoosh": 0.6, "flight_whoosh": 0.6, "wind": 1.2, "impact": 0.6, "splash": 1.1, "page_turn": 0.7, "bell_ding": 0.9, "clock_ticking": 1.2,
       "laugh_kneeslap": 1.2, "match_strike_candle": 1.0, "fireball_whump": 1.4, "tiptoe_stairs": 1.9, "chain_reaction_crackle": 1.5}
S = [x if len(x) > 3 or x[0] not in CAP else (*x, CAP[x[0]]) for x in S]
B = [  # ambience beds: (file, from, to, gain dB)
 ("mill_night_loop", 0.0, T(44), -27), ("winter_wind_loop", T(44), T(50), -22), ("mill_night_loop", T(50), T(206), -24),
 ("river_night_loop", T(206), END, -24),
]
json.dump({"end": END, "sfx_dir": "../asset_library/sfx", "music": {"src": "../asset_library/music/music_bed_v03_comedic_suspense_140.mp3", "gain_db": -13, "pieces": [[13.0, 28.0], [30.0, 61.0], [13.0, 28.0], [30.0, 61.0]]},
           "sfx": [dict(src=x[0], at=round(x[1], 3), db=x[2], **({"dur": x[3]} if len(x) > 3 else {})) for x in S], "beds": [dict(src=f, a=round(a, 3), b=round(b, 3), db=g) for f, a, b, g in B]},
          open(os.path.dirname(os.path.abspath(__file__)) + "/sound.json", "w"), indent=1)
print(len(S), "effects,", len({x[0] for x in S}), "distinct + beds", len({b[0] for b in B}), "| end", round(END, 2))
