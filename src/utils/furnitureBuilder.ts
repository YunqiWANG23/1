import * as THREE from 'three';
import { SceneObject } from '../types/scene';
import {
  createRugTexture,
  createWallArtTexture,
  createTVScreenTexture,
  createBookSpinesTexture,
  createRoyalBannerTexture,
  createCarvedStoneTexture,
  createStainedGlassTexture,
  createRollupBannerTexture,
  createWhiteboardTexture,
} from './proceduralTextures';

export interface BuiltObjectResult {
  group: THREE.Group;
  collisionBox: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
    maxY: number;
  } | null;
}

// High-craft PBR Material Helpers (Hyrule Castle Sanctum / Royal Audit Hall aesthetic)
function makeWoodMat(color: string | number = '#2B1B12', roughness = 0.42, metalness = 0.08): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function makeGoldMat(color: string | number = '#C9A24B', roughness = 0.25, metalness = 0.88): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function makeIronMat(color: string | number = '#1E2229', roughness = 0.38, metalness = 0.82): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function makeVelvetMat(color: string | number = '#4A1216', roughness = 0.78, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

function makeStoneMat(color: string | number = '#353B45', roughness = 0.68, metalness = 0.12): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
  });
}

// Helper: Create a LatheGeometry Turned Baluster Leg (Eliminates blocky box/cylinder legs!)
function createBalusterLegGeometry(height: number, baseRadius: number): THREE.LatheGeometry {
  const r = baseRadius;
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.9, 0),
    new THREE.Vector2(r * 0.75, height * 0.08),
    new THREE.Vector2(r * 1.15, height * 0.18), // lower bulb
    new THREE.Vector2(r * 0.55, height * 0.35), // narrow neck
    new THREE.Vector2(r * 1.25, height * 0.58), // main carved baluster swell
    new THREE.Vector2(r * 0.65, height * 0.80), // upper neck
    new THREE.Vector2(r * 1.1, height * 0.92),  // capital collar
    new THREE.Vector2(r * 1.0, height),
    new THREE.Vector2(0, height),
  ];
  return new THREE.LatheGeometry(points, 18);
}

// Helper: Create Beveled Rounded Tabletop / Panel using ExtrudeGeometry (No flat BoxGeometry edges!)
function createBeveledSlabGeometry(width: number, depth: number, thickness: number, bevel = 0.018): THREE.ExtrudeGeometry {
  const hw = Math.max(0.1, width / 2 - bevel);
  const hd = Math.max(0.1, depth / 2 - bevel);
  const shape = new THREE.Shape();
  const r = Math.min(0.06, hw * 0.2, hd * 0.2);

  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, thickness - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  return geo;
}

// Helper: Gothic Pointed Arch ExtrudeGeometry
function createGothicArchGeometry(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const hw = width / 2;
  const archStartH = height * 0.62;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, archStartH);
  shape.quadraticCurveTo(hw * 0.85, height * 0.92, 0, height);
  shape.quadraticCurveTo(-hw * 0.85, height * 0.92, -hw, archStartH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015,
  });
  return geo;
}

// 1. Royal Hyrule Sanctum / Victorian Tufted Chesterfield Sofa
export function createSofaMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.6, obj.width || 2.3);
  const h = Math.max(0.85, obj.height || 0.98);
  const d = Math.max(0.82, obj.depth || 0.96);

  const velvetMat = makeVelvetMat(obj.primaryColor || '#4A1216', 0.65);
  const woodMat = makeWoodMat(obj.secondaryColor || '#1F130C', 0.38);
  const goldMat = makeGoldMat('#C9A24B');

  const legH = 0.16;
  const baseH = 0.16;

  // 1. Turned Lathe Baluster Legs with Gold Ferrules
  const legGeo = createBalusterLegGeometry(legH, 0.048);
  const footOffsets = [
    [-w / 2 + 0.12, -d / 2 + 0.12],
    [w / 2 - 0.12, -d / 2 + 0.12],
    [-w / 2 + 0.12, d / 2 - 0.12],
    [w / 2 - 0.12, d / 2 - 0.12],
  ];
  footOffsets.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0, lz);
    leg.castShadow = true;
    group.add(leg);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 10, 20), goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(lx, legH * 0.2, lz);
    group.add(collar);
  });

  // 2. Carved Wood Apron Frame with Gold Filigree Trim
  const apronGeo = createBeveledSlabGeometry(w, d, baseH, 0.02);
  const apron = new THREE.Mesh(apronGeo, woodMat);
  apron.position.y = legH + baseH / 2;
  apron.castShadow = true;
  group.add(apron);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.018, 0.015), goldMat);
  trim.position.set(0, legH + baseH * 0.5, d / 2 + 0.005);
  group.add(trim);

  // 3. Plump Rounded Velvet Seat Cushions
  const armW = 0.22;
  const interiorW = w - armW * 2;
  const numCushions = w > 2.1 ? 3 : 2;
  const cW = interiorW / numCushions - 0.015;
  const cH = 0.16;
  const cD = d - 0.20;

  for (let i = 0; i < numCushions; i++) {
    const cGeo = createBeveledSlabGeometry(cW, cD, cH, 0.035);
    const cushion = new THREE.Mesh(cGeo, velvetMat);
    const cx = -interiorW / 2 + (i + 0.5) * (interiorW / numCushions);
    cushion.position.set(cx, legH + baseH + cH / 2, 0.04);
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);

    // Gold button tufts on seat
    [-cW * 0.22, cW * 0.22].forEach((bx) => {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), goldMat);
      btn.position.set(cx + bx, legH + baseH + cH - 0.004, 0.04);
      group.add(btn);
    });
  }

  // 4. Rolled Scroll Armrests with Carved Wooden Front Rosettes
  const armH = h * 0.66;
  const armPillarGeo = createBeveledSlabGeometry(armW * 0.85, d * 0.92, armH - legH - baseH, 0.03);
  const rollGeo = new THREE.CylinderGeometry(armW * 0.62, armW * 0.62, d * 0.96, 20);
  rollGeo.rotateX(Math.PI / 2);

  [-w / 2 + armW / 2, w / 2 - armW / 2].forEach((ax, idx) => {
    const pillar = new THREE.Mesh(armPillarGeo, velvetMat);
    pillar.position.set(ax, legH + baseH + (armH - legH - baseH) * 0.45, 0);
    pillar.castShadow = true;
    group.add(pillar);

    const roll = new THREE.Mesh(rollGeo, velvetMat);
    roll.position.set(ax + (idx === 0 ? -0.02 : 0.02), armH, 0);
    roll.castShadow = true;
    group.add(roll);

    // Gold rosette medallion on front of scroll arm
    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(armW * 0.42, armW * 0.42, 0.02, 18), goldMat);
    rosette.rotation.x = Math.PI / 2;
    rosette.position.set(ax + (idx === 0 ? -0.02 : 0.02), armH, d * 0.48);
    group.add(rosette);
  });

  // 5. Arched Carved Crest Backrest with Diamond Button Tufting
  const backH = h - legH - baseH + 0.06;
  const backGeo = createGothicArchGeometry(w - armW * 0.8, backH, 0.18);
  const backMesh = new THREE.Mesh(backGeo, velvetMat);
  backMesh.position.set(0, legH + baseH, -d / 2 + 0.04);
  backMesh.castShadow = true;
  group.add(backMesh);

  // Carved wooden crest rail along top arch
  const crest = new THREE.Mesh(new THREE.TorusGeometry((w - armW) * 0.48, 0.035, 12, 32, Math.PI), woodMat);
  crest.position.set(0, legH + baseH + backH * 0.56, -d / 2 + 0.12);
  crest.scale.set(1, backH * 0.85 / ((w - armW) * 0.48), 1);
  group.add(crest);

  // Gold finial at peak of sofa crest
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 1), goldMat);
  finial.position.set(0, h + 0.08, -d / 2 + 0.12);
  group.add(finial);

  return group;
}

// 2. Royal Sanctum Four-Poster Canopy Bed (Hyrule Castle Royal Chamber Style)
export function createBedMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.7, obj.width || 2.0);
  const h = Math.max(1.8, obj.height || 2.25);
  const d = Math.max(2.0, obj.depth || 2.3);

  const woodMat = makeWoodMat(obj.secondaryColor || '#1C120C', 0.38);
  const velvetMat = makeVelvetMat(obj.primaryColor || '#521318', 0.7);
  const sheetMat = makeVelvetMat('#DFD7C8', 0.82);
  const goldMat = makeGoldMat('#C9A24B');

  const frameH = 0.34;
  // 1. Beveled Ornate Base Plinth
  const base = new THREE.Mesh(createBeveledSlabGeometry(w, d, frameH, 0.025), woodMat);
  base.position.y = frameH / 2;
  base.castShadow = true;
  group.add(base);

  // 2. 4 Tall Turned Lathe Canopy Columns + Gold Spires
  const postH = h;
  const postGeo = createBalusterLegGeometry(postH, 0.065);
  const corners = [
    [-w / 2 + 0.08, -d / 2 + 0.08],
    [w / 2 - 0.08, -d / 2 + 0.08],
    [-w / 2 + 0.08, d / 2 - 0.08],
    [w / 2 - 0.08, d / 2 - 0.08],
  ];
  corners.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(px, 0, pz);
    post.castShadow = true;
    group.add(post);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 12), goldMat);
    spire.position.set(px, postH + 0.09, pz);
    group.add(spire);
  });

  // 3. Upper Tester Canopy Cornice Frame
  const canopyFrame = new THREE.Mesh(createBeveledSlabGeometry(w + 0.06, d + 0.06, 0.12, 0.02), woodMat);
  canopyFrame.position.y = postH - 0.06;
  canopyFrame.castShadow = true;
  group.add(canopyFrame);

  // 4. Gothic Arched Carved Headboard with Royal Crest
  const headH = Math.min(1.45, postH * 0.68);
  const headGeo = createGothicArchGeometry(w - 0.16, headH, 0.09);
  const head = new THREE.Mesh(headGeo, woodMat);
  head.position.set(0, frameH, -d / 2 + 0.04);
  head.castShadow = true;
  group.add(head);

  const emblem = new THREE.Mesh(new THREE.TorusKnotGeometry(0.09, 0.018, 48, 8), goldMat);
  emblem.position.set(0, frameH + headH * 0.62, -d / 2 + 0.14);
  group.add(emblem);

  // 5. Rounded Plush Mattress & Royal Velvet Runner
  const matH = 0.28;
  const mattress = new THREE.Mesh(createBeveledSlabGeometry(w - 0.16, d - 0.18, matH, 0.04), sheetMat);
  mattress.position.set(0, frameH + matH / 2, 0.02);
  mattress.castShadow = true;
  group.add(mattress);

  const duvet = new THREE.Mesh(createBeveledSlabGeometry(w - 0.12, (d - 0.18) * 0.68, matH * 0.55, 0.045), velvetMat);
  duvet.position.set(0, frameH + matH * 0.82, (d - 0.18) * 0.15);
  duvet.castShadow = true;
  group.add(duvet);

  // 6. Bolster & Plush Pillows
  const bolsterGeo = new THREE.CylinderGeometry(0.11, 0.11, w - 0.36, 20);
  bolsterGeo.rotateZ(Math.PI / 2);
  const bolster = new THREE.Mesh(bolsterGeo, goldMat);
  bolster.position.set(0, frameH + matH + 0.09, -d / 2 + 0.34);
  group.add(bolster);

  return group;
}

// 3. Ornate Audit Bureau / Royal Scholar's Desk with Candelabra, Open Tome & Brass Telescopic Clues
export function createDeskMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.3, obj.width || 1.65);
  const h = Math.max(0.76, obj.height || 0.80);
  const d = Math.max(0.7, obj.depth || 0.85);

  const woodMat = makeWoodMat(obj.primaryColor || '#261710', 0.36);
  const darkWoodMat = makeWoodMat('#160D08', 0.45);
  const goldMat = makeGoldMat('#C9A24B');
  const leatherMat = makeVelvetMat('#132A1F', 0.65); // Deep emerald/hunter green leather inlay

  const topThick = 0.065;
  // 1. Molded Beveled Desktop with Gold Corner Mounts & Leather Inlay
  const topMesh = new THREE.Mesh(createBeveledSlabGeometry(w, d, topThick, 0.022), woodMat);
  topMesh.position.y = h - topThick / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  const blotter = new THREE.Mesh(createBeveledSlabGeometry(w * 0.62, d * 0.68, 0.012, 0.005), leatherMat);
  blotter.position.set(0, h + 0.003, 0.02);
  group.add(blotter);

  // 2. Twin Pedestal Drawer Cabinets with Recessed Molded Panels & Ornate Brass Drop Pulls
  const pedW = Math.min(0.42, w * 0.28);
  const pedH = h - topThick - 0.12;
  const pedD = d * 0.88;

  [-w / 2 + pedW / 2 + 0.05, w / 2 - pedW / 2 - 0.05].forEach((px) => {
    const ped = new THREE.Mesh(createBeveledSlabGeometry(pedW, pedD, pedH, 0.018), woodMat);
    ped.position.set(px, 0.12 + pedH / 2, 0);
    ped.castShadow = true;
    ped.receiveShadow = true;
    group.add(ped);

    // 3 Carved drawer fronts per pedestal
    for (let i = 0; i < 3; i++) {
      const dy = 0.18 + (i + 0.5) * (pedH / 3.2);
      const dFront = new THREE.Mesh(createBeveledSlabGeometry(pedW * 0.82, 0.025, pedH * 0.24, 0.008), darkWoodMat);
      dFront.position.set(px, dy, pedD / 2 + 0.008);
      group.add(dFront);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI), goldMat);
      handle.rotation.x = Math.PI;
      handle.position.set(px, dy, pedD / 2 + 0.022);
      group.add(handle);
    }

    // Turned bun feet under each pedestal
    const footGeo = createBalusterLegGeometry(0.12, 0.042);
    [-pedW * 0.35, pedW * 0.35].forEach((fx) => {
      [-pedD * 0.35, pedD * 0.35].forEach((fz) => {
        const foot = new THREE.Mesh(footGeo, darkWoodMat);
        foot.position.set(px + fx, 0, fz);
        group.add(foot);
      });
    });
  });

  // 3. Three-Branch Golden Candelabra on Desk
  const candX = w * 0.32;
  const candZ = -d * 0.22;
  const candBase = new THREE.Mesh(createBalusterLegGeometry(0.22, 0.055), goldMat);
  candBase.position.set(candX, h, candZ);
  group.add(candBase);

  [-0.08, 0, 0.08].forEach((offset, idx) => {
    const waxH = idx === 1 ? 0.11 : 0.085;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 0.025, 12), goldMat);
    cup.position.set(candX + offset, h + 0.22, candZ);
    group.add(cup);

    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, waxH, 12), makeVelvetMat('#FFFBEB', 0.5));
    wax.position.set(candX + offset, h + 0.23 + waxH / 2, candZ);
    group.add(wax);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.009, 0.028, 8),
      new THREE.MeshBasicMaterial({ color: '#FBBF24' })
    );
    flame.position.set(candX + offset, h + 0.23 + waxH + 0.015, candZ);
    group.add(flame);
  });

  const candleLight = new THREE.PointLight('#FFA726', 1.5, 4.5);
  candleLight.position.set(candX, h + 0.38, candZ);
  candleLight.userData = { isFlickering: true, baseIntensity: 1.5 };
  group.add(candleLight);

  // 4. Open Ancient Hylian Ledger / Audit Grimoire on Desk
  const bookGroup = new THREE.Group();
  const pageLeft = new THREE.Mesh(createBeveledSlabGeometry(0.18, 0.24, 0.018, 0.004), makeVelvetMat('#EDE4D3', 0.8));
  pageLeft.position.set(-0.09, 0.01, 0);
  pageLeft.rotation.z = 0.08;
  const pageRight = new THREE.Mesh(createBeveledSlabGeometry(0.18, 0.24, 0.018, 0.004), makeVelvetMat('#EDE4D3', 0.8));
  pageRight.position.set(0.09, 0.01, 0);
  pageRight.rotation.z = -0.08;
  bookGroup.add(pageLeft, pageRight);
  bookGroup.position.set(-w * 0.15, h + 0.01, 0.06);
  bookGroup.rotation.y = 0.18;
  group.add(bookGroup);

  return group;
}

// 4. High-Back Carved Council / Throne Chair (Hyrule Sanctum & Grand Audit Chamber Style)
export function createChairMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const isThrone = obj.type === 'throne' || (obj.height || 0) >= 1.25;
  const w = Math.max(0.54, obj.width || (isThrone ? 0.82 : 0.62));
  const h = Math.max(0.95, obj.height || (isThrone ? 1.48 : 1.06));
  const d = Math.max(0.54, obj.depth || (isThrone ? 0.72 : 0.60));

  const woodMat = makeWoodMat(obj.secondaryColor || '#22150E', 0.38);
  const velvetMat = makeVelvetMat(obj.primaryColor || '#5B1217', 0.7);
  const goldMat = makeGoldMat('#C9A24B');

  const seatH = 0.46;
  const seatThick = 0.075;

  // 1. Molded Seat Frame & Plush Velvet Cushion
  const seatFrame = new THREE.Mesh(createBeveledSlabGeometry(w, d, seatThick, 0.018), woodMat);
  seatFrame.position.y = seatH - seatThick / 2;
  seatFrame.castShadow = true;
  group.add(seatFrame);

  const cushion = new THREE.Mesh(createBeveledSlabGeometry(w * 0.88, d * 0.86, 0.055, 0.02), velvetMat);
  cushion.position.y = seatH + 0.015;
  cushion.castShadow = true;
  group.add(cushion);

  // 2. 4 Turned Lathe Baluster Legs + H-Stretcher Rails
  const legGeo = createBalusterLegGeometry(seatH - seatThick / 2, isThrone ? 0.038 : 0.028);
  const legPos = [
    [-w / 2 + 0.055, -d / 2 + 0.055],
    [w / 2 - 0.055, -d / 2 + 0.055],
    [-w / 2 + 0.055, d / 2 - 0.055],
    [w / 2 - 0.055, d / 2 - 0.055],
  ];
  legPos.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Carved H-Stretcher
  const sideRailGeo = new THREE.CylinderGeometry(0.014, 0.014, d - 0.11, 10);
  sideRailGeo.rotateX(Math.PI / 2);
  [-w / 2 + 0.055, w / 2 - 0.055].forEach((lx) => {
    const rail = new THREE.Mesh(sideRailGeo, woodMat);
    rail.position.set(lx, seatH * 0.32, 0);
    group.add(rail);
  });
  const centerRailGeo = new THREE.CylinderGeometry(0.016, 0.016, w - 0.11, 10);
  centerRailGeo.rotateZ(Math.PI / 2);
  const centerRail = new THREE.Mesh(centerRailGeo, woodMat);
  centerRail.position.set(0, seatH * 0.32, 0);
  group.add(centerRail);

  // 3. Tall Gothic Arched Backrest with Fluted Side Stile Columns & Gold Finials
  const backH = h - seatH;
  const stileGeo = createBalusterLegGeometry(backH + 0.06, isThrone ? 0.034 : 0.024);
  [-w / 2 + 0.045, w / 2 - 0.045].forEach((sx) => {
    const stile = new THREE.Mesh(stileGeo, woodMat);
    stile.position.set(sx, seatH, -d / 2 + 0.045);
    stile.castShadow = true;
    group.add(stile);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 10), goldMat);
    finial.position.set(sx, seatH + backH + 0.10, -d / 2 + 0.045);
    group.add(finial);
  });

  // Gothic Arch Back Panel & Velvet Upholstery Pad
  const archBack = new THREE.Mesh(createGothicArchGeometry(w - 0.11, backH, 0.035), woodMat);
  archBack.position.set(0, seatH, -d / 2 + 0.03);
  archBack.castShadow = true;
  group.add(archBack);

  const archPad = new THREE.Mesh(createGothicArchGeometry(w - 0.20, backH * 0.85, 0.025), velvetMat);
  archPad.position.set(0, seatH + 0.05, -d / 2 + 0.05);
  group.add(archPad);

  // Curved Scroll Armrests (for armchairs, council chairs & thrones)
  if (obj.type === 'armchair' || isThrone || w >= 0.58) {
    const armSupportGeo = createBalusterLegGeometry(0.22, 0.022);
    const armBarGeo = createBeveledSlabGeometry(0.065, d * 0.78, 0.035, 0.012);
    [-w / 2 + 0.05, w / 2 - 0.05].forEach((ax) => {
      const sup = new THREE.Mesh(armSupportGeo, woodMat);
      sup.position.set(ax, seatH, d / 2 - 0.12);
      group.add(sup);

      const bar = new THREE.Mesh(armBarGeo, woodMat);
      bar.position.set(ax, seatH + 0.22, -0.04);
      bar.castShadow = true;
      group.add(bar);
    });
  }

  return group;
}

