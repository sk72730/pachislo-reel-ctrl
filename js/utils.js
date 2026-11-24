import { ALL_SYMBOLS } from "./constants.js";
import { state } from "./state.js";

/* ---------------------------------------------------------
   ユーティリティ ＆ 図柄カラースタイル
   --------------------------------------------------------- */

export function mod21(n) {
  return ((n % 21) + 21) % 21;
}

export function getSymbolAt(reelIndex, midPos, offset) {
  return state.reelStrips[reelIndex][mod21(midPos + offset)];
}

export function isSubConditionMet(sub, firstReel) {
  const cond = sub.orderCondition || "irregular";
  if (cond === "all") return true;
  if (firstReel === null) return false;
  if (cond === "irregular") return firstReel !== 0;
  if (cond === "center_first") return firstReel === 1;
  if (cond === "right_first") return firstReel === 2;
  if (cond === "normal") return firstReel === 0;
  return false;
}

export function getSymbolBadgeStyle(symbol) {
  if (!symbol) return { bg: "bg-slate-800/40", text: "text-slate-500", border: "border-slate-700/50", icon: "" };
  if (symbol === "赤7") return { bg: "bg-rose-600/30", text: "text-rose-200", border: "border-rose-500/60", icon: "7" };
  if (symbol === "青7") return { bg: "bg-sky-600/30", text: "text-sky-200", border: "border-sky-500/60", icon: "7" };
  if (symbol === "白BAR") return { bg: "bg-slate-100/20", text: "text-white", border: "border-slate-300/70", icon: "BAR" };
  if (symbol === "黒BAR") return { bg: "bg-zinc-900/90", text: "text-zinc-200", border: "border-zinc-500", icon: "BAR" };
  if (symbol.startsWith("ベル")) return { bg: "bg-amber-500/25", text: "text-amber-200", border: "border-amber-400/60", icon: "🔔" };
  if (symbol.startsWith("スイカ")) return { bg: "bg-emerald-600/25", text: "text-emerald-200", border: "border-emerald-400/60", icon: "🍉" };
  if (symbol.startsWith("チェリー")) return { bg: "bg-pink-600/25", text: "text-pink-200", border: "border-pink-400/60", icon: "🍒" };
  if (symbol.startsWith("リプレイ")) return { bg: "bg-cyan-600/25", text: "text-cyan-200", border: "border-cyan-400/60", icon: "🔄" };
  if (symbol === "特殊(xx)") return { bg: "bg-purple-600/30", text: "text-purple-200", border: "border-purple-400/60", icon: "★" };
  return { bg: "bg-slate-800/40", text: "text-slate-400", border: "border-slate-700/50", icon: "・" };
}

export function toggleModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("hidden");
}

export function getAllAvailableSymbols() {
  const set = new Set(["ANY", ...ALL_SYMBOLS]);
  state.reelStrips.forEach(strip => strip.forEach(s => set.add(s)));
  return Array.from(set);
}

export function getFlagDisplayName(flagId) {
  if (flagId === "hazure") return "【ハズレ】";
  const r = state.rolesMaster.find(item => item.id === flagId);
  if (r) return r.name;
  const cf = state.commonFlags.find(item => item.id === flagId);
  if (cf) return `🔀 ${cf.name}`;
  return flagId;
}
