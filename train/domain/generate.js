// Program generator: profile → split → session templates → slots → exercises.
// Pure and deterministic: the same profile always produces the same program.

import { EXERCISES, EX, hasEquipment } from "./exercises.js";
import { isWeighted } from "./loads.js";
import { EXPERIENCE, TRACKED_MUSCLES, MUSCLES, PATTERNS } from "./vocab.js";
import { styleFor, prescriptionFor, volumeTargetFor, rampWeeksFor, cardioTargetFor, CARDIO_ABILITY } from "./prescribe.js";

/* ---------------- Session templates ---------------- */
// Each slot is an intent (movement pattern + role). The exercise filling it
// can change without changing what the session is for.
const M = "main", S = "secondary", A = "accessory";
const slot = (pattern, role, prefer = []) => ({ pattern, role, prefer });

export const TEMPLATES = {
  fb_a: { name: "Full Body A", focus: "full", slots: [slot("squat", M), slot("h_push", S), slot("h_pull", S), slot("hinge", A, ["db_rdl", "rdl"]), slot("lat_raise", A), slot("core_anti_ext", A)] },
  fb_b: { name: "Full Body B", focus: "full", slots: [slot("hinge", M), slot("v_push", S), slot("v_pull", S), slot("lunge", A), slot("curl", A), slot("tri_ext", A), slot("core_rot", A)] },
  fb_c: { name: "Full Body C", focus: "full", slots: [slot("squat", S, ["leg_press", "goblet_squat"]), slot("h_push", S, ["incline_db_press", "incline_pushup"]), slot("h_pull", S), slot("knee_flex", A), slot("rear_delt", A), slot("calf", A), slot("core_flex", A)] },
  upper_a: { name: "Upper A", focus: "upper", slots: [slot("h_push", M), slot("h_pull", S), slot("v_push", S), slot("v_pull", S), slot("lat_raise", A), slot("curl", A), slot("tri_ext", A)] },
  lower_a: { name: "Lower A", focus: "lower", slots: [slot("squat", M), slot("hinge", S, ["rdl", "db_rdl"]), slot("lunge", A), slot("knee_flex", A), slot("calf", A), slot("core_anti_ext", A)] },
  upper_b: { name: "Upper B", focus: "upper", slots: [slot("v_pull", S), slot("h_push", S, ["incline_db_press"]), slot("h_pull", S), slot("lat_raise", A), slot("rear_delt", A), slot("tri_ext", A), slot("curl", A)] },
  lower_b: { name: "Lower B", focus: "lower", slots: [slot("hinge", M), slot("squat", S, ["leg_press", "goblet_squat"]), slot("hip_ext", A), slot("knee_ext", A), slot("calf", A), slot("core_flex", A)] },
  push: { name: "Push", focus: "push", slots: [slot("h_push", M), slot("v_push", S), slot("fly", A), slot("lat_raise", A), slot("tri_ext", A)] },
  pull: { name: "Pull", focus: "pull", slots: [slot("v_pull", M), slot("h_pull", S), slot("rear_delt", A), slot("curl", A), slot("core_flex", A)] },
  legs: { name: "Legs", focus: "lower", slots: [slot("squat", M), slot("hinge", S, ["rdl", "db_rdl"]), slot("lunge", A), slot("knee_ext", A), slot("knee_flex", A), slot("calf", A)] },
};

// Which sessions touch the legs hard (used to keep them apart in the week).
export const LOWER_FOCUS = new Set(["lower", "full"]);

export const SPLITS = {
  full_body: { label: "Full body", sessions: { 1: ["fb_a"], 2: ["fb_a", "fb_b"], 3: ["fb_a", "fb_b", "fb_c"] } },
  upper_lower: { label: "Upper / lower", sessions: { 4: ["upper_a", "lower_a", "upper_b", "lower_b"] } },
  ul_ppl: { label: "Upper / lower + push / pull / legs", sessions: { 5: ["upper_a", "lower_a", "push", "pull", "legs"] } },
  ppl: { label: "Push / pull / legs ×2", sessions: { 6: ["push", "pull", "legs", "push", "pull", "legs"] } },
};

