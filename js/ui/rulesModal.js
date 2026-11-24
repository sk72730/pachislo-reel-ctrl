import { state } from "../state.js";
import { getAllAvailableSymbols, toggleModal } from "../utils.js";
import { saveStateToStorage } from "../storage.js";
import { populateFlagSelect, updateHudDisplay, renderReelGrid } from "./hud.js";

/* ---------------------------------------------------------
   役・共通フラグモーダル（完全編集・追加・削除・優先順位変更）
   --------------------------------------------------------- */

let editingRoleId = null;
let draftRoleSubstitutes = [];
let editingCommonId = null;
let draftCommonRoleIds = [];

export function openRulesModal() {
  closeRoleEditor();
  closeCommonEditor();
  renderRulesLists();
  toggleModal("modal-rules");
}

export function renderRulesLists() {
  const headerEl = document.getElementById("rules-role-header");
  if (headerEl) headerEl.innerText = `登録されている役 (${state.rolesMaster.length}種)`;

  const roleContainer = document.getElementById("rules-role-list");
  roleContainer.innerHTML = "";
  const typeLabels = { small: "小役", bonus: "ボーナス", replay: "リプレイ", special: "特殊" };
  const lineBadges = { top: "上段優先", mid: "中段優先", bot: "下段優先", diag_down: "右下がり", diag_up: "右上がり" };

  state.rolesMaster.forEach(r => {
    const subs = Array.isArray(r.substitutes) ? r.substitutes : [];
    const lineBadge = r.preferredLine && r.preferredLine !== "any"
      ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 shrink-0">🎯${lineBadges[r.preferredLine] || r.preferredLine}</span>`
      : "";
    const subBadge = subs.length > 0
      ? `<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">🔄代用×${subs.length}</span>`
      : "";
    const subListHtml = subs.length > 0
      ? `<div class="text-[9px] text-amber-300/80 font-mono mt-0.5 truncate">代用: ${subs.map(s => s.pattern.join("-")).join(" / ")}</div>`
      : "";

    const div = document.createElement("div");
    div.className = "p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-2 text-xs";
    div.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-bold text-white truncate">${r.name}</span>
          <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">${typeLabels[r.type] || r.type}</span>
          ${lineBadge}
          ${subBadge}
        </div>
        <div class="text-[10px] text-slate-400 font-mono mt-0.5 truncate">${r.pattern.join(" - ")}</div>
        ${subListHtml}
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="text-amber-400 font-mono font-bold mr-1">${r.payout}枚</span>
        <button onclick="openRoleEditor('${r.id}')" class="px-2 py-1 bg-slate-800 active:bg-slate-700 rounded text-[10px] text-sky-300 font-bold">編集</button>
        <button onclick="deleteRole('${r.id}')" class="px-2 py-1 bg-slate-800 active:bg-slate-700 rounded text-[10px] text-rose-400 font-bold">削除</button>
      </div>
    `;
    roleContainer.appendChild(div);
  });

  const commonContainer = document.getElementById("rules-common-list");
  commonContainer.innerHTML = "";
  const priorityLabels = {
    bonus: "ボーナス優先",
    small: "小役・リプレイ優先",
    payout: "最大払出優先",
    custom: "個別優先順位"
  };

  state.commonFlags.forEach(cf => {
    const names = cf.roleIds.map(id => state.rolesMaster.find(r => r.id === id)?.name || id).join(" ＋ ");
    const div = document.createElement("div");
    div.className = "p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5";
    div.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold text-rose-300 truncate">${cf.name}</span>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">${priorityLabels[cf.priorityRule] || cf.priorityRule}</span>
          <button onclick="openCommonEditor('${cf.id}')" class="px-2 py-1 bg-slate-800 active:bg-slate-700 rounded text-[10px] text-sky-300 font-bold">編集</button>
          <button onclick="deleteCommonFlag('${cf.id}')" class="px-2 py-1 bg-slate-800 active:bg-slate-700 rounded text-[10px] text-rose-400 font-bold">削除</button>
        </div>
      </div>
      <div class="text-[11px] text-slate-400 truncate">構成: ${names || "(未設定)"}</div>
    `;
    commonContainer.appendChild(div);
  });
}

