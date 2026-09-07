import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Presentation rig for RBLXSupercars' static Highland mesh. Keeps the artist's
 * surfaces, normals and UVs; the moving-panel partitions are approximate. */
export function prepareHighland(source: THREE.Group) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source);
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 4.72 / (bounds.max.x - bounds.min.x);
  const transform = new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeScale(scale, scale, scale)).multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const scene = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'body';
  scene.add(body);
  const origins: Record<string, [number, number, number]> = {
    hood: [0, .88, -.97],
    tailgate: [0, 1.00, 1.27],
    door_fl: [-.82, .7, -.85],
    door_fr: [.82, .7, -.85],
    door_rl: [-.82, .7, .31],
    door_rr: [.82, .7, .31],
    charge_port: [-.87, .87, 1.75],
    wheel_fl: [-.81, .345, -1.49],
    wheel_fr: [.81, .345, -1.49],
    wheel_rl: [-.81, .345, 1.385],
    wheel_rr: [.81, .345, 1.385]
  };
  const groups: Record<string, THREE.Group> = {
    body
  };
  for (const [name, position] of Object.entries(origins)) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    groups[name] = group;
    (name.startsWith('wheel') ? scene : body).add(group);
  }
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material as THREE.MeshStandardMaterial;
    const name = original.name;
    const geometry = object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(transform, object.matrixWorld));
    const pos = geometry.getAttribute('position'),
      index = geometry.index;
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
      const ids = [0, 1, 2].map(k => index ? index.getX(i + k) : i + k);
      const [x, y, z] = ['X', 'Y', 'Z'].map(axis => ids.reduce((sum, j) => sum + (pos as any)['get' + axis](j), 0) / 3);
      let part = 'body';
      const wheelMaterial = /Tire1|Georimblurlfsub021/.test(name) || /Georimblurlfsub01/.test(name) && y < .65;
      if (wheelMaterial && Math.abs(x) > .70 && Math.min(Math.abs(z + 1.49), Math.abs(z - 1.385)) < .40) {
        part = 'wheel_' + (z < 0 ? 'f' : 'r') + (x < 0 ? 'l' : 'r');
      } else if (!/Tire1|Georimblurlfsub021|^Ln/.test(name)) {
        if (x < -.84 && z > 1.70 && z < 1.94 && y > .79 && y < .98) part = 'charge_port';else if (Math.abs(x) > .65 && z > -.85 && z < 1.18 && y > .31 && y < 1.37) part = 'door_' + (z < .31 ? 'f' : 'r') + (x < 0 ? 'l' : 'r');else if (Math.abs(x) < .70 && z > -2.13 && z < -.97 && y > .70) part = 'hood';else if (Math.abs(x) < .76 && z > 1.27 && y > .79) part = 'tailgate';
      }
      let role = name;
      if (name === 'Geohoodsub00021Mtl') role = 'exterior_paint';
      if (name === 'Georimblurlfsub021Mtl') role = 'wheel_finish';
      if (name === 'Ln7Mtl' && z < -1.75 && y > .45 && y < .95) role = 'headlight_led';
      if (name === 'Geodoorl2intsub651Mtl') role = 'interior_leather';
      // The artist merged upholstery and black trim. Tint only the seat area.
      if (/Georimblurlfsub01/.test(name) && Math.abs(x) < .63 && z > -.55 && z < 1.07 && y > .32 && y < 1.03) role = 'interior_leather';
      const key = part + '|' + role;
      const list = buckets.get(key) ?? [];
      list.push(...ids);
      buckets.set(key, list);
    }
    for (const [key, ids] of buckets) {
      const [part, role] = key.split('|');
      const materialKey = name + '|' + role;
      let material = materials.get(materialKey);
      if (!material) {
        material = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(material, original);
        material.name = role;
        material.side = THREE.DoubleSide;
        if (role === 'exterior_paint') {
          material.metalness = .55;
          material.roughness = .22;
          material.clearcoat = 1;
        }
        if (role === 'wheel_finish') {
          material.metalness = .9;
          material.roughness = .28;
        }
        if (material.transparent) {
          material.roughness = .10;
          material.metalness = .15;
          material.opacity = .7;
          material.depthWrite = false;
        }
        if (/Geocockpithrsub000/.test(name)) material.emissiveIntensity = .6;
        if (role === 'headlight_led') {
          material.emissive.set('#edf5ff');
          material.emissiveIntensity = 2.5;
        }
        materials.set(materialKey, material);
      }
      const selected = geometry.clone();
      selected.setIndex(ids);
      // Compact each partition rather than duplicating the complete source buffer.
      const expanded = selected.toNonIndexed();
      const compact = mergeVertices(expanded, 1e-6);
      selected.dispose();
      expanded.dispose();
      const origin = origins[part];
      if (origin) compact.translate(-origin[0], -origin[1], -origin[2]);
      compact.computeBoundingSphere();
      const mesh = new THREE.Mesh(compact, material);
      mesh.name = object.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      groups[part].add(mesh);
    }
    geometry.dispose();
  });
  const spoiler = new THREE.Group();
  spoiler.name = 'performance_spoiler';
  spoiler.userData.presentationDetail = true;
  const carbon = new THREE.MeshPhysicalMaterial({
    color: '#171b20',
    roughness: .3,
    metalness: .35,
    clearcoat: 1
  });
  materials.set('performance_spoiler', carbon);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.69, .95, 2.16), new THREE.Vector3(0, .977, 2.18), new THREE.Vector3(.69, .95, 2.16)]);
  const lip = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .012, 6, false), carbon);
  lip.userData.presentationDetail = true;
  lip.castShadow = true;
  spoiler.add(lip);
  spoiler.position.copy(groups.tailgate.position).multiplyScalar(-1);
  groups.tailgate.add(spoiler);
  spoiler.visible = false;
  return {
    scene,
    materials,
    ownsGeometry: true
  };
}
