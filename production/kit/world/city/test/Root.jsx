import React from "react";
import { Composition } from "remotion";
import { CityTest } from "./CityTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={CityTest} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={props} />;
export const Root = () => (
  <>
    {C("CityStreetDay", { time: "day", view: "streetWide" })}
    {C("CityBank1Day", { time: "day", view: "bank1Approach" })}
    {C("CityBank2Day", { time: "day", view: "bank2Approach" })}
    {C("CityFacade", { time: "morning", view: "facadeDetail" })}
    {C("CityAptNight", { time: "night", view: "apartmentFromStreet" })}
    {C("CityFromWindowNight", { time: "night", view: "policeFromApartment" })}
    {C("CityPoliceNight", { time: "night", view: "policeNight" })}
    {C("CityMorningWide", { time: "morning", view: "streetWide" })}
    {C("CityBench", { time: "night", view: "streetWide", bench: true })}
    {C("CityBenchDay", { time: "day", view: "bank1Approach", bench: true })}
  </>
);