/* --- 役（配当役）の追加・編集・削除 --- */
export function openRoleEditor(roleId) {
  editingRoleId = roleId;
  const panel = document.getElementById("role-editor-panel");
  const title = document.getElementById("role-editor-title");
  const nameInput = document.getElementById("role-edit-name");
  const payoutInput = document.getElementById("role-edit-payout");
  const typeSelect = document.getElementById("role-edit-type");
  const lineSelect = document.getElementById("role-edit-line");

  const syms = getAllAvailableSymbols();
  for (let r = 0; r < 3; r++) {
    const sel = document.getElementById(`role-edit-sym${r}`);
    sel.innerHTML = syms.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  if (roleId) {
    const role = state.rolesMaster.find(r => r.id === roleId);
    if (!role) return;
    title.innerText = `役の編集: ${role.name}`;
    nameInput.value = role.name;
    document.getElementById("role-edit-sym0").value = role.pattern[0];
    document.getElementById("role-edit-sym1").value = role.pattern[1];
    document.getElementById("role-edit-sym2").value = role.pattern[2];
    payoutInput.value = role.payout;
    typeSelect.value = role.type;
    if (lineSelect) lineSelect.value = role.preferredLine || "any";
    draftRoleSubstitutes = Array.isArray(role.substitutes)
      ? role.substitutes.map(s => ({ ...s, pattern: [...s.pattern] }))
      : [];
  } else {
    title.innerText = "新規役の追加";
    nameInput.value = "";
    document.getElementById("role-edit-sym0").value = "ベルA";
    document.getElementById("role-edit-sym1").value = "スイカA";
    document.getElementById("role-edit-sym2").value = "ベルB";
    payoutInput.value = 1;
    typeSelect.value = "special";
    if (lineSelect) lineSelect.value = "mid";
    draftRoleSubstitutes = [];
  }

  renderDraftSubstitutes();
  panel.classList.remove("hidden");
}

export function renderDraftSubstitutes() {
  const container = document.getElementById("role-edit-subs-container");
  if (!container) return;
  if (draftRoleSubstitutes.length === 0) {
    container.innerHTML = `<div class="text-[10px] text-slate-500 italic">代用図柄なし（変則押し救済を追加する場合は「+ 代用追加」）</div>`;
    return;
  }

  const syms = getAllAvailableSymbols();
  container.innerHTML = "";
  draftRoleSubstitutes.forEach((sub, idx) => {
    const div = document.createElement("div");
    div.className = "p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5";
    const symOptions = (selected) => syms.map(s => `<option value="${s}" ${s === selected ? "selected" : ""}>${s}</option>`).join("");
    const cond = sub.orderCondition || "irregular";
    div.innerHTML = `
      <div class="flex items-center justify-between gap-1">
        <select onchange="updateDraftSubstitute(${idx}, 'orderCondition', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-amber-200">
          <option value="irregular" ${cond === "irregular" ? "selected" : ""}>変則押し時のみ (中・右第1)</option>
          <option value="center_first" ${cond === "center_first" ? "selected" : ""}>中押し時のみ</option>
          <option value="right_first" ${cond === "right_first" ? "selected" : ""}>逆押し時のみ</option>
          <option value="all" ${cond === "all" ? "selected" : ""}>全押し順 (非引き込み時)</option>
        </select>
        <button type="button" onclick="removeDraftSubstitute(${idx})" class="text-[10px] text-rose-400 px-1 font-bold">✕ 削除</button>
      </div>
      <div class="grid grid-cols-3 gap-1">
        <select onchange="updateDraftSubstituteSym(${idx}, 0, this.value)" class="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[10px] text-white font-mono">${symOptions(sub.pattern[0])}</select>
        <select onchange="updateDraftSubstituteSym(${idx}, 1, this.value)" class="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[10px] text-white font-mono">${symOptions(sub.pattern[1])}</select>
        <select onchange="updateDraftSubstituteSym(${idx}, 2, this.value)" class="bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[10px] text-white font-mono">${symOptions(sub.pattern[2])}</select>
      </div>
    `;
    container.appendChild(div);
  });
}

export function addDraftSubstitute() {
  draftRoleSubstitutes.push({
    id: "sub_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    pattern: ["白BAR", "ベル", "ベル"],
    orderCondition: "irregular",
    fallbackOnly: true
  });
  renderDraftSubstitutes();
}

export function removeDraftSubstitute(idx) {
  draftRoleSubstitutes.splice(idx, 1);
  renderDraftSubstitutes();
}

export function updateDraftSubstitute(idx, key, val) {
  if (draftRoleSubstitutes[idx]) {
    draftRoleSubstitutes[idx][key] = val;
  }
}

export function updateDraftSubstituteSym(idx, reelIdx, val) {
  if (draftRoleSubstitutes[idx]) {
    draftRoleSubstitutes[idx].pattern[reelIdx] = val;
  }
}

export function closeRoleEditor() {
  editingRoleId = null;
  const panel = document.getElementById("role-editor-panel");
  if (panel) panel.classList.add("hidden");
}

export function saveRoleForm() {
  const name = document.getElementById("role-edit-name").value.trim() || "名称未設定役";
  const pattern = [
    document.getElementById("role-edit-sym0").value,
    document.getElementById("role-edit-sym1").value,
    document.getElementById("role-edit-sym2").value
  ];
  const payout = Math.max(0, Math.min(15, parseInt(document.getElementById("role-edit-payout").value, 10) || 0));
  const type = document.getElementById("role-edit-type").value;
  const preferredLine = document.getElementById("role-edit-line")?.value || "any";
  const clonedSubs = draftRoleSubstitutes.map(s => ({ ...s, pattern: [...s.pattern] }));

  if (editingRoleId) {
    const target = state.rolesMaster.find(r => r.id === editingRoleId);
    if (target) {
      target.name = name;
      target.pattern = pattern;
      target.payout = payout;
      target.type = type;
      target.preferredLine = preferredLine;
      target.substitutes = clonedSubs;
    }
  } else {
    state.rolesMaster.push({
      id: "role_" + Date.now(),
      name: name,
      pattern: pattern,
      payout: payout,
      type: type,
      preferredLine: preferredLine,
      substitutes: clonedSubs
    });
  }

  saveStateToStorage();
  closeRoleEditor();
  renderRulesLists();
  populateFlagSelect();
  updateHudDisplay();
  renderReelGrid();
}

export function deleteRole(roleId) {
  if (state.rolesMaster.length <= 1) return;
  state.rolesMaster = state.rolesMaster.filter(r => r.id !== roleId);
  state.commonFlags.forEach(cf => {
    cf.roleIds = cf.roleIds.filter(id => id !== roleId);
  });
  if (state.currentFlag === roleId) {
    state.currentFlag = "hazure";
  }
  saveStateToStorage();
  renderRulesLists();
  populateFlagSelect();
  updateHudDisplay();
  renderReelGrid();
}

/* --- 共通フラグの追加・編集・優先順位並び替え --- */
export function openCommonEditor(commonId) {
  editingCommonId = commonId;
  const panel = document.getElementById("common-editor-panel");
  const title = document.getElementById("common-editor-title");
  const nameInput = document.getElementById("common-edit-name");
  const prioritySelect = document.getElementById("common-edit-priority");

  if (commonId) {
    const cf = state.commonFlags.find(c => c.id === commonId);
    if (!cf) return;
    title.innerText = `共通フラグ編集: ${cf.name}`;
    nameInput.value = cf.name;
    prioritySelect.value = cf.priorityRule;
    draftCommonRoleIds = [...cf.roleIds];
  } else {
    title.innerText = "新規共通フラグの作成";
    nameInput.value = "";
    prioritySelect.value = "bonus";
    draftCommonRoleIds = state.rolesMaster.slice(0, 2).map(r => r.id);
  }

  renderCommonRoleOrderList();
  panel.classList.remove("hidden");
}

export function closeCommonEditor() {
  editingCommonId = null;
  const panel = document.getElementById("common-editor-panel");
  if (panel) panel.classList.add("hidden");
}

export function renderCommonRoleOrderList() {
  const container = document.getElementById("common-edit-roles-container");
  container.innerHTML = "";

  const selectedRoles = draftCommonRoleIds.map(id => state.rolesMaster.find(r => r.id === id)).filter(Boolean);
  const unselectedRoles = state.rolesMaster.filter(r => !draftCommonRoleIds.includes(r.id));

  selectedRoles.forEach((role, idx) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between bg-slate-900 px-2 py-1.5 rounded border border-rose-500/40 text-[11px]";
    row.innerHTML = `
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-rose-400 font-mono font-bold">#${idx + 1}</span>
        <span class="text-white font-bold truncate">${role.name}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" onclick="moveDraftCommonRole(${idx}, -1)" class="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 ${idx === 0 ? "opacity-30" : ""}">↑</button>
        <button type="button" onclick="moveDraftCommonRole(${idx}, 1)" class="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 ${idx === selectedRoles.length - 1 ? "opacity-30" : ""}">↓</button>
        <button type="button" onclick="toggleDraftCommonRole('${role.id}')" class="px-1.5 py-0.5 bg-rose-950 text-rose-300 rounded ml-1">解除</button>
      </div>
    `;
    container.appendChild(row);
  });

  if (unselectedRoles.length > 0) {
    const divider = document.createElement("div");
    divider.className = "text-[10px] text-slate-500 pt-1 border-t border-slate-800/80";
    divider.innerText = "追加できる役:";
    container.appendChild(divider);

    unselectedRoles.forEach(role => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between bg-slate-900/40 px-2 py-1 rounded border border-slate-800 text-[11px]";
      row.innerHTML = `
        <span class="text-slate-400 truncate">${role.name} (${role.payout}枚)</span>
        <button type="button" onclick="toggleDraftCommonRole('${role.id}')" class="px-2 py-0.5 bg-slate-800 text-sky-300 rounded font-bold shrink-0">+ 追加</button>
      `;
      container.appendChild(row);
    });
  }
}

