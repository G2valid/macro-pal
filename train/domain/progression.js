// Progression engine: what should I lift next time, and why?
//
// Conservative, explainable rules (no AI). Each decision carries the rule
// that fired and a plain-language reason, so the coach can explain it later
// without inventing numbers.
//
// Core rule — double progression (coaching practice with broad support):
// work within a rep range; when every set reaches the top of the range at
// the planned effort, add the smallest available weight and start again
// near the bottom of the range.

import { EX } from "./exercises.js";
import { isWeighted, stepLoad, roundLoad, e1rm, loadFor } from "./loads.js";

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/** Completed working sets (no warm-ups) from one logged exercise. */
export const workingSets = (entry) => (entry?.sets || []).filter((s) => s.done && !s.warmup && s.reps > 0);

/** The weight most sets were done at (ties → heavier). */
function mainWeight(sets) {
  const counts = new Map();
  for (const s of sets) counts.set(s.weight || 0, (counts.get(s.weight || 0) || 0) + 1);
  let best = 0, n = -1;
  for (const [w, c] of counts) if (c > n || (c === n && w > best)) { best = w; n = c; }
  return best;
}

/**
 * @param exerciseId
 * @param rx       prescription {sets, repLow, repHigh, rir, unit}
 * @param history  past entries for this exercise, newest first:
 *                 [{date, sets:[{weight, reps, rir, done, warmup}], pain}]
 * @param opts     {today, loads, equipment}
 * @returns {{action, weight, reps, rule, why, evidence, exerciseId?}}
 */
