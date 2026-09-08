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
  if (cab) {
    const g = new T.CylinderGeometry(rr * 1.01, rr * 1.01, .038, 72);
    g.rotateZ(Math.PI / 2);
    g.translate(face, 0, 0);
    mesh(standard, 'aero_disc', g, rimMat);
    const lip = new T.TorusGeometry(rr * .98, .007, 8, 64);
    lip.rotateY(Math.PI / 2);
    lip.translate(face + side * .01, 0, 0);
    mesh(standard, 'aero_lip', lip, metal);
    const cap = new T.CylinderGeometry(rr * .22, rr * .22, .01, 32);
    cap.rotateZ(Math.PI / 2);
    cap.translate(face + side * .02, 0, 0);
    mesh(standard, 'aero_cap', cap, paint);
  } else if (truck) {
    const cover = new T.CylinderGeometry(rr * .99, rr * .99, .024, 12);
    cover.rotateZ(Math.PI / 2);
    cover.translate(face - side * .002, 0, 0);
    mesh(standard, 'cyber_cover', cover, trim);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.PI / 6;
      const hole = new T.CylinderGeometry(rr * .155, rr * .155, .04, 6);
      hole.rotateZ(Math.PI / 2);
      hole.translate(face + side * .006, Math.sin(a) * rr * .46, Math.cos(a) * rr * .46);
      mesh(standard, 'cyber_hex_void', hole, seal);
      const spoke = new T.CylinderGeometry(rr * .04, rr * .055, rr * .42, 6);
      spoke.rotateX(Math.PI / 2);
      spoke.rotateY(a);
      spoke.translate(face + side * .01, Math.sin(a) * rr * .22, Math.cos(a) * rr * .22);
      mesh(standard, 'cyber_spoke', spoke, rimMat);
    }
    const hex = new T.CylinderGeometry(.05, .05, .024, 6);
    hex.rotateZ(Math.PI / 2);
    hex.translate(face + side * .014, 0, 0);
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
function cybertruck(root) {
  const body = group(root, 'body'),
    half = 2.84145,
    w = 1.0158,
    front = -1.96315,
    rear = 1.67185,
    r = .45;
  const hood = pivot(body, 'hood', [0, 1.22, -1.20]),
    tailgate = pivot(body, 'tailgate', [0, .76, half]),
    tonneau = pivot(body, 'tonneau', [0, 1.47, 1.01]);
  const roofY = z => z < -.12 ? lerp(1.22, 1.794, (z + 1.2) / 1.08) : lerp(1.794, 1.25, (z + .12) / (half + .12));
  const belt = z => z < -1.2 ? lerp(.96, 1.22, (z + half) / (half - 1.2)) : 1.22;
  const lower = z => {
    let y = .43;
    for (const a of [front, rear]) {
      const d = Math.abs(z - a);
      if (d < .57) y = Math.max(y, d < .36 ? .96 : lerp(.96, .43, (d - .36) / .21));
    }
    return y;
  };
  const doors = [];
  for (const s of [-1, 1]) {
    const df = pivot(body, s < 0 ? 'door_fl' : 'door_fr', [s * w, .8, -1.14]),
      dr = pivot(body, s < 0 ? 'door_rl' : 'door_rr', [s * w, .8, .11]);
    doors.push(df, dr);
    for (const [a, b, parent] of [[-half, -1.14, body], [-1.14, .11, df], [.11, 1.11, dr], [1.11, half, body]]) patch(parent, 'stainless_door_plane', (u, v) => {
      const z = lerp(a + .002, b - .002, u);
      return V(s * w, lerp(lower(z), belt(z), v), z);
    }, Math.ceil((b - a) * 36), 2, steel, .006);
    for (const [a, b, parent] of [[-1.135, .098, df], [.12, 1.103, dr]]) {
      patch(parent, 'side_glass', (u, v) => {
        const z = lerp(a, b, u),
          top = roofY(z) - .025;
        return V(s * lerp(w - .025, .78 + .08 * Math.max(0, z), v), lerp(1.24, top, v), z);
      }, 12, 3, glass, .002);
      tube(parent, 'window_surround', [[s * (w - .022), 1.24, a], [s * (.78 + .08 * Math.max(0, a)), roofY(a) - .024, a], [s * (.78 + .08 * Math.max(0, b)), roofY(b) - .024, b], [s * (w - .022), 1.24, b]], .008, trim, 30);
      box(parent, 'door_card', [.05, .43, b - a - .12], [s * (w - .05), .93, (a + b) / 2], leather, .019);
      box(parent, 'door_armrest', [.08, .06, .57], [s * (w - .11), .88, (a + b) / 2], trim, .014);
    }
    quad(body, 'bed_sail', [[s * w, 1.22, 1.11], [s * (.78 + .08 * 1.11), roofY(1.11), 1.11], [s * w, 1.25, half], [s * w, 1.22, half]], steel);
    quad(body, 'a_pillar_fold', [[s * w, 1.22, -1.2], [s * .78, 1.794, -.12], [s * .80, 1.76, -.08], [s * w, 1.20, -1.14]], steel);
    quad(body, 'roof_to_bed_fold', [[s * .78, 1.794, -.12], [s * w, 1.25, half], [s * (w - .02), 1.22, half], [s * .80, 1.76, -.08]], steel);
    box(body, 'running_board', [.055, .055, 2.05], [s * (w + .018), .40, -.11], trim, .008);
    box(body, 'side_cladding', [.05, .20, 2.08], [s * (w + .014), .50, -.11], trim, .008);
    const mirror = df;
    quad(mirror, 'mirror_cap', [[s * 1.05, 1.21, -.96], [s * 1.205, 1.27, -.87], [s * 1.205, 1.19, -.74], [s * 1.05, 1.17, -.76]], steel);
    quad(mirror, 'mirror_glass', [[s * 1.08, 1.205, -.748], [s * 1.195, 1.263, -.748], [s * 1.195, 1.192, -.735], [s * 1.08, 1.18, -.735]], metal);
    for (const z of [-1.05, 1.3]) sphere(body, 'side_camera', [.012, .018, .023], [s * (w + .005), 1.16, z], lens);
  }
  quad(body, 'front_face', [[-w, .70, -half], [w, .70, -half], [w, .96, -half], [-w, .96, -half]], steel);
  quad(hood, 'hood_panel', [[-w, .964, -half], [w, .964, -half], [w, 1.22, -1.2], [-w, 1.22, -1.2]], steel);
  patch(body, 'windshield', (u, v) => {
    const z = lerp(-1.19, -.125, v);
    return V((u - .5) * 2 * lerp(w - .035, .775, v), roofY(z) + .002, z);
  }, 30, 24, glass);
  quad(body, 'glass_roof', [[-.775, 1.794, -.12], [.775, 1.794, -.12], [.85, roofY(.92), .92], [-.85, roofY(.92), .92]], glass);
  quad(body, 'rear_cab_glass', [[-.85, roofY(.92), .92], [.85, roofY(.92), .92], [.92, 1.21, 1.1], [-.92, 1.21, 1.1]], glass);
  box(body, 'front_crash_trim', [2.08, .32, .13], [0, .50, -half + .02], trim, .01);
  box(body, 'front_skid', [1.82, .05, .20], [0, .32, -half + .08], trim, .008);
  box(body, 'drl_channel', [2.06, .046, .028], [0, .978, -half - .006], seal, .004);
  tube(body, 'continuous_front_drl', [[-1.01, .978, -half - .022], [0, .988, -half - .030], [1.01, .978, -half - .022]], .011, blade, 64);
  for (const s of [-1, 1]) {
    box(body, 'projector_cluster', [.26, .053, .028], [s * .76, .55, -half - .012], trim, .015);
    for (let i = 0; i < 3; i++) box(body, 'headlight_module', [.051, .028, .013], [s * .76 + (i - 1) * .066, .55, -half - .030], white, .007);
  }
  tube(body, 'single_wiper', [[-.84, 1.265, -1.095], [-.675, 1.69, -.28]], .009, trim, 12);
  box(body, 'frunk_tub', [1.73, .16, .98], [0, .77, -2.05], carpet, .055);
  for (const s of [-1, 1]) tube(body, 'frunk_strut', [[s * .73, .86, -1.5], [s * .73, 1.17, -1.23]], .012, metal, 12);
  box(body, 'bed_floor', [1.84, .065, 1.72], [0, .76, 1.96], trim, .008);
  for (let i = 0; i < 15; i++) box(body, 'bed_rib', [.016, .012, 1.67], [-.84 + i * .12, .803, 1.96], dash, .003);
  for (const s of [-1, 1]) {
    box(body, 'bed_sidewall', [.045, .36, 1.75], [s * .928, .98, 1.95], trim, .008);
    for (const z of [1.2, 2.65]) {
      const ring = new T.TorusGeometry(.025, .004, 6, 12);
      ring.rotateY(Math.PI / 2);
      ring.translate(s * .90, .91, z);
      mesh(body, 'tie_down', ring, metal);
    }
    box(body, 'bed_power_outlet', [.022, .09, .11], [s * .898, 1.12, 2.56], dash, .008);
  }
  for (let i = 0; i < 28; i++) {
    const z = 1.035 + i * .063;
    box(tonneau, 'tonneau_slat', [1.82, .025, .059], [0, roofY(z) - .036, z], rimMat, .004, [.181, 0, 0]);
  }
  box(tailgate, 'tailgate_skin', [2.027, .465, .034], [0, 1.005, half - .010], steel, .006);
  box(tailgate, 'tailgate_liner', [1.83, .38, .018], [0, .994, half - .039], trim, .005);
  tube(tailgate, 'rear_signature', [[-.92, 1.24, half + .011], [0, 1.24, half + .013], [.92, 1.24, half + .011]], .01, tail, 40);
  box(body, 'rear_bumper', [2.07, .15, .11], [0, .47, half - .004], trim, .015);
  box(body, 'license_recess', [.40, .15, .02], [0, .59, half + .055], trim, .01);
  sphere(body, 'rear_camera', [.025, .017, .008], [0, 1.16, half + .012], lens);
  const port = pivot(body, 'charge_port', [-w, 1.06, 2.4]);
  box(port, 'charge_flap', [.017, .13, .16], [0, 0, .045], steel, .008);
  box(body, 'charge_inlet', [.025, .085, .1], [-w + .014, 1.06, 2.44], trim, .007);
  cabin(body, {
    truck: true,
    lift: .23,
    width: w * 2
  });
  for (const s of [-1, 1]) {
    wheel(root, s < 0 ? 'wheel_fl' : 'wheel_fr', s * .90, front, r, true);
    wheel(root, s < 0 ? 'wheel_rl' : 'wheel_rr', s * .90, rear, r, true);
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
    w = 0.93,
    r = 0.33,
    frontAxle = -1.2,
    rearAxle = 1.2;
  const body = group(root, 'body');
  const hood = pivot(body, 'hood', [0, 0.78, -0.88]);
  const hatch = pivot(body, 'tailgate', [0, 0.58, 1.18]);
  const doors = {};
  for (const s of [-1, 1])
    doors[s] = pivot(body, s < 0 ? 'door_fl' : 'door_fr', [s * 0.36, 1.2, -0.06]);
  const stations = [
    [-half, 0.36, 0.42, 0.44],
    [-half + 0.22, 0.68, 0.66, 0.7],
    [-1.38, 0.91, 0.82, 0.9],
    [-0.62, 0.93, 0.92, 1.2],
    [0.12, 0.93, 0.95, 1.4],
    [0.88, 0.9, 0.9, 1.18],
    [1.52, 0.7, 0.68, 0.8],
    [half, 0.3, 0.38, 0.4]
  ];
  const width = z => spline(stations, z, 1),
    belt = z => spline(stations, z, 2),
    crown = z => spline(stations, z, 3);
  const lower = z => {
    let v = 0.16 + 0.14 * (Math.abs(z) / half) ** 10;
    for (const axle of [frontAxle, rearAxle]) {
      const d = z - axle,
        rr = r + 0.04;
      if (Math.abs(d) < rr) v = Math.max(v, r + Math.sqrt(rr * rr - d * d));
    }
    return v;
  };
  const side = (s, z, t) => V(s * width(z) * (0.96 + 0.04 * Math.sin(t * Math.PI / 2)), lerp(lower(z), belt(z), t), z);
  const canopy = (s, z, t) => V(s * lerp(0.42, width(z) - 0.02, 1 - t), lerp(belt(z) + 0.02, crown(z), t), z);
  for (const s of [-1, 1]) {
    patch(body, 'cab_nose_side', (u, v) => side(s, lerp(-half + 0.01, -0.92, u), v), 22, 10, paint, 0.008);
    patch(doors[s], 'cab_door_side', (u, v) => side(s, lerp(-0.92, 1.02, u), v), 36, 10, paint, 0.008);
    patch(body, 'cab_tail_side', (u, v) => side(s, lerp(1.02, half - 0.01, u), v), 20, 10, paint, 0.008);
    patch(doors[s], 'cab_canopy', (u, v) => canopy(s, lerp(-0.88, 0.98, u), v), 28, 10, glass, 0.002);
    box(doors[s], 'door_card', [0.045, 0.38, 1.35], [s * (w - 0.08), 0.62, 0.05], leather, 0.02);
    box(doors[s], 'door_armrest', [0.07, 0.045, 0.7], [s * (w - 0.12), 0.66, 0.02], trim, 0.014);
  }
  patch(hood, 'cab_hood', (u, v) => {
    const z = lerp(-half + 0.2, -0.9, v),
      x = (u - 0.5) * 2 * width(z);
    return V(x, crown(z) + 0.03 * Math.sin(v * Math.PI) * (1 - (2 * u - 1) ** 2), z);
  }, 28, 22, paint, 0.008);
  patch(body, 'cab_front_glass', (u, v) => {
    const z = lerp(-0.88, -0.08, v);
    return V((u - 0.5) * 2 * lerp(width(z) - 0.04, 0.46, v), lerp(belt(z) + 0.04, crown(z), v), z);
  }, 20, 14, glass);
  patch(body, 'cab_roof', (u, v) => {
    const z = lerp(-0.08, 0.72, v);
    return V((u - 0.5) * 2 * lerp(0.46, 0.5, v), crown(z) + 0.01, z);
  }, 16, 10, glass);
  patch(hatch, 'cab_tail', (u, v) => {
    const z = lerp(1.05, half - 0.04, v),
      x = (u - 0.5) * 2 * width(z);
    return V(x, lerp(belt(z), crown(z), 0.35 + 0.4 * (1 - v)), z);
  }, 20, 16, paint, 0.008);
  box(body, 'front_valence', [1.52, 0.12, 0.1], [0, 0.28, -half + 0.06], trim, 0.02);
  box(body, 'rear_valence', [1.28, 0.1, 0.1], [0, 0.26, half - 0.05], trim, 0.02);
  tube(body, 'cab_lightbar', [[-0.86, 0.72, -half - 0.012], [0, 0.76, -half - 0.02], [0.86, 0.72, -half - 0.012]], 0.012, blade, 48);
  for (const s of [-1, 1]) {
    box(body, 'cab_projector', [0.16, 0.04, 0.02], [s * 0.58, 0.64, -half - 0.008], white, 0.008);
    tube(body, 'cab_tail_lamp', [[s * 0.12, 0.7, half + 0.008], [s * 0.62, 0.66, half + 0.004]], 0.01, tail, 16);
  }
  cabin(body, { cab: true, lift: 0.02, width: w * 2 });
  for (const s of [-1, 1]) {
    wheel(root, s < 0 ? 'wheel_fl' : 'wheel_fr', s * 0.8, frontAxle, r, false, true);
    wheel(root, s < 0 ? 'wheel_rl' : 'wheel_rr', s * 0.8, rearAxle, r, false, true);
  }
  for (const p of [hood, hatch, ...Object.values(doors)]) toLocal(p);
  root.userData.dimensions = {
    length,
    width: w * 2,
    height: 1.44,
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
