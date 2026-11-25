import { createEmptyStopState } from "../constants.js";
import { state } from "../state.js";
import { mod21, getSymbolBadgeStyle, getFlagDisplayName, toggleModal } from "../utils.js";
import { calculateSlideForReel, resolveAllowedRoles, isValidStopCandidate } from "../engine.js";
import { saveStateToStorage } from "../storage.js";
import { renderReelGrid } from "./hud.js";

/* ---------------------------------------------------------
   全21コマスベリテーブル ＆ 左リール制御表（全フラグ横断マトリクス）
   --------------------------------------------------------- */

let activeTableTab = "current"; // "current" | "left_matrix"
let leftMatrixFilter = "all";   // "all" | "single" | "common"
let editingCell = null;         // { flagId, pushPos } | null

function getMatrixFlags(filter = leftMatrixFilter) {
  const list = [{ id: "hazure", label: "ハズレ", kind: "hazure" }];
  if (filter === "all" || filter === "single") {
    state.rolesMaster.forEach(r => {
      list.push({ id: r.id, label: r.name, kind: r.type });
    });
  }
  if (filter === "all" || filter === "common") {
    state.commonFlags.forEach(cf => {
      list.push({ id: cf.id, label: `🔀${cf.name}`, kind: "common" });
    });
  }
  return list;
}

export function openTableModal() {
  closeLeftCellEditor();
  renderCurrentFlagTable();
  if (activeTableTab === "left_matrix") {
    renderLeftControlMatrix();
  }
  updateTableTabUI();
  toggleModal("modal-table");
}

export function switchTableTab(tab) {
  activeTableTab = tab === "left_matrix" ? "left_matrix" : "current";
  closeLeftCellEditor();
  if (activeTableTab === "left_matrix") {
    renderLeftControlMatrix();
  } else {
    renderCurrentFlagTable();
  }
  updateTableTabUI();
}

function updateTableTabUI() {
  const tabCur = document.getElementById("table-tab-current");
  const tabMat = document.getElementById("table-tab-left-matrix");
  const viewCur = document.getElementById("table-view-current");
  const viewMat = document.getElementById("table-view-left-matrix");
  const subtitle = document.getElementById("modal-table-subtitle");

  if (activeTableTab === "left_matrix") {
    if (tabCur) tabCur.className = "py-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 transition";
    if (tabMat) tabMat.className = "py-1.5 rounded-lg bg-rose-600 text-white transition";
    if (viewCur) viewCur.classList.add("hidden");
    if (viewMat) viewMat.classList.remove("hidden");
    if (subtitle) subtitle.innerText = "左リール 21コマ × 全フラグ制御表（タップで直接編集）";
  } else {
    if (tabCur) tabCur.className = "py-1.5 rounded-lg bg-rose-600 text-white transition";
    if (tabMat) tabMat.className = "py-1.5 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 transition";
    if (viewCur) viewCur.classList.remove("hidden");
    if (viewMat) viewMat.classList.add("hidden");
    if (subtitle) subtitle.innerText = `現在フラグ (${getFlagDisplayName(state.currentFlag)}) の全押し位置スベリ一覧`;
  }
}

export function setLeftMatrixFilter(filter) {
  leftMatrixFilter = filter;
  closeLeftCellEditor();
  ["all", "single", "common"].forEach(key => {
    const btn = document.getElementById(`left-filter-${key}`);
    if (!btn) return;
    btn.className = key === filter
      ? "px-2 py-1 rounded bg-rose-600 text-white"
      : "px-2 py-1 rounded bg-slate-800 text-slate-300";
  });
  renderLeftControlMatrix();
}

