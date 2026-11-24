"""Video 4 sound plan (STYLE_BIBLE sound editing rules): every effect cut to its moment (length), started on its visible action
(skip = file pre-roll), relevant to picture + words, accent on every cut, music from frame 1. Run from production/kit."""
import json, os
K = os.path.dirname(os.path.abspath(__file__)) + "/../.."
W = json.load(open(K + "/public/audio/words_v04.json"))
T = lambda i: W[i][0]
END = W[-1][1] + 0.3
S = [  # (file, time, dB, length s[, skip s])
 ("scorch_sizzle", 0.05, -14, 1.4), ("seat_fire_burst", 0.2, -17, 1.0, 0.3),                              # hook: the seat burning
 ("whoosh", T(14) - 0.1, -13, 0.5),                                                                     # cut to the hot lot
 ("whoosh", T(24) - 0.1, -10, 0.4), ("buzzer_nope", T(24), -12, 0.6),                                   # no lighters (red glow)
 ("whoosh", T(29) - 0.08, -15, 0.4), ("buzzer_nope", T(29), -12, 0.6),                                  # no spray cans
 ("whoosh", T(32) - 0.08, -15, 0.4), ("buzzer_nope", T(32), -12, 0.6),                                  # nothing left baking
 ("flight_whoosh", T(38) - 0.1, -12, 0.5), ("laugh_kneeslap", T(38) + 0.05, -13, 1.1),                   # he laughs
 ("flight_whoosh", T(50) - 0.1, -13, 0.45), ("bottle_toss_seat", T(54) - 0.3, -10, 0.8),                # the toss lands on the seat
 ("car_door_slam", T(57) - 0.02, -8, 0.6),                                                              # slam (shake)
 ("running_asphalt", T(60), -20, 1.0),                                                                  # he walks off (quiet steps)
 ("flight_whoosh", T(65) - 0.1, -13, 0.5),                                                              # cut: noon
 ("whoosh", T(77) - 0.1, -13, 0.45), ("sparkle_twinkle", T(84) - 0.02, -12, 0.8),                        # the dot appears
 ("scorch_sizzle", T(91), -15, 1.2),                                                                    # "Burning."
 ("whoosh", T(98) - 0.1, -13, 0.45), ("scorch_sizzle", T(106), -12, 1.4),                                # smoke / black spot
 ("flight_whoosh", T(118) - 0.1, -13, 0.5),                                                             # cut up to the window
 ("whoosh", T(126) - 0.08, -15, 0.4),                                                                   # her POV
 ("flight_whoosh", T(130) - 0.1, -12, 0.45), ("stairs_run_down", T(130) + 0.05, -10, 1.0),             # down the stairs
 ("flight_whoosh", T(135) - 0.1, -12, 0.45), ("running_asphalt", T(135), -11, 1.4), ("keys_fly_clatter", T(138) + 0.2, -10, 0.9, 0.2),
 ("whoosh", T(144) - 0.1, -13, 0.45), ("scorch_sizzle", T(148), -11, 1.5),                              # the glowing ring
 ("police_knock", T(150) + 0.05, -15, 1.1), ("police_knock", T(156) + 0.3, -16, 1.0),                   # fists pounding the window (visible in the passenger POV)
 ("whoosh", T(156) - 0.08, -9, 0.45),                                                                  # snap to his face
 ("flight_whoosh", T(166) - 0.1, -9, 0.5), ("sparkle_twinkle", T(177), -14, 0.8),                       # optics: rays
 ("whoosh", T(177) - 0.1, -15, 0.4), ("sparkle_twinkle", T(190) - 0.05, -12, 0.8),                       # one single point
 ("whoosh", T(202) - 0.1, -10, 0.4), ("scorch_sizzle", T(205), -11, 1.2), ("vapour_hiss", T(207), -14, 0.8), ("fireball_whump", T(210), -16, 0.9, 0.55),
 ("flight_whoosh", T(216) - 0.1, -9, 0.45),                                                            # back to the car (oven)
 ("flight_whoosh", T(228) - 0.1, -9, 0.45), ("car_door_yank", T(229) - 0.15, -9, 0.6, 0.15),          # rips the door open
 ("seat_fire_burst", T(237) - 0.02, -8, 1.4, 0.05),                                                     # bursts into flames (shake)
 ("impact", T(237) + 0.42, -12, 0.5),                                                                    # thrown back, lands on the asphalt
 ("flashback_swell", T(240) - 0.95, -9, 1.2), ("polaroid_flash_eject", T(240) - 0.06, -15, 0.4),        # 2017 flashback
 ("gasp", T(250) - 0.05, -14, 0.7),                                                                        # 2017: he spots the smoke (on screen, shocked)
 ("scorch_sizzle", T(251), -17, 1.2),   # one continuous 2017 shot: the smoke sizzling on the seat as the crane looks down (no cuts = no whooshes)
 ("flight_whoosh", T(262) - 0.1, -12, 0.45), ("sparkle_twinkle", T(270) - 0.05, -11, 0.8),              # the dot on his shirt
]
B = [("summer_lot_loop", 0.0, T(130), -25), ("bank_lobby_loop", T(130), T(135), -28), ("summer_lot_loop", T(135), T(166), -25),
     ("summer_lot_loop", T(216), END, -25)]
json.dump({"end": END, "sfx_dir": "../asset_library/sfx",
           "music": {"src": "../asset_library/music/music_bed_v03_comedic_suspense_140.mp3", "gain_db": -13, "pieces": [[30.0, 61.0], [13.0, 28.0], [30.0, 61.0], [13.0, 28.0]]},
           "sfx": [dict(src=x[0], at=round(x[1], 3), db=x[2], **({"dur": x[3]} if len(x) > 3 else {}), **({"skip": x[4]} if len(x) > 4 else {})) for x in S],
           "beds": [dict(src=f, a=round(a, 3), b=round(b, 3), db=g) for f, a, b, g in B]},
          open(os.path.dirname(os.path.abspath(__file__)) + "/sound.json", "w"), indent=1)
print(len(S), "effects,", len({x[0] for x in S}), "distinct + beds", len({b[0] for b in B}), "| end", round(END, 2))