/* ---------------- Lifting vs cardio days ---------------- */
const LIFT_CAP = { new: 3, returning: 3, novice: 4, intermediate: 5, advanced: 6 };

/**
 * How many of the available days should be lifting, and why.
 * Recovery and adherence matter more than squeezing in more sessions.
 */
export function liftDaysFor({ days, experience, primary }) {
  const reasons = [];
  let cap = LIFT_CAP[experience] ?? 4;
  if (primary === "endurance") { cap = Math.min(cap, days >= 5 ? 3 : 2); reasons.push("Cardio is your main goal, so lifting is kept to the 2–3 days that support it."); }
  else if (["general", "mobility", "fat_loss"].includes(primary)) cap = Math.min(cap, 4);
  const lift = Math.max(1, Math.min(days, cap));
  if (lift < days && primary !== "endurance") {
    reasons.push(experience === "new" || experience === "returning"
      ? `${lift} lifting days is plenty to start. The other days are for cardio or rest — you'll recover better and be more likely to stick with it.`
      : `${lift} lifting days covers your volume needs; extra days go to cardio or recovery.`);
  }
  return { lift, reasons };
}

/** Pick the split for a number of lifting days. */
export function recommendSplit({ liftDays, experience, minutes }) {
  const n = Math.max(1, Math.min(6, liftDays));
  if (n <= 3) {
    return { split: "full_body", templates: SPLITS.full_body.sessions[n], reason: n === 1
      ? "One session a week works best as a full-body session — it's the only way to train everything."
      : `With ${n} days, full-body sessions train each muscle ${n}× a week, which is simple and effective at every level.` };
  }
  if (n === 4) return { split: "upper_lower", templates: SPLITS.upper_lower.sessions[4], reason: "Four days suits an upper/lower split: each muscle is trained twice a week with shorter, focused sessions." };
  if (n === 5) return { split: "ul_ppl", templates: SPLITS.ul_ppl.sessions[5], reason: "Five days: an upper/lower pair plus push/pull/legs trains every muscle about twice a week." };
  return { split: "ppl", templates: SPLITS.ppl.sessions[6], reason: "Six days: push/pull/legs twice through trains each muscle twice a week while spreading the work out." };
}

/* ---------------- Exercise selection ---------------- */
const MAX_LEVEL = Object.fromEntries(Object.entries(EXPERIENCE).map(([k, v]) => [k, v.level]));

/**
 * Score and pick the best exercise for a slot. Deterministic: ties go to
 * library order.
 */
export function pickExercise(slotDef, ctx) {
  const { equipment, experience, limits = {}, disliked = [], liked = [], used = new Set(), style } = ctx;
  const maxLevel = MAX_LEVEL[experience] ?? 2;
  const avoid = Object.keys(limits).filter((j) => limits[j] === "avoid");
  const careful = Object.keys(limits).filter((j) => limits[j] === "careful");

  const base = EXERCISES.filter((e) => e.pattern === slotDef.pattern && hasEquipment(e, equipment) && !disliked.includes(e.id) && !e.joints.some((j) => avoid.includes(j)));
  let pool = base.filter((e) => e.level <= maxLevel);
  if (!pool.length) pool = base; // e.g. only an advanced option fits the equipment
  if (!pool.length) return null;

  const weightedAvailable = pool.some((e) => isWeighted(e.load));
  const score = (e) => {
    let s = 0;
    if (!used.has(e.id)) s += 20; // variety across the week, but not at any cost
    // Weighted options progress in small, measurable steps; prefer them when available.
    // (Pull-ups and dips are exempt for experienced lifters: they can be weighted with a belt.)
    const loadableBodyweight = e.level === 3 && maxLevel === 3;
    if (weightedAvailable && !isWeighted(e.load) && e.load !== "time" && !loadableBodyweight) s -= slotDef.role === "accessory" ? 6 : 18;
    if (liked.includes(e.id)) s += 40;
    if (slotDef.prefer?.includes(e.id)) s += 25 - slotDef.prefer.indexOf(e.id);
    if (e.joints.some((j) => careful.includes(j))) s -= 30;
    if (slotDef.role === "main") {
      if (e.main) s += 20;
      if (style === "strength" && e.load === "barbell") s += 15;
      if (e.level >= maxLevel - 1) s += 4; // use the experience they have
    } else if (slotDef.role === "secondary") {
      if (e.main) s += 8;
    } else {
      if (["machine", "cable"].includes(e.load)) s += 5; // stable, easy to push hard
      if (e.uni) s -= 3; // takes longer
    }
    if (e.level > maxLevel) s -= 40;
    return s;
  };
  let best = null, bestScore = -Infinity;
  for (const e of pool) { const sc = score(e); if (sc > bestScore) { best = e; bestScore = sc; } }
  return best;
}

