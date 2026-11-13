import { test } from "node:test";
import assert from "node:assert/strict";
import { liftToBite, cardioToBite, pendingSync, estimateKcal } from "../domain/sync.js";

const log = { id: "abc", name: "Upper A", date: "2026-11-12", status: "done", startedAt: 0, endedAt: 50 * 60000,
  exercises: [{ exerciseId: "bench_press", sets: [{ weight: 135, reps: 10, done: true }, { weight: 135, reps: 8, done: true }, { weight: 135, reps: 8, done: false }] }] };

test("a lifting workout becomes a Bite Club strength entry with a stable id", () => {
  const w = liftToBite(log, 80);
  assert.equal(w.id, "tc-abc");
  assert.equal(w.type, "strength");
  assert.equal(w.source, "trainer");
  assert.equal(w.minutes, 50);
  assert.equal(w.kcal, Math.round(3.5 * 80 * 50 / 60));
  assert.match(w.notes, /2 sets · 2,430 lb/);
});

test("no weight → no calorie guess", () => {
  assert.equal(liftToBite(log, null).kcal, 0);
  assert.equal(estimateKcal(5, 30, 0), 0);
});

test("cardio maps to Bite Club types", () => {
  assert.equal(cardioToBite({ id: "c1", mode: "treadmill", minutes: 30 }, 70).type, "walking");
  assert.equal(cardioToBite({ id: "c2", mode: "stairs", minutes: 20 }, 70).type, "other");
  assert.equal(cardioToBite({ id: "c3", mode: "cycling", minutes: 40 }, 70, "Cycling / Peloton").title, "Cycling / Peloton");
});

test("only unsynced, trainer-owned records are pending", () => {
  const p = {
    logs: [log, { ...log, id: "x", biteSynced: true }, { ...log, id: "y", status: "active" }],
    cardioLogs: [{ id: "c1", source: "manual" }, { id: "c2", source: "bite" }, { id: "c3", source: "manual", biteSynced: true }],
  };
  const s = pendingSync(p);
  assert.deepEqual(s.logs.map((l) => l.id), ["abc"]);
  assert.deepEqual(s.cardio.map((c) => c.id), ["c1"]);
});
