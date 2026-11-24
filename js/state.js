import {
  DEFAULT_REEL_STRIPS,
  getDefaultRolesMaster,
  getDefaultCommonFlags,
  getDefaultSpecialRules,
  createEmptyStopState
} from "./constants.js";

/* ---------------------------------------------------------
   アプリケーション共有状態
   --------------------------------------------------------- */
export const state = {
  reelStrips: DEFAULT_REEL_STRIPS.map(strip => [...strip]),
  rolesMaster: getDefaultRolesMaster(),
  commonFlags: getDefaultCommonFlags(),
  specialRules: getDefaultSpecialRules(),

  // シミュレータ状態
  currentFlag: "replay",
  firstStoppedReel: null, // 0:左(順押し), 1:中(変則), 2:右(変則)
  reelStopState: createEmptyStopState()
};
