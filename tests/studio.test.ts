import assert from "node:assert/strict";
import fs from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { INTERIORS, PAINT, VEHICLES, featuresForVehicle, lengthBand, vehicleById, type ModelId } from "../src/studio/catalog";
import { vehicleGlb } from "../src/studio/vehicles/assets";
import { applyExteriorPaint, applyInteriorFinish, glassParams, paintParams, steelParams } from "../src/studio/materials";
import { useStudio } from "../src/studio/store";
import { SHOTS, frameShot, minOrbitDistance, shotDistance, shotFor } from "../src/studio/scene/shots";
import { prefersHighQuality } from "../src/studio/scene/quality";
import { suspensionLift, wheelsShareBody } from "../src/studio/vehicles/suspension";
import { prepareHeritage, heritagePivot, heritageRig, heritageOpenAngles, inPanel } from "../src/studio/vehicles/HeritageVehicle";
import { BACKDROPS, lightRig } from "../src/studio/scene/backdrops";
{
  const ids = BACKDROPS.map((backdrop) => backdrop.id);
  assert.equal(new Set(ids).size, ids.length, "backdrop ids must be unique");
  for (const id of ["studio", "mars", "forest", "night-city", "desert"] as const) {
    assert.ok(ids.includes(id), `missing backdrop ${id}`);
  }
  assert.equal(useStudio.getState().environment, "studio");
  useStudio.getState().setEnvironment("mars");
  assert.equal(useStudio.getState().environment, "mars");
  useStudio.getState().setEnvironment("forest");
  assert.equal(useStudio.getState().environment, "forest");
  useStudio.getState().setEnvironment("studio");
}
for (const vehicle of VEHICLES) {
  useStudio.getState().setModel(vehicle.id);
  for (const variant of vehicle.variants) {
    useStudio.getState().setVariant(variant.id);
    for (const feature of featuresForVehicle(vehicle, variant.id)) {
      assert.ok(SHOTS[feature.id], `${vehicle.id}/${feature.id}: camera shot missing`);
      assert.ok(shotFor(vehicle.id, feature.id), `${vehicle.id}/${feature.id}: model shot missing`);
      useStudio.getState().setFeature(feature.id);
      assert.equal(useStudio.getState().feature, feature.id);
      assert.equal(useStudio.getState().autoRotate, false);
      assert.equal(useStudio.getState().demoFeature, null, "Animation must wait for the camera");
      for (const width of [390, 1440]) {
        const framed = frameShot(vehicle.id, feature.id, width);
        const distance = shotDistance(framed);
        const min = minOrbitDistance(vehicle.id, feature.id, width);
        assert.ok(
          distance + 1e-6 >= min,
          `${vehicle.id}/${variant.id}/${feature.id}@${width}: framed ${distance.toFixed(3)} m is inside minDistance ${min.toFixed(3)} m`,
        );
      }
    }
    assert.equal(minOrbitDistance(vehicle.id, null, 1440), 3.8, `${vehicle.id}: overview keeps the exterior orbit floor`);
  }
  useStudio.getState().resetPose();
  assert.equal(useStudio.getState().feature, null);
  assert.ok(Object.values(useStudio.getState().open).every(v => !v));
  const paint = useStudio.getState().exteriorId;
  useStudio.getState().setExterior("invalid");
  assert.equal(useStudio.getState().exteriorId, paint);
  const overview = shotFor(vehicle.id, "overview");
  assert.ok(overview.position && overview.target, `${vehicle.id}: overview shot`);
  assert.ok(overview.position[1] > 0.5, `${vehicle.id}: overview camera above the floor`);
}
const byId = (id: string) => {
  const found = VEHICLES.find((v) => v.id === id);
  assert.ok(found, id);
  return found!;
};
for (const id of ["doors", "frunk", "trunk"] as const) {
  assert.notEqual(byId("model-3").features.find((f) => f.id === id)?.cameraOnly, true, `Highland ${id} opens`);
  assert.notEqual(byId("model-y").features.find((f) => f.id === id)?.cameraOnly, true, `Juniper ${id} opens`);
}
assert.equal(byId("model-3").features.find((f) => f.id === "charge")?.cameraOnly, true);
assert.equal(byId("model-y").features.find((f) => f.id === "charge")?.cameraOnly, true);
assert.deepEqual(byId("model-3").parts, ["door-fl", "door-fr", "door-rl", "door-rr", "frunk", "trunk"]);
assert.deepEqual(byId("model-y").parts, ["door-fl", "door-fr", "door-rl", "door-rr", "frunk", "trunk"]);
for (const id of ["model-3-heritage", "model-s-heritage"] as const) {
  assert.ok(byId(id).features.every((f) => !f.cameraOnly), `${id} features must not be camera-only`);
}
assert.match(byId("cybercab").marketNote ?? "", /concept/i, "Cybercab marketNote must mention concept");
assert.match(byId("cybercab").marketNote ?? "", /CC BY/i, "Cybercab marketNote must name the pending CC BY scan");
assert.ok(!byId("cybercab").features.some((f) => ["charge", "trunk", "suspension", "tonneau"].includes(f.id)), "Cybercab must not invent production features");
assert.equal(byId("cybertruck").features.find((f) => f.id === "doors")?.cameraOnly, undefined, "Cybertruck doors open");
assert.match(byId("cybertruck").marketNote ?? "", /CC BY/i, "Cybertruck marketNote must credit the CC BY mesh");
assert.match(byId("cybertruck").marketNote ?? "", /Nieve5677/i, "Cybertruck marketNote must name the artist");
assert.match(byId("cybertruck").marketNote ?? "", /illustrative/i, "Cybertruck marketNote must stay illustrative");
assert.doesNotMatch(byId("cybertruck").marketNote ?? "", /endorsed/i, "Do not claim Tesla endorsement");
assert.deepEqual(byId("cybertruck").parts, ["door-fl", "door-fr", "door-rl", "door-rr", "frunk", "trunk", "tonneau"]);
for (const id of ["charge", "suspension"] as const) {
  assert.equal(byId("cybertruck").features.find((f) => f.id === id)?.cameraOnly, true, `Cybertruck ${id} stays a camera study`);
}
for (const id of ["frunk", "trunk", "tonneau"] as const) {
  assert.notEqual(byId("cybertruck").features.find((f) => f.id === id)?.cameraOnly, true, `Cybertruck ${id} opens`);
}
const paintKeys = [
  "color", "metalness", "roughness", "clearcoat", "clearcoatRoughness",
  "envMapIntensity", "sheen", "sheenRoughness", "sheenColor", "reflectivity",
  "anisotropy", "anisotropyRotation", "iridescence", "iridescenceIOR",
  "iridescenceThicknessRange", "ior", "specularIntensity",
];
for (const paint of Object.values(PAINT)) {
  const params = paintParams(paint);
  assert.deepEqual(Object.keys(params).sort(), [...paintKeys].sort(), `paintParams(${paint.id}) API`);
  assert.equal(params.color, paint.hex);
}
assert.equal(glassParams().transmission, 0);
assert.equal(glassParams("#8fb4c8", 0.28, "lens").transmission, 0);
console.log("PASS: paintParams API and glass transmission stay stable");