// 5. Grand Audit Hall Conference Table / Royal Banquet Table with Carved Pedestal Pillars & Candelabras
export function createTableMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const isCoffee = obj.type === 'coffee_table';
  const w = Math.max(0.9, obj.width || (isCoffee ? 1.3 : 2.4));
  const h = Math.max(0.45, obj.height || (isCoffee ? 0.50 : 0.78));
  const d = Math.max(0.65, obj.depth || (isCoffee ? 0.75 : 1.15));

  const woodMat = makeWoodMat(obj.primaryColor || '#261810', 0.34);
  const darkWoodMat = makeWoodMat('#170E09', 0.45);
  const goldMat = makeGoldMat('#C9A24B');
  const runnerMat = makeVelvetMat(obj.secondaryColor || '#5B1217', 0.75);

  const topThick = isCoffee ? 0.05 : 0.075;

  // 1. Multi-tiered Beveled Tabletop with Gold Inlay Band
  const topSlab = new THREE.Mesh(createBeveledSlabGeometry(w, d, topThick, 0.025), woodMat);
  topSlab.position.y = h - topThick / 2;
  topSlab.castShadow = true;
  topSlab.receiveShadow = true;
  group.add(topSlab);

  // Recessed Apron Frame with Carved Moulding
  const apronH = isCoffee ? 0.06 : 0.10;
  const apron = new THREE.Mesh(createBeveledSlabGeometry(w - 0.14, d - 0.14, apronH, 0.015), darkWoodMat);
  apron.position.y = h - topThick - apronH / 2;
  apron.castShadow = true;
  group.add(apron);

  // Gold filigree table runner along center of grand audit/banquet tables
  const isLongTable = Math.max(w, d) >= 1.8 && !isCoffee;
  if (isLongTable) {
    const alongZ = d > w;
    const rW = alongZ ? w * 0.34 : w * 0.92;
    const rD = alongZ ? d * 0.92 : d * 0.34;
    const runner = new THREE.Mesh(createBeveledSlabGeometry(rW, rD, 0.012, 0.004), runnerMat);
    runner.position.y = h + 0.004;
    group.add(runner);
  }

  // 2. Sculpted Lathe Baluster Pedestals + Trestle Stretcher Beam
  const legH = h - topThick;
  if (isLongTable) {
    const alongZ = d > w;
    const span = Math.max(w, d);
    const numPeds = Math.max(2, Math.floor(span / 2.2));
    const pedGeo = createBalusterLegGeometry(legH - 0.08, 0.14);

    for (let i = 0; i < numPeds; i++) {
      const pos = -span * 0.36 + (numPeds === 1 ? 0 : (i / (numPeds - 1)) * (span * 0.72));
      const px = alongZ ? 0 : pos;
      const pz = alongZ ? pos : 0;

      const ped = new THREE.Mesh(pedGeo, woodMat);
      ped.position.set(px, 0.08, pz);
      ped.castShadow = true;
      group.add(ped);

      // Cross-foot plinth base under each pedestal
      const footW = alongZ ? Math.min(1.1, w * 0.7) : 0.36;
      const footD = alongZ ? 0.36 : Math.min(1.1, d * 0.7);
      const footBase = new THREE.Mesh(createBeveledSlabGeometry(footW, footD, 0.08, 0.02), darkWoodMat);
      footBase.position.set(px, 0.04, pz);
      footBase.castShadow = true;
      group.add(footBase);

      // Ornate Golden Candelabra or Audit Ledger on each table section
      const cand = new THREE.Mesh(createBalusterLegGeometry(0.24, 0.05), goldMat);
      cand.position.set(px, h, pz);
      group.add(cand);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#FBBF24' })
      );
      flame.position.set(px, h + 0.27, pz);
      group.add(flame);
    }
  } else {
    // 4 Turned Baluster Corner Legs for standard/coffee tables
    const legGeo = createBalusterLegGeometry(legH, isCoffee ? 0.048 : 0.065);
    const offsets = [
      [-w / 2 + 0.11, -d / 2 + 0.11],
      [w / 2 - 0.11, -d / 2 + 0.11],
      [-w / 2 + 0.11, d / 2 - 0.11],
      [w / 2 - 0.11, d / 2 - 0.11],
    ];
    offsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, 0, lz);
      leg.castShadow = true;
      group.add(leg);
    });
  }

  return group;
}

// 6. Hyrule Castle Royal Library Arched Bookshelf with Individual 3D Tomes, Scrolls & Astrolabe
export function createBookshelfMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.0, obj.width || 1.45);
  const h = Math.max(2.0, obj.height || 2.65);
  const d = Math.max(0.38, obj.depth || 0.46);

  const woodMat = makeWoodMat(obj.primaryColor || '#1E130C', 0.42);
  const darkWoodMat = makeWoodMat('#120B07', 0.5);
  const goldMat = makeGoldMat('#C9A24B');
  const bookMat = new THREE.MeshStandardMaterial({
    map: createBookSpinesTexture(),
    roughness: 0.65,
    metalness: 0.15,
  });

  // 1. Recessed Back Wainscot Panel
  const back = new THREE.Mesh(createBeveledSlabGeometry(w - 0.04, 0.04, h - 0.12, 0.01), darkWoodMat);
  back.rotation.x = Math.PI / 2;
  back.position.set(0, h / 2, -d / 2 + 0.025);
  back.castShadow = true;
  group.add(back);

  // 2. Fluted Pilaster Columns on Left & Right Sides
  const pilasterGeo = createBalusterLegGeometry(h, 0.055);
  [-w / 2 + 0.045, w / 2 - 0.045].forEach((px) => {
    const pilaster = new THREE.Mesh(pilasterGeo, woodMat);
    pilaster.position.set(px, 0, d / 2 - 0.04);
    pilaster.castShadow = true;
    group.add(pilaster);

    const sideWall = new THREE.Mesh(createBeveledSlabGeometry(0.045, d, h, 0.01), woodMat);
    sideWall.position.set(px, h / 2, 0);
    sideWall.castShadow = true;
    group.add(sideWall);
  });

  // 3. Stepped Crown Pediment Cornice & Gothic Arch Header
  const cornice1 = new THREE.Mesh(createBeveledSlabGeometry(w + 0.12, d + 0.08, 0.09, 0.02), woodMat);
  cornice1.position.set(0, h + 0.045, 0.02);
  cornice1.castShadow = true;
  group.add(cornice1);

  const corniceGold = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.022, d + 0.05), goldMat);
  corniceGold.position.set(0, h - 0.01, 0.02);
  group.add(corniceGold);

  // 4. Shelves with Multi-Height 3D Book Clusters & Golden Astrolabe Prop
  const numShelves = Math.max(4, Math.floor(h / 0.45));
  const innerW = w - 0.10;
  const innerD = d - 0.06;

  for (let i = 0; i <= numShelves; i++) {
    const sy = 0.08 + (i / numShelves) * (h - 0.18);
    const shelf = new THREE.Mesh(createBeveledSlabGeometry(innerW, innerD, 0.038, 0.008), woodMat);
    shelf.position.set(0, sy, 0.01);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);

    if (i < numShelves) {
      const shelfSpace = (h - 0.18) / numShelves - 0.04;
      // Add 3 varied book row blocks + tilted leaning books + brass globe/astrolabe
      const rowW = innerW * 0.36;
      const books1 = new THREE.Mesh(new THREE.BoxGeometry(rowW, shelfSpace * 0.78, innerD * 0.72), bookMat);
      books1.position.set(-innerW * 0.26, sy + 0.02 + (shelfSpace * 0.78) / 2, 0.02);
      books1.castShadow = true;
      group.add(books1);

      if (i % 2 === 0) {
        // Golden celestial armillary sphere / astrolabe on alternating shelves
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(shelfSpace * 0.26, 0.009, 10, 24), goldMat);
        ring1.position.set(innerW * 0.22, sy + shelfSpace * 0.42, 0.04);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(shelfSpace * 0.22, 0.008, 10, 24), goldMat);
        ring2.rotation.y = Math.PI / 2;
        ring2.position.copy(ring1.position);
        group.add(ring1, ring2);
      } else {
        const books2 = new THREE.Mesh(new THREE.BoxGeometry(rowW * 1.1, shelfSpace * 0.84, innerD * 0.72), bookMat);
        books2.position.set(innerW * 0.20, sy + 0.02 + (shelfSpace * 0.84) / 2, 0.02);
        books2.castShadow = true;
        group.add(books2);
      }
    }
  }

  return group;
}

// 7. Ornate Gothic Cathedral Fluted Stone Pillar / Column
export function createPillarMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.max(0.28, (obj.width || 0.75) / 2);
  const h = Math.max(3.2, obj.height || 7.2);

  const stoneTex = createCarvedStoneTexture(obj.primaryColor || '#323842', 2, 4);
  const stoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.65,
    metalness: 0.12,
  });
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Stepped Octagonal Plinth Base
  const baseH = 0.55;
  const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.45, radius * 1.55, baseH * 0.5, 8), stoneMat);
  plinth1.position.y = baseH * 0.25;
  plinth1.castShadow = true;
  plinth1.receiveShadow = true;
  group.add(plinth1);

  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.42, baseH * 0.5, 16), stoneMat);
  plinth2.position.y = baseH * 0.75;
  plinth2.castShadow = true;
  group.add(plinth2);

  // 2. Clustered Fluted Column Shaft
  const shaftH = h - baseH - 0.55;
  const coreShaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.92, radius * 1.0, shaftH, 24), stoneMat);
  coreShaft.position.y = baseH + shaftH / 2;
  coreShaft.castShadow = true;
  coreShaft.receiveShadow = true;
  group.add(coreShaft);

  // 8 Engaged Gothic Shaftlets around main column
  const shaftletGeo = new THREE.CylinderGeometry(radius * 0.18, radius * 0.20, shaftH, 12);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(shaftletGeo, stoneMat);
    s.position.set(Math.cos(ang) * (radius * 0.88), baseH + shaftH / 2, Math.sin(ang) * (radius * 0.88));
    s.castShadow = true;
    group.add(s);
  }

  // Gold Band Rings at 1/3 and 2/3 height
  [0.33, 0.67].forEach((frac) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.06, 0.032, 12, 28), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = baseH + shaftH * frac;
    group.add(band);
  });

  // 3. Corinthian / Gothic Bell Capital & Abacus Slab
  const capH = 0.55;
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.5, radius * 0.95, capH * 0.65, 16), stoneMat);
  capital.position.y = h - capH * 0.65;
  capital.castShadow = true;
  group.add(capital);

  const abacus = new THREE.Mesh(createBeveledSlabGeometry(radius * 3.1, radius * 3.1, capH * 0.35, 0.025), stoneMat);
  abacus.position.y = h - capH * 0.175;
  group.add(abacus);

  // Wall Torch / Sconce mounted on pillar at 2.4m height
  const sconceY = Math.min(2.6, h * 0.42);
  const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.28, 8), goldMat);
  bracket.rotation.x = Math.PI / 4;
  bracket.position.set(0, sconceY, radius * 1.12);
  group.add(bracket);

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 8), new THREE.MeshBasicMaterial({ color: '#F59E0B' }));
  flame.position.set(0, sconceY + 0.14, radius * 1.24);
  group.add(flame);

  const torchLight = new THREE.PointLight('#FFA726', 1.4, 6.0);
  torchLight.position.set(0, sconceY + 0.18, radius * 1.3);
  torchLight.userData = { isFlickering: true, baseIntensity: 1.4 };
  group.add(torchLight);

  return group;
}

// 8. Grand Multi-Tiered Wrought-Iron & Gold Sanctuary Chandelier
export function createChandelierMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const radius = Math.max(0.65, (obj.width || 1.6) / 2);
  const h = Math.max(1.1, obj.height || 1.6);

  const goldMat = makeGoldMat('#C9A24B');
  const ironMat = makeIronMat('#1B1E24');
  const waxMat = makeVelvetMat('#FFFBEB', 0.4);

  // Central suspension spire & chain
  const spire = new THREE.Mesh(createBalusterLegGeometry(h, 0.08), goldMat);
  spire.position.y = 0;
  group.add(spire);

  // 2 Concentric Ornate Wheel Tiers
  const tiers = [
    { r: radius, y: h * 0.28, candles: 12 },
    { r: radius * 0.58, y: h * 0.58, candles: 6 },
  ];

  tiers.forEach((tier) => {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(tier.r, 0.032, 12, 36), goldMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = tier.y;
    wheel.castShadow = true;
    group.add(wheel);

    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(tier.r * 0.92, 0.018, 10, 36), ironMat);
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.y = tier.y + 0.04;
    group.add(innerRim);

    for (let c = 0; c < tier.candles; c++) {
      const ang = (c / tier.candles) * Math.PI * 2;
      const cx = Math.cos(ang) * tier.r;
      const cz = Math.sin(ang) * tier.r;

      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.025, 12), goldMat);
      dish.position.set(cx, tier.y + 0.03, cz);
      group.add(dish);

      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 10), waxMat);
      candle.position.set(cx, tier.y + 0.11, cz);
      group.add(candle);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.042, 8), new THREE.MeshBasicMaterial({ color: '#FBBF24' }));
      flame.position.set(cx, tier.y + 0.20, cz);
      group.add(flame);
    }
  });

  const mainLight = new THREE.PointLight('#FFA726', 2.4, 16.0);
  mainLight.position.set(0, h * 0.25, 0);
  mainLight.userData = { isFlickering: true, baseIntensity: 2.4 };
  group.add(mainLight);

  return group;
}

// 9. Royal Hyrule Crest Hanging Tapestry / Wall Banner
export function createBannerMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.85, obj.width || 1.25);
  const h = Math.max(1.8, obj.height || 3.2);

  const bannerTex = createRoyalBannerTexture(obj.primaryColor || '#5B1217', obj.secondaryColor || '#C9A24B');
  const clothMat = new THREE.MeshStandardMaterial({
    map: bannerTex,
    roughness: 0.78,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const goldMat = makeGoldMat('#C9A24B');

  // Horizontal Golden Crossbar Rod with Spear Finials
  const rodGeo = new THREE.CylinderGeometry(0.022, 0.022, w + 0.24, 14);
  rodGeo.rotateZ(Math.PI / 2);
  const rod = new THREE.Mesh(rodGeo, goldMat);
  rod.position.set(0, h / 2, 0.03);
  rod.castShadow = true;
  group.add(rod);

  [-w / 2 - 0.14, w / 2 + 0.14].forEach((fx) => {
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.048, 1), goldMat);
    finial.position.set(fx, h / 2, 0.03);
    group.add(finial);
  });

  // Swallowtail / Pointed Royal Tapestry Banner
  const shape = new THREE.Shape();
  const hw = w / 2;
  shape.moveTo(-hw, h / 2);
  shape.lineTo(hw, h / 2);
  shape.lineTo(hw, -h * 0.32);
  shape.lineTo(0, -h / 2);
  shape.lineTo(-hw, -h * 0.32);
  shape.closePath();

  const clothGeo = new THREE.ShapeGeometry(shape);
  // Assign proper UVs for ShapeGeometry
  const pos = clothGeo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) + hw) / w;
    uvs[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  clothGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const cloth = new THREE.Mesh(clothGeo, clothMat);
  cloth.position.z = 0.035;
  cloth.castShadow = true;
  group.add(cloth);

  return group;
}

// 10. Audit Speaker's Lectern / Podium / Altar with Open Decree Scroll
export function createPodiumMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.65, obj.width || 0.85);
  const h = Math.max(1.05, obj.height || 1.22);
  const d = Math.max(0.55, obj.depth || 0.68);

  const woodMat = makeWoodMat(obj.primaryColor || '#26160E', 0.36);
  const goldMat = makeGoldMat('#C9A24B');
  const velvetMat = makeVelvetMat('#5B1217', 0.72);

  // Stepped Octagonal Plinth Base
  const base = new THREE.Mesh(createBeveledSlabGeometry(w, d, 0.16, 0.025), woodMat);
  base.position.y = 0.08;
  base.castShadow = true;
  group.add(base);

  // Carved Baluster Pillar
  const shaft = new THREE.Mesh(createBalusterLegGeometry(h - 0.28, Math.min(w, d) * 0.32), woodMat);
  shaft.position.y = 0.16;
  shaft.castShadow = true;
  group.add(shaft);

  // Slanted Reading Desk Top with Velvet Cloth & Brass Microphones/Candles
  const slantDesk = new THREE.Mesh(createBeveledSlabGeometry(w * 1.05, d * 0.95, 0.06, 0.015), woodMat);
  slantDesk.position.set(0, h - 0.06, 0);
  slantDesk.rotation.x = 0.28;
  slantDesk.castShadow = true;
  group.add(slantDesk);

  // Royal Velvet Front Drape hanging from lectern
  const drape = new THREE.Mesh(createBeveledSlabGeometry(w * 0.55, 0.02, 0.38, 0.006), velvetMat);
  drape.position.set(0, h - 0.24, d * 0.42);
  group.add(drape);

  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 1), goldMat);
  crest.position.set(0, h - 0.22, d * 0.44);
  group.add(crest);

  return group;
}

