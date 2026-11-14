"use strict";

function createUbyCharacter() {
 const sprites = {};
 const fallbackImg = new Image();
 fallbackImg.src = "assets/characters/uby/walk_down.png";
 fallbackImg.onerror = () => { fallbackImg.src = "assets/characters/walk_down.png"; };

 for (const d of ["up", "down", "left", "right"]) {
  const img = new Image();
  img.src = `assets/characters/uby/walk_${d}.png`;
  img.onerror = () => {
   sprites[d] = fallbackImg;
  };
  sprites[d] = img;
 }

 return {
  id: "uby",
  name: "Uby",
  homeMapId: "uby",
  badgeColor: "#db2777",
  fallbackColor: "#f472b6",
  sprites,
  mapId: "uby",
  x: 385,
  y: 382,
  speed: 2.0,
  dir: "down",
  frame: 0,
  animTime: 0,
  moving: false,
  path: [],
  targetMarker: null,
  currentRoomKey: null,
  thought: "Santai di rumah...",
  idleTimer: 90,
  scheduleMode: "",
  onArriveCallback: null,

  getDesiredRoutine(time) {
   const m = time.dayMins;
   if (m >= 1320 || m < 300) return "SLEEP";         // 22:00 - 05:00 Tidur
   if (m >= 450 && m < 480) return "BATH";           // 07:30 - 08:00 Mandi
   if (m >= 600 && m < 750) return "VISIT_ERVILIA";  // 10:00 - 12:30 Main ke Rumah Ervilia
   return "FREE";
  },

  applyScheduleAction(routine, moveFn, randomRoomFn) {
   const rUby = MapSystem.MAPS.uby.rooms;
   if (routine === "SLEEP") {
    moveFn(this, "uby", rUby.kamarUby.sleepX, rUby.kamarUby.sleepY, "kamarUby", "💤 Zzz... Tidur...");
   } else if (routine === "BATH") {
    moveFn(this, "uby", rUby.kamarMandi.bathX, rUby.kamarMandi.bathY, "kamarMandi", "🚿 Mandi pagi...");
   } else if (routine === "VISIT_ERVILIA") {
    moveFn(this, "ervilia", 418, 280, "ruangTamu", "🏠 Main ke rumah Ervilia!");
   } else {
    randomRoomFn(this);
   }
  },

  onArrivePose() {
   if (this.scheduleMode === "SLEEP") {
    this.dir = "left";
    this.thought = "💤 Zzz... Tidur nyenyak...";
   } else if (this.scheduleMode === "BATH") {
    this.dir = "up";
    this.thought = "🚿 Mandi air hangat...";
   } else if (this.scheduleMode === "VISIT_ERVILIA") {
    this.dir = "down";
    this.idleTimer = 110 + Math.random() * 110;
    const acts = [
     "💬 Main di rumah Ervilia!",
     "👀 Lihat-lihat rumah Ervilia...",
     "🛋️ Santai di ruang tamu Erv...",
     "🍪 Cari camilan di dapur Erv..."
    ];
    this.thought = acts[Math.floor(Math.random() * acts.length)];
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