{
  useStudio.getState().setModel("model-3");
  useStudio.getState().setExterior("pearl-white");
  const pearl = vehicleById("model-3").exteriors.find((p) => p.id === useStudio.getState().exteriorId);
  assert.ok(pearl);
  useStudio.getState().setExterior("ultra-red");
  const red = vehicleById("model-3").exteriors.find((p) => p.id === useStudio.getState().exteriorId);
  assert.ok(red);
  const body = new THREE.MeshPhysicalMaterial({ name: "exterior_paint" });
  applyExteriorPaint(body, pearl!);
  assert.equal(body.color.getHexString(), pearl!.hex.slice(1).toLowerCase());
  applyExteriorPaint(body, red!);
  assert.notEqual(body.color.getHexString(), pearl!.hex.slice(1).toLowerCase());
  assert.equal(body.color.getHexString(), red!.hex.slice(1).toLowerCase());
  const gloss = new THREE.MeshPhysicalMaterial();
  const satin = new THREE.MeshPhysicalMaterial();
  applyExteriorPaint(gloss, PAINT["diamond-black"]);
  applyExteriorPaint(satin, PAINT["satin-black"]);
  assert.ok(satin.roughness > gloss.roughness + 0.2, "satin paint stays softer than gloss");
  assert.ok(gloss.clearcoat > satin.clearcoat, "gloss keeps a clearer coat than satin");
  assert.notEqual(steelParams(PAINT.stainless).color.toLowerCase(), PAINT.stainless.hex.toLowerCase(), "bare stainless is not the wrap swatch");
  assert.equal(steelParams(PAINT["satin-blue"]).color.toLowerCase(), PAINT["satin-blue"].hex.toLowerCase(), "a Cybertruck colour wraps the shell");
  body.dispose();
  gloss.dispose();
  satin.dispose();
  console.log("PASS: exterior selection changes body paint parameters");
}

{
  const { horizonFor } = await import("../src/studio/scene/scenery");
  const { disposeHorizon, makeHorizon } = await import("../src/studio/scene/horizon");
  const { groundChroma } = await import("../src/studio/scene/ground");
  const { paintSky, skyStops } = await import("../src/studio/scene/sky");
  const signatures = new Set<string>();
  for (const backdrop of BACKDROPS) {
    const rig = lightRig(backdrop);
    assert.ok(rig.key.intensity > rig.fill.intensity, `${backdrop.id}: key must be stronger than fill`);
    assert.ok(rig.rim.intensity > 0, `${backdrop.id}: rim`);
    assert.ok(rig.key.position[0] * rig.fill.position[0] < 0, `${backdrop.id}: key and fill sit on opposite sides`);
    assert.ok(backdrop.beam > 0 && backdrop.pool > 0, `${backdrop.id}: headlights need a beam and a ground pool`);
    const signature = [rig.key.intensity, rig.key.color, rig.fill.intensity, rig.fill.color, rig.rim.intensity, rig.rim.color].join("|");
    assert.ok(!signatures.has(signature), `${backdrop.id} repeats another light rig`);
    signatures.add(signature);
  }
  assert.equal(BACKDROPS.find((b) => b.id === "studio")?.mirror, true);
  assert.equal(BACKDROPS.find((b) => b.id === "midnight")?.mirror, true);
  assert.equal(BACKDROPS.find((b) => b.id === "daylight")?.scenery, "day");
  for (const id of ["forest", "night-city", "desert", "mars", "daylight"] as const) {
    const backdrop = BACKDROPS.find((b) => b.id === id)!;
    assert.notEqual(backdrop.scenery, "none", `${id} is an empty stage`);
    assert.notEqual(backdrop.skyTop.toLowerCase(), backdrop.floor.toLowerCase(), `${id} sky matches the ground`);
    assert.notEqual(backdrop.skyBottom.toLowerCase(), backdrop.floor.toLowerCase(), `${id} horizon matches the ground`);
    assert.equal(backdrop.mirror, false, `${id} must reflect the outdoor place, not the studio cyclorama`);
    const layers = horizonFor(backdrop.scenery);
    assert.ok(layers.length >= 2, `${id} horizon`);
    const horizon = makeHorizon(layers, backdrop.skyBottom);
    assert.equal(horizon.children.length, layers.length, `${id} horizon meshes`);
    disposeHorizon(horizon);
    assert.ok(groundChroma(id) > 18, `${id} ground is a flat colour`);
    const stops = skyStops(backdrop);
    assert.ok(new Set(stops.map((stop) => stop.color.toLowerCase())).size >= 3, `${id} sky is flat`);
    const sky = new Uint8ClampedArray(16 * 32 * 4);
    paintSky(backdrop, sky, 16, 32);
    const top = sky[0] + sky[1] + sky[2];
    const bottomIndex = (31 * 16) * 4;
    const bottom = sky[bottomIndex] + sky[bottomIndex + 1] + sky[bottomIndex + 2];
    assert.notEqual(top, bottom, `${id} sky has no depth`);
  }
  console.log("PASS: each backdrop has its own key, fill and rim, and outdoor places keep sky, ground and scenery");
}
assert.deepEqual(shotFor("model-3-heritage", "suspension"), SHOTS.suspension, "shotFor must fall back to SHOTS");
const model3Performance = shotDistance(frameShot("model-3", "performance", 1440));
assert.ok(
  model3Performance > 3.1 && model3Performance < 3.25,
  `Model 3 desktop performance shot stays near 3.15 m, got ${model3Performance.toFixed(3)}`,
);
assert.ok(
  minOrbitDistance("model-3", "performance", 1440) < 3.8,
  "Performance close-up must not inherit the 3.8 m exterior floor",
);
assert.ok(minOrbitDistance("model-3", "performance", 1440) <= model3Performance);
assert.equal(minOrbitDistance("model-3", "interior", 1440), 0.25);
assert.equal(prefersHighQuality("auto", 1440), true);
assert.equal(prefersHighQuality("auto", 768), true);
assert.equal(prefersHighQuality("auto", 767), false);
assert.equal(prefersHighQuality("low", 1440), false);
assert.equal(prefersHighQuality("high", 390), true);
useStudio.getState().setQuality("low");
assert.equal(useStudio.getState().quality, "low");
useStudio.getState().setQuality("auto");
assert.ok(Math.abs(suspensionLift("suspension", false, Math.PI / 1.5, false) - 0.26) < 1e-6);
assert.equal(suspensionLift("suspension", true, 0, false), 0.13);
assert.equal(suspensionLift("suspension", false, 1, true), 0);
assert.equal(suspensionLift(null, false, 1, false), 0);
for (const vehicle of VEHICLES) {
  const interior = shotFor(vehicle.id, "interior");
  assert.ok(interior.position[1] > 0.75, `${vehicle.id}: interior camera must stay above the floor`);
  assert.ok(Math.abs(interior.position[0]) < 0.45, `${vehicle.id}: interior camera sits between the front seats`);
  assert.ok(interior.position[2] > interior.target[2], `${vehicle.id}: interior camera looks forward`);
  const span = Math.hypot(
    interior.position[0] - interior.target[0],
    interior.position[1] - interior.target[1],
    interior.position[2] - interior.target[2],
  );
  assert.ok(span < 2.4, `${vehicle.id}: interior camera must stay close to the cabin`);
}
useStudio.getState().setModel("model-3");
useStudio.getState().setVariant("p");
useStudio.getState().setFeature("performance");
useStudio.getState().setVariant("rwd");
assert.equal(useStudio.getState().feature, null, "Removing a performance trim must close its tour");
useStudio.getState().setFeature("butterfly");
assert.equal(useStudio.getState().feature, null, "Cross-model features must be rejected");
useStudio.getState().setModel("cybertruck");
useStudio.getState().setFeature("suspension");
useStudio.getState().setDemoFeature("suspension");
useStudio.getState().setModel("model-y");
assert.equal(useStudio.getState().demoFeature, null);
console.log("PASS: every model/trim/feature, invalid selections, camera coverage, reset and model-switch isolation");
function checkGeometry(g: THREE.BufferGeometry) {
  const p = g.getAttribute("position"),
    n = g.getAttribute("normal");
  assert.ok(p.count > 0);
  assert.ok(n);
  for (const key of ["position", "normal"]) for (const value of g.getAttribute(key).array) assert.ok(Number.isFinite(value), "Non-finite geometry");
  const index = g.getIndex();
  assert.ok(index);
  assert.equal(index.count % 3, 0);
  for (const value of index.array) assert.ok(value >= 0 && value < p.count);
}
function worldSize(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
}
function materialNames(root: THREE.Object3D) {
  const names = new Set<string>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) names.add(m.name);
  });
  return names;
}
function assertOneOf(label: string, names: Set<string>, options: string[]) {
  assert.ok(options.some((name) => names.has(name)), `${label} missing ${options.join(" or ")}; has ${[...names].sort().join(", ")}`);
}
function assertSeparated(label: string, names: Set<string>, paint: string[], glass: string[], wheel: string[], lamp: string[]) {
  assertOneOf(`${label} paint`, names, paint);
  assertOneOf(`${label} glass`, names, glass);
  assertOneOf(`${label} wheels`, names, wheel);
  assertOneOf(`${label} lamps`, names, lamp);
}
function assertLength(id: ModelId, meters: number) {
  const band = lengthBand(id);
  assert.ok(meters >= band.min && meters <= band.max, `${id} length ${meters.toFixed(3)} m is outside ${band.min.toFixed(3)}–${band.max.toFixed(3)}`);
}
function assertUpholstery(label: string, materials: THREE.Material[]) {
  assert.ok(materials.length > 0, `${label} has no upholstery`);
  const mat = materials[0] as THREE.MeshPhysicalMaterial;
  applyInteriorFinish(mat, INTERIORS.white);
  assert.equal("#" + mat.color.getHexString(), INTERIORS.white.leather.toLowerCase(), `${label} white upholstery`);
  applyInteriorFinish(mat, INTERIORS.black);
  assert.equal("#" + mat.color.getHexString(), INTERIORS.black.leather.toLowerCase(), `${label} black upholstery`);
}

