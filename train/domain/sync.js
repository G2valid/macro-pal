// Turning Training Coach records into Bite Club workout entries.
// Pure functions (tested); the writing happens in ui/sync.js.

import { workoutSummary } from "./history.js";

// Approximate MET values for the effort levels this app prescribes
// (Compendium of Physical Activities). Calorie burn = MET × kg × hours.
// These are estimates; wearables and machines often differ.
export const MET = {
  lift: 3.5, // resistance training incl. rest between sets
  walking: 3.5, treadmill: 5, running: 8, cycling: 5.5, elliptical: 5, rowing: 5, stairs: 7, swimming: 6,
};

// Trainer cardio modes → Bite Club workout types.
export const BITE_TYPE = {
  walking: "walking", treadmill: "walking", running: "running", cycling: "cycling",
  elliptical: "other", rowing: "rowing", stairs: "other", swimming: "swimming",
};

export const estimateKcal = (met, minutes, weightKg) => (weightKg > 0 && minutes > 0 ? Math.round(met * weightKg * (minutes / 60)) : 0);

/** A finished lifting workout as a Bite Club workout. */
export function liftToBite(log, weightKg) {
  const s = workoutSummary(log);
  const minutes = s.minutes || 0;
  return {
    id: `tc-${log.id}`, source: "trainer", type: "strength", title: log.name,
    minutes, kcal: estimateKcal(MET.lift, minutes, weightKg), distance: 0, distUnit: "mi", avgHr: 0, output: 0,
    notes: `Training Coach · ${s.sets} sets · ${s.volume.toLocaleString("en-US")} lb${weightKg ? " · kcal estimated" : ""}`,
  };
}

/** A cardio session logged in the trainer as a Bite Club workout. */
export function cardioToBite(c, weightKg, label = "") {
  return {
    id: `tc-${c.id}`, source: "trainer", type: BITE_TYPE[c.mode] || "other", title: label || "Cardio",
    minutes: c.minutes || 0, kcal: estimateKcal(MET[c.mode] || 5, c.minutes, weightKg),
    distance: c.distance || 0, distUnit: "mi", avgHr: c.avgHr || 0, output: 0,
    notes: `Training Coach${c.rpe ? ` · effort ${c.rpe}/10` : ""}${weightKg ? " · kcal estimated" : ""}`,
  };
}

/** Records that still need copying to Bite Club. */
export function pendingSync(person) {
  return {
    logs: (person.logs || []).filter((l) => l.status === "done" && !l.biteSynced),
    cardio: (person.cardioLogs || []).filter((c) => c.source !== "bite" && !c.biteSynced),
  };
}
