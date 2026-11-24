import {
  DEFAULT_REEL_STRIPS,
  getDefaultRolesMaster,
  getDefaultCommonFlags,
  getDefaultSpecialRules
} from "../constants.js";
import { state } from "../state.js";
import { toggleModal } from "../utils.js";
import { saveStateToStorage, clearStorage } from "../storage.js";
import { populateFlagSelect, updateHudDisplay, renderReelGrid } from "./hud.js";
import { resetReelTest } from "./simulator.js";

/* ---------------------------------------------------------
   JSONエクスポート・インポート ＆ 初期設定リセット管理
   --------------------------------------------------------- */

export function openDataModal() {
  const msgEl = document.getElementById("data-status-msg");
  if (msgEl) msgEl.classList.add("hidden");
  toggleModal("modal-data");
}

export function showDataStatus(text, isSuccess = true) {
  const msgEl = document.getElementById("data-status-msg");
  if (!msgEl) return;
  msgEl.innerText = text;
  msgEl.className = isSuccess
    ? "p-2 rounded-lg text-xs font-mono border bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
    : "p-2 rounded-lg text-xs font-mono border bg-rose-950/50 border-rose-500/40 text-rose-300";
  msgEl.classList.remove("hidden");
}

export function buildProjectDataObject() {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    currentFlag: state.currentFlag,
    firstStoppedReel: state.firstStoppedReel,
    missPolicy: document.getElementById("sim-miss-policy").value,
    reelStrips: state.reelStrips,
    rolesMaster: state.rolesMaster,
    commonFlags: state.commonFlags,
    specialRules: state.specialRules,
    reelStopState: state.reelStopState
  };
}

export function exportProjectDataJSON() {
  try {
    const dataObj = buildProjectDataObject();
    const jsonStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    a.href = url;
    a.download = `reel_config_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showDataStatus("JSONファイルをダウンロードしました！");
  } catch (err) {
    showDataStatus("エクスポート失敗: " + err.message, false);
  }
}

export function copyProjectDataToClipboard() {
  try {
    const jsonStr = JSON.stringify(buildProjectDataObject(), null, 2);
    const ta = document.createElement("textarea");
    ta.value = jsonStr;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showDataStatus("JSONデータをクリップボードにコピーしました！");
  } catch (err) {
    showDataStatus("コピー失敗: " + err.message, false);
  }
}

export function applyProjectData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("無効なJSONフォーマットです");
  }
  if (Array.isArray(data.reelStrips) && data.reelStrips.length === 3 && data.reelStrips.every(s => Array.isArray(s) && s.length === 21)) {
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
  if (data.firstStoppedReel === 0 || data.firstStoppedReel === 1 || data.firstStoppedReel === 2 || data.firstStoppedReel === null) {
    state.firstStoppedReel = data.firstStoppedReel;
  }
  if (typeof data.missPolicy === "string") {
    const policyEl = document.getElementById("sim-miss-policy");
    if (policyEl) policyEl.value = data.missPolicy;
  }
  if (Array.isArray(data.reelStopState) && data.reelStopState.length === 3) {
    state.reelStopState = data.reelStopState;
  }

  saveStateToStorage();
  populateFlagSelect();
  updateHudDisplay();
  renderReelGrid();
}

export function importProjectDataFromFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);
      applyProjectData(parsed);
      showDataStatus(`「${file.name}」から設定を復元しました！`);
    } catch (err) {
      showDataStatus("ファイル解析エラー: " + err.message, false);
    }
  };
  reader.onerror = function () {
    showDataStatus("ファイルの読み取りに失敗しました", false);
  };
  reader.readAsText(file);
}

export function importProjectDataFromText() {
  const text = document.getElementById("json-paste-area").value.trim();
  if (!text) {
    showDataStatus("JSONテキストを入力してください", false);
    return;
  }
  try {
    const parsed = JSON.parse(text);
    applyProjectData(parsed);
    showDataStatus("貼り付けられたJSON設定を正常に適用しました！");
    document.getElementById("json-paste-area").value = "";
  } catch (err) {
    showDataStatus("JSON解析エラー: " + err.message, false);
  }
}

export function resetToDefaultData() {
  state.reelStrips = DEFAULT_REEL_STRIPS.map(strip => [...strip]);
  state.rolesMaster = getDefaultRolesMaster();
  state.commonFlags = getDefaultCommonFlags();
  state.specialRules = getDefaultSpecialRules();

  state.currentFlag = "replay";
  const sel = document.getElementById("sim-miss-policy");
  if (sel) sel.value = "min";

  resetReelTest();
  clearStorage();
  populateFlagSelect();
  showDataStatus("初期サンプル設定に戻しました（自動保存データも初期化しました）");
}
