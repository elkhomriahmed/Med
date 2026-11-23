// Ready character specs (v12 look). Colours are sRGB hex. Each has ONE signature item readable across the room.
// coat: { type: knit|check|tweed|stripes|plain, color, accent, shirtPanel?, panelPlain?, apron?, buttons? (null = none),
//         buttonMetal?, double?, placket? (false = none), pockets? (false = none), collar? (sailor collar colour) }
//         2026-11-19: sideStripes (tracksuit stripe colour), tie (colour), bowtie (colour), badge (metal shield colour, left chest)
// hat: beanie|captain|sailor|beret|oilskin|toque|bonnet|cap|backcap|police (+ hatColor, hatTop, peakColor, badgeColor, pomColor, bandColor,
//      flowerColors, strapColor)
// hair: { color, style: bowl (default, video 1) | short | slick (glossy + quiff) | bun | professor (receding, ear tufts) | bob }
// wet: default "lemon juice" amount 0..1 (state.wet overrides per frame) = thin ink drips on the face drawing (lemonSlice removed 2026-11-19b)
// coat 2026-11-19b: type jersey, zip (zip line colour), hem (ribbed hem band colour), buttonMetal: "matte" (matte brass)
// scale: whole-body scale (kid 0.75). faceSmooth: px blur used to round the face drawing's joins (default 4).
export const KEEPER = {
  id: "keeper", faceSet: "keeper", seed: 11, faceSmooth: 8,                            // 8 px: rounds the zig-zag beard edge
  coat: { type: "knit", color: "#e6b22a", accent: "#7a4614", buttons: "#3a2410" },   // yellow knit coat, brown placket + toggles
  hat: "beanie", hatColor: "#c8402c", pomColor: "#eee8dc",                             // red knit beanie, cuff, pompom
  hair: null,                                                                          // white beard is in the face drawing
};

export const ENGINEER = {
  id: "engineer", faceSet: "engineer", seed: 23,
  // check accent lifted from #5c3418 to #6e4322 so the dark ink hand/finger hook reads against the coat (was nearly ink-dark)
  coat: { type: "check", color: "#b06a34", accent: "#6e4322", shirtPanel: "#a9bacd", buttons: "#2a1a10" },  // brown check coat, blue-grey shirt
  hat: null, hair: { color: "#7a4e2e" }, accessory: "glasses",                         // round glasses are in the face drawing
};

// ---- video 1 supporting cast (folk / folkb face sets)
export const CAPTAIN = {                                                                // navy coat, gold buttons, captain's cap with white top
  id: "captain", faceSet: "folk", seed: 41,
  coat: { type: "plain", color: "#22325a", accent: "#1a2644", shirtPanel: "#ece8de", panelPlain: true, buttons: "#e2b23c", buttonMetal: true, double: true, placket: false },
  hat: "captain", hatColor: "#1d2a4c", hatTop: "#f1eee6", peakColor: "#14110f", badgeColor: "#e2b23c",
};
export const SAILOR_A = {                                                               // striped shirt, white dixie-cup cap
  id: "sailorA", faceSet: "folkb", seed: 53,
  coat: { type: "stripes", color: "#f0ede4", accent: "#203a78", buttons: null, placket: false, pockets: false, collar: "#203a78" },
  hat: "sailor", hatColor: "#f3f1ea",
};
export const SAILOR_B = {                                                               // striped shirt (red), navy flat cap with red pompom
  id: "sailorB", faceSet: "folkb", seed: 67,
  coat: { type: "stripes", color: "#f0ede4", accent: "#b23a32", buttons: null, placket: false, pockets: false, collar: "#203a78" },
  hat: "beret", hatColor: "#1f2c52", bandColor: "#141a2a", pomColor: "#d0312d",
};
export const FISHER = {                                                                 // navy knit sweater, yellow oilskin sou'wester
  id: "fisher", faceSet: "folkb", seed: 79,
  coat: { type: "knit", color: "#2f4b6e", accent: "#22364f", buttons: null, placket: false },
  hat: "oilskin", hatColor: "#f2c21b",
};
export const BAKER = {                                                                  // terracotta coat + white apron, tall white toque
  id: "baker", faceSet: "folk", seed: 83,
  coat: { type: "plain", color: "#c47a46", accent: "#8a4e2a", apron: "#f2efe6", placket: false, buttons: null, pockets: false },
  hat: "toque", hatColor: "#f4f2ec",
};
export const LADY = {                                                                   // purple coat, flowered bonnet
  id: "lady", faceSet: "folk", seed: 97,
  coat: { type: "tweed", color: "#7a4a9c", accent: "#4e2c68", buttons: "#2a1830" },
  hat: "bonnet", hatColor: "#6a3a8c", flowerColors: ["#f5a8c6", "#ffe27a", "#ffffff", "#f07a8a"],
};
export const KID = {                                                                    // small (0.75), blue jumper, red cap
  id: "kid", faceSet: "folk", seed: 109, scale: 0.75,
  coat: { type: "knit", color: "#3d7cc4", accent: "#2a5690", buttons: null, placket: false, pockets: false },
  hat: "cap", hatColor: "#d6322a",
};

