import { createEmptyStopState } from "../constants.js";
import { state } from "../state.js";
import { toggleModal } from "../utils.js";
import { calculateSlideForReel } from "../engine.js";

/* ---------------------------------------------------------
   全21コマスベリテーブルモーダル ＆ CSVエクスポート
   --------------------------------------------------------- */

export function openTableModal() {
  const tbody = document.getElementById("modal-table-body");
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

  toggleModal("modal-table");
}

export function exportTableCSV() {
  const missPolicy = document.getElementById("sim-miss-policy").value;
  const emptyStops = createEmptyStopState();

  let csv = "コマ番号,左図柄,左スベリ,左停止位置,中図柄,中スベリ,中停止位置,右図柄,右スベリ,右停止位置\n";
  for (let idx = 0; idx < 21; idx++) {
    const row = [idx];
    for (let r = 0; r < 3; r++) {
      const res = calculateSlideForReel(r, idx, state.currentFlag, emptyStops, missPolicy);
      row.push(state.reelStrips[r][idx], res.slide, res.stopPos);
    }
    csv += row.join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slide_table_${state.currentFlag}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
