// Ready character specs matching look_dev/STYLE_v12_LOCKED_reference.png. Colours are sRGB hex.
export const KEEPER = {
  id: "keeper", faceSet: "keeper", seed: 11,
  coat: { type: "knit", color: "#e6b22a", accent: "#7a4614", buttons: "#3a2410" },   // yellow knit coat, brown placket + toggles
  hat: "beanie", hatColor: "#c8402c", pomColor: "#eee8dc",                             // red knit beanie, cuff, pompom
  hair: null,                                                                          // white beard is in the face drawing
};

export const ENGINEER = {
  id: "engineer", faceSet: "engineer", seed: 23,
  coat: { type: "check", color: "#b06a34", accent: "#5c3418", shirtPanel: "#a9bacd", buttons: "#2a1a10" },  // brown check coat, blue-grey shirt
  hat: null, hair: { color: "#7a4e2e" }, accessory: "glasses",                         // round glasses are in the face drawing
};

export const SPECS = { keeper: KEEPER, engineer: ENGINEER };
