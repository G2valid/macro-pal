import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProgram, recommendSplit, liftDaysFor, spreadDays, fitToTime, estimateMinutes, weeklyVolume, pickExercise } from "../domain/generate.js";
import { EX, hasEquipment } from "../domain/exercises.js";
import { GYM_EQUIPMENT } from "../domain/vocab.js";

const gym = { equipment: GYM_EQUIPMENT };
const base = { experience: "novice", primary: "muscle", days: [1, 3, 5], minutes: 60, ...gym };
const allSlots = (p) => p.templates.flatMap((t) => t.slots);

test("split follows lifting days", () => {
  assert.equal(recommendSplit({ liftDays: 3 }).split, "full_body");
  assert.equal(recommendSplit({ liftDays: 4 }).split, "upper_lower");
  assert.equal(recommendSplit({ liftDays: 5 }).split, "ul_ppl");
  assert.equal(recommendSplit({ liftDays: 6 }).split, "ppl");
});

test("beginners are capped at 3 lifting days; extra days go to cardio", () => {
  assert.equal(liftDaysFor({ days: 6, experience: "new", primary: "muscle" }).lift, 3);
  const p = generateProgram({ ...base, experience: "new", days: [0, 1, 2, 3, 4, 5] });
  assert.equal(p.split, "full_body");
  assert.equal(p.weekPlan.filter((d) => d.kind === "lift").length, 3);
  assert.equal(p.weekPlan.filter((d) => d.kind === "cardio").length, 3);
});

test("endurance-focused plans keep lifting to 2–3 days", () => {
  const p = generateProgram({ ...base, primary: "endurance", days: [1, 2, 3, 4, 5] });
  assert.ok(p.weekPlan.filter((d) => d.kind === "lift").length <= 3);
});

test("lifting days are spread out", () => {
  assert.deepEqual(spreadDays([1, 2, 3, 4, 5], 3), [1, 3, 5]);
  assert.deepEqual(spreadDays([0, 1, 2, 3, 4, 5, 6], 2).length, 2);
  const g = spreadDays([0, 1, 2, 3, 4, 5, 6], 2);
  assert.ok(g[1] - g[0] >= 3);
});

test("every exercise matches the user's equipment", () => {
  for (const equipment of [["dumbbells", "bench"], ["bands"], [], GYM_EQUIPMENT]) {
    const p = generateProgram({ ...base, equipment });
    for (const s of allSlots(p)) assert.ok(hasEquipment(EX[s.exerciseId], equipment), `${s.exerciseId} with ${equipment}`);
  }
});

test("bodyweight-only home plan still trains the whole body", () => {
  const p = generateProgram({ ...base, experience: "new", equipment: [] });
  const v = p.volume;
  for (const m of ["chest", "quads", "glutes", "hamstrings", "triceps"]) assert.ok(v[m] > 0, m);
});

test("joints marked 'avoid' exclude exercises that load them", () => {
  const p = generateProgram({ ...base, limits: { knee: "avoid" } });
  for (const s of allSlots(p)) assert.ok(!EX[s.exerciseId].joints.includes("knee"), s.exerciseId);
});

test("disliked exercises are never chosen", () => {
  const p1 = generateProgram(base);
  const first = allSlots(p1)[0].exerciseId;
  const p2 = generateProgram({ ...base, disliked: [first] });
  assert.ok(!allSlots(p2).some((s) => s.exerciseId === first));
});

test("new lifters only get beginner exercises when options exist", () => {
  const p = generateProgram({ ...base, experience: "new" });
  for (const s of allSlots(p)) assert.equal(EX[s.exerciseId].level, 1, s.exerciseId);
});

test("strength goal picks barbell main lifts and lower reps for intermediates", () => {
  const p = generateProgram({ ...base, experience: "intermediate", primary: "strength", days: [1, 2, 4, 5], minutes: 75 });
  const mains = allSlots(p).filter((s) => s.role === "main");
  assert.ok(mains.length >= 2);
  assert.ok(mains.some((s) => EX[s.exerciseId].load === "barbell"));
  for (const s of mains) assert.ok(s.repHigh <= 6);
});

test("fat loss trains with muscle-building reps, not a 'toning' range", () => {
  const p = generateProgram({ ...base, primary: "fat_loss" });
  assert.equal(p.style, "hypertrophy");
  const main = allSlots(p).find((s) => s.role === "main");
  assert.ok(main.repLow >= 5 && main.repHigh <= 12);
});

