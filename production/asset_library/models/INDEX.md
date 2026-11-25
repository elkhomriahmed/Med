# 3D model library (realistic props + vehicles)

Rule (user, 2026-11-24): vehicles and complex props are REAL models (Sketchfab, user's account, signed in in the app's built-in
browser), never hand-coded boxes. Prefer CC0 / CC-BY (commercial OK). Put the credit line in the YouTube description.

| Asset | Files | Contents | License + credit | Used in |
|---|---|---|---|---|
| FREE 1950s Car Variety Pack | `kit/public/models/cars50s/` (scene.gltf + bin + textures); loader `kit/world/car/realCar.js` (`loadCarModel(name)`, `buildRealHeroCar()`) | patrician, clipper, 54buick (hero), buickwagon, hudson, buick_50, buick_coupe, fordpolice, taxi, packard_caribbean, surferwagon, van, buick_conv, usps_jeep, corvette, trailer | CC-BY-4.0. Credit: "Car models: FREE 1950s Car Variety Pack by Libau Media (@robinmikart), sketchfab.com, CC-BY 4.0" | Video 4 (all cars) |

Notes: models are merged per material (no separate doors). `buildRealHeroCar` cuts the driver door out of the body onto a hinge and
measures the seat/dash heights by raycast (anchors: driverSeatTop, seatBurnPoint, dashLighter, dashShades, passSeat).
The Buick's big steering wheel and high doors block the old through-windshield/side-window views: inside views look from above
the passenger seat.
