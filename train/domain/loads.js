// Weight math in pounds. Everything rounds to weights the user actually owns
// or the gym actually has, so suggestions are always loadable.

export const DEFAULT_LOADS = {
  bar: 45,             // barbell weight
  smallestPlate: 2.5,  // smallest plate per side → barbell steps of 5 lb
  dumbbellStep: 5,
  dumbbellMin: 5,
  dumbbellMax: 120,
  dumbbells: null,     // home: explicit list of owned dumbbell weights, e.g. [10, 20, 30]
  kettlebells: [9, 13, 18, 26, 35, 44, 53, 62, 70], // common 4–32 kg bells, in lb
  machineStep: 10,
  cableStep: 5,
};

const PLATES = [45, 35, 25, 10, 5, 2.5];

const settingsOf = (s) => ({ ...DEFAULT_LOADS, ...(s || {}) });

/** All loadable weights for a load type (null = continuous steps, see stepOf). */
function listOf(type, s) {
  if (type === "dumbbell" && s.dumbbells?.length) return [...s.dumbbells].sort((a, b) => a - b);
  if (type === "kettlebell") return [...s.kettlebells].sort((a, b) => a - b);
  return null;
}
function stepOf(type, s) {
  if (type === "barbell") return s.smallestPlate * 2;
  if (type === "dumbbell") return s.dumbbellStep;
  if (type === "machine") return s.machineStep;
  if (type === "cable") return s.cableStep;
  return null;
}
function minOf(type, s) {
  if (type === "barbell") return s.bar;
  if (type === "dumbbell") return s.dumbbellMin;
  return stepOf(type, s) || 0;
}

/** Is this load type progressed by adding weight? */
export const isWeighted = (type) => ["barbell", "dumbbell", "kettlebell", "machine", "cable"].includes(type);

/**
 * Round to a weight that exists. mode: "nearest" | "down" | "up".
 * Never returns less than the minimum (e.g. the empty bar).
 */
export function roundLoad(w, type, settings, mode = "nearest") {
  const s = settingsOf(settings);
  if (!isWeighted(type) || !(w > 0)) return 0;
  const list = listOf(type, s);
  if (list) {
    if (mode === "down") return [...list].reverse().find((x) => x <= w + 1e-9) ?? list[0];
    if (mode === "up") return list.find((x) => x >= w - 1e-9) ?? list[list.length - 1];
    return list.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), list[0]);
  }
  const step = stepOf(type, s);
  const min = minOf(type, s);
  const base = type === "barbell" ? s.bar : 0;
  const k = (w - base) / step;
  const r = mode === "down" ? Math.floor(k + 1e-9) : mode === "up" ? Math.ceil(k - 1e-9) : Math.round(k);
  let out = base + r * step;
  if (type === "dumbbell") out = Math.min(out, s.dumbbellMax);
  return Math.max(min, +out.toFixed(2));
}

/** The next heavier (dir = 1) or lighter (dir = -1) loadable weight. */
export function stepLoad(w, type, settings, dir = 1) {
  const s = settingsOf(settings);
  const list = listOf(type, s);
  if (list) {
    if (dir > 0) return list.find((x) => x > w + 1e-9) ?? w;
    return [...list].reverse().find((x) => x < w - 1e-9) ?? w;
  }
  const step = stepOf(type, s);
  if (!step) return w;
  const next = roundLoad(w, type, s, dir > 0 ? "down" : "up") + dir * step;
  if (type === "dumbbell" && next > s.dumbbellMax) return w;
  return Math.max(minOf(type, s), next);
}

/**
 * Estimated one-rep max (Epley), counting reps in reserve as reps you could
 * have done. Only trusted up to ~12 total reps; beyond that returns null.
 */
export function e1rm(weight, reps, rir = 0) {
  const total = reps + (rir || 0);
  if (!(weight > 0) || !(reps > 0) || total > 12) return null;
  if (total <= 1) return weight;
  return weight * (1 + total / 30);
}

/** Load that should allow `reps` with `rir` in reserve, from an estimated max. */
export const loadFor = (max, reps, rir = 0) => max / (1 + (reps + rir) / 30);

/** Plates for one side of a barbell. */
export function platesPerSide(total, bar = 45, available = PLATES) {
  let side = (total - bar) / 2;
  if (side <= 0) return { plates: [], remainder: 0 };
  const plates = [];
  for (const p of available) {
    while (side >= p - 1e-9) { plates.push(p); side -= p; }
  }
  return { plates, remainder: +side.toFixed(2) };
}

/**
 * Warm-up sets before the first working set of an exercise.
 * Barbell: ramp from the empty bar. Others: one lighter set if it's meaningful.
 */
export function warmupSets(working, type, settings) {
  const s = settingsOf(settings);
  if (!isWeighted(type) || !(working > 0)) return [];
  if (type === "barbell") {
    const out = [{ weight: s.bar, reps: 10 }];
    const ramp = working >= 185 ? [[0.5, 5], [0.7, 3], [0.85, 1]] : working >= 115 ? [[0.55, 5], [0.75, 3]] : [[0.65, 5]];
    for (const [pct, reps] of ramp) {
      const w = roundLoad(working * pct, type, s, "down");
      if (w > out[out.length - 1].weight && w < working) out.push({ weight: w, reps });
    }
    return working <= s.bar ? [] : out;
  }
  const w = roundLoad(working * 0.5, type, s, "down");
  return w > 0 && w < working && working >= 15 ? [{ weight: w, reps: 8 }] : [];
}

export const fmtLb = (w) => (w ? `${Number.isInteger(w) ? w : w.toFixed(1)} lb` : "Bodyweight");
