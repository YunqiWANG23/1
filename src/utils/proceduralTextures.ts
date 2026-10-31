import * as THREE from 'three';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

// 1. Aged Distressed Wood Floor with Dirt, Scratches & Nail Heads
export function createWoodPlankTexture(baseHex = '#2B1E16', repeatX = 4, repeatY = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex || '#261C14');

  // Dark base
  ctx.fillStyle = `rgb(${Math.max(10, r - 15)}, ${Math.max(8, g - 15)}, ${Math.max(6, b - 15)})`;
  ctx.fillRect(0, 0, 1024, 1024);

  const numPlanks = 8;
  const plankH = 1024 / numPlanks;

  for (let i = 0; i < numPlanks; i++) {
    const y = i * plankH;
    // Plank color variation (weathered, damp, aged)
    const varTone = (Math.random() - 0.5) * 30;
    const pr = Math.min(255, Math.max(15, r + varTone));
    const pg = Math.min(255, Math.max(12, g + varTone));
    const pb = Math.min(255, Math.max(8, b + varTone));

    // Plank base gradient
    const grad = ctx.createLinearGradient(0, y, 0, y + plankH);
    grad.addColorStop(0, `rgb(${Math.round(pr * 0.9)}, ${Math.round(pg * 0.9)}, ${Math.round(pb * 0.9)})`);
    grad.addColorStop(0.5, `rgb(${Math.round(pr)}, ${Math.round(pg)}, ${Math.round(pb)})`);
    grad.addColorStop(1, `rgb(${Math.round(pr * 0.82)}, ${Math.round(pg * 0.82)}, ${Math.round(pb * 0.82)})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, y + 2, 1024, plankH - 4);

    // Weathered wood grain fibers
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 14; k++) {
      const lineY = y + 8 + k * (plankH / 14) + (Math.random() - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.bezierCurveTo(300, lineY + (Math.random() - 0.5) * 12, 700, lineY + (Math.random() - 0.5) * 12, 1024, lineY);
      ctx.stroke();
    }

    // Deep plank seam groove & shadow
    ctx.fillStyle = '#080504';
    ctx.fillRect(0, y + plankH - 3, 1024, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, y + 1, 1024, 1);

    // Vertical seams with nail heads
    const splits = [(i * 280 + 150) % 900, (i * 420 + 600) % 950];
    splits.forEach((sx) => {
      ctx.fillStyle = '#080504';
      ctx.fillRect(sx, y + 2, 3, plankH - 4);

      // Rusty iron nails
      [y + 12, y + plankH - 14].forEach((ny) => {
        ctx.fillStyle = '#110D0A';
        ctx.beginPath();
        ctx.arc(sx + 10, ny, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5A3D28'; // rust halo
        ctx.beginPath();
        ctx.arc(sx + 10, ny, 5, 0, Math.PI * 2);
        ctx.stroke();
      });
    });

    // Dark water/grime stains in random corners
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(10, 7, 5, 0.35)';
      ctx.beginPath();
      ctx.ellipse((i * 180 + 200) % 850, y + plankH / 2, 80, 22, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Creepy scratches across multiple planks
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  for (let s = 0; s < 5; s++) {
    const startX = 200 + s * 140;
    const startY = 150 + s * 120;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + 90 + Math.random() * 40, startY + 70 + Math.random() * 30);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Weathered Cracked Slate / Dungeon Stone Tile Texture
export function createTileTexture(tileHex = '#2B2D30', repeatX = 5, repeatY = 5): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(tileHex || '#25272B');

  // Dark grime mortar
  ctx.fillStyle = '#0E1012';
  ctx.fillRect(0, 0, 1024, 1024);

  const tileSize = 246;
  const gap = 10;

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * (tileSize + gap) + gap;
      const y = row * (tileSize + gap) + gap;

      const tone = (Math.random() - 0.5) * 22;
      const tr = Math.min(255, Math.max(10, r + tone));
      const tg = Math.min(255, Math.max(10, g + tone));
      const tb = Math.min(255, Math.max(10, b + tone));

      ctx.fillStyle = `rgb(${tr}, ${tg}, ${tb})`;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Stone texture mottling
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (let p = 0; p < 8; p++) {
        ctx.fillRect(x + Math.random() * (tileSize - 20), y + Math.random() * (tileSize - 20), 18, 14);
      }

      // Cracks in random tiles
      if ((row + col) % 2 === 1) {
        ctx.strokeStyle = '#0B0D0E';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 20, y + 20);
        ctx.lineTo(x + tileSize * 0.45, y + tileSize * 0.55);
        ctx.lineTo(x + tileSize - 30, y + tileSize - 40);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Weathered Medieval Gothic Ashlar Stone Wall with Cracks, Mortar Courses & Damp Moss
export function createWallTexture(wallHex = '#2B2E36'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(wallHex || '#2B2E36');

  // Deep recessed mortar base
  ctx.fillStyle = '#0F1115';
  ctx.fillRect(0, 0, 1024, 1024);

  const rows = 8;
  const rowH = 1024 / rows;

  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    const cols = 4;
    const colW = 1024 / cols;
    const offset = (row % 2) * (colW / 2);

    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const shade = (Math.random() - 0.5) * 26;
      const sr = Math.min(255, Math.max(18, r + shade));
      const sg = Math.min(255, Math.max(18, g + shade));
      const sb = Math.min(255, Math.max(22, b + shade));

      // Stone block face
      const grad = ctx.createLinearGradient(x, y, x, y + rowH);
      grad.addColorStop(0, `rgb(${Math.round(sr * 1.06)}, ${Math.round(sg * 1.06)}, ${Math.round(sb * 1.06)})`);
      grad.addColorStop(0.5, `rgb(${Math.round(sr)}, ${Math.round(sg)}, ${Math.round(sb)})`);
      grad.addColorStop(1, `rgb(${Math.round(sr * 0.86)}, ${Math.round(sg * 0.86)}, ${Math.round(sb * 0.86)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 5, y + 5, colW - 10, rowH - 10);

      // Chiseled stone edge highlights & shadows
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + rowH - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + colW - 6, y + 6);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(x + 6, y + rowH - 6);
      ctx.lineTo(x + colW - 6, y + rowH - 6);
      ctx.lineTo(x + colW - 6, y + 6);
      ctx.stroke();

      // Pitted stone grain & age fractures
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let p = 0; p < 6; p++) {
        ctx.fillRect(
          x + 14 + Math.random() * (colW - 36),
          y + 14 + Math.random() * (rowH - 36),
          6 + Math.random() * 14,
          4 + Math.random() * 10
        );
      }

      if ((row + col) % 3 === 0) {
        ctx.strokeStyle = 'rgba(8, 10, 12, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + colW * 0.3, y + 6);
        ctx.lineTo(x + colW * 0.44, y + rowH * 0.52);
        ctx.lineTo(x + colW * 0.38, y + rowH - 8);
        ctx.stroke();
      }
    }
  }

  // Dark vertical damp & moss streaks from castle vaults
  for (let i = 0; i < 10; i++) {
    const sx = (i * 97 + 40) % 1000;
    const len = 320 + Math.random() * 480;
    const grad = ctx.createLinearGradient(sx, 0, sx, len);
    grad.addColorStop(0, 'rgba(8, 12, 10, 0.52)');
    grad.addColorStop(0.6, 'rgba(18, 28, 20, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, 0, 18 + Math.random() * 24, len);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Antique Worn Oriental Rug with Faded Medallion & Frayed Edges
export function createRugTexture(primaryHex = '#4A1D1D', accentHex = '#1E252B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep wine/burgundy faded ground
  ctx.fillStyle = primaryHex || '#3E1919';
  ctx.fillRect(0, 0, 1024, 1024);

  // Antique border frames
  ctx.strokeStyle = accentHex || '#1C2025';
  ctx.lineWidth = 36;
  ctx.strokeRect(30, 30, 964, 964);

  ctx.strokeStyle = '#8B6B3E'; // faded gold thread
  ctx.lineWidth = 6;
  ctx.strokeRect(54, 54, 916, 916);
  ctx.strokeRect(70, 70, 884, 884);

  // Center medallion
  ctx.fillStyle = '#22272E';
  ctx.beginPath();
  ctx.ellipse(512, 512, 190, 240, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#937848';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Faded distressing: worn center where footsteps walked over decades
  const wearGrad = ctx.createRadialGradient(512, 512, 60, 512, 512, 450);
  wearGrad.addColorStop(0, 'rgba(80, 70, 60, 0.45)');
  wearGrad.addColorStop(0.6, 'rgba(50, 40, 35, 0.25)');
  wearGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = wearGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Moth-eaten stains
  ctx.fillStyle = 'rgba(10, 8, 8, 0.4)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(200 + i * 120, 300 + (i % 3) * 180, 25 + Math.random() * 20, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. Creepy Antique Oil Portrait with Craquelure & Watching Eyes
export function createWallArtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 680;
  const ctx = canvas.getContext('2d')!;

  // Dark ominous oil ground
  const bgGrad = ctx.createRadialGradient(256, 260, 40, 256, 340, 360);
  bgGrad.addColorStop(0, '#2D231A');
  bgGrad.addColorStop(0.6, '#17130F');
  bgGrad.addColorStop(1, '#0A0807');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 680);

  // Victorian Portrait Silhouette & Face
  ctx.fillStyle = '#0F0C0A';
  ctx.beginPath();
  ctx.moveTo(90, 680);
  ctx.bezierCurveTo(110, 460, 180, 430, 256, 420);
  ctx.bezierCurveTo(332, 430, 402, 460, 422, 680);
  ctx.closePath();
  ctx.fill();

  // High stiff collar
  ctx.fillStyle = '#E5DFD4';
  ctx.beginPath();
  ctx.moveTo(216, 420);
  ctx.lineTo(256, 445);
  ctx.lineTo(296, 420);
  ctx.lineTo(280, 395);
  ctx.lineTo(232, 395);
  ctx.closePath();
  ctx.fill();

  // Head oval
  ctx.fillStyle = '#C2B19F';
  ctx.beginPath();
  ctx.ellipse(256, 320, 66, 85, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark hollow eye sockets & piercing gaze
  ctx.fillStyle = '#1C1510';
  ctx.beginPath();
  ctx.ellipse(234, 310, 11, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(278, 310, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(235, 309, 2.5, 2.5);
  ctx.fillRect(279, 309, 2.5, 2.5);

  ctx.strokeStyle = '#4A3326';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(242, 362);
  ctx.lineTo(270, 362);
  ctx.stroke();

  // Oil Craquelure
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1;
  for (let c = 0; c < 20; c++) {
    const cx = (c * 37) % 512;
    const cy = (c * 53) % 680;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 25, cy + 18);
    ctx.lineTo(cx + 40, cy + 10);
    ctx.stroke();
  }

  const vig = ctx.createRadialGradient(256, 340, 200, 256, 340, 380);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 512, 680);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. Obsidian Scrying Mirror / Arcane Divination Glass Texture
export function createTVScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;

  // Deep obsidian scrying glass base
  const bg = ctx.createRadialGradient(256, 144, 15, 256, 144, 240);
  bg.addColorStop(0, '#16253B');
  bg.addColorStop(0.55, '#0B1320');
  bg.addColorStop(1, '#04060A');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 288);

  // Concentric Arcane Astrolabe / Divination Rings
  ctx.strokeStyle = 'rgba(201, 162, 75, 0.48)';
  ctx.lineWidth = 2;
  [54, 88, 118].forEach((r) => {
    ctx.beginPath();
    ctx.arc(256, 144, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Sacred Hexagram / Runic Geometry inside the Scrying Mirror
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.52)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2;
    const a2 = ((i + 2) / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a1) * 88, 144 + Math.sin(a1) * 88);
    ctx.lineTo(256 + Math.cos(a2) * 88, 144 + Math.sin(a2) * 88);
    ctx.stroke();
  }

  // Spectral inscription
  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.font = 'italic bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPECULUM UMBRAE • FOUR SEALS BIND THE GATE', 256, 148);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 7. Ancient Mysterious Book Spines
export function createBookSpinesTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#120F0D';
  ctx.fillRect(0, 0, 512, 128);

  const colors = [
    '#2B1B17', // dark mahogany
    '#1B261D', // dark forest
    '#2E1C2B', // plum
    '#23282B', // slate
    '#3B2219', // oxblood
    '#1E1E1E', // charcoal
  ];

  let currentX = 6;
  let bookIdx = 0;

  while (currentX < 500) {
    const bookW = Math.floor(16 + Math.random() * 22);
    const bookH = Math.floor(95 + Math.random() * 30);
    const col = colors[bookIdx % colors.length];

    ctx.fillStyle = col;
    ctx.fillRect(currentX, 128 - bookH, bookW - 2, bookH);

    ctx.fillStyle = 'rgba(197, 160, 89, 0.6)';
    ctx.fillRect(currentX + 2, 128 - bookH + 12, bookW - 6, 2.5);
    ctx.fillRect(currentX + 2, 128 - bookH + 18, bookW - 6, 1.5);
    ctx.fillRect(currentX + 2, 128 - 20, bookW - 6, 2.5);

    ctx.fillStyle = 'rgba(197, 160, 89, 0.75)';
    ctx.font = '9px serif';
    ctx.fillText('VII', currentX + 3, 128 - bookH / 2);

    currentX += bookW;
    bookIdx++;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 8. Hyrule Castle Royal Sanctum Crest Banner / Tapestry Texture
export function createRoyalBannerTexture(primaryHex = '#5B1217', goldHex = '#C9A24B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(primaryHex || '#5B1217');

  const bg = ctx.createLinearGradient(0, 0, 512, 1024);
  bg.addColorStop(0, `rgb(${Math.max(15, r - 12)}, ${Math.max(5, g - 8)}, ${Math.max(5, b - 8)})`);
  bg.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
  bg.addColorStop(1, `rgb(${Math.max(10, r - 30)}, ${Math.max(4, g - 15)}, ${Math.max(4, b - 15)})`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 1024);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 1024; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  ctx.strokeStyle = goldHex;
  ctx.lineWidth = 14;
  ctx.strokeRect(28, 28, 456, 940);
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 416, 900);

  ctx.fillStyle = goldHex;
  const cx = 256;
  const cy = 400;

  const triSize = 48;
  const drawTri = (tx: number, ty: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(tx, ty - s);
    ctx.lineTo(tx - s * 0.88, ty + s * 0.65);
    ctx.lineTo(tx + s * 0.88, ty + s * 0.65);
    ctx.closePath();
    ctx.fill();
  };
  drawTri(cx, cy - 115, triSize);
  drawTri(cx - triSize * 0.88, cy - 115 + triSize * 1.65, triSize);
  drawTri(cx + triSize * 0.88, cy - 115 + triSize * 1.65, triSize);

  ctx.beginPath();
  ctx.moveTo(cx, cy + 30);
  ctx.bezierCurveTo(cx - 80, cy - 10, cx - 165, cy - 60, cx - 190, cy - 20);
  ctx.bezierCurveTo(cx - 175, cy + 50, cx - 95, cy + 80, cx, cy + 75);
  ctx.bezierCurveTo(cx + 95, cy + 80, cx + 175, cy + 50, cx + 190, cy - 20);
  ctx.bezierCurveTo(cx + 165, cy - 60, cx + 80, cy - 10, cx, cy + 30);
  ctx.fill();

  for (let w = -3; w <= 3; w++) {
    if (w === 0) continue;
    ctx.beginPath();
    ctx.ellipse(cx + w * 42, cy + 70 + Math.abs(w) * 12, 10, 48, w * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(cx - 25, cy + 85);
  ctx.lineTo(cx + 25, cy + 85);
  ctx.lineTo(cx + 45, cy + 210);
  ctx.lineTo(cx, cy + 245);
  ctx.lineTo(cx - 45, cy + 210);
  ctx.closePath();
  ctx.fill();

  const wear = ctx.createLinearGradient(0, 700, 0, 1024);
  wear.addColorStop(0, 'rgba(0,0,0,0)');
  wear.addColorStop(1, 'rgba(5,5,8,0.65)');
  ctx.fillStyle = wear;
  ctx.fillRect(0, 700, 512, 324);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 9. Hyrule Castle Carved Temple Ashlar Stone & Fluted Marble Texture
export function createCarvedStoneTexture(baseHex = '#2B303A', repeatX = 4, repeatY = 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex || '#2B303A');
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 1024, 1024);

  const rows = 6;
  const rowH = 1024 / rows;

  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    const cols = 3;
    const colW = 1024 / cols;
    const offset = (row % 2) * (colW / 2);

    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const shade = (Math.random() - 0.5) * 18;
      const sr = Math.min(255, Math.max(15, r + shade));
      const sg = Math.min(255, Math.max(15, g + shade));
      const sb = Math.min(255, Math.max(18, b + shade));

      ctx.fillStyle = `rgb(${Math.round(sr)}, ${Math.round(sg)}, ${Math.round(sb)})`;
      ctx.fillRect(x + 4, y + 4, colW - 8, rowH - 8);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + rowH - 5);
      ctx.lineTo(x + 5, y + 5);
      ctx.lineTo(x + colW - 5, y + 5);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x + 5, y + rowH - 5);
      ctx.lineTo(x + colW - 5, y + rowH - 5);
      ctx.lineTo(x + colW - 5, y + 5);
      ctx.stroke();

      if (row === 0 || row === 3) {
        ctx.strokeStyle = 'rgba(201, 162, 75, 0.22)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 18, y + 18, colW - 36, rowH - 36);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 10. Gothic Cathedral Stained Glass Rose & Lancets Texture
export function createStainedGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#38BDF8');
  grad.addColorStop(0.35, '#1D4ED8');
  grad.addColorStop(0.75, '#312E81');
  grad.addColorStop(1, '#0F172A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 6;

  for (let y = 0; y < 1024; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      if ((x / 64 + y / 64) % 3 === 0) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.38)';
        ctx.fillRect(x + 4, y + 4, 56, 56);
      } else if ((x / 64 + y / 64) % 5 === 0) {
        ctx.fillStyle = 'rgba(153, 27, 27, 0.42)';
        ctx.fillRect(x + 4, y + 4, 56, 56);
      }
      ctx.strokeRect(x, y, 64, 64);
    }
  }

  const cx = 256;
  const cy = 240;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.65)';
  ctx.beginPath();
  ctx.arc(cx, cy, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * 130, cy + Math.sin(ang) * 130);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 11. Medieval Castle Flagstone & Worn Sanctuary Carpet Texture
