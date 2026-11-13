// Copies finished trainer workouts and cardio into Bite Club's workout log,
// so Bite Club's Fitness tab, weekly ring and calories include them.

import { ctx, save } from "./core.js";
import { biteProfile, biteUpsertWorkout, biteRemoveWorkout } from "../store.js";
import { liftToBite, cardioToBite, pendingSync } from "../domain/sync.js";
import { CARDIO_MODES } from "./onboard.js";

const modeLabel = (m) => (CARDIO_MODES[m] || "Cardio").replace(/^\S+\s/, "");

/** Sync one person. Returns how many records were copied. */
export function syncToBite(p) {
  if (!p?.biteId || !biteProfile(p.biteId)) return 0;
  const kg = biteProfile(p.biteId).weightKg;
  const { logs, cardio } = pendingSync(p);
  let n = 0;
  for (const l of logs) if (biteUpsertWorkout(p.biteId, l.date, liftToBite(l, kg))) { l.biteSynced = true; n++; }
  for (const c of cardio) if (biteUpsertWorkout(p.biteId, c.date, cardioToBite(c, kg, modeLabel(c.mode)))) { c.biteSynced = true; n++; }
  if (n) save();
  return n;
}

/** Sync everyone (on start-up: also back-fills workouts done before this existed). */
export function syncAll() {
  let n = 0;
  for (const p of Object.values(ctx.state.people)) n += syncToBite(p);
  return n;
}

export const unsyncFromBite = (p, recordId) => p?.biteId && biteRemoveWorkout(p.biteId, `tc-${recordId}`);
