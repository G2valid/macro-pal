// The training section of Bite Club's Fitness tab: the day's planned
// session(s), missed sessions, this week and the way into the plan.

import { ctx, me, save, render, toast, esc, uid, today, on, openSheet, closeSheet, sheetTitle, fmtDate, evBadge } from "./core.js";
import { EX } from "../domain/exercises.js";
import { addDays, weekStart, moveSession, shiftFrom, INTENSITY, parseYmd } from "../domain/schedule.js";
import { templateOf, workoutSummary } from "../domain/history.js";
import { biteCardio, biteWorkouts } from "../store.js";
import { CARDIO_MODES } from "./onboard.js";
import { beginWorkout } from "./workout.js";
import { startOnboarding } from "./onboard.js";
import { syncToBite } from "./sync.js";

export const biteFor = (p) => (d) => (p.biteId ? biteCardio(p.biteId, d) : []);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function sessionLabel(s) {
  if (s.kind === "cardio") return `${CARDIO_MODES[s.cardio.mode] || "Cardio"} · ${s.cardio.minutes} min`;
  return s.name || templateOf(me(), s.templateId)?.name || "Workout";
}

function blockWeek(p, date = today()) {
  const start = p.program.startDate;
  return Math.floor((parseYmd(date) - parseYmd(start)) / 86400000 / 7);
}

const LIFT_TYPES = new Set(["strength", "hiit", "pilates", "yoga", "stretching", "other"]);

/** Workouts in the Fitness log on a date that could count as this session. */
function countable(p, s) {
  if (!p.biteId) return [];
  const used = new Set(p.sessions.map((x) => x.countedFrom).filter(Boolean));
  return biteWorkouts(p.biteId, s.date).filter((w) => w.source !== "trainer" && !used.has(w.id) &&
    (s.kind === "lift" ? LIFT_TYPES.has(w.type) : !LIFT_TYPES.has(w.type) || w.type === "other" || w.type === "hiit"));
}
const countBtns = (p, s) => {
  const ws = countable(p, s);
  return ws.length ? `<div class="note">Already in your Fitness log: ${ws.map((w) => `<button class="pill-btn" data-ta="count-bite" data-id="${s.id}" data-w="${esc(w.id)}">✓ Count “${esc(w.title || w.type)}${w.minutes ? ` · ${w.minutes} min` : ""}”</button>`).join(" ")}</div>` : "";
};

function liftCard(p, s) {
  const t = templateOf(p, s.templateId);
  if (s.status === "done") {
    const log = p.logs.find((l) => l.id === s.logId);
    const sum = log ? workoutSummary(log) : null;
    return `<div class="card session done"><div class="card-head"><h2>✓ ${esc(s.name || t?.name)}</h2><span class="meta">Done</span></div>
      ${sum ? `<p class="muted">${sum.minutes} min · ${sum.sets} sets · ${sum.volume.toLocaleString()} lb${log.prs?.length ? ` · 🏆 ${log.prs.length} PR${log.prs.length > 1 ? "s" : ""}` : ""}</p>` : s.countedFrom ? `<p class="muted">Counted from your Fitness log.</p>` : ""}</div>`;
  }
  if (!t) return "";
  const names = t.slots.map((x) => EX[x.exerciseId]?.name).filter(Boolean);
  const isToday = s.date === today();
  const past = s.date < today();
  return `<div class="card session ${isToday ? "hero-card" : ""}">
    <div class="card-head"><h2>🏋️ ${esc(t.name)}</h2><span class="meta">${s.status === "skipped" ? "Skipped" : past ? "Missed" : `~${t.estMinutes} min`}</span></div>
    <p class="ex-list">${names.slice(0, 5).map(esc).join(" · ")}${names.length > 5 ? ` · +${names.length - 5} more` : ""}</p>
    ${s.cardio?.finisher ? `<p class="small muted">Then ${s.cardio.minutes} min easy ${CARDIO_MODES[s.cardio.mode]?.split(" ").slice(1).join(" ").toLowerCase() || "cardio"}.</p>` : ""}
    ${countBtns(p, s)}
    ${s.status === "skipped" ? "" : isToday || past ? `<button class="btn" data-ta="start" data-id="${s.id}">${p.active ? "Resume workout" : isToday ? "Start workout" : "Do it today"}</button>` : `<button class="btn secondary" data-ta="sess" data-id="${s.id}">Move or start early</button>`}
  </div>`;
}

function cardioCard(p, s) {
  const inten = INTENSITY[s.cardio.intensity];
  if (s.status === "done") return `<div class="card session done"><div class="card-head"><h2>✓ ${esc(CARDIO_MODES[s.cardio.mode] || "Cardio")}</h2><span class="meta">Done</span></div></div>`;
  return `<div class="card session">
    <div class="card-head"><h2>${esc(CARDIO_MODES[s.cardio.mode] || "Cardio")}</h2><span class="meta">${s.cardio.minutes} min</span></div>
    <p><b>${inten.label}</b> · effort ${inten.rpe}/10. ${inten.talk} ${evBadge(inten.evidence)}</p>
    ${countBtns(p, s)}
    ${s.date <= today() ? `<div class="btn-row"><button class="btn secondary" data-ta="cardio-log" data-id="${s.id}">Log it</button><button class="btn secondary" data-ta="imp-open">📸 Import screenshot</button></div>` : ""}
  </div>`;
}

