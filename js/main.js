"use strict";

(() => {
 const canvas = document.getElementById("game");
 const ctx = canvas.getContext("2d");
 const clockEl = document.getElementById("clockDisplay");
 const roomBar = document.getElementById("roomBar");

 const splash1 = document.getElementById("splash1");
 const splash2 = document.getElementById("splash2");
 const mainMenu = document.getElementById("mainMenu");
 const modalBackdrop = document.getElementById("modalBackdrop");
 const modalTitle = document.getElementById("modalTitle");
 const modalBody = document.getElementById("modalBody");
 const onlineActionBar = document.getElementById("onlineActionBar");
 const toggleAutoBtn = document.getElementById("toggleAuto");
 const manualVisitBar = document.getElementById("manualVisitBar");
 const rightSidePanel = document.querySelector(".side-right");

 let gameStarted = false;
 let activeMapId = "ervilia";
 let autoScheduleEnabled = true;
 let selectedManualCharId = "ervilia";

 const CHARACTERS = {
  ervilia: createErviliaCharacter(),
  uby: createUbyCharacter()
 };

 // Simpan fungsi pose bawaan masing-masing karakter agar tidak bertumpuk
 for (const c of Object.values(CHARACTERS)) {
  c.defaultArrivePose = c.onArrivePose.bind(c);
  c.pendingAction = null;
 }

 // ==================================
 // FULLSCREEN & MENU
 // ==================================
 async function enterFullscreenLandscape() {
  try {
   const el = document.documentElement;
   if (!document.fullscreenElement) {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
   }
   if (screen.orientation && screen.orientation.lock) {
    await screen.orientation.lock("landscape");
   }
  } catch (_) {}
 }

 window.addEventListener("load", () => {
  enterFullscreenLandscape();
  setTimeout(() => {
   splash1.classList.add("hidden");
   splash2.classList.remove("hidden");
  }, 2200);
 });

 splash2.addEventListener("pointerdown", () => {
  AudioSystem.init();
  AudioSystem.playClick();
  enterFullscreenLandscape();
  splash2.classList.add("hidden");
  mainMenu.classList.remove("hidden");
  AudioSystem.playMusic("MENU");
 });

 document.getElementById("btnPlay").addEventListener("click", () => {
  AudioSystem.init();
  AudioSystem.playClick();
  enterFullscreenLandscape();
  if (typeof OnlineCoop !== "undefined") OnlineCoop.cleanup();
  mainMenu.classList.add("hidden");
  gameStarted = true;
  autoScheduleEnabled = true;

  // Kembalikan tampilan tombol & panel jadwal untuk Play Solo
  toggleAutoBtn.style.display = "";
  toggleAutoBtn.classList.add("on");
  toggleAutoBtn.textContent = "🤖 Jadwal: ON";
  if (rightSidePanel) rightSidePanel.style.display = "";

  if (manualVisitBar) manualVisitBar.classList.add("hidden");
  if (onlineActionBar) onlineActionBar.classList.add("hidden");
  if (btnPickErv) btnPickErv.style.display = "";
  if (btnPickUby) btnPickUby.style.display = "";
  const divEl = document.getElementById("pickDivider");
  if (divEl) divEl.style.display = "";
  const visitTitleEl = document.getElementById("visitBarTitle");
  if (visitTitleEl) visitTitleEl.textContent = "🚶 Kunjungan Bebas:";

  for (const c of Object.values(CHARACTERS)) c.pendingAction = null;

  AudioSystem.playMusic("GAME");
  evaluateAllSchedules(true);
 });

 // ==================================
 // MODE CO-OP ONLINE (1 ORANG 1 KARAKTER)
 // ==================================
 const btnOnlineMenu = document.getElementById("btnOnlineMenu");
 if (btnOnlineMenu && typeof OnlineCoop !== "undefined") {
  btnOnlineMenu.addEventListener("click", () => {
   AudioSystem.init();
   AudioSystem.playClick();
   OnlineCoop.openLobbyModal(
    modalBackdrop,
    modalTitle,
    modalBody,
    (assignedCharId) => {
     enterFullscreenLandscape();
     modalBackdrop.classList.remove("open");
     mainMenu.classList.add("hidden");
     gameStarted = true;
     autoScheduleEnabled = false;

     // Sembunyikan status/tombol jadwal di kanan atas & panel jadwal kanan saat Online
     toggleAutoBtn.style.display = "none";
     if (rightSidePanel) rightSidePanel.style.display = "none";

     setSelectedManualChar(assignedCharId);

     CHARACTERS.ervilia.scheduleMode = "MANUAL";
     CHARACTERS.uby.scheduleMode = "MANUAL";
     CHARACTERS.ervilia.pendingAction = null;
     CHARACTERS.uby.pendingAction = null;

     if (manualVisitBar) {
      manualVisitBar.classList.remove("hidden");
      const visitTitleEl = document.getElementById("visitBarTitle");
      if (visitTitleEl) {
       visitTitleEl.textContent = assignedCharId === "ervilia" ? "👩 Kamu: Ervilia |" : "👧 Kamu: Uby |";
      }
      if (btnPickErv) btnPickErv.style.display = "none";
      if (btnPickUby) btnPickUby.style.display = "none";
      const divEl = document.getElementById("pickDivider");
      if (divEl) divEl.style.display = "none";
     }

     if (onlineActionBar) {
      onlineActionBar.classList.remove("hidden");
      clearActiveActionButtons();
     }

     switchViewMap(assignedCharId);
     AudioSystem.playMusic("GAME");
    },
    (remoteSender, remoteMsg) => {
     addChatMessage(remoteSender, remoteMsg, "online");
     if (CHARACTERS[remoteSender]) {
      CHARACTERS[remoteSender].thought = `💬 "${remoteMsg}"`;
     }
    }
   );
  });
 }

 window.addEventListener("yume_remote_sync", e => {
  const d = e.detail;
  const remoteChar = CHARACTERS[d.charId];
  if (!remoteChar) return;
  remoteChar.mapId = d.mapId;
  remoteChar.x += (d.x - remoteChar.x) * 0.35;
  remoteChar.y += (d.y - remoteChar.y) * 0.35;
  remoteChar.dir = d.dir;
  remoteChar.moving = d.moving;
  remoteChar.thought = d.thought;
  if (d.scheduleMode) remoteChar.scheduleMode = d.scheduleMode;
  if (d.moving) {
   remoteChar.animTime += 1.2;
   remoteChar.frame = Math.floor(remoteChar.animTime / 10) % 3;
  } else {
   remoteChar.frame = 0;
  }
 });

 document.getElementById("btnSetting").addEventListener("click", () => {
  AudioSystem.openSettingsModal(modalBackdrop, modalTitle, modalBody);
 });
 document.getElementById("btnIngameSetting").addEventListener("click", () => {
  AudioSystem.openSettingsModal(modalBackdrop, modalTitle, modalBody);
 });

 document.getElementById("btnAbout").addEventListener("click", () => {
  AudioSystem.playClick();
  modalTitle.textContent = "About Game";
  modalBody.innerHTML = `
   <p><strong>Game ini masih test</strong></p>
   <p>Karakter: <strong>Ervilia & Uby</strong></p>
   <p>Developer: <strong>reine_XD</strong></p>
   <p>Central Java, Indonesia</p>
  `;
  modalBackdrop.classList.add("open");
 });

 document.getElementById("modalClose").addEventListener("click", () => {
  AudioSystem.playClick();
  modalBackdrop.classList.remove("open");
 });

 document.getElementById("btnBackMenu").addEventListener("click", () => {
  AudioSystem.playClick();
  if (typeof OnlineCoop !== "undefined") OnlineCoop.cleanup();
  if (onlineActionBar) onlineActionBar.classList.add("hidden");
  toggleAutoBtn.style.display = "";
  if (rightSidePanel) rightSidePanel.style.display = "";
  gameStarted = false;
  mainMenu.classList.remove("hidden");
  AudioSystem.playMusic("MENU");
 });

 // ==================================
 // NAVIGASI KARAKTER & LINTAS MAP
 // ==================================
 function commandCharMove(char, targetMapId, x, y, roomKey = null, customThought = null) {
  if (char.mapId !== targetMapId) {
   const exitPt = MapSystem.MAPS[char.mapId].doorExit;
   const pathToDoor = MapSystem.findPathOnMap(char.mapId, char.x, char.y, exitPt.x, exitPt.y);
   char.thought = `Berangkat ke ${MapSystem.MAPS[targetMapId].title}...`;
   char.onArriveCallback = () => {
    char.mapId = targetMapId;
    const entryPt = MapSystem.MAPS[targetMapId].doorExit;
    char.x = entryPt.x;
    char.y = entryPt.y - 10;
    commandCharMove(char, targetMapId, x, y, roomKey, customThought);
   };

   if (pathToDoor.length > 0) {
    char.path = pathToDoor;
    char.targetMarker = pathToDoor[pathToDoor.length - 1];
   } else {
    char.onArriveCallback();
    char.onArriveCallback = null;
   }
   return;
  }

  const path = MapSystem.findPathOnMap(char.mapId, char.x, char.y, x, y);
  if (path.length > 0) {
   char.path = path;
   char.targetMarker = path[path.length - 1];
   char.currentRoomKey = roomKey;
   char.onArriveCallback = null;

   if (customThought) char.thought = customThought;
   else if (roomKey && MapSystem.MAPS[char.mapId].rooms[roomKey]) {
    char.thought = `Menuju ${MapSystem.MAPS[char.mapId].rooms[roomKey].name}...`;
   } else {
    char.thought = "Berjalan...";
   }
  } else {
   // Karakter sudah berada di titik tujuan
   char.path = [];
   char.moving = false;
   char.targetMarker = null;
   char.currentRoomKey = roomKey;
   finishCharArrival(char);
  }
 }

 function finishCharArrival(char) {
  if (char.pendingAction) {
   const act = char.pendingAction;
   char.scheduleMode = act.key;
   char.dir = act.dir;
   char.thought = act.arriveThought;
   return;
  }
  if (!autoScheduleEnabled) {
   char.scheduleMode = "MANUAL";
   char.thought = char.currentRoomKey && MapSystem.MAPS[char.mapId].rooms[char.currentRoomKey]
    ? `Di ${MapSystem.MAPS[char.mapId].rooms[char.currentRoomKey].name}`
    : "✨ Santai~";
   return;
  }
  char.defaultArrivePose();
 }

 function pickRandomRoomForChar(char, overrideMapId = null) {
  const targetHouseId = overrideMapId || char.homeMapId;
  const mapObj = MapSystem.MAPS[targetHouseId];
  const roomKeys = Object.keys(mapObj.rooms).filter(k => k !== "kamarMandi");
  const candidates = roomKeys.filter(k => k !== char.currentRoomKey);
  const nextKey = candidates[Math.floor(Math.random() * candidates.length)];
  const room = mapObj.rooms[nextKey];

  const rx = room.x + (Math.random() * 14 - 7);
  const ry = room.y + (Math.random() * 14 - 7);
  commandCharMove(char, targetHouseId, rx, ry, nextKey);
 }

 // ==================================
 // WAKTU IN-GAME & JADWAL
 // ==================================
 const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
 const GAME_MINUTES_PER_REAL_SEC = 2.0;

 let dayIndex = 0;
 let totalGameMinutes = 4 * 60 + 45;
 const stats = { energy: 85, hunger: 70, hygiene: 80, mood: 90 };

 function getTimeInfo() {
  const dayMins = Math.floor(totalGameMinutes) % 1440;
  const hour = Math.floor(dayMins / 60);
  const minute = dayMins % 60;
  return {
   dayIndex,
   dayName: DAYS_OF_WEEK[dayIndex],
   isMonday: dayIndex === 0,
   dayMins,
   hour,
   minute,
   formatted: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
 }

 function evaluateAllSchedules(force = false) {
  if (!autoScheduleEnabled) return;
  const time = getTimeInfo();

  for (const char of Object.values(CHARACTERS)) {
   const desired = char.getDesiredRoutine(time);
   if (desired !== char.scheduleMode || force) {
    char.scheduleMode = desired;
    char.applyScheduleAction(desired, commandCharMove, pickRandomRoomForChar);
   }
  }
 }

 // ==================================
 // VIRTUAL PC & CHAT ANTAR KARAKTER
 // ==================================
 const pcBackdrop = document.getElementById("pcBackdrop");
 const pcMessages = document.getElementById("pcMessages");
 const pcOwnerLabel = document.getElementById("pcOwnerLabel");
 const pcContactName = document.getElementById("pcContactName");
 const pcMessageInput = document.getElementById("pcMessageInput");
 let activePcOwner = "ervilia";
 let randomChatTimer = 18 + Math.random() * 14;
 const chatKey = "yumeid_character_chat_v1";
 const randomChatLines = [
  ["Lagi apa sekarang?", "Aku lagi santai di rumah. Kamu?"],
  ["Tadi aku lihat langitnya bagus banget ✨", "Iya! Jadi pengin duduk di taman."],
  ["Sudah makan belum?", "Sudah dong. Kamu jangan lupa makan juga ya! 🍰"],
  ["Nanti kita ngobrol lagi, yuk.", "Boleh! Aku selalu senang ngobrol sama kamu 💗"],
  ["Aku menemukan sudut rumah yang nyaman.", "Ceritain dong, aku jadi penasaran!"],
  ["Hari ini terasa menyenangkan.", "Setuju! Semoga besok juga begitu 🌷"],
  ["Kamu sedang sibuk?", "Tidak terlalu. Ada yang mau kamu ceritakan?"],
  ["Aku mau istirahat sebentar 😴", "Oke, semoga istirahatmu nyaman!"]
 ];

 function readChatHistory() {
  try {
   const saved = JSON.parse(localStorage.getItem(chatKey) || "[]");
   return Array.isArray(saved) ? saved.slice(-100) : [];
  } catch (_) { return []; }
 }
 let chatHistory = readChatHistory();

 function saveChatHistory() {
  try { localStorage.setItem(chatKey, JSON.stringify(chatHistory.slice(-100))); } catch (_) {}
 }

 function addChatMessage(sender, message, type = "text") {
  const now = new Date();
  chatHistory.push({
   sender, message: String(message).slice(0, 180), type,
   time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  });
  chatHistory = chatHistory.slice(-100);
  saveChatHistory();
  if (pcBackdrop && pcBackdrop.classList.contains("open")) renderPcMessages();
 }

 function renderPcMessages() {
  if (!pcMessages) return;
  pcMessages.replaceChildren();
  if (!chatHistory.length) {
   const empty = document.createElement("div");
   empty.className = "pc-day";
   empty.textContent = "Belum ada pesan. Obrolan random akan dimulai otomatis ✨";
   pcMessages.appendChild(empty);
  }
  for (const item of chatHistory) {
   const bubble = document.createElement("div");
   bubble.className = "pc-bubble" + (item.sender === activePcOwner ? " mine" : "");
   const sender = document.createElement("div");
   sender.className = "pc-sender";
   sender.textContent = item.sender === "ervilia" ? "Ervilia" : "Uby";
   const body = document.createElement("div");
   body.textContent = item.message;
   const time = document.createElement("div");
   time.className = "pc-time";
   time.textContent = item.time || "";
   bubble.append(sender, body, time);
   pcMessages.appendChild(bubble);
  }
  pcMessages.scrollTop = pcMessages.scrollHeight;
 }

 function openVirtualPc(owner) {
  if (!pcBackdrop) return;
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  activePcOwner = net.isOnline ? net.myCharId : owner;
  const other = activePcOwner === "ervilia" ? "uby" : "ervilia";
  pcOwnerLabel.textContent = `Virtual PC ${CHARACTERS[activePcOwner].name}`;
  pcContactName.textContent = CHARACTERS[other].name;
  const pcStatus = document.getElementById("pcStatus");
  if (pcStatus) {
   pcStatus.textContent = net.isOnline ? `Online Room ${net.roomCode}` : "Koneksi lokal";
  }
  pcBackdrop.classList.add("open");
  renderPcMessages();
  setTimeout(() => pcMessageInput && pcMessageInput.focus(), 50);
 }

 function createRandomCharacterChat() {
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  if (net.isOnline) return;
  if (CHARACTERS.ervilia.mapId === CHARACTERS.uby.mapId) return;

  const pair = randomChatLines[Math.floor(Math.random() * randomChatLines.length)];
  const first = Math.random() < 0.5 ? "ervilia" : "uby";
  const second = first === "ervilia" ? "uby" : "ervilia";
  addChatMessage(first, pair[0], "random");
  addChatMessage(second, pair[1], "random");
  CHARACTERS[first].thought = "💬 Mengirim pesan ke " + CHARACTERS[second].name + "...";
  CHARACTERS[second].thought = "💻 Membalas pesan " + CHARACTERS[first].name + "...";
 }

 const btnPcErv = document.getElementById("btnPcErvilia");
 if (btnPcErv) btnPcErv.addEventListener("click", () => openVirtualPc("ervilia"));

 const btnPcUby = document.getElementById("btnPcUby");
 if (btnPcUby) btnPcUby.addEventListener("click", () => openVirtualPc("uby"));

 const btnPcClose = document.getElementById("pcClose");
 if (btnPcClose) btnPcClose.addEventListener("click", () => pcBackdrop.classList.remove("open"));

 if (pcBackdrop) {
  pcBackdrop.addEventListener("pointerdown", e => {
   if (e.target === pcBackdrop) pcBackdrop.classList.remove("open");
  });
 }

 const pcCompose = document.getElementById("pcCompose");
 if (pcCompose) {
  pcCompose.addEventListener("submit", e => {
   e.preventDefault();
   const message = pcMessageInput.value.trim();
   if (!message) return;
   addChatMessage(activePcOwner, message);
   pcMessageInput.value = "";

   const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
   if (net.isOnline) {
    OnlineCoop.sendChatMessage(net.myCharId, message);
    return;
   }

   const reply = activePcOwner === "ervilia" ? "uby" : "ervilia";
   const replies = ["Hehe, iya 😊", "Wah, begitu ya!", "Aku mengerti. Cerita lagi dong 💗", "Seru juga!", "Oke, nanti kita lanjut ngobrol ya!"];
   const response = replies[Math.floor(Math.random() * replies.length)];
   window.setTimeout(() => addChatMessage(reply, response, "reply"), 700 + Math.random() * 900);
  });
 }

 const pcRandomBtn = document.getElementById("pcRandomBtn");
 if (pcRandomBtn) pcRandomBtn.addEventListener("click", createRandomCharacterChat);

 // ==================================
 // UPDATE & RENDER LOOP
 // ==================================
 let lastTime = 0;
 let stepSoundTimer = 0;
 let activitySoundTimer = 0;

 function updateCharacter(char, dt, realDeltaSec) {
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  if (net.isOnline && net.partnerConnected && char.id !== net.myCharId) {
   return;
  }

  if (char.path.length > 0) {
   const nextPt = char.path[0];
   const dx = nextPt.x - char.x;
   const dy = nextPt.y - char.y;
   const dist = Math.hypot(dx, dy);

   if (dist < char.speed * dt) {
    char.x = nextPt.x;
    char.y = nextPt.y;
    char.path.shift();

    if (char.path.length === 0) {
     char.moving = false;
     char.targetMarker = null;

     if (char.onArriveCallback) {
      const cb = char.onArriveCallback;
      char.onArriveCallback = null;
      cb();
      return;
     }
     finishCharArrival(char);
    }
   } else {
    char.moving = true;
    const vx = (dx / dist) * char.speed * dt;
    const vy = (dy / dist) * char.speed * dt;
    char.x += vx;
    char.y += vy;

    char.dir = Math.abs(vx) > Math.abs(vy)
     ? (vx < 0 ? "left" : "right")
     : (vy < 0 ? "up" : "down");

    char.animTime += dt;
    char.frame = Math.floor(char.animTime / 10) % 3;

    if (char.mapId === activeMapId) {
     stepSoundTimer -= realDeltaSec;
     if (stepSoundTimer <= 0) {
      AudioSystem.playStep(char.y > 415);
      stepSoundTimer = 0.32;
     }
    }
   }
  } else {
   char.moving = false;
   char.frame = 0;
   char.animTime = 0;

   if (char.mapId === activeMapId) {
    activitySoundTimer -= realDeltaSec;
    if (activitySoundTimer <= 0) {
     if (char.scheduleMode === "COOK" || char.scheduleMode === "EAT") {
      AudioSystem.playActivity("COOK");
      activitySoundTimer = 1.7;
     }
     else if (char.scheduleMode.startsWith("BATH")) { AudioSystem.playActivity("BATH"); activitySoundTimer = 1.5; }
     else if (char.scheduleMode === "WORK") { AudioSystem.playActivity("WORK"); activitySoundTimer = 1.4; }
     else if (char.scheduleMode === "SLEEP") { AudioSystem.playActivity("SLEEP"); activitySoundTimer = 2.9; }
     else { activitySoundTimer = 3.5; }
    }
   }

   if (autoScheduleEnabled && (char.scheduleMode === "FREE" || char.scheduleMode === "VISIT_ERVILIA" || char.scheduleMode === "VISIT_UBY")) {
    char.idleTimer -= dt;
    if (char.idleTimer <= 0) {
     const visitMap = char.scheduleMode === "VISIT_ERVILIA" ? "ervilia"
      : char.scheduleMode === "VISIT_UBY" ? "uby"
      : char.homeMapId;
     pickRandomRoomForChar(char, visitMap);
    }
   }
  }
 }

 function updateHUD(time, realDeltaSec) {
  let icon = "☀️";
  if (time.hour >= 22 || time.hour < 5) icon = "🌙";
  else if (time.hour >= 5 && time.hour < 11) icon = "🌅";
  else if (time.hour >= 15 && time.hour < 18) icon = "🌤️";
  else if (time.hour >= 18) icon = "🌆";

  clockEl.textContent = `${icon} ${time.dayName}, ${time.formatted}`;

  const erv = CHARACTERS.ervilia;
  const uby = CHARACTERS.uby;
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };

  // Di mode online, panel Kondisi mengikuti karakter yang kamu mainkan
  const focusChar = net.isOnline ? CHARACTERS[net.myCharId] : erv;
  const panelTitle = document.querySelector(".side-left .deco-title span");
  if (panelTitle) panelTitle.textContent = `✨ Kondisi ${focusChar.name}`;

  document.getElementById("erviliaLocLabel").innerHTML =
   `<b>Ervilia:</b> ${MapSystem.MAPS[erv.mapId].title}<br><span style="color:#94a3b8;font-size:9.5px;">${erv.thought}</span>`;
  document.getElementById("ubyLocLabel").innerHTML =
   `<b>Uby:</b> ${MapSystem.MAPS[uby.mapId].title}<br><span style="color:#94a3b8;font-size:9.5px;">${uby.thought}</span>`;

  document.getElementById("schedCook").classList.toggle("active", erv.scheduleMode === "COOK");
  document.getElementById("schedBath1").classList.toggle("active", erv.scheduleMode === "BATH_MORNING");
  document.getElementById("schedWork").classList.toggle("active", erv.scheduleMode === "WORK");
  document.getElementById("schedVisitUby").classList.toggle("active", uby.scheduleMode === "VISIT_ERVILIA");
  document.getElementById("schedBath2").classList.toggle("active", erv.scheduleMode === "BATH_EVENING");
  document.getElementById("schedVisitErv").classList.toggle("active", erv.scheduleMode === "VISIT_UBY");
  document.getElementById("schedSleep").classList.toggle("active", erv.scheduleMode === "SLEEP");

  // Pemulihan dan pengurangan stat yang responsif
  if (focusChar.scheduleMode === "SLEEP" && !focusChar.moving) {
   stats.energy = Math.min(100, stats.energy + realDeltaSec * 3.5);
  } else if (net.isOnline) {
   // Di mode online, energi berkurang sangat perlahan agar tidak cepat habis
   stats.energy = Math.max(25, stats.energy - realDeltaSec * 0.06);
  } else {
   stats.energy = Math.max(25, stats.energy - realDeltaSec * 0.22);
  }

  if ((focusChar.scheduleMode === "COOK" || focusChar.scheduleMode === "EAT") && !focusChar.moving) {
   stats.hunger = Math.min(100, stats.hunger + realDeltaSec * 3.2);
  } else {
   stats.hunger = Math.max(25, stats.hunger - realDeltaSec * (net.isOnline ? 0.08 : 0.25));
  }

  if (focusChar.scheduleMode.startsWith("BATH") && !focusChar.moving) {
   stats.hygiene = Math.min(100, stats.hygiene + realDeltaSec * 4.0);
  } else {
   stats.hygiene = Math.max(30, stats.hygiene - realDeltaSec * (net.isOnline ? 0.06 : 0.22));
  }

  if (erv.mapId === uby.mapId || focusChar.scheduleMode === "WORK") {
   stats.mood = Math.min(100, stats.mood + realDeltaSec * 1.2);
  } else {
   stats.mood = Math.max(55, stats.mood - realDeltaSec * 0.12);
  }

  document.getElementById("valEnergy").textContent = `${Math.round(stats.energy)}%`;
  document.getElementById("barEnergy").style.width = `${Math.round(stats.energy)}%`;
  document.getElementById("valHunger").textContent = `${Math.round(stats.hunger)}%`;
  document.getElementById("barHunger").style.width = `${Math.round(stats.hunger)}%`;
  document.getElementById("valHygiene").textContent = `${Math.round(stats.hygiene)}%`;
  document.getElementById("barHygiene").style.width = `${Math.round(stats.hygiene)}%`;
  document.getElementById("valMood").textContent = `${Math.round(stats.mood)}%`;
  document.getElementById("barMood").style.width = `${Math.round(stats.mood)}%`;
 }

 function drawActiveMap() {
  const mapObj = MapSystem.MAPS[activeMapId];
  if (mapObj.ready) {
   ctx.drawImage(mapObj.img, 0, 0, MapSystem.MAP_WIDTH, MapSystem.MAP_HEIGHT, 0, 0, MapSystem.W, MapSystem.H);
  } else {
   ctx.fillStyle = "#d9d1c4";
   ctx.fillRect(0, 0, MapSystem.W, MapSystem.H);
   ctx.fillStyle = "#1e293b";
   ctx.font = "bold 16px system-ui";
   ctx.fillText(`Memuat ${mapObj.title}...`, 24, 60);
  }
 }

 function drawCharacter(char) {
  if (char.mapId !== activeMapId) return;

  if (char.targetMarker && char.path.length > 0) {
   ctx.save();
   ctx.strokeStyle = char.badgeColor + "88";
   ctx.lineWidth = 2;
   ctx.setLineDash([4, 4]);
   ctx.beginPath();
   ctx.moveTo(char.x, char.y);
   for (const pt of char.path) ctx.lineTo(pt.x, pt.y);
   ctx.stroke();
   ctx.restore();
  }

  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.beginPath();
  ctx.ellipse(char.x, char.y + 7, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  let img = char.sprites[char.dir];
  if (!img || !img.complete || !img.naturalWidth) {
   img = char.sprites.down;
  }

  if (img && img.complete && img.naturalWidth) {
   ctx.drawImage(
    img,
    char.frame * 128, 0, 128, 180,
    char.x - 19, char.y - 43, 38, 51
   );
  } else {
   ctx.fillStyle = char.fallbackColor;
   ctx.fillRect(char.x - 10, char.y - 25, 20, 28);
  }

  ctx.save();
  ctx.font = "700 10px system-ui, sans-serif";
  const fullLabel = `${char.name}: ${char.thought}`;
  const textW = ctx.measureText(fullLabel).width;
  const boxW = textW + 16;
  const boxH = 22;

  const bx = Math.max(8, Math.min(MapSystem.W - boxW - 8, char.x - boxW / 2));
  const by = Math.max(42, char.y - 68);

  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.strokeStyle = char.fallbackColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fullLabel, bx + boxW / 2, by + boxH / 2 + 0.5);
  ctx.restore();
 }

 function drawDayNightTint() {
  const { hour } = getTimeInfo();
  let overlay = null;
  if (hour >= 22 || hour < 5) overlay = "rgba(10, 18, 45, 0.36)";
  else if (hour >= 5 && hour < 7) overlay = "rgba(251, 146, 60, 0.12)";
  else if (hour >= 18 && hour < 22) overlay = "rgba(30, 27, 75, 0.18)";

  if (overlay) {
   ctx.fillStyle = overlay;
   ctx.fillRect(0, 0, MapSystem.W, MapSystem.H);
  }
 }

 function loop(t) {
  const rawDelta = lastTime ? (t - lastTime) / 1000 : 0.016;
  const realDeltaSec = Math.min(rawDelta, 0.1);
  const dt = Math.min(rawDelta * 60 || 1, 2);
  lastTime = t;

  if (gameStarted) {
   randomChatTimer -= realDeltaSec;
   if (randomChatTimer <= 0) {
    createRandomCharacterChat();
    randomChatTimer = 24 + Math.random() * 32;
   }
   totalGameMinutes += realDeltaSec * GAME_MINUTES_PER_REAL_SEC;
   if (totalGameMinutes >= 1440) {
    totalGameMinutes -= 1440;
    dayIndex = (dayIndex + 1) % 7;
   }

   const time = getTimeInfo();
   evaluateAllSchedules(false);
   for (const char of Object.values(CHARACTERS)) {
    updateCharacter(char, dt, realDeltaSec);
   }

   if (typeof OnlineCoop !== "undefined") {
    const net = OnlineCoop.getState();
    if (net.isOnline) {
     OnlineCoop.sendMyState(CHARACTERS[net.myCharId]);
    }
   }

   updateHUD(time, realDeltaSec);
  }

  drawActiveMap();

  const visibleChars = Object.values(CHARACTERS)
   .filter(c => c.mapId === activeMapId)
   .sort((a, b) => a.y - b.y);

  for (const c of visibleChars) {
   drawCharacter(c);
  }

  drawDayNightTint();
  requestAnimationFrame(loop);
 }

 // ==================================
 // AKSI INTERAKSI MANUAL (KHUSUS ONLINE)
 // ==================================
 const ACTION_CONFIG = {
  COOK: {
   key: "COOK",
   roomPref: ["dapur"],
   moveThought: "🍳 Menuju dapur untuk masak...",
   arriveThought: "🍳 Sedang memasak makanan lezat!",
   dir: "up"
  },
  EAT: {
   key: "EAT",
   roomPref: ["dapur", "ruangTamu"],
   moveThought: "🍱 Menuju dapur untuk makan...",
   arriveThought: "🍱 Lagi makan enak~ Nyam!",
   dir: "down"
  },
  BATH: {
   key: "BATH",
   roomPref: ["kamarMandi"],
   moveThought: "🚿 Menuju kamar mandi...",
   arriveThought: "🚿 Sedang mandi segar~",
   dir: "up"
  },
  WORK: {
   key: "WORK",
   roomPref: ["kerja", "kamar"],
   moveThought: "💻 Menuju meja PC...",
   arriveThought: "💻 Lagi main PC / ngerjain project!",
   dir: "up"
  },
  SLEEP: {
   key: "SLEEP",
   roomPref: ["kamar"],
   moveThought: "😴 Menuju kamar tidur...",
   arriveThought: "😴 Zzz... Sedang tidur nyenyak...",
   dir: "down"
  },
  IDLE: {
   key: "MANUAL",
   roomPref: null,
   moveThought: "✨ Santai dulu...",
   arriveThought: "✨ Lagi santai~",
   dir: "down"
  }
 };

 function clearActiveActionButtons() {
  document.querySelectorAll(".act-btn").forEach(b => b.classList.remove("active"));
  for (const c of Object.values(CHARACTERS)) {
   c.pendingAction = null;
  }
 }

 function triggerOnlineManualAction(actionKey) {
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  if (!net.isOnline) return;

  const me = CHARACTERS[net.myCharId];
  const cfg = ACTION_CONFIG[actionKey];
  if (!me || !cfg) return;

  AudioSystem.playClick();

  document.querySelectorAll(".act-btn").forEach(b => {
   b.classList.toggle("active", b.dataset.act === actionKey && actionKey !== "IDLE");
  });

  if (actionKey === "IDLE") {
   me.path = [];
   me.moving = false;
   me.targetMarker = null;
   me.pendingAction = null;
   me.scheduleMode = "MANUAL";
   me.thought = cfg.arriveThought;
   return;
  }

  const currentHouse = MapSystem.MAPS[me.mapId];
  let targetRoomKey = null;
  for (const rKey of cfg.roomPref) {
   if (currentHouse.rooms[rKey]) {
    targetRoomKey = rKey;
    break;
   }
  }

  if (targetRoomKey) {
   const room = currentHouse.rooms[targetRoomKey];
   me.pendingAction = cfg;
   me.scheduleMode = "MOVING_ACTION";
   commandCharMove(me, me.mapId, room.x, room.y, targetRoomKey, cfg.moveThought);
  }
 }

 document.querySelectorAll(".act-btn").forEach(btn => {
  btn.addEventListener("click", () => {
   triggerOnlineManualAction(btn.dataset.act);
  });
 });

 // ==================================
 // KONTROL INTERAKSI & KUNJUNGAN BEBAS
 // ==================================
 const btnPickErv = document.getElementById("btnPickErv");
 const btnPickUby = document.getElementById("btnPickUby");

 function setSelectedManualChar(charId) {
  selectedManualCharId = charId;
  if (btnPickErv) btnPickErv.classList.toggle("active", charId === "ervilia");
  if (btnPickUby) btnPickUby.classList.toggle("active", charId === "uby");
 }

 if (btnPickErv) {
  btnPickErv.addEventListener("click", () => {
   AudioSystem.playClick();
   setSelectedManualChar("ervilia");
  });
 }

 if (btnPickUby) {
  btnPickUby.addEventListener("click", () => {
   AudioSystem.playClick();
   setSelectedManualChar("uby");
  });
 }

 function getTargetCharForCommand(mapId) {
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  if (net.isOnline) {
   return CHARACTERS[net.myCharId];
  }
  if (!autoScheduleEnabled) {
   return CHARACTERS[selectedManualCharId] || CHARACTERS.ervilia;
  }
  return (mapId === "uby" && CHARACTERS.ervilia.mapId !== "uby")
   ? CHARACTERS.uby
   : CHARACTERS.ervilia;
 }

 function renderRoomButtonsForMap(mapId) {
  const rooms = MapSystem.MAPS[mapId].rooms;
  roomBar.innerHTML = "";
  for (const [key, r] of Object.entries(rooms)) {
   const btn = document.createElement("button");
   btn.className = "btn";
   btn.textContent = r.label;
   btn.addEventListener("click", () => {
    AudioSystem.playClick();
    clearActiveActionButtons();
    const targetChar = getTargetCharForCommand(mapId);
    if (!autoScheduleEnabled) targetChar.scheduleMode = "MANUAL";
    commandCharMove(targetChar, mapId, r.x, r.y, key);
   });
   roomBar.appendChild(btn);
  }
 }

 function switchViewMap(mapId) {
  AudioSystem.playClick();
  activeMapId = mapId;
  document.getElementById("tabMapErvilia").classList.toggle("active", mapId === "ervilia");
  document.getElementById("tabMapUby").classList.toggle("active", mapId === "uby");
  renderRoomButtonsForMap(mapId);
 }

 document.getElementById("tabMapErvilia").addEventListener("click", () => switchViewMap("ervilia"));
 document.getElementById("tabMapUby").addEventListener("click", () => switchViewMap("uby"));

 canvas.addEventListener("pointerdown", e => {
  if (!gameStarted) return;
  AudioSystem.playClick();
  clearActiveActionButtons();
  const rect = canvas.getBoundingClientRect();
  const clickX = ((e.clientX - rect.left) / rect.width) * MapSystem.W;
  const clickY = ((e.clientY - rect.top) / rect.height) * MapSystem.H;

  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  const targetChar = net.isOnline
   ? CHARACTERS[net.myCharId]
   : (!autoScheduleEnabled
      ? getTargetCharForCommand(activeMapId)
      : (CHARACTERS.ervilia.mapId === activeMapId ? CHARACTERS.ervilia : CHARACTERS.uby));

  if (!autoScheduleEnabled) targetChar.scheduleMode = "MANUAL";
  commandCharMove(targetChar, activeMapId, clickX, clickY, null);
 });

 toggleAutoBtn.addEventListener("click", () => {
  const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
  if (net.isOnline) return;

  AudioSystem.playClick();
  autoScheduleEnabled = !autoScheduleEnabled;
  toggleAutoBtn.classList.toggle("on", autoScheduleEnabled);
  toggleAutoBtn.textContent = autoScheduleEnabled ? "🤖 Jadwal: ON" : "🤖 Jadwal: OFF";

  if (manualVisitBar) {
   manualVisitBar.classList.toggle("hidden", autoScheduleEnabled);
  }

  if (autoScheduleEnabled) {
   evaluateAllSchedules(true);
  } else {
   CHARACTERS.ervilia.scheduleMode = "MANUAL";
   CHARACTERS.uby.scheduleMode = "MANUAL";
   CHARACTERS.ervilia.thought = "✨ Mode bebas aktif!";
   CHARACTERS.uby.thought = "✨ Mode bebas aktif!";
  }
 });

 const btnVisitUbyToErv = document.getElementById("btnVisitUbyToErv");
 if (btnVisitUbyToErv) {
  btnVisitUbyToErv.addEventListener("click", () => {
   const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
   if (net.isOnline && net.myCharId !== "uby") {
    alert("Kamu sedang bermain sebagai Ervilia!");
    return;
   }
   AudioSystem.playClick();
   clearActiveActionButtons();
   setSelectedManualChar("uby");
   CHARACTERS.uby.scheduleMode = "MANUAL";
   commandCharMove(CHARACTERS.uby, "ervilia", 418, 280, "ruangTamu", "🏡 Main ke rumah Ervilia!");
   switchViewMap("ervilia");
  });
 }

 const btnVisitErvToUby = document.getElementById("btnVisitErvToUby");
 if (btnVisitErvToUby) {
  btnVisitErvToUby.addEventListener("click", () => {
   const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
   if (net.isOnline && net.myCharId !== "ervilia") {
    alert("Kamu sedang bermain sebagai Uby!");
    return;
   }
   AudioSystem.playClick();
   clearActiveActionButtons();
   setSelectedManualChar("ervilia");
   CHARACTERS.ervilia.scheduleMode = "MANUAL";
   commandCharMove(CHARACTERS.ervilia, "uby", 385, 382, "ruangTamu", "🏠 Main ke rumah Uby!");
   switchViewMap("uby");
  });
 }

 const btnGatherHere = document.getElementById("btnGatherHere");
 if (btnGatherHere) {
  btnGatherHere.addEventListener("click", () => {
   AudioSystem.playClick();
   clearActiveActionButtons();
   const room = MapSystem.MAPS[activeMapId].rooms.ruangTamu;
   const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
   if (net.isOnline) {
    const me = CHARACTERS[net.myCharId];
    me.scheduleMode = "MANUAL";
    commandCharMove(me, activeMapId, room.x, room.y, "ruangTamu", "💞 Menuju ruang tamu!");
    return;
   }
   CHARACTERS.ervilia.scheduleMode = "MANUAL";
   CHARACTERS.uby.scheduleMode = "MANUAL";
   commandCharMove(CHARACTERS.ervilia, activeMapId, room.x - 16, room.y, "ruangTamu", "💞 Kumpul bareng!");
   commandCharMove(CHARACTERS.uby, activeMapId, room.x + 16, room.y, "ruangTamu", "💞 Kumpul bareng!");
  });
 }

 const btnReturnAllHome = document.getElementById("btnReturnAllHome");
 if (btnReturnAllHome) {
  btnReturnAllHome.addEventListener("click", () => {
   AudioSystem.playClick();
   clearActiveActionButtons();
   const net = typeof OnlineCoop !== "undefined" ? OnlineCoop.getState() : { isOnline: false };
   if (net.isOnline) {
    const me = CHARACTERS[net.myCharId];
    me.scheduleMode = "MANUAL";
    const homePos = me.id === "ervilia" ? { x: 418, y: 280 } : { x: 385, y: 382 };
    commandCharMove(me, me.homeMapId, homePos.x, homePos.y, "ruangTamu", "🏠 Pulang ke rumah...");
    switchViewMap(me.homeMapId);
    return;
   }
   CHARACTERS.ervilia.scheduleMode = "MANUAL";
   CHARACTERS.uby.scheduleMode = "MANUAL";
   commandCharMove(CHARACTERS.ervilia, "ervilia", 418, 280, "ruangTamu", "🏠 Pulang ke rumah...");
   commandCharMove(CHARACTERS.uby, "uby", 385, 382, "ruangTamu", "🏡 Pulang ke rumah...");
  });
 }

 document.getElementById("fullscreen").onclick = async () => {
  AudioSystem.playClick();
  if (!document.fullscreenElement) await enterFullscreenLandscape();
  else await document.exitFullscreen();
 };

 document.addEventListener("contextmenu", e => e.preventDefault());
 document.addEventListener("selectstart", e => e.preventDefault());

 renderRoomButtonsForMap("ervilia");
 requestAnimationFrame(loop);
})();