export function nextTarget(exerciseId, rx, history = [], opts = {}) {
  const ex = EX[exerciseId];
  const type = ex?.load || "bodyweight";
  const { today = new Date().toISOString().slice(0, 10), loads, equipment } = opts;
  const unit = rx.unit === "sec" ? "s" : " reps";
  const past = history.filter((h) => workingSets(h).length);
  const last = past[0];

  if (!last) {
    if (isWeighted(type)) {
      return {
        action: "calibrate", weight: null, reps: rx.repHigh, rule: "first-session",
        why: `First time: pick a weight you could lift about ${rx.repHigh + rx.rir} times, and do ${rx.repLow}–${rx.repHigh} reps stopping with ~${rx.rir} in reserve. The app will adjust from what you log.`,
        evidence: "practice",
      };
    }
    return { action: "calibrate", weight: 0, reps: rx.repLow, rule: "first-session", why: `First time: aim for ${rx.repLow}–${rx.repHigh}${unit} with good form, stopping with ~${rx.rir} in reserve.`, evidence: "practice" };
  }

  const sets = workingSets(last);
  const w = mainWeight(sets);
  const atW = sets.filter((s) => (s.weight || 0) === w);
  const gap = daysBetween(last.date, today);

  // Pain flagged: never progress through pain.
  if (last.pain) {
    return {
      action: "pain", weight: w, reps: rx.repLow, rule: "pain-flag",
      why: "You flagged pain on this exercise last time. Keep the same load (or lighter), stop if it's sharp, and consider swapping to an alternative. Persistent pain is worth getting checked.",
      evidence: "practice",
    };
  }

  // Long break: ease back in.
  if (gap > 14 && isWeighted(type) && w > 0) {
    const pct = gap > 28 ? 0.8 : 0.9;
    const nw = roundLoad(w * pct, type, loads, "down");
    return {
      action: "reduce", weight: nw, reps: rx.repLow, rule: gap > 28 ? "break-28d" : "break-14d",
      why: `It's been ${gap} days since you last did this. Starting about ${Math.round((1 - pct) * 100)}% lighter lets you ease back in; you'll usually be back to your previous weights within a couple of sessions.`,
      evidence: "practice",
    };
  }

  const reported = atW.filter((s) => s.rir !== undefined && s.rir !== null && s.rir !== "");
  const avgRir = reported.length ? reported.reduce((t, s) => t + Number(s.rir), 0) / reported.length : null;
  const effortOk = avgRir === null || avgRir >= rx.rir - 1;
  const effortNote = avgRir === null ? " (no effort rating logged, so this assumes the sets felt as planned)" : "";
  const minReps = Math.min(...atW.map((s) => s.reps));
  const enoughSets = atW.length >= rx.sets;
  const anyBelow = atW.some((s) => s.reps < rx.repLow);

  // Was the session before this also below range at the same weight?
  const prev = past[1];
  const prevBelow = prev && mainWeight(workingSets(prev)) === w && workingSets(prev).some((s) => (s.weight || 0) === w && s.reps < rx.repLow);

  const topTarget = (jumpBig) => (jumpBig ? rx.repHigh + 2 : rx.repHigh);

  if (isWeighted(type) && w > 0) {
    const next = stepLoad(w, type, loads, 1);
    const jump = next > w ? (next - w) / w : 0;
    const big = jump > 0.125;
    const allTop = enoughSets && minReps >= topTarget(big);
    if (allTop && effortOk) {
      if (next === w) {
        return { action: "reps", weight: w, reps: minReps + 1, rule: "max-load", why: `You've reached the heaviest weight available. Keep adding reps, slow the lowering, or move to a harder variation.`, evidence: "practice" };
      }
      return {
        action: "increase", weight: next, reps: rx.repLow, rule: "double-progression",
        why: `You hit ${rx.repHigh}+ reps on all ${atW.length} sets at ${w} lb${effortNote}. Next time: ${next} lb, aiming for at least ${rx.repLow} reps per set, then build back up.`,
        evidence: "practice",
      };
    }
    if (enoughSets && minReps >= rx.repHigh && big && effortOk) {
      return {
        action: "reps", weight: w, reps: rx.repHigh + 2, rule: "big-jump",
        why: `The next weight up (${next} lb) is a ${Math.round(jump * 100)}% jump. Build to ${rx.repHigh + 2} reps on every set at ${w} lb first so the jump doesn't knock you out of the rep range.`,
        evidence: "practice",
      };
    }
    if (anyBelow && prevBelow) {
      const nw = roundLoad(w * 0.9, type, loads, "down");
      return {
        action: "reduce", weight: nw < w ? nw : stepLoad(w, type, loads, -1), reps: rx.repLow, rule: "stall-2",
        why: `Two sessions in a row below ${rx.repLow} reps at ${w} lb. Dropping about 10% and building back up usually works better than grinding. If it stalls again, sleep, food and recovery are worth a look, or try a variation.`,
        evidence: "practice",
      };
    }
    if (anyBelow) {
      return {
        action: "hold", weight: w, reps: rx.repLow, rule: "below-range",
        why: `Some sets fell below ${rx.repLow} reps at ${w} lb. Repeat the weight — one tough session isn't a trend.`,
        evidence: "practice",
      };
    }
    if (!effortOk) {
      return {
        action: "hold", weight: w, reps: minReps, rule: "effort-high",
        why: `You were closer to failure than planned (about ${avgRir.toFixed(1)} reps in reserve vs. ${rx.rir} planned). Repeat ${w} lb and aim for the same reps feeling smoother.`,
        evidence: "practice",
      };
    }
    return {
      action: "reps", weight: w, reps: Math.min(rx.repHigh, minReps + 1), rule: "add-reps",
      why: `Stay at ${w} lb and try to beat last time by a rep on at least one set. Once every set reaches ${rx.repHigh}, the weight goes up.`,
      evidence: "practice",
    };
  }

  // Bodyweight, band and timed holds: progress reps/time, then the variation.
  const allTop = enoughSets && minReps >= rx.repHigh;
  if (allTop && effortOk) {
    const harder = (ex?.harder || []).map((id) => EX[id]).find((h) => h && (!equipment || h.equip.every((q) => equipment.includes(q))));
    if (harder && rx.unit !== "sec") {
      return {
        action: "level_up", weight: 0, reps: rx.repLow, rule: "variation-up", exerciseId: harder.id,
        why: `You hit ${rx.repHigh}+ reps on every set. Time for a harder variation: ${harder.name}. Or keep this one and add a weighted vest, backpack or tighter band.`,
        evidence: "practice",
      };
    }
    const step = rx.unit === "sec" ? 10 : 2;
    return {
      action: "reps", weight: 0, reps: minReps + step, rule: "extend-range",
      why: rx.unit === "sec"
        ? `You held every set for ${rx.repHigh}s+. Add about 10 seconds, or move to a harder variation once 60 s feels easy.`
        : `You hit the top of the range. Add a couple of reps, slow the lowering, or add resistance.`,
      evidence: "practice",
    };
  }
  return {
    action: "reps", weight: 0, reps: Math.min(rx.repHigh, minReps + (rx.unit === "sec" ? 5 : 1)), rule: "add-reps",
    why: rx.unit === "sec" ? "Try to hold a few seconds longer than last time." : "Try to beat last time by a rep on at least one set.",
    evidence: "practice",
  };
}

