// Calendar: turns a program's weekly pattern into dated sessions for a
// training block, and handles moving, skipping and missed sessions.

import { LOWER_FOCUS } from "./generate.js";

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const dowOf = (s) => parseYmd(s).getDay();
/** Monday of the week containing the date. */
export const weekStart = (s) => addDays(s, -((dowOf(s) + 6) % 7));

const round5 = (x) => Math.max(5, Math.round(x / 5) * 5);

/** Weekly cardio minutes for week k (0-based): ~10%/week ramp to the target. */
export function cardioMinutesForWeek(cardio, k) {
  return Math.min(cardio.targetMinutes, round5(cardio.startMinutes * Math.pow(1.1, k)));
}

/**
 * Build dated sessions for the block.
 * @returns [{id, date, week, kind:"lift"|"cardio", templateId?, cardio?, status:"planned"}]
 */
export function buildCalendar(program, startDate) {
  const out = [];
  const days = program.weeks * 7;
  const cardioCount = program.weekPlan.filter((p) => p.kind === "cardio").length;
  const liftCount = program.weekPlan.filter((p) => p.kind === "lift").length;
  let modeIdx = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const week = Math.floor(i / 7);
    const weekly = cardioMinutesForWeek(program.cardio, week);
    for (const p of program.weekPlan.filter((x) => x.dow === dowOf(date))) {
      if (p.kind === "lift") {
        const s = { id: `${date}-L`, date, week: week + 1, kind: "lift", templateId: p.templateId, status: "planned" };
        if (p.finisher) s.cardio = { minutes: Math.max(10, round5(weekly / Math.max(1, liftCount))), intensity: "easy", mode: program.cardio.modes[0], finisher: true };
        out.push(s);
      } else {
        const mode = program.cardio.modes[modeIdx++ % program.cardio.modes.length];
        const moderate = program.primary === "endurance" && week >= 2 && program.weekPlan.filter((x) => x.kind === "cardio").indexOf(p) === 0;
        out.push({ id: `${date}-C`, date, week: week + 1, kind: "cardio", status: "planned",
          cardio: { minutes: Math.max(10, round5(weekly / Math.max(1, cardioCount))), intensity: moderate ? "moderate" : "easy", mode } });
      }
    }
  }
  return out;
}

export const INTENSITY = {
  easy: { label: "Easy", rpe: "3–4", talk: "You can talk in full sentences.", evidence: "strong" },
  moderate: { label: "Moderate", rpe: "5–6", talk: "You can talk, but in shorter phrases.", evidence: "strong" },
};

const isLower = (s, templates) => s.kind === "lift" && LOWER_FOCUS.has(templates.find((t) => t.id === s.templateId)?.focus);

/** Recovery warnings for a session on its current date. */
export function warningsFor(session, sessions, templates) {
  const w = [];
  if (session.kind !== "lift") return w;
  for (const d of [-1, 1]) {
    const other = sessions.find((s) => s.id !== session.id && s.date === addDays(session.date, d) && s.kind === "lift" && s.status !== "skipped");
    if (!other) continue;
    if (isLower(session, templates) && isLower(other, templates)) {
      w.push("Hard leg sessions on back-to-back days. Fine if you feel recovered — otherwise keep a day between them.");
      break;
    }
  }
  return w;
}

/**
 * Move a session to a new date. If another lifting session is already there,
 * the two swap dates. Completed sessions don't move.
 * @returns {sessions, warnings, swappedWith}
 */
export function moveSession(sessions, id, newDate, templates) {
  const list = sessions.map((s) => ({ ...s }));
  const s = list.find((x) => x.id === id);
  if (!s || s.status === "done") return { sessions, warnings: ["Completed sessions can't be moved."], swappedWith: null };
  const clash = list.find((x) => x.id !== id && x.date === newDate && x.kind === s.kind && x.status !== "done" && x.status !== "skipped");
  const from = s.date;
  s.date = newDate;
  if (s.status === "missed") s.status = "planned";
  if (clash) clash.date = from;
  list.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
  return { sessions: list, warnings: warningsFor(s, list, templates), swappedWith: clash?.id || null };
}

/** Push this session and every later planned session back by n days. */
export function shiftFrom(sessions, id, n = 1) {
  const s = sessions.find((x) => x.id === id);
  if (!s) return sessions;
  return sessions.map((x) => (x.status === "planned" || x.status === "missed") && x.date >= s.date
    ? { ...x, date: addDays(x.date, n), status: "planned" } : x);
}

/** Mark past planned sessions as missed (without mutating). */
export function markMissed(sessions, today) {
  return sessions.map((s) => (s.status === "planned" && s.date < today ? { ...s, status: "missed" } : s));
}

/** Completed / planned for the weeks so far. */
export function adherence(sessions, today) {
  const due = sessions.filter((s) => s.date <= today && s.status !== "skipped");
  const done = due.filter((s) => s.status === "done").length;
  return { done, due: due.length, pct: due.length ? Math.round((done / due.length) * 100) : null };
}
