/** Original, reproducible Tesla-inspired presentation meshes. Metres; +Y up, -Z forward.
 * Panel boundaries are authored independently, not triangle-classified from a closed hull.
 */
import fs from 'node:fs/promises';
import * as T from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gzipSync } from 'node:zlib';
import { compressGLB } from './compress.mjs';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(v => {
      this.result = v;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(v => {
      this.result = `data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;
      this.onloadend?.();
    });
  }
};
const out = 'public/models/authored';
await fs.mkdir(out, {
  recursive: true
});
const preview = process.env.ASSET_PREVIEW_DIR;
if (preview) await fs.mkdir(preview, {
  recursive: true
});
const V = (x, y, z) => new T.Vector3(x, y, z),
  lerp = T.MathUtils.lerp,
  clamp = T.MathUtils.clamp;
const materials = {};
function mat(name, color, metalness = 0, roughness = .5, extra = {}) {
  const m = new T.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    side: T.DoubleSide,
    ...extra
  });
  m.name = name;
  materials[name] = m;
  return m;
}
const paint = mat('exterior_paint', '#a7222a', .5, .22, {
  clearcoat: 1,
  clearcoatRoughness: .08
});
const steel = mat('exterior_steel', '#949da5', 1, .32, {
  anisotropy: .65,
  anisotropyRotation: 0
});
const glass = mat('glass', '#6a8898', 0, .06, {
  clearcoat: 1,
  transparent: true,
  opacity: .28,
  envMapIntensity: 1.4,
  reflectivity: 1,
  depthWrite: false
});
const trim = mat('satin_trim', '#141a20', .25, .36),
  rubber = mat('tire_rubber', '#141619', 0, .87),
  carpet = mat('carpet', '#20232a', 0, .96);
const leather = mat('interior_leather', '#d3d0c9', 0, .67, {
  sheen: .3,
  sheenColor: new T.Color('#b2b0ac')
});
const dash = mat('dashboard', '#252a2e', .08, .65),
  metal = mat('machined_alloy', '#b9c0c6', 1, .24),
  rimMat = mat('wheel_finish', '#454d56', .92, .27);
const rotor = mat('brake_rotor', '#74797e', .88, .47),
  red = mat('brake_caliper', '#b91928', .4, .32),
  seal = mat('panel_seal', '#080b0e', 0, .92);
const white = mat('headlight_led', '#e7f0ff', .1, .16, {
  emissive: new T.Color('#d5e6ff'),
  emissiveIntensity: 4.8
});
const blade = mat('signature_led', '#e7f0ff', .1, .16, {
  emissive: new T.Color('#d5e6ff'),
  emissiveIntensity: 5.2
});
const tail = mat('taillight_led', '#8c0714', .15, .22, {
  emissive: new T.Color('#ed1828'),
  emissiveIntensity: 3.2
});
const lens = mat('lamp_lens', '#576978', .2, .08, {
  clearcoat: 1,
  opacity: .75,
  transparent: true
});
const screen = mat('display', '#35444d', .1, .2, {
  emissive: new T.Color('#7fabbc'),
  emissiveIntensity: .15
});
const ambient = mat('cabin_ambient', '#739fff', .1, .2, {
  emissive: new T.Color('#5186ff'),
  emissiveIntensity: 1.6
});
function group(parent, name, p = [0, 0, 0]) {
  const g = new T.Group();
  g.name = name;
  g.position.fromArray(p);
  parent?.add(g);
  return g;
}
function mesh(parent, name, geo, material) {
  const m = new T.Mesh(geo, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, name, size, pos, material, r = .015, rotation = [0, 0, 0]) {
  const g = new RoundedBoxGeometry(...size, 2, Math.min(r, ...size.map(x => x / 2 - .0001)));
  g.rotateX(rotation[0]);
  g.rotateY(rotation[1]);
  g.rotateZ(rotation[2]);
  g.translate(...pos);
  return mesh(parent, name, g, material);
}
function sphere(parent, name, size, pos, material) {
  const g = new T.SphereGeometry(1, 24, 12);
  g.scale(...size);
  g.translate(...pos);
  return mesh(parent, name, g, material);
}
function tube(parent, name, points, r, material, segments = 40) {
  const c = new T.CatmullRomCurve3(points.map(p => V(...p)));
  return mesh(parent, name, new T.TubeGeometry(c, segments, r, 6, false), material);
}
function patch(parent, name, fn, nu, nv, material, thickness = 0) {
  const p = [],
    uv = [],
    idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    p.push(...fn(i / nu, j / nv).toArray());
    uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i,
      b = a + 1,
      c = a + nu + 1,
      d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  mesh(parent, name, g, material);
  if (thickness) {
    const shell = g.clone(),
      pos = shell.attributes.position,
      n = shell.attributes.normal;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) - Math.sign(pos.getX(i)) * Math.abs(n.getX(i)) * thickness, pos.getY(i) - Math.abs(n.getY(i)) * thickness, pos.getZ(i) - Math.sign(pos.getZ(i)) * Math.abs(n.getZ(i)) * thickness);
    mesh(parent, name + '_inner', shell, trim);
  }
  return g;
}
function quad(parent, name, points, material) {
  return patch(parent, name, (u, v) => V(...points[0]).lerp(V(...points[1]), u).lerp(V(...points[3]).lerp(V(...points[2]), u), v), 1, 1, material);
}
function pivot(parent, name, pos) {
  const g = group(parent, name, pos);
  g.userData.hingeOrigin = pos;
  return g;
}
function toLocal(g) {
  for (const child of g.children) child.position.sub(g.position);
}
function spline(stations, z, column) {
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
  const a = stations[i],
    b = stations[i + 1],
    before = stations[Math.max(0, i - 1)],
    after = stations[Math.min(stations.length - 1, i + 2)],
    h = b[0] - a[0],
    t = clamp((z - a[0]) / h, 0, 1),
    m0 = (b[column] - before[column]) / (b[0] - before[0]),
    m1 = (after[column] - a[column]) / (after[0] - a[0]);
  return (2 * t ** 3 - 3 * t * t + 1) * a[column] + (t ** 3 - 2 * t * t + t) * h * m0 + (-2 * t ** 3 + 3 * t * t) * b[column] + (t ** 3 - t * t) * h * m1;
}
function wheel(root, id, x, z, r, truck = false, cab = false) {
  const w = group(root, id, [x, r, z]),
    side = Math.sign(x),
    half = truck ? .15 : .12;
  // Lathed tire section, with crown, shoulders, sidewall bead and tread grooves.
  const section = [[-half * .78, r * .69], [-half, r * .75], [-half * 1.03, r * .9], [-half * .88, r * .975], [-half * .57, r], [half * .57, r], [half * .88, r * .975], [half * 1.03, r * .9], [half, r * .75], [half * .78, r * .69]];
  const profile = section.map(([a, b]) => new T.Vector2(b, a));
  const tire = new T.LatheGeometry(profile, 80);
  tire.rotateZ(Math.PI / 2);
  mesh(w, 'tire', tire, rubber);
  for (const offset of [-.065, -.022, .022, .065]) {
    const g = new T.TorusGeometry(r + .0005, .0023, 4, 80);
    g.rotateY(Math.PI / 2);
    g.translate(offset, 0, 0);
    mesh(w, 'circumferential_tread', g, seal);
  }
  for (let i = 0; i < (truck ? 56 : 44); i++) {
    const a = i / (truck ? 56 : 44) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const g = new T.BoxGeometry(half * .67, .003, truck ? .028 : .009);
      g.rotateX(a + .15 * s);
      g.translate(s * half * .48, Math.sin(a) * r * .999, Math.cos(a) * r * .999);
      mesh(w, 'tread_sipe', g, truck ? rubber : seal);
    }
  }
  for (const a of [-1, 1]) {
    const g = new T.TorusGeometry(r * .87, .0018, 4, 64);
    g.rotateY(Math.PI / 2);
    g.translate(a * half * 1.04, 0, 0);
    mesh(w, 'sidewall_rib', g, rubber);
  }
  const face = side * (half + .006),
    rr = r * .72;
  const disk = new T.CylinderGeometry(rr * .89, rr * .89, .013, 64);
  disk.rotateZ(Math.PI / 2);
  disk.translate(face - side * .043, 0, 0);
  mesh(w, 'ventilated_rotor', disk, rotor);
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 24; i++) {
    const a = (i + ring * .5) / 24 * Math.PI * 2;
    const g = new T.CircleGeometry(.005, 6);
    g.rotateY(side * Math.PI / 2);
    g.translate(face - side * .034, Math.sin(a) * rr * (.64 + ring * .13), Math.cos(a) * rr * (.64 + ring * .13));
    mesh(w, 'rotor_drilling', g, seal);
  }
  box(w, 'caliper', [.052, .145, .072], [face - side * .035, 0, -rr * .73], red, .012);
  for (const radius of [rr, rr * .92]) {
    const g = new T.TorusGeometry(radius, .009, 8, 64);
    g.rotateY(Math.PI / 2);
    g.translate(face, 0, 0);
    mesh(w, 'rim_lip', g, metal);
  }
  const standard = group(w, 'wheel_standard'),
    sport = group(w, 'wheel_sport');
  const wedge = (parent, name, a0, a1, r0, r1, material, lift = .012) => {
    const p = (a, radius) => [face + side * lift, Math.sin(a) * radius, Math.cos(a) * radius];
    quad(parent, name, [p(a0, r0), p(a1, r0), p(a1, r1), p(a0, r1)], material);
  };
  if (cab) {
    const disc = new T.CylinderGeometry(rr * .99, rr * .99, .02, 72);
    disc.rotateZ(Math.PI / 2);
    disc.translate(face - side * .002, 0, 0);
    mesh(standard, 'aero_disc', disc, trim);
    const bowl = new T.CylinderGeometry(rr * .72, rr * .84, .012, 48);
    bowl.rotateZ(Math.PI / 2);
    bowl.translate(face + side * .008, 0, 0);
    mesh(standard, 'aero_bowl', bowl, seal);
    for (let i = 0; i < 7; i++) {
      const base = i / 7 * Math.PI * 2;
      const steps = 8;
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps, t1 = (k + 1) / steps;
        const a0 = base + t0 * 1.35;
        wedge(standard, 'turbine_blade', a0, a0 + .18, lerp(rr * .22, rr * .9, t0), lerp(rr * .22, rr * .9, t1), metal, .016);
      }
    }
    const lip = new T.TorusGeometry(rr * .96, .01, 8, 64);
    lip.rotateY(Math.PI / 2);
    lip.translate(face + side * .012, 0, 0);
    mesh(standard, 'aero_lip', lip, metal);
    const cap = new T.CylinderGeometry(rr * .14, rr * .14, .012, 28);
    cap.rotateZ(Math.PI / 2);
    cap.translate(face + side * .02, 0, 0);
    mesh(standard, 'aero_cap', cap, metal);
  } else if (truck) {
    const cover = new T.CylinderGeometry(rr * .97, rr * .97, .016, 64);
    cover.rotateZ(Math.PI / 2);
    cover.translate(face - side * .006, 0, 0);
    mesh(standard, 'cyber_cover', cover, seal);
    const ring = new T.TorusGeometry(rr * .93, .016, 8, 64);
    ring.rotateY(Math.PI / 2);
    ring.translate(face + side * .004, 0, 0);
    mesh(standard, 'cyber_ring', ring, metal);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 - .18;
      wedge(standard, 'cyber_blade', a, a + .48, rr * .16, rr * .88, rimMat, .014);
      wedge(standard, 'cyber_blade_face', a + .06, a + .42, rr * .22, rr * .8, metal, .02);
    }
    const hex = new T.CylinderGeometry(.055, .055, .018, 6);
    hex.rotateZ(Math.PI / 2);
    hex.translate(face + side * .024, 0, 0);
    mesh(standard, 'cyber_hub', hex, metal);
  } else for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const points = [[0, -.018, .045], [0, .045, rr * .91], [0, -.033, rr * .96], [0, -.05, .09]].map(([xx, yy, zz]) => [face, yy * Math.cos(a) - zz * Math.sin(a), yy * Math.sin(a) + zz * Math.cos(a)]);
    quad(standard, 'aero_blade', points, rimMat);
  }
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    for (const d of [-.012, .012]) {
      const g = new RoundedBoxGeometry(.025, .016, rr * .89, 2, .005);
      g.rotateX(a + .12);
      g.translate(face, Math.sin(-a) * rr * .53 + d, Math.cos(a) * rr * .53);
      mesh(sport, 'split_spoke', g, metal);
    }
  }
  const hub = new T.CylinderGeometry(.047, .047, .035, 32);
  hub.rotateZ(Math.PI / 2);
  hub.translate(face, 0, 0);
  mesh(w, 'hub', hub, rimMat);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const g = new T.CylinderGeometry(.005, .005, .007, 6);
    g.rotateZ(Math.PI / 2);
    g.translate(face + side * .02, Math.sin(a) * .032, Math.cos(a) * .032);
    mesh(w, 'lug', g, metal);
  }
  sport.visible = false;
  return w;
}
function cabin(parent, {
  truck = false,
  cab = false,
  lift = 0,
  width = 1.85
}) {
  const g = group(parent, 'cabin', [0, lift, truck ? -.2 : 0]);
  box(g, 'floor', [width * .79, .045, 2.1], [0, .23, .13], carpet, .015);
  const seat = (x, z, rear = false) => {
    const s = group(g, 'seat', [x, .23, z]);
    box(s, 'seat_cushion', [rear ? 1.29 : .49, .135, .48], [0, .16, 0], leather, .054);
    box(s, 'seat_back', [rear ? 1.29 : .465, .54, .135], [0, .48, .18], leather, .06, [-.14, 0, 0]);
    if (!rear) {
      box(s, 'headrest', [.265, .2, .12], [0, .83, .23], leather, .05);
      for (const side of [-1, 1]) {
        box(s, 'side_bolster', [.074, .15, .4], [side * .207, .23, .0], leather, .027);
        box(s, 'back_bolster', [.06, .43, .095], [side * .20, .5, .12], leather, .025, [-.14, 0, side * -.035]);
        tube(s, 'stitching', [[side * .17, .243, -.19], [side * .17, .256, 0], [side * .17, .258, .18]], .0011, metal, 16);
      }
    }
    for (let i = 0; i < 7; i++) box(s, 'perforated_insert', [rear ? 1.12 : .29, .001, .0015], [0, .229, -.145 + i * .044], dash, .0002);
  };
  seat(-.4, -.25);
  seat(.4, -.25);
  if (!cab) seat(0, .73, true);
  box(g, 'dash', [width * .79, .15, .34], [0, .89, -.98], dash, .055);
  box(g, 'dash_veneer', [width * .76, .027, .045], [0, .9, -.798], truck ? metal : leather, .008);
  tube(g, 'ambient_light', [[-width * .37, .916, -.78], [0, .917, -.785], [width * .37, .916, -.78]], .0022, ambient, 40);
  box(g, 'console', [.275, .23, .76], [0, .44, -.19], trim, .045);
  box(g, 'armrest', [.29, .07, .32], [0, .585, .05], leather, .029);
  for (const z of [-.19, -.36]) {
    const g0 = new T.CylinderGeometry(.043, .035, .01, 32);
    g0.translate(0, .561, z);
    mesh(g, 'cupholder', g0, seal);
  }
  box(g, 'display_bezel', [cab ? .47 : .365, .232, .025], [0, .99, -.73], trim, .009, [-.10, 0, 0]);
  box(g, 'display_glass', [cab ? .446 : .341, .21, .004], [0, .991, -.713], screen, .006, [-.10, 0, 0]);
  // Screen has small native geometry details rather than a blank illuminated rectangle.
  for (let i = 0; i < 6; i++) box(g, 'screen_control', [.017, .007, .002], [-.1 + i * .04, .904, -.698], metal, .002);
  box(g, 'display_divider', [.001, .17, .002], [-.045, .993, -.695], metal, .0003);
  for (let i = 0; i < 3; i++) tube(g, 'map_road', [[.00, .95 + i * .04, -.697], [.05, 1 + i * .012, -.697], [.13, .968 + i * .025, -.697]], .0015, metal, 12);
  if (!cab) {
    const steering = group(g, 'steering', [-.43, .96, -.6]);
    steering.rotation.x = .24;
    const geo = new T.TorusGeometry(.15, .015, 10, 48);
    mesh(steering, 'steering_rim', geo, trim);
    box(steering, 'steering_hub', [.18, .068, .048], [0, 0, 0], trim, .016);
    box(steering, 'steering_spoke', [.035, .105, .025], [0, -.055, 0], trim, .008);
    for (const side of [-1, 1]) box(steering, 'scroll_wheel', [.012, .022, .016], [side * .067, .005, .03], metal, .005);
  }
  if (!cab) {
    box(g, 'rear_display', [.2, .12, .018], [0, .63, .48], trim, .009);
    box(g, 'rear_display_glass', [.18, .10, .005], [0, .63, .493], screen, .005);
  }
  for (const s of [-1, 1]) {
    tube(g, 'belt', [[s * .65, 1.12, .35], [s * .60, .74, -.16], [s * .24, .40, -.12]], .009, trim, 20);
    box(g, 'belt_buckle', [.032, .06, .022], [s * .24, .41, -.12], red, .007);
  }
}
function passenger(root, kind) {
  const y = kind === 'model-y',
    cab = kind === 'cybercab',
    length = cab ? 4.12 : y ? 4.794 : 4.72,
    half = length / 2,
    w = y ? .99 : cab ? .90 : .925,
    lift = y ? .14 : cab ? .02 : 0;
  const frontAxle = cab ? -1.22 : y ? -1.504 : -1.492,
    rearAxle = cab ? 1.18 : y ? 1.386 : 1.383,
    r = cab ? .33 : y ? .358 : .337;
  const body = group(root, 'body');
  const hood = pivot(body, 'hood', [0, .89 + lift, cab ? -.72 : -.98]);
  const hatch = pivot(body, 'tailgate', [0, y ? 1.49 : cab ? .78 : .98, y ? .91 : cab ? 1.05 : 1.37]);
  const frontDoorZ = cab ? -.92 : -.92,
    rearDoorZ = cab ? 1.02 : .28,
    rearEnd = 1.18;
  const doors = {};
  for (const s of [-1, 1]) {
    doors[s + 'f'] = pivot(body, s < 0 ? 'door_fl' : 'door_fr', cab ? [s * .55, 1.28, -.35] : [s * (w - .025), .7, frontDoorZ]);
    if (!cab) doors[s + 'r'] = pivot(body, s < 0 ? 'door_rl' : 'door_rr', [s * (w - .025), .7, rearDoorZ]);
  }
  const stations = y
    ? [[-half, .88, .84, .86], [-half + .12, .97, .94, .94], [-1.90, w, 1.02, .98], [-1.48, w, 1.08, 1.00], [-.90, w, 1.16, 1.08], [0, w, 1.18, 1.13], [1.12, w, 1.16, 1.10], [half - .22, w * .95, 1.08, 1.06], [half, w * .86, 1.02, 1.04]]
    : cab
    ? [[-half, .62, .58, .60], [-half + .18, .82, .76, .78], [-1.42, w * .99, .88, .84], [-.88, w, .93, .88], [-.18, w, .96, .90], [.62, w * .97, .92, .86], [1.22, w * .82, .78, .72], [half - .10, w * .58, .58, .54], [half, w * .38, .42, .42]]
    : [[-half, .71, .66, .67], [-half + .15, .83, .75, .755], [-1.96, w * .98, .81, .80], [-1.5, w, .89, .81], [-.98, w, .96, .90], [0, w * .994, 1, .96], [1.3, w, 1, .93], [half - .22, w * .91, .91, .90], [half, w * .80, .87, .88]];
  const width = z => spline(stations, z, 1),
    belt = z => spline(stations, z, 2),
    crown = z => spline(stations, z, 3);
  const lower = z => {
    let v = .17 + lift * .2 + .16 * (Math.abs(z) / half) ** 10;
    for (const axle of [frontAxle, rearAxle]) {
      const d = z - axle,
        rr = r + .036;
      if (Math.abs(d) < rr) v = Math.max(v, r + Math.sqrt(rr * rr - d * d));
    }
    return v;
  };
  const side = (s, z, t) => {
    const low = lower(z),
      high = belt(z);
    return V(s * width(z) * (.957 + .043 * Math.sin(t * Math.PI / 2) - .009 * Math.sin(t * Math.PI * 2)), lerp(low, high, t), z);
  };
  const upper = (s, z, t) => {
    const inner = .69,
      outer = width(z),
      x = lerp(inner, outer, t);
    return V(s * x, lerp(crown(z), belt(z), t) + .026 * Math.sin(t * Math.PI), z);
  };
  for (const s of [-1, 1]) {
    const spans = cab ? [[-half, frontDoorZ, body], [frontDoorZ, rearDoorZ, doors[s + 'f']], [rearDoorZ, half, body]] : [[-half, frontDoorZ, body], [frontDoorZ, rearDoorZ, doors[s + 'f']], [rearDoorZ, rearEnd, doors[s + 'r']], [rearEnd, half, body]];
    for (const [a, b, parent] of spans) {
      patch(parent, 'sculpted_side', (u, v) => side(s, lerp(a + .002, b - .002, u), v), Math.ceil((b - a) * 36), 12, paint, .008);
      if (parent !== body) {
        const z = (a + b) / 2;
        box(parent, 'door_card', [.047, .42, (b - a) * .88], [s * (w - .075), .62 + lift, z], leather, .025);
        box(parent, 'door_armrest', [.075, .05, (b - a) * .58], [s * (w - .115), .65 + lift, z], trim, .017);
        tube(parent, 'door_ambient', [[s * (w - .09), .86 + lift, a + .08], [s * (w - .09), .86 + lift, b - .08]], .002, ambient, 12);
      }
    }
    for (const axle of [frontAxle, rearAxle]) {
      const pts = [];
      for (let i = 0; i <= 32; i++) {
        const a = i / 32 * Math.PI;
        pts.push([s * (width(axle) + .001), r + Math.sin(a) * (r + .04), axle + Math.cos(a) * (r + .04)]);
      }
      tube(body, 'rolled_wheel_arch', pts, y ? .018 : cab ? .016 : .005, y || cab ? trim : paint, 48);
    }
    for (const [a, b] of [[-half, -.98], [1.7, half]]) patch(body, 'fender_crown', (u, v) => upper(s, lerp(a, b, u), v), Math.ceil((b - a) * 42), 12, paint);
    // Sills and door seals follow the actual panel edges.
    box(body, 'sill', [y || cab ? .058 : .044, y ? .11 : .065, cab ? 1.55 : 1.72], [s * (w - .008), .195 + lift * .2, .08], trim, .016);
    for (const z of [frontDoorZ, rearDoorZ, ...(!cab ? [rearEnd] : [])]) tube(body, 'door_seal', [side(s, z, .05).toArray(), side(s, z, .5).toArray(), side(s, z, 1).toArray()], .0022, seal, 24);
    if (!cab) {
      for (const [tag, z] of [['f', .10], ['r', 1.02]]) box(doors[s + tag], 'flush_handle', [.015, .025, .155], [s * (w + .002), .91 + lift, z], trim, .009);
      sphere(doors[s + 'f'], 'mirror_cap', [.132, .056, .091], [s * 1.0, 1.02 + lift, -.77], paint);
      sphere(doors[s + 'f'], 'mirror_glass', [.106, .038, .006], [s * 1.006, 1.017 + lift, -.697], metal);
      tube(doors[s + 'f'], 'mirror_stalk', [[s * .85, .97 + lift, -.78], [s * .98, 1.01 + lift, -.77]], .018, trim, 10);
    }
  }
  // Hood and front bumper have separately fitted edges.
  patch(hood, 'hood_skin', (u, v) => {
    const z = lerp(-half + (cab ? .28 : .17), cab ? -.74 : -.985, v),
      x = (u - .5) * (cab ? 1.22 : 1.378);
    const crownLift = cab ? .04 * Math.sin(v * Math.PI) : .014;
    return V(x, crown(z) + crownLift * (1 - (x / (cab ? .61 : .689)) ** 2), z);
  }, 36, 44, paint, .008);
  patch(body, 'nose_cap', (u, v) => {
    const z = lerp(-half, -half + (cab ? .28 : .165), v),
      x = (u - .5) * (cab ? 1.24 : 1.38);
    const bulge = cab ? .055 * Math.sin(v * Math.PI) : .012;
    return V(x, crown(z) + bulge * (1 - (x / (cab ? .62 : .69)) ** 2), z);
  }, 28, 8, paint);
  patch(body, 'front_fascia', (u, v) => {
    const span = y ? 1.72 : cab ? 1.38 : 1.42;
    const x = (u - .5) * span;
    const z = y
      ? -half + .010 * (x / .86) ** 2 + .016 * (1 - v)
      : cab
      ? -half + .06 * (x / .69) ** 2 + .10 * (1 - v) ** 2
      : -half + .075 * (x / .71) ** 2 + .085 * (1 - v) ** 2 - .025 * Math.sin(v * Math.PI);
    const top = y ? .86 + lift : cab ? crown(-half) : crown(-half);
    return V(x, lerp(cab ? .20 : y ? .28 : .23, top, v), z);
  }, 40, 18, paint);
  if (y) {
    box(body, 'front_lower_grille', [1.58, .055, .04], [0, .32, -half - .012], trim, .018);
    box(body, 'front_intake_slot', [1.12, .018, .02], [0, .32, -half - .028], seal, .006);
    box(body, 'front_valance', [1.62, .09, .07], [0, .22, -half + .01], trim, .02);
  } else if (cab) {
    box(body, 'front_lower_grille', [1.02, .04, .03], [0, .24, -half + .01], trim, .014);
    box(body, 'front_splitter', [1.18, .03, .08], [0, .17, -half + .04], trim, .01);
  } else {
    box(body, 'front_lower_grille', [1.12, .073, .025], [0, .30, -half - .002], trim, .029);
    for (let i = 0; i < 23; i++) box(body, 'grille_vane', [.006, .046, .018], [-.52 + i * .047, .30, -half - .019], dash, .002);
  }
  box(body, 'frunk_tub', [1.25, .12, .89], [0, .54 + lift, -1.55], carpet, .07);
  for (const s of [-1, 1]) tube(body, 'hood_gas_strut', [[s * .53, .64 + lift, -1.18], [s * .53, .84 + lift, -1]], .009, metal, 10);
  // Greenhouse: independently modeled windshield, roof, rear glass and side apertures.
  const roofStations = y
    ? [[-.985, 1.12, .88], [-.68, 1.38, .84], [-.12, 1.62, .78], [.42, 1.68, .76], [1.02, 1.58, .78], [1.48, 1.36, .84], [1.82, 1.12, .90]]
    : cab
    ? [[-.82, .98, .76], [-.42, 1.24, .68], [.08, 1.40, .62], [.58, 1.36, .60], [1.08, 1.16, .62], [1.48, .88, .64], [1.88, .58, .52]]
    : [[-.985, .90 + lift, .82], [-.73, 1.13 + lift, .79], [-.25, 1.39 + lift, .73], [.28, 1.44 + lift, .715], [.87, 1.39 + lift, .735], [1.38, 1.19 + lift, .80], [1.73, .96 + lift, .85]];
  const ry = z => spline(roofStations, z, 1),
    rx = z => spline(roofStations, z, 2);
  const roofFn = (u, z) => {
    const t = (u - .5) * 2;
    return V(t * rx(z), ry(z) - .045 * Math.pow(Math.abs(t), 2.6), z);
  };
  for (const [a, b, material, name] of [[-.98, -.28, glass, 'windshield'], [-.273, .86, cab ? paint : glass, 'panoramic_roof'], [.868, 1.72, cab ? paint : glass, 'rear_glass']]) patch(y && a > .8 ? hatch : body, name, (u, v) => roofFn(u, lerp(a, b, v)), 32, 28, material, .002);
  for (const s of [-1, 1]) {
    for (const [a, b, parent] of cab ? [[-.91, 1.16, doors[s + 'f']]] : [[-.90, .265, doors[s + 'f']], [.285, 1.16, doors[s + 'r']]]) {
      patch(parent, 'frameless_window', (u, v) => {
        const z = lerp(a, b, u),
          low = belt(z) + .003,
          high = ry(z) - .045;
        return V(s * lerp(width(z) * .965, rx(z), v), lerp(low, high, v), z);
      }, 34, 10, glass, .002);
      const edge = [];
      for (let i = 0; i <= 20; i++) {
        const z = lerp(a, b, i / 20);
        edge.push([s * rx(z), ry(z) - .044, z]);
      }
      tube(parent, 'window_roof_seal', edge, .005, trim, 30);
    }
    patch(body, 'quarter_glass', (u, v) => {
      const z = lerp(1.18, 1.70, u);
      return V(s * lerp(width(z) * .963, rx(z), v), lerp(belt(z), Math.max(belt(z), ry(z) - .045), v), z);
    }, 24, 8, cab ? paint : glass);
    const rail = [];
    for (let i = 0; i <= 60; i++) {
      const z = lerp(-.98, 1.72, i / 60);
      rail.push([s * (rx(z) + .008), ry(z) - .043, z]);
    }
    tube(body, 'roof_rail', rail, .009, paint, 64);
    if (!cab) tube(body, 'b_pillar', [[s * width(.275) * .965, belt(.275), .275], [s * rx(.275), ry(.275) - .044, .275]], .019, trim, 12);
  }
  // Lamps: Highland swept projectors, Juniper wraparound blade, Cybercab smile bar.
  if (y) {
    tube(body, 'front_bar_housing', [[-1.02, .81 + lift, -half + .20], [-.94, .842 + lift, -half - .004], [0, .852 + lift, -half - .018], [.94, .842 + lift, -half - .004], [1.02, .81 + lift, -half + .20]], .016, trim, 84);
    tube(body, 'front_signature', [[-1.00, .81 + lift, -half + .20], [-.92, .844 + lift, -half - .006], [0, .854 + lift, -half - .022], [.92, .844 + lift, -half - .006], [1.00, .81 + lift, -half + .20]], .009, blade, 84);
  } else if (cab) {
    tube(body, 'front_bar_housing', [[-.86, .66, -half + .16], [-.72, .76, -half - .01], [0, .80, -half - .034], [.72, .76, -half - .01], [.86, .66, -half + .16]], .014, trim, 80);
    tube(body, 'front_signature', [[-.84, .66, -half + .16], [-.70, .762, -half - .012], [0, .804, -half - .038], [.70, .762, -half - .012], [.84, .66, -half + .16]], .008, blade, 80);
  }
  for (const s of [-1, 1]) {
    if (!y && !cab) {
      const lampPoint = (x, z) => [s * x, crown(z) + .012, z];
      const pts = [lampPoint(.47, -half + .075), lampPoint(.70, -half + .13), lampPoint(.82, -half + .34), lampPoint(.56, -half + .23)];
      quad(body, 'swept_headlamp_housing', pts, trim);
      tube(body, 'headlamp_drl', pts.slice(0, 3).map(p => [p[0], p[1] + .005, p[2]]), .006, white, 30);
      for (const x of [.61, .70]) sphere(body, 'projector_emitter', [.031, .009, .028], [s * x, crown(-half + .19) + .018, -half + .19], lens);
    } else box(body, 'low_projector', [.20, .046, .038], [s * (y ? .72 : .58), .50 + lift * .12, -half - (y ? .018 : .010)], white, .012, [0, s * .12, 0]);
    if (!y && !cab) {
      tube(hatch, 'c_taillamp', [[s * .78, .86, half - .14], [s * .58, .86, half - .032], [s * .50, .81, half - .018], [s * .56, .746, half - .017]], .012, tail, 36);
    }
  }
  patch(hatch, 'rear_deck', (u, v) => {
    const z = lerp(1.735, half - .035, v),
      x = (u - .5) * 1.37;
    return V(x, crown(z) + .018 * (1 - (x / .685) ** 2), z);
  }, 32, 22, paint, .008);
  patch(body, 'rear_bumper_skin', (u, v) => {
    const x = (u - .5) * 1.43;
    return V(x, lerp(.36 + lift * .3, .681 + lift, v), half - .008 - .032 * (x / .715) ** 2 - .06 * (1 - v) ** 2);
  }, 36, 14, paint);
  patch(hatch, 'rear_fascia', (u, v) => {
    const x = (u - .5) * 1.4;
    return V(x, lerp(.68 + lift, .87 + lift, v), half - .006 - .03 * (x / .7) ** 2);
  }, 32, 8, paint);
  if (y) {
    box(hatch, 'rear_lamp_housing', [1.82, .10, .055], [0, .93 + lift, half - .008], trim, .016);
    tube(hatch, 'rear_signature', [[-.90, .93 + lift, half + .014], [0, .942 + lift, half + .022], [.90, .93 + lift, half + .014]], .014, tail, 80);
    for (const s of [-1, 1]) {
      tube(hatch, 'rear_wrap', [[s * .90, .93 + lift, half + .010], [s * .97, .90 + lift, half - .08], [s * .99, .78 + lift, half - .26], [s * .97, .62 + lift, half - .38]], .009, tail, 32);
      box(hatch, 'side_marker', [.014, .06, .018], [s * .98, .62 + lift, half - .38], tail, .004);
    }
    for (let i = 0; i < 5; i++) box(hatch, 'rear_letter', [.042, .016, .004], [-.30 + i * .15, .942 + lift, half + .028], trim, .002);
  } else if (cab) {
    tube(hatch, 'rear_bar_housing', [[-.68, .70, half - .05], [0, .73, half + .006], [.68, .70, half - .05]], .014, trim, 64);
    tube(hatch, 'rear_signature', [[-.66, .70, half - .05], [0, .732, half + .010], [.66, .70, half - .05]], .009, tail, 64);
  }
  box(body, 'rear_lower_bumper', [y ? 1.68 : 1.57, .18, .07], [0, .31 + lift * .3, half - .05], trim, .045);
  box(hatch, 'license_recess', [.40, .14, .018], [0, .70 + lift, half + .005], trim, .019);
  for (const s of [-1, 1]) box(body, 'rear_reflector', [.15, .017, .02], [s * .65, .38, half - .012], tail, .005);
  box(body, 'cargo_floor', [1.2, .06, .68], [0, .52 + lift, 1.83], carpet, .018);
  const spoiler = group(hatch, 'performance_spoiler');
  tube(spoiler, 'carbon_lip', [[-.72, .946 + lift, half - .12], [0, .967 + lift, half - .115], [.72, .946 + lift, half - .12]], .014, trim, 48);
  spoiler.visible = false;
  // Wipers, front badge, parking cameras and charge inlet.
  for (const s of [-1, 1]) tube(body, 'wiper', [[s * .58, .929 + lift, -.91], [s * .18, .961 + lift, -.90]], .006, trim, 12);
  if (!cab) {
    tube(hood, 'badge_crossbar', [[-.035, .855 + lift, -1.90], [0, .863 + lift, -1.90], [.035, .855 + lift, -1.90]], .0025, metal, 12);
    tube(hood, 'badge_stem', [[0, .862 + lift, -1.90], [0, .846 + lift, -1.96]], .0025, metal, 8);
  }
  if (!cab) {
    const charge = pivot(body, 'charge_port', [-w, .88 + lift, 1.74]);
    box(charge, 'charge_flap', [.018, .135, .19], [0, 0, .06], paint, .025);
    box(body, 'charge_socket', [.012, .10, .12], [-w + .005, .88 + lift, 1.80], trim, .025);
    sphere(body, 'charge_pin', [.006, .027, .026], [-w - .003, .88 + lift, 1.81], metal);
  }
  cabin(body, {
    cab,
    lift,
    width: w * 2
  });
  for (const s of [-1, 1]) {
    wheel(root, s < 0 ? 'wheel_fl' : 'wheel_fr', s * (y ? .818 : .792), frontAxle, r, false, cab);
    wheel(root, s < 0 ? 'wheel_rl' : 'wheel_rr', s * (y ? .818 : .792), rearAxle, r, false, cab);
  }
  for (const p of [hood, hatch, ...Object.values(doors)]) toLocal(p);
  root.userData.dimensions = {
    length,
    width: w * 2,
    height: y ? 1.624 : cab ? 1.38 : 1.44,
    wheelbase: rearAxle - frontAxle,
    precision: cab ? 'concept proportions estimated from photographs' : 'principal dimensions referenced to Tesla owner manuals'
  };
}
function ledRow(parent, name, x0, x1, y, z, material, h = .012, depth = .008) {
  const span = x1 - x0;
  const count = Math.max(4, Math.round(Math.abs(span) / .05));
  const gap = .0035;
  const w = (Math.abs(span) - gap * (count - 1)) / count;
  const dir = Math.sign(span) || 1;
  for (let i = 0; i < count; i++) {
    const x = x0 + dir * ((i + .5) * w + i * gap);
    box(parent, name, [w, h, depth], [x, y, z], material, .0015);
  }
}
function archBottom(z, axles, rocker, radius, centerY) {
  let y = rocker;
  for (const axle of axles) {
    const d = z - axle;
    const rise = radius * radius - (rocker - centerY) * (rocker - centerY);
    if (rise > 0 && d * d <= rise) y = Math.max(y, centerY + Math.sqrt(radius * radius - d * d));
  }
  return y;
}
function cybertruck(root) {
  const body = group(root, 'body'),
    half = 2.84145,
    w = 1.0158,
    front = -1.96315,
    rear = 1.67185,
    r = .45,
    rocker = .38,
    belt = 1.17,
    noseTop = 1.005,
    archR = .545,
    axleY = r;
  const fenderEnd = -1.3,
    frontDoorEnd = -.015,
    rearDoorEnd = 1.04,
    bedStart = 1.065,
    cowlZ = -1.16,
    peakZ = -.16,
    peakY = 1.79,
    sailZ = .88,
    sailY = 1.5,
    tailTop = 1.23;
  const hood = pivot(body, 'hood', [0, belt + .02, cowlZ]),
    tailgate = pivot(body, 'tailgate', [0, .62, half]),
    tonneau = pivot(body, 'tonneau', [0, 1.42, bedStart]);
  const sideTop = z => z < fenderEnd ? lerp(noseTop, belt, clamp((z + half) / (fenderEnd + half), 0, 1)) : belt;
  const lower = z => archBottom(z, [front, rear], rocker, archR, axleY);
  const doors = [];
  const panels = [
    [-half + .008, fenderEnd - .012, body],
    [fenderEnd + .012, frontDoorEnd - .012, null],
    [frontDoorEnd + .012, rearDoorEnd - .012, null],
    [bedStart, half - .012, body]
  ];
  for (const s of [-1, 1]) {
    const df = pivot(body, s < 0 ? 'door_fl' : 'door_fr', [s * w, .8, fenderEnd]),
      dr = pivot(body, s < 0 ? 'door_rl' : 'door_rr', [s * w, .8, frontDoorEnd]);
    doors.push(df, dr);
    const owners = [body, df, dr, body];
    panels.forEach((span, index) => {
      const parent = owners[index];
      const [a, b] = span;
      const steps = Math.max(8, Math.ceil((b - a) * 18));
      patch(parent, 'exoskeleton', (u, v) => {
        const z = lerp(a, b, u);
        return V(s * w, lerp(lower(z), sideTop(z) - .004, v), z);
      }, steps, 6, steel);
      patch(parent, 'exoskeleton_inner', (u, v) => {
        const z = lerp(a, b, u);
        return V(s * (w - .014), lerp(lower(z), sideTop(z) - .004, v), z);
      }, Math.max(6, Math.ceil(steps / 2)), 3, steel);
      patch(parent, 'arch_edge', (u, v) => {
        const z = lerp(a, b, u);
        return V(s * lerp(w, w - .014, v), lower(z), z);
      }, steps, 1, steel);
      patch(parent, 'shoulder_edge', (u, v) => {
        const z = lerp(a, b, u);
        return V(s * lerp(w, w - .014, v), sideTop(z) - .004, z);
      }, steps, 1, steel);
    });
    for (const axle of [front, rear]) {
      const lip = [];
      const limit = Math.sqrt(Math.max(0, archR * archR - (rocker - axleY) ** 2));
      for (let i = 0; i <= 18; i++) {
        const z = axle + lerp(-limit, limit, i / 18);
        lip.push([s * (w + .006), lower(z) + .004, z]);
      }
      tube(body, 'arch_lip', lip, .016, trim, 20);
      const barrel = new T.CylinderGeometry(archR - .02, archR - .02, .16, 28, 1, true, 0, Math.PI);
      barrel.rotateZ(Math.PI / 2);
      barrel.rotateX(Math.PI);
      barrel.translate(s * (w - .07), axleY, axle);
      mesh(body, 'arch_barrel', barrel, seal);
    }
    box(body, 'rocker_cladding', [.04, .1, half * 1.7], [s * (w + .012), rocker + .02, .05], trim, .008);
    const mirror = df;
    quad(mirror, 'mirror_cap', [[s * 1.04, 1.16, -.95], [s * 1.2, 1.22, -.86], [s * 1.2, 1.14, -.74], [s * 1.04, 1.12, -.76]], steel);
    quad(mirror, 'mirror_glass', [[s * 1.07, 1.155, -.748], [s * 1.185, 1.21, -.748], [s * 1.185, 1.145, -.736], [s * 1.07, 1.135, -.736]], metal);
    for (const z of [-1.02, 1.35]) sphere(body, 'side_camera', [.012, .016, .02], [s * (w + .008), 1.12, z], lens);
    patch(df, 'front_glass', (u, v) => {
      const z = lerp(fenderEnd + .04, frontDoorEnd - .03, u);
      const top = lerp(1.28, 1.62, (z - fenderEnd) / (peakZ - fenderEnd));
      return V(s * lerp(w - .03, .8, v * .85), lerp(belt + .02, Math.min(top, 1.7), v), z);
    }, 10, 4, glass);
    patch(dr, 'rear_glass', (u, v) => {
      const z = lerp(frontDoorEnd + .04, rearDoorEnd - .04, u);
      const top = lerp(1.62, sailY - .04, clamp((z - peakZ) / (sailZ - peakZ), 0, 1));
      return V(s * lerp(w - .03, .86, v * .7), lerp(belt + .02, top, v), z);
    }, 10, 4, glass);
    tube(df, 'window_surround', [[s * (w - .02), belt + .015, fenderEnd + .05], [s * .82, 1.55, -.55], [s * (w - .02), belt + .015, frontDoorEnd - .04]], .007, trim, 24);
    box(df, 'door_card', [.045, .42, .9], [s * (w - .05), .78, (fenderEnd + frontDoorEnd) / 2], leather, .016);
    box(dr, 'door_card', [.045, .42, .85], [s * (w - .05), .78, (frontDoorEnd + rearDoorEnd) / 2], leather, .016);
    box(df, 'door_armrest', [.07, .045, .48], [s * (w - .09), .72, -0.62], trim, .012);
    quad(body, 'a_pillar', [[s * w, belt, fenderEnd], [s * .8, peakY - .02, peakZ], [s * .84, peakY - .08, peakZ + .06], [s * w, belt, fenderEnd + .08]], steel);
    quad(body, 'sail', [[s * w, belt, bedStart], [s * .9, sailY, sailZ], [s * w, tailTop, half], [s * w, belt, half]], steel);
  }
  for (const z of [fenderEnd, frontDoorEnd, rearDoorEnd]) {
    for (const s of [-1, 1]) box(body, 'door_seam', [.016, .72, .01], [s * (w - .006), .78, z], seal, .002);
  }
  quad(body, 'front_face', [[-w + .01, rocker + .02, -half + .01], [w - .01, rocker + .02, -half + .01], [w - .01, noseTop - .045, -half + .01], [-w + .01, noseTop - .045, -half + .01]], steel);
  for (const s of [-1, 1]) {
    quad(body, 'front_corner', [[s * (w - .01), rocker + .02, -half + .01], [s * w, rocker + .02, -half + .04], [s * w, noseTop - .02, -half + .04], [s * (w - .01), noseTop - .045, -half + .01]], steel);
  }
  box(body, 'lamp_channel', [1.96, .034, .028], [0, noseTop - .012, -half + .004], seal, .004);
  ledRow(body, 'light_bar', -.9, .9, noseTop - .012, -half - .006, blade, .01, .006);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      box(body, 'matrix_module', [.055, .016, .008], [s * (.42 + i * .07), noseTop - .012, -half - .01], white, .002);
    }
  }
  patch(hood, 'hood_panel', (u, v) => {
    const z = lerp(-half + .02, cowlZ, v);
    const edge = sideTop(Math.min(z, fenderEnd)) + .006;
    const crown = lerp(.01, .04, v);
    const side = Math.abs(u - .5) * 2;
    const x = (u - .5) * 2 * (w - .02);
    return V(x, lerp(edge + crown, edge, side * side), z);
  }, 2, 10, steel);
  patch(body, 'windshield', (u, v) => {
    const z = lerp(cowlZ + .02, peakZ, v);
    const y = lerp(belt + .03, peakY - .012, v);
    const halfX = lerp(w - .06, .76, v);
    return V((u - .5) * 2 * halfX, y, z);
  }, 16, 14, glass);
  patch(body, 'glass_roof', (u, v) => {
    const z = lerp(peakZ, sailZ - .04, v);
    const y = lerp(peakY, sailY + .02, v);
    const halfX = lerp(.76, .86, Math.sin(v * Math.PI));
    return V((u - .5) * 2 * halfX, y - .01 * (Math.abs(u - .5) * 2) ** 2, z);
  }, 12, 10, glass);
  quad(body, 'rear_cab_glass', [[-.84, sailY, sailZ], [.84, sailY, sailZ], [.9, belt + .02, bedStart - .02], [-.9, belt + .02, bedStart - .02]], glass);
  box(body, 'front_bumper', [1.92, .16, .08], [0, rocker + .06, -half + .03], trim, .012);
  box(body, 'front_skid', [1.55, .035, .22], [0, .28, -half + .12], trim, .006);
  tube(body, 'single_wiper', [[-.78, belt + .08, cowlZ + .02], [-.55, 1.55, -.42]], .008, trim, 10);
  box(body, 'frunk_tub', [1.6, .14, .9], [0, .72, -1.95], carpet, .04);
  box(body, 'bed_floor', [1.78, .05, 1.62], [0, .7, 1.95], trim, .006);
  for (let i = 0; i < 12; i++) box(body, 'bed_rib', [.012, .01, 1.55], [-.72 + i * .13, .735, 1.95], dash, .002);
  for (const s of [-1, 1]) {
    box(body, 'bed_wall', [.03, .28, 1.55], [s * .9, .9, 1.95], trim, .006);
  }
  for (let i = 0; i < 22; i++) {
    const z = bedStart + .04 + i * .078;
    const y = lerp(sailY - .04, tailTop - .02, (z - bedStart) / (half - bedStart));
    box(tonneau, 'tonneau_slat', [1.78, .02, .062], [0, y, z], rimMat, .003);
  }
  box(tailgate, 'tailgate_skin', [w * 2 - .02, .58, .03], [0, .93, half - .008], steel, .004);
  box(tailgate, 'tailgate_liner', [1.7, .42, .016], [0, .9, half - .03], trim, .004);
  ledRow(tailgate, 'rear_light_bar', -.86, .86, tailTop - .02, half + .012, tail, .012, .006);
  box(body, 'rear_bumper', [1.96, .14, .08], [0, .46, half - .02], trim, .01);
  box(body, 'license_recess', [.36, .12, .016], [0, .7, half + .02], trim, .008);
  sphere(body, 'rear_camera', [.02, .014, .01], [0, 1.12, half + .01], lens);
  const port = pivot(body, 'charge_port', [-w, 1.02, 2.35]);
  box(port, 'charge_flap', [.016, .12, .15], [0, 0, .04], steel, .006);
  box(body, 'charge_inlet', [.02, .07, .09], [-w + .012, 1.02, 2.4], trim, .006);
  box(body, 'undertray', [1.7, .04, 5.2], [0, .22, .05], trim, .006);
  cabin(body, { truck: true, lift: .2, width: w * 2 });
  for (const s of [-1, 1]) {
    wheel(root, s < 0 ? 'wheel_fl' : 'wheel_fr', s * .9, front, r, true);
    wheel(root, s < 0 ? 'wheel_rl' : 'wheel_rr', s * .9, rear, r, true);
  }
  for (const p of [hood, tailgate, tonneau, ...doors]) toLocal(p);
  root.userData.dimensions = {
    length: 5.6829,
    width: 2.0316,
    height: 1.794,
    wheelbase: 3.635,
    precision: 'principal dimensions referenced to Tesla owner manual; medium ride height'
  };
}
function cybercab(root) {
  const length = 4.12,
    half = length / 2,
    w = .93,
    r = .33,
    frontAxle = -1.2,
    rearAxle = 1.2,
    archR = .4;
  const body = group(root, 'body');
  const doorStart = -.78, doorEnd = .92, glassStart = -.9, glassEnd = 1.02;
  const hood = pivot(body, 'hood', [0, .9, glassStart]);
  const hatch = pivot(body, 'tailgate', [0, .7, 1.15]);
  const doors = {};
  for (const s of [-1, 1]) doors[s] = pivot(body, s < 0 ? 'door_fl' : 'door_fr', [s * .28, 1.22, .05]);
  const stations = [
    [-half, .34, .3, .46, .5],
    [-half + .22, .66, .26, .6, .68],
    [-1.5, .88, .22, .84, .98],
    [-.9, .93, .2, .9, 1.18],
    [-.2, .93, .2, .92, 1.38],
    [.45, .92, .2, .9, 1.4],
    [1.05, .86, .22, .82, 1.12],
    [1.55, .7, .24, .66, .78],
    [half - .12, .48, .28, .5, .56],
    [half, .32, .32, .42, .46]
  ];
  const widthAt = z => spline(stations, z, 1),
    rockerAt = z => spline(stations, z, 2),
    beltAt = z => spline(stations, z, 3),
    crownAt = z => spline(stations, z, 4);
  const lowerY = z => archBottom(z, [frontAxle, rearAxle], rockerAt(z), archR, r);
  const sidePoint = (s, z, v) => {
    const tuck = Math.sin(v * Math.PI) * .012;
    return V(s * (widthAt(z) + tuck), lerp(lowerY(z), beltAt(z), v), z);
  };
  const canopyPoint = (s, z, v) => {
    const k = v * v * (3 - 2 * v);
    return V(s * lerp(widthAt(z) - .012, .24, k), lerp(beltAt(z), crownAt(z), k), z);
  };
  const noseTop = (u, v) => {
    const z = lerp(-half + .02, glassStart, v);
    const edge = beltAt(z);
    const crown = crownAt(z);
    const x = (u - .5) * 2 * (widthAt(z) - .008);
    const side = Math.min(1, Math.abs(x) / Math.max(.2, widthAt(z) - .01));
    const k = side * side * (3 - 2 * side);
    return V(x, lerp(crown, edge, k) + .004, z);
  };
  for (const s of [-1, 1]) {
    patch(body, 'front_fender', (u, v) => sidePoint(s, lerp(-half + .015, doorStart - .012, u), v), 22, 10, paint);
    patch(doors[s], 'door_skin', (u, v) => sidePoint(s, lerp(doorStart + .012, doorEnd - .012, u), v), 28, 10, paint);
    patch(body, 'rear_fender', (u, v) => sidePoint(s, lerp(doorEnd + .012, half - .015, u), v), 20, 10, paint);
    patch(doors[s], 'door_glass', (u, v) => {
      const p = canopyPoint(s, lerp(doorStart + .012, doorEnd - .012, u), v);
      p.y += .005;
      return p;
    }, 24, 10, glass);
    box(body, 'door_shut', [.012, .55, .01], [s * (w - .02), .62, doorStart], seal, .002);
    box(body, 'door_shut_rear', [.012, .5, .01], [s * (w - .02), .6, doorEnd], seal, .002);
    box(doors[s], 'door_card', [.04, .32, 1.2], [s * (w - .08), .58, .05], leather, .016);
    box(doors[s], 'door_armrest', [.06, .04, .55], [s * (w - .12), .64, .02], trim, .012);
    tube(body, 'beltline', [[s * .55, beltAt(-1.5), -1.5], [s * (widthAt(0) + .006), beltAt(0) + .006, 0], [s * .6, beltAt(1.4), 1.4]], .008, trim, 28);
    for (const axle of [frontAxle, rearAxle]) {
      const lip = [];
      const limit = Math.sqrt(Math.max(0, archR * archR - (rockerAt(axle) - r) ** 2));
      for (let i = 0; i <= 16; i++) {
        const z = axle + lerp(-limit, limit, i / 16);
        lip.push([s * (widthAt(z) + .008), lowerY(z), z]);
      }
      tube(body, 'arch_lip', lip, .012, seal, 18);
    }
  }
  patch(hood, 'hood_skin', noseTop, 28, 16, paint);
  patch(body, 'windshield', (u, v) => {
    const z = lerp(glassStart, doorStart + .01, v);
    const span = Math.max(.05, widthAt(z) - .012);
    const x = (u - .5) * 2 * span;
    const ax = Math.min(1, Math.abs(x) / span);
    const k = 1 - ax;
    const smooth = k * k * (3 - 2 * k);
    return V(x, lerp(beltAt(z), crownAt(z), smooth), z);
  }, 18, 10, glass);
  patch(body, 'roof_spine', (u, v) => {
    const z = lerp(-.02, glassEnd - .08, v);
    const x = (u - .5) * .5;
    return V(x, crownAt(z) + .006, z);
  }, 8, 14, glass);
  patch(hatch, 'tail_skin', (u, v) => {
    const z = lerp(1.16, half - .02, v);
    const x = (u - .5) * 2 * (widthAt(z) - .006);
    const side = Math.min(1, Math.abs(x) / Math.max(.15, widthAt(z)));
    return V(x, lerp(crownAt(z), beltAt(z) * .72 + rockerAt(z) * .28, side * .65 + v * .35), z);
  }, 22, 14, paint);
  box(body, 'undertray', [1.5, .04, 3.5], [0, .16, 0], trim, .006);
  box(body, 'front_valence', [1.35, .1, .08], [0, .3, -half + .06], trim, .02);
  box(body, 'rear_valence', [1.15, .08, .07], [0, .3, half - .04], trim, .016);
  box(body, 'lightbar_housing', [1.55, .045, .03], [0, .64, -half + .06], seal, .008);
  ledRow(body, 'cab_lightbar', -.7, .7, .655, -half - .002, blade, .012, .006);
  for (const s of [-1, 1]) {
    box(body, 'corner_lamp', [.16, .028, .012], [s * .62, .6, -half + .02], white, .004);
    box(body, 'corner_lens', [.15, .022, .006], [s * .62, .6, -half + .004], lens, .003);
  }
  ledRow(hatch, 'rear_light_bar', -.55, .55, .62, half + .004, tail, .012, .006);
  sphere(body, 'front_camera', [.012, .01, .014], [0, .78, -half + .02], lens);
  cabin(body, { cab: true, lift: 0, width: 1.7 });
  for (const s of [-1, 1]) {
    wheel(root, s < 0 ? 'wheel_fl' : 'wheel_fr', s * .78, frontAxle, r, false, true);
    wheel(root, s < 0 ? 'wheel_rl' : 'wheel_rr', s * .78, rearAxle, r, false, true);
  }
  for (const p of [hood, hatch, ...Object.values(doors)]) toLocal(p);
  root.userData.dimensions = {
    length,
    width: w * 2,
    height: 1.42,
    wheelbase: rearAxle - frontAxle,
    precision: 'concept proportions estimated from reveal imagery'
  };
}

function optimize(root) {
  // Keep articulated groups and wheel styles; merge their static children by material.
  for (const child of [...root.children]) if (child instanceof T.Group) optimize(child);
  root.updateMatrix();
  const byMaterial = new Map();
  for (const child of [...root.children]) {
    if (!(child instanceof T.Mesh)) continue;
    child.updateMatrix();
    let geo = child.geometry.clone().applyMatrix4(child.matrix);
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    for (const key of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(key)) geo.deleteAttribute(key);
    const list = byMaterial.get(child.material) ?? [];
    list.push(geo);
    byMaterial.set(child.material, list);
    root.remove(child);
    child.geometry.dispose();
  }
  for (const [m, list] of byMaterial) {
    const merged = mergeGeometries(list);
    for (const g of list) g.dispose();
    const indexed = mergeVertices(merged, 1e-5);
    merged.dispose();
    mesh(root, root.name + '__' + m.name, indexed, m);
  }
}
async function exportPreview(root, id) {
  root.updateMatrixWorld(true);
  const data = [];
  root.traverse(o => {
    if (!(o instanceof T.Mesh)) return;
    let visible = true;
    for (let p = o; p; p = p.parent) visible = visible && p.visible;
    if (!visible) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    const p = g.attributes.position,
      n = g.attributes.normal;
    data.push({
      p: Array.from(p.array),
      n: Array.from(n.array),
      color: o.material.color.toArray(),
      metal: o.material.metalness,
      roughness: o.material.roughness,
      emission: o.material.emissiveIntensity > 0 ? o.material.emissive.toArray() : [0, 0, 0]
    });
    g.dispose();
  });
  await fs.writeFile(`${preview}/${id}.json.gz`, gzipSync(JSON.stringify(data)));
}
const report = {
  version: 1,
  author: 'Tesla Studio original assets',
  units: 'metres',
  forward: '-Z',
  up: '+Y',
  vehicles: {}
};
for (const id of ['model-3', 'model-y', 'cybertruck', 'cybercab']) {
  paint.color.set(id === 'cybercab' ? '#b69657' : id === 'model-y' ? '#b4bec6' : '#a7222a');
  const root = new T.Group();
  root.name = id;
  root.userData.assetVersion = 1;
  if (id === 'cybertruck') cybertruck(root);
  else if (id === 'cybercab') cybercab(root);
  else passenger(root, id);
  optimize(root);
  let triangles = 0,
    meshes = 0;
  root.traverse(o => {
    if (o instanceof T.Mesh) {
      meshes++;
      triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
    }
  });
  if (preview) await exportPreview(root, id);
  // Export both wheel variants. Runtime applies visibility immediately after cloning.
  root.traverse(o => {
    if (o.name === 'wheel_sport' || o.name === 'performance_spoiler') o.visible = true;
  });
  const glb = await compressGLB(await new GLTFExporter().parseAsync(root, {
    binary: true,
    onlyVisible: false,
    trs: true
  }));
  await fs.writeFile(`${out}/${id}.glb`, Buffer.from(glb));
  report.vehicles[id] = {
    bytes: glb.byteLength,
    triangles,
    meshes,
    ...root.userData.dimensions,
    rig: ['body', 'hood', 'tailgate', 'door_fl', 'door_fr', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', ...(id === 'cybercab' ? [] : ['door_rl', 'door_rr', 'charge_port']), ...(id === 'cybertruck' ? ['tonneau'] : [])]
  };
  console.log(id, report.vehicles[id]);
  root.traverse(o => {
    if (o instanceof T.Mesh) o.geometry.dispose();
  });
}
await fs.writeFile(`${out}/manifest.json`, JSON.stringify(report, null, 2) + '\n');