// ---- video 2 (lemon-juice robber, Pittsburgh 1995). Sets: street brick red/orange, kitchen teal/mint, living room deep blue,
//      bank cream marble + deep green + brass, police grey-blue, office dark wood + green chalkboard.
export const ROBBER = {                                                                 // lemon-yellow 1990s tracksuit, white side stripes, short dark hair
  id: "robber", faceSet: "lib_youngman_b", seed: 131,
  // 2026-11-19b (coordinator style fixes): jersey cloth (fine ribs + bump), true lemon yellow kept below bloom, matte off-white
  // placket with a dark zip line, matte off-white side stripes, ribbed hem band
  coat: { type: "jersey", color: "#e2c216", accent: "#d9d3c2", sideStripes: "#ddd7c6", zip: "#3a2a1c", hem: "#b8980e", buttons: null, pockets: false },
  hat: null, hair: { color: "#2a1d16", style: "short" },
};
export const BUDDY = {                                                                  // green flannel shirt, red baseball cap worn backwards
  id: "buddy", faceSet: "folkm", seed: 137,
  coat: { type: "check", color: "#2f6b3a", accent: "#173a22", buttons: "#3a2410", pockets: true },
  hat: "backcap", hatColor: "#cf2a26", strapColor: "#efe9dc",
};
export const TELLER_1 = {                                                               // coral cardigan over a white blouse, glasses, neat bun
  id: "teller1", faceSet: "lib_woman_glasses", seed: 149,
  coat: { type: "knit", color: "#e2735e", accent: "#a84a3a", shirtPanel: "#e2dccd", panelPlain: true, buttons: "#3a2410", placket: false },
  hat: null, hair: { color: "#6b3a22", style: "bun" },
};
export const TELLER_2 = {                                                               // royal-blue blazer, cream blouse, gold chain-ish buttons, black bob
  id: "teller2", faceSet: "lib_woman_a", seed: 157,
  coat: { type: "tweed", color: "#2c4fa8", accent: "#1d3676", shirtPanel: "#e2d8bf", panelPlain: true, buttons: "#8a6a2c", buttonMetal: "matte", placket: false },
  hat: null, hair: { color: "#1c1512", style: "bob" },
};
export const COP = {                                                                    // navy uniform, gold badge + metal buttons, police cap, moustache face (folkm, no beard)
  id: "cop", faceSet: "lib_toughguy", seed: 163,
  coat: { type: "jersey", color: "#1f2b4a", accent: "#151d33", badge: "#b8923a", buttons: "#8a6a2c", buttonMetal: "matte", pockets: true },
  hat: "police", hatColor: "#1c2642", badgeColor: "#b8923a",
};
export const COP_2 = {                                                                  // light-blue shirt, navy tie, silver badge, police cap (clean face)
  id: "cop2", faceSet: "lib_pencil", seed: 173,
  coat: { type: "jersey", color: "#8fb2d8", accent: "#5f82aa", tie: "#1a2238", badge: "#a9adb4", placket: false, buttons: null, pockets: true },
  hat: "police", hatColor: "#1c2642", badgeColor: "#a9adb4",
};
export const NEWS_ANCHOR = {                                                            // charcoal suit, white shirt, red tie, slick glossy hair
  id: "anchor", faceSet: "lib_youngman_a", seed: 181,
  coat: { type: "tweed", color: "#34384a", accent: "#24273a", shirtPanel: "#e0dcd2", panelPlain: true, tie: "#c3262c", placket: false, buttons: null, pockets: false },
  hat: null, hair: { color: "#2a1c14", style: "slick" },
};
export const WEATHERMAN = {                                                             // loud orange/teal check jacket, yellow tie, short sandy hair
  id: "weatherman", faceSet: "lib_goatee", seed: 191,
  coat: { type: "check", color: "#e88a2a", accent: "#2a8a8a", shirtPanel: "#e0dcd2", panelPlain: true, tie: "#e2bf22", placket: false, buttons: null, pockets: false },
  hat: null, hair: { color: "#b0864a", style: "short" },
};
export const PROFESSOR = {                                                              // brown tweed jacket, red bow tie, glasses, grey receding hair
  id: "professor", faceSet: "lib_oldman_handlebar", seed: 197,
  coat: { type: "tweed", color: "#8a6440", accent: "#4e3420", shirtPanel: "#ddd6c6", panelPlain: true, bowtie: "#b3262a", placket: false, buttons: "#3a2414", pockets: true },
  hat: null, hair: { color: "#c9c7c2", style: "professor" },
};

