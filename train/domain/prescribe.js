// Goal → prescription rules. Every number here is a deliberate, explainable
// default, labelled with the strength of evidence behind it.
//
// Evidence labels used in the app:
//   strong   — consistent findings across meta-analyses / position stands
//   moderate — supported, but with real uncertainty or individual variation
//   practice — established coaching practice; sensible, not well tested

// [sets, repLow, repHigh, RIR, rest seconds]
const STYLES = {
  strength: {
    label: "Strength",
    main: [4, 3, 6, 2, 210],
    secondary: [3, 6, 10, 2, 150],
    accessory: [3, 8, 12, 2, 90],
  },
  hypertrophy: {
    label: "Muscle building",
    main: [3, 6, 10, 2, 150],
    secondary: [3, 8, 12, 2, 120],
    accessory: [3, 10, 15, 1, 75],
  },
  endurance: {
    label: "Muscular endurance",
    main: [3, 10, 15, 2, 90],
    secondary: [3, 12, 15, 2, 75],
    accessory: [2, 15, 20, 1, 60],
  },
};

export const STYLE_NOTES = {
  strength: { text: "Heavier loads for fewer reps build strength most directly, while moderate-rep accessory work keeps building muscle.", evidence: "strong" },
  hypertrophy: { text: "Muscle grows across a wide range of loads (roughly 5–30 reps) when sets are taken close to failure. Moderate reps are simply the most time-efficient.", evidence: "strong" },
  endurance: { text: "Higher reps with shorter rest improve muscular endurance. You'll still build some muscle and strength.", evidence: "moderate" },
};

/** Which training style a set of goals calls for. */
export function styleFor(primary, secondary = []) {
  if (primary === "strength") return "strength";
  if (primary === "muscular_endurance") return "endurance";
  // Fat loss, recomposition, definition, general fitness: train like you're
  // building muscle. Lifting heavy enough to grow is what preserves muscle in a
  // calorie deficit — there is no special "toning" rep range.
  return "hypertrophy";
}

// Isolation patterns that respond well to higher reps and are awkward to
// train heavy.
const HIGH_REP = new Set(["lat_raise", "rear_delt", "calf", "hip_abd"]);
const CORE = new Set(["core_anti_ext", "core_rot", "core_flex"]);

/**
 * A prescription for one slot.
 * @returns {{sets:number, repLow:number, repHigh:number, rir:number, rest:number, unit:"reps"|"sec"}}
 */
export function prescriptionFor({ pattern, role, load, style, experience }) {
  if (pattern === "mobility") return { sets: 2, repLow: 30, repHigh: 30, rir: 0, rest: 15, unit: "sec" };
  if (pattern === "carry") return { sets: 3, repLow: 30, repHigh: 45, rir: 2, rest: 75, unit: "sec" };
  if (load === "time") return { sets: 3, repLow: 20, repHigh: 45, rir: 2, rest: 45, unit: "sec" };
  if (CORE.has(pattern)) return { sets: 2, repLow: 8, repHigh: 15, rir: 2, rest: 45, unit: "reps" };

  const s = STYLES[style] || STYLES.hypertrophy;
  let [sets, repLow, repHigh, rir, rest] = s[role] || s.accessory;

  if (HIGH_REP.has(pattern)) { repLow = Math.max(repLow, 10); repHigh = Math.max(repHigh, 20); }

  // New and returning lifters: keep a bit further from failure while
  // technique settles, and avoid very low-rep sets on day one.
  if (experience === "new" || experience === "returning") {
    rir = Math.max(rir, 2);
    if (repLow < 5) { repLow = 5; repHigh = Math.max(repHigh, 8); }
    if (role === "main") sets = Math.min(sets, 3);
  }
  return { sets, repLow, repHigh, rir, rest, unit: "reps" };
}

/**
 * Weekly hard sets per muscle (direct sets count 1, indirect 0.5).
 * More volume builds more muscle with diminishing returns (strong evidence);
 * ~10+ sets/week is a common productive target. Beginners grow on less.
 */
export const VOLUME_TARGETS = {
  new: [6, 10],
  returning: [8, 12],
  novice: [8, 12],
  intermediate: [10, 16],
  advanced: [12, 20],
};

export function volumeTargetFor(experience, primary) {
  let [lo, hi] = VOLUME_TARGETS[experience] || VOLUME_TARGETS.novice;
  // When lifting supports another goal (cardio, mobility, health) the low end
  // is plenty.
  if (["endurance", "mobility", "general"].includes(primary)) { lo = Math.max(4, lo - 2); hi = lo + 4; }
  return { low: lo, high: hi };
}

/** Sessions to ease into: half volume, more reps in reserve. */
export const rampWeeksFor = (experience) => (experience === "new" || experience === "returning" ? 2 : 0);

/** Weekly cardio minutes we build toward. */
export function cardioTargetFor(primary, secondary = []) {
  const goals = [primary, ...secondary];
  if (primary === "endurance") return 180;
  if (goals.some((g) => ["endurance", "fat_loss", "recomp", "definition", "general"].includes(g))) return 150;
  return 90;
}

export const CARDIO_TARGET_NOTE = {
  text: "Health guidelines (U.S. Physical Activity Guidelines, WHO) recommend 150–300 minutes of moderate activity per week. Your lifting doesn't count toward this target here, but daily walking does.",
  evidence: "strong",
};

/**
 * Comfortable starting weekly cardio, from what the person can currently do.
 * Increases by ~10% a week (a coaching rule of thumb, not a tested law).
 */
export const CARDIO_ABILITY = {
  limited: { label: "Walking 10 minutes is tiring", sessionMin: 10 },
  walk: { label: "I can walk 20–30 minutes comfortably", sessionMin: 20 },
  jog: { label: "I can jog or cycle 20 minutes", sessionMin: 25 },
  fit: { label: "I can run or cycle 30+ minutes", sessionMin: 35 },
};