export function createCarpetTexture(baseHex = '#23262E', repeatX = 8, repeatY = 8): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const { r, g, b } = hexToRgb(baseHex || '#23262E');
  ctx.fillStyle = '#0D0F14';
  ctx.fillRect(0, 0, 512, 512);

  // Carved Castle Flagstone Grid with Subtle Gold/Crimson Filigree Border
  const blockSize = 122;
  const gap = 6;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * (blockSize + gap) + gap / 2;
      const y = row * (blockSize + gap) + gap / 2;
      const tone = (Math.random() - 0.5) * 18;
      const tr = Math.min(255, Math.max(12, r + tone));
      const tg = Math.min(255, Math.max(12, g + tone));
      const tb = Math.min(255, Math.max(15, b + tone));

      ctx.fillStyle = `rgb(${Math.round(tr)}, ${Math.round(tg)}, ${Math.round(tb)})`;
      ctx.fillRect(x, y, blockSize, blockSize);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 2, y + 2, blockSize - 4, blockSize - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 12. Medieval Heraldic War Standard Banner Texture (`halloween_rollup_banner` Counterpart)
export function createRollupBannerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;

  // Aged charred-crimson & obsidian woven tapestry ground
  const bg = ctx.createLinearGradient(0, 0, 0, 1280);
  bg.addColorStop(0, '#2C1216');
  bg.addColorStop(0.5, '#1B0E12');
  bg.addColorStop(1, '#0B0709');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 1280);

  // Tarnished gold double heraldic border
  ctx.strokeStyle = '#C9A24B';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, 464, 1232);
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, 432, 1200);

  // Blood-Moon Eclipse Crest at Top
  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.arc(256, 230, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1B0E12';
  ctx.beginPath();
  ctx.arc(276, 220, 56, 0, Math.PI * 2);
  ctx.fill();

  // Heraldic Inscription
  ctx.fillStyle = '#C9A24B';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('ORDO UMBRAE IMPERIALIS', 256, 375);

  ctx.fillStyle = '#EA580C';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText('HALLOWEEN', 256, 540);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillText('at the', 256, 595);

  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('SANCTUM', 256, 665);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '24px Georgia, serif';
  ctx.fillText('✦ Parallel World Grimorium ✦', 256, 730);

  // Glowing Cursed Jack-o'-lantern Crest Emblem
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.ellipse(256, 955, 76, 62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.moveTo(226, 935);
  ctx.lineTo(244, 955);
  ctx.lineTo(214, 955);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(286, 935);
  ctx.lineTo(304, 955);
  ctx.lineTo(274, 955);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#C9A24B';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('ANNO DOMINI • IV SEALS OF BANISHMENT', 256, 1185);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 13. Cursed Runic Stone Monolith Tablet with Blood-Crimson Inscriptions (`sliding_whiteboard_system` Counterpart)
export function createWhiteboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark weathered slate stone tablet base
  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#1C2029');
  grad.addColorStop(0.5, '#252A36');
  grad.addColorStop(1, '#151820');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Carved gold/stone runic border
  ctx.strokeStyle = 'rgba(201, 162, 75, 0.45)';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 984, 472);
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 960, 448);

  // Arcane sigil circle on left side of stone tablet
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(260, 256, 130, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(260, 256, 98, 0, Math.PI * 2);
  ctx.stroke();

  // Blood-crimson arcane & mathematical equations on right side (preserving the real-world equation clue!)
  ctx.strokeStyle = '#EF4444';
  ctx.fillStyle = '#EF4444';
  ctx.font = 'italic bold 30px Georgia, serif';
  ctx.fillText('(y_m - y_n) + ε', 640, 165);
  ctx.beginPath();
  ctx.moveTo(635, 180);
  ctx.lineTo(865, 180);
  ctx.stroke();
  ctx.fillText('⟨h⟩ · 10⁻⁴', 690, 220);

  ctx.font = 'italic bold 28px Georgia, serif';
  ctx.fillText('σ² = ∑ (x_i - μ)² / N', 600, 295);
  ctx.fillText('10⁻²⁰', 885, 285);

  ctx.fillStyle = 'rgba(251, 191, 36, 0.78)';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('“Seek the Crimson Quill, the Emerald Cauldron, the Pale Moons, and the Midnight Coffer”', 95, 445);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}



