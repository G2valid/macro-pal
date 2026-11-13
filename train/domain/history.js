// Queries and transitions over one person's training record.
// Pure functions: they take the person object and return values or new objects.
//
// person = { program, sessions[], logs[], cardioLogs[], loads, profile, ... }
// log    = { id, sessionId, templateId, name, date, startedAt, endedAt, status,
//            exercises: [{ id, slotId, exerciseId, rx, target, sets:[{weight,reps,rir,done}], pain, note }] }

import { EX } from "./exercises.js";
import { TRACKED_MUSCLES } from "./vocab.js";
import { nextTarget, workingSets } from "./progression.js";
import { e1rm, isWeighted } from "./loads.js";
import { addDays } from "./schedule.js";

export const doneLogs = (person) => (person.logs || []).filter((l) => l.status === "done");

/** Past entries for an exercise, newest first: [{date, sets, pain}] */
export function exerciseHistory(person, exerciseId, { before = null } = {}) {
  const out = [];
  for (const l of doneLogs(person)) {
    if (before && l.date > before) continue;
    for (const e of l.exercises) if (e.exerciseId === exerciseId) out.push({ date: l.date, sets: e.sets, pain: !!e.pain, logId: l.id });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || 0);
}

export const templateOf = (person, id) => person.program?.templates.find((t) => t.id === id) || null;

const rxOf = (slot) => ({ sets: slot.sets, repLow: slot.repLow, repHigh: slot.repHigh, rir: slot.rir, rest: slot.rest, unit: slot.unit || "reps" });

/** Build a fresh exercise entry for a slot, with today's target filled in. */
export function exerciseEntry(person, slot, { today, easeIn = false, id }) {
  const rx = rxOf(slot);
  if (easeIn && rx.unit === "reps") { rx.sets = Math.min(rx.sets, 2); rx.rir = Math.max(rx.rir, 3); }
  const history = exerciseHistory(person, slot.exerciseId);
  const target = nextTarget(slot.exerciseId, rx, history, { today, loads: person.loads, equipment: person.profile?.equipment });
  const weighted = isWeighted(EX[slot.exerciseId]?.load);
  const sets = Array.from({ length: rx.sets }, () => ({ weight: weighted ? target.weight ?? null : 0, reps: null, target: target.reps, rir: null, done: false }));
  return { id, slotId: slot.id, exerciseId: slot.exerciseId, role: slot.role, rx, target, sets, pain: false, note: "" };
}

/** Start a workout for a scheduled lifting session (or a template on its own). */
export function startWorkout(person, { session = null, templateId, today, now = Date.now(), id }) {
  const t = templateOf(person, session?.templateId || templateId);
  if (!t) return null;
  const week = session?.week || 1;
  const easeIn = (person.program?.rampWeeks || 0) >= week;
  let n = 0;
  return {
    id, sessionId: session?.id || null, templateId: t.id, name: t.name, date: today, startedAt: now, endedAt: null, status: "active",
    easeIn,
    exercises: t.slots.map((slot) => exerciseEntry(person, slot, { today, easeIn, id: `${id}-${++n}` })),
    notes: "",
  };
}

/** Summary of a finished (or in-progress) workout. */
export function workoutSummary(log) {
  let sets = 0, volume = 0;
  for (const e of log.exercises) for (const s of workingSets(e)) { sets++; volume += (s.weight || 0) * s.reps; }
  const minutes = log.endedAt ? Math.round((log.endedAt - log.startedAt) / 60000) : null;
  return { sets, volume: Math.round(volume), minutes, exercises: log.exercises.filter((e) => workingSets(e).length).length };
}

/** Hard sets per muscle from completed workouts between two dates (inclusive). */
export function setsByMuscle(person, from, to) {
  const v = Object.fromEntries(TRACKED_MUSCLES.map((m) => [m, 0]));
  for (const l of doneLogs(person)) {
    if (l.date < from || l.date > to) continue;
    for (const e of l.exercises) {
      const ex = EX[e.exerciseId];
      if (!ex || ex.pattern === "mobility") continue;
      const n = workingSets(e).length;
      for (const m of ex.primary) if (m in v) v[m] += n;
      for (const m of ex.secondary) if (m in v) v[m] += n * 0.5;
    }
  }
  return v;
}

/** Best performances per exercise. */
export function personalRecords(person) {
  const out = {};
  for (const l of doneLogs(person)) {
    for (const e of l.exercises) {
      for (const s of workingSets(e)) {
        const r = (out[e.exerciseId] ||= { exerciseId: e.exerciseId, bestE1rm: 0, bestE1rmSet: null, heaviest: 0, heaviestDate: null, mostReps: 0, date: null });
        const est = e1rm(s.weight, s.reps) || 0;
        if (est > r.bestE1rm) { r.bestE1rm = est; r.bestE1rmSet = { weight: s.weight, reps: s.reps, date: l.date }; }
        if ((s.weight || 0) > r.heaviest) { r.heaviest = s.weight; r.heaviestDate = l.date; }
        if (s.reps > r.mostReps) r.mostReps = s.reps;
      }
    }
  }
  return out;
}

/** Best estimated max per workout date for one exercise, oldest first. */
export function strengthSeries(person, exerciseId) {
  const byDate = new Map();
  for (const h of exerciseHistory(person, exerciseId)) {
    for (const s of workingSets(h)) {
      const est = e1rm(s.weight, s.reps);
      if (!est) continue;
      const cur = byDate.get(h.date);
      if (!cur || est > cur.value) byDate.set(h.date, { date: h.date, value: est, weight: s.weight, reps: s.reps });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Most reps per workout date (for bodyweight exercises), oldest first. */
export function repsSeries(person, exerciseId) {
  const byDate = new Map();
  for (const h of exerciseHistory(person, exerciseId)) {
    const best = Math.max(0, ...workingSets(h).map((s) => s.reps));
    if (best) byDate.set(h.date, { date: h.date, value: best, reps: best });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Cardio minutes in [from, to]. Bite Club's workout log is the single record
 * (passed in as a function so this stays pure); trainer cardio only counts
 * here until it has been copied into that log, so nothing is counted twice.
 */
export function cardioMinutes(person, from, to, biteCardioFor = () => []) {
  let own = 0, bite = 0;
  for (const c of person.cardioLogs || []) if (c.date >= from && c.date <= to && c.source !== "bite" && !c.biteSynced) own += c.minutes || 0;
  for (let d = from; d <= to; d = addDays(d, 1)) bite += biteCardioFor(d).reduce((t, w) => t + (w.minutes || 0), 0);
  return { own, bite, total: own + bite };
}

/** Distinct exercises the person has logged, most recent first. */
export function loggedExercises(person) {
  const seen = new Map();
  for (const l of [...doneLogs(person)].sort((a, b) => b.date.localeCompare(a.date))) {
    for (const e of l.exercises) if (workingSets(e).length && !seen.has(e.exerciseId)) seen.set(e.exerciseId, l.date);
  }
  return [...seen.keys()];
}
