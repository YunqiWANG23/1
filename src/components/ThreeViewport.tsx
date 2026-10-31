import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  RoomEnvironmentData,
  SceneObject,
  CameraViewMode,
  CollisionBox,
  InventoryData,
  EscapeGameData,
  SceneValidationReport,
  EscapePuzzleItem,
  ProximityInteractionTarget,
} from '../types/scene';
import { buildFurnitureObject } from '../utils/furnitureBuilder';
import { createPlayerCharacter } from '../utils/characterBuilder';
import { createWoodPlankTexture, createTileTexture, createWallTexture, createCarpetTexture } from '../utils/proceduralTextures';
import {
  sceneObjectRegistry,
  buildSceneObjectFromInventoryItem,
  validateSceneGraph,
} from '../utils/escapeRoomData';
import {
  detectProximityInteraction,
  resolvePuzzleClueAnchors,
} from '../utils/interactionSystem';
import { soundManager } from '../utils/audio';

interface ThreeViewportProps {
  roomData: RoomEnvironmentData;
  inventoryData: InventoryData;
  gameData: EscapeGameData;
  viewMode: CameraViewMode;
  onSelectObject: (obj: SceneObject | null) => void;
  onUpdatePlayerPos: (x: number, z: number, rotation: number) => void;
  onCollisionBoxesUpdate: (boxes: CollisionBox[]) => void;
  onValidationReport: (report: SceneValidationReport) => void;
  resetCameraTrigger: number;
  focusObjectTrigger: { id: string; count: number } | null;
  highlightedObjectId: string | null;
  isFlashlightOn: boolean;
  onToggleFlashlight: () => void;
  // Escape-room gameplay props
  isModalOpen: boolean;
  solvedPuzzleIds: Set<string>;
  solvedTargetIds: Set<string>;
  discoveredClueIds?: Set<string>;
  isDevMode?: boolean;
  allPuzzlesSolved: boolean;
  isDoorOpen: boolean;
  onProximityTargetChange: (target: ProximityInteractionTarget | null) => void;
  onInteractTrigger: () => void;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  roomData,
  inventoryData,
  gameData,
  viewMode,
  onSelectObject,
  onUpdatePlayerPos,
  onCollisionBoxesUpdate,
  onValidationReport,
  resetCameraTrigger,
  focusObjectTrigger,
  highlightedObjectId,
  isFlashlightOn,
  onToggleFlashlight,
  isModalOpen,
  solvedPuzzleIds,
  solvedTargetIds,
  discoveredClueIds = new Set(),
  isDevMode = false,
  allPuzzlesSolved,
  isDoorOpen,
  onProximityTargetChange,
  onInteractTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef({
    viewMode,
    roomData,
    inventoryData,
    gameData,
    resetCameraTrigger,
    focusObjectTrigger,
    highlightedObjectId,
    isFlashlightOn,
    isModalOpen,
    solvedPuzzleIds,
    solvedTargetIds,
    discoveredClueIds,
    isDevMode,
    allPuzzlesSolved,
    isDoorOpen,
    onSelectObject,
    onUpdatePlayerPos,
    onCollisionBoxesUpdate,
    onValidationReport,
    onToggleFlashlight,
    onProximityTargetChange,
    onInteractTrigger,
  });