// When nothing fits a pattern (usually missing equipment), a related pattern
// covers the same muscles.
export const PATTERN_FALLBACK = { v_pull: "h_pull", knee_ext: "lunge", fly: "h_push", knee_flex: "hinge", hip_abd: "hip_ext", rear_delt: "h_pull", hip_ext: "hinge" };

/* ---------------- Volume ---------------- */
/** Weekly hard sets per muscle: direct = 1, indirect = 0.5. */
export function weeklyVolume(sessions, { directOnly = false } = {}) {
  const v = Object.fromEntries(TRACKED_MUSCLES.map((m) => [m, 0]));
  for (const t of sessions) {
    for (const s of t.slots) {
      const ex = EX[s.exerciseId];
      if (!ex || ex.pattern === "mobility") continue;
      for (const m of ex.primary) if (m in v) v[m] += s.sets;
      if (!directOnly) for (const m of ex.secondary) if (m in v) v[m] += s.sets * 0.5;
    }
  }
  return v;
}

/* ---------------- Time ---------------- */
const SEC_PER_REP = 3.5;
const SETUP_PER_EXERCISE = 60;
const GENERAL_WARMUP = 300;

/** Estimated minutes for a session's slots, including warm-up. */
export function estimateMinutes(slots) {
  let t = slots.length ? GENERAL_WARMUP : 0;
  for (const s of slots) {
    const ex = EX[s.exerciseId];
    const mid = (s.repLow + s.repHigh) / 2;
    let work = s.unit === "sec" ? mid : Math.max(20, mid * SEC_PER_REP);
    if (ex?.uni) work *= 2;
    t += SETUP_PER_EXERCISE + s.sets * work + Math.max(0, s.sets - 1) * s.rest;
    if (s.role === "main") t += ex?.load === "barbell" ? 240 : 90; // ramp-up sets
  }
  return Math.round(t / 60);
}

/**
 * Trim a session to fit a time budget, cutting the least important work
 * first. Returns the new slots and plain-language notes on what changed.
 * Used both when building a program and for "I only have N minutes today".
 */
export function fitToTime(slotsIn, minutes) {
  let slots = slotsIn.map((s) => ({ ...s }));
  const notes = [];
  const over = () => estimateMinutes(slots) > minutes;
  const name = (s) => EX[s.exerciseId]?.name || s.pattern;

  const steps = [
    () => { // 1. shorter rest on accessories
      let changed = false;
      for (const s of slots) if (s.role === "accessory" && s.rest > 60) { s.rest = 60; changed = true; }
      if (changed) notes.push("Accessory rest shortened to 60 s.");
      return changed;
    },
    () => { // 2. accessories down to 2 sets (non-priority first)
      const s = [...slots].reverse().find((x) => x.role === "accessory" && x.sets > 2 && !x.priority) || [...slots].reverse().find((x) => x.role === "accessory" && x.sets > 2);
      if (!s) return false;
      s.sets = 2; notes.push(`${name(s)}: ${s.sets} sets.`); return true;
    },
    () => { // 3. drop the last non-priority accessory
      const i = slots.map((x, k) => [x, k]).reverse().find(([x]) => x.role === "accessory" && !x.priority)?.[1];
      if (i === undefined || slots.length <= 3) return false;
      notes.push(`Dropped ${name(slots[i])}.`); slots.splice(i, 1); return true;
    },
    () => { // 4. secondary rest to 90 s
      let changed = false;
      for (const s of slots) if (s.role === "secondary" && s.rest > 90) { s.rest = 90; changed = true; }
      if (changed) notes.push("Rest on secondary lifts shortened to 90 s.");
      return changed;
    },
    () => { // 5. secondary lifts to 2 sets
      const s = [...slots].reverse().find((x) => x.role === "secondary" && x.sets > 2);
      if (!s) return false;
      s.sets = 2; notes.push(`${name(s)}: 2 sets.`); return true;
    },
    () => { // 6. drop priority accessories too
      const i = slots.map((x, k) => [x, k]).reverse().find(([x]) => x.role === "accessory")?.[1];
      if (i === undefined || slots.length <= 3) return false;
      notes.push(`Dropped ${name(slots[i])}.`); slots.splice(i, 1); return true;
    },
    () => { // 7. main lift to 3 sets
      const s = slots.find((x) => x.role === "main" && x.sets > 3);
      if (!s) return false;
      s.sets = 3; notes.push(`${name(s)}: 3 sets.`); return true;
    },
    () => { // 8. drop the last secondary lift, keeping at least 2 exercises
      const i = slots.map((x, k) => [x, k]).reverse().find(([x]) => x.role !== "main")?.[1];
      if (i === undefined || slots.length <= 2) return false;
      notes.push(`Dropped ${name(slots[i])}.`); slots.splice(i, 1); return true;
    },
  ];
  for (const step of steps) {
    while (over() && step()) { /* keep applying this cut until it stops helping */ }
    if (!over()) break;
  }
  return { slots, notes, minutes: estimateMinutes(slots), fits: !over() };
}

