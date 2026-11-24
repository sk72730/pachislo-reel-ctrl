/* ---------------------------------------------------------
   リール配列（21コマ×3リール）・有効ライン・初期マスターデータ定義
   --------------------------------------------------------- */

export const ALL_SYMBOLS = [
  "赤7", "青7", "白BAR", "黒BAR",
  "ベル", "ベルA", "ベルB", "ベルC",
  "スイカ", "スイカA", "スイカB",
  "リプレイ", "リプレイA", "リプレイB",
  "チェリー", "チェリーA", "チェリーB",
  "ブランク", "特殊(xx)"
];

export const DEFAULT_REEL_STRIPS = [
  // 左リール (0〜20)
  [
    "チェリー", "ベル", "青7", "スイカ", "リプレイ", "ベル", "リプレイ",
    "チェリー", "赤7", "スイカ", "ベル", "リプレイ", "白BAR", "スイカ",
    "黒BAR", "リプレイ", "スイカ", "ベル", "スイカ", "リプレイ", "ベル"
  ],
  // 中リール (0〜20)
  [
    "青7", "リプレイ", "ベル", "ブランク", "リプレイ", "ベル", "スイカ",
    "黒BAR", "チェリー", "リプレイ", "ベル", "チェリー", "特殊(xx)", "チェリー",
    "リプレイ", "ベル", "ブランク", "スイカ", "赤7", "リプレイ", "ベル"
  ],
  // 右リール (0〜20)
  [
    "スイカ", "青7", "リプレイ", "ブランク", "ベル", "スイカ", "赤7",
    "リプレイ", "赤7", "スイカ", "ベル", "リプレイ", "黒BAR", "リプレイ",
    "スイカ", "ベル", "スイカ", "白BAR", "リプレイ", "ブランク", "ベル"
  ]
];

// 有効ライン定義 (中段基準のオフセット: -1=上段, 0=中段, +1=下段)
export const PAYLINES = [
  { id: "mid", name: "中段ライン", offsets: [0, 0, 0] },
  { id: "top", name: "上段ライン", offsets: [-1, -1, -1] },
  { id: "bot", name: "下段ライン", offsets: [1, 1, 1] },
  { id: "diag_down", name: "右下がり", offsets: [-1, 0, 1] },
  { id: "diag_up", name: "右上がり", offsets: [1, 0, -1] }
];

export function getDefaultRolesMaster() {
  return [
    { id: "red7", name: "赤7 BIG", pattern: ["赤7", "赤7", "赤7"], payout: 15, type: "bonus", preferredLine: "any", substitutes: [] },
    { id: "blue7", name: "青7 BIG", pattern: ["青7", "青7", "青7"], payout: 15, type: "bonus", preferredLine: "any", substitutes: [] },
    { id: "reg", name: "REG (黒BAR)", pattern: ["黒BAR", "黒BAR", "黒BAR"], payout: 10, type: "bonus", preferredLine: "any", substitutes: [] },
    {
      id: "bell",
      name: "ベル",
      pattern: ["ベル", "ベル", "ベル"],
      payout: 8,
      type: "small",
      preferredLine: "any",
      substitutes: [
        { id: "sub_bell_1", pattern: ["赤7", "ベル", "ベル"], orderCondition: "irregular", fallbackOnly: true },
        { id: "sub_bell_2", pattern: ["青7", "ベル", "ベル"], orderCondition: "irregular", fallbackOnly: true },
        { id: "sub_bell_3", pattern: ["白BAR", "ベル", "ベル"], orderCondition: "irregular", fallbackOnly: true }
      ]
    },
    { id: "watermelon", name: "スイカ", pattern: ["スイカ", "スイカ", "スイカ"], payout: 5, type: "small", preferredLine: "any", substitutes: [] },
    {
      id: "cherry",
      name: "チェリー",
      pattern: ["チェリー", "ANY", "ANY"],
      payout: 2,
      type: "small",
      preferredLine: "any",
      substitutes: [
        { id: "sub_cherry_1", pattern: ["黒BAR", "リプレイ", "リプレイ"], orderCondition: "irregular", fallbackOnly: true }
      ]
    },
    {
      id: "replay",
      name: "リプレイ",
      pattern: ["リプレイ", "リプレイ", "リプレイ"],
      payout: 0,
      type: "replay",
      preferredLine: "any",
      substitutes: [
        { id: "sub_rep_1", pattern: ["スイカ", "リプレイ", "リプレイ"], orderCondition: "irregular", fallbackOnly: true }
      ]
    },
    { id: "reach_1", name: "リーチ目役1 (r7-xx-r7)", pattern: ["赤7", "特殊(xx)", "赤7"], payout: 1, type: "special", preferredLine: "any", substitutes: [] },
    { id: "reach_2", name: "リーチ目役2 (be-re-wm)", pattern: ["ベル", "リプレイ", "スイカ"], payout: 1, type: "special", preferredLine: "any", substitutes: [] },
    { id: "reach_3", name: "リーチ目役3 (bba-be-be)", pattern: ["黒BAR", "ベル", "ベル"], payout: 1, type: "special", preferredLine: "any", substitutes: [] }
  ];
}

export function getDefaultCommonFlags() {
  return [
    {
      id: "cf_red7_reach1",
      name: "赤7 ＋ リーチ目役1(r7-xx-r7) 重複",
      roleIds: ["red7", "reach_1"],
      priorityRule: "bonus"
    },
    {
      id: "cf_blue7_reach2",
      name: "青7 ＋ リーチ目役2(be-re-wm) 重複",
      roleIds: ["blue7", "reach_2"],
      priorityRule: "bonus"
    },
    {
      id: "cf_reg_reach3",
      name: "REG ＋ リーチ目役3(bba-be-be) 重複",
      roleIds: ["reg", "reach_3"],
      priorityRule: "bonus"
    }
  ];
}

export function getDefaultSpecialRules() {
  return [
    {
      id: "rule_1",
      name: "赤7時：左黒BAR狙い4コマ大スベリ",
      flagId: "red7",
      reelIndex: 0,
      pushPos: 14,
      forceSlide: 4,
      active: true
    }
  ];
}

export function createEmptyStopState() {
  return [
    { stopped: false, pushPos: null, stopPos: null, slide: 0 },
    { stopped: false, pushPos: null, stopPos: null, slide: 0 },
    { stopped: false, pushPos: null, stopPos: null, slide: 0 }
  ];
}
