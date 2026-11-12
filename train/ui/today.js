// Today: what's on, missed sessions, and this week at a glance.

import { ctx, me, save, render, toast, esc, uid, today, on, openSheet, closeSheet, sheetTitle, fmtDate, evBadge } from "./core.js";
import { EX } from "../domain/exercises.js";
import { SPLITS } from "../domain/generate.js";
import { addDays, weekStart, cardioMinutesForWeek, moveSession, shiftFrom, INTENSITY, parseYmd } from "../domain/schedule.js";
import { templateOf, cardioMinutes, workoutSummary } from "../domain/history.js";
import { biteCardio, biteProfile } from "../store.js";
import { CARDIO_MODES } from "./onboard.js";
import { beginWorkout } from "./workout.js";
import { startOnboarding } from "./onboard.js";

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

function liftCard(p, s) {
  const t = templateOf(p, s.templateId);
  if (s.status === "done") {
    const log = p.logs.find((l) => l.id === s.logId);
    const sum = log ? workoutSummary(log) : null;
    return `<div class="card session done"><div class="card-head"><h2>✓ ${esc(s.name || t?.name)}</h2><span class="meta">Done</span></div>
      ${sum ? `<p class="muted">${sum.minutes} min · ${sum.sets} sets · ${sum.volume.toLocaleString()} lb${log.prs?.length ? ` · 🏆 ${log.prs.length} PR${log.prs.length > 1 ? "s" : ""}` : ""}</p>` : ""}</div>`;
  }
  if (!t) return "";
  const names = t.slots.map((x) => EX[x.exerciseId]?.name).filter(Boolean);
  return `<div class="card session hero-card">
    <div class="card-head"><h2>🏋️ ${esc(t.name)}</h2><span class="meta">~${t.estMinutes} min</span></div>
    <p class="ex-list">${names.slice(0, 5).map(esc).join(" · ")}${names.length > 5 ? ` · +${names.length - 5} more` : ""}</p>
    ${s.cardio?.finisher ? `<p class="small muted">Then ${s.cardio.minutes} min easy ${CARDIO_MODES[s.cardio.mode]?.split(" ").slice(1).join(" ").toLowerCase() || "cardio"}.</p>` : ""}
    <button class="btn" data-act="start" data-id="${s.id}">${p.active ? "Resume workout" : "Start workout"}</button>
  </div>`;
}

function cardioCard(p, s) {
  const inten = INTENSITY[s.cardio.intensity];
  if (s.status === "done") return `<div class="card session done"><div class="card-head"><h2>✓ ${esc(CARDIO_MODES[s.cardio.mode] || "Cardio")}</h2><span class="meta">Done</span></div></div>`;
  const fromBite = biteFor(p)(s.date);
  return `<div class="card session">
    <div class="card-head"><h2>${esc(CARDIO_MODES[s.cardio.mode] || "Cardio")}</h2><span class="meta">${s.cardio.minutes} min</span></div>
    <p><b>${inten.label}</b> · effort ${inten.rpe}/10. ${inten.talk} ${evBadge(inten.evidence)}</p>
    ${fromBite.length ? `<div class="note">From Bite Club today: ${fromBite.map((w, i) => `<button class="pill-btn" data-act="cardio-bite" data-id="${s.id}" data-i="${i}">✓ Count ${w.minutes} min ${esc(w.title || w.type)}</button>`).join(" ")}</div>` : ""}
    <button class="btn secondary" data-act="cardio-log" data-id="${s.id}">Log cardio</button>
  </div>`;
}

function missedCard(p) {
  const t = today();
  const missed = p.sessions.filter((s) => s.status === "planned" && s.date < t && s.date >= addDays(t, -7)).slice(-2);
  if (!missed.length) return "";
  return `<div class="card"><div class="card-head"><h2>Missed</h2></div>
    ${missed.map((s) => `<div class="missed"><div><b>${esc(sessionLabel(s))}</b><span class="muted small"> · ${fmtDate(s.date)}</span></div>
      <div class="chips"><button class="chip" data-act="miss-today" data-id="${s.id}">Do it today</button><button class="chip" data-act="miss-shift" data-id="${s.id}">Push plan back a day</button><button class="chip" data-act="miss-skip" data-id="${s.id}">Skip</button></div></div>`).join("")}
    <p class="hint">Missing a session now and then makes no measurable difference. Consistency over weeks is what counts.</p></div>`;
}

function weekStrip(p) {
  const ws = weekStart(today());
  return `<div class="strip">${DAYS.map((d, i) => {
    const date = addDays(ws, i);
    const ss = p.sessions.filter((s) => s.date === date);
    const icon = ss.some((s) => s.kind === "lift") ? "🏋️" : ss.length ? "🫀" : "";
    const st = !ss.length ? "rest" : ss.every((s) => s.status === "done") ? "done" : ss.some((s) => s.status === "skipped") ? "skipped" : date < today() ? "missed" : "planned";
    return `<button class="sd ${st} ${date === today() ? "today" : ""}" data-act="plan-day" data-date="${date}"><span>${d}</span><i>${st === "done" ? "✓" : icon || "·"}</i></button>`;
  }).join("")}</div>`;
}