// 11. Hyrule Sanctum Flaming Standing Brazier / Pedestal Urn
export function createBrazierMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(1.0, obj.height || 1.38);
  const r = Math.max(0.28, (obj.width || 0.65) / 2);

  const ironMat = makeIronMat('#1D2026', 0.35);
  const goldMat = makeGoldMat('#C9A24B');

  // Tripod / Lathe Pedestal Stand
  const stand = new THREE.Mesh(createBalusterLegGeometry(h * 0.78, r * 0.65), ironMat);
  stand.castShadow = true;
  group.add(stand);

  // Flared Fire Bowl with Gold Rim
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.45, h * 0.22, 20), ironMat);
  bowl.position.y = h * 0.84;
  bowl.castShadow = true;
  group.add(bowl);

  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 10, 24), goldMat);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = h * 0.95;
  group.add(goldRim);

  // Glowing Embers & Sculpted Flame Cones
  const emberMat = new THREE.MeshBasicMaterial({ color: '#F59E0B' });
  const coreFlame = new THREE.Mesh(new THREE.ConeGeometry(r * 0.48, 0.34, 10), emberMat);
  coreFlame.position.y = h + 0.08;
  group.add(coreFlame);

  const fireLight = new THREE.PointLight('#FF8C1A', 2.6, 9.5);
  fireLight.position.set(0, h + 0.25, 0);
  fireLight.userData = { isFlickering: true, baseIntensity: 2.6 };
  group.add(fireLight);

  return group;
}

// 12. Royal Knight Armor Stand / Sanctuary Guardian Statue
export function createArmorOrStatueMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(1.6, obj.height || 2.15);
  const w = Math.max(0.65, obj.width || 0.85);

  const stoneMat = makeStoneMat('#353B45', 0.6);
  const steelMat = makeIronMat(obj.primaryColor || '#707885', 0.22, 0.92);
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Carved Stone Pedestal Plinth
  const pedH = 0.48;
  const ped = new THREE.Mesh(createBeveledSlabGeometry(w, w, pedH, 0.03), stoneMat);
  ped.position.y = pedH / 2;
  ped.castShadow = true;
  group.add(ped);

  // 2. Greaves & Cuisses (Legs)
  const legGeo = createBalusterLegGeometry(0.68, 0.075);
  [-0.14, 0.14].forEach((lx) => {
    const leg = new THREE.Mesh(legGeo, steelMat);
    leg.position.set(lx, pedH, 0);
    leg.castShadow = true;
    group.add(leg);
  });

  // 3. Sculpted Breastplate Cuirass & Pauldrons
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.52, 16), steelMat);
  torso.scale.set(1.15, 1, 0.78);
  torso.position.set(0, pedH + 0.92, 0);
  torso.castShadow = true;
  group.add(torso);

  [-0.26, 0.26].forEach((sx) => {
    const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), goldMat);
    pauldron.position.set(sx, pedH + 1.12, 0);
    group.add(pauldron);
  });

  // 4. Visored Knight Helm & Plume
  const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.24, 14), steelMat);
  helm.position.set(0, pedH + 1.32, 0);
  group.add(helm);

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 10), makeVelvetMat('#6E1418'));
  plume.rotation.x = -0.35;
  plume.position.set(0, pedH + 1.50, -0.04);
  group.add(plume);

  // 5. Royal Halberd / Greatsword resting vertically in front
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.35, 0.012), steelMat);
  blade.position.set(0, pedH + 0.68, 0.22);
  group.add(blade);

  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.032, 0.032), goldMat);
  crossguard.position.set(0, pedH + 1.12, 0.22);
  group.add(crossguard);

  return group;
}

// 13. Grand Piano / Organ / Harpsichord (Hyrule Castle Chamber Music Instrument)
export function createPianoMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.35, obj.width || 1.55);
  const h = Math.max(0.95, obj.height || 1.05);
  const d = Math.max(1.5, obj.depth || 1.85);

  const ebonyMat = makeWoodMat(obj.primaryColor || '#121318', 0.18, 0.15); // High-gloss lacquered ebony
  const goldMat = makeGoldMat('#C9A24B');
  const ivoryMat = makeVelvetMat('#F8F5EE', 0.25);

  const legH = 0.68;
  // 3 Turned Baluster Piano Legs
  const legGeo = createBalusterLegGeometry(legH, 0.065);
  [
    [-w / 2 + 0.15, d / 2 - 0.18],
    [w / 2 - 0.15, d / 2 - 0.18],
    [0, -d / 2 + 0.22],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, ebonyMat);
    leg.position.set(lx, 0, lz);
    leg.castShadow = true;
    group.add(leg);
  });

  // Curved Grand Piano Soundboard Body
  const body = new THREE.Mesh(createBeveledSlabGeometry(w, d, 0.28, 0.04), ebonyMat);
  body.position.y = legH + 0.14;
  body.castShadow = true;
  group.add(body);

  // Ivory & Ebony Keyboard Manual
  const keys = new THREE.Mesh(createBeveledSlabGeometry(w * 0.82, 0.18, 0.04, 0.008), ivoryMat);
  keys.position.set(0, legH + 0.14, d / 2 + 0.05);
  group.add(keys);

  // Brass Lyre Pedals
  const lyre = new THREE.Mesh(new THREE.BoxGeometry(0.24, legH * 0.75, 0.04), goldMat);
  lyre.position.set(0, legH * 0.38, d / 2 - 0.28);
  group.add(lyre);

  return group;
}

// 14. Ornate Carved Armoire / Royal Cabinet with Molded Doors & Brass Hardware
export function createWardrobeMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.95, obj.width || 1.38);
  const h = Math.max(1.2, obj.height || 2.25);
  const d = Math.max(0.5, obj.depth || 0.65);

  const woodMat = makeWoodMat(obj.primaryColor || '#22140D', 0.38);
  const darkWoodMat = makeWoodMat('#140B07', 0.48);
  const goldMat = makeGoldMat('#C9A24B');

  const footH = 0.14;
  const footGeo = createBalusterLegGeometry(footH, 0.055);
  [
    [-w / 2 + 0.1, -d / 2 + 0.1],
    [w / 2 - 0.1, -d / 2 + 0.1],
    [-w / 2 + 0.1, d / 2 - 0.1],
    [w / 2 - 0.1, d / 2 - 0.1],
  ].forEach(([fx, fz]) => {
    const f = new THREE.Mesh(footGeo, darkWoodMat);
    f.position.set(fx, 0, fz);
    group.add(f);
  });

  const bodyH = h - footH - 0.12;
  const body = new THREE.Mesh(createBeveledSlabGeometry(w, d, bodyH, 0.025), woodMat);
  body.position.y = footH + bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Twin Gothic Arched Door Panels on Front
  const doorW = (w - 0.16) / 2;
  const doorH = bodyH - 0.18;
  [-doorW / 2 - 0.02, doorW / 2 + 0.02].forEach((dx) => {
    const panel = new THREE.Mesh(createGothicArchGeometry(doorW * 0.88, doorH, 0.028), darkWoodMat);
    panel.position.set(dx, footH + 0.09, d / 2 + 0.005);
    group.add(panel);
  });

  // Ornate Crown Pediment
  const crown = new THREE.Mesh(createBeveledSlabGeometry(w + 0.12, d + 0.08, 0.12, 0.025), woodMat);
  crown.position.y = h - 0.06;
  crown.castShadow = true;
  group.add(crown);

  // Brass Escutcheon & Padlock Latch
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.025), goldMat);
  latch.position.set(0, footH + bodyH * 0.52, d / 2 + 0.032);
  group.add(latch);

  return group;
}

// 15. Audit Hall Presentation Display / Vintage Credenza with Luminous Monitor
export function createTVStandMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.3, obj.width || 1.85);
  const h = Math.max(0.48, obj.height || 0.58);
  const d = Math.max(0.42, obj.depth || 0.52);

  const woodMat = makeWoodMat(obj.primaryColor || '#221610', 0.38);
  const goldMat = makeGoldMat('#C9A24B');

  const legH = 0.14;
  const consoleH = h - legH;

  const body = new THREE.Mesh(createBeveledSlabGeometry(w, d, consoleH, 0.022), woodMat);
  body.position.y = legH + consoleH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const legGeo = createBalusterLegGeometry(legH, 0.042);
  [
    [-w / 2 + 0.12, -d / 2 + 0.1],
    [w / 2 - 0.12, -d / 2 + 0.1],
    [-w / 2 + 0.12, d / 2 - 0.1],
    [w / 2 - 0.12, d / 2 - 0.1],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, goldMat);
    leg.position.set(lx, 0, lz);
    group.add(leg);
  });

  // Ornate Framed Display Screen above Credenza
  const monW = Math.min(w * 0.82, 1.45);
  const monH = monW * (9 / 16);

  const frame = new THREE.Mesh(createBeveledSlabGeometry(monW + 0.08, 0.08, monH + 0.08, 0.018), goldMat);
  frame.position.set(0, h + 0.12 + monH / 2, 0);
  frame.castShadow = true;
  group.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(monW, monH),
    new THREE.MeshBasicMaterial({ map: createTVScreenTexture() })
  );
  screen.position.set(0, h + 0.12 + monH / 2, 0.045);
  group.add(screen);

  const tvGlow = new THREE.PointLight('#38BDF8', 1.6, 5.0);
  tvGlow.position.set(0, h + 0.12 + monH / 2, 0.45);
  group.add(tvGlow);

  return group;
}

// 16. Ornate Turned Brass Floor Candelabra / Sanctuary Lamp
export function createLampMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const isFloor = obj.type === 'floor_lamp' || (obj.height || 0) > 1.0;
  const h = isFloor ? Math.max(1.55, obj.height || 1.78) : Math.max(0.52, obj.height || 0.68);

  const goldMat = makeGoldMat('#C9A24B');
  const shadeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FDE68A'),
    roughness: 0.55,
    emissive: new THREE.Color('#D97706'),
    emissiveIntensity: 0.75,
    side: THREE.DoubleSide,
  });

  // Full Lathe Baluster Column
  const stem = new THREE.Mesh(createBalusterLegGeometry(h * 0.82, isFloor ? 0.16 : 0.09), goldMat);
  stem.castShadow = true;
  group.add(stem);

  // Flared Pleated Empire Shade
  const shadeR1 = isFloor ? 0.18 : 0.10;
  const shadeR2 = isFloor ? 0.30 : 0.17;
  const shadeH = isFloor ? 0.34 : 0.22;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(shadeR1, shadeR2, shadeH, 24, 1, true), shadeMat);
  shade.position.y = h - shadeH / 2;
  shade.castShadow = true;
  group.add(shade);

  const lampLight = new THREE.PointLight('#FFA726', isFloor ? 2.6 : 1.5, isFloor ? 7.5 : 4.0);
  lampLight.position.set(0, h - shadeH / 2, 0);
  lampLight.userData = { isFlickering: true, baseIntensity: isFloor ? 2.6 : 1.5 };
  group.add(lampLight);

  return group;
}

// 17. Sculpted Botanical Urn with Cascading Foliage
export function createPlantMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.75, obj.height || 1.25);

  const urnMat = makeStoneMat('#3B3632', 0.55);
  const goldMat = makeGoldMat('#C9A24B');
  const leafMat = makeVelvetMat('#1E3F2B', 0.62);

  const potH = h * 0.44;
  const potR = Math.max(0.18, (obj.width || 0.55) * 0.38);

  // Classical Medici Urn using LatheGeometry
  const urnGeo = createBalusterLegGeometry(potH, potR);
  const urn = new THREE.Mesh(urnGeo, urnMat);
  urn.castShadow = true;
  group.add(urn);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(potR * 0.95, 0.018, 10, 24), goldMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = potH;
  group.add(rim);

  // Layered Arched Botanical Fronds
  const numFronds = 14;
  for (let i = 0; i < numFronds; i++) {
    const angle = (i / numFronds) * Math.PI * 2;
    const tier = i % 3;
    const frondLen = h * (0.42 + tier * 0.12);
    const frondGeo = new THREE.SphereGeometry(0.09, 10, 8);
    frondGeo.scale(0.65, frondLen / 0.18, 0.18);

    const frond = new THREE.Mesh(frondGeo, leafMat);
    const spread = potR * (0.35 + tier * 0.2);
    frond.position.set(
      Math.cos(angle) * spread,
      potH + frondLen * 0.38,
      Math.sin(angle) * spread
    );
    frond.rotation.y = -angle + Math.PI / 2;
    frond.rotation.x = 0.38 + tier * 0.22;
    frond.castShadow = true;
    group.add(frond);
  }

  return group;
}

// 18. Royal Woven Carpet / Sanctuary Runner with Gold Fringe
export function createRugMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.6, obj.width || 2.8);
  const d = Math.max(2.0, obj.depth || 3.6);

  const rugTexture = createRugTexture(obj.primaryColor || '#4E1418', obj.secondaryColor || '#1B222C');
  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTexture,
    roughness: 0.88,
    metalness: 0.05,
  });

  const rugMesh = new THREE.Mesh(createBeveledSlabGeometry(w, d, 0.018, 0.006), rugMat);
  rugMesh.position.y = 0.009;
  rugMesh.receiveShadow = true;
  group.add(rugMesh);

  return group;
}

// 19. Gilded Museum Frame Portrait / Painting
export function createWallArtMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.85, obj.width || 1.25);
  const h = Math.max(1.05, obj.height || 1.55);

  const goldMat = makeGoldMat('#C9A24B');
  const artMat = new THREE.MeshStandardMaterial({
    map: createWallArtTexture(),
    roughness: 0.72,
    metalness: 0.08,
  });

  // Multi-stepped Ornate Gold Frame
  const outerFrame = new THREE.Mesh(createBeveledSlabGeometry(w, 0.075, h, 0.02), goldMat);
  outerFrame.rotation.x = Math.PI / 2;
  outerFrame.castShadow = true;
  group.add(outerFrame);

  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.16, h - 0.16), artMat);
  art.position.z = 0.042;
  group.add(art);

  return group;
}

// 20. Hyrule Castle Gothic Stained-Glass Cathedral Window with Volumetric Moonlight Shaft
export function createWindowMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.2, obj.width || 1.75);
  const h = Math.max(1.8, obj.height || 2.85);
  const d = 0.14;

  const stoneMat = makeStoneMat('#282E38', 0.65);
  const glassTex = createStainedGlassTexture();
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex,
    roughness: 0.15,
    metalness: 0.1,
    emissive: new THREE.Color('#38BDF8'),
    emissiveIntensity: 0.55,
  });

  // Pointed Gothic Arch Stone Surround (centered vertically so y placement works cleanly)
  const archFrame = new THREE.Mesh(createGothicArchGeometry(w, h, d), stoneMat);
  archFrame.position.set(0, -h / 2, -d / 2);
  group.add(archFrame);

  // Stained Glass Lancet Pane
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, h * 0.78), glassMat);
  glass.position.set(0, -h * 0.06, d / 2 + 0.012);
  group.add(glass);

  // Stone Mullion Tracery Bars
  const mullionV = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, h * 0.82, 8), stoneMat);
  mullionV.position.set(0, -h * 0.05, d / 2 + 0.02);
  group.add(mullionV);

  const roseTracery = new THREE.Mesh(new THREE.TorusGeometry(w * 0.24, 0.022, 8, 20), stoneMat);
  roseTracery.position.set(0, h * 0.20, d / 2 + 0.022);
  group.add(roseTracery);

  // Translucent Volumetric Light Beam Cone streaming from window into the hall
  const beamGeo = new THREE.ConeGeometry(w * 0.85, 5.5, 16, 1, true);
  beamGeo.translate(0, -2.75, 0);
  beamGeo.rotateX(-Math.PI / 3);
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#7DD3FC',
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lightShaft = new THREE.Mesh(beamGeo, beamMat);
  lightShaft.position.set(0, h * 0.15, d / 2 + 0.1);
  group.add(lightShaft);

  return group;
}

// 21. Grand Archway Portal Door with Iron Studs & Golden Ring Knockers
export function createDoorMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.1, obj.width || 1.45);
  const h = Math.max(2.2, obj.height || 2.65);
  const d = 0.14;

  const woodMat = makeWoodMat(obj.primaryColor || '#21140C', 0.45);
  const stoneMat = makeStoneMat('#2F3540', 0.65);
  const goldMat = makeGoldMat('#C9A24B');

  // Stone Arch Surround
  const surround = new THREE.Mesh(createGothicArchGeometry(w + 0.26, h + 0.15, d * 1.2), stoneMat);
  surround.position.set(0, 0, -d * 0.6);
  group.add(surround);

  // Heavy Timber Arch Door Leaf
  const door = new THREE.Mesh(createGothicArchGeometry(w, h, d), woodMat);
  door.position.set(0, 0, -d / 2);
  door.castShadow = true;
  group.add(door);

  // Twin Lion-Head Gold Ring Knockers
  [-0.14, 0.14].forEach((kx) => {
    const knocker = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 10, 20), goldMat);
    knocker.position.set(kx, h * 0.46, d / 2 + 0.025);
    group.add(knocker);
  });

  return group;
}

// 22. Ornate Treasure Chest / Stone Fireplace / Grandfather Clock / Generic Relic
export function createGenericMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const nameLower = (obj.name || '').toLowerCase();

  // Check if it's a Grandfather Clock or Fireplace
  if (obj.type === 'clock' || nameLower.includes('clock')) {
    const w = Math.max(0.55, obj.width || 0.65);
    const h = Math.max(1.9, obj.height || 2.25);
    const d = Math.max(0.38, obj.depth || 0.45);
    const woodMat = makeWoodMat(obj.primaryColor || '#22140C', 0.36);
    const goldMat = makeGoldMat('#C9A24B');

    const body = new THREE.Mesh(createBeveledSlabGeometry(w, d, h, 0.022), woodMat);
    body.position.y = h / 2;
    body.castShadow = true;
    group.add(body);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.36, w * 0.36, 0.03, 24), goldMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, h * 0.78, d / 2 + 0.015);
    group.add(dial);
    return group;
  }

  if (obj.type === 'fireplace' || nameLower.includes('fireplace') || nameLower.includes('hearth')) {
    const w = Math.max(1.5, obj.width || 2.1);
    const h = Math.max(1.4, obj.height || 1.85);
    const d = Math.max(0.55, obj.depth || 0.75);
    const stoneMat = makeStoneMat(obj.primaryColor || '#323842', 0.65);
    const goldMat = makeGoldMat('#C9A24B');

    // Left & Right Pillars + Mantelpiece
    [-w / 2 + 0.24, w / 2 - 0.24].forEach((px) => {
      const col = new THREE.Mesh(createBeveledSlabGeometry(0.45, d, h - 0.2, 0.025), stoneMat);
      col.position.set(px, (h - 0.2) / 2, 0);
      col.castShadow = true;
      group.add(col);
    });
    const mantel = new THREE.Mesh(createBeveledSlabGeometry(w + 0.16, d + 0.12, 0.22, 0.03), stoneMat);
    mantel.position.y = h - 0.11;
    mantel.castShadow = true;
    group.add(mantel);

    const fireLight = new THREE.PointLight('#FF7700', 2.6, 8.0);
    fireLight.position.set(0, 0.45, 0.1);
    fireLight.userData = { isFlickering: true, baseIntensity: 2.6 };
    group.add(fireLight);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.45, 10), new THREE.MeshBasicMaterial({ color: '#F59E0B' }));
    flame.position.set(0, 0.25, 0);
    group.add(flame);
    return group;
  }

  // Default: Hyrule Castle Ornate Domed Treasure Chest (No flat boxes!)
  const w = Math.max(0.65, obj.width || 0.95);
  const h = Math.max(0.50, obj.height || 0.68);
  const d = Math.max(0.50, obj.depth || 0.65);

  const woodMat = makeWoodMat(obj.primaryColor || '#2B1910', 0.42);
  const goldMat = makeGoldMat('#C9A24B');

  const baseH = h * 0.62;
  const base = new THREE.Mesh(createBeveledSlabGeometry(w, d, baseH, 0.02), woodMat);
  base.position.y = baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Arched Barrel Vault Lid
  const lidGeo = new THREE.CylinderGeometry(d / 2, d / 2, w - 0.02, 20, 1, false, 0, Math.PI);
  lidGeo.rotateZ(Math.PI / 2);
  const lid = new THREE.Mesh(lidGeo, woodMat);
  lid.position.y = baseH;
  lid.castShadow = true;
  group.add(lid);

  // Gold Straps & Royal Lock Plate
  [-w * 0.36, 0, w * 0.36].forEach((sx) => {
    const strap = new THREE.Mesh(createBeveledSlabGeometry(0.055, d + 0.03, baseH + 0.04, 0.008), goldMat);
    strap.position.set(sx, baseH / 2, 0);
    group.add(strap);
  });

  const lock = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 1), goldMat);
  lock.position.set(0, baseH, d / 2 + 0.025);
  group.add(lock);

  return group;
}

