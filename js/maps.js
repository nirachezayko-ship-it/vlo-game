"use strict";

const MapSystem = (() => {
 const W = 800;
 const H = 533;
 const MAP_WIDTH = 1536;
 const MAP_HEIGHT = 1024;
 const SCALE_X = MAP_WIDTH / W;
 const SCALE_Y = MAP_HEIGHT / H;

 const CELL_SIZE = 4;
 const COLS = Math.floor(W / CELL_SIZE);
 const ROWS = Math.floor(H / CELL_SIZE);

 // =========================================================
 // 1. COLLISION RUMAH ERVILIA (rumah_modern.png)
 // =========================================================
 const ERVILIA_COLLIDERS = [
  [0, 0, 800, 32],
  [0, 0, 34, 533],
  [768, 0, 32, 533],
  [0, 412, 346, 121],
  [464, 412, 336, 121],
  [0, 504, 800, 29],

  [282, 26, 14, 122],
  [282, 196, 14, 24],
  [20, 206, 334, 16],
  [156, 222, 14, 122],
  [156, 396, 14, 24],
  [466, 206, 248, 16],
  [464, 264, 18, 152],

  [296, 26, 184, 96],
  [296, 122, 54, 28],
  [410, 122, 70, 28],
  [700, 26, 70, 232],

  [55, 42, 138, 134],
  [225, 28, 56, 102],
  [34, 246, 28, 152],
  [64, 232, 86, 62],
  [236, 224, 102, 34],
  [198, 278, 26, 92],
  [250, 274, 148, 52],
  [272, 332, 92, 46],
  [480, 28, 218, 72],
  [528, 134, 118, 60],
  [556, 224, 118, 56],
  [540, 306, 154, 86]
 ];

 function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(false));
 }

 const MAPS = {
  ervilia: {
   id: "ervilia",
   title: "Rumah Ervilia",
   imgSrc: "assets/maps/rumah_modern.png",
   colSrc: null,
   colliders: ERVILIA_COLLIDERS,
   img: new Image(),
   ready: false,
   navGrid: createEmptyGrid(),
   doorExit: { x: 405, y: 465 },
   rooms: {
    kamarUtama: { label: "🛏️ Kamar", name: "Kamar Ervilia", x: 215, y: 162, sleepX: 196, sleepY: 138, actions: ["📖 Membaca novel...", "👕 Merapikan baju...", "🪟 Melihat taman..."] },
    kamarMandi: { label: "🚿 Mandi", name: "Kamar Mandi", x: 382, y: 112, bathX: 375, bathY: 108, actions: ["🚿 Mandi segar...", "🪥 Gosok gigi...", "🧼 Cuci muka..."] },
    ruangKerja: { label: "💻 Kerja", name: "Ruang Kerja", x: 112, y: 312, workX: 108, workY: 302, actions: ["💻 Bekerja di PC...", "📊 Menyusun jadwal...", "🎧 Fokus kerja..."] },
    ruangTamu:  { label: "📺 Tamu",  name: "Ruang Tamu", x: 418, y: 280, actions: ["📺 Menonton TV...", "☕ Minum teh hangat...", "🛋️ Santai di sofa..."] },
    dapur:      { label: "🍳 Dapur", name: "Dapur Ervilia", x: 565, y: 112, cookX: 545, cookY: 108, actions: ["🍳 Memasak sarapan...", "🥘 Mengaduk sup...", "🔪 Memotong buah..."] },
    kamarPink:  { label: "🧸 K.Tamu", name: "Kamar Tamu", x: 525, y: 255, actions: ["📚 Membaca komik...", "✨ Merapikan rak...", "🎶 Bersenandung..."] },
    teras:      { label: "🌿 Teras", name: "Teras Ervilia", x: 405, y: 455, actions: ["🌿 Menghirup udara segar...", "☀️ Menikmati pagi...", "🌸 Menyiram bunga..."] }
   }
  },
  uby: {
   id: "uby",
   title: "Rumah Uby",
   imgSrc: "assets/maps/rumah_uby.png",
   colSrc: "assets/maps/rumah_uby_collision.png",
   colliders: null,
   img: new Image(),
   ready: false,
   navGrid: createEmptyGrid(),
   doorExit: { x: 405, y: 465 },
   rooms: {
    kamarUby:   { label: "🛏️ Kamar Uby", name: "Kamar Uby", x: 215, y: 162, sleepX: 215, sleepY: 138, actions: ["😴 Rebahan santai...", "🎮 Main game genggam...", "📔 Menulis jurnal..."] },
    kamarMandi: { label: "🚿 Mandi", name: "Kamar Mandi Uby", x: 365, y: 145, bathX: 365, bathY: 140, actions: ["🚿 Mandi air hangat...", "🪥 Bersiap diri...", "🧼 Cuci tangan..."] },
    ruangSantai:{ label: "💻 Studio", name: "Ruang Hobi Uby", x: 155, y: 368, actions: ["🎧 Mendengarkan musik...", "🎨 Menggambar sketsa...", "💻 Browsing internet..."] },
    ruangTamu:  { label: "📺 Tamu",  name: "Ruang Tamu Uby", x: 385, y: 382, actions: ["🍿 Ngemil camilan...", "📺 Nonton anime...", "🛋️ Santai di ruang tamu..."] },
    dapurUby:   { label: "🍳 Dapur", name: "Dapur Uby", x: 525, y: 120, cookX: 525, cookY: 112, actions: ["🥞 Membuat pancake...", "🍵 Menyeduh matcha...", "🍳 Masak sarapan..."] },
    terasUby:   { label: "🌿 Teras", name: "Teras Uby", x: 405, y: 455, actions: ["🌤️ Melihat langit...", "🌿 Santai di teras...", "🐱 Melihat sekitar..."] }
   }
  }
 };

 function isPointBlocked(colliders, x, y) {
  const pad = 7;
  for (const [sx, sy, sw, sh] of colliders) {
   if (x + pad > sx && x - pad < sx + sw && y + pad > sy && y - pad < sy + sh) {
    return true;
   }
  }
  return false;
 }

 // Bangun grid untuk setiap map
 Object.values(MAPS).forEach(mapObj => {
  if (mapObj.colliders) {
   for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
     const wx = c * CELL_SIZE + CELL_SIZE / 2;
     const wy = r * CELL_SIZE + CELL_SIZE / 2;
     mapObj.navGrid[r][c] = !isPointBlocked(mapObj.colliders, wx, wy);
    }
   }
  }

  mapObj.img.src = mapObj.imgSrc;
  mapObj.img.onload = () => { mapObj.ready = true; };

  // Baca mask 1536x1024 px: HANYA HIJAU yang boleh dilewati, MERAH & lainnya dilarang!
  if (mapObj.colSrc) {
   const colImg = new Image();
   colImg.src = mapObj.colSrc;
   colImg.onload = () => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = MAP_WIDTH;
    tempCanvas.height = MAP_HEIGHT;
    const tCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
    tCtx.drawImage(colImg, 0, 0, MAP_WIDTH, MAP_HEIGHT);
    const pxData = tCtx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT).data;

    // 1. Cek piksel hijau murni di setiap sel
    const rawGreen = createEmptyGrid();
    for (let r = 0; r < ROWS; r++) {
     for (let c = 0; c < COLS; c++) {
      if (r <= 1 || c <= 1 || r >= ROWS - 2 || c >= COLS - 2) {
       rawGreen[r][c] = false;
       continue;
      }
      const wx = c * CELL_SIZE + CELL_SIZE / 2;
      const wy = r * CELL_SIZE + CELL_SIZE / 2;
      const px = Math.min(MAP_WIDTH - 1, Math.max(0, Math.floor(wx * SCALE_X)));
      const py = Math.min(MAP_HEIGHT - 1, Math.max(0, Math.floor(wy * SCALE_Y)));
      const idx = (py * MAP_WIDTH + px) * 4;

      const red = pxData[idx];
      const green = pxData[idx + 1];
      const blue = pxData[idx + 2];

      // Hijau terang = boleh dilewati
      rawGreen[r][c] = (green > 150 && red < 120 && blue < 120);
     }
    }

    // 2. Beri padding 1 sel (4px) dari batas merah agar badan karakter tidak nyerempet tembok
    const finalGrid = createEmptyGrid();
    for (let r = 0; r < ROWS; r++) {
     for (let c = 0; c < COLS; c++) {
      if (!rawGreen[r][c]) {
       finalGrid[r][c] = false;
       continue;
      }
      let safe = true;
      for (let dr = -1; dr <= 1; dr++) {
       for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || !rawGreen[nr][nc]) {
         safe = false;
         break;
        }
       }
       if (!safe) break;
      }
      finalGrid[r][c] = safe;
     }
    }

    mapObj.navGrid = finalGrid;
   };
  }
 });

 function findNearestWalkable(grid, gx, gy) {
  gx = Math.max(1, Math.min(COLS - 2, gx));
  gy = Math.max(1, Math.min(ROWS - 2, gy));
  if (grid[gy][gx]) return { gx, gy };

  for (let rad = 1; rad < 30; rad++) {
   for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
     const nx = gx + dx;
     const ny = gy + dy;
     if (nx >= 1 && ny >= 1 && nx < COLS - 1 && ny < ROWS - 1 && grid[ny][nx]) {
      return { gx: nx, gy: ny };
     }
    }
   }
  }
  return null;
 }

 function findPathOnMap(mapId, startX, startY, targetX, targetY) {
  const grid = MAPS[mapId].navGrid;
  const start = findNearestWalkable(grid, Math.floor(startX / CELL_SIZE), Math.floor(startY / CELL_SIZE));
  const goal = findNearestWalkable(grid, Math.floor(targetX / CELL_SIZE), Math.floor(targetY / CELL_SIZE));
  if (!start || !goal) return [];

  const open = [];
  const closed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const gScore = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));

  gScore[start.gy][start.gx] = 0;
  open.push({ gx: start.gx, gy: start.gy, f: Math.hypot(goal.gx - start.gx, goal.gy - start.gy) });

  const dirs = [
   [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
   [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]
  ];

  while (open.length > 0) {
   open.sort((a, b) => a.f - b.f);
   const curr = open.shift();

   if (curr.gx === goal.gx && curr.gy === goal.gy) {
    const path = [];
    let p = curr;
    while (p) {
     path.unshift({
      x: p.gx * CELL_SIZE + CELL_SIZE / 2,
      y: p.gy * CELL_SIZE + CELL_SIZE / 2
     });
     p = parent[p.gy][p.gx];
    }
    return path.slice(1);
   }

   closed[curr.gy][curr.gx] = true;

   for (const [dx, dy, cost] of dirs) {
    const nx = curr.gx + dx;
    const ny = curr.gy + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    if (!grid[ny][nx] || closed[ny][nx]) continue;

    if (dx !== 0 && dy !== 0) {
     if (!grid[curr.gy][nx] || !grid[ny][curr.gx]) continue;
    }

    const tentativeG = gScore[curr.gy][curr.gx] + cost;
    if (tentativeG < gScore[ny][nx]) {
     parent[ny][nx] = curr;
     gScore[ny][nx] = tentativeG;
     const f = tentativeG + Math.hypot(goal.gx - nx, goal.gy - ny);
     if (!open.some(n => n.gx === nx && n.gy === ny)) {
      open.push({ gx: nx, gy: ny, f });
     }
    }
   }
  }
  return [];
 }

 return { W, H, MAP_WIDTH, MAP_HEIGHT, MAPS, findPathOnMap };
})();