test("sessions fit the time budget", () => {
  for (const minutes of [30, 45, 60]) {
    const p = generateProgram({ ...base, minutes });
    for (const t of p.templates) assert.ok(t.estMinutes <= minutes, `${t.name} ${t.estMinutes} > ${minutes}`);
  }
});

test("fitToTime cuts accessories before main lifts and keeps order", () => {
  const p = generateProgram({ ...base, minutes: 90 });
  const t = p.templates[0];
  const { slots, notes } = fitToTime(t.slots, 25);
  assert.ok(estimateMinutes(slots) <= 25 || slots.length === 2);
  assert.ok(notes.length > 0);
  assert.equal(slots[0].id, t.slots[0].id, "main lift kept first");
  const idx = slots.map((s) => t.slots.findIndex((x) => x.id === s.id));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
});

test("priority muscles get more weekly volume", () => {
  const plain = generateProgram({ ...base, days: [1, 2, 4, 5] });
  const prio = generateProgram({ ...base, days: [1, 2, 4, 5], priority: ["glutes", "side_delts"] });
  assert.ok(prio.volume.glutes > plain.volume.glutes);
  assert.ok(prio.volume.side_delts > plain.volume.side_delts);
});

test("weekly volume counts secondary muscles as half a set", () => {
  const v = weeklyVolume([{ slots: [{ exerciseId: "db_bench", sets: 3 }] }]);
  assert.equal(v.chest, 3);
  assert.equal(v.triceps, 3);
  assert.equal(v.side_delts, 0);
});

test("generation is deterministic", () => {
  assert.deepEqual(generateProgram(base), generateProgram(base));
});

test("upper/lower places leg days apart when possible", () => {
  const p = generateProgram({ ...base, experience: "intermediate", days: [1, 2, 4, 5] });
  const lower = p.weekPlan.filter((d) => d.kind === "lift" && p.templates.find((t) => t.id === d.templateId).focus === "lower").map((d) => d.dow);
  assert.equal(lower.length, 2);
  assert.ok(lower[1] - lower[0] > 1);
});

test("pickExercise falls back gracefully and returns null when impossible", () => {
  assert.equal(pickExercise({ pattern: "fly", role: "accessory" }, { equipment: [], experience: "new" }), null);
  assert.ok(pickExercise({ pattern: "knee_ext", role: "accessory" }, { equipment: [], experience: "intermediate" }), "bodyweight quad options exist");
});

test("mobility goal adds cool-down drills", () => {
  const p = generateProgram({ ...base, primary: "mobility", minutes: 60 });
  assert.ok(allSlots(p).some((s) => s.pattern === "mobility"));
});

test("health-screen flag keeps 3+ reps in reserve", () => {
  const p = generateProgram({ ...base, conservative: true });
  for (const s of allSlots(p)) assert.ok(s.rir >= 3 || s.unit === "sec");
});

test("missing equipment falls back to a related pattern instead of dropping it", () => {
  // Bodyweight only, 5 days → includes a Push day whose chest fly needs equipment.
  const p = generateProgram({ ...base, experience: "intermediate", days: [1, 2, 3, 4, 5], equipment: [] });
  assert.ok(p.warnings.some((w) => /covers it/.test(w)), p.warnings.join(" | "));
  assert.ok(!allSlots(p).some((s) => s.pattern === "fly"));
});

test("in a full gym, main and secondary lifts are loadable", () => {
  for (const experience of ["new", "intermediate"]) {
    const p = generateProgram({ ...base, experience, days: [1, 2, 4, 5] });
    for (const s of allSlots(p).filter((x) => x.role !== "accessory")) {
      assert.ok(!["bodyweight", "band"].includes(EX[s.exerciseId].load) || EX[s.exerciseId].level === 3, `${experience}: ${s.exerciseId}`);
    }
  }
});

test("a priority muscle doesn't balloon past sensible volume", () => {
  const p = generateProgram({ ...base, experience: "intermediate", days: [1, 2, 4, 5], priority: ["glutes"] });
  assert.ok(weeklyVolume(p.templates, { directOnly: true }).glutes <= 22);
  assert.ok(!p.warnings.some((w) => /Upper back/.test(w)));
});

test("repeated sessions get distinct names", () => {
  const p = generateProgram({ ...base, experience: "advanced", days: [0, 1, 2, 3, 4, 5] });
  const names = p.templates.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
});

test("a plain beginner home plan raises no volume warnings", () => {
  const p = generateProgram({ ...base, experience: "new", primary: "definition", equipment: ["dumbbells", "bench", "bands"] });
  assert.ok(!p.warnings.some((w) => /direct sets/.test(w)), p.warnings.join(" | "));
});