/** Where a shipped mesh lands in the fov-50 interior shot. Aspect 1 is the narrow case. */
function interiorView(model: ModelId) {
  const shot = shotFor(model, "interior");
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 40);
  cam.position.set(shot.position[0], shot.position[1], shot.position[2]);
  cam.lookAt(shot.target[0], shot.target[1], shot.target[2]);
  cam.updateMatrixWorld(true);
  return cam;
}
function visibleMass(cam: THREE.PerspectiveCamera, object: THREE.Object3D) {
  const xs: number[] = [];
  const ys: number[] = [];
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const pos = child.geometry?.getAttribute("position");
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 240));
    for (let i = 0; i < pos.count; i += step) {
      const world = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
      if (world.clone().applyMatrix4(cam.matrixWorldInverse).z >= -0.02) continue;
      const ndc = world.project(cam);
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
      xs.push(ndc.x);
      ys.push(ndc.y);
    }
  });
  if (xs.length < 4) return null;
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  return {
    n: xs.length,
    cx: xs[Math.floor(xs.length / 2)],
    cy: ys[Math.floor(ys.length / 2)],
    w: xs[xs.length - 1] - xs[0],
    h: ys[ys.length - 1] - ys[0],
  };
}
function worldDims(object: THREE.Object3D) {
  const size = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
  return [size.x, size.y, size.z].sort((a, b) => b - a);
}
function assertOnScreen(model: string, name: string, mass: { cx: number; cy: number; w: number; h: number } | null, limits: { cx: number; cy: number; w: number; h: number }) {
  assert.ok(mass, `${model} ${name} misses the interior shot`);
  assert.ok(
    Math.abs(mass!.cx) <= limits.cx && Math.abs(mass!.cy) <= limits.cy && mass!.w >= limits.w && mass!.h >= limits.h,
    `${model} ${name} is too small or too far off-center in the interior shot (${mass!.cx.toFixed(2)}, ${mass!.cy.toFixed(2)}, ${mass!.w.toFixed(2)}×${mass!.h.toFixed(2)})`,
  );
}
function assertLeatherSides(root: THREE.Object3D, cam: THREE.PerspectiveCamera, model: string) {
  const left: number[] = [];
  const right: number[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    if (!materials.some((m) => m.name === "interior_leather" || /seat/i.test(child.name))) return;
    const pos = child.geometry?.getAttribute("position");
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 800));
    for (let i = 0; i < pos.count; i += step) {
      const world = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
      if (world.clone().applyMatrix4(cam.matrixWorldInverse).z >= -0.02) continue;
      const ndc = world.project(cam);
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
      if (ndc.x < -0.12) left.push(ndc.y);
      if (ndc.x > 0.12) right.push(ndc.y);
    }
  });
  for (const [side, ys] of [["left", left], ["right", right]] as const) {
    assert.ok(ys.length >= 6, `${model} ${side} seat is not in the interior shot (${ys.length} samples)`);
    const span = Math.max(...ys) - Math.min(...ys);
    assert.ok(span >= 0.15, `${model} ${side} seat is only a sliver in the interior shot (${span.toFixed(2)})`);
  }
}
function assertCabinFramed(root: THREE.Object3D, model: ModelId) {
  const cam = interiorView(model);
  root.updateWorldMatrix(true, true);
  if (model === "cybercab") {
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
    const role = (mesh: THREE.Mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return materials[0]?.name ?? "";
    };
    const display = meshes.filter((mesh) => role(mesh) === "display").map((mesh) => visibleMass(cam, mesh)).filter((mass) => mass && mass.w >= 0.15 && mass.h >= 0.08 && Math.abs(mass.cx) <= 0.45);
    assert.ok(display.length, "Cybercab display misses the interior shot");
    const dash = meshes.filter((mesh) => role(mesh) === "dashboard").map((mesh) => ({ mass: visibleMass(cam, mesh), mesh })).filter((item) => item.mass && item.mass.w >= 0.28 && item.mass.h >= 0.09 && worldDims(item.mesh)[1] >= 0.06);
    assert.ok(dash.length, "Cybercab dash misses the interior shot");
    assertLeatherSides(root, cam, model);
    return;
  }
  const piece = (name: string) => {
    const object = root.getObjectByName(name);
    assert.ok(object, `${model} missing ${name}`);
    return { object: object!, mass: visibleMass(cam, object!) };
  };
  const screen = piece(model === "model-3" ? "highland_screen" : model === "model-y" ? "juniper_cabin_screen" : model === "cybertruck" ? "cybertruck_cabin_screen" : "heritage_screen");
  assertOnScreen(model, "display", screen.mass, { cx: 0.45, cy: 0.42, w: 0.15, h: 0.08 });
  if (model === "model-3") {
    const dashes: THREE.Mesh[] = [];
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      if (materials.some((m) => m.name === "dashboard")) dashes.push(o);
    });
    const framed = dashes.filter((mesh) => {
      const mass = visibleMass(cam, mesh);
      return !!mass && mass.w >= 0.28 && mass.h >= 0.09 && Math.abs(mass.cx) <= 0.55 && Math.abs(mass.cy) <= 0.55 && worldDims(mesh)[1] >= 0.06;
    });
    assert.ok(framed.length, "Highland dash misses the interior shot");
    assertLeatherSides(root, cam, model);
    return;
  }
  const dash = piece(model === "model-y" ? "juniper_cabin_dash" : model === "cybertruck" ? "cybertruck_cabin_dash" : "heritage_dash");
  assertOnScreen(model, "dash", dash.mass, { cx: 0.55, cy: 0.55, w: 0.28, h: 0.09 });
  assert.ok(worldDims(dash.object)[1] >= 0.06, `${model} dash is a sliver (${worldDims(dash.object).map((n) => n.toFixed(3)).join("×")})`);
  if (model === "model-s-heritage") {
    const cluster = piece("heritage_cluster");
    assertOnScreen(model, "cluster", cluster.mass, { cx: 0.5, cy: 0.4, w: 0.1, h: 0.05 });
  }
  if (model === "cybertruck") {
    const yoke = piece("cybertruck_cabin_yoke");
    const center = new THREE.Vector3();
    yoke.object.getWorldPosition(center);
    const distance = cam.position.distanceTo(center);
    assert.ok(distance > 0.4 && distance < 0.75, `Cybertruck yoke is ${distance.toFixed(2)} m from the interior camera`);
    assertOnScreen(model, "yoke", yoke.mass, { cx: 0.5, cy: 0.45, w: 0.12, h: 0.08 });
    assert.ok(yoke.mass!.w <= 0.6, `Cybertruck yoke fills the interior shot (${yoke.mass!.w.toFixed(2)})`);
  }
  const leftName = model === "model-y" ? "juniper_cabin_l_cushion" : model === "cybertruck" ? "cybertruck_cabin_l_cushion" : "heritage_l_cushion";
  const rightName = leftName.replace("_l_", "_r_");
  const seatL = piece(leftName);
  const seatR = piece(rightName);
  assertOnScreen(model, leftName, seatL.mass, { cx: 0.7, cy: 0.58, w: 0.12, h: 0.18 });
  assertOnScreen(model, rightName, seatR.mass, { cx: 0.7, cy: 0.58, w: 0.12, h: 0.18 });
  assert.ok(seatL.mass!.cx < -0.2 && seatR.mass!.cx > 0.2, `${model} seats are not on opposite sides (${seatL.mass!.cx.toFixed(2)}, ${seatR.mass!.cx.toFixed(2)})`);
}
// Load the actual glTF buffers through Three.js. Textures are stubbed only for this headless geometry check.
(globalThis as any).self = globalThis;
(globalThis as any).ProgressEvent = class {
  constructor(public type: string, public init: unknown) {}
};
for (const model of ["model-3-heritage", "model-s-heritage"]) {
  const path = `public/models/${model}/`;
  const json = JSON.parse(await fs.readFile(path + "scene.gltf", "utf8"));
  for (const buffer of json.buffers) {
    const b = await fs.readFile(path + buffer.uri);
    assert.equal(b.byteLength, buffer.byteLength);
    buffer.uri = "data:application/octet-stream;base64," + b.toString("base64");
  }
  for (const image of json.images ?? []) await fs.access(path + image.uri);
  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.(png|jpe?g)$/i, {
    load(_url: string, onLoad: (t: THREE.Texture) => void) {
      const t = new THREE.Texture();
      queueMicrotask(() => onLoad(t));
      return t;
    }
  } as any);
  const loader = new GLTFLoader(manager);
  const asset = await loader.parseAsync(JSON.stringify(json), "");
  const prepared = prepareHeritage(asset.scene, model);
  // Use indexed vertices: partitioned geometries retain unused source vertices.
  for (const panel of ["hood", "hatch"] as const) {
    const point = new THREE.Vector3();
    let closedY = 0, openY = 0, count = 0;
    const rotation = new THREE.Matrix4().makeRotationX(heritageOpenAngles[panel]);
    prepared.panels[panel].traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const positions = o.geometry.getAttribute("position");
      for (const i of o.geometry.index!.array) {
        point.fromBufferAttribute(positions, i);
        closedY += point.y + heritagePivot(model, panel)[1];
        openY += point.applyMatrix4(rotation).y + heritagePivot(model, panel)[1];
        count++;
      }
    });
    assert.ok(openY / count > closedY / count + 0.1, `${model}/${panel} must open upward`);
  }
  // Doors are clipped on planes: every vertex sits inside its box, and the
  // leading-edge hinge swings the trailing edge outward, away from the body.
  const rig = heritageRig(model);
  for (const door of ["left", "right", "rearLeft", "rearRight"] as const) {
    const { pivot } = rig[door];
    const trailing = Math.max(...rig[door].clip.filter(c => c.normal[2] === 1 && c.normal[0] === 0 && c.normal[1] === 0).map(c => c.offset));
    const side = door === "left" || door === "rearLeft" ? -1 : 1;
    const rotation = new THREE.Matrix4().makeRotationY(heritageOpenAngles[door]);
    const point = new THREE.Vector3();
    let vertices = 0, outward = 0;
    prepared.panels[door].traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const positions = o.geometry.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i);
        const z = point.z + pivot[2];
        assert.ok(inPanel(rig[door], point.x + pivot[0], point.y + pivot[1], z), `${model}/${door} vertex outside its shut lines`);
        const closedX = point.x + pivot[0];
        const openX = point.clone().applyMatrix4(rotation).x + pivot[0];
        if (z > trailing - 0.1) { vertices++; if (side * openX > side * closedX + 0.2) outward++; }
      }
    });
    assert.ok(vertices > 20, `${model}/${door} missing trailing edge`);
    assert.ok(outward / vertices > 0.95, `${model}/${door} must swing outward`);
  }
  let triangles = 0;
  const box = new THREE.Box3();
  for (const [key, group] of Object.entries(prepared.panels)) {
    assert.ok(group.children.length, `${model}/${key} missing`);
    group.traverse(o => {
      if (o instanceof THREE.Mesh) {
        checkGeometry(o.geometry);
        triangles += o.geometry.index!.count / 3;
        o.geometry.computeBoundingBox();
        box.union(o.geometry.boundingBox!);
        o.geometry.dispose();
      }
    });
  }
  assert.ok(triangles > 10000, `${model} missing mesh detail`);
  assert.ok(box.getSize(new THREE.Vector3()).length() < 12, "Normalization failed");
  const root = new THREE.Group();
  for (const id of Object.keys(prepared.panels)) {
    const holder = new THREE.Group();
    const pivot = heritagePivot(model, id as "fixed");
    holder.position.set(pivot[0], pivot[1], pivot[2]);
    holder.add(prepared.panels[id as "fixed"]);
    root.add(holder);
  }
  assertLength(model as ModelId, worldSize(root).z);
  const names = materialNames(root);
  if (model === "model-3-heritage") {
    assertSeparated(model, names, ["CAR_PAINT"], ["Glass", "Material.017"], ["Material.011"], ["LED_PHARE"]);
  } else {
    assertSeparated(model, names, ["material_9"], ["glass", "Material.002"], ["Rims"], ["emit"]);
  }
  const leather = [...prepared.materials.entries()]
    .filter(([name, mat]) => mat.name === "interior_leather" || name === "Material.015" || (model === "model-s-heritage" && name === "material"))
    .map(([, mat]) => mat);
  assertUpholstery(model, leather);
  const screen = prepared.panels.fixed.getObjectByName("heritage_screen") as THREE.Mesh;
  assert.equal((screen.material as THREE.Material).name, "display");
  assert.equal(screen.material.userData.screen, "portrait", `${model} centre screen`);
  assert.ok(prepared.panels.fixed.getObjectByName("heritage_l_cushion"), `${model} seats`);
  assert.ok(prepared.panels.fixed.getObjectByName("heritage_dash"), `${model} dash`);
  assert.ok(prepared.panels.fixed.getObjectByName("heritage_trim"), `${model} trim`);
  if (model === "model-s-heritage") {
    const cluster = prepared.panels.fixed.getObjectByName("heritage_cluster") as THREE.Mesh;
    assert.equal(cluster.material.userData.screen, "cluster");
  }
  assertCabinFramed(root, model as ModelId);
  const bodyKey = model === "model-3-heritage" ? "CAR_PAINT" : "material_9";
  applyExteriorPaint(prepared.materials.get(bodyKey)!, PAINT["pearl-white"]);
  assert.equal(prepared.materials.get(bodyKey)!.color.getHexString(), PAINT["pearl-white"].hex.slice(1));
  applyExteriorPaint(prepared.materials.get(bodyKey)!, PAINT["ultra-red"]);
  assert.equal(prepared.materials.get(bodyKey)!.color.getHexString(), PAINT["ultra-red"].hex.slice(1));
  prepared.materials.forEach(m => m.dispose());
  console.log(`PASS: ${model}, ${triangles.toLocaleString()} triangles, textures present, 7 articulated groups with straight shut lines`);
}

