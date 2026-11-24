import { createEmptyStopState } from "../constants.js";
import { state } from "../state.js";
import { calculateSlideForReel } from "../engine.js";
import { updateHudDisplay, renderReelGrid, appendLogsToModal } from "./hud.js";

/* ---------------------------------------------------------
   インタラクション制御（タップ停止・リセット・フラグ切替）
   --------------------------------------------------------- */

export function handleTapReel(reelIndex, pushPos) {
  const missPolicy = document.getElementById("sim-miss-policy").value;

  // すでにそのリールが停止済みの場合は、再押下として一度解除して判定
  const tempStops = state.reelStopState.map((st, idx) =>
    idx === reelIndex ? { stopped: false, pushPos: null, stopPos: null, slide: 0 } : st
  );

  // 全リール未停止状態からの押下であれば第1停止リールとして記録
  if (tempStops.every(s => !s.stopped)) {
    state.firstStoppedReel = reelIndex;
  }

  const result = calculateSlideForReel(reelIndex, pushPos, state.currentFlag, tempStops, missPolicy);

  state.reelStopState[reelIndex] = {
    stopped: true,
    pushPos: pushPos,
    stopPos: result.stopPos,
    slide: result.slide
  };

  updateHudDisplay();
  renderReelGrid();
  appendLogsToModal(reelIndex, result.logs);
}

export function clearSingleReel(reelIndex) {
  state.reelStopState[reelIndex] = { stopped: false, pushPos: null, stopPos: null, slide: 0 };
  if (state.reelStopState.every(s => !s.stopped)) {
    state.firstStoppedReel = null;
  }
  updateHudDisplay();
  renderReelGrid();
}

export function resetReelTest() {
  state.firstStoppedReel = null;
  state.reelStopState = createEmptyStopState();
  const box = document.getElementById("sim-log-box");
  if (box) {
    box.innerHTML = `<div class="text-slate-500 italic">リセットしました。任意のコマをタップしてください。</div>`;
  }
  updateHudDisplay();
  renderReelGrid();
}

export function autoStopAll() {
  for (let r = 0; r < 3; r++) {
    if (!state.reelStopState[r].stopped) {
      const randPos = Math.floor(Math.random() * 21);
      handleTapReel(r, randPos);
    }
  }
}

export function onFlagChanged() {
  state.currentFlag = document.getElementById("sim-flag-select").value;
  resetReelTest();
}

export function onPolicyChanged() {
  renderReelGrid();
}
