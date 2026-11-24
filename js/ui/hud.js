import { PAYLINES } from "../constants.js";
import { state } from "../state.js";
import { mod21, getSymbolAt, isSubConditionMet, getSymbolBadgeStyle } from "../utils.js";
import { calculateSlideForReel, isPatternMatchedOnLine } from "../engine.js";

/* ---------------------------------------------------------
   モバイル画面描画（上部HUD ＆ 21コマタップボード ＆ 制御ログ）
   --------------------------------------------------------- */

let reelTapHandler = null;

export function setReelTapHandler(handler) {
  reelTapHandler = handler;
}

export function renderReelGrid() {
  const container = document.getElementById("reel-tap-grid");
  if (!container) return;
  container.innerHTML = "";
  const missPolicy = document.getElementById("sim-miss-policy").value;

  for (let idx = 0; idx < 21; idx++) {
    const row = document.createElement("div");
    row.className = "grid grid-cols-3 gap-2";

    for (let r = 0; r < 3; r++) {
      const sym = state.reelStrips[r][idx];
      const style = getSymbolBadgeStyle(sym);
      const reelSt = state.reelStopState[r];

      const isMidStopped = reelSt.stopped && reelSt.stopPos === idx;
      const isTopStopped = reelSt.stopped && mod21(reelSt.stopPos - 1) === idx;
      const isBotStopped = reelSt.stopped && mod21(reelSt.stopPos + 1) === idx;
      const isPushPos = reelSt.stopped && reelSt.pushPos === idx;

      // スベリ軌道上にあるか
      let isOnSlidePath = false;
      if (reelSt.stopped && reelSt.slide > 0) {
        for (let s = 1; s < reelSt.slide; s++) {
          if (mod21(reelSt.pushPos - s) === idx) isOnSlidePath = true;
        }
      }

      // このコマを押した場合の予測スベリ数をリアルタイム算出
      const simStopsForPreview = state.reelStopState.map((st, rIdx) =>
        rIdx === r ? { stopped: false, pushPos: null, stopPos: null, slide: 0 } : st
      );
      const preview = calculateSlideForReel(r, idx, state.currentFlag, simStopsForPreview, missPolicy);

      // 固定高さ h-12 にしてタップ時のガタつき（レイアウトシフト）を完全防止
      let cellClasses = `relative h-12 rounded-xl border px-2 flex flex-col justify-between transition select-none active:scale-95 cursor-pointer overflow-hidden `;

      if (isMidStopped) {
        cellClasses += "bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/70 shadow-lg shadow-rose-950/60";
      } else if (isTopStopped || isBotStopped) {
        cellClasses += `${style.bg} border-rose-400/50`;
      } else if (isOnSlidePath) {
        cellClasses += "bg-amber-950/30 border-amber-500/50 slide-path";
      } else {
        cellClasses += `${style.bg} ${style.border} hover:brightness-110`;
      }

      const numStr = idx < 10 ? `0${idx}` : `${idx}`;
      const slideBadgeColor = preview.slide === 0 ? "text-slate-400" : preview.slide <= 2 ? "text-sky-300" : "text-amber-300";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = cellClasses;
      btn.onclick = () => {
        if (reelTapHandler) reelTapHandler(r, idx);
      };

      btn.innerHTML = `
        <div class="flex items-center justify-between w-full text-[9px] pt-1 leading-none">
          <span class="text-slate-400 font-bold">${numStr}</span>
          <span class="${slideBadgeColor} font-bold">${preview.slide}滑</span>
        </div>
        <div class="text-center font-bold text-xs ${style.text} truncate leading-none">
          ${sym}
        </div>
        <div class="h-3 flex items-center justify-center w-full text-[8px] font-bold leading-none pb-0.5">
          ${isMidStopped ? `<span class="bg-rose-600 text-white px-1.5 py-0.2 rounded-full">★中段(${reelSt.slide}滑)</span>` :
            isTopStopped ? `<span class="text-rose-300">▲上段</span>` :
            isBotStopped ? `<span class="text-rose-300">▼下段</span>` :
            isPushPos ? `<span class="text-amber-300">👆押下</span>` :
            isOnSlidePath ? `<span class="text-amber-300/80">↓滑り</span>` : `<span></span>`}
        </div>
      `;

      row.appendChild(btn);
    }

    container.appendChild(row);
  }
}

