import { test } from "node:test";
import assert from "node:assert/strict";
import { roundLoad, stepLoad, e1rm, loadFor, platesPerSide, warmupSets } from "../domain/loads.js";

test("barbell rounds to 5 lb steps and never below the bar", () => {
  assert.equal(roundLoad(137, "barbell"), 135);
  assert.equal(roundLoad(138, "barbell"), 140);
  assert.equal(roundLoad(138, "barbell", null, "down"), 135);
  assert.equal(roundLoad(20, "barbell"), 45);
});

test("dumbbells use the owned list when given", () => {
  const home = { dumbbells: [10, 20, 30] };
  assert.equal(roundLoad(24, "dumbbell", home), 20);
  assert.equal(roundLoad(26, "dumbbell", home), 30);
  assert.equal(stepLoad(20, "dumbbell", home, 1), 30);
  assert.equal(stepLoad(30, "dumbbell", home, 1), 30); // nothing heavier
  assert.equal(stepLoad(10, "dumbbell", home, -1), 10);
});

test("step up/down for gym equipment", () => {
  assert.equal(stepLoad(135, "barbell"), 140);
  assert.equal(stepLoad(25, "dumbbell"), 30);
  assert.equal(stepLoad(100, "machine"), 110);
  assert.equal(stepLoad(26, "kettlebell"), 35);
  assert.equal(stepLoad(45, "barbell", null, -1), 45);
});

test("estimated max (Epley) with reps in reserve", () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 10) - 133.33) < 0.01);
  assert.equal(e1rm(100, 8, 2), e1rm(100, 10, 0));
  assert.equal(e1rm(100, 15), null); // too many reps to be trustworthy
  assert.ok(Math.abs(loadFor(e1rm(200, 5), 5) - 200) < 1e-9);
});

test("plates per side", () => {
  assert.deepEqual(platesPerSide(135).plates, [45]);
  assert.deepEqual(platesPerSide(185).plates, [45, 25]);
  assert.deepEqual(platesPerSide(140).plates, [45, 2.5]);
  assert.deepEqual(platesPerSide(45).plates, []);
});

test("warm-up ramps below the working weight", () => {
  const w = warmupSets(225, "barbell");
  assert.equal(w[0].weight, 45);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].weight > w[i - 1].weight && w[i].weight < 225);
  assert.deepEqual(warmupSets(45, "barbell"), []);
  assert.deepEqual(warmupSets(40, "dumbbell"), [{ weight: 20, reps: 8 }]);
  assert.deepEqual(warmupSets(0, "bodyweight"), []);
});
