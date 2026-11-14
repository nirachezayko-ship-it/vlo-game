"use strict";

function createErviliaCharacter() {
 const sprites = {};
 for (const d of ["up", "down", "left", "right"]) {
  const img = new Image();
  img.src = `assets/characters/walk_${d}.png`;
  sprites[d] = img;
 }

 return {
  id: "ervilia",
  name: "Ervilia",
  homeMapId: "ervilia",
  badgeColor: "#0284c7",
  fallbackColor: "#38bdf8",
  sprites,
  mapId: "ervilia",
  x: 405,
  y: 365,
  speed: 2.1,
  dir: "down",
  frame: 0,
  animTime: 0,
  moving: false,
  path: [],
  targetMarker: null,
  currentRoomKey: null,
  thought: "Selamat pagi...",
  idleTimer: 60,
  scheduleMode: "",
  onArriveCallback: null,

  getDesiredRoutine(time) {
   const m = time.dayMins;
   if (m >= 1320 || m < 270) return "SLEEP";         // 22:00 - 04:30 Tidur
   if (m >= 300 && m < 420) return "COOK";           // 05:00 - 07:00 Masak
   if (m >= 420 && m < 450) return "BATH_MORNING";   // 07:00 - 07:30 Mandi pagi
   if (m >= 900 && m < 930) return "BATH_EVENING";   // 15:00 - 15:30 Mandi sore
   if (m >= 960 && m < 1110) return "VISIT_UBY";     // 16:00 - 18:30 Main ke Rumah Uby
   if (time.isMonday && (m >= 480 && m < 900)) return "WORK"; // Senin 08:00 - 15:00 Kerja
   return "FREE";
  },

  applyScheduleAction(routine, moveFn, randomRoomFn) {
   const rErv = MapSystem.MAPS.ervilia.rooms;
   if (routine === "COOK") {
    moveFn(this, "ervilia", rErv.dapur.cookX, rErv.dapur.cookY, "dapur", "🍳 Masak sarapan pagi...");
   } else if (routine === "BATH_MORNING" || routine === "BATH_EVENING") {
    moveFn(this, "ervilia", rErv.kamarMandi.bathX, rErv.kamarMandi.bathY, "kamarMandi", "🚿 Waktunya mandi...");
   } else if (routine === "WORK") {
    moveFn(this, "ervilia", rErv.ruangKerja.workX, rErv.ruangKerja.workY, "ruangKerja", "💻 Kerja mingguan (Senin)...");
   } else if (routine === "VISIT_UBY") {
    moveFn(this, "uby", 390, 275, "ruangTamu", "🏡 Main ke rumah Uby!");
   } else if (routine === "SLEEP") {
    moveFn(this, "ervilia", rErv.kamarUtama.sleepX, rErv.kamarUtama.sleepY, "kamarUtama", "😴 Waktunya tidur...");
   } else {
    randomRoomFn(this);
   }
  },

  onArrivePose() {
   if (this.scheduleMode === "COOK") {
    this.dir = "up";
    this.thought = "🍳 Memasak sarapan (05:00 - 07:00)...";
   } else if (this.scheduleMode === "BATH_MORNING" || this.scheduleMode === "BATH_EVENING") {
    this.dir = "up";
    this.thought = "🚿 Sedang mandi segar...";
   } else if (this.scheduleMode === "WORK") {
    this.dir = "up";
    this.thought = "💻 Kerja khusus hari Senin...";
   } else if (this.scheduleMode === "SLEEP") {
    this.dir = "left";
    this.thought = "💤 Zzz... Tidur nyenyak...";
   } else if (this.scheduleMode === "VISIT_UBY") {
    this.dir = "left";
    this.thought = "💬 Ngobrol seru bareng Uby!";
   } else {
    this.dir = "down";
    this.idleTimer = 150 + Math.random() * 180;
    const mapRooms = MapSystem.MAPS[this.mapId].rooms;
    if (this.currentRoomKey && mapRooms[this.currentRoomKey]) {
     const acts = mapRooms[this.currentRoomKey].actions;
     this.thought = acts[Math.floor(Math.random() * acts.length)];
    } else {
     this.thought = "Melihat-lihat sekitar...";
    }
   }
  }
 };
}