function missedCard(p) {
  const t = today();
  const missed = p.sessions.filter((s) => s.status === "planned" && s.date < t && s.date >= addDays(t, -7)).slice(-2);
  if (!missed.length) return "";
  return `<div class="card"><div class="card-head"><h2>Missed this week</h2></div>
    ${missed.map((s) => `<div class="missed"><div><b>${esc(sessionLabel(s))}</b><span class="muted small"> · ${fmtDate(s.date)}</span></div>
      <div class="chips"><button class="chip" data-ta="miss-today" data-id="${s.id}">Do it today</button><button class="chip" data-ta="miss-shift" data-id="${s.id}">Push plan back a day</button><button class="chip" data-ta="miss-skip" data-id="${s.id}">Skip</button></div></div>`).join("")}
    <p class="hint">Missing a session now and then makes no measurable difference. Consistency over weeks is what counts.</p></div>`;
}

function weekStrip(p, date) {
  const ws = weekStart(date);
  return `<div class="strip">${DAYS.map((d, i) => {
    const day = addDays(ws, i);
    const ss = p.sessions.filter((s) => s.date === day);
    const icon = ss.some((s) => s.kind === "lift") ? "🏋️" : ss.length ? "🫀" : "";
    const st = !ss.length ? "rest" : ss.every((s) => s.status === "done") ? "done" : ss.some((s) => s.status === "skipped") ? "skipped" : day < today() ? "missed" : "planned";
    return `<button class="sd ${st} ${day === today() ? "today" : ""}" data-ta="plan-day" data-date="${day}"><span>${d}</span><i>${st === "done" ? "✓" : icon || "·"}</i></button>`;
  }).join("")}</div>`;
}