// ---- video 3 (flour mill, 1870s, night; scheme: cool navy/teal base + hot fire/red accents, flour white)
export const NEWGUY = {                                                                 // the protagonist: bright red knit jumper (brightest thing in frame), navy flat cap
  id: "newguy", faceSet: "lib_youngman_a", seed: 211,
  coat: { type: "knit", color: "#d8322a", accent: "#8e1c18", buttons: null, placket: false, pockets: false, hem: "#a82420" },
  hat: "cap", hatColor: "#1f2b3a", hair: { color: "#3a2618", style: "short" },
};
export const FOREMAN = {                                                                // steel-blue coat + flour-white apron, grey hair, bushy moustache
  id: "foreman", faceSet: "lib_oldman_moustache", seed: 223,
  coat: { type: "tweed", color: "#3e5a78", accent: "#2a4058", apron: "#f2efe6", placket: false, buttons: null, pockets: false },
  hat: null, hair: { color: "#cfcac2", style: "short" },
};
export const MILLER2 = {                                                                // co-worker: navy/white stripes, grey beret, tired face
  id: "miller2", faceSet: "lib_sleepy", seed: 229,
  coat: { type: "stripes", color: "#e9e6dd", accent: "#22365a", buttons: null, placket: false, pockets: false },
  hat: "beret", hatColor: "#5a6370", bandColor: "#3a404a", pomColor: "#5a6370",
};

export const SPECS = { keeper: KEEPER, engineer: ENGINEER, captain: CAPTAIN, sailorA: SAILOR_A, sailorB: SAILOR_B, fisher: FISHER, baker: BAKER, lady: LADY, kid: KID,
  robber: ROBBER, buddy: BUDDY, teller1: TELLER_1, teller2: TELLER_2, cop: COP, cop2: COP_2, anchor: NEWS_ANCHOR, weatherman: WEATHERMAN, professor: PROFESSOR,
  newguy: NEWGUY, foreman: FOREMAN, miller2: MILLER2 };