// Use the same bundled decoder as Drei. This catches incompatible compression versions.
const {
  MeshoptDecoder,
  GLTFLoader: RuntimeGLTFLoader
} = await import('three-stdlib');
const {
  cloneAuthored
} = await import('../src/studio/vehicles/AuthoredVehicle');
const decoder = typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder;
await decoder.ready;
const authoredManifest = JSON.parse(await fs.readFile('public/models/authored/manifest.json', 'utf8'));
for (const [model, entry] of Object.entries(authoredManifest.vehicles) as [string, any][]) {
  const bytes = await fs.readFile(`public/models/authored/${model}.glb`);
  assert.equal(bytes.length, entry.bytes);
  assert.ok(bytes.length < 3_000_000, 'Asset exceeds mobile transfer budget');
  const loader = new RuntimeGLTFLoader();
  loader.setMeshoptDecoder(decoder);
  const loaded = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const instance = cloneAuthored(loaded.scene);
  for (const name of entry.rig) assert.ok(instance.scene.getObjectByName(name), `${model}: missing ${name}`);
  let triangles = 0,
    meshes = 0;
  instance.scene.traverse(o => {
    if (o instanceof THREE.Mesh) {
      checkGeometry(o.geometry);
      triangles += o.geometry.index!.count / 3;
      meshes++;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.name === "glass") {
          assert.equal((m as THREE.MeshPhysicalMaterial).transmission, 0, `${model}: glass must not use volume transmission`);
        }
      }
    }
  });
  assert.equal(triangles, entry.triangles);
  assert.equal(meshes, entry.meshes);
  assert.ok(meshes < 130);
  const center = (o: THREE.Object3D) => {
    o.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  };
  const hood = instance.scene.getObjectByName('hood')!;
  const hoodBefore = center(hood).y;
  hood.rotation.x = .82;
  assert.ok(center(hood).y > hoodBefore + .15, 'Hood must open upward');
  hood.rotation.x = 0;
  const gate = instance.scene.getObjectByName('tailgate')!;
  const before = center(gate).y;
  gate.rotation.x = model === 'cybertruck' ? Math.PI / 2 : -1.05;
  assert.ok(model === 'cybertruck' ? center(gate).y < before : center(gate).y > before, 'Rear opening direction');
  if (model === 'cybercab') {
    const door = instance.scene.getObjectByName('door_fl')!;
    const y = center(door).y;
    door.rotation.z = -1.12;
    assert.ok(center(door).y > y, 'Butterfly door must rise');
  }
  const wheelA = instance.scene.getObjectByName('wheel_fl')!,
    wheelB = instance.scene.getObjectByName('wheel_rl')!;
  assert.ok(Math.abs(wheelB.position.z - wheelA.position.z - entry.wheelbase) < .0001);
  if (model === "cybercab") {
    const { addCabinKit } = await import("../src/studio/vehicles/cabin");
    addCabinKit(instance.scene, instance.materials as Map<string, THREE.MeshPhysicalMaterial>, "cybercab");
    assertLength("cybercab", worldSize(instance.scene).z);
    const names = materialNames(instance.scene);
    assertSeparated("Cybercab", names, ["exterior_paint"], ["glass"], ["tire_rubber", "wheel_finish"], ["headlight_led", "lamp_lens", "taillight_led"]);
    assert.ok(instance.scene.getObjectByName("seat") && instance.scene.getObjectByName("seat_1"), "Cybercab is a two-seat cabin");
    assert.ok(names.has("dashboard") && names.has("display") && names.has("interior_leather"), "Cybercab cabin surfaces");
    assert.ok(instance.scene.getObjectByName("cybercab_dash_trim"), "Cybercab dash trim");
    assertCabinFramed(instance.scene, "cybercab");
    const shell = [...instance.materials.values()].find((m) => m.name === "exterior_paint") as THREE.MeshPhysicalMaterial;
    applyExteriorPaint(shell, PAINT["cab-gold"]);
    assert.equal(shell.color.getHexString(), PAINT["cab-gold"].hex.slice(1));
    applyExteriorPaint(shell, PAINT["cab-white"]);
    assert.notEqual(shell.color.getHexString(), PAINT["cab-gold"].hex.slice(1));
    assert.equal(shell.color.getHexString(), PAINT["cab-white"].hex.slice(1));
    assertUpholstery("Cybercab", [...instance.materials.values()].filter((m) => m.name === "interior_leather"));
  }
  instance.materials.forEach(m => m.dispose());
  console.log(`PASS: ${model}, compressed decode, ${triangles.toLocaleString()} triangles, ${meshes} meshes, named hinges and opening directions`);
}

