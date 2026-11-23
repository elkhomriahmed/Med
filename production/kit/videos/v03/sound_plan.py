"""Video 3 sound plan: every effect pinned to its word (index into public/audio/words_v03.json). Library: ../asset_library.
Accent on EVERY cut/transition (STYLE_BIBLE 2026-11-23 C). Run from production/kit: python -I videos/v03/sound_plan.py"""
import json, os
K = os.path.dirname(os.path.abspath(__file__)) + "/../.."
W = json.load(open(K + "/public/audio/words_v03.json"))
T = lambda i: W[i][0]
END = W[-1][1] + 0.3
S = [  # (file, time, gain dB)
 ("match_strike_candle", T(2) - 0.05, -10), ("explosion_big", T(9) - 0.05, -11), ("thunder", T(9), -15), ("walls_collapse_debris", T(11), -13),
 ("whoosh", T(13) - 0.12, -12), ("gears_creak_ping", T(15), -17), ("sign_slap", T(17), -9),
 ("flight_whoosh", T(20) - 0.12, -14), ("buzzer_nope", T(21), -12), ("flight_whoosh", T(22) - 0.12, -14), ("buzzer_nope", T(23), -12),
 ("flight_whoosh", T(24) - 0.12, -14), ("buzzer_nope", T(27), -11),
 ("laugh_kneeslap", T(36) - 0.1, -12), ("flour_poof", T(41), -10), ("jump_back", T(43), -16),
 ("whoosh", T(44) - 0.12, -11), ("footsteps_wood", T(47), -17), ("door_creak_wood", T(50), -14), ("tiptoe_stairs", T(52), -12),
 ("whoosh", T(57) - 0.1, -15), ("notes_pop", T(67), -15), ("sparkle_twinkle", T(76), -12), ("sparks_crackle", T(79), -11),
 ("fireball_whump", T(90) - 0.05, -10), ("wind", T(95), -16), ("laugh_kneeslap", T(105), -13),
 ("beams_rattle_creak", T(112) - 0.1, -10), ("ship_creak_wave", T(114), -16), ("dust_pour", T(121), -11), ("dust_pour", T(127), -13),
 ("clock_ticking", T(133), -14), ("record_scratch", T(138) - 0.05, -10), ("question_boing", T(150), -13),
 ("flight_whoosh", T(151) - 0.12, -12), ("vapour_hiss", T(156), -15), ("flour_poof", T(159), -11), ("sparkle_twinkle", T(169), -13),
 ("chain_reaction_crackle", T(173), -10), ("whoosh", T(184), -14),
 ("whoosh", T(189) - 0.12, -12), ("dust_pour", T(197), -12), ("clock_ticking", T(201), -15),
 ("explosion_big", T(206) - 0.04, -10), ("thunder", T(206), -12), ("walls_collapse_debris", T(215), -9), ("wind", T(217), -14), ("impact", T(221), -12),
 ("window_smash", T(230) - 0.05, -10), ("cartoon_fall_whistle", T(231), -12), ("splash", T(234), -9), ("boing", T(243), -15),
 ("polaroid_flash_eject", T(245) - 0.1, -12), ("page_turn", T(253), -15), ("distant_boom_echo", T(257), -9), ("gasp", T(262), -13),
 ("whoosh", T(267) - 0.12, -13), ("bell_ding", T(274), -11),
 # accents on the remaining cuts (transition_check 2026-11-23): laugh, whump, shook, warm, flies, 1878
 ("flight_whoosh", T(31) - 0.12, -11), ("whoosh", T(89) - 0.1, -11), ("flight_whoosh", T(107) - 0.12, -11),
 ("flight_whoosh", T(189) - 0.1, -10), ("flight_whoosh", T(225) - 0.12, -10), ("whoosh", T(245) - 0.08, -10), ("flight_whoosh", T(151) - 0.1, -11),
]
B = [  # ambience beds: (file, from, to, gain dB)
 ("mill_night_loop", 0.0, T(44), -27), ("winter_wind_loop", T(44), T(50), -22), ("mill_night_loop", T(50), T(206), -24),
 ("river_night_loop", T(206), END, -24),
]
json.dump({"end": END, "sfx_dir": "../asset_library/sfx", "music": {"src": "../asset_library/music/music_bed_v03_comedic_suspense_140.mp3", "gain_db": -13},
           "sfx": [dict(src=f, at=round(t, 3), db=g) for f, t, g in S], "beds": [dict(src=f, a=round(a, 3), b=round(b, 3), db=g) for f, a, b, g in B]},
          open(os.path.dirname(os.path.abspath(__file__)) + "/sound.json", "w"), indent=1)
print(len(S), "effects,", len({s[0] for s in S}), "distinct + beds", len({b[0] for b in B}), "| end", round(END, 2))