export function renderToday(el) {
  const p = me();
  const t = today();
  const todays = p.sessions.filter((s) => s.date === t);
  const next = p.sessions.find((s) => s.date > t && s.status === "planned");
  const ws = weekStart(t);
  const weekSessions = p.sessions.filter((s) => s.date >= ws && s.date <= addDays(ws, 6));
  const liftsDone = weekSessions.filter((s) => s.kind === "lift" && s.status === "done").length;
  const liftsPlanned = weekSessions.filter((s) => s.kind === "lift" && s.status !== "skipped").length;
  const wk = Math.max(0, blockWeek(p));
  const cardioTarget = cardioMinutesForWeek(p.program.cardio, Math.min(wk, p.program.weeks - 1));
  const cardio = cardioMinutes(p, ws, addDays(ws, 6), biteFor(p));
  const lastDate = p.sessions.reduce((m, s) => (s.date > m ? s.date : m), "");
  const blockOver = lastDate && t > lastDate;
  const bite = p.biteId ? biteProfile(p.biteId) : null;

  el.innerHTML = `
    <div class="hero">
      <div class="hero-top"><span>${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>${blockOver ? "" : `<span class="streak">Week ${Math.min(wk + 1, p.program.weeks)} of ${p.program.weeks}</span>`}</div>
      <h1>${todays.some((s) => s.kind === "lift" && s.status !== "done") ? "Training day" : todays.length ? (todays.every((s) => s.status === "done") ? "All done today ✓" : "Cardio day") : "Rest day"}</h1>
      <p>${SPLITS[p.program.split].label}${bite ? ` · linked to Bite Club` : ""}</p>
    </div>
    ${p.active ? `<button class="banner" data-act="resume"><span class="big-emo">⏱️</span><div><b>Workout in progress</b><span>${esc(p.active.name)} — tap to resume</span></div></button>` : ""}
    ${blockOver ? `<div class="card"><div class="card-head"><h2>🎉 Block complete</h2></div><p>You've finished this ${p.program.weeks}-week block. Check your Progress tab, then start the next block — your weights carry over.</p><button class="btn" data-act="next-block">Start next block</button></div>` : ""}
    ${todays.map((s) => (s.kind === "lift" ? liftCard(p, s) : cardioCard(p, s))).join("")}
    ${!todays.length && !blockOver ? `<div class="card"><div class="card-head"><h2>😌 Recovery day</h2></div>
      <p>Muscles adapt between sessions, so rest days are part of the plan. An easy walk is great and counts toward your cardio.</p>
      ${next ? `<p class="muted">Next: <b>${esc(sessionLabel(next))}</b> · ${fmtDate(next.date)}</p>` : ""}
      <div class="btn-row"><button class="btn secondary" data-act="cardio-log" data-id="">Log a walk / cardio</button><button class="btn secondary" data-act="extra-workout">Train anyway</button></div></div>` : ""}
    ${missedCard(p)}
    <div class="card">
      <div class="card-head"><h2>This week</h2><button class="pill-btn" data-act="tab" data-v="plan">Plan ›</button></div>
      ${weekStrip(p)}
      <div class="stats2">
        <div class="stat"><div class="v">${liftsDone}/${liftsPlanned}</div><div class="k">Workouts</div></div>
        <div class="stat"><div class="v">${cardio.total}<small>/${cardioTarget}</small></div><div class="k">Cardio minutes</div>${cardio.bite ? `<div class="k">${cardio.bite} from Bite Club</div>` : ""}</div>
      </div>
      <div class="goal-bar"><i style="width:${Math.min(100, (cardio.total / Math.max(1, cardioTarget)) * 100)}%"></i></div>
    </div>`;
}

/* ---------------- Cardio logging ---------------- */
function cardioSheet(sessionId) {
  const p = me();
  const s = p.sessions.find((x) => x.id === sessionId);
  const mode = s?.cardio?.mode || p.profile.cardioModes?.[0] || "walking";
  openSheet(`${sheetTitle("Log cardio")}
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
    save(); closeSheet(); render(); toast("Cardio logged 🫀");
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
  "cardio-bite": (el) => {
    const p = me();
    const s = p.sessions.find((x) => x.id === el.dataset.id);
    const w = biteFor(p)(s.date)[Number(el.dataset.i)];
    p.cardioLogs.push({ id: uid(), date: s.date, sessionId: s.id, mode: s.cardio.mode, minutes: w.minutes, source: "bite" });
    s.status = "done";
    save(); render(); toast("Counted from Bite Club ✓");
  },
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
      <div class="food-list">${p.program.templates.map((t) => `<button class="food-item" data-act="extra-pick" data-id="${t.id}"><div class="grow"><b>${esc(t.name)}</b><div class="small muted">~${t.estMinutes} min</div></div><span>›</span></button>`).join("")}</div>`);
  },
  "extra-pick": (el) => { closeSheet(); beginWorkout(null, el.dataset.id); },
  "next-block": () => startOnboarding(me().id),
});
