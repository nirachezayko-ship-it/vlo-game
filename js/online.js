"use strict";

const OnlineCoop = (() => {
 let peer = null;
 let conn = null;
 let isOnline = false;
 let isHost = false;
 let roomCode = "";
 let myCharId = "ervilia";
 let partnerConnected = false;
 let syncInterval = null;

 const PREFIX = "yumeid-ervuby-room-";

 function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
 }

 function updateBadge(text, active = true) {
  const badge = document.getElementById("onlineBadge");
  if (!badge) return;
  badge.classList.toggle("hidden", !active);
  badge.textContent = text;
 }

 function setupConnection(connection, onChatReceive, onGameStart) {
  conn = connection;

  conn.on("open", () => {
   partnerConnected = true;
   updateBadge(`🌐 Room ${roomCode} • ${myCharId === "ervilia" ? "Ervilia" : "Uby"} (Terhubung!)`, true);

   if (isHost) {
    conn.send({ type: "ROLE_ASSIGN", hostChar: myCharId });
   }
   if (onGameStart) onGameStart(myCharId);
  });

  conn.on("data", data => {
   if (!data || typeof data !== "object") return;

   if (data.type === "ROLE_ASSIGN") {
    myCharId = data.hostChar === "ervilia" ? "uby" : "ervilia";
    updateBadge(`🌐 Room ${roomCode} • Kamu: ${myCharId === "ervilia" ? "Ervilia" : "Uby"}`, true);
    if (onGameStart) onGameStart(myCharId);
   } else if (data.type === "STATE_SYNC") {
    window.dispatchEvent(new CustomEvent("yume_remote_sync", { detail: data }));
   } else if (data.type === "CHAT_MSG") {
    if (onChatReceive) onChatReceive(data.sender, data.message);
   }
  });

  conn.on("close", () => {
   partnerConnected = false;
   updateBadge(`🌐 Room ${roomCode} • Partner terputus`, true);
  });
 }

 function hostRoom(chosenChar, modalBodyEl, onGameStart, onChatReceive) {
  cleanup();
  isOnline = true;
  isHost = true;
  myCharId = chosenChar;
  roomCode = generateCode();

  modalBodyEl.innerHTML = `
   <p>Membuat room online...</p>
   <p style="font-size:12px;color:#94a3b8;">Menghubungkan ke jaringan PeerJS...</p>
  `;

  peer = new Peer(PREFIX + roomCode);

  peer.on("open", () => {
   updateBadge(`🌐 Room ${roomCode} • Menunggu partner...`, true);
   modalBodyEl.innerHTML = `
    <p>Bagikan <b>Kode Room</b> ini ke temanmu:</p>
    <div style="font-size:28px;font-weight:900;letter-spacing:5px;color:#38bdf8;background:#0f172a;padding:10px;border-radius:12px;margin:10px 0;border:1px dashed #38bdf8;">
     ${roomCode}
    </div>
    <p style="font-size:12px;color:#cbd5e1;">Kamu bermain sebagai: <b>${myCharId === "ervilia" ? "👩 Ervilia" : "👧 Uby"}</b></p>
    <p style="font-size:11px;color:#34d399;margin-top:8px;">⏳ Menunggu pemain ke-2 masuk (atau klik Mulai Duluan)...</p>
    <button id="btnStartHostNow" style="margin-top:10px;width:100%;padding:10px;border-radius:10px;border:none;background:#059669;color:#fff;font-weight:800;cursor:pointer;">▶ Masuk ke Rumah Duluan</button>
   `;

   document.getElementById("btnStartHostNow").addEventListener("click", () => {
    if (onGameStart) onGameStart(myCharId);
   });
  });

  peer.on("connection", incomingConn => {
   setupConnection(incomingConn, onChatReceive, onGameStart);
  });

  peer.on("error", err => {
   modalBodyEl.innerHTML = `<p style="color:#f87171;">Gagal membuat room (${err.type}). Coba ulangi lagi.</p>`;
  });
 }

 function joinRoom(inputCode, modalBodyEl, onGameStart, onChatReceive) {
  const cleanCode = String(inputCode || "").trim();
  if (cleanCode.length < 4) {
   alert("Masukkan 4 digit Kode Room dari temanmu!");
   return;
  }

  cleanup();
  isOnline = true;
  isHost = false;
  roomCode = cleanCode;

  modalBodyEl.innerHTML = `<p>Menghubungkan ke Room <b>${roomCode}</b>...</p>`;

  peer = new Peer();
  peer.on("open", () => {
   const outgoingConn = peer.connect(PREFIX + roomCode, { reliable: true });
   setupConnection(outgoingConn, onChatReceive, onGameStart);
  });

  peer.on("error", () => {
   modalBodyEl.innerHTML = `<p style="color:#f87171;">Room <b>${roomCode}</b> tidak ditemukan atau sudah tutup.</p>`;
  });
 }

 function openLobbyModal(modalBackdrop, modalTitle, modalBody, onGameStart, onChatReceive) {
  if (typeof Peer === "undefined") {
   alert("Library PeerJS gagal dimuat. Pastikan internet aktif!");
   return;
  }
  modalTitle.textContent = "🌐 Co-op Online (2 Player)";
  modalBody.innerHTML = `
   <div style="text-align:left;background:rgba(15,23,42,0.6);padding:12px;border-radius:12px;margin-bottom:12px;border:1px solid rgba(56,189,248,0.3);">
    <div style="font-weight:800;color:#38bdf8;margin-bottom:6px;">1. Buat Room Baru (Host)</div>
    <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;">Pilih karakter yang mau kamu mainkan:</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
     <button id="hostPickErv" style="flex:1;padding:8px;border-radius:10px;border:1px solid #38bdf8;background:#0284c7;color:#fff;font-weight:700;cursor:pointer;">👩 Jadi Ervilia</button>
     <button id="hostPickUby" style="flex:1;padding:8px;border-radius:10px;border:1px solid #f472b6;background:#db2777;color:#fff;font-weight:700;cursor:pointer;">👧 Jadi Uby</button>
    </div>
   </div>

   <div style="text-align:left;background:rgba(15,23,42,0.6);padding:12px;border-radius:12px;border:1px solid rgba(244,114,182,0.3);">
    <div style="font-weight:800;color:#f472b6;margin-bottom:6px;">2. Gabung Room Teman (Guest)</div>
    <div style="display:flex;gap:6px;">
     <input id="joinRoomInput" maxlength="4" placeholder="Kode 4 digit..." style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff;font-weight:800;letter-spacing:2px;text-align:center;">
     <button id="btnJoinRoom" style="padding:8px 14px;border-radius:10px;border:none;background:#10b981;color:#0f172a;font-weight:800;cursor:pointer;">Gabung</button>
    </div>
   </div>
  `;
  modalBackdrop.classList.add("open");

  document.getElementById("hostPickErv").onclick = () => hostRoom("ervilia", modalBody, onGameStart, onChatReceive);
  document.getElementById("hostPickUby").onclick = () => hostRoom("uby", modalBody, onGameStart, onChatReceive);
  document.getElementById("btnJoinRoom").onclick = () => {
   const code = document.getElementById("joinRoomInput").value;
   joinRoom(code, modalBody, onGameStart, onChatReceive);
  };
 }

 function sendMyState(charObj) {
  if (!isOnline || !conn || !conn.open || !charObj) return;
  conn.send({
   type: "STATE_SYNC",
   charId: charObj.id,
   mapId: charObj.mapId,
   x: Math.round(charObj.x),
   y: Math.round(charObj.y),
   dir: charObj.dir,
   moving: charObj.moving,
   thought: charObj.thought,
   scheduleMode: charObj.scheduleMode || "MANUAL"
  });
 }

 function sendChatMessage(sender, message) {
  if (!isOnline || !conn || !conn.open) return false;
  conn.send({ type: "CHAT_MSG", sender, message });
  return true;
 }

 function cleanup() {
  if (syncInterval) clearInterval(syncInterval);
  if (conn) { try { conn.close(); } catch (_) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (_) {} peer = null; }
  isOnline = false;
  partnerConnected = false;
  updateBadge("", false);
 }

 return {
  openLobbyModal,
  sendMyState,
  sendChatMessage,
  cleanup,
  getState: () => ({ isOnline, isHost, myCharId, partnerConnected, roomCode })
 };
})();
