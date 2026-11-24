import { PAYLINES } from "./constants.js";
import { state } from "./state.js";
import { mod21, getSymbolAt, isSubConditionMet } from "./utils.js";

/* ---------------------------------------------------------
   コア制御ロジック：スベリ計算・優先度判定エンジン
   --------------------------------------------------------- */

export function resolveAllowedRoles(flagId) {
  if (flagId === "hazure") return [];
  const single = state.rolesMaster.find(r => r.id === flagId);
  if (single) return [single];

  const cf = state.commonFlags.find(c => c.id === flagId);
  if (!cf) return [];

  const roles = cf.roleIds.map(id => state.rolesMaster.find(r => r.id === id)).filter(Boolean);
  const sorted = [...roles];
  if (cf.priorityRule === "bonus") {
    sorted.sort((a, b) => (a.type === "bonus" ? -1 : 1) - (b.type === "bonus" ? -1 : 1));
  } else if (cf.priorityRule === "small") {
    sorted.sort((a, b) => ((a.type === "small" || a.type === "replay") ? -1 : 1) - ((b.type === "small" || b.type === "replay") ? -1 : 1));
  } else if (cf.priorityRule === "payout") {
    sorted.sort((a, b) => b.payout - a.payout);
  }
  return sorted;
}

// ある有効ライン上で指定パターンが完成しているか判定（全リール停止後）
export function isPatternMatchedOnLine(pattern, stopPositions, line) {
  for (let r = 0; r < 3; r++) {
    if (stopPositions[r] === null) return false;
    const sym = getSymbolAt(r, stopPositions[r], line.offsets[r]);
    if (pattern[r] !== "ANY" && pattern[r] !== sym) {
      return false;
    }
  }
  return true;
}

// 部分停止状態において、指定パターンがまだ入賞し得る（テンパイ／成立途中）か判定
export function canPatternStillWin(pattern, testStops, line) {
  for (let r = 0; r < 3; r++) {
    if (testStops[r] !== null) {
      const sym = getSymbolAt(r, testStops[r], line.offsets[r]);
      if (pattern[r] !== "ANY" && pattern[r] !== sym) {
        return false;
      }
    }
  }
  return true;
}

// 未停止リールを含め、この停止位置を選んだ時点で該当パターンの入賞が「不可避（確定）」になってしまうか判定
export function isPatternInevitable(pattern, testStops) {
  for (const line of PAYLINES) {
    let possibleAndUnavoidable = true;
    for (let r = 0; r < 3; r++) {
      if (testStops[r] !== null) {
        const sym = getSymbolAt(r, testStops[r], line.offsets[r]);
        if (pattern[r] !== "ANY" && pattern[r] !== sym) {
          possibleAndUnavoidable = false;
          break;
        }
      } else {
        // 未停止リール側がANYでなければ、後から外すことができるため不可避ではない
        if (pattern[r] !== "ANY") {
          possibleAndUnavoidable = false;
          break;
        }
      }
    }
    if (possibleAndUnavoidable) return true;
  }
  return false;
}

