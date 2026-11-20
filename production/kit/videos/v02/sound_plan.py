"""Video 2 sound plan: every effect pinned to its word (index into public/audio/words_v02.json). Library: ../asset_library.
Run from production/kit: python -I videos/v02/sound_plan.py  ->  videos/v02/sound.json (read by tools/mix_fx.py)."""
import json, os
K = os.path.dirname(os.path.abspath(__file__)) + "/../.."
W = json.load(open(K + "/public/audio/words_v02.json"))
T = lambda i: W[i][0]
END = W[-1][1] + 0.3
S = [  # (file, time, gain dB)
 ("cctv_beep_servo", 0.0, -10), ("flight_whoosh", 0.25, -14), ("sparkle_twinkle", T(9) - 0.05, -12),
 ("lemon_squeeze", T(13), -11),
 ("vhs_rewind", T(18) - 0.3, -9), ("brush_scribble", T(23), -11), ("page_turn", T(30), -13),
 ("bell_ding", T(35), -14), ("whoosh", T(38) - 0.1, -16), ("cctv_beep_servo", T(43), -12),
 ("lemon_squeeze", T(53), -10), ("lemon_squeeze", T(55) - 0.05, -11), ("lemon_squeeze", T(58) - 0.1, -10),
 ("polaroid_flash_eject", T(62) - 0.05, -9), ("page_turn", T(70) - 0.25, -14),
 ("eyes_sting_sizzle", T(72), -11), ("bell_ding", T(78), -13), ("comedic_sniff", T(82) - 0.05, -9),
 ("flight_long_whoosh", T(92) - 0.1, -12), ("bank_door_chime", T(99) - 0.15, -11), ("footsteps_marble", T(100) - 0.2, -14),
 ("cctv_beep_servo", T(105), -12), ("sparkle_twinkle", T(107), -11),
 ("flight_whoosh", T(108) - 0.05, -12), ("bank_door_chime", T(114) - 0.2, -12), ("paper_bag_rustle", T(116) - 0.1, -12),
 ("sparkle_twinkle", T(118), -12), ("whoosh", T(122) - 0.1, -14),
 ("flight_long_whoosh", T(123) - 0.15, -12), ("tv_news_sting", T(130) - 0.3, -12), ("tv_channel_static", T(144) - 0.1, -14),
 ("police_siren_distant", T(136) - 0.4, -20), ("police_knock", T(138), -9),
 ("flight_whoosh", T(147) - 0.1, -12), ("vcr_insert_play", T(148) - 0.05, -11), ("facepalm_slap", T(162) + 0.15, -11),
 ("cell_door_clang", T(169) - 0.25, -10),
 ("flight_whoosh", T(171) - 0.15, -12), ("newspaper_snap", T(173), -11), ("clock_ticking", T(178), -22),
 ("chalk_writing", T(189), -14), ("chalk_writing", T(198), -14), ("chalk_writing", T(209), -14),
 ("bell_ding", T(222), -13), ("whoosh", T(224) + 0.12, -12), ("handcuffs_click", T(224) + 0.42, -10),
 ("coins_drop", T(230) - 0.1, -16), ("polaroid_flash_eject", T(231) - 0.04, -9), ("newspaper_snap", T(231) + 0.42, -10),
 ("plaque_ding", T(238), -12), ("whoosh", T(75), -16), ("jump_back", T(73) + 0.05, -17),
]
B = [  # ambience beds: (file, from, to, gain dB)
 ("bank_lobby_loop", 0.0, T(18), -24), ("city_day_loop", T(18), T(92), -30), ("city_day_loop", T(92), T(123), -24),
 ("bank_lobby_loop", T(99), T(108), -26), ("bank_lobby_loop", T(114), T(123), -26),
 ("city_night_apartment_loop", T(123), T(171), -24), ("city_night_apartment_loop", T(224), END, -26),
]
json.dump({"end": END, "sfx_dir": "../asset_library/sfx", "music": {"src": "../asset_library/music/music_bed_v01.mp3", "gain_db": -12},
           "sfx": [dict(src=f, at=round(t, 3), db=g) for f, t, g in S], "beds": [dict(src=f, a=round(a, 3), b=round(b, 3), db=g) for f, a, b, g in B]},
          open(os.path.dirname(os.path.abspath(__file__)) + "/sound.json", "w"), indent=1)
print(len(S), "effects,", len({s[0] for s in S}), "distinct + beds", len({b[0] for b in B}), "| end", round(END, 2))