/* ---------------- Priority muscles ---------------- */
const PRIORITY_PATTERN = {
  chest: "fly", side_delts: "lat_raise", rear_delts: "rear_delt", lats: "v_pull", upper_back: "h_pull",
  biceps: "curl", triceps: "tri_ext", quads: "knee_ext", hamstrings: "knee_flex", glutes: "hip_ext", calves: "calf", abs: "core_flex",
};
const PRIORITY_FALLBACK = { quads: "lunge", hamstrings: "hinge", glutes: "lunge", chest: "h_push" };

/* ---------------- Day placement ---------------- */
function combos(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [h, ...t] = arr;
  return [...combos(t, k - 1).map((c) => [h, ...c]), ...combos(t, k)];
}
const gapsOf = (days) => days.map((d, i) => ((days[(i + 1) % days.length] - d + 7) % 7) || 7);

/** Choose lifting weekdays (0 = Sun) from those available, spread as evenly as possible. */
export function spreadDays(available, n) {
  const sorted = [...new Set(available)].sort((a, b) => a - b);
  if (n >= sorted.length) return sorted;
  let best = null, bestKey = null;
  for (const c of combos(sorted, n)) {
    const g = gapsOf(c);
    const key = [Math.min(...g), -g.filter((x) => x === 1).length, -Math.max(...g)];
    if (!best || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) { best = c; bestKey = key; }
  }
  return best;
}

/** Rotate the session order so leg-heavy days land on non-consecutive days where possible. */
function orderSessions(templateIds, days) {
  if (templateIds.length !== days.length || days.length < 2) return templateIds;
  let best = templateIds, bestPen = Infinity;
  for (let r = 0; r < templateIds.length; r++) {
    const order = [...templateIds.slice(r), ...templateIds.slice(0, r)];
    let pen = 0;
    for (let i = 0; i < days.length; i++) {
      const j = (i + 1) % days.length;
      const adjacent = ((days[j] - days[i] + 7) % 7) === 1;
      const a = TEMPLATES[order[i]].focus, b = TEMPLATES[order[j]].focus;
      if (adjacent && a === "lower" && b === "lower") pen += 3;
      if (adjacent && a === "full" && b === "full") pen += 1;
    }
    if (pen < bestPen) { best = order; bestPen = pen; }
  }
  return best;
}

/* ---------------- Cardio ---------------- */
const LOW_IMPACT = ["walking", "cycling", "elliptical", "rowing"];