// 第2優先: 不成立役（および条件外の代用図柄）の入賞・不可避入賞禁止チェック
export function isValidStopCandidate(reelIndex, stopPos, currentStops, allowedRoles, firstReel) {
  const testStops = currentStops.map((s, idx) =>
    idx === reelIndex ? stopPos : (s.stopped ? s.stopPos : null)
  );
  const allowedIds = new Set(allowedRoles.map(r => r.id));

  for (const role of state.rolesMaster) {
    if (!allowedIds.has(role.id)) {
      // 非成立役の本来図柄の不可避入賞をチェック
      if (isPatternInevitable(role.pattern, testStops)) {
        return false;
      }
      // 非成立役の代用図柄の不可避入賞もすべて禁止
      if (Array.isArray(role.substitutes)) {
        for (const sub of role.substitutes) {
          if (isPatternInevitable(sub.pattern, testStops)) {
            return false;
          }
        }
      }
    } else {
      // 成立役であっても、押し順条件を満たさない代用図柄の誤入賞を禁止
      if (Array.isArray(role.substitutes)) {
        for (const sub of role.substitutes) {
          if (!isSubConditionMet(sub, firstReel) && isPatternInevitable(sub.pattern, testStops)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

// 第3優先: 成立役（本来図柄または代用図柄）をテンパイ・入賞へ引き込めるか判定
export function canPullRoleAtStop(role, reelIndex, stopPos, currentStops, firstReel, allowSubstitutes, targetLineId = null) {
  const testStops = currentStops.map((s, idx) =>
    idx === reelIndex ? stopPos : (s.stopped ? s.stopPos : null)
  );
  const targetLines = targetLineId && targetLineId !== "any"
    ? PAYLINES.filter(l => l.id === targetLineId)
    : PAYLINES;

  // 本来図柄の引き込み判定
  for (const line of targetLines) {
    if (canPatternStillWin(role.pattern, testStops, line)) {
      return true;
    }
  }

  // 代用図柄が許可されている場合の引き込み判定
  if (allowSubstitutes && Array.isArray(role.substitutes)) {
    for (const sub of role.substitutes) {
      if (!isSubConditionMet(sub, firstReel)) continue;
      for (const line of targetLines) {
        if (canPatternStillWin(sub.pattern, testStops, line)) {
          return true;
        }
      }
    }
  }
  return false;
}

// メインスベリ判定エンジン
export function calculateSlideForReel(reelIndex, pushPos, flagId, currentStops, missPolicy) {
  const logs = [];
  const allowedRoles = resolveAllowedRoles(flagId);
  const isAllUnstopped = currentStops.every(s => !s.stopped);
  const effectiveFirstReel = isAllUnstopped ? reelIndex : state.firstStoppedReel;
  const orderText = effectiveFirstReel === 0 ? "順押し(左第1)" : `変則押し(${effectiveFirstReel === 1 ? "中" : "右"}第1)`;

  // 第1優先: 0〜4コマの候補リストを作成（スベリコマ数昇順）
  const candidates = [];
  for (let slide = 0; slide <= 4; slide++) {
    const stopPos = mod21(pushPos - slide);
    candidates.push({ slide, stopPos, symbol: state.reelStrips[reelIndex][stopPos] });
  }

  logs.push({
    step: "第1優先: 0〜4コマ制限",
    text: `押下[${pushPos}番:${state.reelStrips[reelIndex][pushPos]}] / ${orderText} 候補: ${candidates.map(c => `${c.slide}滑(${c.stopPos}番:${c.symbol})`).join(", ")}`,
    type: "info"
  });

  // 第2優先: 不成立役の入賞禁止フィルタ
  let safeCandidates = candidates.filter(c =>
    isValidStopCandidate(reelIndex, c.stopPos, currentStops, allowedRoles, effectiveFirstReel)
  );

  if (safeCandidates.length < candidates.length) {
    const excluded = candidates.filter(c => !safeCandidates.includes(c));
    logs.push({
      step: "第2優先: 不成立役禁止",
      text: `非成立役・条件外代用の入賞回避のため除外: ${excluded.map(e => `${e.slide}滑(${e.symbol})`).join(", ")}`,
      type: "warn"
    });
  }

  if (safeCandidates.length === 0) {
    safeCandidates = [candidates[0]];
    logs.push({
      step: "フェイルセーフ",
      text: `全候補がNGのため0コマ停止を適用`,
      type: "warn"
    });
  }

  // 特殊制御ルールチェック（安全条件を満たす場合のみ強制スベリ）
  const activeSpecial = state.specialRules.find(r =>
    r.active && r.flagId === flagId && r.reelIndex === reelIndex && r.pushPos === pushPos
  );
  if (activeSpecial) {
    const forced = safeCandidates.find(c => c.slide === activeSpecial.forceSlide);
    if (forced) {
      logs.push({
        step: "特殊制御ルール発火",
        text: `「${activeSpecial.name}」により強制${forced.slide}コマ滑り (${forced.stopPos}番:${forced.symbol})`,
        type: "special"
      });
      return { stopPos: forced.stopPos, slide: forced.slide, logs };
    }
  }

  // 第3優先: 成立役の引き込み（優先度順に探索）
  const lineNamesMap = { top: "上段", mid: "中段", bot: "下段", diag_down: "右下がり", diag_up: "右上がり" };
  for (const role of allowedRoles) {
    const prefLine = role.preferredLine && role.preferredLine !== "any" ? role.preferredLine : null;

    // 3-A1: 優先揃いラインが指定されている場合、そのラインでの本来図柄引き込みを最優先チェック
    if (prefLine) {
      const prefNormalPull = safeCandidates.filter(c =>
        canPullRoleAtStop(role, reelIndex, c.stopPos, currentStops, effectiveFirstReel, false, prefLine)
      );
      if (prefNormalPull.length > 0) {
        const chosen = prefNormalPull[0];
        logs.push({
          step: `第3優先: 成立役引き込み (${lineNamesMap[prefLine]}優先)`,
          text: `「${role.name}」を${lineNamesMap[prefLine]}ラインへ優先引き込み (${chosen.slide}コマ滑り → ${chosen.stopPos}番:${chosen.symbol})`,
          type: "hit"
        });
        return { stopPos: chosen.stopPos, slide: chosen.slide, logs };
      }
    }

    // 3-A2: 全有効ラインでの本来図柄引き込みチェック
    const normalPull = safeCandidates.filter(c =>
      canPullRoleAtStop(role, reelIndex, c.stopPos, currentStops, effectiveFirstReel, false, null)
    );
    if (normalPull.length > 0) {
      const chosen = normalPull[0];
      logs.push({
        step: "第3優先: 成立役引き込み",
        text: `「${role.name}」の本来図柄を引き込み (${chosen.slide}コマ滑り → ${chosen.stopPos}番:${chosen.symbol})`,
        type: "hit"
      });
      return { stopPos: chosen.stopPos, slide: chosen.slide, logs };
    }

    // 3-B: 本来図柄が引き込めない場合、条件を満たす代用図柄でフォールバック引き込み
    if (prefLine) {
      const prefSubPull = safeCandidates.filter(c =>
        canPullRoleAtStop(role, reelIndex, c.stopPos, currentStops, effectiveFirstReel, true, prefLine)
      );
      if (prefSubPull.length > 0) {
        const chosen = prefSubPull[0];
        logs.push({
          step: `第3優先: 代用図柄救済 (${lineNamesMap[prefLine]}優先)`,
          text: `「${role.name}」代用図柄を${lineNamesMap[prefLine]}ラインへ救済引き込み (${chosen.slide}コマ滑り → ${chosen.stopPos}番:${chosen.symbol})`,
          type: "hit"
        });
        return { stopPos: chosen.stopPos, slide: chosen.slide, logs };
      }
    }

    const subPull = safeCandidates.filter(c =>
      canPullRoleAtStop(role, reelIndex, c.stopPos, currentStops, effectiveFirstReel, true, null)
    );
    if (subPull.length > 0) {
      const chosen = subPull[0];
      logs.push({
        step: "第3優先: 代用図柄救済",
        text: `「${role.name}」本来図柄非引き込みのため代用図柄で救済 (${chosen.slide}コマ滑り → ${chosen.stopPos}番:${chosen.symbol})`,
        type: "hit"
      });
      return { stopPos: chosen.stopPos, slide: chosen.slide, logs };
    }
  }

  // 第4優先: 取りこぼし時（またはハズレ時）の挙動ポリシー
  let policyCandidates = [...safeCandidates];

  if (missPolicy === "avoid_fake" && allowedRoles.length > 0) {
    const nonTenpai = policyCandidates.filter(c =>
      !allowedRoles.some(r => canPullRoleAtStop(r, reelIndex, c.stopPos, currentStops, effectiveFirstReel, true, null))
    );
    if (nonTenpai.length > 0) {
      policyCandidates = nonTenpai;
      logs.push({
        step: "第4優先: ガセテンパイ回避",
        text: `取りこぼし確定のためテンパイ形を避ける位置へ誘導`,
        type: "info"
      });
    }
  } else if (missPolicy === "keep_fake" && allowedRoles.length > 0) {
    const tenpai = policyCandidates.filter(c =>
      allowedRoles.some(r => canPullRoleAtStop(r, reelIndex, c.stopPos, currentStops, effectiveFirstReel, true, null))
    );
    if (tenpai.length > 0) {
      policyCandidates = tenpai;
      logs.push({
        step: "第4優先: テンパイ維持(煽り)",
        text: `煽り演出のためテンパイ形を維持して停止`,
        type: "info"
      });
    }
  }

  // 第5優先: 最小スベリ原則（できるだけ滑らない）
  const finalChoice = policyCandidates[0];
  logs.push({
    step: "第5優先: 最小スベリ原則",
    text: `最短停止を採用 (${finalChoice.slide}コマ滑り → ${finalChoice.stopPos}番:${finalChoice.symbol})`,
    type: "final"
  });

  return { stopPos: finalChoice.stopPos, slide: finalChoice.slide, logs };
}