  useEffect(() => {
    stateRef.current.viewMode = viewMode;
    stateRef.current.roomData = roomData;
    stateRef.current.inventoryData = inventoryData;
    stateRef.current.gameData = gameData;
    stateRef.current.focusObjectTrigger = focusObjectTrigger;
    stateRef.current.highlightedObjectId = highlightedObjectId;
    stateRef.current.isFlashlightOn = isFlashlightOn;
    stateRef.current.isModalOpen = isModalOpen;
    stateRef.current.solvedPuzzleIds = solvedPuzzleIds;
    stateRef.current.solvedTargetIds = solvedTargetIds;
    stateRef.current.discoveredClueIds = discoveredClueIds;
    stateRef.current.isDevMode = isDevMode;
    stateRef.current.allPuzzlesSolved = allPuzzlesSolved;
    stateRef.current.isDoorOpen = isDoorOpen;
    stateRef.current.onSelectObject = onSelectObject;
    stateRef.current.onUpdatePlayerPos = onUpdatePlayerPos;
    stateRef.current.onCollisionBoxesUpdate = onCollisionBoxesUpdate;
    stateRef.current.onValidationReport = onValidationReport;
    stateRef.current.onToggleFlashlight = onToggleFlashlight;
    stateRef.current.onProximityTargetChange = onProximityTargetChange;
    stateRef.current.onInteractTrigger = onInteractTrigger;
  }, [
    viewMode,
    roomData,
    inventoryData,
    gameData,
    focusObjectTrigger,
    highlightedObjectId,
    isFlashlightOn,
    isModalOpen,
    solvedPuzzleIds,
    solvedTargetIds,
    discoveredClueIds,
    isDevMode,
    allPuzzlesSolved,
    isDoorOpen,
    onSelectObject,
    onUpdatePlayerPos,
    onCollisionBoxesUpdate,
    onValidationReport,
    onToggleFlashlight,
    onProximityTargetChange,
    onInteractTrigger,
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL per Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Setup Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Setup Haunted / Escape Room Scene Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070A10'); // Deep eerie midnight blue-black
    scene.fog = new THREE.FogExp2('#070A10', 0.065); // Atmospheric indoor haze / smoke

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera Setup - Extended far plane for grand audit halls
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      350
    );

    // 4. Room Geometry & Plausibility
    const roomWidth = Math.max(5.0, roomData.roomWidth || 15.0);
    const roomLength = Math.max(6.0, roomData.roomLength || 22.0);
    const roomHeight = Math.max(3.0, roomData.roomHeight || 6.5);

    const isAuditOrLargeRoom = roomWidth >= 11.0 || roomLength >= 14.0 || roomHeight >= 4.5;
    let camYaw = Math.PI;
    let camPitch = 0.30;
    let camDist = isAuditOrLargeRoom ? 5.2 : 3.6;
    let targetCamDist = isAuditOrLargeRoom ? 5.2 : 3.6;

    // Math helpers (Zero GC)
    const _charPos = new THREE.Vector3();
    const _camPos = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const _moveDir = new THREE.Vector3();
    const _raycaster = new THREE.Raycaster();
    const _mouse = new THREE.Vector2();

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // 4.5. Tiered Lecture Theatre / Auditorium Stepped Floor Elevation System
    // Automatically detect or use roomData.tieredFloor so rear rows NEVER float in midair!
    const hasLectureRows = (roomData.objects || []).some(
      (o) => o.type === 'lecture_row' || ((o.type === 'chair' || o.type === 'table') && (o.y || 0) > 0.22)
    );
    const isLectureTheatre =
      Boolean(roomData.tieredFloor?.enabled) ||
      hasLectureRows ||
      (roomData.roomType || '').toLowerCase().includes('lecture') ||
      (roomData.roomType || '').toLowerCase().includes('阶梯') ||
      (roomData.roomType || '').toLowerCase().includes('auditorium');

    const tierCfg = roomData.tieredFloor?.enabled
      ? roomData.tieredFloor
      : isLectureTheatre
      ? {
          enabled: true,
          startZ: -3.8,
          endZ: roomLength / 2 - 0.8,
          numTiers: 10,
          stepHeight: 0.28,
          aisleXPositions: [-3.1, 3.1],
        }
      : null;

    // Ground height function: returns exact stepped floor height at any (x, z)
    function getFloorElevationAt(x: number, z: number): number {
      if (!tierCfg || !tierCfg.enabled) return 0;
      if (z < tierCfg.startZ) return 0;
      const tierDepth = (tierCfg.endZ - tierCfg.startZ) / tierCfg.numTiers;
      const tierIdx = Math.min(
        tierCfg.numTiers - 1,
        Math.max(0, Math.floor((z - tierCfg.startZ) / tierDepth))
      );
      return (tierIdx + 1) * tierCfg.stepHeight;
    }

    // Floor Texture & Material (Carved Castle Flagstones for Lecture Hall / Sanctum, Tile or Wood otherwise)
    let floorTexture: THREE.CanvasTexture;
    if (roomData.floorType === 'carpet' || isLectureTheatre) {
      floorTexture = createCarpetTexture(
        roomData.floorColor || '#262932',
        Math.ceil(roomWidth / 1.5),
        Math.ceil(roomLength / 1.5)
      );
    } else if (roomData.floorType === 'tiles') {
      floorTexture = createTileTexture(roomData.floorColor, Math.ceil(roomWidth), Math.ceil(roomLength));
    } else {
      floorTexture = createWoodPlankTexture(roomData.floorColor, Math.ceil(roomWidth / 1.4), Math.ceil(roomLength / 1.4));
    }
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: isLectureTheatre ? 0.82 : 0.6,
      metalness: isLectureTheatre ? 0.08 : 0.15,
    });
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // Royal Crimson & Gold Sanctuary Floor Runner leading up to the Ritual Altar
    if (isLectureTheatre) {
      const altarRunnerMat = new THREE.MeshStandardMaterial({
        color: '#58111A',
        roughness: 0.85,
        metalness: 0.05,
      });
      const runnerTrimMat = new THREE.MeshStandardMaterial({
        color: '#C9A24B',
        roughness: 0.32,
        metalness: 0.82,
      });
      const stageRunner = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.008, 4.2),
        altarRunnerMat
      );
      stageRunner.position.set(0, 0.004, -6.2);
      stageRunner.receiveShadow = true;
      roomGroup.add(stageRunner);

      const stageRunnerBorder = new THREE.Mesh(
        new THREE.BoxGeometry(3.52, 0.006, 4.32),
        runnerTrimMat
      );
      stageRunnerBorder.position.set(0, 0.002, -6.2);
      roomGroup.add(stageRunnerBorder);
    }

    // Build Solid Rising Stepped Stone Platforms, Tarnished Brass Step Nosing & Crimson-Runner Stair Aisles
    if (tierCfg && tierCfg.enabled) {
      const tierDepth = (tierCfg.endZ - tierCfg.startZ) / tierCfg.numTiers;
      const nosingMat = new THREE.MeshStandardMaterial({
        color: '#9A7B38', // Tarnished medieval brass & dark-oak nosing
        roughness: 0.35,
        metalness: 0.78,
      });
      const riserMat = new THREE.MeshStandardMaterial({
        color: '#181B22', // Chiseled dark slate stone riser
        roughness: 0.88,
        metalness: 0.1,
      });
      const runnerCarpetMat = new THREE.MeshStandardMaterial({
        color: '#5E131D', // Worn royal crimson velvet aisle stair runner
        roughness: 0.86,
        metalness: 0.05,
      });
      const sanctumLineMat = new THREE.MeshStandardMaterial({
        color: '#B8903C',
        roughness: 0.3,
        metalness: 0.85,
        emissive: '#3A2608',
        emissiveIntensity: 0.25,
      });

      // Engraved Gilded Sanctum Threshold Border in front of the first tier
      const boundaryLine = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth * 0.72, 0.008, 0.06),
        sanctumLineMat
      );
      boundaryLine.position.set(0, 0.004, tierCfg.startZ - 0.65);
      roomGroup.add(boundaryLine);

      for (let t = 0; t < tierCfg.numTiers; t++) {
        const currentTopY = (t + 1) * tierCfg.stepHeight;
        const zFront = tierCfg.startZ + t * tierDepth;
        const zCenter = zFront + tierDepth / 2;

        // Solid tiered stone platform block from floor y=0 up to currentTopY (Zero hollow space underneath!)
        const tierBlock = new THREE.Mesh(
          new THREE.BoxGeometry(roomWidth - 0.08, currentTopY, tierDepth + 0.02),
          floorMat
        );
        tierBlock.position.set(0, currentTopY / 2, zCenter);
        tierBlock.castShadow = true;
        tierBlock.receiveShadow = true;
        roomGroup.add(tierBlock);

        // Chiseled dark stone vertical riser face
        const riserFace = new THREE.Mesh(
          new THREE.PlaneGeometry(roomWidth - 0.08, tierCfg.stepHeight),
          riserMat
        );
        riserFace.rotation.y = Math.PI;
        riserFace.position.set(0, currentTopY - tierCfg.stepHeight / 2, zFront - 0.012);
        roomGroup.add(riserFace);

        // Tarnished brass & carved oak step nosing strip along the front edge of the tier
        const nosing = new THREE.Mesh(
          new THREE.BoxGeometry(roomWidth - 0.06, 0.026, 0.046),
          nosingMat
        );
        nosing.position.set(0, currentTopY + 0.002, zFront);
        roomGroup.add(nosing);

        // Intermediate half-step stone treads & royal crimson stair runners in the longitudinal aisles
        (tierCfg.aisleXPositions || [-3.1, 3.1]).forEach((aisleX) => {
          // Crimson aisle runner strip on the main tier tread
          const tierRunner = new THREE.Mesh(
            new THREE.BoxGeometry(1.06, 0.008, tierDepth - 0.02),
            runnerCarpetMat
          );
          tierRunner.position.set(aisleX, currentTopY + 0.004, zCenter);
          tierRunner.receiveShadow = true;
          roomGroup.add(tierRunner);

          const halfStepH = tierCfg.stepHeight * 0.5;
          const halfStepDepth = 0.28;
          const halfStep = new THREE.Mesh(
            new THREE.BoxGeometry(1.15, halfStepH, halfStepDepth),
            riserMat
          );
          halfStep.position.set(
            aisleX,
            currentTopY - tierCfg.stepHeight + halfStepH / 2,
            zFront - halfStepDepth / 2
          );
          halfStep.castShadow = true;
          halfStep.receiveShadow = true;
          roomGroup.add(halfStep);

          const halfStepRunner = new THREE.Mesh(
            new THREE.BoxGeometry(1.04, 0.008, halfStepDepth - 0.02),
            runnerCarpetMat
          );
          halfStepRunner.position.set(
            aisleX,
            currentTopY - tierCfg.stepHeight + halfStepH + 0.004,
            zFront - halfStepDepth / 2
          );
          roomGroup.add(halfStepRunner);

          const halfNosing = new THREE.Mesh(
            new THREE.BoxGeometry(1.16, 0.018, 0.032),
            nosingMat
          );
          halfNosing.position.set(
            aisleX,
            currentTopY - tierCfg.stepHeight + halfStepH + 0.002,
            zFront - halfStepDepth
          );
          roomGroup.add(halfNosing);
        });
      }

      // Rear Upper Walkway Platform behind the last tier up to back wall
      const topHeight = tierCfg.numTiers * tierCfg.stepHeight;
      const rearDepth = Math.max(0.4, roomLength / 2 - tierCfg.endZ);
      if (rearDepth > 0.05) {
        const rearBlock = new THREE.Mesh(
          new THREE.BoxGeometry(roomWidth - 0.08, topHeight, rearDepth),
          floorMat
        );
        rearBlock.position.set(0, topHeight / 2, tierCfg.endZ + rearDepth / 2);
        rearBlock.receiveShadow = true;
        roomGroup.add(rearBlock);
      }
    }

    // Ceiling & Wall Construction (Medieval Gothic Haunted Castle Stone & Vaulted Timber)
    const gothicWallHex =
      !roomData.wallColor ||
      roomData.wallColor.toUpperCase() === '#EAECEF' ||
      roomData.wallColor.toUpperCase() === '#F4F6F8'
        ? '#282C35'
        : roomData.wallColor;
    const gothicCeilingHex =
      !roomData.ceilingColor ||
      roomData.ceilingColor.toUpperCase() === '#F1F5F9' ||
      roomData.ceilingColor.toUpperCase() === '#FFFFFF'
        ? '#14171F'
        : roomData.ceilingColor;

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(gothicCeilingHex),
      roughness: 0.88,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const ceilingGeo = new THREE.PlaneGeometry(roomWidth, roomLength);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.y = roomHeight;
    roomGroup.add(ceilingMesh);

    const wallTexture = createWallTexture(gothicWallHex);
    wallTexture.repeat.set(Math.ceil(roomWidth / 2.8), Math.ceil(roomHeight / 2.5));
    wallTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: new THREE.Color('#FFFFFF'),
      roughness: 0.82,
      metalness: 0.06,
    });

    // Back Wall (Front Sanctuary / Altar Wall at z = -roomLength / 2)
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomWidth, roomHeight), wallMat);
    backWall.position.set(0, roomHeight / 2, -roomLength / 2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Left Wall
    const leftWallGeo = new THREE.PlaneGeometry(roomLength, roomHeight);
    leftWallGeo.rotateY(Math.PI / 2);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right Wall
    const rightWallGeo = new THREE.PlaneGeometry(roomLength, roomHeight);
    rightWallGeo.rotateY(-Math.PI / 2);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Ornate Carved Dark-Oak Wainscoting Dado Panelling & Tarnished Gold Frieze Mouldings on all walls
    const wainscotH = Math.min(1.45, roomHeight * 0.24);
    const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x1b110b, roughness: 0.5, metalness: 0.12 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.3, metalness: 0.85 });
    const stoneTrimMat = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.75, metalness: 0.12 });
    const darkTimberMat = new THREE.MeshStandardMaterial({ color: 0x18100a, roughness: 0.6, metalness: 0.14 });
    const wroughtIronMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.42, metalness: 0.82 });

    const dadoBack = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, wainscotH, 0.06), wainscotMat);
    dadoBack.position.set(0, wainscotH / 2, -roomLength / 2 + 0.03);
    roomGroup.add(dadoBack);
    const goldRailBack = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.05, 0.08), goldTrimMat);
    goldRailBack.position.set(0, wainscotH, -roomLength / 2 + 0.04);
    roomGroup.add(goldRailBack);

    const dadoLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, wainscotH, roomLength), wainscotMat);
    dadoLeft.position.set(-roomWidth / 2 + 0.03, wainscotH / 2, 0);
    roomGroup.add(dadoLeft);
    const goldRailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, roomLength), goldTrimMat);
    goldRailLeft.position.set(-roomWidth / 2 + 0.04, wainscotH, 0);
    roomGroup.add(goldRailLeft);

    const dadoRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, wainscotH, roomLength), wainscotMat);
    dadoRight.position.set(roomWidth / 2 - 0.03, wainscotH / 2, 0);
    roomGroup.add(dadoRight);
    const goldRailRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, roomLength), goldTrimMat);
    goldRailRight.position.set(roomWidth / 2 - 0.04, wainscotH, 0);
    roomGroup.add(goldRailRight);

    const flickeringLights: { light: THREE.PointLight; baseIntensity: number }[] = [];

    if (isLectureTheatre) {
      // Rear Upper Carved Medieval Dark-Oak Triforium Gallery Wall behind the top tier
      const topFloorY = tierCfg ? tierCfg.numTiers * tierCfg.stepHeight : 2.8;
      const rearPanelH = Math.max(2.2, roomHeight - topFloorY);
      const rearTimberWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, rearPanelH, 0.16),
        wainscotMat
      );
      rearTimberWall.position.set(0, topFloorY + rearPanelH / 2, roomLength / 2 - 0.08);
      rearTimberWall.receiveShadow = true;
      roomGroup.add(rearTimberWall);

      // Gilded cornice & vertical gothic mullion ribs along the rear gallery wall
      const rearGoldCornice = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, 0.08, 0.22),
        goldTrimMat
      );
      rearGoldCornice.position.set(0, topFloorY + rearPanelH - 0.12, roomLength / 2 - 0.11);
      roomGroup.add(rearGoldCornice);

      const numRearMullions = 10;
      for (let m = 0; m <= numRearMullions; m++) {
        const mx = -roomWidth * 0.46 + (m / numRearMullions) * (roomWidth * 0.92);
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, rearPanelH, 0.22),
          darkTimberMat
        );
        mullion.position.set(mx, topFloorY + rearPanelH / 2, roomLength / 2 - 0.11);
        roomGroup.add(mullion);
      }

      // Engaged Gothic Stone Buttress Columns, Wall Sconce Torches & Stained-Glass Lancet Windows along Left & Right Walls
      const numBays = 6;
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xffaa22,
        emissive: 0xff6600,
        emissiveIntensity: 2.8,
        roughness: 0.2,
      });

      for (let b = 0; b < numBays; b++) {
        const bz = -roomLength * 0.39 + (b / (numBays - 1)) * (roomLength * 0.78);

        [-1, 1].forEach((sideSign) => {
          const bx = sideSign * (roomWidth / 2 - 0.18);

          // Heavy Gothic Stone Buttress Column
          const buttressShaft = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, roomHeight, 0.48),
            stoneTrimMat
          );
          buttressShaft.position.set(bx, roomHeight / 2, bz);
          buttressShaft.castShadow = true;
          buttressShaft.receiveShadow = true;
          roomGroup.add(buttressShaft);

          // Molded Stone Plinth & Capital with Gold Ring
          const capital = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.28, 0.58),
            stoneTrimMat
          );
          capital.position.set(bx, roomHeight - 0.45, bz);
          roomGroup.add(capital);

          const goldBand = new THREE.Mesh(
            new THREE.BoxGeometry(0.44, 0.06, 0.54),
            goldTrimMat
          );
          goldBand.position.set(bx, roomHeight - 0.62, bz);
          roomGroup.add(goldBand);

          // Wrought-Iron Wall Torch Sconce mounted on the inner face of every buttress
          const sconceY = Math.min(roomHeight - 1.4, getFloorElevationAt(0, bz) + 2.35);
          const torchX = bx - sideSign * 0.24;

          const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.06, 0.06),
            wroughtIronMat
          );
          bracket.position.set(torchX, sconceY, bz);
          roomGroup.add(bracket);

          const torchBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.055, 0.025, 0.42, 8),
            wroughtIronMat
          );
          torchBody.position.set(torchX - sideSign * 0.06, sconceY + 0.16, bz);
          roomGroup.add(torchBody);

          const torchCup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.085, 0.045, 0.1, 8),
            goldTrimMat
          );
          torchCup.position.set(torchX - sideSign * 0.06, sconceY + 0.36, bz);
          roomGroup.add(torchCup);

          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.065, 0.2, 8),
            flameMat
          );
          flame.position.set(torchX - sideSign * 0.06, sconceY + 0.48, bz);
          roomGroup.add(flame);

          // Add PointLight on alternate bays for rich warm flickering torchlight without exceeding WebGL light uniforms
          if (b % 2 === (sideSign < 0 ? 0 : 1)) {
            const torchLight = new THREE.PointLight('#F59E0B', 1.55, 11.5);
            torchLight.position.set(torchX - sideSign * 0.25, sconceY + 0.52, bz);
            roomGroup.add(torchLight);
            flickeringLights.push({ light: torchLight, baseIntensity: 1.55 });
          }
        });

        // Tall Gothic Stained-Glass Lancet Windows centered in the bays between stone buttresses
        if (b < numBays - 1) {
          const nextBz = -roomLength * 0.39 + ((b + 1) / (numBays - 1)) * (roomLength * 0.78);
          const winZ = (bz + nextBz) * 0.5;
          const winElevation = Math.max(2.9, getFloorElevationAt(0, winZ) + 1.45);
          const winHeight = Math.min(2.85, Math.max(1.6, roomHeight - winElevation - 0.55));

          if (winHeight >= 1.5) {
            [-1, 1].forEach((sideSign) => {
              const winBuilt = buildFurnitureObject({
                id: `gothic_lancet_window_${sideSign < 0 ? 'L' : 'R'}_${b}`,
                name: 'Tall Gothic Stained-Glass Lancet Window',
                type: 'window',
                x: sideSign * (roomWidth / 2 - 0.06),
                y: winElevation,
                z: winZ,
                width: 1.45,
                height: winHeight,
                depth: 0.18,
                rotationY: sideSign < 0 ? 90 : -90,
                primaryColor: '#1E293B',
                secondaryColor: '#38BDF8',
              });
              roomGroup.add(winBuilt.group);
            });
          }
        }
      }

      // Vaulted Gothic Heavy Dark-Oak Hammerbeam Roof Trusses & Suspended Wrought-Iron Chandeliers
      for (let row = 0; row < 5; row++) {
        const rz = -roomLength * 0.36 + row * (roomLength * 0.18);

        // Main transverse dark-oak tie beam
        const tieBeam = new THREE.Mesh(
          new THREE.BoxGeometry(roomWidth - 0.2, 0.34, 0.32),
          darkTimberMat
        );
        tieBeam.position.set(0, roomHeight - 0.22, rz);
        tieBeam.castShadow = true;
        tieBeam.receiveShadow = true;
        roomGroup.add(tieBeam);

        // Central gilded bosses & king-post struts
        const kingPost = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.65, 0.26),
          darkTimberMat
        );
        kingPost.position.set(0, roomHeight - 0.45, rz);
        roomGroup.add(kingPost);

        const goldBoss = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12),
          goldTrimMat
        );
        goldBoss.position.set(0, roomHeight - 0.42, rz);
        roomGroup.add(goldBoss);

        // Left & Right Hammerbeam Arched Timber Brackets
        [-1, 1].forEach((sideSign) => {
          const brace = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.24, 0.26),
            darkTimberMat
          );
          brace.position.set(sideSign * (roomWidth / 2 - 1.35), roomHeight - 0.85, rz);
          brace.rotation.z = sideSign * 0.42;
          roomGroup.add(brace);
        });

        // Longitudinal vaulted purlin ribs running the length of the ceiling
        if (row === 0) {
          [-roomWidth * 0.28, 0, roomWidth * 0.28].forEach((px) => {
            const purlin = new THREE.Mesh(
              new THREE.BoxGeometry(0.22, 0.22, roomLength),
              darkTimberMat
            );
            purlin.position.set(px, roomHeight - 0.12, 0);
            roomGroup.add(purlin);
          });
        }

        // Suspend Grand Wrought-Iron Candle Chandeliers from the trusses
        const chandelierColumns = row % 2 === 0 ? [-roomWidth * 0.24, roomWidth * 0.24] : [0];
        chandelierColumns.forEach((cx, cIdx) => {
          const chDrop = 1.65;
          const chandelierBuilt = buildFurnitureObject({
            id: `sanctum_chandelier_${row}_${cIdx}`,
            name: 'Wrought-Iron Sanctuary Candle Chandelier',
            type: 'chandelier',
            x: cx,
            y: roomHeight - chDrop,
            z: rz,
            width: 1.55,
            height: chDrop,
            depth: 1.55,
            rotationY: (row * 35) % 360,
            primaryColor: '#1C1917',
            secondaryColor: '#F59E0B',
          });
          roomGroup.add(chandelierBuilt.group);
        });

        // Warm Flickering Candlelight PointLight per truss bay
        const rowLight = new THREE.PointLight('#FFA726', 2.15, Math.max(roomWidth, roomLength) * 0.92);
        rowLight.position.set(0, roomHeight - 1.4, rz);
        roomGroup.add(rowLight);
        flickeringLights.push({ light: rowLight, baseIntensity: 2.15 });
      }
    } else {
      // Front Wall (Semi-transparent cutaway for non-lecture rooms)
      const frontWallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(gothicWallHex),
        roughness: 0.85,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      });
      const frontWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
      frontWallGeo.rotateY(Math.PI);
      const frontWall = new THREE.Mesh(frontWallGeo, frontWallMat);
      frontWall.position.set(0, roomHeight / 2, roomLength / 2);
      roomGroup.add(frontWall);

      if (roomHeight >= 3.8) {
        const beamSpacing = 4.2;
        const numBeams = Math.max(2, Math.floor(roomLength / beamSpacing));
        const beamGeo = new THREE.BoxGeometry(roomWidth, 0.36, 0.30);

        for (let b = 0; b <= numBeams; b++) {
          const beamZ = -roomLength / 2 + (b + 0.5) * (roomLength / (numBeams + 1));
          const beam = new THREE.Mesh(beamGeo, darkTimberMat);
          beam.position.set(0, roomHeight - 0.18, beamZ);
          beam.castShadow = true;
          beam.receiveShadow = true;
          roomGroup.add(beam);
        }

        const numChandeliers = Math.max(1, Math.floor(roomLength / 7.5));
        for (let c = 0; c < numChandeliers; c++) {
          const cZ = numChandeliers === 1
            ? 0
            : -roomLength * 0.32 + (c / (numChandeliers - 1)) * (roomLength * 0.64);
          const chY = roomHeight - Math.min(2.1, roomHeight * 0.28);

          const chLight = new THREE.PointLight('#FFA726', 2.2, Math.max(roomWidth, roomLength) * 0.95);
          chLight.position.set(0, chY, cZ);
          chLight.userData = { isFlickering: true, baseIntensity: 2.2 };
          roomGroup.add(chLight);
          flickeringLights.push({ light: chLight, baseIntensity: 2.2 });
        }
      }
    }

    // 6. Lighting Rig (Medieval Gothic Haunted Castle: Cold Moonlight vs Warm Flickering Candlelight)
    const mainDirLight = new THREE.DirectionalLight('#60A5FA', 0.92);
    mainDirLight.position.set(roomWidth * 0.35, roomHeight * 1.4, -roomLength * 0.25);
    mainDirLight.castShadow = !isSoftwareGl;
    mainDirLight.shadow.mapSize.width = 1024;
    mainDirLight.shadow.mapSize.height = 1024;
    mainDirLight.shadow.camera.near = 0.5;
    mainDirLight.shadow.camera.far = Math.max(roomWidth, roomLength) * 3.5;
    const shadowSize = Math.max(roomWidth, roomLength) * 0.85;
    mainDirLight.shadow.camera.left = -shadowSize;
    mainDirLight.shadow.camera.right = shadowSize;
    mainDirLight.shadow.camera.top = shadowSize;
    mainDirLight.shadow.camera.bottom = -shadowSize;
    mainDirLight.shadow.bias = -0.0005;
    scene.add(mainDirLight);

    // Subtle Gothic twilight fill so stone carvings, pews, and clues remain clearly readable
    const hemiLight = new THREE.HemisphereLight('#3B4B6B', '#141118', 0.68);
    scene.add(hemiLight);

    // Dedicated warm ritual spotlight glow over the front altar / stage area
    const altarLight = new THREE.PointLight('#F59E0B', 2.4, 14.0);
    altarLight.position.set(0.5, 2.8, -6.4);
    roomGroup.add(altarLight);
    flickeringLights.push({ light: altarLight, baseIntensity: 2.4 });

    if (isLectureTheatre) {
      scene.background = new THREE.Color('#090C14');
      scene.fog = new THREE.FogExp2('#090C14', 0.017);
    }

    // Floating Dust Motes in the air
    const moteCount = Math.min(250, Math.floor((roomWidth * roomLength) / 3.0));
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * (roomWidth * 0.92);
      motePos[i * 3 + 1] = Math.random() * (roomHeight * 0.92) + 0.1;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * (roomLength * 0.92);
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffdfaa,
      size: 0.022,
      transparent: true,
      opacity: 0.3,
    });
    const dustMotes = new THREE.Points(moteGeo, moteMat);
    scene.add(dustMotes);

    // 7. Build Realistic Furniture & Snap Floor Objects onto Stepped Tier Elevation (Zero Floating Chairs!)
    // 7. Build Realistic Furniture, Populate sceneObjectRegistry & Validate Mandatory Puzzle Objects
    const interactiveObjects: THREE.Group[] = [];
    const exitDoorGroups: THREE.Group[] = [];
    const collisionBoxes: CollisionBox[] = [];
    const allInstantiatedSceneObjects = new Map<string, SceneObject>();
    const fallbackInstantiatedIds = new Set<string>();

    sceneObjectRegistry.clear();

    const inventoryById = new Map<string, (typeof inventoryData.objects)[number]>();
    (inventoryData.objects || []).forEach((item) => {
      inventoryById.set(item.id, item);
    });

    const puzzleByTargetId = new Map<string, EscapePuzzleItem>();
    (gameData.puzzles || []).forEach((p) => {
      if (p.target) {
        puzzleByTargetId.set(p.target, p);
      }
    });

    const wallMountedTypes = new Set([
      'wall_art',
      'banner',
      'projection_screen',
      'window',
      'chandelier',
    ]);

    function instantiateAndRegisterObject(rawObj: SceneObject) {
      // Prevent duplicate entities with the same ID in the scene graph
      if (allInstantiatedSceneObjects.has(rawObj.id)) {
        return;
      }

      const invItem = inventoryById.get(rawObj.id);
      const matchedPuzzle = puzzleByTargetId.get(rawObj.id);

      const tierElevation = getFloorElevationAt(rawObj.x, rawObj.z);
      const isWallOrCeilingItem =
        wallMountedTypes.has(rawObj.type) ||
        (rawObj.type !== 'chair' &&
          rawObj.type !== 'armchair' &&
          rawObj.type !== 'table' &&
          rawObj.type !== 'desk' &&
          rawObj.type !== 'lecture_row' &&
          rawObj.type !== 'whiteboard' &&
          (rawObj.y || 0) > 3.1);

      // Preserve explicit supporting-surface elevation for podium/desk/stacked inventory objects!
      const shouldPreserveExplicitY =
        Boolean(rawObj.preserveElevation) ||
        Boolean(rawObj.isInventoryProp) ||
        isWallOrCeilingItem;

      const snappedY = shouldPreserveExplicitY
        ? rawObj.y || 0
        : tierCfg && tierCfg.enabled
        ? tierElevation
        : rawObj.y || 0;

      const obj: SceneObject = {
        ...rawObj,
        y: snappedY,
        rotationY: rawObj.type === 'lecture_row' ? 0 : rawObj.rotationY,
        interactive:
          rawObj.interactive !== undefined
            ? rawObj.interactive
            : Boolean(matchedPuzzle) || Boolean(invItem?.portable),
        puzzleId: rawObj.puzzleId || matchedPuzzle?.id,
        rewardDigit: rawObj.rewardDigit || matchedPuzzle?.reward_digit,
        clue: rawObj.clue || matchedPuzzle?.clue,
        locationText: rawObj.locationText || invItem?.location,
        supportingSurface:
          rawObj.supportingSurface ||
          (snappedY > 0.05 ? `elevated_surface (y=${snappedY.toFixed(2)}m)` : 'floor_carpet (y=0.00m)'),
      };

      const { group, collisionBox } = buildFurnitureObject(obj);
      roomGroup.add(group);
      interactiveObjects.push(group);
      allInstantiatedSceneObjects.set(obj.id, obj);
      if (group.userData?.isExitDoor) {
        exitDoorGroups.push(group);
      }

      // Register in authoritative runtime sceneObjectRegistry
      sceneObjectRegistry.set(obj.id, {
        id: obj.id,
        name: obj.name,
        interactive: Boolean(obj.interactive),
        puzzleId: obj.puzzleId,
        rewardDigit: obj.rewardDigit,
        clue: obj.clue,
        color: invItem?.color || obj.primaryColor,
        location: obj.locationText || invItem?.location || 'room environment',
        supportingSurface: obj.supportingSurface || 'floor_carpet',
        photoIndex: obj.photoIndex ?? invItem?.image_ref?.photo_index,
        box2d: obj.box2d ?? invItem?.image_ref?.box_2d,
        position: { x: obj.x, y: obj.y, z: obj.z },
        dimensions: { width: obj.width, height: obj.height, depth: obj.depth },
        sceneObject: group,
      });

      // Collect any interior flickering lights
      group.traverse((child) => {
        if ((child as THREE.PointLight).isPointLight && child.userData?.isFlickering) {
          flickeringLights.push({
            light: child as THREE.PointLight,
            baseIntensity: child.userData.baseIntensity || (child as THREE.PointLight).intensity,
          });
        }
      });

      if (collisionBox) {
        collisionBoxes.push({
          id: obj.id,
          name: obj.name,
          ...collisionBox,
        });
      }
    }

    // First instantiate all objects from roomData.objects
    (roomData.objects || []).forEach((rawObj) => {
      instantiateAndRegisterObject(rawObj);
    });

    // Also ensure all inventory.objects are instantiated in the scene if a newly generated AI room omitted any of them
    (inventoryData.objects || []).forEach((invItem, idx) => {
      if (!sceneObjectRegistry.has(invItem.id)) {
        const fallbackObj = buildSceneObjectFromInventoryItem(invItem, puzzleByTargetId, idx);
        if (puzzleByTargetId.has(invItem.id)) {
          fallbackInstantiatedIds.add(invItem.id);
        }
        instantiateAndRegisterObject(fallbackObj);
      }
    });

    // Requirement 7 Fallback Guarantee: Verify every game.puzzles[].target has a 3D entity in sceneObjectRegistry
    (gameData.puzzles || []).forEach((puzzle, idx) => {
      const targetId = puzzle.target;
      const invItem = inventoryById.get(targetId);
      if (invItem && !sceneObjectRegistry.has(targetId)) {
        const fallbackObj = buildSceneObjectFromInventoryItem(invItem, puzzleByTargetId, idx);
        fallbackInstantiatedIds.add(targetId);
        instantiateAndRegisterObject(fallbackObj);
      }
    });

    // Run automatic 6-point Three.js scene-graph validation and report results
    const validationReport = validateSceneGraph(
      roomGroup,
      roomData,
      inventoryData,
      gameData,
      sceneObjectRegistry,
      fallbackInstantiatedIds
    );
    stateRef.current.onValidationReport(validationReport);
    stateRef.current.onCollisionBoxesUpdate(collisionBoxes);

    // Floating 3D Highlight Beacon for inspecting objects in Dev Mode
    const highlightBeacon = new THREE.Group();
    const beaconCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.20, 12),
      new THREE.MeshBasicMaterial({ color: '#F59E0B' })
    );
    beaconCone.rotation.x = Math.PI;
    beaconCone.position.y = 0.25;
    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(0.14, 0.19, 28),
      new THREE.MeshBasicMaterial({
        color: '#FBBF24',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      })
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.01;
    highlightBeacon.add(beaconCone, beaconRing);
    highlightBeacon.visible = false;
    scene.add(highlightBeacon);

    // 3D Clue Anchor Artifacts & Glyphs at each puzzle's `clueAnchorId` (Strictly separated from `puzzle.target`!)
    function createClueAnchorArtifactMesh(
      archetype: 'spellbook' | 'recipe_scroll' | 'runic_inscription' | 'torn_letter'
    ): THREE.Group {
      const artifact = new THREE.Group();
      const brassMat = new THREE.MeshStandardMaterial({
        color: '#B48232',
        roughness: 0.35,
        metalness: 0.8,
      });
      const parchmentMat = new THREE.MeshStandardMaterial({
        color: '#E6D7B9',
        roughness: 0.85,
        metalness: 0.05,
      });
      const leatherMat = new THREE.MeshStandardMaterial({
        color: '#3B1E14',
        roughness: 0.72,
        metalness: 0.12,
      });
      const waxMat = new THREE.MeshStandardMaterial({
        color: '#991B1B',
        roughness: 0.45,
        metalness: 0.1,
      });

      if (archetype === 'spellbook') {
        const pedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.14, 0.08, 12),
          brassMat
        );
        pedestal.position.y = 0.04;
        const coverLeft = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.02, 0.22),
          leatherMat
        );
        coverLeft.position.set(-0.075, 0.09, 0);
        coverLeft.rotation.z = 0.22;
        const coverRight = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.02, 0.22),
          leatherMat
        );
        coverRight.position.set(0.075, 0.09, 0);
        coverRight.rotation.z = -0.22;
        const pageLeft = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, 0.19),
          parchmentMat
        );
        pageLeft.position.set(-0.07, 0.105, 0);
        pageLeft.rotation.z = 0.22;
        const pageRight = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, 0.19),
          parchmentMat
        );
        pageRight.position.set(0.07, 0.105, 0);
        pageRight.rotation.z = -0.22;
        artifact.add(pedestal, coverLeft, coverRight, pageLeft, pageRight);
      } else if (archetype === 'recipe_scroll') {
        const tray = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.17, 0.03, 16),
          brassMat
        );
        tray.position.y = 0.015;
        const scrollSheet = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.008, 0.26),
          parchmentMat
        );
        scrollSheet.position.y = 0.035;
        const rollerTop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12),
          leatherMat
        );
        rollerTop.rotation.z = Math.PI / 2;
        rollerTop.position.set(0, 0.045, -0.12);
        const rollerBot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12),
          leatherMat
        );
        rollerBot.rotation.z = Math.PI / 2;
        rollerBot.position.set(0, 0.045, 0.12);
        const seal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12),
          waxMat
        );
        seal.position.set(0.04, 0.044, 0.03);
        artifact.add(tray, scrollSheet, rollerTop, rollerBot, seal);
      } else if (archetype === 'runic_inscription') {
        const stoneMat = new THREE.MeshStandardMaterial({
          color: '#292524',
          roughness: 0.78,
          metalness: 0.2,
        });
        const runeGlowMat = new THREE.MeshStandardMaterial({
          color: '#38BDF8',
          emissive: '#0284C7',
          emissiveIntensity: 0.7,
        });
        const base = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.05, 0.18),
          stoneMat
        );
        base.position.y = 0.025;
        const stele = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.32, 0.06),
          stoneMat
        );
        stele.position.y = 0.20;
        const runeInlay = new THREE.Mesh(
          new THREE.TorusGeometry(0.06, 0.008, 8, 20),
          runeGlowMat
        );
        runeInlay.position.set(0, 0.22, 0.033);
        artifact.add(base, stele, runeInlay);
      } else {
        // torn_letter
        const folio = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.015, 0.20),
          leatherMat
        );
        folio.position.y = 0.01;
        const letter = new THREE.Mesh(
          new THREE.BoxGeometry(0.19, 0.008, 0.16),
          parchmentMat
        );
        letter.position.set(0, 0.022, 0);
        letter.rotation.y = 0.15;
        const waxSeal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.012, 12),
          waxMat
        );
        waxSeal.position.set(0.03, 0.028, 0.02);
        artifact.add(folio, letter, waxSeal);
      }
      return artifact;
    }

    const resolvedAnchors = resolvePuzzleClueAnchors(gameData, sceneObjectRegistry);
    const clueAnchorMarkers: {
      puzzleId: string;
      puzzleIndex: number;
      group: THREE.Group;
      artifactGroup: THREE.Group;
      orbMat: THREE.MeshBasicMaterial;
      ringMat: THREE.MeshBasicMaterial;
      baseY: number;
    }[] = [];

    resolvedAnchors.forEach((anchor) => {
      const markerGroup = new THREE.Group();
      const orbMat = new THREE.MeshBasicMaterial({
        color: '#F59E0B',
        transparent: true,
        opacity: 0.85,
      });
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), orbMat);
      orb.position.y = 0.22;

      const ringMat = new THREE.MeshBasicMaterial({
        color: '#FBBF24',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.21, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;

      markerGroup.add(orb, ring);
      const baseY = anchor.position.y + Math.min(1.55, anchor.dimensions.height + 0.14);
      markerGroup.position.set(anchor.position.x, baseY, anchor.position.z);
      scene.add(markerGroup);

      // Physical 3D Clue Anchor Artifact placed at the investigation landmark
      const artifactGroup = createClueAnchorArtifactMesh(anchor.anchorArchetype);
      const artifactY =
        anchor.dimensions.height <= 1.25
          ? anchor.position.y + anchor.dimensions.height + 0.01
          : anchor.position.y + 0.85;
      artifactGroup.position.set(
        anchor.position.x,
        artifactY,
        anchor.position.z + Math.min(0.32, anchor.dimensions.depth * 0.35)
      );
      scene.add(artifactGroup);

      clueAnchorMarkers.push({
        puzzleId: anchor.puzzleId,
        puzzleIndex: anchor.puzzleIndex,
        group: markerGroup,
        artifactGroup,
        orbMat,
        ringMat,
        baseY,
      });
    });

    // Helper to create a glowing 3D sprite displaying the puzzle's reward_digit
    function createRewardDigitSprite(digit: string): THREE.Sprite {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Outer arcane glow
      const radial = ctx.createRadialGradient(128, 128, 20, 128, 128, 118);
      radial.addColorStop(0, 'rgba(16, 185, 129, 0.92)');
      radial.addColorStop(0.55, 'rgba(5, 150, 105, 0.50)');
      radial.addColorStop(1, 'rgba(6, 78, 59, 0.0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(128, 128, 118, 0, Math.PI * 2);
      ctx.fill();

      // Golden gothic sigil ring
      ctx.strokeStyle = '#FCD34D';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(128, 128, 76, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(128, 128, 64, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing reward digit text
      ctx.font = 'bold 112px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#34D399';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText(String(digit || '?'), 128, 134);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.42, 0.42, 1);
      return sprite;
    }

    // Cursed Seal & Magical Purification Effects for `puzzle.target` Objects
    const solvedGlowGroups = new Map<
      string,
      {
        cursedGroup: THREE.Group;
        cursedRing: THREE.Mesh;
        group: THREE.Group;
        ring: THREE.Mesh;
        crystal: THREE.Mesh;
        digitSprite: THREE.Sprite;
        baseY: number;
      }
    >();

    (gameData.puzzles || []).forEach((puzzle) => {
      const targetEntry = sceneObjectRegistry.get(puzzle.target);
      if (!targetEntry) return;

      // Subtle Cursed Seal Ring (HIDDEN in normal gameplay so puzzle answers are never revealed; only visible in Dev Mode!)
      const cursedGroup = new THREE.Group();
      const cursedRingMat = new THREE.MeshBasicMaterial({
        color: '#991B1B',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const cursedRing = new THREE.Mesh(
        new THREE.RingGeometry(0.13, 0.17, 24),
        cursedRingMat
      );
      cursedRing.rotation.x = -Math.PI / 2;
      cursedRing.position.y = 0.012;
      cursedGroup.add(cursedRing);
      cursedGroup.position.set(
        targetEntry.position.x,
        targetEntry.position.y,
        targetEntry.position.z
      );
      cursedGroup.visible = false;
      scene.add(cursedGroup);

      // Purified Glow + Floating Reward Digit (HIDDEN until solved!)
      const glowGroup = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#34D399',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 32), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;

      const crystalMat = new THREE.MeshBasicMaterial({
        color: '#6EE7B7',
        transparent: true,
        opacity: 0.92,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), crystalMat);
      crystal.position.y = targetEntry.dimensions.height + 0.16;

      const digitSprite = createRewardDigitSprite(puzzle.reward_digit);
      digitSprite.position.set(0, targetEntry.dimensions.height + 0.42, 0);

      const solvedLight = new THREE.PointLight('#10B981', 1.6, 2.8);
      solvedLight.position.set(0, targetEntry.dimensions.height + 0.25, 0);

      glowGroup.add(ring, crystal, digitSprite, solvedLight);
      glowGroup.position.set(
        targetEntry.position.x,
        targetEntry.position.y,
        targetEntry.position.z
      );
      // Strictly invisible until solved!
      glowGroup.visible = false;
      scene.add(glowGroup);

      solvedGlowGroups.set(puzzle.target, {
        cursedGroup,
        cursedRing,
        group: glowGroup,
        ring,
        crystal,
        digitSprite,
        baseY: targetEntry.dimensions.height + 0.16,
      });
    });

    // 7. Calculate Unobstructed Spawn Point
    const charRadius = 0.30;
    let spawnX = roomData.suggestedSpawnPoint?.x ?? -2.2;
    let spawnZ = roomData.suggestedSpawnPoint?.z ?? -5.8;

    function isPositionBlocked(px: number, pz: number): boolean {
      if (
        px < -roomWidth / 2 + charRadius + 0.25 ||
        px > roomWidth / 2 - charRadius - 0.25 ||
        pz < -roomLength / 2 + charRadius + 0.25 ||
        pz > roomLength / 2 - charRadius - 0.25
      ) {
        return true;
      }
      for (const box of collisionBoxes) {
        if (
          px + charRadius > box.minX - 0.04 &&
          px - charRadius < box.maxX + 0.04 &&
          pz + charRadius > box.minZ - 0.04 &&
          pz - charRadius < box.maxZ + 0.04
        ) {
          return true;
        }
      }
      return false;
    }

    if (isPositionBlocked(spawnX, spawnZ)) {
      let found = false;
      for (let r = 0.5; r < Math.min(roomWidth, roomLength) / 2 && !found; r += 0.35) {
        for (let angle = 0; angle < Math.PI * 2 && !found; angle += Math.PI / 6) {
          const testX = Math.cos(angle) * r;
          const testZ = Math.sin(angle) * r;
          if (!isPositionBlocked(testX, testZ)) {
            spawnX = testX;
            spawnZ = testZ;
            found = true;
          }
        }
      }
    }

    const initialFloorY = getFloorElevationAt(spawnX, spawnZ);

    // 8. Player Investigator Character with Working Flashlight
    const player = createPlayerCharacter();
    scene.add(player.root);
    player.root.position.set(spawnX, initialFloorY, spawnZ);

    let charX = spawnX;
    let charY = initialFloorY;
    let charZ = spawnZ;
    let charRotY = 0;
    let targetCharRotY = 0;
    let velocityY = 0;
    let isGrounded = true;
    let footstepTimer = 0;

    // Start eerie room tone on first user interaction
    const handleFirstUserInteraction = () => {
      soundManager.startAmbience();
      window.removeEventListener('keydown', handleFirstUserInteraction);
      window.removeEventListener('mousedown', handleFirstUserInteraction);
    };
    window.addEventListener('keydown', handleFirstUserInteraction);
    window.addEventListener('mousedown', handleFirstUserInteraction);

    // Keyboard Input State
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Do NOT allow movement or scene hotkeys to interfere when any UI modal/panel is active
      if (stateRef.current.isModalOpen) {
        keys.forward = false;
        keys.backward = false;
        keys.left = false;
        keys.right = false;
        keys.jump = false;
        keys.sprint = false;
        return;
      }

      if (e.code === 'KeyE') {
        e.preventDefault();
        stateRef.current.onInteractTrigger();
        return;
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.backward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
      if (e.code === 'Space') {
        if (isGrounded) {
          velocityY = 6.2;
          isGrounded = false;
          soundManager.playJump();
        }
      }
      if (e.code === 'KeyF') {
        player.toggleFlashlight();
        soundManager.playFlashlightClick();
        stateRef.current.onToggleFlashlight();
      }
      if (e.shiftKey) keys.sprint = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.backward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
      if (!e.shiftKey) keys.sprint = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Look / Dragging
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        camYaw -= dx * 0.007;
        camPitch = Math.max(0.08, Math.min(1.4, camPitch + dy * 0.007));
      }

      // Raycast hover detection for escape room clues
      const rect = container.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(interactiveObjects, true);

      if (intersects.length > 0) {
        let hitGroup: THREE.Object3D | null = intersects[0].object;
        while (hitGroup && hitGroup.parent && hitGroup.parent !== roomGroup) {
          hitGroup = hitGroup.parent;
        }
        if (hitGroup && hitGroup.userData?.id) {
          const matched =
            allInstantiatedSceneObjects.get(hitGroup.userData.id) ||
            roomData.objects.find((o) => o.id === hitGroup!.userData.id);
          stateRef.current.onSelectObject(matched || null);
          container.style.cursor = 'pointer';
          return;
        }
      }
      container.style.cursor = 'grab';
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const maxZoomDist = Math.max(16.0, Math.max(roomWidth, roomLength) * 1.35);
      targetCamDist = Math.max(1.8, Math.min(maxZoomDist, targetCamDist + e.deltaY * 0.005));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;

        camYaw -= dx * 0.008;
        camPitch = Math.max(0.08, Math.min(1.4, camPitch + dy * 0.008));
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Click to inspect object
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(interactiveObjects, true);
      if (intersects.length > 0) {
        let hitGroup: THREE.Object3D | null = intersects[0].object;
        while (hitGroup && hitGroup.parent && hitGroup.parent !== roomGroup) {
          hitGroup = hitGroup.parent;
        }
        if (hitGroup && hitGroup.userData?.id) {
          const matched =
            allInstantiatedSceneObjects.get(hitGroup.userData.id) ||
            roomData.objects.find((o) => o.id === hitGroup!.userData.id);
          stateRef.current.onSelectObject(matched || null);
          soundManager.playClick();
          return;
        }
      }
      stateRef.current.onSelectObject(null);
    };

    container.addEventListener('click', onClick);

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    soundManager.playSceneReady();

    function handleCameraReset() {
      camYaw = Math.PI;
      camPitch = 0.32;
      targetCamDist = 3.6;
    }

    let lastReset = stateRef.current.resetCameraTrigger;
    let lastFocusCount = stateRef.current.focusObjectTrigger?.count ?? 0;

    // Animation Render Loop
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);

      if (stateRef.current.resetCameraTrigger !== lastReset) {
        lastReset = stateRef.current.resetCameraTrigger;
        handleCameraReset();
      }

      // If user clicked "Locate in 3D" on a registry/puzzle object, move investigator close & face the object
      const focusTrig = stateRef.current.focusObjectTrigger;
      if (focusTrig && focusTrig.count !== lastFocusCount) {
        lastFocusCount = focusTrig.count;
        const regTarget = sceneObjectRegistry.get(focusTrig.id);
        const objMeta = allInstantiatedSceneObjects.get(focusTrig.id);
        if (regTarget) {
          const tx = regTarget.position.x;
          const tz = regTarget.position.z;
          // Position investigator ~1.65m in front of the target object (or clear walkable spot nearby)
          let candX = tx;
          let candZ = tz + 1.55;
          if (isPositionBlocked(candX, candZ)) {
            const offsets = [
              [0, 1.85],
              [-1.4, 1.2],
              [1.4, 1.2],
              [-1.6, 0],
              [1.6, 0],
              [0, -1.6],
            ];
            for (const [ox, oz] of offsets) {
              if (!isPositionBlocked(tx + ox, tz + oz)) {
                candX = tx + ox;
                candZ = tz + oz;
                break;
              }
            }
          }
          charX = candX;
          charZ = candZ;
          charY = getFloorElevationAt(charX, charZ);
          const dx = tx - charX;
          const dz = tz - charZ;
          targetCharRotY = Math.atan2(dx, dz);
          charRotY = targetCharRotY;
          // Aim camera from behind investigator toward the target object
          camYaw = Math.atan2(-dx, -dz);
          camPitch = 0.28;
          targetCamDist = 2.6;
          if (objMeta) {
            stateRef.current.onSelectObject(objMeta);
          }
        }
      }

      // Update floating 3D highlight beacon above selected/highlighted object (only in Dev Mode or solved objects)
      const activeHighlightId = stateRef.current.highlightedObjectId;
      const isDevActive = Boolean(stateRef.current.isDevMode);
      if (
        activeHighlightId &&
        sceneObjectRegistry.has(activeHighlightId) &&
        (isDevActive || stateRef.current.solvedTargetIds.has(activeHighlightId))
      ) {
        const reg = sceneObjectRegistry.get(activeHighlightId)!;
        highlightBeacon.visible = true;
        const bobOffset = Math.sin(clock.elapsedTime * 5.0) * 0.05;
        highlightBeacon.position.set(
          reg.position.x,
          reg.position.y + reg.dimensions.height + 0.08 + bobOffset,
          reg.position.z
        );
        highlightBeacon.rotation.y = clock.elapsedTime * 2.2;
      } else {
        highlightBeacon.visible = false;
      }

      // Toggle developer-only puzzle halos on furniture meshes
      roomGroup.traverse((child) => {
        if (child.userData?.isPuzzleHalo) {
          child.visible = isDevActive;
        }
      });

      // Animate 3D Clue Anchor Markers:
      // - Sequentially unlocked as puzzles are solved (or all visible in Dev Mode)
      // - Amber (#F59E0B) when undiscovered, Sky/Gold (#38BDF8) when discovered, Emerald (#10B981) when solved
      const solvedPuzzlesSet = stateRef.current.solvedPuzzleIds;
      const discoveredSet = stateRef.current.discoveredClueIds;
      const maxUnlockedIdx = solvedPuzzlesSet.size;
      clueAnchorMarkers.forEach(
        ({ puzzleId, puzzleIndex, group, artifactGroup, orbMat, ringMat, baseY }, idx) => {
          const isUnlocked = isDevActive || puzzleIndex <= maxUnlockedIdx;
          group.visible = isUnlocked;
          artifactGroup.visible = isUnlocked;
          if (!isUnlocked) return;

          const isSolved = solvedPuzzlesSet.has(puzzleId);
          const isDiscovered = discoveredSet?.has(puzzleId) ?? false;
          if (isSolved) {
            orbMat.color.set('#10B981');
            ringMat.color.set('#34D399');
          } else if (isDiscovered) {
            orbMat.color.set('#38BDF8');
            ringMat.color.set('#7DD3FC');
          } else {
            orbMat.color.set('#F59E0B');
            ringMat.color.set('#FBBF24');
          }
          group.position.y = baseY + Math.sin(clock.elapsedTime * 3.0 + idx) * 0.055;
          group.rotation.y = clock.elapsedTime * 1.4;
        }
      );

      // Animate Cursed Seal (Dev Mode ONLY) vs Magical Purified Glow + Floating 3D Reward Digit (when verified!)
      const solvedTargetsSet = stateRef.current.solvedTargetIds;
      solvedGlowGroups.forEach((glow, targetId) => {
        const isTargetSolved = solvedTargetsSet.has(targetId);
        // CRITICAL: Never highlight unsolved puzzle target objects in normal gameplay!
        glow.cursedGroup.visible = Boolean(isDevActive && !isTargetSolved);
        glow.group.visible = isTargetSolved;
        if (isTargetSolved) {
          glow.crystal.position.y =
            glow.baseY + Math.sin(clock.elapsedTime * 4.2) * 0.04;
          glow.crystal.rotation.y = clock.elapsedTime * 2.6;
          glow.ring.rotation.z = clock.elapsedTime * 1.5;
          glow.digitSprite.position.y =
            glow.baseY + 0.26 + Math.sin(clock.elapsedTime * 3.2) * 0.045;
        } else if (isDevActive) {
          glow.cursedRing.rotation.z = -clock.elapsedTime * 0.8;
        }
      });

      // Animate Exit Door Leaves & Security Keypad LED
      const doorShouldOpen = stateRef.current.isDoorOpen;
      const allSolved = stateRef.current.allPuzzlesSolved;
      exitDoorGroups.forEach((doorGrp) => {
        const leftPivot = doorGrp.userData.leftDoorPivot as THREE.Group | undefined;
        const rightPivot = doorGrp.userData.rightDoorPivot as THREE.Group | undefined;
        const portalMat = doorGrp.userData.escapePortalMat as THREE.MeshBasicMaterial | undefined;
        const keypadLedMat = doorGrp.userData.keypadLedMat as THREE.MeshBasicMaterial | undefined;

        const targetAngle = doorShouldOpen ? Math.PI * 0.48 : 0;
        if (leftPivot) {
          leftPivot.rotation.y = THREE.MathUtils.damp(
            leftPivot.rotation.y,
            -targetAngle,
            4.5,
            delta
          );
        }
        if (rightPivot) {
          rightPivot.rotation.y = THREE.MathUtils.damp(
            rightPivot.rotation.y,
            targetAngle,
            4.5,
            delta
          );
        }
        if (portalMat) {
          portalMat.opacity = THREE.MathUtils.damp(
            portalMat.opacity,
            doorShouldOpen ? 0.72 : 0.0,
            4.0,
            delta
          );
        }
        if (keypadLedMat) {
          if (doorShouldOpen) {
            keypadLedMat.color.set('#10B981');
          } else if (allSolved) {
            keypadLedMat.color.set(
              Math.sin(clock.elapsedTime * 6.0) > 0 ? '#F59E0B' : '#10B981'
            );
          } else {
            keypadLedMat.color.set('#EF4444');
          }
        }
      });

      // Evaluate Proximity Interaction Detection (`Press E to Investigate`)
      const prox = detectProximityInteraction(
        charX,
        charZ,
        stateRef.current.gameData,
        stateRef.current.roomData,
        sceneObjectRegistry,
        solvedPuzzlesSet,
        2.75
      );
      stateRef.current.onProximityTargetChange(prox);

      camDist = THREE.MathUtils.damp(camDist, targetCamDist, 10, delta);

      // Flickering Lamps & Unstable Voltage
      flickeringLights.forEach(({ light, baseIntensity }) => {
        if (Math.random() < 0.06) {
          const flicker = 0.45 + Math.random() * 0.75;
          light.intensity = baseIntensity * flicker;
          if (flicker < 0.35 && Math.random() < 0.15) {
            soundManager.playFlickerZap();
          }
        } else {
          light.intensity = THREE.MathUtils.damp(light.intensity, baseIntensity, 8, delta);
        }
      });

      // Drift Atmospheric Dust Motes
      const positions = dustMotes.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < moteCount; i++) {
        positions[i * 3 + 1] -= delta * 0.04;
        positions[i * 3] += Math.sin(clock.elapsedTime + i) * 0.001;
        if (positions[i * 3 + 1] < 0.05) {
          positions[i * 3 + 1] = roomHeight * 0.95;
        }
      }
      dustMotes.geometry.attributes.position.needsUpdate = true;

      // --- Movement Physics & Direction ---
      if (stateRef.current.isModalOpen) {
        keys.forward = false;
        keys.backward = false;
        keys.left = false;
        keys.right = false;
        keys.jump = false;
        keys.sprint = false;
      }
      const activeView = stateRef.current.viewMode;
      const isMoving =
        !stateRef.current.isModalOpen &&
        (keys.forward || keys.backward || keys.left || keys.right);
      const speed = (keys.sprint ? 4.8 : 3.0);

      _moveDir.set(0, 0, 0);

      const fwdX = -Math.sin(camYaw);
      const fwdZ = -Math.cos(camYaw);
      const rightX = -fwdZ;
      const rightZ = fwdX;

      if (keys.forward) {
        _moveDir.x += fwdX;
        _moveDir.z += fwdZ;
      }
      if (keys.backward) {
        _moveDir.x -= fwdX;
        _moveDir.z -= fwdZ;
      }
      if (keys.left) {
        _moveDir.x -= rightX;
        _moveDir.z -= rightZ;
      }
      if (keys.right) {
        _moveDir.x += rightX;
        _moveDir.z += rightZ;
      }

      if (isMoving && _moveDir.lengthSq() > 0.001) {
        _moveDir.normalize();

        const stepX = _moveDir.x * speed * delta;
        const stepZ = _moveDir.z * speed * delta;

        const nextX = charX + stepX;
        const nextZ = charZ + stepZ;

        const blockedCombined = isPositionBlocked(nextX, nextZ);

        if (!blockedCombined) {
          charX = nextX;
          charZ = nextZ;
        } else {
          if (!isPositionBlocked(charX + stepX, charZ)) {
            charX += stepX;
          }
          if (!isPositionBlocked(charX, charZ + stepZ)) {
            charZ += stepZ;
          }
        }

        targetCharRotY = Math.atan2(_moveDir.x, _moveDir.z);

        if (isGrounded) {
          footstepTimer += delta * (keys.sprint ? 1.6 : 1.0);
          if (footstepTimer >= 0.4) {
            footstepTimer = 0;
            soundManager.playFootstep();
          }
        }
      }

      let angleDiff = targetCharRotY - charRotY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      charRotY += angleDiff * Math.min(1, delta * 14);

      const groundY = getFloorElevationAt(charX, charZ);

      if (!isGrounded) {
        velocityY -= 17.0 * delta;
        charY += velocityY * delta;
        if (charY <= groundY) {
          charY = groundY;
          velocityY = 0;
          isGrounded = true;
          soundManager.playLand();
        }
      } else {
        // Smoothly step up and down solid rising lecture theatre tiers & stair aisles
        charY = THREE.MathUtils.damp(charY, groundY, 18, delta);
      }

      // Update Player Transform & Animation
      player.root.position.set(charX, charY, charZ);
      player.root.rotation.y = charRotY;
      player.updateAnimation(isMoving, isGrounded, keys.sprint ? 1.4 : 1.0, delta);
      player.root.visible = activeView !== 'first_person';

      stateRef.current.onUpdatePlayerPos(charX, charZ, charRotY);

      // --- Camera Modes ---
      _charPos.set(charX, charY + 1.35, charZ);

      if (activeView === 'third_person') {
        const cx = charX + Math.sin(camYaw) * Math.cos(camPitch) * camDist;
        const cy = charY + 1.35 + Math.sin(camPitch) * camDist;
        const cz = charZ + Math.cos(camYaw) * Math.cos(camPitch) * camDist;

        _camPos.set(cx, cy, cz);
        _camTarget.copy(_charPos);

        camera.position.set(
          THREE.MathUtils.damp(camera.position.x, _camPos.x, 14, delta),
          THREE.MathUtils.damp(camera.position.y, _camPos.y, 14, delta),
          THREE.MathUtils.damp(camera.position.z, _camPos.z, 14, delta)
        );
        camera.lookAt(_charPos);
      } else if (activeView === 'first_person') {
        camera.position.set(charX, charY + 1.62, charZ);
        const lookX = charX - Math.sin(camYaw) * Math.cos(camPitch);
        const lookY = charY + 1.62 - Math.sin(camPitch);
        const lookZ = charZ - Math.cos(camYaw) * Math.cos(camPitch);
        camera.lookAt(lookX, lookY, lookZ);
      } else if (activeView === 'dollhouse') {
        const dist = Math.max(roomWidth, roomLength) * 1.35;
        const elev = dist * 0.88;
        _camPos.set(Math.sin(camYaw) * dist, elev, Math.cos(camYaw) * dist);
        camera.position.set(
          THREE.MathUtils.damp(camera.position.x, _camPos.x, 8, delta),
          THREE.MathUtils.damp(camera.position.y, _camPos.y, 8, delta),
          THREE.MathUtils.damp(camera.position.z, _camPos.z, 8, delta)
        );
        camera.lookAt(0, 1.0, 0);
      } else if (activeView === 'top_down') {
        const topH = Math.max(roomWidth, roomLength) * 1.5;
        camera.position.set(
          THREE.MathUtils.damp(camera.position.x, 0, 10, delta),
          THREE.MathUtils.damp(camera.position.y, topH, 10, delta),
          THREE.MathUtils.damp(camera.position.z, 0.01, 10, delta)
        );
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      window.removeEventListener('mousedown', handleFirstUserInteraction);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);

      soundManager.stopAmbience();
      player.dispose();
      renderer.dispose();
      floorTexture.dispose();
      wallTexture.dispose();
      dustMotes.geometry.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [roomData, inventoryData, gameData]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