export function applySlotCellStyle(el, symbol, isMid) {
  if (!el) return;
  if (!symbol) {
    el.innerText = isMid ? "回転中" : "--";
    el.className = isMid
      ? "h-7 flex items-center justify-center text-[11px] font-bold text-slate-400 bg-slate-900/90 rounded border border-slate-800 shadow truncate px-0.5 z-20"
      : "h-6 flex items-center justify-center text-[10px] text-slate-500 bg-slate-900/40 rounded truncate px-0.5";
    return;
  }

  const style = getSymbolBadgeStyle(symbol);
  el.innerText = symbol;
  if (isMid) {
    el.className = `h-7 flex items-center justify-center text-[11px] font-bold rounded border shadow truncate px-0.5 z-20 ${style.bg} ${style.text} border-rose-400/80 ring-1 ring-rose-500/40`;
  } else {
    el.className = `h-6 flex items-center justify-center text-[10px] font-semibold rounded border truncate px-0.5 opacity-90 ${style.bg} ${style.text} ${style.border}`;
  }
}

export function updateHudDisplay() {
  const reelNames = ["左", "中", "右"];
  for (let r = 0; r < 3; r++) {
    const st = state.reelStopState[r];
    const statusEl = document.getElementById(`hud-status-${r}`);
    const colEl = document.getElementById(`hud-reel-col-${r}`);
    const slotTop = document.getElementById(`slot-${r}-top`);
    const slotMid = document.getElementById(`slot-${r}-mid`);
    const slotBot = document.getElementById(`slot-${r}-bot`);

    if (!st.stopped) {
      statusEl.innerHTML = `${reelNames[r]}: <span class="text-slate-500">回転中</span>`;
      statusEl.className = "bg-slate-950/80 py-0.5 rounded border border-slate-800 text-slate-400 font-bold truncate select-none";
      if (colEl) {
        colEl.className = "flex flex-col gap-0.5 text-center font-mono select-none transition";
      }

      applySlotCellStyle(slotTop, null, false);
      applySlotCellStyle(slotMid, null, true);
      applySlotCellStyle(slotBot, null, false);
    } else {
      const slideColor = st.slide === 0 ? "text-slate-200" : st.slide <= 2 ? "text-sky-300" : "text-amber-300";
      const pushStr = st.pushPos < 10 ? `0${st.pushPos}` : `${st.pushPos}`;
      const stopStr = st.stopPos < 10 ? `0${st.stopPos}` : `${st.stopPos}`;
      statusEl.innerHTML = `${reelNames[r]}: <span class="text-white">${pushStr}→${stopStr}</span> <span class="${slideColor}">(${st.slide}滑)</span> ↺`;
      statusEl.className = "bg-rose-950/40 py-0.5 rounded border border-rose-500/50 text-rose-200 font-bold truncate select-none cursor-pointer active:scale-95 transition";
      if (colEl) {
        colEl.className = "flex flex-col gap-0.5 text-center font-mono select-none cursor-pointer active:scale-95 transition";
      }

      const topSym = getSymbolAt(r, st.stopPos, -1);
      const midSym = getSymbolAt(r, st.stopPos, 0);
      const botSym = getSymbolAt(r, st.stopPos, 1);

      applySlotCellStyle(slotTop, topSym, false);
      applySlotCellStyle(slotMid, midSym, true);
      applySlotCellStyle(slotBot, botSym, false);
    }
  }

  const stoppedCount = state.reelStopState.filter(s => s.stopped).length;
  const badge = document.getElementById("payout-result-badge");
  const coins = document.getElementById("payout-coins");

  if (stoppedCount < 3) {
    const orderBadge = state.firstStoppedReel === null
      ? ""
      : (state.firstStoppedReel === 0 ? " [順押し]" : ` [${state.firstStoppedReel === 1 ? "中" : "右"}第1]`);
    badge.innerText = `${stoppedCount}/3 停止済${orderBadge}`;
    badge.className = "px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-900 text-slate-300 border border-slate-800 truncate";
    coins.innerText = "-- 枚";
    return;
  }

  // 3リールすべて停止時の入賞判定（本来図柄 ＋ 条件を満たす代用図柄）
  const stopPositions = state.reelStopState.map(s => s.stopPos);
  const hits = [];

  for (const line of PAYLINES) {
    for (const role of state.rolesMaster) {
      if (isPatternMatchedOnLine(role.pattern, stopPositions, line)) {
        hits.push({ role, line, isSub: false });
      } else if (Array.isArray(role.substitutes)) {
        for (const sub of role.substitutes) {
          if (isSubConditionMet(sub, state.firstStoppedReel) && isPatternMatchedOnLine(sub.pattern, stopPositions, line)) {
            hits.push({ role, line, isSub: true });
            break;
          }
        }
      }
    }
  }

  if (hits.length === 0) {
    badge.innerText = "ハズレ (入賞なし)";
    badge.className = "px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-900 text-slate-400 border border-slate-800 truncate";
    coins.innerText = "0 枚";
  } else {
    const bestHit = hits.sort((a, b) => b.role.payout - a.role.payout)[0];
    const totalPayout = Math.min(15, hits.reduce((sum, h) => sum + h.role.payout, 0));
    const subTag = bestHit.isSub ? "(代用)" : "";
    badge.innerText = `${bestHit.role.name}${subTag} [${bestHit.line.name}]`;
    badge.className = "px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-rose-600 text-white border border-rose-400 shadow truncate";
    coins.innerText = `${totalPayout} 枚`;
  }
}

