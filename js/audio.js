"use strict";

const AudioSystem = (() => {
 let musicVolume = parseFloat(localStorage.getItem("yume_bgm_vol") ?? "0.50");
 let sfxVolume = parseFloat(localStorage.getItem("yume_sfx_vol") ?? "0.70");

 const bgmMenu = new Audio("assets/music/menu_utama.mp3");
 bgmMenu.loop = true;
 bgmMenu.volume = musicVolume;

 const bgmIngame = new Audio("assets/music/themes_ingame.mp3");
 bgmIngame.loop = true;
 bgmIngame.volume = musicVolume;

 let currentMusicState = "NONE";
 let audioCtx = null;
 let stepAlternate = false;

 function init() {
  if (!audioCtx) {
   const Ctx = window.AudioContext || window.webkitAudioContext;
   if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") {
   audioCtx.resume();
  }
 }

 function applyVolume() {
  bgmMenu.volume = musicVolume;
  bgmIngame.volume = musicVolume;
  const eq = document.getElementById("eqVisual");
  if (eq) eq.classList.toggle("paused", musicVolume <= 0.01);
 }

 function playMusic(target) {
  currentMusicState = target;
  applyVolume();

  if (target === "MENU") {
   bgmIngame.pause();
   bgmIngame.currentTime = 0;
   if (musicVolume > 0) bgmMenu.play().catch(() => {});
  } else if (target === "GAME") {
   bgmMenu.pause();
   bgmMenu.currentTime = 0;
   if (musicVolume > 0) bgmIngame.play().catch(() => {});
  } else {
   bgmMenu.pause();
   bgmIngame.pause();
  }
 }

 function playClick() {
  if (sfxVolume <= 0.01) return;
  init();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(920, now + 0.06);
  gain.gain.setValueAtTime(0.18 * sfxVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
 }

 function playStep(isGrass = false) {
  if (sfxVolume <= 0.01) return;
  init();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  stepAlternate = !stepAlternate;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = isGrass ? "triangle" : "sine";

  const baseFreq = isGrass ? 95 : (stepAlternate ? 145 : 130);
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(42, now + 0.055);
  gain.gain.setValueAtTime(0.20 * sfxVolume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.065);
 }

 function playActivity(type) {
  if (sfxVolume <= 0.01) return;
  init();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === "COOK" || type === "BATH") {
   const duration = type === "BATH" ? 0.45 : 0.25;
   const bufferSize = audioCtx.sampleRate * duration;
   const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
   const data = buffer.getChannelData(0);
   for (let i = 0; i < bufferSize; i++) {
    const env = type === "BATH"
     ? Math.sin((i / bufferSize) * Math.PI)
     : Math.exp(-i / (bufferSize * 0.4));
    data[i] = (Math.random() * 2 - 1) * env;
   }
   const noise = audioCtx.createBufferSource();
   noise.buffer = buffer;
   const filter = audioCtx.createBiquadFilter();
   filter.type = type === "BATH" ? "lowpass" : "bandpass";
   filter.frequency.value = type === "BATH" ? 950 : 1800;
   const gain = audioCtx.createGain();
   gain.gain.setValueAtTime((type === "BATH" ? 0.12 : 0.14) * sfxVolume, now);
   gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
   noise.connect(filter);
   filter.connect(gain);
   gain.connect(audioCtx.destination);
   noise.start(now);
  } else if (type === "SLEEP") {
   const osc = audioCtx.createOscillator();
   const gain = audioCtx.createGain();
   osc.type = "sine";
   osc.frequency.setValueAtTime(110, now);
   osc.frequency.linearRampToValueAtTime(85, now + 0.45);
   gain.gain.setValueAtTime(0.001, now);
   gain.gain.linearRampToValueAtTime(0.11 * sfxVolume, now + 0.2);
   gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
   osc.connect(gain);
   gain.connect(audioCtx.destination);
   osc.start(now);
   osc.stop(now + 0.52);
  } else if (type === "WORK") {
   [0, 0.08].forEach((offset, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(idx === 0 ? 780 : 690, now + offset);
    gain.gain.setValueAtTime(0.11 * sfxVolume, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.045);
   });
  }
 }

 function openSettingsModal(modalBackdrop, modalTitle, modalBody) {
  playClick();
  modalTitle.textContent = "⚙ Pengaturan Audio";
  const bgmPct = Math.round(musicVolume * 100);
  const sfxPct = Math.round(sfxVolume * 100);

  modalBody.innerHTML = `
   <div class="slider-group">
    <div class="slider-header">
     <span>🎵 Volume Musik (BGM)</span>
     <span id="bgmLabel">${bgmPct}%</span>
    </div>
    <input type="range" id="sliderBgm" min="0" max="100" value="${bgmPct}">
   </div>
   <div class="slider-group">
    <div class="slider-header">
     <span>🔊 Volume Sound FX (Step & Aksi)</span>
     <span id="sfxLabel">${sfxPct}%</span>
    </div>
    <input type="range" id="sliderSfx" min="0" max="100" value="${sfxPct}">
   </div>
  `;
  modalBackdrop.classList.add("open");

  document.getElementById("sliderBgm").addEventListener("input", e => {
   musicVolume = Number(e.target.value) / 100;
   document.getElementById("bgmLabel").textContent = `${e.target.value}%`;
   localStorage.setItem("yume_bgm_vol", musicVolume);
   applyVolume();
   if (musicVolume > 0 && currentMusicState !== "NONE") {
    if (currentMusicState === "MENU" && bgmMenu.paused) bgmMenu.play().catch(() => {});
    if (currentMusicState === "GAME" && bgmIngame.paused) bgmIngame.play().catch(() => {});
   } else if (musicVolume <= 0) {
    bgmMenu.pause();
    bgmIngame.pause();
   }
  });

  const sliderSfx = document.getElementById("sliderSfx");
  sliderSfx.addEventListener("input", e => {
   sfxVolume = Number(e.target.value) / 100;
   document.getElementById("sfxLabel").textContent = `${e.target.value}%`;
   localStorage.setItem("yume_sfx_vol", sfxVolume);
  });
  sliderSfx.addEventListener("change", () => playClick());
 }

 return { init, playMusic, playClick, playStep, playActivity, openSettingsModal };
})();
