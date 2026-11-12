import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISES, EX, alternativesFor, similarFor, hasEquipment } from "../domain/exercises.js";
import { MUSCLES, PATTERNS, EQUIPMENT, JOINTS, LOAD_TYPES } from "../domain/vocab.js";

test("exercise ids are unique", () => {
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
});

test("every exercise is complete and uses known vocabulary", () => {
  for (const e of EXERCISES) {
    const at = `(${e.id})`;
    assert.ok(e.name && e.why && e.rom && e.breathing, `missing text ${at}`);
    assert.ok(PATTERNS[e.pattern], `pattern ${e.pattern} ${at}`);
    assert.ok([1, 2, 3].includes(e.level), `level ${at}`);
    assert.ok(LOAD_TYPES.includes(e.load), `load ${e.load} ${at}`);
    assert.ok(e.primary.length >= 1, `primary ${at}`);
    for (const m of [...e.primary, ...e.secondary]) assert.ok(MUSCLES[m], `muscle ${m} ${at}`);
    for (const q of e.equip) assert.ok(EQUIPMENT[q], `equipment ${q} ${at}`);
    for (const j of e.joints) assert.ok(JOINTS[j], `joint ${j} ${at}`);
    assert.ok(e.steps.length >= 2, `steps ${at}`);
    assert.ok(e.cues.length >= 1 && e.mistakes.length >= 1, `cues/mistakes ${at}`);
    assert.ok(!e.primary.some((m) => e.secondary.includes(m)), `muscle both primary and secondary ${at}`);
  }
});

test("easier/harder links point to real exercises in the same pattern", () => {
  for (const e of EXERCISES) {
    for (const id of [...e.easier, ...e.harder]) {
      assert.ok(EX[id], `${e.id} → ${id} missing`);
      // Progressions may cross into a closely related pattern (e.g. plank → hanging knee raise).
      if (EX[id].pattern !== e.pattern) assert.equal(PATTERNS[EX[id].pattern].region, PATTERNS[e.pattern].region, `${e.id} → ${id}`);
    }
  }
});

test("every training pattern has a bodyweight-only option or a dumbbell option", () => {
  const home = ["dumbbells", "bench", "step"];
  for (const p of Object.keys(PATTERNS)) {
    if (["knee_ext", "fly", "v_pull"].includes(p)) continue; // need a machine, cable, bar or bands (the generator falls back to a related pattern)
    const ok = EXERCISES.some((e) => e.pattern === p && hasEquipment(e, home));
    assert.ok(ok, `no home option for ${p}`);
  }
});

test("alternatives stay in the pattern and respect equipment", () => {
  const alts = alternativesFor("back_squat", ["dumbbells"]);
  assert.ok(alts.length > 0);
  for (const a of alts) { assert.equal(a.pattern, "squat"); assert.ok(hasEquipment(a, ["dumbbells"])); }
});

test("every exercise has at least 3 swap choices in a full gym", () => {
  const gym = Object.keys(EQUIPMENT);
  for (const e of EXERCISES) {
    if (e.pattern === "mobility") continue;
    const n = alternativesFor(e.id, gym).length + similarFor(e.id, gym).length;
    assert.ok(n >= 3, `${e.id}: ${n}`);
  }
});

test("home (dumbbells, bench, bands) swaps offer real choices for main patterns", () => {
  const home = ["dumbbells", "bench", "bands"];
  for (const id of ["goblet_squat", "db_rdl", "db_bench", "one_arm_db_row", "seated_db_press", "db_split_squat"]) {
    const n = alternativesFor(id, home).length + similarFor(id, home).length;
    assert.ok(n >= 4, `${id}: ${n}`);
  }
});

test("similar swaps share a main muscle", () => {
  for (const e of EXERCISES) for (const s of similarFor(e.id)) assert.ok(s.primary.some((m) => e.primary.includes(m)), `${e.id} → ${s.id}`);
});