// Validate the imported Highland, including real texture paths and its presentation rig.
const { prepareHighland } = await import('../src/studio/vehicles/highland');
const highlandBytes = await fs.readFile('public/models/highland/model.glb');
const highlandJson = JSON.parse(highlandBytes.subarray(20, 20 + highlandBytes.readUInt32LE(12)).toString());
for (const image of highlandJson.images) await fs.access('public/models/highland/' + image.uri);
const textureManager = new THREE.LoadingManager();
textureManager.addHandler(/\.(png|jpe?g)$/i, { load(_url: string, done: (t: THREE.Texture) => void) { const texture = new THREE.Texture(); queueMicrotask(() => done(texture)); return texture; } } as any);
const highlandLoader = new RuntimeGLTFLoader(textureManager); highlandLoader.setMeshoptDecoder(decoder);
const highlandSource = await highlandLoader.parseAsync(highlandBytes.buffer.slice(highlandBytes.byteOffset, highlandBytes.byteOffset + highlandBytes.byteLength), '');
const highland = prepareHighland(highlandSource.scene);
assert.equal(highland.materials.get("Ln7Mtl|interior_leather")?.name, "interior_leather",
  "Highland white seats must respond to interior selection");
assert.equal(highland.materials.get("Ln7Mtl|headlight_led")?.name, "headlight_led",
  "Shared white source material must retain independent headlights");