export function toggleDraftCommonRole(roleId) {
  if (draftCommonRoleIds.includes(roleId)) {
    draftCommonRoleIds = draftCommonRoleIds.filter(id => id !== roleId);
  } else {
    draftCommonRoleIds.push(roleId);
  }
  renderCommonRoleOrderList();
}

export function moveDraftCommonRole(index, dir) {
  const targetIdx = index + dir;
  if (targetIdx < 0 || targetIdx >= draftCommonRoleIds.length) return;
  const tmp = draftCommonRoleIds[index];
  draftCommonRoleIds[index] = draftCommonRoleIds[targetIdx];
  draftCommonRoleIds[targetIdx] = tmp;
  renderCommonRoleOrderList();
}

export function saveCommonForm() {
  const autoName = draftCommonRoleIds
    .map(id => state.rolesMaster.find(r => r.id === id)?.name || "")
    .filter(Boolean)
    .join(" ＋ ") || "新規共通フラグ";
  const name = document.getElementById("common-edit-name").value.trim() || autoName;
  const priorityRule = document.getElementById("common-edit-priority").value;

  if (editingCommonId) {
    const target = state.commonFlags.find(c => c.id === editingCommonId);
    if (target) {
      target.name = name;
      target.roleIds = [...draftCommonRoleIds];
      target.priorityRule = priorityRule;
    }
  } else {
    state.commonFlags.push({
      id: "cf_" + Date.now(),
      name: name,
      roleIds: [...draftCommonRoleIds],
      priorityRule: priorityRule
    });
  }

  saveStateToStorage();
  closeCommonEditor();
  renderRulesLists();
  populateFlagSelect();
  renderReelGrid();
}

export function deleteCommonFlag(commonId) {
  state.commonFlags = state.commonFlags.filter(c => c.id !== commonId);
  if (state.currentFlag === commonId) {
    state.currentFlag = "hazure";
  }
  saveStateToStorage();
  renderRulesLists();
  populateFlagSelect();
  updateHudDisplay();
  renderReelGrid();
}