// 23. Carved Medieval Dark-Oak Cathedral Pew & Scriptorium Bench Row (Parallel-World Counterpart of `lecture_row`)
export function createLectureRowMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.8, obj.width || 4.8);
  const d = Math.max(0.85, obj.depth || 0.92);

  const darkOakMat = makeWoodMat('#1E130C', 0.42, 0.08);
  const carvedOakMat = makeWoodMat('#2C1B11', 0.38, 0.1);
  const wroughtIronMat = makeIronMat('#1B1E24', 0.38, 0.84);
  const goldMat = makeGoldMat('#C9A24B');
  const royalVelvetMat = makeVelvetMat(obj.primaryColor || '#4A1218', 0.72, 0.06);
  const parchmentMat = makeVelvetMat('#E5DAC3', 0.78, 0.02);

  const deskH = 0.74;
  const deskDepth = 0.36;
  const deskFrontZ = -d / 2 + deskDepth / 2;

  // 1. Continuous Carved Dark-Oak Scriptorium Writing Ledge with Beveled Moulding
  const deskTop = new THREE.Mesh(createBeveledSlabGeometry(w, deskDepth, 0.042, 0.012), carvedOakMat);
  deskTop.position.set(0, deskH, deskFrontZ);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  group.add(deskTop);

  // Brass edge fillet along writing ledge
  const brassStrip = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.012, 0.012), goldMat);
  brassStrip.position.set(0, deskH + 0.008, deskFrontZ - deskDepth / 2 + 0.01);
  group.add(brassStrip);

  // 2. Gothic Blind-Tracery Carved Oak Front Modesty Apron
  const modestyH = 0.46;
  const modesty = new THREE.Mesh(createBeveledSlabGeometry(w - 0.06, 0.032, modestyH, 0.008), darkOakMat);
  modesty.position.set(0, deskH - modestyH / 2 - 0.015, -d / 2 + 0.03);
  modesty.castShadow = true;
  modesty.receiveShadow = true;
  group.add(modesty);

  // Gothic pointed arch reliefs along the front oak screen
  const archCount = Math.max(3, Math.floor(w / 0.75));
  const archSpan = (w - 0.2) / archCount;
  for (let a = 0; a < archCount; a++) {
    const ax = -w / 2 + 0.1 + (a + 0.5) * archSpan;
    const traceryArch = new THREE.Mesh(
      createGothicArchGeometry(archSpan * 0.78, modestyH * 0.78, 0.014),
      carvedOakMat
    );
    traceryArch.position.set(ax, deskH - modestyH + 0.04, -d / 2 + 0.012);
    group.add(traceryArch);
  }

  // 3. Turned Baluster Oak & Wrought-Iron Stanchion Supports
  const numStanchions = Math.max(2, Math.round(w / 1.45) + 1);
  const stanchionGeo = createBalusterLegGeometry(deskH - 0.02, 0.038);
  for (let s = 0; s < numStanchions; s++) {
    const sx = -w / 2 + 0.14 + (s / (numStanchions - 1)) * (w - 0.28);
    const leg = new THREE.Mesh(stanchionGeo, darkOakMat);
    leg.position.set(sx, 0, deskFrontZ);
    leg.castShadow = true;
    group.add(leg);

    const ironFoot = new THREE.Mesh(createBeveledSlabGeometry(0.12, 0.28, 0.024, 0.006), wroughtIronMat);
    ironFoot.position.set(sx, 0.012, deskFrontZ);
    group.add(ironFoot);
  }

  // 4. Individual Cathedral Choir / Scriptorium Pew Seats with Velvet Cushions & Gothic Trefoil Standards
  const seatCount = obj.seatCount || Math.max(2, Math.floor(w / 0.58));
  const seatSpacing = (w - 0.16) / seatCount;
  const seatW = Math.min(0.50, seatSpacing * 0.88);
  const seatZ = d / 2 - 0.24;

  // Left & Right Gothic Finial Pew Ends (Bench Standards)
  [-w / 2 + 0.04, w / 2 - 0.04].forEach((endX) => {
    const standard = new THREE.Mesh(createGothicArchGeometry(0.06, 0.88, 0.46), darkOakMat);
    standard.rotation.y = Math.PI / 2;
    standard.position.set(endX, 0, seatZ + 0.22);
    standard.castShadow = true;
    group.add(standard);

    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 1), goldMat);
    finial.position.set(endX, 0.92, seatZ - 0.01);
    group.add(finial);
  });

  for (let i = 0; i < seatCount; i++) {
    const cx = -w / 2 + 0.08 + (i + 0.5) * seatSpacing;

    // Turned oak pedestal leg under seat
    const ped = new THREE.Mesh(createBalusterLegGeometry(0.42, 0.032), darkOakMat);
    ped.position.set(cx, 0, seatZ + 0.06);
    ped.castShadow = true;
    group.add(ped);

    // Carved Oak Seat Plank + Tufted Royal Velvet Seat Cushion
    const seatPlank = new THREE.Mesh(createBeveledSlabGeometry(seatW + 0.02, 0.42, 0.035, 0.008), darkOakMat);
    seatPlank.position.set(cx, 0.41, seatZ - 0.02);
    group.add(seatPlank);

    const seatPad = new THREE.Mesh(createBeveledSlabGeometry(seatW * 0.94, 0.39, 0.065, 0.02), royalVelvetMat);
    seatPad.position.set(cx, 0.45, seatZ - 0.02);
    seatPad.castShadow = true;
    seatPad.receiveShadow = true;
    group.add(seatPad);

    // Gothic Pointed-Arch Carved Backrest with Velvet Insert
    const backRestOak = new THREE.Mesh(createGothicArchGeometry(seatW, 0.48, 0.04), carvedOakMat);
    backRestOak.position.set(cx, 0.44, seatZ + 0.16);
    backRestOak.rotation.x = -0.08;
    backRestOak.castShadow = true;
    group.add(backRestOak);

    const backRestVelvet = new THREE.Mesh(createGothicArchGeometry(seatW * 0.78, 0.38, 0.025), royalVelvetMat);
    backRestVelvet.position.set(cx, 0.47, seatZ + 0.145);
    backRestVelvet.rotation.x = -0.08;
    group.add(backRestVelvet);

    // Wrought-iron scroll dividers between seats
    const arm = new THREE.Mesh(createBeveledSlabGeometry(0.042, 0.34, 0.032, 0.008), wroughtIronMat);
    arm.position.set(cx - seatSpacing / 2, 0.58, seatZ + 0.02);
    group.add(arm);

    // Open Illuminated Grimoires / Ancient Parchment Scrolls & Brass Candlesticks on selected scriptorium desks
    if ((i + Math.round(Math.abs(obj.z))) % 3 === 0) {
      const tomeCover = new THREE.Mesh(createBeveledSlabGeometry(0.30, 0.21, 0.016, 0.004), royalVelvetMat);
      tomeCover.position.set(cx, deskH + 0.022, deskFrontZ + 0.02);
      tomeCover.rotation.y = ((i % 3) - 1) * 0.12;
      group.add(tomeCover);

      const pageLeft = new THREE.Mesh(createBeveledSlabGeometry(0.135, 0.19, 0.014, 0.003), parchmentMat);
      pageLeft.position.set(cx - 0.068, deskH + 0.032, deskFrontZ + 0.02);
      pageLeft.rotation.z = 0.06;
      const pageRight = new THREE.Mesh(createBeveledSlabGeometry(0.135, 0.19, 0.014, 0.003), parchmentMat);
      pageRight.position.set(cx + 0.068, deskH + 0.032, deskFrontZ + 0.02);
      pageRight.rotation.z = -0.06;
      group.add(pageLeft, pageRight);
    }
  }

  return group;
}

// 24. Ancient Carved Dark-Oak & Stone Ritual Altar / Lectern (`stainless_av_console` Counterpart, Top Surface Y = 1.25m)
export function createAVConsoleMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.4, obj.width || 2.15);
  const h = Math.max(0.85, obj.height || 1.25);
  const d = Math.max(0.8, obj.depth || 0.95);

  const stoneMat = makeStoneMat('#282D38', 0.65, 0.12);
  const darkOakMat = makeWoodMat('#1D120B', 0.38, 0.08);
  const carvedOakMat = makeWoodMat('#2B1A10', 0.35, 0.1);
  const goldMat = makeGoldMat('#C9A24B');
  const wroughtIronMat = makeIronMat('#161920', 0.35, 0.85);
  const velvetDrapeMat = makeVelvetMat('#5B1217', 0.72, 0.05);

  // 1. Stepped Chiseled Gothic Stone Altar Plinth Base
  const plinth = new THREE.Mesh(createBeveledSlabGeometry(w + 0.06, d + 0.06, 0.14, 0.03), stoneMat);
  plinth.position.y = 0.07;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Heavy Carved Dark-Oak & Stone Sanctum Altar Body with Gothic Pointed Arch Niches
  const bodyH = h - 0.20;
  const body = new THREE.Mesh(createBeveledSlabGeometry(w, d, bodyH, 0.045), darkOakMat);
  body.position.y = 0.14 + bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Engaged Fluted Corner Colonnettes & Gothic Arch Panels on Front/Back
  const numArches = 4;
  const archW = (w - 0.24) / numArches;
  for (let a = 0; a < numArches; a++) {
    const ax = -w / 2 + 0.12 + (a + 0.5) * archW;
    [-d / 2 - 0.008, d / 2 + 0.008].forEach((az, sideIdx) => {
      const archPanel = new THREE.Mesh(
        createGothicArchGeometry(archW * 0.82, bodyH * 0.78, 0.022),
        carvedOakMat
      );
      archPanel.position.set(ax, 0.18, sideIdx === 0 ? az - 0.01 : az - 0.01);
      group.add(archPanel);
    });
  }

  // Crimson & Gold Embroidered Altar Frontal Banner (Antependium)
  const frontalDrape = new THREE.Mesh(createBeveledSlabGeometry(w * 0.42, 0.03, bodyH * 0.82, 0.008), velvetDrapeMat);
  frontalDrape.position.set(0, 0.14 + bodyH * 0.52, -d / 2 - 0.018);
  group.add(frontalDrape);

  const altarCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 1), goldMat);
  altarCrest.position.set(0, 0.14 + bodyH * 0.56, -d / 2 - 0.035);
  group.add(altarCrest);

  // 3. Carved Obsidian-Slate Mensa (Altar Countertop Slab at exact height `h = 1.25m` so all podium props rest flush!)
  const topSlab = new THREE.Mesh(createBeveledSlabGeometry(w + 0.08, d + 0.08, 0.06, 0.02), stoneMat);
  topSlab.position.y = h - 0.03;
  topSlab.castShadow = true;
  topSlab.receiveShadow = true;
  group.add(topSlab);

  const goldMensaRim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.09, 0.016, d + 0.09), goldMat);
  goldMensaRim.position.y = h - 0.055;
  group.add(goldMensaRim);

  // 4. Engraved Brass Astrolabe & Runic Lectern Wedge on Left-Center of Altar
  const wedge = new THREE.Mesh(createBeveledSlabGeometry(0.44, 0.18, 0.11, 0.012), carvedOakMat);
  wedge.position.set(-0.18, h + 0.045, 0.12);
  wedge.rotation.x = 0.35;
  group.add(wedge);

  const astrolabeDial = new THREE.Mesh(new THREE.RingGeometry(0.035, 0.068, 24), goldMat);
  astrolabeDial.rotation.x = -Math.PI / 2 + 0.35;
  astrolabeDial.position.set(-0.18, h + 0.105, 0.13);
  group.add(astrolabeDial);

  // 5. Twin Ornate Wrought-Iron & Gold Framed Obsidian Scrying Mirrors (Parallel-World Counterpart of Dual Monitors)
  [-0.28, 0.28].forEach((mx, idx) => {
    const armPost = new THREE.Mesh(createBalusterLegGeometry(0.38, 0.032), wroughtIronMat);
    armPost.position.set(mx, h, -d * 0.25);
    group.add(armPost);

    const monW = 0.56;
    const monH = 0.36;
    const mirrorFrame = new THREE.Mesh(createBeveledSlabGeometry(monW, 0.038, monH, 0.012), goldMat);
    mirrorFrame.position.set(mx, h + 0.38, -d * 0.15);
    mirrorFrame.rotation.y = idx === 0 ? 0.22 : -0.22;
    mirrorFrame.rotation.x = -0.12;
    mirrorFrame.castShadow = true;
    group.add(mirrorFrame);

    const scryingSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(monW - 0.05, monH - 0.05),
      new THREE.MeshBasicMaterial({ map: createTVScreenTexture() })
    );
    scryingSurface.position.set(0, 0, 0.021);
    mirrorFrame.add(scryingSurface);

    // Gothic crest finial atop each scrying mirror frame
    const crownSpire = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.08, 8), goldMat);
    crownSpire.position.set(0, monH / 2 + 0.04, 0);
    mirrorFrame.add(crownSpire);
  });

  // 6. Lower Base Alchemical Bronze Cauldron on Altar Left Corner (supports `haribo_tub_top` at x = 0.24, y = 1.36, z = -6.82)
  const lowerCauldronMat = makeIronMat('#2A241E', 0.35, 0.78);
  const lowerRimMat = makeGoldMat('#B45309', 0.3, 0.85);
  const lowerCauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.088, 0.098, 20), lowerCauldronMat);
  lowerCauldron.position.set(-0.71, h + 0.049, 0.08);
  lowerCauldron.castShadow = true;
  group.add(lowerCauldron);

  const lowerRim = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.014, 20), lowerRimMat);
  lowerRim.position.set(-0.71, h + 0.103, 0.08);
  group.add(lowerRim);

  // 7. Flickering Ritual Altar Candles on Far Corners + Warm PointLight
  [-w / 2 + 0.12, w / 2 - 0.12].forEach((cx) => {
    const holder = new THREE.Mesh(createBalusterLegGeometry(0.14, 0.032), goldMat);
    holder.position.set(cx, h, -d * 0.34);
    group.add(holder);

    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.017, 0.11, 12),
      makeVelvetMat('#FFFBEB', 0.45)
    );
    wax.position.set(cx, h + 0.195, -d * 0.34);
    group.add(wax);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.012, 0.036, 8),
      new THREE.MeshBasicMaterial({ color: '#F59E0B' })
    );
    flame.position.set(cx, h + 0.268, -d * 0.34);
    group.add(flame);
  });

  const altarLight = new THREE.PointLight('#F59E0B', 1.8, 5.5);
  altarLight.position.set(0, h + 0.45, 0);
  altarLight.userData = { isFlickering: true, baseIntensity: 1.8 };
  group.add(altarLight);

  return group;
}

// 25. Enormous Haunted Medieval Royal Tapestry / Spectral Mural (Parallel-World Counterpart of `projection_screen`)
export function createProjectionScreenMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(2.2, obj.width || 3.9);
  const h = Math.max(1.5, obj.height || 2.35);

  const wroughtIronMat = makeIronMat('#1B1E24', 0.35, 0.85);
  const goldMat = makeGoldMat('#C9A24B');
  const darkWoodMat = makeWoodMat('#1E130C', 0.45);
  const tapestryTex = createRoyalBannerTexture(obj.primaryColor || '#4E1217', obj.secondaryColor || '#C9A24B');
  const tapestryMat = new THREE.MeshStandardMaterial({
    map: tapestryTex,
    roughness: 0.76,
    metalness: 0.08,
    emissive: new THREE.Color('#2A090D'),
    emissiveIntensity: 0.25,
    side: THREE.DoubleSide,
  });

  // Heavy Wrought-Iron & Gold Spear Crossbar Beam at Top
  const spearRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, w + 0.36, 16), wroughtIronMat);
  spearRod.rotation.z = Math.PI / 2;
  spearRod.position.set(0, h / 2 + 0.06, 0.08);
  spearRod.castShadow = true;
  group.add(spearRod);

  // Ornate Golden Halberd Finials at Ends of Rod
  [-w / 2 - 0.20, w / 2 + 0.20].forEach((fx) => {
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 1), goldMat);
    finial.position.set(fx, h / 2 + 0.06, 0.08);
    group.add(finial);
  });

  // Hanging Rings along Top Bar
  const ringCount = 7;
  for (let r = 0; r < ringCount; r++) {
    const rx = -w * 0.45 + (r / (ringCount - 1)) * (w * 0.9);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.009, 8, 16), goldMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(rx, h / 2 + 0.04, 0.08);
    group.add(ring);
  }

  // Carved Dark-Oak Backing Frame
  const borderMesh = new THREE.Mesh(createBeveledSlabGeometry(w + 0.10, 0.035, h + 0.10, 0.012), darkWoodMat);
  borderMesh.position.set(0, 0, 0.045);
  borderMesh.castShadow = true;
  group.add(borderMesh);

  // Woven Royal Haunted Tapestry Canvas
  const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.024), tapestryMat);
  canvasMesh.position.set(0, 0, 0.068);
  canvasMesh.receiveShadow = true;
  group.add(canvasMesh);

  // Gold Tassel Fringe Bar at Bottom
  const bottomRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, w + 0.12, 12), goldMat);
  bottomRoller.rotation.z = Math.PI / 2;
  bottomRoller.position.set(0, -h / 2 - 0.02, 0.075);
  group.add(bottomRoller);

  return group;
}

