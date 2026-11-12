import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProgram } from "../domain/generate.js";
import { buildCalendar } from "../domain/schedule.js";
import { startWorkout, exerciseHistory, setsByMuscle, personalRecords, strengthSeries, cardioMinutes, workoutSummary } from "../domain/history.js";
import { GYM_EQUIPMENT } from "../domain/vocab.js";

function person(experience = "novice") {
  const profile = { experience, primary: "muscle", days: [1, 3, 5], minutes: 60, equipment: GYM_EQUIPMENT };
  const program = generateProgram(profile);
  return { profile, program, sessions: buildCalendar(program, "2026-11-16"), logs: [], cardioLogs: [], loads: {} };
}
function finish(log, fill) {
  log.exercises.forEach((e, i) => e.sets.forEach((s) => Object.assign(s, fill(e, i), { done: true })));
  return { ...log, status: "done", endedAt: log.startedAt + 45 * 60000 };
}

test("first workout: targets calibrate, then progression uses what was logged", () => {
  const p = person();
  const s1 = p.sessions[0];
  const w1 = startWorkout(p, { session: s1, today: s1.date, id: "w1", now: 0 });
  assert.ok(w1.exercises.length > 0);
  assert.ok(w1.exercises.every((e) => e.target.action === "calibrate"));
  p.logs.push(finish(w1, (e) => ({ weight: 50, reps: e.rx.repHigh, rir: e.rx.rir })));

  const nextSame = p.sessions.find((s) => s.templateId === s1.templateId && s.date > s1.date);
  const w2 = startWorkout(p, { session: nextSame, today: nextSame.date, id: "w2" });
  const main = w2.exercises[0];
  assert.equal(main.target.action, "increase");
  assert.ok(main.sets[0].weight > 50);
});

test("ease-in weeks cap sets at 2 for new lifters", () => {
  const p = person("new");
  const w = startWorkout(p, { session: p.sessions[0], today: p.sessions[0].date, id: "w" });
  for (const e of w.exercises) if (e.rx.unit === "reps") assert.ok(e.sets.length <= 2);
  const later = p.sessions.find((s) => s.week === 3 && s.kind === "lift");
  const w3 = startWorkout(p, { session: later, today: later.date, id: "w3" });
  assert.ok(w3.exercises.some((e) => e.sets.length === 3));
});

test("history, volume, PRs and strength series", () => {
  const p = person();
  const s = p.sessions[0];
  const log = finish(startWorkout(p, { session: s, today: s.date, id: "a" }), () => ({ weight: 100, reps: 10, rir: 2 }));
  p.logs.push(log);
  p.logs.push({ ...startWorkout(p, { session: s, today: s.date, id: "b" }), status: "active" }); // in-progress: ignored
  const exId = log.exercises[0].exerciseId;
  assert.equal(exerciseHistory(p, exId).length, 1);
  const v = setsByMuscle(p, s.date, s.date);
  assert.ok(Object.values(v).some((x) => x > 0));
  assert.ok(personalRecords(p)[exId].bestE1rm > 100);
  assert.equal(strengthSeries(p, exId).length, 1);
  assert.equal(workoutSummary(log).minutes, 45);
});

test("cardio minutes combine own logs and Bite Club without double counting", () => {
  const p = person();
  p.cardioLogs = [
    { date: "2026-11-16", minutes: 30, source: "manual" },
    { date: "2026-11-17", minutes: 20, source: "bite" },
  ];
  const bite = (d) => (d === "2026-11-17" ? [{ minutes: 20 }] : []);
  assert.deepEqual(cardioMinutes(p, "2026-11-16", "2026-11-22", bite), { own: 30, bite: 20, total: 50 });
});
