import React from "react";
import { Composition } from "remotion";
import { LotTest } from "./LotTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={LotTest} durationInFrames={90} fps={30} width={540} height={960} defaultProps={props} />;
export const Root = () => (
  <>
    {C("LotWide", { view: "lotWide" })}
    {C("LotLow", { view: "lotLow" })}
    {C("CarLot34", { view: "carLot34" })}
    {C("CarInterior", { view: "carInterior", figures: false })}
    {C("WindowFromLot", { view: "windowFromLot" })}
    {C("CarFromBuilding", { view: "carFromBuilding" })}
    {C("Entrance", { view: "entrance" })}
    {C("StairsDown", { view: "stairsDown" })}
    {C("StairsBottom", { view: "stairsBottom" })}
    {C("LotWideEmpty", { view: "lotWide", figures: false, car: false })}
    {C("Bench", { view: "lotWide", bench: true })}
  </>
);
