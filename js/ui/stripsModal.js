import { ALL_SYMBOLS, DEFAULT_REEL_STRIPS } from "../constants.js";
import { state } from "../state.js";
import { getSymbolBadgeStyle, toggleModal } from "../utils.js";
import { saveStateToStorage } from "../storage.js";
import { updateHudDisplay, renderReelGrid } from "./hud.js";

/* ---------------------------------------------------------
   リール配列エディタモーダル
   --------------------------------------------------------- */

let currentStripEditReel = 0;
let activeStripBrush = null;

export function openStripsModal() {
  renderStripBrushPalette();
  selectStripEditReel(currentStripEditReel);
  toggleModal("modal-strips");
}

export function selectStripEditReel(reelIndex) {
  currentStripEditReel = reelIndex;
  for (let r = 0; r < 3; r++) {
    const tab = document.getElementById(`strip-tab-${r}`);
    if (!tab) continue;
    if (r === reelIndex) {
      tab.className = "py-1.5 rounded-lg bg-rose-600 text-white transition";
    } else {
      tab.className = "py-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 transition";
    }
  }
  renderStripEditList();
}

export function selectStripBrush(symbol) {
  activeStripBrush = (activeStripBrush === symbol) ? null : symbol;
  renderStripBrushPalette();
}

export function renderStripBrushPalette() {
  const palette = document.getElementById("strip-brush-palette");
  if (!palette) return;
  palette.innerHTML = "";
  ALL_SYMBOLS.forEach(sym => {
    const style = getSymbolBadgeStyle(sym);
    const isSelected = activeStripBrush === sym;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.onclick = () => selectStripBrush(sym);
    btn.className = `px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${style.bg} ${style.text} ${isSelected ? "border-white ring-2 ring-amber-400 scale-105" : style.border}`;
    btn.innerText = sym;
    palette.appendChild(btn);
  });
}

export function renderStripEditList() {
  const list = document.getElementById("strip-edit-list");
  if (!list) return;
  list.innerHTML = "";
  const strip = state.reelStrips[currentStripEditReel];

  for (let idx = 0; idx < 21; idx++) {
    const sym = strip[idx];
    const style = getSymbolBadgeStyle(sym);
    const numStr = idx < 10 ? `0${idx}` : `${idx}`;
    const row = document.createElement("div");
    row.className = `flex items-center justify-between gap-2 p-1.5 rounded-xl border ${style.bg} ${style.border}`;

    const optionsHtml = ALL_SYMBOLS.map(s => `<option value="${s}" ${s === sym ? "selected" : ""}>${s}</option>`).join("");

    row.innerHTML = `
      <div onclick="applyBrushToStripCell(${idx})" class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer py-0.5">
        <span class="text-slate-300 font-bold w-6 text-center bg-slate-950/60 rounded py-0.5">${numStr}</span>
        <span class="font-bold text-xs ${style.text} truncate">${sym}</span>
        ${activeStripBrush ? `<span class="text-[9px] text-amber-300 ml-auto shrink-0">👈 タップで「${activeStripBrush}」配置</span>` : ""}
      </div>
      <select onchange="changeStripSymbol(${idx}, this.value)" class="bg-slate-950/90 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white font-mono shrink-0">
        ${optionsHtml}
      </select>
    `;
    list.appendChild(row);
  }
}

export function applyBrushToStripCell(idx) {
  if (!activeStripBrush) return;
  changeStripSymbol(idx, activeStripBrush);
}

export function changeStripSymbol(idx, newSymbol) {
  state.reelStrips[currentStripEditReel][idx] = newSymbol;
  saveStateToStorage();
  renderStripEditList();
  updateHudDisplay();
  renderReelGrid();
}

export function resetSingleStripToDefault() {
  state.reelStrips[currentStripEditReel] = [...DEFAULT_REEL_STRIPS[currentStripEditReel]];
  saveStateToStorage();
  renderStripEditList();
  updateHudDisplay();
  renderReelGrid();
}