// 26. Cursed Runic Inscription Stone Monolith Tablet on Carved Pillars (`sliding_whiteboard_system` Counterpart)
export function createWhiteboardMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(2.4, obj.width || 4.2);
  const stanchionH = Math.max(2.6, obj.height || 3.0);
  const boardH = 1.38;
  const boardCenterY = 1.44;

  const stoneMat = makeStoneMat('#282D38', 0.65, 0.12);
  const darkOakMat = makeWoodMat('#1D120B', 0.42);
  const goldMat = makeGoldMat('#C9A24B');
  const runicTabletMat = new THREE.MeshStandardMaterial({
    map: createWhiteboardTexture(),
    roughness: 0.42,
    metalness: 0.12,
    emissive: new THREE.Color('#450A0A'),
    emissiveIntensity: 0.22,
  });

  // Twin Carved Stone & Iron Buttress Stanchion Columns resting on floor (y = 0 to stanchionH)
  [-w / 2 - 0.08, w / 2 + 0.08].forEach((px) => {
    const stanchion = new THREE.Mesh(createBeveledSlabGeometry(0.18, 0.16, stanchionH, 0.02), stoneMat);
    stanchion.position.set(px, stanchionH / 2, 0.065);
    stanchion.castShadow = true;
    group.add(stanchion);

    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 8), goldMat);
    spire.position.set(px, stanchionH + 0.12, 0.065);
    group.add(spire);
  });

  // Heavy Carved Dark-Oak & Brass Frame around the Runic Stone Tablet
  const frame = new THREE.Mesh(createBeveledSlabGeometry(w + 0.12, 0.06, boardH + 0.12, 0.016), darkOakMat);
  frame.position.set(0, boardCenterY, 0.045);
  frame.castShadow = true;
  group.add(frame);

  const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, boardH), runicTabletMat);
  surface.position.set(0, boardCenterY, 0.08);
  group.add(surface);

  // Carved Stone Relic Ledge at bottom of monolith
  const ledge = new THREE.Mesh(createBeveledSlabGeometry(w + 0.08, 0.11, 0.045, 0.01), stoneMat);
  ledge.position.set(0, boardCenterY - boardH / 2 - 0.03, 0.09);
  group.add(ledge);

  return group;
}

// 27. Tattered Medieval Heraldic War Standard on Wrought-Iron Pike (`halloween_rollup_banner` Counterpart)
export function createRollupBannerMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.75, obj.width || 0.88);
  const h = Math.max(1.85, obj.height || 2.08);

  const wroughtIronMat = makeIronMat('#1B1E24', 0.35, 0.85);
  const goldMat = makeGoldMat('#C9A24B');
  const stoneBaseMat = makeStoneMat('#262B34', 0.68);
  const bannerMat = new THREE.MeshStandardMaterial({
    map: createRollupBannerTexture(),
    roughness: 0.68,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  // Carved Stone & Wrought-Iron Pedestal Base
  const plinth = new THREE.Mesh(createBeveledSlabGeometry(w * 0.72, 0.32, 0.09, 0.02), stoneBaseMat);
  plinth.position.y = 0.045;
  plinth.castShadow = true;
  group.add(plinth);

  // Wrought-iron cross stabilizer feet with gold studs
  [-w * 0.28, w * 0.28].forEach((fx) => {
    const foot = new THREE.Mesh(createBeveledSlabGeometry(0.06, 0.42, 0.025, 0.006), wroughtIronMat);
    foot.position.set(fx, 0.012, 0);
    group.add(foot);
  });

  // Tall Wrought-Iron Pike Pole & Spearhead Finial
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, h + 0.14, 12), wroughtIronMat);
  pole.position.set(0, (h + 0.14) / 2, -0.04);
  pole.castShadow = true;
  group.add(pole);

  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8), goldMat);
  spearTip.position.set(0, h + 0.18, -0.04);
  group.add(spearTip);

  // Top & Bottom Golden Crossbars
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, w + 0.14, 12), goldMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, h, 0);
  group.add(topBar);

  const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 0.10, 12), goldMat);
  botBar.rotation.z = Math.PI / 2;
  botBar.position.set(0, 0.12, 0);
  group.add(botBar);

  // Vertical Heraldic War Tapestry Cloth
  const graphic = new THREE.Mesh(new THREE.PlaneGeometry(w, h - 0.12), bannerMat);
  graphic.position.set(0, (h - 0.12) / 2 + 0.12, 0.008);
  graphic.castShadow = true;
  group.add(graphic);

  return group;
}

// 28. Medieval Apothecary Elixir Crates & Iron-Bound Reliquary Chests
export function createBeverageCratesMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.7, obj.width || 1.05);
  const d = Math.max(0.55, obj.depth || 0.75);

  const darkOakMat = makeWoodMat('#1E130B', 0.45);
  const ironMat = makeIronMat('#1B1E24', 0.35, 0.85);
  const potionGlassMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    roughness: 0.15,
    metalness: 0.1,
    emissive: new THREE.Color('#0284C7'),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.86,
  });

  // 2 Stacked Iron-Bound Relic Coffers
  for (let layer = 0; layer < 2; layer++) {
    const coffer = new THREE.Mesh(createBeveledSlabGeometry(0.42, 0.28, 0.13, 0.015), darkOakMat);
    coffer.position.set(-w * 0.22, 0.065 + layer * 0.135, d * 0.18);
    coffer.rotation.y = 0.25;
    coffer.castShadow = true;
    group.add(coffer);
  }

  // 4 Wooden Apothecary Crates filled with Glowing Glass Elixir Phials
  const packPositions = [
    [0.16, 0.12, 0.12],
    [0.16, 0.12, -0.18],
    [-0.12, 0.12, -0.16],
    [0.08, 0.36, -0.04],
  ];
  packPositions.forEach(([px, py, pz]) => {
    const crate = new THREE.Mesh(createBeveledSlabGeometry(0.34, 0.24, 0.11, 0.012), darkOakMat);
    crate.position.set(px, py, pz);
    crate.castShadow = true;
    group.add(crate);

    const ironBand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.25), ironMat);
    ironBand.position.set(px, py + 0.03, pz);
    group.add(ironBand);

    for (let bx = -0.11; bx <= 0.11; bx += 0.11) {
      for (let bz = -0.06; bz <= 0.06; bz += 0.12) {
        const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.21, 10), potionGlassMat);
        vial.position.set(px + bx, py + 0.03, pz + bz);
        group.add(vial);
      }
    }
  });

  return group;
}

// 29. Heavy Iron-Bound Medieval Fortress Double Doors with Runic Seal Lock & Escape Portal (`front_right_exit_doors`, `rear_left_exit_doors`, `rear_right_exit_doors`)
export function createDoubleDoorMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(1.4, obj.width || 1.85);
  const h = Math.max(2.0, obj.height || 2.30);
  const d = 0.14;

  const stoneArchMat = makeStoneMat('#2A2F3A', 0.65, 0.12);
  const heavyOakDoorMat = makeWoodMat('#1D120B', 0.45, 0.08);
  const wroughtIronMat = makeIronMat('#181B22', 0.35, 0.85);
  const goldMat = makeGoldMat('#C9A24B');
  const stainedSlitMat = new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    roughness: 0.2,
    metalness: 0.2,
    emissive: new THREE.Color('#1E40AF'),
    emissiveIntensity: 0.35,
  });

  // Carved Gothic Stone Archway Jambs & Moulded Surround
  const leftJamb = new THREE.Mesh(createBeveledSlabGeometry(0.14, d + 0.10, h + 0.12, 0.02), stoneArchMat);
  leftJamb.position.set(-w / 2 - 0.04, h / 2, 0);
  leftJamb.castShadow = true;
  group.add(leftJamb);

  const rightJamb = new THREE.Mesh(createBeveledSlabGeometry(0.14, d + 0.10, h + 0.12, 0.02), stoneArchMat);
  rightJamb.position.set(w / 2 + 0.04, h / 2, 0);
  rightJamb.castShadow = true;
  group.add(rightJamb);

  const headerLintel = new THREE.Mesh(createBeveledSlabGeometry(w + 0.26, d + 0.12, 0.16, 0.025), stoneArchMat);
  headerLintel.position.set(0, h + 0.06, 0);
  headerLintel.castShadow = true;
  group.add(headerLintel);

  // Dark Fortress Corridor Recess & Illuminated Escape Portal behind the doors (revealed when doors swing open)
  const recessMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.04, h - 0.02),
    new THREE.MeshBasicMaterial({ color: '#050811' })
  );
  recessMesh.position.set(0, h / 2, -0.06);
  group.add(recessMesh);

  const escapePortalMat = new THREE.MeshBasicMaterial({
    color: '#34D399',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
  });
  const escapePortalMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 0.08, h - 0.06),
    escapePortalMat
  );
  escapePortalMesh.position.set(0, h / 2, -0.048);
  group.add(escapePortalMesh);

  const leafW = (w - 0.08) / 2;

  // Helper to populate iron straps, studs, lancet grille & ring knocker on each door leaf
  const decorateMedievalLeaf = (pivot: THREE.Group, dir: 1 | -1) => {
    const cx = (dir * leafW) / 2;
    const leaf = new THREE.Mesh(createBeveledSlabGeometry(leafW, d, h, 0.015), heavyOakDoorMat);
    leaf.position.set(cx, h / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);

    // Narrow barred Gothic lancet vision window
    const lancet = new THREE.Mesh(new THREE.BoxGeometry(0.14, h * 0.45, d + 0.012), stainedSlitMat);
    lancet.position.set(dir * leafW * 0.58, h * 0.62, 0);
    pivot.add(lancet);

    const ironGrille = new THREE.Mesh(new THREE.BoxGeometry(0.02, h * 0.46, d + 0.02), wroughtIronMat);
    ironGrille.position.set(dir * leafW * 0.58, h * 0.62, 0);
    pivot.add(ironGrille);

    // 3 Heavy Wrought-Iron Hinge Straps across the timber door leaf
    [0.18, 0.50, 0.82].forEach((frac) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.92, 0.055, d + 0.018), wroughtIronMat);
      strap.position.set(cx, h * frac, 0);
      pivot.add(strap);

      // Iron rivet studs along strap
      [-leafW * 0.3, 0, leafW * 0.3].forEach((sx) => {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), wroughtIronMat);
        stud.position.set(cx + sx, h * frac, d / 2 + 0.012);
        pivot.add(stud);
      });
    });

    // Heavy Golden Lion-Head Ring Knocker
    const knockerMount = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 14), goldMat);
    knockerMount.rotation.x = Math.PI / 2;
    knockerMount.position.set(dir * leafW * 0.72, h * 0.44, d / 2 + 0.015);
    pivot.add(knockerMount);

    const knockerRing = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 10, 20), goldMat);
    knockerRing.position.set(dir * leafW * 0.72, h * 0.41, d / 2 + 0.024);
    pivot.add(knockerRing);
  };

  // Left Hinged Door Leaf Pivot (hinged at outer left edge x = -w/2 + 0.04)
  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-w / 2 + 0.04, 0, 0);
  decorateMedievalLeaf(leftDoorPivot, 1);
  group.add(leftDoorPivot);

  // Right Hinged Door Leaf Pivot (hinged at outer right edge x = +w/2 - 0.04)
  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(w / 2 - 0.04, 0, 0);
  decorateMedievalLeaf(rightDoorPivot, -1);
  group.add(rightDoorPivot);

  // Wall-Mounted Arcane Runic Lock Pedestal / Seal Mechanism beside the Exit Door
  const keypadBody = new THREE.Mesh(createBeveledSlabGeometry(0.18, 0.06, 0.28, 0.012), wroughtIronMat);
  keypadBody.position.set(-w / 2 - 0.16, 1.26, 0.055);
  group.add(keypadBody);

  const keypadFrame = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 8, 20), goldMat);
  keypadFrame.position.set(-w / 2 - 0.16, 1.30, 0.088);
  group.add(keypadFrame);

  const keypadLedMat = new THREE.MeshBasicMaterial({ color: '#EF4444' });
  const keypadLed = new THREE.Mesh(new THREE.OctahedronGeometry(0.036, 1), keypadLedMat);
  keypadLed.position.set(-w / 2 - 0.16, 1.30, 0.09);
  group.add(keypadLed);

  // Glowing Runic Exit Keystone Crest above Doorway
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 1), goldMat);
  keystone.position.set(0, h + 0.20, 0.065);
  group.add(keystone);

  const exitRuneGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.12, 20),
    new THREE.MeshBasicMaterial({ color: '#10B981', side: THREE.DoubleSide })
  );
  exitRuneGlow.position.set(0, h + 0.20, 0.075);
  group.add(exitRuneGlow);

  group.userData.isExitDoor = true;
  group.userData.leftDoorPivot = leftDoorPivot;
  group.userData.rightDoorPivot = rightDoorPivot;
  group.userData.escapePortalMat = escapePortalMat;
  group.userData.keypadLedMat = keypadLedMat;

  return group;
}

// ============================================================================
// MEDIEVAL GOTHIC HAUNTED PARALLEL-WORLD ESCAPE-ROOM & INVENTORY 3D PROPS
// (Every puzzle target & inventory item transformed into a richly detailed
//  dark-fantasy relic while preserving its exact ID, position & color cues)
// ============================================================================

// 30. Blood-Stained Crimson Quill & Brass Inkwell (`red_whiteboard_marker`, Puzzle P1 Target)
export function createMarkerPenMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const len = Math.max(0.15, obj.width || 0.16);

  const boneShaftMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.3,
    metalness: 0.05,
  });
  const quillColorHex = obj.primaryColor || '#DC2626';
  const crimsonVaneMat = new THREE.MeshStandardMaterial({
    color: quillColorHex,
    roughness: 0.35,
    metalness: 0.08,
    emissive: new THREE.Color(quillColorHex),
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide,
  });
  const goldMat = makeGoldMat('#C9A24B');

  // Ornate Hexagonal Brass Inkwell Pot beside the Quill
  const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.028, 8), goldMat);
  inkwell.position.set(-len * 0.35, 0.014, -0.016);
  inkwell.castShadow = true;
  group.add(inkwell);

  const bloodInkPool = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 14),
    new THREE.MeshBasicMaterial({ color: quillColorHex })
  );
  bloodInkPool.rotation.x = -Math.PI / 2;
  bloodInkPool.position.set(-len * 0.35, 0.029, -0.016);
  group.add(bloodInkPool);

  // Pale Bone-White Quill Calamus (Shaft) resting at a slight angle on the altar
  const shaftLen = len * 0.95;
  const shaftGeo = new THREE.CylinderGeometry(0.0035, 0.008, shaftLen, 12);
  shaftGeo.rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeo, boneShaftMat);
  shaft.position.set(0, 0.012, 0.004);
  shaft.castShadow = true;
  group.add(shaft);

  // Sculpted Scarlet-Red Feather Vane (Plume) along the upper half of the quill
  const vaneGeo = new THREE.SphereGeometry(0.022, 14, 10);
  vaneGeo.scale(2.8, 0.18, 0.72);
  const vane = new THREE.Mesh(vaneGeo, crimsonVaneMat);
  vane.position.set(len * 0.16, 0.016, 0.004);
  vane.castShadow = true;
  group.add(vane);

  // Blood-Crimson Nib Tip & Gold Ferrule Collar
  const ferruleGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.018, 12);
  ferruleGeo.rotateZ(Math.PI / 2);
  const ferrule = new THREE.Mesh(ferruleGeo, goldMat);
  ferrule.position.set(-len * 0.32, 0.012, 0.004);
  group.add(ferrule);

  const nibGeo = new THREE.ConeGeometry(0.008, 0.024, 8);
  nibGeo.rotateZ(Math.PI / 2);
  const nib = new THREE.Mesh(nibGeo, crimsonVaneMat);
  nib.position.set(-len * 0.46, 0.012, 0.004);
  group.add(nib);

  return group;
}

// 31. Cursed Alchemist's Cauldron of Sapphire & Emerald (`haribo_tub_top`, Puzzle P2 Target)
export function createHariboTubMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const rTop = Math.max(0.105, (obj.width || 0.22) * 0.48);
  const h = Math.max(0.115, obj.height || 0.12);

  const sapphireVesselMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#0284C7',
    roughness: 0.25,
    metalness: 0.55,
  });
  const emeraldBrewMat = new THREE.MeshStandardMaterial({
    color: obj.secondaryColor || '#16A34A',
    roughness: 0.18,
    metalness: 0.15,
    emissive: new THREE.Color('#15803D'),
    emissiveIntensity: 0.45,
  });
  const goldRunicBandMat = makeGoldMat('#EAB308');
  const crimsonSealMat = new THREE.MeshStandardMaterial({
    color: '#DC2626',
    roughness: 0.3,
    emissive: new THREE.Color('#7F1D1D'),
    emissiveIntensity: 0.25,
  });

  // Bellied Sapphire-Glazed Alchemical Cauldron Body
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rTop * 0.84, h * 0.86, 24), sapphireVesselMat);
  belly.position.y = (h * 0.86) / 2;
  belly.castShadow = true;
  belly.receiveShadow = true;
  group.add(belly);

  // Golden Runic Girdle Band & Crimson Wax Seal Emblem around Cauldron Belly
  const girdle = new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.95, 0.008, 10, 24), goldRunicBandMat);
  girdle.rotation.x = Math.PI / 2;
  girdle.position.y = h * 0.46;
  group.add(girdle);

  const sealMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 16), crimsonSealMat);
  sealMedallion.rotation.x = Math.PI / 2;
  sealMedallion.position.set(0, h * 0.46, rTop * 0.94);
  group.add(sealMedallion);

  // Twin Wrought-Gold Cauldron Ring Handles
  [-rTop * 1.02, rTop * 1.02].forEach((hx) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0045, 8, 16), goldRunicBandMat);
    handle.rotation.y = Math.PI / 2;
    handle.position.set(hx, h * 0.65, 0);
    group.add(handle);
  });

  // Flared Emerald-Green Cauldron Rim & Bubbling Gelatinous Brew Surface
  const cauldronLip = new THREE.Mesh(new THREE.TorusGeometry(rTop * 1.02, 0.009, 10, 24), emeraldBrewMat);
  cauldronLip.rotation.x = Math.PI / 2;
  cauldronLip.position.y = h * 0.90;
  group.add(cauldronLip);

  const brewDisk = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 0.98, rTop * 0.98, h * 0.12, 24), emeraldBrewMat);
  brewDisk.position.y = h * 0.90;
  group.add(brewDisk);

  // Bubbling Alchemical Globules on Top of Brew
  [
    [-0.035, 0.02, 0.016],
    [0.03, -0.025, 0.014],
    [0.01, 0.038, 0.012],
    [-0.02, -0.03, 0.015],
  ].forEach(([bx, bz, br], idx) => {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(br, 10, 10),
      idx % 2 === 0 ? emeraldBrewMat : crimsonSealMat
    );
    bubble.position.set(bx, h * 0.97, bz);
    group.add(bubble);
  });

  return group;
}

