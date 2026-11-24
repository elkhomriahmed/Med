import React from "react";
import { Composition } from "remotion";
import { CarTest } from "./CarTest.jsx";

const C = (id, props) => <Composition key={id} id={id} component={CarTest} durationInFrames={90} fps={30} width={540} height={960} defaultProps={{ id, t: 3, ...props }} />;
export const Root = () => (
  <>
    {C("CarExt", { view: "ext", k: {}, person: true })}
    {C("CarRear", { view: "rear", k: {} })}
    {C("CarInterior", { view: "int", k: {}, cpos: [0.42, 1.02, 0.12], ctarget: [-0.9, 0.55, -0.32], fov: 62 })}
    {C("CarFront34", { view: "f34", k: {}, cpos: [-3.4, 1.35, -4.4], ctarget: [0, 0.65, 0], fov: 40 })}
    {C("Windshield", { view: "throughWindshield", k: { dot: 1 }, haze: 0.6 })}
    {C("SideWindow", { view: "sideWindow", k: { dot: 1, smoke: 0.3, scorch: 0.25 } })}
    {C("SeatSmoke", { view: "seatMacro", k: { dot: 1, smoke: 0.6, scorch: 0.6 } })}
    {C("SeatRing", { view: "seatMacro", k: { dot: 0.7, smoke: 0.9, scorch: 1, ring: 1 } })}
    {C("WindshieldRing", { view: "throughWindshield", k: { dot: 0.7, smoke: 0.9, scorch: 1, ring: 1 }, haze: 0.8 })}
    {C("FireBurst", { view: "doorOpen", door: 0.8, k: { scorch: 1, ring: 1, fire: 0.17, spill: 0.6 } })}
    {C("FireDoor", { view: "doorOpen", door: 1, k: { scorch: 1, ring: 1, fire: 1, spill: 1 } })}
    {C("OptRays", { shot: "optics", view: "rays", k: { rays: 1, focus: 0.85 } })}
    {C("OptFocus", { shot: "optics", view: "focus", k: { rays: 1, focus: 1, scorch: 0.3 } })}
    {C("OptMelt", { shot: "optics", view: "melt", k: { rays: 1, focus: 1, scorch: 0.9, melt: 0.75, foam: 0.7 } })}
  </>
);
