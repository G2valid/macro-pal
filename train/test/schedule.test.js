import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, moveSession, shiftFrom, markMissed, adherence, cardioMinutesForWeek, dowOf, weekStart } from "../domain/schedule.js";
import { generateProgram } from "../domain/generate.js";
import { GYM_EQUIPMENT } from "../domain/vocab.js";

const program = generateProgram({ experience: "novice", primary: "general", days: [1, 2, 3, 4, 5], minutes: 60, equipment: GYM_EQUIPMENT, cardioAbility: "walk" });
const start = "2026-11-16"; // a Monday

test("calendar covers the block on the planned weekdays", () => {
  const cal = buildCalendar(program, start);
  const planDows = new Set(program.weekPlan.map((p) => p.dow));
  for (const s of cal) assert.ok(planDows.has(dowOf(s.date)));
  assert.equal(cal.filter((s) => s.kind === "lift").length, program.weekPlan.filter((p) => p.kind === "lift").length * program.weeks);
});

test("cardio ramps ~10% a week and never passes the target", () => {
  let prev = 0;
  for (let k = 0; k < 12; k++) {
    const m = cardioMinutesForWeek({ startMinutes: 40, targetMinutes: 150 }, k);
    assert.ok(m >= prev && m <= 150);
    if (prev) assert.ok(m <= Math.ceil(prev * 1.1 / 5) * 5 + 5);
    prev = m;
  }
});

test("moving onto another lifting day swaps them", () => {
  const cal = buildCalendar(program, start);
  const [a, b] = cal.filter((s) => s.kind === "lift");
  const { sessions, swappedWith } = moveSession(cal, a.id, b.date, program.templates);
  assert.equal(swappedWith, b.id);
  assert.equal(sessions.find((s) => s.id === a.id).date, b.date);
  assert.equal(sessions.find((s) => s.id === b.id).date, a.date);
});

test("completed sessions can't move", () => {
  const cal = buildCalendar(program, start).map((s, i) => (i === 0 ? { ...s, status: "done" } : s));
  const r = moveSession(cal, cal[0].id, "2026-12-01", program.templates);
  assert.equal(r.sessions, cal);
});

test("leg days back-to-back produce a warning", () => {
  const ul = generateProgram({ experience: "intermediate", primary: "muscle", days: [1, 2, 4, 5], minutes: 60, equipment: GYM_EQUIPMENT });
  const cal = buildCalendar(ul, start);
  const lowers = cal.filter((s) => s.kind === "lift" && ul.templates.find((t) => t.id === s.templateId).focus === "lower" && s.week === 1);
  const r = moveSession(cal, lowers[1].id, "2026-11-18", ul.templates);
  assert.ok(r.warnings.length > 0);
});

test("missed, shift and adherence", () => {
  const cal = buildCalendar(program, start);
  const m = markMissed(cal, "2026-11-19");
  assert.ok(m.filter((s) => s.status === "missed").length >= 3);
  const first = m.find((s) => s.status === "missed");
  const shifted = shiftFrom(m, first.id, 1);
  assert.equal(shifted.find((s) => s.id === first.id).status, "planned");
  assert.ok(shifted.every((s, i) => s.date >= m[i].date));
  assert.equal(adherence(m, "2026-11-19").done, 0);
  assert.equal(weekStart("2026-11-19"), "2026-11-16");
});