// 32. Tower of Engraved Bone-White Ritual Moon Discs (`paper_plates_stack`, Puzzle P3 Target)
export function createPaperPlatesMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.11, (obj.width || 0.24) * 0.48);
  const h = Math.max(0.075, obj.height || 0.085);

  const moonStoneMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.38,
    metalness: 0.08,
    emissive: new THREE.Color('#E2E8F0'),
    emissiveIntensity: 0.12,
  });
  const silverRimMat = new THREE.MeshStandardMaterial({
    color: '#CBD5E1',
    roughness: 0.32,
    metalness: 0.45,
  });

  // Core stacked moon-disc cylinder
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.92, h, 24), moonStoneMat);
  core.position.y = h / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  // 10 distinct tiered ceremonial moon disc rims up the stack
  const numDiscs = 10;
  for (let i = 0; i < numDiscs; i++) {
    const py = (i + 0.5) * (h / numDiscs);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.97, 0.0045, 8, 24),
      i % 2 === 0 ? moonStoneMat : silverRimMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = py;
    group.add(rim);
  }

  // Top ceremonial moon disc with engraved lunar crescent & sigil ring
  const topLip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.88, 0.011, 10, 24), moonStoneMat);
  topLip.rotation.x = Math.PI / 2;
  topLip.position.y = h;
  group.add(topLip);

  const innerSigil = new THREE.Mesh(new THREE.RingGeometry(r * 0.42, r * 0.52, 20), silverRimMat);
  innerSigil.rotation.x = -Math.PI / 2;
  innerSigil.position.y = h + 0.002;
  group.add(innerSigil);

  return group;
}

// 33. Row of Nesting Obsidian & Emerald Ritual Chalices (`plastic_cups_sleeve`)
export function createCupsSleeveMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const len = Math.max(0.24, obj.width || 0.28);
  const r = Math.max(0.038, (obj.height || 0.08) * 0.48);

  const emeraldEnamelMat = new THREE.MeshStandardMaterial({
    color: '#15803D',
    roughness: 0.28,
    metalness: 0.45,
  });
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: '#18181B',
    roughness: 0.25,
    metalness: 0.65,
  });
  const goldRimMat = makeGoldMat('#C9A24B');

  const numChalices = 12;
  for (let i = 0; i < numChalices; i++) {
    const cx = -len * 0.42 + (i / (numChalices - 1)) * (len * 0.84);
    const cupGeo = new THREE.CylinderGeometry(r, r * 0.80, 0.065, 16);
    cupGeo.rotateZ(Math.PI / 2);
    const cup = new THREE.Mesh(cupGeo, i % 2 === 0 ? emeraldEnamelMat : obsidianMat);
    cup.position.set(cx, r, 0);
    cup.castShadow = true;
    group.add(cup);

    const lipGeo = new THREE.TorusGeometry(r, 0.0035, 8, 16);
    lipGeo.rotateY(Math.PI / 2);
    const lip = new THREE.Mesh(lipGeo, goldRimMat);
    lip.position.set(cx - 0.03, r, 0);
    group.add(lip);
  }

  return group;
}

// 34. Stoppered Crystal Alchemical Decanter (`glass_swing_top_bottle`)
export function createGlassBottleMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.24, obj.height || 0.28);
  const r = Math.max(0.04, (obj.width || 0.095) * 0.45);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: '#E0F2FE',
    roughness: 0.12,
    metalness: 0.18,
    transparent: true,
    opacity: 0.84,
  });
  const brassBailMat = makeGoldMat('#C9A24B');
  const crimsonWaxMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.35 });
  const porcelainStopperMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 });

  const bodyH = h * 0.58;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, bodyH, 16), crystalMat);
  body.position.y = bodyH / 2;
  body.castShadow = true;
  group.add(body);

  const neckH = h * 0.34;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.34, r, neckH, 16), crystalMat);
  neck.position.y = bodyH + neckH / 2;
  group.add(neck);

  // Crimson wax seal & white porcelain swing-top stopper
  const waxSeal = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.40, r * 0.40, 0.014, 14), crimsonWaxMat);
  waxSeal.position.y = bodyH + neckH + 0.006;
  group.add(waxSeal);

  const stopper = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.36, r * 0.28, 0.024, 14), porcelainStopperMat);
  stopper.position.y = bodyH + neckH + 0.022;
  group.add(stopper);

  const bail = new THREE.Mesh(new THREE.TorusGeometry(r * 0.48, 0.004, 8, 16), brassBailMat);
  bail.position.set(0, bodyH + neckH * 0.85, 0);
  group.add(bail);

  return group;
}

// 35. Stemmed Jewelled Ceremonial Mead Goblet (`pret_coffee_cup`)
export function createCoffeeCupMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.14, obj.height || 0.155);
  const rTop = Math.max(0.046, (obj.width || 0.095) * 0.48);

  const goldMat = makeGoldMat('#C9A24B', 0.24, 0.9);
  const burgundyEnamelMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#7F1D1D',
    roughness: 0.32,
    metalness: 0.45,
  });
  const rubyGemMat = new THREE.MeshStandardMaterial({
    color: '#E11D48',
    roughness: 0.15,
    metalness: 0.2,
    emissive: new THREE.Color('#881337'),
    emissiveIntensity: 0.35,
  });
  const spicedMeadMat = new THREE.MeshStandardMaterial({
    color: '#451A03',
    roughness: 0.18,
    metalness: 0.1,
  });

  // 1. Flared Gilded Chalice Foot
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop * 0.28, rTop * 0.78, h * 0.16, 20),
    goldMat
  );
  foot.position.y = h * 0.08;
  foot.castShadow = true;
  group.add(foot);

  // 2. Slender Baluster Stem & Jewelled Knop Node
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop * 0.18, rTop * 0.22, h * 0.34, 16),
    goldMat
  );
  stem.position.y = h * 0.30;
  group.add(stem);

  const knop = new THREE.Mesh(new THREE.TorusGeometry(rTop * 0.26, 0.008, 10, 18), rubyGemMat);
  knop.rotation.x = Math.PI / 2;
  knop.position.y = h * 0.30;
  group.add(knop);

  // 3. Flared Burgundy-Enamel & Gold Goblet Bowl
  const bowlH = h * 0.48;
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rTop * 0.32, bowlH, 22),
    burgundyEnamelMat
  );
  bowl.position.y = h * 0.46 + bowlH / 2;
  bowl.castShadow = true;
  group.add(bowl);

  // 4. Ornate Filigree Gold Rim & Ruby Cabochons
  const goldLip = new THREE.Mesh(new THREE.TorusGeometry(rTop, 0.0055, 10, 22), goldMat);
  goldLip.rotation.x = Math.PI / 2;
  goldLip.position.y = h * 0.94;
  group.add(goldLip);

  const midFiligree = new THREE.Mesh(
    new THREE.TorusGeometry(rTop * 0.72, 0.0045, 8, 20),
    goldMat
  );
  midFiligree.rotation.x = Math.PI / 2;
  midFiligree.position.y = h * 0.72;
  group.add(midFiligree);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.007, 0), rubyGemMat);
    gem.position.set(
      Math.cos(ang) * (rTop * 0.74),
      h * 0.72,
      Math.sin(ang) * (rTop * 0.74)
    );
    group.add(gem);
  }

  // 5. Dark Spiced Mead Liquid Surface inside Chalice
  const liquid = new THREE.Mesh(new THREE.CircleGeometry(rTop * 0.9, 18), spicedMeadMat);
  liquid.rotation.x = -Math.PI / 2;
  liquid.position.y = h * 0.91;
  group.add(liquid);

  return group;
}

// 36. Bulbous Ancient Sapphire Alchemical Potion Flask with Cork & Wax Seal (`small_water_bottle_podium`)
export function createSmallWaterBottleMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.19, obj.height || 0.21);
  const r = Math.max(0.044, (obj.width || 0.09) * 0.48);

  const potionGlassMat = new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.78,
  });
  const glowingElixirMat = new THREE.MeshStandardMaterial({
    color: '#0284C7',
    roughness: 0.2,
    metalness: 0.1,
    emissive: new THREE.Color('#0369A1'),
    emissiveIntensity: 0.42,
  });
  const goldMat = makeGoldMat('#C9A24B');
  const corkMat = new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.78 });
  const sapphireWaxMat = new THREE.MeshStandardMaterial({
    color: '#1D4ED8',
    roughness: 0.32,
  });

  // 1. Gilded Foot Ring
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(r * 0.65, 0.006, 10, 20), goldMat);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.006;
  group.add(baseRing);

  // 2. Bulbous Alchemical Glass Belly + Glowing Sapphire Potion Core
  const bellyY = r * 0.92;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), potionGlassMat);
  belly.scale.set(1.0, 0.92, 1.0);
  belly.position.y = bellyY;
  belly.castShadow = true;
  group.add(belly);

  const elixirCore = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.82, 16, 12),
    glowingElixirMat
  );
  elixirCore.scale.set(1.0, 0.78, 1.0);
  elixirCore.position.y = bellyY - r * 0.08;
  group.add(elixirCore);

  // 3. Brass Alchemical Astrolabe Band around the Flask Belly
  const equatorialBand = new THREE.Mesh(
    new THREE.TorusGeometry(r * 1.01, 0.0045, 8, 24),
    goldMat
  );
  equatorialBand.rotation.x = Math.PI / 2;
  equatorialBand.position.y = bellyY;
  group.add(equatorialBand);

  // 4. Slender Flared Glass Neck with Brass Collar
  const neckH = h * 0.36;
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.28, r * 0.42, neckH, 16),
    potionGlassMat
  );
  neck.position.y = bellyY + r * 0.65 + neckH / 2;
  group.add(neck);

  const neckCollar = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.33, 0.005, 8, 18),
    goldMat
  );
  neckCollar.rotation.x = Math.PI / 2;
  neckCollar.position.y = bellyY + r * 0.65 + neckH * 0.75;
  group.add(neckCollar);

  // 5. Tapered Cork Stopper & Dripping Sapphire Wax Seal Stamp
  const cork = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.26, r * 0.2, h * 0.12, 14),
    corkMat
  );
  cork.position.y = bellyY + r * 0.65 + neckH + h * 0.04;
  group.add(cork);

  const waxCap = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.3, r * 0.32, 0.012, 14),
    sapphireWaxMat
  );
  waxCap.position.y = bellyY + r * 0.65 + neckH + 0.004;
  group.add(waxCap);

  return group;
}

// 37. Chiseled Dark-Slate Runic Stone Tablet with Glowing Arcane Sigils (`podium_keyboard`)
export function createKeyboardPropMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.40, obj.width || 0.44);
  const d = Math.max(0.15, obj.depth || 0.17);
  const h = Math.max(0.032, obj.height || 0.036);

  const chiseledSlateMat = makeStoneMat('#181B22', 0.78, 0.15);
  const runeStoneMat = makeStoneMat('#272C37', 0.62, 0.22);
  const goldMat = makeGoldMat('#C9A24B');
  const arcaneRuneMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    roughness: 0.25,
    emissive: new THREE.Color('#D97706'),
    emissiveIntensity: 0.65,
  });

  // 1. Chiseled Sloped Dark-Slate Stone Tablet Plinth
  const slab = new THREE.Mesh(
    createBeveledSlabGeometry(w, d, h * 0.75, 0.008),
    chiseledSlateMat
  );
  slab.position.y = (h * 0.75) / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  // 2. Tarnished Brass Corner Brackets & Relic Border
  [
    [-w * 0.46, -d * 0.42],
    [w * 0.46, -d * 0.42],
    [-w * 0.46, d * 0.42],
    [w * 0.46, d * 0.42],
  ].forEach(([cx, cz]) => {
    const corner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.016, h * 0.9, 8),
      goldMat
    );
    corner.position.set(cx, h * 0.45, cz);
    group.add(corner);
  });

  // 3. Raised Carved Runic Sigil Stones (14 individual stone rune tablets in 2 rows + central blood-amber crystal)
  const cols = 7;
  for (let rIdx = 0; rIdx < 2; rIdx++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      if (rIdx === 0 && cIdx === 3) continue; // leave center for crystal
      const rx = -w * 0.36 + (cIdx / (cols - 1)) * (w * 0.72);
      const rz = -d * 0.2 + rIdx * (d * 0.4);
      const stoneKey = new THREE.Mesh(
        createBeveledSlabGeometry(w * 0.075, d * 0.26, h * 0.42, 0.003),
        runeStoneMat
      );
      stoneKey.position.set(rx, h * 0.82, rz);
      group.add(stoneKey);

      const glyph = new THREE.Mesh(
        new THREE.RingGeometry(0.005, 0.009, 6),
        arcaneRuneMat
      );
      glyph.rotation.x = -Math.PI / 2;
      glyph.position.set(rx, h * 1.04, rz);
      group.add(glyph);
    }
  }

  // 4. Central Glowing Amber Divination Crystal on the Tablet
  const centerGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.016, 0),
    arcaneRuneMat
  );
  centerGem.position.set(0, h * 1.05, -d * 0.2);
  group.add(centerGem);

  return group;
}

// 38. Coiled Brass & Black-Iron Serpent Speaking Horn with Glowing Ruby Eye (`gooseneck_microphone`)
export function createMicrophonePropMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.38, obj.height || 0.46);

  const darkIronMat = makeIronMat('#18181B', 0.32, 0.75);
  const goldMat = makeGoldMat('#C9A24B');
  const rubyGemMat = new THREE.MeshBasicMaterial({ color: '#EF4444' });

  // Molded octagonal pedestal base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.032, 8), darkIronMat);
  base.position.y = 0.016;
  base.castShadow = true;
  group.add(base);

  const goldCollar = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 8, 16), goldMat);
  goldCollar.rotation.x = Math.PI / 2;
  goldCollar.position.y = 0.032;
  group.add(goldCollar);

  // Serpentine stalk
  const lowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, h * 0.55, 10), darkIronMat);
  lowerStem.position.set(0, 0.028 + (h * 0.55) / 2, 0);
  group.add(lowerStem);

  const upperStem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, h * 0.42, 10), goldMat);
  upperStem.position.set(0, h * 0.74, 0.045);
  upperStem.rotation.x = 0.42;
  group.add(upperStem);

  // Glowing ruby runic ring & flared serpent speaking horn head
  const rubyRing = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 8, 16), rubyGemMat);
  rubyRing.rotation.x = Math.PI / 2 + 0.42;
  rubyRing.position.set(0, h * 0.90, 0.082);
  group.add(rubyRing);

  const hornHead = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.011, 0.058, 12), goldMat);
  hornHead.rotation.x = 0.42;
  hornHead.position.set(0, h * 0.95, 0.095);
  group.add(hornHead);

  return group;
}

// 39. Sealed Midnight-Obsidian & Sapphire Iron-Bound Relic Chest (`pepsi_max_multipack`, Puzzle P4 Target)
export function createPepsiMultipackMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.38, obj.width || 0.44);
  const h = Math.max(0.24, obj.height || 0.28);
  const d = Math.max(0.26, obj.depth || 0.30);

  const midnightTimberMat = new THREE.MeshStandardMaterial({
    color: '#0B1120',
    roughness: 0.42,
    metalness: 0.28,
  });
  const sapphireVelvetMat = new THREE.MeshStandardMaterial({
    color: '#1D4ED8',
    roughness: 0.35,
    metalness: 0.3,
    emissive: new THREE.Color('#1E3A8A'),
    emissiveIntensity: 0.25,
  });
  const wroughtIronMat = makeIronMat('#1E293B', 0.35, 0.85);
  const silverRelicMat = makeIronMat('#CBD5E1', 0.2, 0.92);
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Heavy Midnight-Obsidian Chest Body
  const chestBodyH = h * 0.68;
  const chestBody = new THREE.Mesh(
    createBeveledSlabGeometry(w, d, chestBodyH, 0.014),
    midnightTimberMat
  );
  chestBody.position.y = chestBodyH / 2;
  chestBody.castShadow = true;
  chestBody.receiveShadow = true;
  group.add(chestBody);

  // 2. Recessed Sapphire Heraldic Velvet Inlay Panels on Front & Back
  const inlay = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.86, chestBodyH * 0.65, d + 0.008),
    sapphireVelvetMat
  );
  inlay.position.y = chestBodyH * 0.5;
  group.add(inlay);

  // 3. Vaulted Gothic Coffret Lid
  const lidH = h * 0.32;
  const lid = new THREE.Mesh(
    createBeveledSlabGeometry(w * 1.02, d * 1.02, lidH, 0.022),
    midnightTimberMat
  );
  lid.position.y = chestBodyH + lidH / 2;
  lid.castShadow = true;
  group.add(lid);

  // 4. Three Heavy Wrought-Iron Binding Straps & Silver Ward Lockplate
  [-w * 0.36, 0, w * 0.36].forEach((sx) => {
    const ironStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, h + 0.008, d * 1.04),
      wroughtIronMat
    );
    ironStrap.position.set(sx, h * 0.5, 0);
    group.add(ironStrap);
  });

  const lockPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.085, 0.018),
    silverRelicMat
  );
  lockPlate.position.set(0, chestBodyH, d * 0.52);
  group.add(lockPlate);

  // 5. Ornate Silver Reliquary Vial Finials crowning the Coffret Crest
  for (let cx = -w * 0.32; cx <= w * 0.32; cx += w * 0.21) {
    const finial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.022, 0.028, 12),
      silverRelicMat
    );
    finial.position.set(cx, h + 0.014, 0);
    group.add(finial);
  }

  const crestRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.005, 8, 18), goldMat);
  crestRing.position.set(0, chestBodyH, d * 0.53);
  group.add(crestRing);

  return group;
}

// 40. Rose-Bound Slatted Oak Apothecary Crate of Crystal Potion Flasks (`water_bottles_multipack`)
export function createWaterMultipackMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.45, obj.width || 0.54);
  const h = Math.max(0.34, obj.height || 0.40);
  const d = Math.max(0.30, obj.depth || 0.36);

  const darkOakMat = makeWoodMat('#3B2314', 0.65);
  const roseVelvetBannerMat = new THREE.MeshStandardMaterial({
    color: '#BE185D',
    roughness: 0.42,
    metalness: 0.15,
  });
  const crystalVialMat = new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    roughness: 0.14,
    metalness: 0.15,
    transparent: true,
    opacity: 0.82,
  });
  const corkMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.7 });

  // 1. Slatted Dark-Oak Apothecary Crate Frame
  const crateBase = new THREE.Mesh(
    createBeveledSlabGeometry(w, d, h * 0.52, 0.014),
    darkOakMat
  );
  crateBase.position.y = (h * 0.52) / 2;
  crateBase.castShadow = true;
  group.add(crateBase);

  // 2. Rose-Crimson Alchemical Velvet Band around the Crate
  const bannerBand = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.01, h * 0.28, d + 0.01),
    roseVelvetBannerMat
  );
  bannerBand.position.y = h * 0.28;
  group.add(bannerBand);

  // 3. Twelve Bulbous Corked Crystal Potion Flasks nestled in the Crate
  for (let bx = -w * 0.33; bx <= w * 0.34; bx += w * 0.22) {
    for (let bz = -d * 0.24; bz <= d * 0.25; bz += d * 0.48) {
      const flaskBelly = new THREE.Mesh(
        new THREE.SphereGeometry(0.044, 14, 12),
        crystalVialMat
      );
      flaskBelly.position.set(bx, h * 0.56, bz);
      group.add(flaskBelly);

      const flaskNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.022, h * 0.26, 12),
        crystalVialMat
      );
      flaskNeck.position.set(bx, h * 0.72, bz);
      group.add(flaskNeck);

      const cork = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.012, 0.024, 10),
        corkMat
      );
      cork.position.set(bx, h * 0.86, bz);
      group.add(cork);
    }
  }

  return group;
}

