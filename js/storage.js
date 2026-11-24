import { state } from "./state.js";

/* ---------------------------------------------------------
   localStorage への自動保存・自動復元（端末内完結）
   --------------------------------------------------------- */

const STORAGE_KEY = "pachislo_reel_ctrl_v1";

export function buildPersistableData() {
  const policyEl = typeof document !== "undefined"
    ? document.getElementById("sim-miss-policy")
    : null;

  return {
    version: 4,
    savedAt: new Date().toISOString(),
    currentFlag: state.currentFlag,
    firstStoppedReel: state.firstStoppedReel,
    missPolicy: policyEl ? policyEl.value : "min",
    reelStrips: state.reelStrips,
    rolesMaster: state.rolesMaster,
    commonFlags: state.commonFlags,
    specialRules: state.specialRules,
    reelStopState: state.reelStopState
  };
}

export function saveStateToStorage() {
  try {
    if (typeof localStorage === "undefined") return false;
    const payload = buildPersistableData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    // プライベートブラウズや容量制限等で保存不可の場合もアプリ動作は継続
    console.warn("localStorage save skipped:", err);
    return false;
  }
}

export function loadStateFromStorage() {
  try {
    if (typeof localStorage === "undefined") return false;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return false;

    if (
      Array.isArray(data.reelStrips) &&
      data.reelStrips.length === 3 &&
      data.reelStrips.every(s => Array.isArray(s) && s.length === 21)
    ) {
      state.reelStrips = data.reelStrips.map(strip => [...strip]);
    }
    if (Array.isArray(data.rolesMaster) && data.rolesMaster.length > 0) {
      state.rolesMaster = data.rolesMaster;
    }
    if (Array.isArray(data.commonFlags)) {
      state.commonFlags = data.commonFlags;
    }
    if (Array.isArray(data.specialRules)) {
      state.specialRules = data.specialRules;
    }
    if (typeof data.currentFlag === "string") {
      state.currentFlag = data.currentFlag;
    }
    if (
      data.firstStoppedReel === 0 ||
      data.firstStoppedReel === 1 ||
      data.firstStoppedReel === 2 ||
      data.firstStoppedReel === null
    ) {
      state.firstStoppedReel = data.firstStoppedReel;
    }
    if (typeof data.missPolicy === "string" && typeof document !== "undefined") {
      const policyEl = document.getElementById("sim-miss-policy");
      if (policyEl) policyEl.value = data.missPolicy;
    }
    if (Array.isArray(data.reelStopState) && data.reelStopState.length === 3) {
      state.reelStopState = data.reelStopState;
    }
    return true;
  } catch (err) {
    console.warn("localStorage load skipped:", err);
    return false;
  }
}

export function clearStorage() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("localStorage clear skipped:", err);
  }
}