let originalTriangles = 0, importedTriangles = 0;
highlandSource.scene.traverse(o => { if (o instanceof THREE.Mesh) originalTriangles += o.geometry.index!.count / 3; });
highland.scene.traverse(o => { if (o instanceof THREE.Mesh) { checkGeometry(o.geometry); if (!o.userData.presentationDetail) importedTriangles += o.geometry.index!.count / 3; assert.ok(o.geometry.getAttribute('uv')); if ((o.material as THREE.MeshPhysicalMaterial).name === 'glass') assert.equal((o.material as THREE.MeshPhysicalMaterial).transmission, 0); } });
assert.ok(importedTriangles >= originalTriangles, 'Rig must keep every source triangle');
assert.ok(originalTriangles > 150000);
const size = new THREE.Box3().setFromObject(highland.scene).getSize(new THREE.Vector3());
assert.ok(Math.abs(size.z - 4.72) < .001 && size.y > 1.35 && size.y < 1.5 && size.x < 2.15, 'Correct scale and orientation');
for (const name of ['body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
 const node = highland.scene.getObjectByName(name)!;
 assert.ok(node.children.length, `Highland rig missing ${name}`);
}
assert.equal(highland.staticBody, false, 'Highland panels hinge');
assert.equal(wheelsShareBody(highland.scene), false, 'Highland wheels are a separate rig');
{
  const body = highland.scene.getObjectByName('body')!;
  const wheel = highland.scene.getObjectByName('wheel_fl')!;
  const planted = new THREE.Box3().setFromObject(wheel).min.y;
  body.position.y = 0.2;
  assert.ok(Math.abs(new THREE.Box3().setFromObject(wheel).min.y - planted) < 1e-3, 'Highland wheels stay planted when the body rises');
  body.position.y = 0;
}
for (const name of ['hood', 'tailgate', 'door_fl', 'door_fr', 'door_rl', 'door_rr']) {
 const node = highland.scene.getObjectByName(name);
 assert.ok(node && node.children.length, `Highland hinge ${name}`);
}
{
  const door = new THREE.Box3().setFromObject(highland.scene.getObjectByName('door_fl')!).getSize(new THREE.Vector3());
  assert.ok(door.z > 0.7 && door.y > 0.45, `Highland front door must be a panel, got ${door.y.toFixed(2)}m tall and ${door.z.toFixed(2)}m long`);
  const hood = new THREE.Box3().setFromObject(highland.scene.getObjectByName('hood')!).getSize(new THREE.Vector3());
  assert.ok(hood.x > 1.2 && hood.z > 0.6, `Highland hood must be a lid, got ${hood.x.toFixed(2)} x ${hood.z.toFixed(2)}`);
}
let paintTriangles = 0;
highland.scene.traverse(o => {
  if (!(o instanceof THREE.Mesh) || o.userData.presentationDetail) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  if (mats.some(m => m.name === 'exterior_paint')) paintTriangles += o.geometry.index!.count / 3;
});
assert.ok(paintTriangles > 70000, `Highland body shell must take paint, got ${paintTriangles}`);
for (const wheel of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
  highland.scene.getObjectByName(wheel)!.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    assert.notEqual((o.material as THREE.Material).name, 'exterior_paint', `Highland ${wheel} rims must not take body paint`);
  });
}
assert.ok(highland.materials.get('Georimblurlfsub01Mtl|exterior_paint'), 'Main Highland shell is exterior paint');
assertLength("model-3", size.z);
{
  const names = materialNames(highland.scene);
  assertSeparated("Highland", names, ["exterior_paint"], ["glass"], ["wheel_finish", "tire_rubber"], ["headlight_led", "lamp_lens", "taillight_led"]);
  assert.ok(names.has("interior_leather"), "Highland seats");
  const screen = highland.scene.getObjectByName("highland_screen") as THREE.Mesh;
  assert.equal((screen.material as THREE.Material).name, "display");
  assert.equal(screen.material.userData.screen, "landscape");
  assert.ok(highland.scene.getObjectByName("highland_dash_brow"));
  assert.ok(highland.scene.getObjectByName("highland_dash_trim"));
  assertCabinFramed(highland.scene, "model-3");
  const shell = highland.materials.get("Georimblurlfsub01Mtl|exterior_paint")!;
  applyExteriorPaint(shell, PAINT["pearl-white"]);
  assert.equal(shell.color.getHexString(), PAINT["pearl-white"].hex.slice(1));
  applyExteriorPaint(shell, PAINT["marine-blue"]);
  assert.equal(shell.color.getHexString(), PAINT["marine-blue"].hex.slice(1));
  assertUpholstery("Highland", [...highland.materials.values()].filter((m) => m.name === "interior_leather"));
}
highland.materials.forEach(m => m.dispose());
highland.scene.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
console.log(`PASS: Highland artist asset, ${originalTriangles.toLocaleString()} preserved triangles, textures, scale and closed painted body`);