// 41. Iron-Bound Dark-Oak Treasure Chest with Wrought-Iron Straps & Padlock (`cardboard_box_under_podium`)
export function createCardboardBoxPropMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.40, obj.width || 0.46);
  const h = Math.max(0.32, obj.height || 0.36);
  const d = Math.max(0.32, obj.depth || 0.38);

  const darkOakMat = makeWoodMat(obj.primaryColor || '#4A2C18', 0.68);
  const wroughtIronMat = makeIronMat('#1E242B', 0.38, 0.84);
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Heavy Oak Treasure Chest Body
  const bodyH = h * 0.68;
  const chestBody = new THREE.Mesh(
    createBeveledSlabGeometry(w, d, bodyH, 0.014),
    darkOakMat
  );
  chestBody.position.y = bodyH / 2;
  chestBody.castShadow = true;
  chestBody.receiveShadow = true;
  group.add(chestBody);

  // 2. Arched Beveled Timber Chest Lid
  const lidH = h * 0.32;
  const chestLid = new THREE.Mesh(
    createBeveledSlabGeometry(w * 1.03, d * 1.03, lidH, 0.024),
    darkOakMat
  );
  chestLid.position.y = bodyH + lidH / 2;
  chestLid.castShadow = true;
  group.add(chestLid);

  // 3. Three Wrought-Iron Binding Straps & Corner Brackets
  [-w * 0.38, 0, w * 0.38].forEach((sx) => {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, h + 0.008, d * 1.05),
      wroughtIronMat
    );
    strap.position.set(sx, h * 0.5, 0);
    group.add(strap);
  });

  // 4. Forged Brass Padlock & Hasps on the Front Face
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.09, 0.016), goldMat);
  hasp.position.set(0, bodyH, d * 0.525);
  group.add(hasp);

  const padlockBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.018, 14),
    goldMat
  );
  padlockBody.rotation.x = Math.PI / 2;
  padlockBody.position.set(0, bodyH - 0.045, d * 0.54);
  group.add(padlockBody);

  // 5. Side Wrought-Iron Carrying Rings
  [-1, 1].forEach((side) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.006, 8, 16),
      wroughtIronMat
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * (w * 0.52), bodyH * 0.65, 0);
    group.add(ring);
  });

  return group;
}

// 42. Wax-Sealed Ivory Vellum Scroll Coffer with Rolled Parchment Scrolls (`white_paper_carrier_bag`)
export function createPaperCarrierBagMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.22, obj.width || 0.26);
  const h = Math.max(0.26, obj.height || 0.32);
  const d = Math.max(0.12, obj.depth || 0.15);

  const vellumMat = new THREE.MeshStandardMaterial({ color: '#F5E6C8', roughness: 0.52 });
  const leatherTrimMat = makeWoodMat('#5C341D', 0.55);
  const crimsonWaxMat = new THREE.MeshStandardMaterial({ color: '#B91C1C', roughness: 0.35 });
  const goldCordMat = makeGoldMat('#C9A24B');

  // 1. Stiffened Ivory Vellum Scroll Coffer Body
  const cofferBody = new THREE.Mesh(
    createBeveledSlabGeometry(w, d, h * 0.76, 0.014),
    vellumMat
  );
  cofferBody.position.y = (h * 0.76) / 2;
  cofferBody.castShadow = true;
  group.add(cofferBody);

  // 2. Leather Binding Straps & Crimson Wax Seal Stamp on Front
  [-w * 0.3, w * 0.3].forEach((sx) => {
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, h * 0.78, d + 0.008),
      leatherTrimMat
    );
    strap.position.set(sx, h * 0.38, 0);
    group.add(strap);
  });

  const waxSeal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.01, 16),
    crimsonWaxMat
  );
  waxSeal.rotation.x = Math.PI / 2;
  waxSeal.position.set(0, h * 0.45, d * 0.51);
  group.add(waxSeal);

  // 3. Rolled Parchment Scrolls protruding from the Coffer Top
  [-w * 0.18, w * 0.16].forEach((rx, idx) => {
    const scrollTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, h * 0.42, 16),
      vellumMat
    );
    scrollTube.position.set(rx, h * 0.72, (idx === 0 ? -1 : 1) * d * 0.12);
    scrollTube.rotation.z = idx === 0 ? 0.12 : -0.1;
    group.add(scrollTube);

    const scrollRibbon = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.004, 8, 16),
      crimsonWaxMat
    );
    scrollRibbon.rotation.x = Math.PI / 2;
    scrollRibbon.position.set(rx, h * 0.82, (idx === 0 ? -1 : 1) * d * 0.12);
    group.add(scrollRibbon);
  });

  // 4. Braided Gold Carrying Cord
  const cord = new THREE.Mesh(
    new THREE.TorusGeometry(w * 0.24, 0.0055, 8, 18, Math.PI),
    goldCordMat
  );
  cord.position.set(0, h * 0.76, 0);
  group.add(cord);

  return group;
}

// 43. Medieval Buckled Leather Pilgrim's Satchel & Scroll Pack (`white_backpack_floor` & `tan_backpack_desk`)
export function createBackpackPropMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.32, obj.width || 0.38);
  const h = Math.max(0.32, obj.height || 0.42);
  const d = Math.max(0.20, obj.depth || 0.24);

  const leatherMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#D6C7B2',
    roughness: 0.58,
    metalness: 0.06,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: obj.secondaryColor || '#3E2723',
    roughness: 0.48,
  });
  const vellumScrollMat = new THREE.MeshStandardMaterial({
    color: '#F5E6C8',
    roughness: 0.52,
  });
  const brassMat = makeGoldMat('#C9A24B');

  // 1. Rounded Stitched Leather Satchel Body
  const packBody = new THREE.Mesh(
    createBeveledSlabGeometry(w, d * 0.75, h * 0.84, 0.042),
    leatherMat
  );
  packBody.position.set(0, (h * 0.84) / 2, -d * 0.06);
  packBody.castShadow = true;
  packBody.receiveShadow = true;
  group.add(packBody);

  // 2. Front Apothecary Pocket Satchel
  const frontSatchel = new THREE.Mesh(
    createBeveledSlabGeometry(w * 0.76, d * 0.34, h * 0.44, 0.025),
    leatherMat
  );
  frontSatchel.position.set(0, h * 0.28, d * 0.28);
  frontSatchel.castShadow = true;
  group.add(frontSatchel);

  // 3. Rolled Parchment Map Scroll Strapped Across the Top Crest
  const mapScroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, w * 0.92, 16),
    vellumScrollMat
  );
  mapScroll.rotation.z = Math.PI / 2;
  mapScroll.position.set(0, h * 0.88, -d * 0.05);
  mapScroll.castShadow = true;
  group.add(mapScroll);

  // 4. Twin Vertical Leather Buckle Straps & Forged Brass Clasps
  [-w * 0.22, w * 0.22].forEach((bx) => {
    const frontStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, h * 0.76, 0.022),
      strapMat
    );
    frontStrap.position.set(bx, h * 0.46, d * 0.42);
    group.add(frontStrap);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.034, 0.028), brassMat);
    buckle.position.set(bx, h * 0.42, d * 0.43);
    group.add(buckle);

    const scrollRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.006, 8, 16),
      brassMat
    );
    scrollRing.rotation.y = Math.PI / 2;
    scrollRing.position.set(bx, h * 0.88, -d * 0.05);
    group.add(scrollRing);
  });

  return group;
}

// 44. Glazed Cobalt-and-Ivory Porcelain Alchemical Amphora (`coconut_water_carton`)
export function createDrinkCartonMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const h = Math.max(0.21, obj.height || 0.23);
  const r = Math.max(0.044, (obj.width || 0.09) * 0.48);

  const cobaltGlazeMat = new THREE.MeshStandardMaterial({
    color: '#0284C7',
    roughness: 0.22,
    metalness: 0.18,
  });
  const ivoryPorcelainMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.24,
  });
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Moulded Porcelain Pedestal Foot
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.65, r * 0.82, h * 0.14, 18),
    goldMat
  );
  foot.position.y = h * 0.07;
  group.add(foot);

  // 2. Sculpted Amphora Belly with Ivory & Cobalt Glaze Banding
  const belly = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.96, r * 0.65, h * 0.48, 20),
    ivoryPorcelainMat
  );
  belly.position.y = h * 0.38;
  belly.castShadow = true;
  group.add(belly);

  const cobaltShoulder = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.96, 20, 14),
    cobaltGlazeMat
  );
  cobaltShoulder.scale.set(1.0, 0.55, 1.0);
  cobaltShoulder.position.y = h * 0.62;
  group.add(cobaltShoulder);

  // 3. Flared Amphora Neck & Conical Gilded Stopper
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.36, r * 0.46, h * 0.22, 16),
    ivoryPorcelainMat
  );
  neck.position.y = h * 0.78;
  group.add(neck);

  const stopper = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.38, h * 0.14, 14),
    goldMat
  );
  stopper.position.y = h * 0.94;
  group.add(stopper);

  // 4. Twin Curved Brass Amphora Handles
  [-1, 1].forEach((side) => {
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.42, 0.006, 8, 16, Math.PI),
      goldMat
    );
    handle.rotation.z = side * (Math.PI / 2);
    handle.position.set(side * (r * 0.82), h * 0.68, 0);
    group.add(handle);
  });

  return group;
}

// 45. Midnight-Blue Leather Scholar's Satchel with Brown Straps (`navy_tote_bag`)
export function createToteBagMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.36, obj.width || 0.42);
  const h = Math.max(0.20, obj.height || 0.24);
  const d = Math.max(0.20, obj.depth || 0.24);

  const navyLeatherMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#1E3A8A',
    roughness: 0.58,
  });
  const brownHarnessMat = new THREE.MeshStandardMaterial({
    color: obj.secondaryColor || '#78350F',
    roughness: 0.42,
  });
  const goldMat = makeGoldMat('#C9A24B');

  const bag = new THREE.Mesh(createBeveledSlabGeometry(w, d, h * 0.78, 0.035), navyLeatherMat);
  bag.position.y = (h * 0.78) / 2;
  bag.castShadow = true;
  group.add(bag);

  [-w * 0.22, w * 0.22].forEach((sx) => {
    const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.014, d * 0.96), brownHarnessMat);
    topStrap.position.set(sx, h * 0.80, 0);
    group.add(topStrap);

    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.018), goldMat);
    clasp.position.set(sx, h * 0.55, d * 0.5);
    group.add(clasp);
  });

  const hangingLoop = new THREE.Mesh(new THREE.TorusGeometry(w * 0.24, 0.012, 10, 20, Math.PI), brownHarnessMat);
  hangingLoop.rotation.z = Math.PI;
  hangingLoop.position.set(0, h * 0.25, d * 0.52);
  group.add(hangingLoop);

  return group;
}

// 46. Rose-Velvet Drawstring Alchemical Coin & Herb Pouch (`pink_pouch`)
export function createZipPouchMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.055, (obj.width || 0.14) * 0.42);
  const h = Math.max(0.085, obj.height || 0.095);

  const roseVelvetMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#DB2777',
    roughness: 0.55,
  });
  const goldMat = makeGoldMat('#C9A24B');

  // 1. Plump Gathered Velvet Coin Pouch Belly
  const belly = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), roseVelvetMat);
  belly.scale.set(1.15, 0.78, 0.95);
  belly.position.y = r * 0.72;
  belly.castShadow = true;
  group.add(belly);

  // 2. Gold Drawstring Cinch Ring & Ruffled Velvet Neck Crown
  const cinchRing = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.48, 0.006, 8, 18),
    goldMat
  );
  cinchRing.rotation.x = Math.PI / 2;
  cinchRing.position.y = h * 0.76;
  group.add(cinchRing);

  const neckRuffle = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.56, h * 0.26, 12),
    roseVelvetMat
  );
  neckRuffle.rotation.x = Math.PI;
  neckRuffle.position.y = h * 0.86;
  group.add(neckRuffle);

  // 3. Gilded Tassel Beads hanging from the Drawstring
  [-1, 1].forEach((side) => {
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), goldMat);
    tassel.position.set(side * (r * 0.54), h * 0.68, r * 0.25);
    group.add(tassel);
  });

  return group;
}

// 47. Octagonal Obsidian Soul-Stone Reliquary Amulet with Glowing Emerald Gem (`earbuds_charging_case`)
export function createEarbudsCaseMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.036, (obj.width || 0.072) * 0.5);
  const h = Math.max(0.032, obj.height || 0.038);

  const obsidianMat = new THREE.MeshStandardMaterial({
    color: '#18181B',
    roughness: 0.22,
    metalness: 0.55,
  });
  const goldMat = makeGoldMat('#C9A24B');
  const emeraldGemMat = new THREE.MeshStandardMaterial({
    color: '#10B981',
    roughness: 0.15,
    emissive: new THREE.Color('#059669'),
    emissiveIntensity: 0.75,
  });

  // 1. Octagonal Obsidian Reliquary Casing + Filigree Gold Bezel
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, h * 0.8, 8), obsidianMat);
  body.position.y = (h * 0.8) / 2;
  body.castShadow = true;
  group.add(body);

  const goldBezel = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.88, 0.004, 8, 16),
    goldMat
  );
  goldBezel.rotation.x = Math.PI / 2;
  goldBezel.position.y = h * 0.8;
  group.add(goldBezel);

  // 2. Crowned Emerald Soul-Gem in the Center
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.011, 0), emeraldGemMat);
  gem.position.set(0, h * 0.88, 0);
  group.add(gem);

  // 3. Amulet Suspension Loop
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 8, 14), goldMat);
  loop.rotation.x = Math.PI / 2;
  loop.position.set(0, h * 0.4, -r * 1.05);
  group.add(loop);

  return group;
}

// 48. Blood-Ruby Cursed Pomegranate in Gilded Ritual Tazza (`red_apple` Parallel-World Counterpart)
export function createBloodPomegranateMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.055, (obj.width || 0.12) * 0.45);

  const goldMat = makeGoldMat('#C9A24B');
  const crimsonFruitMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#B91C1C',
    roughness: 0.25,
    metalness: 0.25,
    emissive: new THREE.Color('#7F1D1D'),
    emissiveIntensity: 0.32,
  });
  const rubySeedMat = new THREE.MeshBasicMaterial({ color: '#F43F5E' });

  // Gilded Ritual Tazza Pedestal Dish
  const pedestalFoot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.85, 0.022, 16), goldMat);
  pedestalFoot.position.y = 0.011;
  group.add(pedestalFoot);

  const tazzaDish = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 0.65, 0.018, 20), goldMat);
  tazzaDish.position.y = 0.028;
  tazzaDish.castShadow = true;
  group.add(tazzaDish);

  // Blood-Crimson Forbidden Fruit Orb
  const fruitOrb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.88, 20, 16), crimsonFruitMat);
  fruitOrb.scale.set(1.0, 0.92, 1.0);
  fruitOrb.position.y = 0.032 + r * 0.78;
  fruitOrb.castShadow = true;
  group.add(fruitOrb);

  // Golden Calyx Crown & Ruby Aril Gems on Top
  const crown = new THREE.Mesh(new THREE.ConeGeometry(r * 0.28, 0.028, 6), goldMat);
  crown.rotation.x = Math.PI;
  crown.position.y = 0.032 + r * 1.56;
  group.add(crown);

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.008, 0), rubySeedMat);
    gem.position.set(
      Math.cos(angle) * r * 0.55,
      0.032 + r * 0.85,
      Math.sin(angle) * r * 0.55
    );
    group.add(gem);
  }

  return group;
}

// 49. Moss-Inscribed Vellum Rune Slips & Wax Seals (`green_sticky_notes` Parallel-World Counterpart)
export function createMossVellumSlipsMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.14, obj.width || 0.16);
  const d = Math.max(0.14, obj.depth || 0.16);

  const slateBaseMat = makeStoneMat('#1E242B', 0.7, 0.15);
  const mossVellumMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#15803D',
    roughness: 0.52,
    metalness: 0.06,
    emissive: new THREE.Color('#14532D'),
    emissiveIntensity: 0.28,
  });
  const goldSealMat = makeGoldMat('#D97706');

  // Dark Slate Tablet Base
  const tablet = new THREE.Mesh(createBeveledSlabGeometry(w, d, 0.014, 0.004), slateBaseMat);
  tablet.position.y = 0.007;
  tablet.castShadow = true;
  group.add(tablet);

  // Overlapping Square Moss-Colored Vellum Rune Parchements
  const offsets = [
    [-w * 0.18, -d * 0.14, 0.08],
    [w * 0.18, -d * 0.12, -0.12],
    [-w * 0.08, d * 0.16, -0.05],
    [w * 0.15, d * 0.15, 0.18],
  ];
  offsets.forEach(([ox, oz, rot], idx) => {
    const slip = new THREE.Mesh(
      createBeveledSlabGeometry(w * 0.44, d * 0.44, 0.012 + idx * 0.004, 0.003),
      mossVellumMat
    );
    slip.position.set(ox, 0.018 + idx * 0.003, oz);
    slip.rotation.y = rot;
    slip.castShadow = true;
    group.add(slip);

    const waxPin = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), goldSealMat);
    waxPin.position.set(ox, 0.026 + idx * 0.004, oz);
    group.add(waxPin);
  });

  return group;
}

// 50. Leather-Bound Medieval Grimoire Folio with Brass Corner Clasps (`orange_folder` / `red_folder` / `black_wallet` Counterpart)
export function createGrimoireFolioMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const w = Math.max(0.22, obj.width || 0.28);
  const d = Math.max(0.16, obj.depth || 0.22);
  const h = Math.max(0.038, obj.height || 0.045);

  const leatherMat = new THREE.MeshStandardMaterial({
    color: obj.primaryColor || '#EA580C',
    roughness: 0.48,
    metalness: 0.1,
    emissive: new THREE.Color(obj.primaryColor || '#9A3412'),
    emissiveIntensity: 0.18,
  });
  const parchmentMat = makeVelvetMat('#F5E6C8', 0.65, 0.02);
  const goldMat = makeGoldMat('#C9A24B');

  // Lower & Upper Leather Folio Covers + Inner Parchment Sheaf
  const bottomCover = new THREE.Mesh(createBeveledSlabGeometry(w, d, h * 0.28, 0.004), leatherMat);
  bottomCover.position.y = h * 0.14;
  bottomCover.castShadow = true;
  group.add(bottomCover);

  const pages = new THREE.Mesh(createBeveledSlabGeometry(w * 0.92, d * 0.9, h * 0.48, 0.003), parchmentMat);
  pages.position.y = h * 0.5;
  group.add(pages);

  const topCover = new THREE.Mesh(createBeveledSlabGeometry(w, d, h * 0.28, 0.004), leatherMat);
  topCover.position.y = h * 0.86;
  topCover.castShadow = true;
  group.add(topCover);

  // Brass Corner Bosses & Central Emblem Medallion
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 16), goldMat);
  emblem.position.y = h + 0.003;
  group.add(emblem);

  [-w * 0.42, w * 0.42].forEach((cx) => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.022, h + 0.008, d + 0.01), goldMat);
    strap.position.set(cx, h * 0.5, 0);
    group.add(strap);
  });

  return group;
}

