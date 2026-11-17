// Ready character specs (v12 look). Colours are sRGB hex. Each has ONE signature item readable across the room.
// coat: { type: knit|check|tweed|stripes|plain, color, accent, shirtPanel?, panelPlain?, apron?, buttons? (null = none),
//         buttonMetal?, double?, placket? (false = none), pockets? (false = none), collar? (sailor collar colour) }
// hat: beanie|captain|sailor|beret|oilskin|toque|bonnet|cap (+ hatColor, hatTop, peakColor, badgeColor, pomColor, bandColor, flowerColors)
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

export const SPECS = { keeper: KEEPER, engineer: ENGINEER, captain: CAPTAIN, sailorA: SAILOR_A, sailorB: SAILOR_B, fisher: FISHER, baker: BAKER, lady: LADY, kid: KID };
