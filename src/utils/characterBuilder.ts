import * as THREE from 'three';

export interface PlayerCharacter {
  root: THREE.Group;
  flashlight: THREE.SpotLight;
  toggleFlashlight: () => boolean;
  updateAnimation: (isMoving: boolean, isGrounded: boolean, speedMultiplier: number, delta: number) => void;
  dispose: () => void;
}

export function createPlayerCharacter(): PlayerCharacter {
  const root = new THREE.Group();

  // Materials with realistic PBR textures
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D8B498'),
    roughness: 0.6,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1F242A'), // Dark charcoal investigator trench coat
    roughness: 0.65,
    metalness: 0.1,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#475569'), // Slate under-shirt
    roughness: 0.8,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#111827'), // Midnight dark denim
    roughness: 0.85,
  });
  const bootsMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1C140E'), // Dark worn leather boots
    roughness: 0.45,
    metalness: 0.2,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4B5563'),
    roughness: 0.25,
    metalness: 0.85,
  });

  // 1. Soft Ground Contact Shadow (Disc beneath character)
  const shadowGeo = new THREE.CircleGeometry(0.35, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.01;
  root.add(shadowMesh);

  // Proportions: Total Height = 1.75m
  const legLength = 0.72;
  const hipY = legLength;
  const torsoH = 0.58;
  const torsoW = 0.38;
  const torsoD = 0.24;
  const headSize = 0.22;

  // 2. Hip & Torso
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = hipY;
  root.add(bodyGroup);

  // Torso / Coat Body
  const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.position.y = torsoH / 2;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Lapels / Coat Opening
  const lapelGeo = new THREE.BoxGeometry(0.12, torsoH * 0.75, 0.015);
  const lapelLeft = new THREE.Mesh(lapelGeo, coatMat);
  lapelLeft.position.set(-0.08, torsoH * 0.55, torsoD / 2 + 0.005);
  lapelLeft.rotation.z = -0.08;
  bodyGroup.add(lapelLeft);

  const lapelRight = new THREE.Mesh(lapelGeo, coatMat);
  lapelRight.position.set(0.08, torsoH * 0.55, torsoD / 2 + 0.005);
  lapelRight.rotation.z = 0.08;
  bodyGroup.add(lapelRight);

  // Shirt Collar & Tie Accent
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.01), shirtMat);
  shirt.position.set(0, torsoH - 0.08, torsoD / 2 + 0.006);
  bodyGroup.add(shirt);

  // Trench Coat Lower Skirt / Flaps
  const skirtGeo = new THREE.BoxGeometry(torsoW + 0.04, 0.26, torsoD + 0.04);
  const skirt = new THREE.Mesh(skirtGeo, coatMat);
  skirt.position.y = -0.08;
  skirt.castShadow = true;
  bodyGroup.add(skirt);

  // 3. Head & Face
  const headGroup = new THREE.Group();
  headGroup.position.y = torsoH + 0.06;
  bodyGroup.add(headGroup);

  const headGeo = new THREE.BoxGeometry(headSize, headSize * 1.15, headSize);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = headSize / 2;
  head.castShadow = true;
  headGroup.add(head);

  // Hair
  const hairGeo = new THREE.BoxGeometry(headSize + 0.02, 0.08, headSize + 0.02);
  const hair = new THREE.Mesh(hairGeo, new THREE.MeshStandardMaterial({ color: 0x1f1915, roughness: 0.9 }));
  hair.position.y = headSize * 1.05;
  headGroup.add(hair);

  // Detective Fedora / Brim Hat
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(headSize * 0.95, headSize * 0.95, 0.02, 24),
    coatMat
  );
  hatBrim.position.y = headSize * 1.08;
  hatBrim.castShadow = true;
  headGroup.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(headSize * 0.65, headSize * 0.72, 0.1, 24),
    coatMat
  );
  hatCrown.position.y = headSize * 1.14;
  hatCrown.castShadow = true;
  headGroup.add(hatCrown);

  // 4. Left Arm (Swings naturally)
  const armW = 0.09;
  const armL = 0.52;
  const armGeo = new THREE.BoxGeometry(armW, armL, armW);
  armGeo.translate(0, -armL / 2, 0);

  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-torsoW / 2 - armW / 2, torsoH - 0.05, 0);
  const leftArm = new THREE.Mesh(armGeo, coatMat);
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);
  bodyGroup.add(leftArmGroup);

  // Left Hand
  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), skinMat);
  leftHand.position.set(0, -armL, 0);
  leftArmGroup.add(leftHand);

  // 5. Right Arm (Investigator holding Flashlight pointed forward!)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(torsoW / 2 + armW / 2, torsoH - 0.05, 0);

  const rightArm = new THREE.Mesh(armGeo, coatMat);
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);
  bodyGroup.add(rightArmGroup);

  // Right Hand
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), skinMat);
  rightHand.position.set(0, -armL, 0);
  rightArmGroup.add(rightHand);

  // Tactical Metal Flashlight in hand
  const torchGroup = new THREE.Group();
  torchGroup.position.set(0, -armL, 0.06);
  torchGroup.rotation.x = -Math.PI / 2; // Point forward

  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.18, 16), metalMat);
  torchGroup.add(torchBody);

  const torchHead = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.06, 16), metalMat);
  torchHead.position.y = 0.11;
  torchGroup.add(torchHead);

  // Flashlight Lens Emissive Mesh
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), lensMat);
  lens.position.y = 0.141;
  torchGroup.add(lens);

  rightHand.add(torchGroup);

  // REAL DYNAMIC SPOTLIGHT CASTING SHADOWS FOR ESCAPE-ROOM TENSION!
  const flashlight = new THREE.SpotLight('#FFF8E7', 2.8, 16, Math.PI / 6, 0.55, 1.1);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.width = 1024;
  flashlight.shadow.mapSize.height = 1024;
  flashlight.shadow.bias = -0.0005;
  flashlight.shadow.camera.near = 0.2;
  flashlight.shadow.camera.far = 16;

  // Position light at lens
  flashlight.position.set(torsoW / 2 + armW / 2, hipY + torsoH * 0.45, 0.25);
  root.add(flashlight);

  // Light target positioned in front of character
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(torsoW / 2 + armW / 2, hipY + torsoH * 0.45, 8.0);
  root.add(lightTarget);
  flashlight.target = lightTarget;

  // Flashlight state
  let isFlashlightOn = true;
  function toggleFlashlight(): boolean {
    isFlashlightOn = !isFlashlightOn;
    flashlight.intensity = isFlashlightOn ? 2.8 : 0;
    lensMat.color.setHex(isFlashlightOn ? 0xffffff : 0x222222);
    return isFlashlightOn;
  }

  // 6. Legs & Boots (Pivoted at hips)
  const legW = 0.12;
  const legGeo = new THREE.BoxGeometry(legW, legLength, legW);
  legGeo.translate(0, -legLength / 2, 0);

  // Boot shape
  const bootGeo = new THREE.BoxGeometry(legW + 0.02, 0.11, legW + 0.08);
  bootGeo.translate(0, -legLength + 0.05, 0.04);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-torsoW * 0.26, hipY, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.castShadow = true;
  leftLegGroup.add(leftLeg);
  const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
  leftBoot.castShadow = true;
  leftLegGroup.add(leftBoot);
  root.add(leftLegGroup);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(torsoW * 0.26, hipY, 0);
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.castShadow = true;
  rightLegGroup.add(rightLeg);
  const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
  rightBoot.castShadow = true;
  rightLegGroup.add(rightBoot);
  root.add(rightLegGroup);

  // Walk Animation State
  let animTime = 0;

  function updateAnimation(isMoving: boolean, isGrounded: boolean, speedMultiplier: number, delta: number) {
    if (!isGrounded) {
      // Airborne Jump Pose
      leftLegGroup.rotation.x = THREE.MathUtils.damp(leftLegGroup.rotation.x, 0.4, 10, delta);
      rightLegGroup.rotation.x = THREE.MathUtils.damp(rightLegGroup.rotation.x, -0.25, 10, delta);
      leftArmGroup.rotation.x = THREE.MathUtils.damp(leftArmGroup.rotation.x, -0.5, 10, delta);
      // Right arm keeps flashlight held forward
      rightArmGroup.rotation.x = THREE.MathUtils.damp(rightArmGroup.rotation.x, -0.3, 10, delta);
      bodyGroup.position.y = THREE.MathUtils.damp(bodyGroup.position.y, hipY + 0.05, 10, delta);
      return;
    }

    if (isMoving) {
      animTime += delta * 11 * (speedMultiplier || 1);
      const walkAngle = Math.sin(animTime) * 0.65;
      const leftArmAngle = -Math.sin(animTime) * 0.55;

      leftLegGroup.rotation.x = walkAngle;
      rightLegGroup.rotation.x = -walkAngle;
      leftArmGroup.rotation.x = leftArmAngle;

      // Right arm (holding flashlight) stays raised aiming forward with subtle natural sway
      rightArmGroup.rotation.x = -0.42 + Math.sin(animTime * 0.5) * 0.05;
      rightArmGroup.rotation.z = -0.05;

      // Vertical bounce
      bodyGroup.position.y = hipY + Math.abs(Math.sin(animTime * 2)) * 0.035;
      headGroup.rotation.y = Math.sin(animTime) * 0.04;
    } else {
      // Idle Pose: Detective waiting in suspense
      animTime += delta * 1.5;
      leftLegGroup.rotation.x = THREE.MathUtils.damp(leftLegGroup.rotation.x, 0, 8, delta);
      rightLegGroup.rotation.x = THREE.MathUtils.damp(rightLegGroup.rotation.x, 0, 8, delta);
      leftArmGroup.rotation.x = THREE.MathUtils.damp(leftArmGroup.rotation.x, 0, 8, delta);

      // Flashlight held at ready
      rightArmGroup.rotation.x = THREE.MathUtils.damp(rightArmGroup.rotation.x, -0.38, 8, delta);

      bodyGroup.position.y = hipY + Math.sin(animTime) * 0.006;
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, 0, 6, delta);
    }
  }

  function dispose() {
    skinMat.dispose();
    coatMat.dispose();
    shirtMat.dispose();
    pantsMat.dispose();
    bootsMat.dispose();
    metalMat.dispose();
    shadowMat.dispose();
    flashlight.dispose();
  }

  return { root, flashlight, toggleFlashlight, updateAnimation, dispose };
}
