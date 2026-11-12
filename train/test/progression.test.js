import { test } from "node:test";
import assert from "node:assert/strict";
import { nextTarget, adjustNextSet, detectPRs } from "../domain/progression.js";

const rx = { sets: 3, repLow: 8, repHigh: 12, rir: 2, unit: "reps" };
const S = (weight, reps, rir) => ({ weight, reps, rir, done: true });
const entry = (date, sets, extra = {}) => ({ date, sets, ...extra });
const today = "2026-11-12";

test("first time → calibrate, no made-up weight", () => {
  const r = nextTarget("db_bench", rx, [], { today });
  assert.equal(r.action, "calibrate");
  assert.equal(r.weight, null);
});

test("all sets at the top of the range → add the smallest increment", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 12, 2), S(135, 12, 2), S(135, 12, 1)])], { today });
  assert.equal(r.action, "increase");
  assert.equal(r.weight, 140);
  assert.equal(r.reps, 8);
});

test("in range but not at the top → same weight, add a rep", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 10, 2), S(135, 9, 2), S(135, 9, 2)])], { today });
  assert.equal(r.action, "reps");
  assert.equal(r.weight, 135);
  assert.equal(r.reps, 10);
});

test("grinding far past the planned effort → hold even at the top", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 12, 0), S(135, 12, 0), S(135, 12, 0)])], { today });
  assert.notEqual(r.action, "increase");
});

test("missing RIR is assumed OK, and said so", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 12), S(135, 12), S(135, 12)])], { today });
  assert.equal(r.action, "increase");
  assert.match(r.why, /no effort rating/);
});

test("fewer sets than prescribed doesn't trigger an increase", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 12, 2), S(135, 12, 2)])], { today });
  assert.notEqual(r.action, "increase");
});

test("big relative jump → extend the rep range first", () => {
  const r = nextTarget("db_lateral_raise", { ...rx, repLow: 12, repHigh: 15 }, [entry("2026-11-10", [S(10, 15, 2), S(10, 15, 2), S(10, 15, 2)])], { today });
  assert.equal(r.action, "reps");
  assert.equal(r.rule, "big-jump");
  assert.equal(r.reps, 17);
  const r2 = nextTarget("db_lateral_raise", { ...rx, repLow: 12, repHigh: 15 }, [entry("2026-11-10", [S(10, 17, 2), S(10, 17, 2), S(10, 17, 2)])], { today });
  assert.equal(r2.action, "increase");
  assert.equal(r2.weight, 15);
});

test("one bad session → hold; two in a row → reduce ~10%", () => {
  const bad = [S(200, 6, 0), S(200, 5, 0), S(200, 5, 0)];
  const once = nextTarget("back_squat", rx, [entry("2026-11-10", bad)], { today });
  assert.equal(once.action, "hold");
  const twice = nextTarget("back_squat", rx, [entry("2026-11-10", bad), entry("2026-11-07", bad)], { today });
  assert.equal(twice.action, "reduce");
  assert.equal(twice.weight, 180);
});

test("pain flag blocks progression", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [S(135, 12, 2), S(135, 12, 2), S(135, 12, 2)], { pain: true })], { today });
  assert.equal(r.action, "pain");
  assert.equal(r.weight, 135);
});

test("long breaks ease back in", () => {
  const sets = [S(200, 10, 2), S(200, 10, 2), S(200, 10, 2)];
  assert.equal(nextTarget("back_squat", rx, [entry("2026-10-25", sets)], { today }).weight, 180);
  assert.equal(nextTarget("back_squat", rx, [entry("2026-10-01", sets)], { today }).weight, 160);
});

test("home dumbbells: increments follow what you own", () => {
  const r = nextTarget("db_bench", rx, [entry("2026-11-10", [S(20, 14, 2), S(20, 14, 2), S(20, 14, 2)])], { today, loads: { dumbbells: [10, 20, 25, 30] } });
  assert.equal(r.action, "increase");
  assert.equal(r.weight, 25);
  const top = nextTarget("db_bench", rx, [entry("2026-11-10", [S(30, 14, 2), S(30, 14, 2), S(30, 14, 2)])], { today, loads: { dumbbells: [10, 20, 25, 30] } });
  assert.equal(top.rule, "max-load");
});

test("bodyweight → harder variation once the top is reached", () => {
  const r = nextTarget("incline_pushup", rx, [entry("2026-11-10", [S(0, 12, 2), S(0, 13, 2), S(0, 12, 2)])], { today, equipment: [] });
  assert.equal(r.action, "level_up");
  assert.equal(r.exerciseId, "pushup");
});

test("warm-up sets are ignored", () => {
  const r = nextTarget("bench_press", rx, [entry("2026-11-10", [{ weight: 45, reps: 12, done: true, warmup: true }])], { today });
  assert.equal(r.action, "calibrate");
});

test("in-session: clearly too easy → heavier, capped at ~10%", () => {
  const a = adjustNextSet({ weight: 100, reps: 12, rir: 5 }, rx, "barbell");
  assert.ok(a && a.weight > 100 && a.weight <= 110);
  assert.equal(adjustNextSet({ weight: 100, reps: 10, rir: 2 }, rx, "barbell"), null);
  const h = adjustNextSet({ weight: 100, reps: 5, rir: 0 }, rx, "barbell");
  assert.ok(h && h.weight < 100 && h.weight >= 85);
});

test("PR detection", () => {
  const hist = [entry("2026-11-10", [S(135, 8), S(135, 8)])];
  assert.equal(detectPRs(S(140, 5), hist, "bench_press")[0].kind, "weight");
  assert.equal(detectPRs(S(135, 10), hist, "bench_press")[0].kind, "e1rm");
  assert.deepEqual(detectPRs(S(135, 8), [], "bench_press"), []);
});