function cardioPlan(profile, cardioDows, liftDows) {
  const { primary, secondary = [], cardioAbility = "walk", cardioModes = [], limits = {} } = profile;
  const target = cardioTargetFor(primary, secondary);
  const per = CARDIO_ABILITY[cardioAbility]?.sessionMin ?? 20;
  const sore = limits.knee || limits.hip;
  let modes = cardioModes.length ? [...cardioModes] : ["walking"];
  if (sore === "avoid") modes = modes.filter((m) => LOW_IMPACT.includes(m));
  if (!modes.length) modes = ["cycling"];
  const sessions = cardioDows.length;
  const finishers = sessions === 0 ? liftDows.length : 0;
  const start = sessions ? sessions * per : finishers * Math.min(15, per);
  return { targetMinutes: target, startMinutes: Math.min(start, target), modes, sessionMinutes: per, finishers: finishers > 0 };
}

/* ---------------- Generate ---------------- */
/**
 * @param profile {
 *   experience, primary, secondary[], priority[] (muscles), days[] (0–6),
 *   minutes, equipment[], limits {joint: "avoid"|"careful"}, disliked[], liked[],
 *   cardioAbility, cardioModes[], conservative (bool, from health screen)
 * }
 */
export function generateProgram(profile, { weeks = 6, startDate = null } = {}) {
  const { experience = "new", primary = "general", secondary = [], priority = [], days = [1, 3, 5], minutes = 60, equipment = [], limits = {}, disliked = [], liked = [] } = profile;
  const reasons = [];
  const warnings = [];
  const style = styleFor(primary, secondary);

  const { lift, reasons: liftReasons } = liftDaysFor({ days: days.length, experience, primary });
  reasons.push(...liftReasons);
  const split = recommendSplit({ liftDays: lift, experience, minutes });
  reasons.unshift(split.reason);

  const liftDows = spreadDays(days, lift);
  const ordered = orderSessions(split.templates, liftDows);
  const cardioDows = days.filter((d) => !liftDows.includes(d)).sort((a, b) => a - b);

  // Fill slots with exercises.
  const used = new Set();
  const ctx = { equipment, experience, limits, disliked, liked, used, style };
  let uid = 0;
  const sessions = ordered.map((tid, i) => {
    const t = TEMPLATES[tid];
    const slots = [];
    for (const sd0 of t.slots) {
      let sd = sd0;
      let ex = pickExercise(sd, ctx);
      if (!ex && PATTERN_FALLBACK[sd.pattern]) {
        sd = { ...sd0, pattern: PATTERN_FALLBACK[sd0.pattern], prefer: [] };
        ex = pickExercise(sd, ctx);
        if (ex) warnings.push(`${t.name}: no ${PATTERNS[sd0.pattern].label.toLowerCase()} option fits your equipment, so ${ex.name} covers it.`);
      }
      if (!ex) { warnings.push(`${t.name}: no ${PATTERNS[sd0.pattern].label.toLowerCase()} exercise fits your equipment, so it was left out.`); continue; }
      used.add(ex.id);
      const rx = prescriptionFor({ pattern: sd.pattern, role: sd.role, load: ex.load, style, experience });
      slots.push({ id: `s${++uid}`, pattern: sd.pattern, role: sd.role, exerciseId: ex.id, ...rx });
    }
    return { id: `t${i + 1}`, templateKey: tid, name: t.name, focus: t.focus, slots };
  });
  // Name repeats distinctly (PPL ×2 → Push A / Push B).
  const total = {}, seen = {};
  for (const s of sessions) total[s.name] = (total[s.name] || 0) + 1;
  for (const s of sessions) {
    if (total[s.name] > 1) { const k = s.name; seen[k] = (seen[k] || 0) + 1; s.name = `${k} ${"ABC"[seen[k] - 1]}`; }
  }

  // Priority muscles: an extra set where they're trained directly, plus a
  // dedicated accessory in the session with the most room.
  const targets = volumeTargetFor(experience, primary);
  for (const m of priority.slice(0, 3)) {
    // One extra set on up to two non-main lifts that train it directly.
    let bumped = 0;
    for (const s of sessions) for (const sl of s.slots) {
      if (bumped < 2 && sl.role !== "main" && EX[sl.exerciseId].primary.includes(m) && sl.sets < 4) { sl.sets += 1; sl.priority = true; bumped++; }
    }
    // A dedicated exercise if direct work is still short of the upper target.
    if (weeklyVolume(sessions, { directOnly: true })[m] < targets.high) {
      for (const pat of [PRIORITY_PATTERN[m], PRIORITY_FALLBACK[m]].filter(Boolean)) {
        const region = PATTERNS[pat].region;
        const fits = sessions.filter((x) => x.focus === "full" || (region === "lower" ? x.focus === "lower" : region === "upper" ? ["upper", "push", "pull"].includes(x.focus) : true));
        const host = [...(fits.length ? fits : sessions)].sort((a, b) => estimateMinutes(a.slots) - estimateMinutes(b.slots))[0];
        const ex = pickExercise({ pattern: pat, role: "accessory", prefer: [] }, ctx);
        if (!ex || !ex.primary.includes(m)) continue;
        used.add(ex.id);
        const rx = prescriptionFor({ pattern: pat, role: "accessory", load: ex.load, style, experience });
        host.slots.push({ id: `s${++uid}`, pattern: pat, role: "accessory", exerciseId: ex.id, priority: true, ...rx });
        break;
      }
    }
    reasons.push(`${MUSCLES[m]} is a priority: extra sets were added where it's trained directly.`);
  }

  // Mobility goal: a short cool-down block at the end of each session.
  if (primary === "mobility" || secondary.includes("mobility")) {
    const drills = ["worlds_greatest_stretch", "hip_flexor_stretch", "open_book", "hamstring_stretch", "doorway_pec_stretch", "calf_stretch", "ninety_ninety"];
    sessions.forEach((s, i) => {
      for (const id of [drills[(i * 2) % drills.length], drills[(i * 2 + 1) % drills.length]]) {
        s.slots.push({ id: `s${++uid}`, pattern: "mobility", role: "accessory", exerciseId: id, priority: true, ...prescriptionFor({ pattern: "mobility" }) });
      }
    });
    reasons.push("Mobility drills are added as a cool-down after each session.");
  }

  // Fit each session into the time available.
  for (const s of sessions) {
    const fit = fitToTime(s.slots, minutes);
    s.slots = fit.slots;
    s.estMinutes = fit.minutes;
    if (fit.notes.length) s.trimNotes = fit.notes;
    if (!fit.fits) warnings.push(`${s.name} is estimated at ${fit.minutes} min, over your ${minutes}-minute target. Shorter rest or supersets can help.`);
  }

  // Conservative start after the health screen.
  if (profile.conservative) {
    for (const s of sessions) for (const sl of s.slots) sl.rir = Math.max(sl.rir, 3);
    reasons.push("Based on your health answers, every set stops with at least 3 reps in reserve to start.");
  }

  const volume = weeklyVolume(sessions);
  const direct = weeklyVolume(sessions, { directOnly: true });
  for (const m of TRACKED_MUSCLES) {
    if (direct[m] > targets.high + 4) warnings.push(`${MUSCLES[m]} gets ${direct[m]} direct sets a week — more than most people need. Consider trimming a set or two.`);
  }
  const lowMuscles = TRACKED_MUSCLES.filter((m) => volume[m] < targets.low * 0.5 && !["calves", "abs", "rear_delts"].includes(m));
  if (lowMuscles.length && lift >= 2) reasons.push(`Lower volume for ${lowMuscles.map((m) => MUSCLES[m].toLowerCase()).join(", ")} this block to fit your time — they still get indirect work.`);

  const cardio = cardioPlan(profile, cardioDows, liftDows);
  const weekPlan = [
    ...liftDows.map((dow, i) => ({ dow, kind: "lift", templateId: sessions[i].id, finisher: cardio.finishers ? Math.min(15, cardio.sessionMinutes) : 0 })),
    ...cardioDows.map((dow) => ({ dow, kind: "cardio" })),
  ].sort((a, b) => a.dow - b.dow);

  return {
    version: 1,
    weeks,
    startDate,
    split: split.split,
    style,
    experience,
    primary,
    secondary,
    priority,
    minutes,
    rampWeeks: rampWeeksFor(experience),
    templates: sessions,
    weekPlan,
    cardio,
    volume,
    volumeTargets: targets,
    reasons,
    warnings,
  };
}
