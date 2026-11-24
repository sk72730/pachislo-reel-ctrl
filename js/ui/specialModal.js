import { state } from "../state.js";
import { getFlagDisplayName, toggleModal } from "../utils.js";
import { saveStateToStorage } from "../storage.js";
import { renderReelGrid } from "./hud.js";

/* ---------------------------------------------------------
   特殊制御ルール管理モーダル
   --------------------------------------------------------- */

let editingSpecialIndex = null;

export function openSpecialModal() {
  closeSpecialEditor();
  renderSpecialRulesList();
  toggleModal("modal-special");
}

export function renderSpecialRulesList() {
  const container = document.getElementById("rules-special-list");
  container.innerHTML = "";
  const reelLabels = ["左リール", "中リール", "右リール"];

  if (state.specialRules.length === 0) {
    container.innerHTML = `<div class="text-slate-500 text-center py-6">特殊制御ルールは登録されていません</div>`;
    return;
  }

  state.specialRules.forEach((rule, idx) => {
    const posSym = state.reelStrips[rule.reelIndex]?.[rule.pushPos] || "";
    const div = document.createElement("div");
    div.className = "p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5";
    div.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-white truncate">${rule.name}</span>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="toggleSpecialRule(${idx})" class="px-2 py-0.5 rounded text-[10px] font-bold ${rule.active ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"}">
            ${rule.active ? "有効" : "無効"}
          </button>
          <button onclick="openSpecialEditor(${idx})" class="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-sky-300 font-bold">編集</button>
          <button onclick="deleteSpecialRule(${idx})" class="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-rose-400 font-bold">削除</button>
        </div>
      </div>
      <div class="text-[10px] text-slate-400 font-mono">
        条件: ${getFlagDisplayName(rule.flagId)} / ${reelLabels[rule.reelIndex]} [${rule.pushPos}番:${posSym}] ➜ <span class="text-amber-300 font-bold">強制${rule.forceSlide}コマ滑り</span>
      </div>
    `;
    container.appendChild(div);
  });
}

export function updateSpecialPosOptions(selectedPos = null) {
  const reelIdx = parseInt(document.getElementById("special-edit-reel").value, 10) || 0;
  const posSel = document.getElementById("special-edit-pos");
  const currentVal = selectedPos !== null ? selectedPos : (parseInt(posSel.value, 10) || 0);
  posSel.innerHTML = "";
  for (let p = 0; p < 21; p++) {
    const sym = state.reelStrips[reelIdx][p];
    const opt = document.createElement("option");
    opt.value = p;
    opt.innerText = `[${p < 10 ? "0" + p : p}] ${sym}`;
    if (p === currentVal) opt.selected = true;
    posSel.appendChild(opt);
  }
}

export function openSpecialEditor(idx) {
  editingSpecialIndex = idx;
  const panel = document.getElementById("special-editor-panel");
  const title = document.getElementById("special-editor-title");
  const nameInput = document.getElementById("special-edit-name");
  const flagSel = document.getElementById("special-edit-flag");
  const reelSel = document.getElementById("special-edit-reel");
  const slideSel = document.getElementById("special-edit-slide");

  flagSel.innerHTML = "";
  const optHazure = document.createElement("option");
  optHazure.value = "hazure";
  optHazure.innerText = "【ハズレ】";
  flagSel.appendChild(optHazure);

  state.rolesMaster.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.innerText = `${r.name} (${r.payout}枚)`;
    flagSel.appendChild(opt);
  });
  state.commonFlags.forEach(cf => {
    const opt = document.createElement("option");
    opt.value = cf.id;
    opt.innerText = `🔀 ${cf.name}`;
    flagSel.appendChild(opt);
  });

  if (idx !== null && state.specialRules[idx]) {
    const rule = state.specialRules[idx];
    title.innerText = "特殊スベリ制御の編集";
    nameInput.value = rule.name;
    flagSel.value = rule.flagId;
    reelSel.value = String(rule.reelIndex);
    updateSpecialPosOptions(rule.pushPos);
    slideSel.value = String(rule.forceSlide);
  } else {
    title.innerText = "特殊スベリ制御の新規追加";
    nameInput.value = "";
    flagSel.value = state.currentFlag;
    reelSel.value = "0";
    const defaultPos = state.reelStopState[0].stopped ? state.reelStopState[0].pushPos : 12;
    updateSpecialPosOptions(defaultPos);
    slideSel.value = "2";
  }

  panel.classList.remove("hidden");
}

export function closeSpecialEditor() {
  editingSpecialIndex = null;
  const panel = document.getElementById("special-editor-panel");
  if (panel) panel.classList.add("hidden");
}

export function saveSpecialForm() {
  const flagId = document.getElementById("special-edit-flag").value;
  const reelIndex = parseInt(document.getElementById("special-edit-reel").value, 10) || 0;
  const pushPos = parseInt(document.getElementById("special-edit-pos").value, 10) || 0;
  const forceSlide = parseInt(document.getElementById("special-edit-slide").value, 10) || 0;
  const reelLabels = ["左", "中", "右"];
  const autoName = `${getFlagDisplayName(flagId)} / ${reelLabels[reelIndex]}${pushPos}番(${forceSlide}滑)`;
  const name = document.getElementById("special-edit-name").value.trim() || autoName;

  if (editingSpecialIndex !== null && state.specialRules[editingSpecialIndex]) {
    const target = state.specialRules[editingSpecialIndex];
    target.name = name;
    target.flagId = flagId;
    target.reelIndex = reelIndex;
    target.pushPos = pushPos;
    target.forceSlide = forceSlide;
  } else {
    state.specialRules.push({
      id: "rule_" + Date.now(),
      name: name,
      flagId: flagId,
      reelIndex: reelIndex,
      pushPos: pushPos,
      forceSlide: forceSlide,
      active: true
    });
  }

  saveStateToStorage();
  closeSpecialEditor();
  renderSpecialRulesList();
  renderReelGrid();
}

export function toggleSpecialRule(idx) {
  if (state.specialRules[idx]) {
    state.specialRules[idx].active = !state.specialRules[idx].active;
    saveStateToStorage();
    renderSpecialRulesList();
    renderReelGrid();
  }
}

export function deleteSpecialRule(idx) {
  state.specialRules.splice(idx, 1);
  saveStateToStorage();
  renderSpecialRulesList();
  renderReelGrid();
}