/**
 * In-session adjustment after a set: if the set was clearly too easy or too
 * hard, suggest a better weight for the next set using the estimated max.
 * Returns null when the current weight is about right.
 */
export function adjustNextSet(set, rx, type, loads) {
  if (!isWeighted(type) || !(set.weight > 0) || !(set.reps > 0)) return null;
  const rir = set.rir === undefined || set.rir === null || set.rir === "" ? null : Number(set.rir);
  const tooEasy = (rir !== null && rir >= rx.rir + 2) || set.reps >= rx.repHigh + 3;
  const tooHard = set.reps < rx.repLow - 1 || (rir === 0 && set.reps < rx.repLow);
  if (!tooEasy && !tooHard) return null;
  const max = e1rm(set.weight, set.reps, rir ?? rx.rir);
  if (!max) {
    if (tooEasy) return { weight: stepLoad(set.weight, type, loads, 1), why: "That looked easy — try the next weight up." };
    return null;
  }
  const mid = Math.round((rx.repLow + rx.repHigh) / 2);
  let target = loadFor(max, mid, rx.rir);
  target = Math.min(target, set.weight * 1.1); // never jump more than ~10% mid-session
  target = Math.max(target, set.weight * 0.85);
  const w = roundLoad(target, type, loads, "down");
  if (w === set.weight) {
    if (tooEasy) { const up = stepLoad(set.weight, type, loads, 1); return up > set.weight && up <= set.weight * 1.15 ? { weight: up, why: "That was easier than planned — try the next weight up." } : null; }
    return null;
  }
  return {
    weight: w,
    why: tooEasy
      ? `That was easier than planned. ${w} lb should land you around ${mid} reps with ~${rx.rir} in reserve.`
      : `That was harder than planned. ${w} lb should keep you in the ${rx.repLow}–${rx.repHigh} range.`,
  };
}

/** Personal records hit by a new set, compared to history (newest first). */
export function detectPRs(set, history, exerciseId) {
  const type = EX[exerciseId]?.load;
  const prior = history.flatMap((h) => workingSets(h));
  const out = [];
  if (!(set.reps > 0)) return out;
  if (isWeighted(type) && set.weight > 0) {
    const est = e1rm(set.weight, set.reps, 0);
    const bestEst = Math.max(0, ...prior.map((s) => e1rm(s.weight, s.reps, 0) || 0));
    const bestW = Math.max(0, ...prior.map((s) => s.weight || 0));
    if (prior.length && set.weight > bestW) out.push({ kind: "weight", label: `Heaviest ever: ${set.weight} lb` });
    else if (prior.length && est && est > bestEst + 0.5) out.push({ kind: "e1rm", label: `Best estimated max: ${Math.round(est)} lb` });
    const bestRepsAtW = Math.max(0, ...prior.filter((s) => s.weight === set.weight).map((s) => s.reps));
    if (prior.some((s) => s.weight === set.weight) && set.reps > bestRepsAtW && !out.length) out.push({ kind: "reps", label: `Most reps at ${set.weight} lb: ${set.reps}` });
  } else {
    const bestReps = Math.max(0, ...prior.map((s) => s.reps));
    if (prior.length && set.reps > bestReps) out.push({ kind: "reps", label: `Most ever: ${set.reps}` });
  }
  return out;
}