export function appendLogsToModal(reelIndex, logs) {
  const box = document.getElementById("sim-log-box");
  if (!box) return;
  const reelNames = ["左リール", "中リール", "右リール"];
  const block = document.createElement("div");
  block.className = "p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1";
  block.innerHTML = `<div class="text-[11px] font-bold text-rose-400 border-b border-slate-800 pb-1">▶ ${reelNames[reelIndex]} 停止判定</div>`;

  logs.forEach(item => {
    const color =
      item.type === "hit" ? "text-emerald-400" :
      item.type === "warn" ? "text-amber-400" :
      item.type === "special" ? "text-purple-400" :
      item.type === "final" ? "text-sky-300 font-bold" : "text-slate-300";
    const line = document.createElement("div");
    line.className = `text-[11px] leading-relaxed ${color}`;
    line.innerHTML = `<span class="text-slate-500">[${item.step}]</span> ${item.text}`;
    block.appendChild(line);
  });

  if (box.querySelector(".italic")) {
    box.innerHTML = "";
  }
  box.prepend(block);
}

export function populateFlagSelect() {
  const sel = document.getElementById("sim-flag-select");
  if (!sel) return;
  sel.innerHTML = "";

  const optHazure = document.createElement("option");
  optHazure.value = "hazure";
  optHazure.innerText = "【ハズレ】 (内部非成立)";
  sel.appendChild(optHazure);

  const grpSingle = document.createElement("optgroup");
  grpSingle.label = "--- 単独フラグ ---";
  state.rolesMaster.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.innerText = `${r.name} (${r.payout}枚)`;
    grpSingle.appendChild(opt);
  });
  sel.appendChild(grpSingle);

  const grpCommon = document.createElement("optgroup");
  grpCommon.label = "--- 共通フラグ (同時成立) ---";
  state.commonFlags.forEach(cf => {
    const opt = document.createElement("option");
    opt.value = cf.id;
    opt.innerText = `🔀 ${cf.name}`;
    grpCommon.appendChild(opt);
  });
  sel.appendChild(grpCommon);

  sel.value = state.currentFlag;
}