// 51. Sanctum Keymaster's Wrought-Iron Ring of Skeleton Keys (`colourful_keychain` Counterpart)
export function createKeychainPropMesh(obj: SceneObject): THREE.Group {
  const group = new THREE.Group();
  const r = Math.max(0.038, (obj.width || 0.12) * 0.35);

  const wroughtIronMat = makeIronMat('#27272A', 0.32, 0.85);
  const goldMat = makeGoldMat('#C9A24B');
  const rubyTagMat = new THREE.MeshStandardMaterial({ color: '#DC2626', roughness: 0.35 });
  const sapphireTagMat = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.35 });

  // 1. Forged Wrought-Iron Keymaster Torus Ring resting on the surface
  const masterRing = new THREE.Mesh(new THREE.TorusGeometry(r, 0.005, 10, 24), goldMat);
  masterRing.rotation.x = Math.PI / 2;
  masterRing.position.y = 0.008;
  masterRing.castShadow = true;
  group.add(masterRing);

  // 2. Three Ornate Medieval Skeleton Keys fanned out from the Ring
  const angles = [-0.45, 0, 0.45];
  angles.forEach((ang, idx) => {
    const keyGrp = new THREE.Group();
    const mat = idx === 1 ? goldMat : wroughtIronMat;

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0035, 8, 14), mat);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(0, 0.008, r * 0.85);
    keyGrp.add(bow);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8), mat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.008, r * 0.85 + 0.038);
    keyGrp.add(shaft);

    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.012), mat);
    bit.position.set(0.006, 0.008, r * 0.85 + 0.062);
    keyGrp.add(bit);

    keyGrp.rotation.y = ang;
    group.add(keyGrp);
  });

  // 3. Enamel Heraldic Talisman Charms
  const rubyCharm = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), rubyTagMat);
  rubyCharm.position.set(-r * 0.85, 0.012, -r * 0.35);
  group.add(rubyCharm);

  const sapphireCharm = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), sapphireTagMat);
  sapphireCharm.position.set(r * 0.85, 0.012, -r * 0.35);
  group.add(sapphireCharm);

  return group;
}

// Master High-Craft Furniture & Architectural Prop Factory
export function buildFurnitureObject(obj: SceneObject): BuiltObjectResult {
  let group: THREE.Group;
  const nameLower = (obj.name || '').toLowerCase();
  const idLower = (obj.id || '').toLowerCase();

  // Intelligent semantic fallback based on exact ID, object name, OR type
  let resolvedType = obj.type;
  if (
    resolvedType === 'wall_art' &&
    (nameLower.includes('projection') ||
      nameLower.includes('screen') ||
      nameLower.includes('slide') ||
      nameLower.includes('panel') ||
      nameLower.includes('board'))
  ) {
    resolvedType = 'projection_screen';
  }

  // Exact inventory ID routing to ensure 100% accurate procedural Medieval Gothic models
  if (idLower === 'red_whiteboard_marker' || idLower === 'blue_marker') resolvedType = 'marker_pen';
  else if (idLower === 'haribo_tub_top' || idLower === 'haribo_gummies') resolvedType = 'haribo_tub';
  else if (idLower === 'paper_plates_stack') resolvedType = 'paper_plates';
  else if (idLower === 'plastic_cups_sleeve') resolvedType = 'cups_sleeve';
  else if (idLower === 'glass_swing_top_bottle') resolvedType = 'glass_bottle';
  else if (idLower === 'pret_coffee_cup') resolvedType = 'coffee_cup';
  else if (idLower === 'small_water_bottle_podium') resolvedType = 'water_bottle_small';
  else if (idLower === 'podium_keyboard') resolvedType = 'keyboard_prop';
  else if (idLower === 'gooseneck_microphone') resolvedType = 'microphone_prop';
  else if (idLower === 'pepsi_max_multipack') resolvedType = 'pepsi_multipack';
  else if (idLower === 'water_bottles_multipack') resolvedType = 'water_multipack';
  else if (idLower === 'cardboard_box_under_podium') resolvedType = 'cardboard_box_prop';
  else if (idLower === 'white_paper_carrier_bag') resolvedType = 'paper_carrier_bag';
  else if (idLower === 'halloween_rollup_banner') resolvedType = 'rollup_banner';
  else if (idLower === 'white_backpack_floor' || idLower === 'tan_backpack_desk') resolvedType = 'backpack_prop';
  else if (idLower === 'coconut_water_carton') resolvedType = 'drink_carton';
  else if (idLower === 'navy_tote_bag') resolvedType = 'tote_bag';
  else if (idLower === 'pink_pouch') resolvedType = 'zip_pouch';
  else if (idLower === 'earbuds_charging_case') resolvedType = 'earbuds_case';
  else if (idLower === 'orange_chair') resolvedType = 'chair';
  else if (idLower === 'red_apple') resolvedType = 'blood_pomegranate';
  else if (idLower === 'green_sticky_notes') resolvedType = 'moss_vellum_slips';
  else if (idLower === 'orange_folder' || idLower === 'red_folder' || idLower === 'black_wallet') resolvedType = 'grimoire_folio';
  else if (idLower === 'colourful_keychain') resolvedType = 'keychain_prop';

  if (resolvedType === 'generic' || !resolvedType) {
    if (nameLower.includes('marker') || nameLower.includes('pen') || nameLower.includes('quill')) resolvedType = 'marker_pen';
    else if (nameLower.includes('keychain') || nameLower.includes('key') || nameLower.includes('lanyard')) resolvedType = 'keychain_prop';
    else if (nameLower.includes('apple') || nameLower.includes('pomegranate') || nameLower.includes('fruit')) resolvedType = 'blood_pomegranate';
    else if (nameLower.includes('sticky') || nameLower.includes('vellum') || nameLower.includes('notes')) resolvedType = 'moss_vellum_slips';
    else if (nameLower.includes('folder') || nameLower.includes('folio') || nameLower.includes('grimoire') || nameLower.includes('wallet') || nameLower.includes('book')) resolvedType = 'grimoire_folio';
    else if (nameLower.includes('haribo') || nameLower.includes('candy') || nameLower.includes('gummies') || nameLower.includes('cauldron')) resolvedType = 'haribo_tub';
    else if (nameLower.includes('paper plate') || nameLower.includes('moon disc')) resolvedType = 'paper_plates';
    else if (nameLower.includes('cups') && nameLower.includes('sleeve')) resolvedType = 'cups_sleeve';
    else if (nameLower.includes('swing-top') || nameLower.includes('glass water bottle') || nameLower.includes('decanter')) resolvedType = 'glass_bottle';
    else if (nameLower.includes('coffee') || nameLower.includes('mug') || nameLower.includes('pret') || nameLower.includes('goblet')) resolvedType = 'coffee_cup';
    else if (nameLower.includes('water') || nameLower.includes('bottle') || nameLower.includes('phial') || nameLower.includes('flask')) resolvedType = 'water_bottle_small';
    else if (nameLower.includes('keyboard') || nameLower.includes('clavichord') || nameLower.includes('laptop')) resolvedType = 'keyboard_prop';
    else if (nameLower.includes('microphone') || nameLower.includes('speaking horn')) resolvedType = 'microphone_prop';
    else if (nameLower.includes('pepsi') || nameLower.includes('relic coffer') || nameLower.includes('can')) resolvedType = 'pepsi_multipack';
    else if (nameLower.includes('water') && nameLower.includes('pack')) resolvedType = 'water_multipack';
    else if (nameLower.includes('cardboard') || nameLower.includes('box') || nameLower.includes('reliquary crate') || nameLower.includes('chest')) resolvedType = 'cardboard_box_prop';
    else if (nameLower.includes('paper gift bag') || nameLower.includes('carrier bag') || nameLower.includes('scroll coffer')) resolvedType = 'paper_carrier_bag';
    else if (nameLower.includes('backpack') || nameLower.includes('rucksack')) resolvedType = 'backpack_prop';
    else if (nameLower.includes('drink carton') || nameLower.includes('coconut') || nameLower.includes('amphora')) resolvedType = 'drink_carton';
    else if (nameLower.includes('shoulder bag') || nameLower.includes('tote') || nameLower.includes('satchel')) resolvedType = 'tote_bag';
    else if (nameLower.includes('pouch') || nameLower.includes('coin purse')) resolvedType = 'zip_pouch';
    else if (nameLower.includes('earbuds') || nameLower.includes('locket') || nameLower.includes('amulet')) resolvedType = 'earbuds_case';
    else if (nameLower.includes('lecture_row') || nameLower.includes('seating tier') || nameLower.includes('auditorium row') || nameLower.includes('choir pew')) resolvedType = 'lecture_row';
    else if (nameLower.includes('av_console') || nameLower.includes('control podium') || nameLower.includes('av desk') || nameLower.includes('ritual altar')) resolvedType = 'av_console';
    else if (nameLower.includes('projection') || nameLower.includes('projector screen') || nameLower.includes('slide')) resolvedType = 'projection_screen';
    else if (nameLower.includes('whiteboard') || nameLower.includes('chalkboard') || nameLower.includes('monolith')) resolvedType = 'whiteboard';
    else if (nameLower.includes('rollup') || nameLower.includes('halloween') || nameLower.includes('deepmind') || nameLower.includes('war standard')) resolvedType = 'rollup_banner';
    else if (nameLower.includes('beverage')) resolvedType = 'beverage_crates';
    else if (nameLower.includes('double door') || nameLower.includes('exit door')) resolvedType = 'double_door';
    else if (nameLower.includes('pillar') || nameLower.includes('column')) resolvedType = 'pillar';
    else if (nameLower.includes('chandelier')) resolvedType = 'chandelier';
    else if (nameLower.includes('banner') || nameLower.includes('tapestry') || nameLower.includes('flag') || nameLower.includes('curtain') || nameLower.includes('drape')) resolvedType = 'banner';
    else if (nameLower.includes('podium') || nameLower.includes('lectern') || nameLower.includes('altar') || nameLower.includes('pulpit')) resolvedType = 'podium';
    else if (nameLower.includes('brazier') || nameLower.includes('torch')) resolvedType = 'brazier';
    else if (nameLower.includes('armor') || nameLower.includes('knight') || nameLower.includes('statue') || nameLower.includes('sculpture')) resolvedType = 'armor';
    else if (nameLower.includes('piano') || nameLower.includes('organ') || nameLower.includes('harpsichord')) resolvedType = 'piano';
    else if (nameLower.includes('throne')) resolvedType = 'throne';
    else if (nameLower.includes('fireplace') || nameLower.includes('hearth')) resolvedType = 'fireplace';
    else if (nameLower.includes('clock')) resolvedType = 'clock';
    else resolvedType = 'cardboard_box_prop';
  }

  switch (resolvedType) {
    case 'marker_pen':
      group = createMarkerPenMesh(obj);
      break;
    case 'keychain_prop':
      group = createKeychainPropMesh(obj);
      break;
    case 'blood_pomegranate':
      group = createBloodPomegranateMesh(obj);
      break;
    case 'moss_vellum_slips':
      group = createMossVellumSlipsMesh(obj);
      break;
    case 'grimoire_folio':
      group = createGrimoireFolioMesh(obj);
      break;
    case 'haribo_tub':
      group = createHariboTubMesh(obj);
      break;
    case 'paper_plates':
      group = createPaperPlatesMesh(obj);
      break;
    case 'cups_sleeve':
      group = createCupsSleeveMesh(obj);
      break;
    case 'glass_bottle':
      group = createGlassBottleMesh(obj);
      break;
    case 'coffee_cup':
      group = createCoffeeCupMesh(obj);
      break;
    case 'water_bottle_small':
      group = createSmallWaterBottleMesh(obj);
      break;
    case 'keyboard_prop':
      group = createKeyboardPropMesh(obj);
      break;
    case 'microphone_prop':
      group = createMicrophonePropMesh(obj);
      break;
    case 'pepsi_multipack':
      group = createPepsiMultipackMesh(obj);
      break;
    case 'water_multipack':
      group = createWaterMultipackMesh(obj);
      break;
    case 'cardboard_box_prop':
      group = createCardboardBoxPropMesh(obj);
      break;
    case 'paper_carrier_bag':
      group = createPaperCarrierBagMesh(obj);
      break;
    case 'backpack_prop':
      group = createBackpackPropMesh(obj);
      break;
    case 'drink_carton':
      group = createDrinkCartonMesh(obj);
      break;
    case 'tote_bag':
      group = createToteBagMesh(obj);
      break;
    case 'zip_pouch':
      group = createZipPouchMesh(obj);
      break;
    case 'earbuds_case':
      group = createEarbudsCaseMesh(obj);
      break;
    case 'lecture_row':
      group = createLectureRowMesh(obj);
      break;
    case 'av_console':
      group = createAVConsoleMesh(obj);
      break;
    case 'projection_screen':
      group = createProjectionScreenMesh(obj);
      break;
    case 'whiteboard':
      group = createWhiteboardMesh(obj);
      break;
    case 'rollup_banner':
      group = createRollupBannerMesh(obj);
      break;
    case 'beverage_crates':
      group = createBeverageCratesMesh(obj);
      break;
    case 'double_door':
      group = createDoubleDoorMesh(obj);
      break;
    case 'sofa':
    case 'couch':
      group = createSofaMesh(obj);
      break;
    case 'bed':
      group = createBedMesh(obj);
      break;
    case 'desk':
      group = createDeskMesh(obj);
      break;
    case 'chair':
    case 'armchair':
    case 'throne':
      group = createChairMesh({ ...obj, type: resolvedType });
      break;
    case 'table':
    case 'coffee_table':
    case 'catering_table':
      group = createTableMesh(obj);
      break;
    case 'bookshelf':
      group = createBookshelfMesh(obj);
      break;
    case 'pillar':
      group = createPillarMesh(obj);
      break;
    case 'chandelier':
      group = createChandelierMesh(obj);
      break;
    case 'banner':
      group = createBannerMesh(obj);
      break;
    case 'podium':
      group = createPodiumMesh(obj);
      break;
    case 'brazier':
      group = createBrazierMesh(obj);
      break;
    case 'armor':
    case 'statue':
      group = createArmorOrStatueMesh(obj);
      break;
    case 'piano':
      group = createPianoMesh(obj);
      break;
    case 'wardrobe':
    case 'cabinet':
    case 'nightstand':
      group = createWardrobeMesh(obj);
      break;
    case 'tv_stand':
      group = createTVStandMesh(obj);
      break;
    case 'lamp':
    case 'floor_lamp':
      group = createLampMesh(obj);
      break;
    case 'plant':
      group = createPlantMesh(obj);
      break;
    case 'rug':
      group = createRugMesh(obj);
      break;
    case 'wall_art':
      group = createWallArtMesh(obj);
      break;
    case 'window':
      group = createWindowMesh(obj);
      break;
    case 'door':
      group = createDoorMesh(obj);
      break;
    default:
      group = createGenericMesh({ ...obj, type: resolvedType });
  }

  // Requirement 1: Never highlight puzzle-target objects in normal gameplay!
  // Store a dev-only halo ring that stays strictly invisible (`visible = false`) unless Developer Debug Mode is enabled.
  if (obj.puzzleId) {
    const ringRadius = Math.max(0.08, Math.max(obj.width || 0.14, obj.depth || 0.14) * 0.62);
    const puzzleRing = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.82, ringRadius, 24),
      new THREE.MeshBasicMaterial({
        color: '#A855F7',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      })
    );
    puzzleRing.rotation.x = -Math.PI / 2;
    puzzleRing.position.y = 0.003;
    puzzleRing.visible = false; // Strictly hidden in normal gameplay!
    puzzleRing.userData = { isPuzzleHalo: true };
    group.add(puzzleRing);
  }

  // Set position and rotation
  group.position.set(obj.x, obj.y, obj.z);
  group.rotation.y = THREE.MathUtils.degToRad(obj.rotationY || 0);
  group.name = obj.id;

  group.userData = {
    id: obj.id,
    name: obj.name,
    type: resolvedType,
    description: obj.description,
    width: obj.width,
    height: obj.height,
    depth: obj.depth,
    interactive: Boolean(obj.interactive),
    puzzleId: obj.puzzleId,
    rewardDigit: obj.rewardDigit,
    clue: obj.clue,
    locationText: obj.locationText,
    supportingSurface: obj.supportingSurface,
    isMedievalGothicAsset: true,
    hasParallelMapping: true,
    virtualAssetType: obj.virtualAssetType || `gothic_${resolvedType}`,
    parallelObjectType: obj.parallelObjectType || `cursed_${resolvedType}`,
  };

  const smallPropTypes = new Set([
    'marker_pen',
    'keychain_prop',
    'blood_pomegranate',
    'moss_vellum_slips',
    'grimoire_folio',
    'haribo_tub',
    'paper_plates',
    'cups_sleeve',
    'glass_bottle',
    'coffee_cup',
    'water_bottle_small',
    'keyboard_prop',
    'microphone_prop',
    'paper_carrier_bag',
    'drink_carton',
    'tote_bag',
    'zip_pouch',
    'earbuds_case',
  ]);

  const nonColliding =
    smallPropTypes.has(resolvedType) ||
    Boolean(obj.preserveElevation && (obj.y || 0) >= 0.3) ||
    resolvedType === 'rug' ||
    resolvedType === 'wall_art' ||
    resolvedType === 'banner' ||
    resolvedType === 'projection_screen' ||
    resolvedType === 'whiteboard' ||
    resolvedType === 'window' ||
    resolvedType === 'door' ||
    resolvedType === 'double_door' ||
    resolvedType === 'chandelier' ||
    (obj.y || 0) > 3.2;

  let collisionBox: BuiltObjectResult['collisionBox'] = null;

  if (!nonColliding) {
    const rad = THREE.MathUtils.degToRad(obj.rotationY || 0);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    const effectiveW = obj.width * cos + obj.depth * sin;
    const effectiveD = obj.width * sin + obj.depth * cos;

    collisionBox = {
      minX: obj.x - effectiveW / 2,
      maxX: obj.x + effectiveW / 2,
      minZ: obj.z - effectiveD / 2,
      maxZ: obj.z + effectiveD / 2,
      minY: obj.y,
      maxY: obj.y + obj.height,
    };
  }

  return { group, collisionBox };
}