export function renderCurrentFlagTable() {
  const tbody = document.getElementById("modal-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const missPolicy = document.getElementById("sim-miss-policy").value;
  const emptyStops = createEmptyStopState();

  for (let idx = 0; idx < 21; idx++) {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-900/60";
    const numStr = idx < 10 ? `0${idx}` : `${idx}`;
    let cellsHtml = `<td class="py-1.5 px-2 font-bold text-slate-400">${numStr}</td>`;

    for (let r = 0; r < 3; r++) {
      const sym = state.reelStrips[r][idx];
      const res = calculateSlideForReel(r, idx, state.currentFlag, emptyStops, missPolicy);
      const badgeColor = res.slide === 0 ? "text-slate-300" : res.slide <= 2 ? "text-sky-300" : "text-amber-300 font-bold";
      cellsHtml += `
        <td class="py-1.5 px-1 text-center">
          <div class="text-[10px] text-slate-300 truncate">${sym}</div>
          <div class="text-[10px] ${badgeColor}">${res.slide}滑(→${res.stopPos})</div>
        </td>
      `;
    }
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  }
}

export function renderLeftControlMatrix() {
  const thead = document.getElementById("left-matrix-head");
  const tbody = document.getElementById("left-matrix-body");
  const summaryEl = document.getElementById("left-matrix-summary");
  if (!thead || !tbody) return;

  const missPolicy = document.getElementById("sim-miss-policy").value;
  const emptyStops = createEmptyStopState();
  const flags = getMatrixFlags(leftMatrixFilter);

  // ヘッダー構築
  let headHtml = `<tr class="border-b border-slate-800 text-slate-300">`;
  headHtml += `<th class="sticky left-0 z-30 bg-slate-900 py-1.5 px-2 border-r border-slate-800 min-w-[76px]">左コマ</th>`;
  flags.forEach(f => {
    const colAccent =
      f.kind === "hazure" ? "text-slate-300" :
      f.kind === "bonus" ? "text-rose-300" :
      f.kind === "common" ? "text-purple-300" :
      f.kind === "special" ? "text-amber-300" : "text-sky-300";
    headHtml += `<th class="py-1.5 px-1.5 text-center border-r border-slate-800/60 min-w-[68px] max-w-[84px] truncate ${colAccent}" title="${f.label}">${f.label}</th>`;
  });
  headHtml += `</tr>`;
  thead.innerHTML = headHtml;

  // ボディ構築（0〜20番）
  tbody.innerHTML = "";
  let specialCount = 0;
  let warnCount = 0;

  for (let pos = 0; pos < 21; pos++) {
    const sym = state.reelStrips[0][pos];
    const style = getSymbolBadgeStyle(sym);
    const numStr = pos < 10 ? `0${pos}` : `${pos}`;

    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-900/40";

    let rowHtml = `
      <td class="sticky left-0 z-10 bg-slate-950 border-r border-slate-800 py-1 px-1.5">
        <div class="flex items-center gap-1">
          <span class="text-slate-400 font-bold">${numStr}</span>
          <span class="truncate font-bold ${style.text}">${sym}</span>
        </div>
      </td>
    `;

    flags.forEach(f => {
      const res = calculateSlideForReel(0, pos, f.id, emptyStops, missPolicy);
      const stopSym = state.reelStrips[0][res.stopPos];

      const activeSpecial = state.specialRules.find(r =>
        r.active && r.flagId === f.id && r.reelIndex === 0 && r.pushPos === pos
      );
      const isSpecialApplied = res.logs.some(l => l.type === "special");
      const isSpecialBlocked = Boolean(activeSpecial && !isSpecialApplied);
      const isFailSafe = res.logs.some(l => l.step === "フェイルセーフ");

      if (activeSpecial) specialCount++;
      if (isSpecialBlocked || isFailSafe) warnCount++;

      const isSelected = editingCell && editingCell.flagId === f.id && editingCell.pushPos === pos;

      let cellBg = "bg-slate-950 hover:bg-slate-900";
      let slideColor = res.slide === 0 ? "text-slate-400" : res.slide <= 2 ? "text-sky-300" : "text-amber-300 font-bold";
      let prefix = "";

      if (isSpecialBlocked || isFailSafe) {
        cellBg = "bg-rose-950/60 hover:bg-rose-900/60";
        slideColor = "text-rose-300 font-bold";
        prefix = "⚠️";
      } else if (isSpecialApplied) {
        cellBg = "bg-purple-950/50 hover:bg-purple-900/60";
        slideColor = "text-purple-200 font-bold";
        prefix = "★";
      }

      const ringClass = isSelected ? "ring-2 ring-inset ring-purple-400" : "";
      const escapedFlagId = f.id.replace(/'/g, "\\'");

      rowHtml += `
        <td onclick="openLeftCellEditor('${escapedFlagId}', ${pos})" class="py-1 px-1 text-center border-r border-slate-800/50 cursor-pointer select-none transition ${cellBg} ${ringClass}">
          <div class="${slideColor} leading-tight">${prefix}${res.slide}滑</div>
          <div class="text-[9px] text-slate-400 truncate leading-tight">${stopSym}</div>
        </td>
      `;
    });

    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  }

  if (summaryEl) {
    summaryEl.innerText = `★特殊:${specialCount}件` + (warnCount > 0 ? ` / ⚠️警告:${warnCount}件` : " / 矛盾なし");
    summaryEl.className = warnCount > 0
      ? "text-[10px] font-mono text-rose-300 font-bold truncate"
      : "text-[10px] font-mono text-slate-400 truncate";
  }
}

export function openLeftCellEditor(flagId, pushPos) {
  editingCell = { flagId, pushPos };
  const panel = document.getElementById("left-cell-editor");
  const titleEl = document.getElementById("left-cell-editor-title");
  const warnEl = document.getElementById("left-cell-editor-warn");
  const optionsEl = document.getElementById("left-cell-editor-options");
  if (!panel || !titleEl || !optionsEl) return;

  const pushSym = state.reelStrips[0][pushPos];
  const numStr = pushPos < 10 ? `0${pushPos}` : `${pushPos}`;
  titleEl.innerText = `${getFlagDisplayName(flagId)} × 左[${numStr}:${pushSym}]`;

  const emptyStops = createEmptyStopState();
  const allowedRoles = resolveAllowedRoles(flagId);
  const existingRule = state.specialRules.find(r =>
    r.active && r.flagId === flagId && r.reelIndex === 0 && r.pushPos === pushPos
  );

  let blockedMsg = "";
  optionsEl.innerHTML = "";

  for (let slide = 0; slide <= 4; slide++) {
    const stopPos = mod21(pushPos - slide);
    const stopSym = state.reelStrips[0][stopPos];
    const isSafe = isValidStopCandidate(0, stopPos, emptyStops, allowedRoles, 0);
    const isCurrentForced = existingRule && existingRule.forceSlide === slide;

    if (isCurrentForced && !isSafe) {
      blockedMsg = `⚠️ 設定中の強制${slide}滑は、現在の配列・役では不成立役が入賞するため安全制約により無効化されています。`;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.disabled = !isSafe;
    btn.onclick = () => applyLeftCellSlide(slide);

    if (!isSafe) {
      btn.className = "py-1.5 px-1 rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-400/70 opacity-60 cursor-not-allowed flex flex-col items-center";
      btn.innerHTML = `
        <span class="text-[10px] font-bold">${slide}滑</span>
        <span class="text-[9px] truncate max-w-full">${stopSym}</span>
        <span class="text-[8px] text-rose-400 font-bold">NG</span>
      `;
    } else if (isCurrentForced) {
      btn.className = "py-1.5 px-1 rounded-lg border border-purple-400 bg-purple-600/40 text-white ring-1 ring-purple-300 flex flex-col items-center";
      btn.innerHTML = `
        <span class="text-[10px] font-bold">★${slide}滑</span>
        <span class="text-[9px] truncate max-w-full text-purple-100">${stopSym}</span>
        <span class="text-[8px] text-purple-200">設定中</span>
      `;
    } else {
      btn.className = "py-1.5 px-1 rounded-lg border border-slate-700 bg-slate-950 active:bg-slate-800 text-slate-200 flex flex-col items-center";
      btn.innerHTML = `
        <span class="text-[10px] font-bold">${slide}滑</span>
        <span class="text-[9px] truncate max-w-full text-slate-400">${stopSym}</span>
        <span class="text-[8px] text-emerald-400">OK</span>
      `;
    }

    optionsEl.appendChild(btn);
  }

  if (warnEl) {
    if (blockedMsg) {
      warnEl.innerText = blockedMsg;
      warnEl.classList.remove("hidden");
    } else {
      warnEl.classList.add("hidden");
    }
  }

  panel.classList.remove("hidden");
  renderLeftControlMatrix();
}

export function closeLeftCellEditor() {
  editingCell = null;
  const panel = document.getElementById("left-cell-editor");
  if (panel) panel.classList.add("hidden");
}

export function applyLeftCellSlide(forceSlide) {
  if (!editingCell) return;
  const { flagId, pushPos } = editingCell;

  // 同一 (flagId, reelIndex=0, pushPos) の既存ルールを検索
  const idx = state.specialRules.findIndex(r =>
    r.flagId === flagId && r.reelIndex === 0 && r.pushPos === pushPos
  );

  if (forceSlide === null) {
    // 自動制御に戻す（既存ルール削除）
    if (idx !== -1) {
      state.specialRules.splice(idx, 1);
    }
  } else {
    const autoName = `${getFlagDisplayName(flagId)} / 左${pushPos}番(${forceSlide}滑)`;
    if (idx !== -1) {
      state.specialRules[idx].forceSlide = forceSlide;
      state.specialRules[idx].active = true;
      state.specialRules[idx].name = autoName;
    } else {
      state.specialRules.push({
        id: "rule_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: autoName,
        flagId: flagId,
        reelIndex: 0,
        pushPos: pushPos,
        forceSlide: forceSlide,
        active: true
      });
    }
  }

  saveStateToStorage();
  renderReelGrid();
  renderCurrentFlagTable();
  openLeftCellEditor(flagId, pushPos);
}

export function exportTableCSV() {
  const missPolicy = document.getElementById("sim-miss-policy").value;
  const emptyStops = createEmptyStopState();

  let csv = "";
  let filename = "";

  if (activeTableTab === "left_matrix") {
    const flags = getMatrixFlags("all");
    const header = ["コマ番号", "左図柄", ...flags.map(f => `${f.label}(滑/停止)`)];
    csv = header.join(",") + "\n";

    for (let pos = 0; pos < 21; pos++) {
      const row = [pos, state.reelStrips[0][pos]];
      flags.forEach(f => {
        const res = calculateSlideForReel(0, pos, f.id, emptyStops, missPolicy);
        const stopSym = state.reelStrips[0][res.stopPos];
        const isSpecial = res.logs.some(l => l.type === "special");
        row.push(`${isSpecial ? "★" : ""}${res.slide}滑(${res.stopPos}:${stopSym})`);
      });
      csv += row.join(",") + "\n";
    }
    filename = "left_control_table.csv";
  } else {
    csv = "コマ番号,左図柄,左スベリ,左停止位置,中図柄,中スベリ,中停止位置,右図柄,右スベリ,右停止位置\n";
    for (let idx = 0; idx < 21; idx++) {
      const row = [idx];
      for (let r = 0; r < 3; r++) {
        const res = calculateSlideForReel(r, idx, state.currentFlag, emptyStops, missPolicy);
        row.push(state.reelStrips[r][idx], res.slide, res.stopPos);
      }
      csv += row.join(",") + "\n";
    }
    filename = `slide_table_${state.currentFlag}.csv`;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
