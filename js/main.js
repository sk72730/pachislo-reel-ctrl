import { toggleModal } from "./utils.js";
import { loadStateFromStorage } from "./storage.js";
import { populateFlagSelect, updateHudDisplay, renderReelGrid, setReelTapHandler } from "./ui/hud.js";
import {
  handleTapReel,
  clearSingleReel,
  resetReelTest,
  autoStopAll,
  onFlagChanged,
  onPolicyChanged
} from "./ui/simulator.js";
import {
  openTableModal,
  switchTableTab,
  setLeftMatrixFilter,
  openLeftCellEditor,
  closeLeftCellEditor,
  applyLeftCellSlide,
  exportTableCSV
} from "./ui/tableModal.js";
import {
  openRulesModal,
  openRoleEditor,
  closeRoleEditor,
  addDraftSubstitute,
  removeDraftSubstitute,
  updateDraftSubstitute,
  updateDraftSubstituteSym,
  saveRoleForm,
  deleteRole,
  openCommonEditor,
  closeCommonEditor,
  toggleDraftCommonRole,
  moveDraftCommonRole,
  saveCommonForm,
  deleteCommonFlag
} from "./ui/rulesModal.js";
import {
  openStripsModal,
  selectStripEditReel,
  selectStripBrush,
  applyBrushToStripCell,
  changeStripSymbol,
  resetSingleStripToDefault
} from "./ui/stripsModal.js";
import {
  openSpecialModal,
  updateSpecialPosOptions,
  openSpecialEditor,
  closeSpecialEditor,
  saveSpecialForm,
  toggleSpecialRule,
  deleteSpecialRule
} from "./ui/specialModal.js";
import {
  openDataModal,
  exportProjectDataJSON,
  copyProjectDataToClipboard,
  importProjectDataFromFile,
  importProjectDataFromText,
  resetToDefaultData
} from "./ui/dataModal.js";

/* ---------------------------------------------------------
   HTMLインラインハンドラ（onclick / onchange）向けグローバル登録
   --------------------------------------------------------- */
Object.assign(window, {
  toggleModal,
  handleTapReel,
  clearSingleReel,
  resetReelTest,
  autoStopAll,
  onFlagChanged,
  onPolicyChanged,
  openTableModal,
  switchTableTab,
  setLeftMatrixFilter,
  openLeftCellEditor,
  closeLeftCellEditor,
  applyLeftCellSlide,
  exportTableCSV,
  openRulesModal,
  openRoleEditor,
  closeRoleEditor,
  addDraftSubstitute,
  removeDraftSubstitute,
  updateDraftSubstitute,
  updateDraftSubstituteSym,
  saveRoleForm,
  deleteRole,
  openCommonEditor,
  closeCommonEditor,
  toggleDraftCommonRole,
  moveDraftCommonRole,
  saveCommonForm,
  deleteCommonFlag,
  openStripsModal,
  selectStripEditReel,
  selectStripBrush,
  applyBrushToStripCell,
  changeStripSymbol,
  resetSingleStripToDefault,
  openSpecialModal,
  updateSpecialPosOptions,
  openSpecialEditor,
  closeSpecialEditor,
  saveSpecialForm,
  toggleSpecialRule,
  deleteSpecialRule,
  openDataModal,
  exportProjectDataJSON,
  copyProjectDataToClipboard,
  importProjectDataFromFile,
  importProjectDataFromText,
  resetToDefaultData
});

/* ---------------------------------------------------------
   初期化実行（DOM解析完了後すぐに起動）
   --------------------------------------------------------- */
function initApp() {
  if (window.__reelSimInitialized) return;
  window.__reelSimInitialized = true;
  loadStateFromStorage();
  setReelTapHandler(handleTapReel);
  populateFlagSelect();
  updateHudDisplay();
  renderReelGrid();
}

window.addEventListener("DOMContentLoaded", initApp);
window.onload = initApp;
if (document.readyState === "complete" || document.readyState === "interactive") {
  initApp();
}