const { prepareImported } = await import('../src/studio/vehicles/imported');
for (const spec of [
  { id: 'juniper', file: 'public/models/juniper/model.glb', min: 200000, length: 4.794, maxWidth: 2.3, minHeight: 1.4, maxHeight: 1.8, wheels: true },
  { id: 'cybertruck-import', file: 'public/models/cybertruck-import/model.glb', min: 50000, length: 5.6829, maxWidth: 2.1, minHeight: 1.5, maxHeight: 1.85, wheels: false },
] as const) {
  const bytes = await fs.readFile(spec.file);
  const loader = new RuntimeGLTFLoader();
  loader.setMeshoptDecoder(decoder);
  const loaded = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const prepared = prepareImported(loaded.scene, spec.id);
  let triangles = 0;
  prepared.scene.traverse(o => {
    if (o instanceof THREE.Mesh) {
      checkGeometry(o.geometry);
      triangles += o.geometry.index!.count / 3;
    }
  });
  assert.ok(triangles > spec.min, `${spec.id} missing mesh detail (${triangles})`);
  const size = new THREE.Box3().setFromObject(prepared.scene).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.z - spec.length) < 0.02, `${spec.id} length ${size.z}`);
  assert.ok(size.x < spec.maxWidth && size.y > spec.minHeight, `${spec.id} bounds ${size.x.toFixed(2)}x${size.y.toFixed(2)}`);
  // Floating export debris would raise the height; an off-centre body would orbit badly.
  assert.ok(size.y < spec.maxHeight, `${spec.id} height ${size.y.toFixed(2)}: stray geometry above the roof`);
  const mid = new THREE.Box3().setFromObject(prepared.scene).getCenter(new THREE.Vector3());
  assert.ok(Math.abs(mid.x) < 0.03, `${spec.id} must be centred on x, got ${mid.x.toFixed(3)}`);
  assert.equal(prepared.staticBody, false, `${spec.id} panels hinge`);
  for (const name of ['hood', 'tailgate', 'door_fl', 'door_fr']) {
    const node = prepared.scene.getObjectByName(name);
    assert.ok(node && node.children.length, `${spec.id} missing ${name}`);
  }
  {
    const door = new THREE.Box3().setFromObject(prepared.scene.getObjectByName('door_fl')!).getSize(new THREE.Vector3());
    assert.ok(door.z > 0.6 && door.y > 0.4, `${spec.id} front door must be a panel, got ${door.y.toFixed(2)} x ${door.z.toFixed(2)}`);
  }
  if (!spec.wheels) {
    assert.ok(prepared.scene.getObjectByName('tonneau')?.children.length, `${spec.id} tonneau`);
    const roles = new Set<string>();
    prepared.scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) roles.add(m.name);
    });
    for (const role of ['exterior_steel', 'satin_trim', 'glass', 'tire_rubber', 'wheel_finish', 'interior_leather', 'dashboard']) {
      assert.ok(roles.has(role), `${spec.id} missing ${role}`);
    }
  }
  assert.ok(prepared.scene.getObjectByName('body'));
  assert.equal(wheelsShareBody(prepared.scene), !spec.wheels, `${spec.id} wheel rig`);
  {
    const body = prepared.scene.getObjectByName('body')!;
    if (spec.wheels) {
      const wheel = prepared.scene.getObjectByName('wheel_fl')!;
      const planted = new THREE.Box3().setFromObject(wheel).min.y;
      body.position.y = 0.25;
      assert.ok(
        Math.abs(new THREE.Box3().setFromObject(wheel).min.y - planted) < 1e-3,
        `${spec.id} wheels stay planted when the body rises`,
      );
    } else {
      const before = new THREE.Box3().setFromObject(body);
      assert.ok(before.min.y < 0.05, `${spec.id} contact patch belongs to the body (${before.min.y})`);
      body.position.y = 0.25;
      const after = new THREE.Box3().setFromObject(body);
      assert.ok(after.min.y > before.min.y + 0.2, `${spec.id} fused wheels rise with the body`);
      assert.equal(
        suspensionLift('suspension', false, Math.PI / 1.5, wheelsShareBody(prepared.scene)),
        0,
        `${spec.id} suspension demo must not lift a fused wheel shell`,
      );
    }
    body.position.y = 0;
  }
  if (spec.wheels) {
    for (const name of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) {
      assert.ok(prepared.scene.getObjectByName(name), `${spec.id} missing ${name}`);
    }
  }
  if (spec.id === "juniper") {
    assertLength("model-y", size.z);
    const names = materialNames(prepared.scene);
    assertSeparated("Juniper", names, ["exterior_paint"], ["glass"], ["tire_rubber", "wheel_finish"], ["taillight_led", "lamp_housing", "headlight_led"]);
    const screen = prepared.scene.getObjectByName("juniper_cabin_screen") as THREE.Mesh;
    assert.equal(screen.material.userData.screen, "landscape");
    assert.ok(prepared.scene.getObjectByName("juniper_cabin_l_cushion"), "Juniper seats");
    assert.ok(prepared.scene.getObjectByName("juniper_cabin_dash"), "Juniper dash");
    assert.ok(prepared.scene.getObjectByName("juniper_cabin_trim"), "Juniper trim");
    assertCabinFramed(prepared.scene, "model-y");
    const shell = [...prepared.materials.values()].find((m) => m.name === "exterior_paint")!;
    applyExteriorPaint(shell, PAINT["quicksilver"]);
    assert.equal(shell.color.getHexString(), PAINT["quicksilver"].hex.slice(1));
    applyExteriorPaint(shell, PAINT["stealth-grey"]);
    assert.notEqual(shell.color.getHexString(), PAINT["quicksilver"].hex.slice(1));
    assertUpholstery("Juniper", [...prepared.materials.values()].filter((m) => m.name === "interior_leather"));
  }
  if (spec.id === "cybertruck-import") {
    assertLength("cybertruck", size.z);
    const names = materialNames(prepared.scene);
    assertSeparated("Cybertruck", names, ["exterior_steel"], ["glass"], ["tire_rubber", "wheel_finish"], ["signature_led", "taillight_led"]);
    const screen = prepared.scene.getObjectByName("cybertruck_cabin_screen") as THREE.Mesh;
    assert.equal(screen.material.userData.screen, "landscape");
    assert.ok(prepared.scene.getObjectByName("cybertruck_cabin_l_cushion"), "Cybertruck seats");
    assert.ok(prepared.scene.getObjectByName("cybertruck_cabin_dash"), "Cybertruck dash");
    assert.ok(prepared.scene.getObjectByName("cybertruck_cabin_yoke"), "Cybertruck yoke");
    assertCabinFramed(prepared.scene, "cybertruck");
    const shell = [...prepared.materials.values()].find((m) => m.name === "exterior_steel")!;
    shell.color.set(steelParams(PAINT["satin-blue"]).color);
    assert.equal(shell.color.getHexString(), PAINT["satin-blue"].hex.slice(1));
    shell.color.set(steelParams(PAINT.stainless).color);
    assert.notEqual(shell.color.getHexString(), PAINT.stainless.hex.slice(1).toLowerCase());
    assertUpholstery("Cybertruck", [...prepared.materials.values()].filter((m) => m.name === "interior_leather"));
  }
  prepared.materials.forEach(m => m.dispose());
  console.log(`PASS: ${spec.id}, ${triangles.toLocaleString()} triangles, ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)} m`);
}
assert.equal(vehicleGlb("model-3"), "highland/model.glb");
assert.equal(vehicleGlb("model-y"), "juniper/model.glb");
assert.equal(vehicleGlb("cybertruck"), "cybertruck-import/model.glb");
assert.equal(vehicleGlb("cybercab"), "authored/cybercab.glb", "Cybercab stays on the authored study until a CC BY GLB is downloaded");
await fs.access("public/models/" + vehicleGlb("cybertruck"));
await fs.access("public/models/cybertruck-import/CREDITS.md");
const truckCredits = await fs.readFile("public/models/cybertruck-import/CREDITS.md", "utf8");
assert.match(truckCredits, /CC BY 4\.0/);
assert.match(truckCredits, /Nieve5677/);
assert.doesNotMatch(truckCredits, /endorsed by Tesla/i);
assert.match(truckCredits, /does not lift the body/);
const canvasSource = await fs.readFile("src/studio/scene/VehicleCanvas.tsx", "utf8");
assert.match(canvasSource, /minOrbitDistance\(/);
assert.match(canvasSource, /frameShot\(/);
assert.match(canvasSource, /lightRig\(/);
assert.match(canvasSource, /fillGroundImage\(/);
assert.doesNotMatch(canvasSource, /minDistance=\{[^}]*3\.8/);
const authoredSource = await fs.readFile("src/studio/vehicles/AuthoredVehicle.tsx", "utf8");
assert.match(authoredSource, /suspensionLift\(/);
assert.match(authoredSource, /wheelsShareBody\(/);
assert.match(authoredSource, /applyExteriorPaint\(/);
assert.match(authoredSource, /applyInteriorFinish\(/);
assert.match(authoredSource, /steelParams\(/);
const heritageSource = await fs.readFile("src/studio/vehicles/HeritageVehicle.tsx", "utf8");
assert.match(heritageSource, /applyExteriorPaint\(/);
assert.match(heritageSource, /applyInteriorFinish\(/);
const studioSource = await fs.readFile("src/studio/Studio.tsx", "utf8");
assert.match(studioSource, />Paint</);
assert.match(studioSource, />Interior</);
assert.match(studioSource, /Backdrop/);
const css = await fs.readFile("src/styles.css", "utf8");
assert.match(css, /\.sheet-closed \.vehicle-stage \{[^}]*right: 28px/);
const cabCredits = await fs.readFile("public/models/cybercab-import/CREDITS.md", "utf8");
assert.match(cabCredits, /zwir3kk/);
assert.match(cabCredits, /CC BY 4\.0/);
assert.match(cabCredits, /not bundled/i);


await import("./model-imports.test");

// Scenery must never hide the car or fill the lens in any studio shot.
{
  const { studioSightlines, blocksSightline } = await import("../src/studio/scene/clearance");
  const { forestTreeLayout } = await import("../src/studio/scene/forest");
  const lines = studioSightlines();
  assert.ok(lines.length > 60, "sightlines cover every model and feature");
  const trees = forestTreeLayout();
  for (const tree of trees) {
    const radius = tree.kind === "conifer" ? 0.7 + (tree.h - 3.2) * 0.16 : 1.3;
    assert.ok(!blocksSightline(tree.x, tree.z, radius, tree.h), `forest tree at ${tree.x.toFixed(1)},${tree.z.toFixed(1)} blocks a studio camera`);
  }
  console.log(`PASS: ${trees.length} forest trees clear ${lines.length} studio sightlines`);
}

// The headlight pool is a floor decal: its face must point up or it is culled.
{
  const { poolGeometry, beamPoolGeometry } = await import("../src/studio/vehicles/LampBeams");
  const pool = poolGeometry(-2.4);
  const normal = pool.getAttribute("normal");
  for (let i = 0; i < normal.count; i++) assert.ok(normal.getY(i) > 0.99, "headlight pool must face up");
  pool.computeBoundingBox();
  assert.ok(pool.boundingBox!.max.z < -2.4, "pool starts ahead of the nose");
  pool.dispose();
  const beam = beamPoolGeometry([0.74, 0.6, -2.2], 0.01);
  const beamNormal = beam.getAttribute("normal");
  for (let i = 0; i < beamNormal.count; i++) assert.ok(beamNormal.getY(i) > 0.99, "beam pool must face up");
  beam.computeBoundingBox();
  assert.ok(beam.boundingBox!.max.z < -2.2, "beam pool starts ahead of the lamp");
  assert.ok(beam.boundingBox!.min.z > -2.2 - 3.2, "beam pool falls off within a few metres");
  beam.dispose();
  console.log("PASS: headlight ground pool faces the camera and sits ahead of the nose");
}

// Rocks never poke out of the car's silhouette in a wide shot.
{
  const { scatterRocks, marsHeight, desertHeight } = await import("../src/studio/scene/landscapes");
  const { mergesWithCar } = await import("../src/studio/scene/clearance");
  for (const [name, height, count, seed, max] of [["mars", marsHeight, 42, 0x5a15, 1.3], ["desert", desertHeight, 8, 0x0c0a, 0.72]] as const) {
    const rocks = scatterRocks(count, seed, height, 0.15, max, ["#000000", "#000000"], 2, 3);
    for (const r of rocks)
      assert.ok(!mergesWithCar(r.position[0], r.position[2], Math.max(r.scale[0], r.scale[2]), r.position[1] + r.scale[1]), `${name} rock at ${r.position[0].toFixed(1)},${r.position[2].toFixed(1)} merges with the car`);
  }
  console.log("PASS: Mars and desert rocks stay out of the car silhouette");
}

// Anisotropy without vertex tangents renders rainbow bands or NaN pixels.
{
  const { prepareImported } = await import("../src/studio/vehicles/imported");
  const bytes = await fs.readFile("public/models/cybertruck-import/model.glb");
  const loader = new RuntimeGLTFLoader();
  loader.setMeshoptDecoder(decoder);
  const loaded = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  const prepared = prepareImported(loaded.scene, "cybertruck");
  prepared.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshPhysicalMaterial;
    if (!o.geometry.getAttribute("tangent")) assert.equal(m.anisotropy, 0, `${o.name}: anisotropy needs tangents`);
  });
  prepared.materials.forEach((m) => m.dispose());
  console.log("PASS: imported meshes without tangents disable anisotropy");
}