/** The training part of Bite Club's Fitness tab, for the day being viewed. */
export function trainingHome(date = today()) {
  const p = me();
  if (!p) {
    return `<div class="tc"><div class="card hero-card">
      <div class="card-head"><h2>🏋️ Your personal training plan</h2></div>
      <p>Answer a few quick questions (about 2 minutes) and get workouts built around your goal, schedule and equipment — with weights that go up as you get stronger. Everything is logged right here in Fitness.</p>
      <button class="btn" data-ta="setup">Set up my plan</button></div></div>`;
  }
  const t = today();
  const sessions = p.sessions.filter((s) => s.date === date);
  const next = p.sessions.find((s) => s.date > date && s.status === "planned");
  const wk = Math.max(0, blockWeek(p, t));
  const lastDate = p.sessions.reduce((m, s) => (s.date > m ? s.date : m), "");
  const blockOver = lastDate && t > lastDate;
  return `<div class="tc">
    ${p.active ? `<button class="banner" data-ta="resume"><span class="big-emo">⏱️</span><div><b>Workout in progress</b><span>${esc(p.active.name)} — tap to resume</span></div></button>` : ""}
    ${blockOver && date === t ? `<div class="card"><div class="card-head"><h2>🎉 Block complete</h2></div><p>You've finished this ${p.program.weeks}-week block. Check your strength stats, then start the next block — your weights carry over.</p><button class="btn" data-ta="next-block">Start next block</button></div>` : ""}
    ${sessions.map((s) => (s.kind === "lift" ? liftCard(p, s) : cardioCard(p, s))).join("")}
    ${!sessions.length && !(blockOver && date === t) ? `<div class="card"><div class="card-head"><h2>😌 ${date === t ? "Recovery day" : "Rest day"}</h2></div>
      ${date === t ? `<p>Muscles adapt between sessions, so rest days are part of the plan. An easy walk is great and counts toward your cardio.</p>` : ""}
      ${next ? `<p class="muted">Next: <b>${esc(sessionLabel(next))}</b> · ${fmtDate(next.date)}</p>` : ""}
      ${date === t ? `<button class="btn secondary" data-ta="extra-workout">Train anyway</button>` : ""}</div>` : ""}
    ${date === t ? missedCard(p) : ""}
    <div class="card">
      <div class="card-head"><h2>📋 My plan</h2><span class="meta">${blockOver ? "Block complete" : `Week ${Math.min(wk + 1, p.program.weeks)} of ${p.program.weeks}`}</span></div>
      ${weekStrip(p, date)}
      <button class="btn" data-ta="tab" data-v="plan">View my plan</button>
      <div class="btn-row"><button class="btn secondary" data-ta="tab" data-v="library">📚 Exercises</button><button class="btn secondary" data-ta="tab" data-v="progress">📈 Strength stats</button></div>
    </div>
  </div>`;
}

/* ---------------- Cardio logging ---------------- */
function cardioSheet(sessionId) {
  const p = me();
  const s = p.sessions.find((x) => x.id === sessionId);
  const mode = s?.cardio?.mode || p.profile.cardioModes?.[0] || "walking";
  openSheet(`${sheetTitle("Log cardio")}
    <button class="btn secondary" data-ta="imp-open" style="margin-bottom:12px">📸 Import from a screenshot instead</button>
    <p class="hint" style="margin-top:0">Saved to your Fitness log.</p>
    <form id="cardioForm">
      <label class="field"><span>Activity</span><select name="mode">${Object.entries(CARDIO_MODES).map(([k, l]) => `<option value="${k}" ${k === mode ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <div class="row2"><label class="field"><span>Minutes</span><input name="minutes" type="number" inputmode="numeric" min="1" required value="${s?.cardio?.minutes || ""}"></label>
      <label class="field"><span>Distance (mi, optional)</span><input name="distance" type="number" inputmode="decimal" step="0.01" min="0"></label></div>
      <div class="row2"><label class="field"><span>Avg heart rate (optional)</span><input name="avgHr" type="number" inputmode="numeric" min="0"></label>
      <label class="field"><span>Effort (1–10)</span><select name="rpe"><option value="">—</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${n === 4 ? "" : ""}>${n}</option>`).join("")}</select></label></div>
      <p class="hint">Effort: 3–4 easy (full sentences), 5–6 moderate (short phrases), 7–8 hard (a few words), 9–10 all-out.</p>
      <button class="btn">Save</button>
    </form>`);
  document.getElementById("cardioForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    p.cardioLogs.push({ id: uid(), date: s?.date && s.date <= today() ? s.date : today(), sessionId: s?.id || null, mode: f.mode, minutes: Number(f.minutes) || 0,
      distance: Number(f.distance) || 0, avgHr: Number(f.avgHr) || 0, rpe: Number(f.rpe) || null, source: "manual" });
    if (s) s.status = "done";
    save(); closeSheet();
    const inBite = syncToBite(p) > 0;
    render(); toast("Cardio logged 🫀");
  });
}

on({
  start: (el) => {
    const p = me();
    const s = p.sessions.find((x) => x.id === el.dataset.id);
    if (s && s.date !== today() && s.status !== "done") {
      const r = moveSession(p.sessions, s.id, today(), p.program.templates);
      p.sessions = r.sessions;
    }
    beginWorkout(el.dataset.id);
  },
  resume: () => { ctx.tab = "workout"; render(); },
  "cardio-log": (el) => cardioSheet(el.dataset.id),
  "count-bite": (el) => {
    const p = me();
    const s = p.sessions.find((x) => x.id === el.dataset.id);
    const w = biteWorkouts(p.biteId, s.date).find((x) => x.id === el.dataset.w);
    if (!s || !w) return;
    s.status = "done";
    s.countedFrom = w.id;
    if (s.kind === "cardio") p.cardioLogs.push({ id: uid(), date: s.date, sessionId: s.id, mode: s.cardio.mode, minutes: w.minutes || 0, source: "bite" });
    save(); render(); toast("Counted toward your plan ✓");
  },
  setup: () => startOnboarding(null, { biteId: ctx.host?.activeId() }),
  "imp-open": () => { closeSheet(); ctx.host?.openImport(); },
  "miss-today": (el) => {
    const p = me();
    const r = moveSession(p.sessions, el.dataset.id, today(), p.program.templates);
    p.sessions = r.sessions;
    save(); render();
    toast(r.warnings[0] || (r.swappedWith ? "Moved to today — today's session moved to its old slot." : "Moved to today"), 4000);
  },
  "miss-shift": (el) => {
    const p = me();
    p.sessions = shiftFrom(p.sessions, el.dataset.id, Math.max(1, Math.round((parseYmd(today()) - parseYmd(p.sessions.find((s) => s.id === el.dataset.id).date)) / 86400000)));
    save(); render(); toast("Plan pushed back — everything from that session on moves later.");
  },
  "miss-skip": (el) => { const s = me().sessions.find((x) => x.id === el.dataset.id); s.status = "skipped"; save(); render(); },
  "extra-workout": () => {
    const p = me();
    openSheet(`${sheetTitle("Which workout?")}
      <p class="muted small">Extra sessions are logged but don't change your schedule. Make sure you're recovered from your last one.</p>
      <div class="food-list">${p.program.templates.map((t) => `<button class="food-item" data-ta="extra-pick" data-id="${t.id}"><div class="grow"><b>${esc(t.name)}</b><div class="small muted">~${t.estMinutes} min</div></div><span>›</span></button>`).join("")}</div>`);
  },
  "extra-pick": (el) => { closeSheet(); beginWorkout(null, el.dataset.id); },
  "next-block": () => startOnboarding(me().id),
});
