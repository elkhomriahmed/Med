import React from "react";
import { Composition } from "remotion";
import { FxTest } from "./FxTest.jsx";

const C = (id, props) => <Composition id={id} component={FxTest} durationInFrames={90} fps={30} width={540} height={960} defaultProps={props} />;
export const Root = () => (
  <>
    {C("Candle", { shot: "candle", k: 1, t: 3 })}
    {C("Fireball", { shot: "fireball", k: 0.35, t: 3 })}
    {C("Dust", { shot: "dust", k: 0.6, k2: 0.35, t: 3 })}
    {C("Whiteout", { shot: "dust", k: 0.9, k2: 0.85, t: 3 })}
    {C("SciPile", { shot: "science", view: "pile", k: 0.7, t: 3 })}
    {C("SciPuff", { shot: "science", view: "puff", k: 0.9, t: 3 })}
    {C("SciChain", { shot: "science", view: "chain", k: 0.5, t: 3 })}
    {C("Explosion25", { shot: "explosion", k: 0.25, t: 3 })}
    {C("Explosion60", { shot: "explosion", k: 0.6, t: 3 })}
    {C("Splash", { shot: "splash", k: 0.4, t: 3 })}
  </>
);
