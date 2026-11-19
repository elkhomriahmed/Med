// Video 2 direction: "The Man Who Robbed Banks With Lemon Juice" (script v1, 239 words, voice 63.0 s, shot list
// videos/02_lemon_juice_robber/shotlist_v1.md). Everything is keyed to word times (public/audio/words_v02.json) and is a pure
// function of t. Rules applied: opening 0-15 s never rests, designed transitions only, eye-lines via lookAt, faces centred.
import * as THREE from "three";
import WORDS from "../../public/audio/words_v02.json";
import { cameraPath } from "../../timeline/camPath.js";
import { armAt, visemeAt } from "../../characters/index.js";

export const FPS = 30;
export const END = WORDS[WORDS.length - 1][1] + 0.3;
export const DURATION = Math.round(END * FPS);
export { WORDS };
export const T = (i) => WORDS[i][0];
export const E = (i) => WORDS[i][1];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cl = THREE.MathUtils.clamp;
const sm = (a, b, t) => { const x = cl((t - a) / (b - a), 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const step = (keys, t, def) => { let v = def; for (const [k, x] of keys) if (t >= k) v = x; return v; };
const faceTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

// shot boundaries
export const S = {
  hook: 0, because: T(10), youSee: T(18), write: T(25), figured: T(33), tested: T(48), grabs: T(59), burning: T(71), buddy: T(79),
  doesnt: T(92), bank2: T(108), waves: T(119), night: T(123), police: T(136), tape: T(147), juice: T(158), cell: T(163),
  prof: T(171), skills: T(186), less: T(208), named: T(218), never: T(224), textbooks: T(231), end: END,
};

/** Times of day per system: { city, apt } */
export function timeAt(t) {
  if (t < S.youSee + 0.45) return { city: "day", apt: "morning" };
  if (t < S.doesnt + 0.3) return { city: "morning", apt: "morning" };
  if (t < S.night + 0.35) return { city: "day", apt: "morning" };
  return { city: "night", apt: "night" };
}

/** zone of the action at t (which groups are visible / which key light the characters use) */
export function zoneAt(t) {
  if (t < S.youSee + 0.15) return "bank1";
  if (t < S.youSee + 1.0) return "flight";
  if (t < S.doesnt + 0.35) return "apt";
  if (t < T(96) + 0.1) return "flight";
  if (t < S.bank2 + 0.2) return "bank1";
  if (t < T(111)) return "flight";
  if (t < S.night + 0.25) return "bank2";
  if (t < S.night + 1.1) return "flight";
  if (t < S.tape + 0.15) return "apt";
  if (t < S.tape + 1.0) return "flight";
  if (t < S.prof + 0.12) return "police";
  if (t < S.never + 0.32) return "office";
  return "police";
}

export function makeDirection(W) {
  const C = W.city.anchors, AP = W.apt.anchors, B1 = W.bank1.anchors, B2 = W.bank2.anchors, PO = W.police.anchors, OF = W.office.anchors;
  const FY = 3.6;
  // ---- spots
  const R_KITCH = V(-2.15, FY, -12.25), TABLE = V(-2.51, FY + 0.76, -11.87);          // paper lies ON the table (0.25 m from its centre, r 0.52), within his reach
  const R_COUCH = AP.couchSeat.clone().setY(FY), BUD_COUCH = AP.couchSeat.clone().setY(FY).add(V(-0.75, 0, 0));   // on the seat (sit lowers the body)
  const doorIn1 = B1.door.clone(), doorIn2 = B2.door.clone();
  const R_B1 = B1.counterSpot.clone(), R_B2 = B2.counterSpot.clone();
  const R_SEAT = PO.interrogationChairRobber.clone(), COP_SEAT = PO.interrogationChairCop.clone();
  const COP_TV = PO.tvScreenCenter.clone().setY(0).lerp(COP_SEAT, 0.45);
  const CELL = PO.cellInside.clone();
  const P_DESK = OF.deskChair.clone(), P_BOARD = OF.boardSpot.clone();
  const head = (p, h = 1.42) => p.clone().add(V(0, h, 0));
  const HD = head(R_KITCH), PAPER = TABLE.clone().add(V(0, 0.006, 0)), LROW = V(-2.73, FY + 0.8, -11.55);
  const PHOTO = R_KITCH.clone().add(V(-0.25, 1.0, 0.3));
  const FRONT = V(Math.sin(PO.yaw.cellInside), 0, Math.cos(PO.yaw.cellInside));
  const BOOK_OF = OF.deskTop.clone().add(V(0.25, 0.01, 0.05));
  const FRONTP = V(Math.sin(OF.facing.deskChair), 0, Math.cos(OF.facing.deskChair));
  const NEWS_CELL = CELL.clone().add(V(0.42, 0.06, 0.05));
  const NEWS_OF = OF.deskChair.clone().addScaledVector(FRONTP, 0.32).add(V(0, 1.18, 0));
  const BOOK_CELL = CELL.clone().addScaledVector(FRONT, 0.28).add(V(0, 0.26, 0));
  const SW1 = S.prof + 0.12, SW2 = S.never + 0.32;

  // camera helper: frame a subject from its front at azimuth `az` (rad, relative to the subject's facing yaw), distance, height
  const F = (t, subj, yaw, az, dist, h, fov = 62, stop = false) => {
    const a = yaw + az; const pos = V(subj.x + Math.sin(a) * dist, subj.y + h, subj.z + Math.cos(a) * dist);
    return { t, pos, target: subj.clone().add(V(0, 0.95, 0)), fov, stop };
  };
  const K = (t, pos, target, fov = 62, stop = false) => ({ t, pos: pos.clone(), target: target.clone(), fov, stop });
  const yB1 = faceTo(R_B1, B1.cctv), yB2 = faceTo(R_B2, B2.cctv);
  const yK = 0.0;                                   // robber faces the window side (+Z) in the kitchen
  const cctv1 = B1.views.cctvView, cctv2 = B2.views.cctvView;
  const toward = (a, b, d) => a.clone().add(b.clone().sub(a).normalize().multiplyScalar(d));

  // ---- one continuous camera path for the whole video; designed transitions (rewind / flights / whip / dives) are keys too
  const pathA = cameraPath([
    // 1-2 HOOK: CCTV corner view pushing in, then rushing to his glistening face (camera never rests)
    K(0.0, cctv1.pos, head(R_B1, 1.25), cctv1.fov),
    K(1.6, toward(cctv1.pos, head(R_B1), 1.0), head(R_B1, 1.3), cctv1.fov - 6),
    K(S.because + 0.25, toward(cctv1.pos, head(R_B1), 2.2), head(R_B1, 1.38), 46),
    K(S.youSee - 0.25, toward(head(R_B1), cctv1.pos, 1.15), head(R_B1, 1.4), 40),
    // 3 REWIND: rocket backwards out of the bank, across the street, up and in through his window
    K(S.youSee + 0.15, doorIn1.clone().add(V(0, 1.8, 0.9)), head(R_B1, 1.3), 60),
    K(S.youSee + 0.35, C.bank1Sidewalk.clone().add(V(0, 2.5, -2.5)), C.apartmentWindowOutside, 62),
    K(S.youSee + 0.55, V(0, 4.5, -6.3), V(0, 4.5, -10.5), 64),                       // lined up with the open lower sash (y 4.0-4.98)
    K(S.youSee + 0.7, V(0, 4.5, -8.75), V(-0.6, 4.5, -11.5), 66),                     // through the opening, never through the glass
    K(S.youSee + 0.85, V(-0.2, 4.6, -9.9), TABLE, 66),
    // 3-8 KITCHEN: writing, figuring, six lemons, polaroid, burning eyes (a new framing every ~1.5-2 s, always moving)
    // kitchen: a new framing every ~0.7-1 s: macro inserts on the paper / lemons / photo, push-ins on his face, pull-outs, orbits
    K(5.7, PAPER.clone().add(V(0.35, 0.45, 0.55)), PAPER, 50),                          // "invisible ink": onto the paper + lemon
    K(6.6, PAPER.clone().add(V(0.1, 0.35, 0.25)), PAPER, 42),                           // "Write with it": macro, juice going on
    K(7.4, PAPER.clone().add(V(0.25, 0.5, 0.45)), PAPER.clone().add(V(0, 0.1, 0)), 48),  // "paper stays blank": rising out
    K(7.95, HD.clone().add(V(0.55, -0.1, 1.6)), HD.clone().add(V(0, -0.35, 0)), 55),     // he holds the blank sheet up
    K(8.6, HD.clone().add(V(0.3, 0.05, 1.4)), HD, 50),                                  // "figured": push to the face + bulb
    K(9.6, HD.clone().add(V(-0.55, 0.0, 1.5)), HD, 52),                                  // "coat your face": orbit to the other side
    K(10.5, HD.clone().add(V(0.2, -0.6, 2.3)), HD.clone().add(V(0, -0.2, 0)), 60),       // "cameras can't see you": quick pull-out
    K(11.5, HD.clone().add(V(0.9, -0.75, 1.9)), HD, 58),                                 // "tested it": low angle
    K(12.5, LROW.clone().add(V(0.35, 0.3, 0.45)), LROW, 46),                             // "six lemons": macro on the row
    K(13.1, HD.clone().add(V(0.3, 0.25, 1.3)), HD.clone().add(V(0, 0.25, 0)), 52),       // tilt up to the squeeze over his head
    K(13.9, HD.clone().add(V(-0.3, 0.1, 1.5)), HD, 54),
    K(14.5, HD.clone().add(V(0.6, -0.3, 1.4)), HD.clone().add(V(0, -0.3, 0)), 54),       // "grabs a Polaroid"
    K(15.2, HD.clone().add(V(0.3, -0.05, 1.45)), HD, 52),                                // "snaps a selfie": flash
    K(16.0, PHOTO.clone().add(V(0.1, 0.15, 0.55)), PHOTO, 44),                           // "comes out blank": close on the photo
    K(16.9, HD.clone().add(V(0.4, -0.2, 1.7)), HD.clone().add(V(0, -0.2, 0)), 56),
    K(17.5, HD.clone().add(V(0.15, 0, 1.35)), HD, 48),                                  // "eyes are burning": push in
    K(18.4, HD.clone().add(V(0.6, -0.4, 2.2)), HD.clone().add(V(0, -0.3, 0)), 58),       // "the plan works": pull out, thumbs up
    F(S.buddy - 0.3, R_KITCH, yK, 0.7, 2.9, 1.4, 60),
    // 9 BUDDY on the couch (pan across the room)
    K(S.buddy + 0.5, AP.views.couchFromTv.pos.clone().add(V(-0.6, 0, 0)), head(BUD_COUCH, 0.95), 60),
    K(S.doesnt - 0.2, AP.views.couchFromTv.pos.clone().add(V(-0.75, 0.05, 0.35)), head(BUD_COUCH, 0.95), 56),
    // 10 FLIGHT: out of the window, down the street, through bank 1's doors, into the CCTV view
    K(S.doesnt + 0.25, AP.windowInside.clone().add(V(0, 0.15, -0.6)), C.apartmentWindowOutside, 64),
    K(S.doesnt + 0.5, C.apartmentWindowOutside.clone().add(V(0, 0.2, 1.5)), C.bank1Door, 62),
    K(T(95) - 0.15, C.bank1Sidewalk.clone().add(V(0, 2.2, -3.0)), C.bank1Door.clone().add(V(0, 1.4, 0)), 60),
    K(T(96) + 0.1, doorIn1.clone().add(V(0, 1.8, -0.8)), head(R_B1), 60),
    K(T(100), toward(cctv1.pos, head(R_B1), 0.4), head(R_B1, 1.25), cctv1.fov),
    K(S.bank2 - 0.1, toward(cctv1.pos, head(R_B1), 1.1), head(R_B1, 1.3), cctv1.fov - 8),
    // 11 FLIGHT to bank 2: he strolls in with a bag of lemons
    K(S.bank2 + 0.12, doorIn1.clone().add(V(0, 1.8, 1.6)), doorIn1.clone().add(V(0, 1.8, -3)), 62),
    K(S.bank2 + 0.3, doorIn1.clone().add(V(0, 1.9, -1.2)), C.bank2Door, 62),
    K(T(110), C.bank2Sidewalk.clone().add(V(-1.5, 2.2, -3.0)), C.bank2Door.clone().add(V(0, 1.3, 0)), 60),
    K(T(111) + 0.2, doorIn2.clone().add(V(0.4, 1.8, -0.6)), head(R_B2), 62),
    F(T(115), R_B2, yB2, 0.35, 2.4, 1.3, 60),
    F(S.waves - 0.15, R_B2, yB2, -0.15, 2.0, 1.35, 56),
    // 12 CCTV: he waves right at the lens
    K(S.waves + 0.15, toward(cctv2.pos, head(R_B2), 0.3), head(R_B2, 1.25), cctv2.fov),
    K(S.night - 0.1, toward(cctv2.pos, head(R_B2), 1.0), head(R_B2, 1.3), cctv2.fov - 8),
    // 13 FLIGHT (day -> night): out, along the street, up into his window, onto the TV news
    K(S.night + 0.12, doorIn2.clone().add(V(0, 1.8, 1.6)), doorIn2.clone().add(V(0, 1.8, -3)), 62),          // centred on the doorway first
    K(S.night + 0.3, doorIn2.clone().add(V(0, 1.9, -1.2)), C.apartmentWindowOutside, 62),
    K(S.night + 0.65, C.apartmentWindowOutside.clone().add(V(0.5, 0.3, 2.2)), C.apartmentWindowInside, 62),
    K(S.night + 0.95, AP.windowInside.clone().add(V(0.4, 0.1, -0.4)), AP.tvScreen, 62),
    K(T(127), AP.views.tvClose.pos.clone().add(V(0, 0.1, 0.5)), AP.tvScreen, 46),
    K(T(133), AP.views.tvClose.pos, AP.tvScreen, 42),
    // 14 the weather + the knock: swing past his face to the door
    K(S.police - 0.3, AP.views.couchFromTv.pos.clone().add(V(0.3, 0.05, 0.4)), head(R_COUCH, 0.95), 56),
    K(T(140), AP.views.couchFromTv.pos.clone().add(V(0.6, 0.1, 0.7)), head(R_COUCH, 0.95), 54),
    K(T(144), AP.views.doorClose.pos, AP.views.doorClose.target, 52),
    K(S.tape - 0.2, AP.views.doorClose.pos.clone().add(V(0.15, 0.05, 0.4)), AP.views.doorClose.target, 48),
    // 15 FLIGHT to the police station, into the interrogation room
    K(S.tape + 0.25, AP.windowInside.clone().add(V(0.2, 0.15, -0.5)), C.apartmentWindowOutside, 64),
    K(S.tape + 0.5, C.apartmentWindowOutside.clone().add(V(8, 1.2, 4.5)), C.policeDoor, 60),
    K(S.tape + 0.7, C.policeDoor.clone().add(V(0, 3.2, 4.0)), C.policeDoor.clone().add(V(0, 1.4, 0)), 60),
    K(S.tape + 0.82, PO.doorFlight[0], PO.doorFlight[2], 62),
    K(S.tape + 0.95, PO.doorFlight[2], PO.interrogationDoor.clone().add(V(0, 1.6, 0)), 62),
    K(T(151), PO.views.interrogationWide.pos, PO.views.interrogationWide.target, 62),
    K(T(155), PO.views.interrogationWide.pos.clone().lerp(PO.views.interrogationClose.pos, 0.5), head(R_SEAT, 1.0), 58),
    // 16 "But I wore the juice."
    K(S.juice - 0.1, PO.views.interrogationClose.pos, head(R_SEAT, 0.95), 54),
    K(S.cell - 0.1, PO.views.interrogationClose.pos.clone().add(V(0.1, 0.05, 0.25)), head(R_SEAT, 0.95), 52),
    // 17 WHIP to the cell (designed whip-pan), the bars slide shut
    K(S.cell + 0.25, PO.views.cellWide.pos.clone().add(V(0, 0.1, 0.3)), PO.views.cellWide.target, 58),
    K(S.prof - 0.6, PO.views.cellWide.pos, PO.views.cellWide.target, 54),
    // 18 DIVE: push into the newspaper on his bunk until the page fills the frame ... (swap to path B)
    K(S.prof - 0.05, NEWS_CELL.clone().add(V(0, 0.45, 0.1)), NEWS_CELL, 50),
    K(SW1, NEWS_CELL.clone().add(V(0, 0.13, 0.02)), NEWS_CELL, 50),
  ]);
  const pathB = cameraPath([
    // ... and pull out of the same headline in the professor's hands
    K(SW1, NEWS_OF.clone().addScaledVector(FRONTP, 0.16), NEWS_OF, 50),
    K(S.prof + 0.6, NEWS_OF.clone().addScaledVector(FRONTP, 0.9).add(V(0.15, 0.05, 0)), NEWS_OF, 52),
    K(T(176), OF.views.deskClose.pos, OF.views.deskClose.target, 56),
    K(T(181), OF.views.deskClose.pos.clone().add(V(0.2, 0.05, 0.3)), head(P_DESK, 0.95), 52),
    // 19-21 the chalkboard
    K(S.skills + 0.3, OF.views.boardWide.pos, OF.views.boardWide.target, OF.views.boardWide.fov),
    K(S.skills + 1.6, OF.views.boardText.pos.clone().add(V(0, 0, 0.6)), OF.views.boardText.target, OF.views.boardText.fov + 6),
    K(S.less - 0.3, OF.views.boardText.pos.clone().add(V(0.1, 0, 0.2)), OF.views.boardText.target, OF.views.boardText.fov - 2),
    K(S.less + 0.4, OF.views.boardClose.pos.clone().add(V(0, 0.1, 0.9)), OF.views.boardClose.target, OF.views.boardClose.fov + 6),
    K(S.named - 0.1, OF.views.boardClose.pos.clone().add(V(0, 0.1, 1.1)), OF.views.boardClose.target, OF.views.boardClose.fov + 6),
    K(S.never - 0.4, OF.views.boardWide.pos, OF.views.boardWide.target, OF.views.boardWide.fov),
    // 22 DIVE: into the textbook on the desk ... (swap to path C) ... out of the same book in his hands in the cell
    K(S.never + 0.05, BOOK_OF.clone().add(V(0, 0.4, 0.15)), BOOK_OF, 50),
    K(SW2, BOOK_OF.clone().add(V(0, 0.12, 0.02)), BOOK_OF, 50),
  ]);
  const pathC = cameraPath([
    K(SW2, BOOK_CELL.clone().addScaledVector(FRONT, 0.14).add(V(0, 0.08, 0)), BOOK_CELL, 50),
    K(S.never + 1.0, BOOK_CELL.clone().addScaledVector(FRONT, 0.7).add(V(0, 0.35, 0)), BOOK_CELL.clone().add(V(0, 0.2, 0)), 54),
    K(S.textbooks, CELL.clone().addScaledVector(FRONT, 1.5).add(V(0.15, 0.7, 0)), CELL.clone().add(V(0, 0.5, 0)), 56),
    K(S.end, CELL.clone().addScaledVector(FRONT, 2.0).add(V(0.3, 0.9, 0)), CELL.clone().add(V(0, 0.75, 0)), 54, true),
  ]);

  // ---- per-frame story state
  function act(t, live) {
    const cast = {}; const props = {}; const overlays = [];
    const fx = { cctv: 0, rewind: 0, whip: 0, flash: 0 };
    const ctrl = { apt: { doorSilhouettes: 0, knock: 0, tvGlow: 0 }, police: { cellDoor: 0 }, board: { line1: 0, line2: 0, graph: 0, title: 0 },
      screens: { aptTv: "off", policeTv: "off", banner: 0 } };
    const blink = (ts) => (ts.some((b) => t >= b && t < b + 0.12) ? "_blink" : "");
    const walkBob = (k) => (k > 0.02 && k < 0.98 ? 0.022 * Math.abs(Math.sin(t * Math.PI * 3.6)) : 0);
    const cam = live.camPos();
    let wet = 0;

    // CCTV overlay windows
    fx.cctv = Math.max(sm(-0.1, 0.05, t) * (1 - sm(S.because + 0.1, S.because + 0.5, t)),
      sm(T(100) - 0.2, T(100) + 0.1, t) * (1 - sm(S.bank2 - 0.05, S.bank2 + 0.2, t)),
      sm(S.waves + 0.05, S.waves + 0.3, t) * (1 - sm(S.night - 0.05, S.night + 0.2, t)));
    fx.rewind = sm(S.youSee - 0.25, S.youSee, t) * (1 - sm(S.youSee + 0.65, S.youSee + 0.95, t));
    fx.whip = sm(S.cell - 0.12, S.cell + 0.02, t) * (1 - sm(S.cell + 0.1, S.cell + 0.32, t));

    const z = zoneAt(t);
    // ================= ROBBER =================
    const R = { visible: true, pos: R_B1.clone(), rot: yB1, s: { expression: "smug" } };
    if (t < S.youSee + 0.15) {                                                     // bank 1, grinning at the camera
      wet = 1;
      R.s = { expression: step([[0, "smug"], [S.because, "happy"]], t), lookAt: B1.cctv, mouth: blink([1.9]),
        armL: { pose: "hip" }, armR: armAt([[0, { pose: "rest" }], [0.9, { pose: "thumbsUp" }]], t, 0.4), tilt: 0.06 };
    } else if (t < S.doesnt + 0.35) {                                              // apartment (morning)
      R.pos = R_KITCH.clone(); R.rot = yK;
      wet = sm(S.tested + 0.3, S.grabs - 0.2, t);
      const paper = TABLE.clone().add(V(0, 0.006, 0));
      R.s = {
        expression: step([[0, "neutral"], [S.write, "smug"], [T(31), "proud"], [S.figured, "skeptical"], [T(36), "happy"], [S.tested, "smug"],
          [T(53), "laugh"], [S.grabs, "neutral"], [T(65) + 0.1, "shock"], [T(68), "proud"], [S.burning, "sleepy"], [T(75), "happy"]], t),
        mouth: t >= S.burning && t < T(75) ? "_blink" : blink([7.0, 9.4, 12.2]),
        lookAt: t < S.figured ? paper : t < T(38) ? head(R_KITCH, 1.25).add(V(0, 0, 1)) : t < S.tested ? cam : t < S.grabs ? head(R_KITCH, 1.9) : t < T(65) ? live.handPos("robber", "R") : cam,
        armR: armAt([[0, { pose: "rest" }], [S.write - 0.2, { pose: "writeWithLemon", target: paper, phase: t * 2.4 }],
          [T(30), { pose: "holdUp", height: 1.0 }], [S.figured, { pose: "pointSelf", at: "face" }], [T(41), { pose: "point", target: cam }],
          [S.tested, { pose: "squeezeOverHead", phase: t * 2.2 }], [S.grabs, { pose: "selfie", height: 1.0 }], [T(65) + 0.2, { pose: "shakePhoto", phase: t * 3 }],
          [S.burning, { pose: "fistsUp", phase: t * 2.4 }], [T(76), { pose: "thumbsUp" }], [S.buddy + 0.6, { pose: "hip" }]], t, 0.42),
        armL: armAt([[0, { pose: "rest" }], [T(30), { pose: "holdUp", height: 1.0 }], [S.figured, { pose: "rest" }],
          [S.tested, { pose: "squeezeOverHead", phase: t * 2.2 + 0.5 }], [S.grabs, { pose: "hip" }], [S.burning, { pose: "fistsUp", phase: t * 2.4 + 0.4 }],
          [T(76), { pose: "hip" }]], t, 0.42),
        lean: t >= S.write && t < T(30) ? 0.14 : 0, nod: t >= S.write && t < T(30) ? 0.12 : 0,
      };
      if (t >= S.write - 0.2 && t < T(30)) props.lemonHalf = { holder: "robber", side: "R" };
      if (t >= T(30) && t < S.figured) props.inkPaper = { twoHands: "robber" }; else props.inkPaper = { place: paper, rot: 0.1 };
      if (t >= S.tested && t < S.grabs) { props.lemonA = { holder: "robber", side: "R" }; props.lemonB = { holder: "robber", side: "L" }; }
      if (t >= S.grabs && t < T(65) + 0.2) props.polaroid = { holder: "robber", side: "R" };
      if (t >= T(64) && t < S.burning + 0.2) props.photo = { holder: "robber", side: "R", eject: t < T(65) + 0.2 };
      fx.flash = sm(T(62) - 0.02, T(62) + 0.03, t) * (1 - sm(T(62) + 0.05, T(62) + 0.3, t));
      if (t >= S.tested && t < S.grabs) props.squirt = { at: head(R_KITCH, 1.95), k: ((t - S.tested) * 1.4) % 1 };
      if (t >= S.figured && t < T(38)) overlays.push({ kind: "bulb", at: head(R_KITCH, 1.85), t0: S.figured });
      if (t >= S.burning && t < T(75)) overlays.push({ kind: "tears", at: head(R_KITCH, 1.42), t0: S.burning });
    } else if (t < S.bank2 + 0.2) {                                               // bank 1: walks in, smiles at the camera
      const k = sm(T(96) - 0.1, T(99) + 0.2, t); R.pos = doorIn1.clone().lerp(R_B1, k); R.rot = k < 0.97 ? faceTo(doorIn1, R_B1) : yB1;
      wet = 1;
      R.s = { expression: step([[0, "smug"], [T(106), "happy"]], t), lookAt: t > T(100) ? B1.cctv : R_B1.clone().add(V(0, 1.4, 2)), bob: walkBob(k),
        armL: { pose: "rest" }, armR: { pose: "rest" }, mouth: blink([25.3]) };
    } else if (t < S.night + 0.25) {                                              // bank 2: strolls in with lemons, waves
      const k = sm(T(111) - 0.1, T(114) + 0.3, t); R.pos = doorIn2.clone().lerp(R_B2, k); R.rot = k < 0.97 ? faceTo(doorIn2, R_B2) : yB2;
      wet = 1;
      R.s = { expression: step([[0, "smug"], [S.waves - 0.1, "happy"]], t), lookAt: t > T(115) ? B2.cctv : R_B2.clone().add(V(0, 1.4, 2)), bob: walkBob(k),
        armL: { pose: "carryBag" }, armR: armAt([[0, { pose: "rest" }], [T(121) - 0.2, { pose: "wave", phase: t * 2.2 }]], t, 0.35), mouth: blink([28.6]) };
      props.lemonBag = { holder: "robber", side: "L" };
    } else if (t < S.tape + 0.15) {                                               // apartment night: on the couch, news on TV, knock
      R.pos = R_COUCH.clone(); R.rot = AP.facing.couchSeat;
      R.s = { expression: step([[0, "proud"], [T(134), "happy"], [S.police + 0.2, "shock"], [T(141), "worried"]], t), sit: 1, seat: 0.5,
        lookAt: t < S.police + 0.3 ? AP.tvScreen : AP.doorKnob, armL: { pose: "rest" }, armR: armAt([[0, { pose: "thumbsUp" }], [S.police, { pose: "rest" }]], t),
        mouth: t > S.police + 0.2 && t < S.police + 0.6 ? "_O" : blink([33.6, 35.8]) };
    } else if (t < S.cell) {                                                       // interrogation
      R.pos = R_SEAT.clone(); R.rot = PO.yaw.interrogationChairRobber;
      R.s = { expression: step([[0, "neutral"], [T(152), "skeptical"], [S.juice - 0.1, "worried"]], t), sit: 1, seat: PO.seatHeight,
        lookAt: t < S.juice - 0.15 ? PO.tvScreenCenter : head(COP_TV, 1.42), mouth: t >= S.juice && t < E(162) ? visemeAt(WORDS, t) : blink([40.2]),
        armL: { pose: "rest" }, armR: armAt([[0, { pose: "rest" }], [S.juice, { pose: "shrug" }]], t, 0.3), tilt: t > T(153) ? 0.12 : 0 };
    } else if (t < S.prof + 0.12 || t >= S.never + 0.32) {                           // cell (holding a lemon / reading the textbook)
      R.pos = CELL.clone().setY(0); R.rot = PO.yaw.cellInside;
      const reading = t >= S.never + 0.32;
      R.s = { expression: reading ? step([[0, "neutral"], [S.textbooks + 0.3, "proud"]], t) : "skeptical", sit: 1, seat: CELL.y,
        lookAt: reading ? (t > S.textbooks + 0.3 ? cam : live.bookPos()) : live.handPos("robber", "R"),
        armL: reading ? { pose: "holdBook", height: 0.9 } : { pose: "rest" }, armR: reading ? { pose: "holdBook", height: 0.9 } : { pose: "hold" },
        mouth: blink([44.0, 61.5]) };
      if (reading) props.textbookCell = { twoHands: "robber", open: 1 };
      else props.lemonHand = { holder: "robber", side: "R" };
      if (!reading) props.newspaperCell = { place: NEWS_CELL, rot: 0.3, open: 0, flat: true };
    } else R.visible = false;
    if (z === "office") R.visible = false;
    R.s.wet = wet;
    cast.robber = R;

    // ================= OTHERS =================
    // teller 1 / teller 2 behind their counters (react: shock then skeptical side-eye at the robber)
    cast.teller1 = { visible: t < S.bank2 + 0.2, pos: B1.tellerSpot.clone(), rot: B1.yaw.tellerSpot,
      s: { expression: step([[0, "shock"], [2.2, "skeptical"], [T(96), "neutral"], [T(104), "shock"]], t), lookAt: head(cast.robber.pos), armL: { pose: "rest" }, armR: { pose: "rest" } } };
    cast.teller2 = { visible: t >= S.bank2 - 0.2 && t < S.night + 0.4, pos: B2.tellerSpot.clone(), rot: B2.yaw.tellerSpot,
      s: { expression: step([[0, "neutral"], [T(116), "skeptical"], [S.waves, "shock"]], t), lookAt: head(cast.robber.pos), armL: { pose: "rest" }, armR: { pose: "rest" } } };
    // buddy on the couch (morning) — sniffs, then says his line in his own voice
    cast.buddy = { visible: t >= S.youSee && t < S.doesnt + 0.4, pos: BUD_COUCH.clone(), rot: AP.facing.couchSeat,
      s: { expression: step([[0, "neutral"], [T(82), "skeptical"], [T(88), "smug"]], t), sit: 1, seat: 0.5,
        lookAt: t < T(81) ? AP.tvScreen : head(R_KITCH, 1.42),
        mouth: t >= T(85) && t < E(91) ? visemeAt(WORDS, t) : blink([20.5]),
        armL: armAt([[0, { pose: "rest" }], [T(82) - 0.1, { pose: "sniff", phase: (t - T(82)) * 0.8 }], [T(85), { pose: "rest" }]], t, 0.3),
        armR: armAt([[0, { pose: "rest" }], [T(87), { pose: "point", target: head(R_KITCH) }], [S.doesnt, { pose: "rest" }]], t, 0.3) } };
    // the cop: presses PLAY, then turns to the robber, facepalms on "juice"
    const copPos = COP_TV.clone();
    cast.cop = { visible: z === "police" && t < S.cell, pos: copPos, rot: faceTo(copPos, t < T(151) ? PO.tvScreenCenter.clone().setY(0) : R_SEAT),
      s: { expression: step([[0, "neutral"], [T(152), "smug"], [S.juice + 0.2, "angry"]], t),
        lookAt: t < T(151) ? PO.tvScreenCenter : head(R_SEAT, 0.95),
        armR: armAt([[0, { pose: "rest" }], [S.tape - 0.1, { pose: "pressPlay", target: PO.tvScreenCenter.clone().add(V(0.1, -0.25, 0.1)), amount: sm(T(148), T(148) + 0.2, t) }],
          [T(151), { pose: "point", target: PO.tvScreenCenter }], [S.juice + 0.25, { pose: "facepalm" }]], t, 0.35),
        armL: armAt([[0, { pose: "hip" }], [S.juice + 0.25, { pose: "hip" }]], t) } };
    // professor: reads the newspaper, lowers it, writes on the board, taps the title
    const toBoard = sm(S.skills - 0.2, S.skills + 0.5, t);
    const pPos = P_DESK.clone().lerp(P_BOARD, toBoard);
    cast.professor = { visible: z === "office", pos: pPos, rot: toBoard < 0.05 ? OF.facing.deskChair : toBoard < 0.95 ? faceTo(P_DESK, P_BOARD) : OF.facing.boardSpot,
      s: toBoard < 0.05 ? { expression: step([[0, "neutral"], [T(176), "skeptical"], [T(181), "shock"]], t), sit: 1, seat: 0.48,
        lookAt: t < T(176) ? live.newsPos() : cam,
        armL: t < T(178) ? { pose: "readNewspaper", amount: sm(T(175), T(177), t) } : { pose: "rest" }, armR: t < T(178) ? { pose: "readNewspaper", amount: sm(T(175), T(177), t) } : { pose: "rest" }, tilt: t > T(178) ? 0.14 : 0 }
        : { expression: step([[0, "neutral"], [S.less, "smug"], [S.named, "proud"]], t), bob: walkBob(toBoard),
          lookAt: t < S.named ? OF.board : cam,
          armR: toBoard < 0.95 ? { pose: "rest" } : armAt([[0, { pose: "chalkWrite", target: live.chalkPos(t), phase: t * 3 }], [S.named + 0.4, { pose: "tapBoard", target: OF.boardTap, phase: (t - S.named) * 2 }],
            [S.never - 0.3, { pose: "rest" }]], t, 0.3),
          armL: { pose: "hip" } } };
    if (toBoard < 0.05 && z === "office" && t < T(178)) props.newspaperOffice = { twoHands: "professor", open: 1 };
    else props.newspaperOffice = { place: OF.deskTop.clone().add(V(-0.25, 0.01, 0.1)), rot: 0.2, open: 0, flat: true };
    props.textbookOffice = { place: BOOK_OF, rot: -0.3, open: sm(S.never - 0.6, S.never - 0.1, t) };

    // board reveal
    ctrl.board.line1 = sm(S.skills + 0.4, T(196) + 0.2, t); ctrl.board.line2 = sm(T(196), T(207) + 0.3, t);
    ctrl.board.graph = sm(S.less, T(217), t); ctrl.board.title = sm(S.named, T(223), t);
    // screens + apartment / police controls
    ctrl.screens.aptTv = t >= S.night && t < S.tape ? (t < T(144) ? "news" : "weather") : t >= S.youSee && t < S.doesnt ? "news" : "off";
    ctrl.screens.banner = sm(T(133), T(135) + 0.2, t);
    ctrl.screens.policeTv = t >= T(148) && t < S.cell ? "cctv" : "off";
    ctrl.apt.tvGlow = ctrl.screens.aptTv === "off" ? 0 : 1;
    ctrl.apt.doorSilhouettes = sm(S.police - 0.3, S.police + 0.2, t) * (t < S.tape + 0.2 ? 1 : 0);
    ctrl.apt.knock = t >= T(138) && t < T(142) ? ((t - T(138)) * 2.6) % 1 : 0;
    ctrl.police.cellDoor = sm(T(169) - 0.25, T(169) + 0.15, t);

    return { cast, props, overlays, fx, ctrl, zone: z };
  }

  /** exposure (grade) per zone with short blends through doors/windows */
  function exposureAt(t, times) {
    const z = zoneAt(t);
    if (z === "apt") return times.apt === "night" ? 1.55 : 1.35;
    if (z === "flight") return W.city.hint[times.city].exposure;
    return 1.4;
  }
  return { camAt: (t) => (t < SW1 ? pathA(t) : t < SW2 ? pathB(t) : pathC(t)), SW1, SW2, act, exposureAt, timeAt, zoneAt };
}
