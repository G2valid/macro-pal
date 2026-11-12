// Plan: week & month calendar, and the editable program.

import { ctx, me, save, render, toast, esc, today, on, openSheet, closeSheet, sheetTitle, fmtDate, fmtRest, evBadge, $ } from "./core.js";
import { EX, EXERCISES, alternativesFor, similarFor, hasEquipment } from "../domain/exercises.js";
import { MUSCLES, TRACKED_MUSCLES, PATTERNS } from "../domain/vocab.js";
import { SPLITS, weeklyVolume, estimateMinutes } from "../domain/generate.js";
import { prescriptionFor, STYLE_NOTES } from "../domain/prescribe.js";
import { addDays, weekStart, moveSession, shiftFrom, parseYmd, ymd, INTENSITY } from "../domain/schedule.js";
import { templateOf } from "../domain/history.js";
import { sessionLabel } from "./today.js";
import { CARDIO_MODES } from "./onboard.js";
import { beginWorkout, swapList } from "./workout.js";
import { exerciseSheet } from "./library.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const statusIcon = { done: "✓", skipped: "–", planned: "", missed: "!" };
const stOf = (s) => (s.status === "planned" && s.date < today() ? "missed" : s.status);

function weekView(p) {
  const ws = addDays(weekStart(today()), ctx.planWeekOffset * 7);
  return `<div class="nav-row"><button class="icon-btn" data-act="pw" data-v="-1" aria-label="Previous week">‹</button>
    <b>${fmtDate(ws, { month: "short", day: "numeric" })} – ${fmtDate(addDays(ws, 6), { month: "short", day: "numeric" })}</b>
    <button class="icon-btn" data-act="pw" data-v="1" aria-label="Next week">›</button></div>
    <div class="list">${DAYS.map((d, i) => {
      const date = addDays(ws, i);
      const ss = p.sessions.filter((s) => s.date === date);
      return `<div class="day-row ${date === today() ? "today" : ""}"><div class="dl"><b>${d}</b><span class="muted small">${parseYmd(date).getDate()}</span></div>
        <div class="grow">${ss.length ? ss.map((s) => `<button class="sess ${s.kind} ${stOf(s)}" data-act="sess" data-id="${s.id}"><span>${s.kind === "lift" ? "🏋️" : "🫀"} ${esc(sessionLabel(s))}</span><i>${statusIcon[stOf(s)] || ""}</i></button>`).join("") : `<span class="muted small">Rest</span>`}</div></div>`;
    }).join("")}</div>
    <p class="hint">Tap a session to start, move or skip it. Moving onto another workout swaps the two.</p>`;
}

function monthView(p) {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + ctx.monthOffset);
  const first = ymd(base);
  const gridStart = weekStart(first);
  const month = base.getMonth();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    if (i >= 35 && parseYmd(date).getMonth() !== month) break;
    const ss = p.sessions.filter((s) => s.date === date);
    cells.push(`<button class="mc ${parseYmd(date).getMonth() !== month ? "out" : ""} ${date === today() ? "today" : ""}" data-act="plan-day" data-date="${date}">
      <span>${parseYmd(date).getDate()}</span><div class="dots">${ss.map((s) => `<i class="${s.kind} ${stOf(s)}"></i>`).join("")}</div></button>`);
  }
  return `<div class="nav-row"><button class="icon-btn" data-act="pm" data-v="-1" aria-label="Previous month">‹</button>
    <b>${base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
    <button class="icon-btn" data-act="pm" data-v="1" aria-label="Next month">›</button></div>
    <div class="card"><div class="mgrid">${DAYS.map((d) => `<span class="mh">${d[0]}</span>`).join("")}${cells.join("")}</div>
    <div class="legend mlegend"><span><span class="ld lift"></span>Lifting</span><span><span class="ld cardio"></span>Cardio</span><span><span class="ld lift done"></span>Done</span><span><span class="ld lift missed"></span>Missed</span></div></div>`;
}

function volumeBars(p) {
  const v = weeklyVolume(p.program.templates);
  const { low, high } = p.program.volumeTargets;
  const max = Math.max(high + 4, ...Object.values(v));
  const pct = (x) => `${(x / max) * 100}%`;
  return `<div class="vbars" role="table" aria-label="Weekly sets per muscle">${TRACKED_MUSCLES.map((m) => `<div class="vb" role="row" title="${MUSCLES[m]}: ${v[m]} sets/week (target ${low}–${high})">
    <span role="cell">${MUSCLES[m]}</span>
    <div class="track"><div class="band" style="left:${pct(low)};width:${pct(high - low)}"></div><div class="fill" style="width:${pct(v[m])}"></div></div>
    <b role="cell" class="num">${v[m]}</b></div>`).join("")}</div>
    <p class="hint">Hard sets per week (exercises that work a muscle indirectly count as half). Shaded band = your target of ${low}–${high} ${evBadge("strong")}. Calves, abs and rear delts often sit below it — that's fine unless they're a priority.</p>`;
}

function programView(p) {
  const pg = p.program;
  const ev = STYLE_NOTES[pg.style];
  return `<div class="card"><div class="card-head"><h2>${SPLITS[pg.split].label}</h2><span class="meta">${pg.weeks}-week block</span></div>
      <ul class="reasons">${pg.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      <p class="small">${ev.text} ${evBadge(ev.evidence)}</p>
      ${pg.warnings.length ? `<div class="note warn">${pg.warnings.map(esc).join("<br>")}</div>` : ""}
    </div>
    <div class="card"><div class="card-head"><h2>Weekly volume</h2></div>${volumeBars(p)}</div>
    ${pg.templates.map((t) => `<div class="card">
      <div class="card-head"><h2>${esc(t.name)}</h2><span class="meta">~${estimateMinutes(t.slots)} min</span></div>
      ${t.slots.map((s, i) => `<button class="slot" data-act="slot" data-t="${t.id}" data-i="${i}">
        <div class="grow"><b>${esc(EX[s.exerciseId].name)}</b><div class="small muted">${EX[s.exerciseId].primary.map((m) => MUSCLES[m]).join(", ")}${s.priority ? " · ★ priority" : ""}</div></div>
        <div class="rxs num"><b>${s.sets} × ${s.repLow === s.repHigh ? s.repLow : `${s.repLow}–${s.repHigh}`}${s.unit === "sec" ? "s" : ""}</b><span>${s.rir} RIR · ${fmtRest(s.rest)}</span></div></button>`).join("")}
      <button class="pill-btn" data-act="slot-add" data-t="${t.id}" style="margin-top:10px">+ Add exercise</button>
    </div>`).join("")}
    <div class="card"><h3>Progression</h3><p class="small">Each exercise uses <b>double progression</b>: work within the rep range; when every set reaches the top at the planned effort, the weight goes up by the smallest step you have, and you build the reps back up. Two tough sessions in a row at the same weight → it drops ~10% and rebuilds. Pain → it never goes up. ${evBadge("practice")}</p></div>
    <button class="btn secondary" data-act="replan">Change my answers / rebuild plan</button>`;
}

export function renderPlan(el) {
  const p = me();
  el.innerHTML = `<div class="seg">${[["week", "Week"], ["month", "Month"], ["program", "Program"]].map(([k, l]) => `<button class="${ctx.planMode === k ? "on" : ""}" data-act="pmode" data-v="${k}">${l}</button>`).join("")}</div>
    ${ctx.planMode === "week" ? weekView(p) : ctx.planMode === "month" ? monthView(p) : programView(p)}`;
}

/* ---------------- Session sheet ---------------- */
function sessionSheet(id) {
  const p = me();
  const s = p.sessions.find((x) => x.id === id);
  if (!s) return;
  const t = s.kind === "lift" ? templateOf(p, s.templateId) : null;
  const st = stOf(s);
  const quick = Array.from({ length: 8 }, (_, i) => addDays(today(), i)).filter((d) => d !== s.date);
  openSheet(`${sheetTitle(esc(sessionLabel(s)))}
    <p class="muted">${fmtDate(s.date, { weekday: "long", month: "long", day: "numeric" })} · ${{ done: "Done ✓", skipped: "Skipped", missed: "Missed", planned: "Planned" }[st]}</p>
    ${t ? `<div class="card">${t.slots.map((x) => `<div class="mini-ex"><span>${esc(EX[x.exerciseId].name)}</span><span class="muted num">${x.sets} × ${x.repLow}–${x.repHigh}${x.unit === "sec" ? "s" : ""}</span></div>`).join("")}</div>` : ""}
    ${s.kind === "cardio" ? `<div class="card"><p><b>${INTENSITY[s.cardio.intensity].label}</b> · effort ${INTENSITY[s.cardio.intensity].rpe}/10 — ${INTENSITY[s.cardio.intensity].talk}</p></div>` : ""}
    ${s.status !== "done" ? `
      ${s.kind === "lift" ? `<button class="btn" data-act="start" data-id="${s.id}">${s.date === today() ? "Start workout" : "Do it today"}</button>` : `<button class="btn" data-act="cardio-log" data-id="${s.id}">Log it</button>`}
      <h3 style="margin:16px 0 8px">Move to</h3>
      <div class="chips">${quick.map((d) => `<button class="chip" data-act="sess-move" data-id="${s.id}" data-date="${d}">${d === today() ? "Today" : fmtDate(d, { weekday: "short", day: "numeric" })}</button>`).join("")}</div>
      <label class="field" style="margin-top:10px"><span>Or pick a date</span><input type="date" id="moveDate" min="${today()}"></label>
      <div class="btn-row"><button class="btn secondary" data-act="sess-move-pick" data-id="${s.id}">Move</button><button class="btn secondary" data-act="sess-shift" data-id="${s.id}">Push plan back a day</button></div>
      <button class="btn danger" data-act="sess-skip" data-id="${s.id}">${s.status === "skipped" ? "Un-skip" : "Skip this session"}</button>` : ""}`);
}

function doMove(id, date) {
  const p = me();
  const r = moveSession(p.sessions, id, date, p.program.templates);
  p.sessions = r.sessions;
  save(); closeSheet(); render();
  toast(r.warnings[0] || (r.swappedWith ? "Moved — the two sessions swapped days." : "Moved"), r.warnings.length ? 5000 : 2200);
}

/* ---------------- Slot editing ---------------- */
function recompute(p) {
  p.program.volume = weeklyVolume(p.program.templates);
  for (const t of p.program.templates) t.estMinutes = estimateMinutes(t.slots);
}

function slotSheet(tid, i) {
  const p = me();
  const t = templateOf(p, tid);
  const s = t.slots[i];
  const ex = EX[s.exerciseId];
  const alts = alternativesFor(s.exerciseId, p.profile.equipment);
  const sim = similarFor(s.exerciseId, p.profile.equipment);
  const avoid = Object.keys(p.profile.limits || {}).filter((j) => p.profile.limits[j] === "avoid");
  const num = (k, label, step = 1, min = 0) => `<label class="field"><span>${label}</span><div class="stepper"><button type="button" data-act="slot-step" data-k="${k}" data-d="${-step}" data-t="${tid}" data-i="${i}">−</button><b class="num">${k === "rest" ? fmtRest(s[k]) : s[k]}</b><button type="button" data-act="slot-step" data-k="${k}" data-d="${step}" data-t="${tid}" data-i="${i}">+</button></div></label>`;
  openSheet(`${sheetTitle(esc(ex.name))}
    <button class="link" data-act="ex-info" data-id="${ex.id}">How to do it ›</button>
    <div class="card" style="margin-top:10px">
      <div class="row2">${num("sets", "Sets")}${num("rir", "Reps in reserve")}</div>
      <div class="row2">${num("repLow", s.unit === "sec" ? "Min seconds" : "Min reps", s.unit === "sec" ? 5 : 1)}${num("repHigh", s.unit === "sec" ? "Max seconds" : "Max reps", s.unit === "sec" ? 5 : 1)}</div>
      ${num("rest", "Rest", 15)}
      <p class="hint">Reps in reserve = how many more reps you could have done. 0 is failure; 1–3 is where most productive sets land ${evBadge("moderate")}.</p>
    </div>
    <div class="btn-row"><button class="btn secondary" data-act="slot-up" data-t="${tid}" data-i="${i}" ${i === 0 ? "disabled" : ""}>Move up</button><button class="btn secondary" data-act="slot-down" data-t="${tid}" data-i="${i}" ${i === t.slots.length - 1 ? "disabled" : ""}>Move down</button></div>
    <h3 style="margin:16px 0 8px">Swap for</h3>
    ${swapList(alts, i, avoid, "slot-swap", `data-t="${tid}"`) || `<div class="empty">No same-movement alternatives with your equipment.</div>`}
    ${sim.length ? `<h3 style="margin:14px 0 8px">Similar — works the same muscles</h3>${swapList(sim, i, avoid, "slot-swap", `data-t="${tid}"`)}` : ""}
    <button class="btn danger" data-act="slot-del" data-t="${tid}" data-i="${i}" style="margin-top:12px">Remove from ${esc(t.name)}</button>`);
}

function addSheet(tid, q = "") {
  const p = me();
  const list = EXERCISES.filter((e) => hasEquipment(e, p.profile.equipment) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.some((m) => MUSCLES[m].toLowerCase().includes(q.toLowerCase()))));
  openSheet(`${sheetTitle("Add exercise")}
    <input class="input search" id="addQ" placeholder="Search by name or muscle" value="${esc(q)}" autocomplete="off">
    <div class="food-list">${list.map((e) => `<button class="food-item" data-act="slot-add-pick" data-t="${tid}" data-id="${e.id}"><div class="grow"><b>${esc(e.name)}</b><div class="small muted">${e.primary.map((m) => MUSCLES[m]).join(", ")}</div></div><span>+</span></button>`).join("")}</div>`);
  const inp = $("#addQ");
  inp.addEventListener("input", () => { const v = inp.value; addSheet(tid, v); const n = $("#addQ"); n.focus(); n.setSelectionRange(v.length, v.length); });
}

const slotOf = (el) => { const t = templateOf(me(), el.dataset.t); return { t, i: Number(el.dataset.i), s: t.slots[Number(el.dataset.i)] }; };

on({
  pmode: (el) => { ctx.planMode = el.dataset.v; render(); },
  pw: (el) => { ctx.planWeekOffset += Number(el.dataset.v); render(); },
  pm: (el) => { ctx.monthOffset += Number(el.dataset.v); render(); },
  sess: (el) => sessionSheet(el.dataset.id),
  "plan-day": (el) => {
    const ss = me().sessions.filter((s) => s.date === el.dataset.date);
    if (ss.length === 1) return sessionSheet(ss[0].id);
    if (!ss.length) return toast(`${fmtDate(el.dataset.date)}: rest day`);
    openSheet(`${sheetTitle(fmtDate(el.dataset.date))}<div class="food-list">${ss.map((s) => `<button class="food-item" data-act="sess" data-id="${s.id}"><div class="grow"><b>${esc(sessionLabel(s))}</b></div><span>›</span></button>`).join("")}</div>`);
  },
  "sess-move": (el) => doMove(el.dataset.id, el.dataset.date),
  "sess-move-pick": (el) => { const d = $("#moveDate").value; if (!d) return toast("Pick a date first"); doMove(el.dataset.id, d); },
  "sess-shift": (el) => { const p = me(); p.sessions = shiftFrom(p.sessions, el.dataset.id, 1); save(); closeSheet(); render(); toast("This and every later session moved back a day."); },
  "sess-skip": (el) => { const s = me().sessions.find((x) => x.id === el.dataset.id); s.status = s.status === "skipped" ? "planned" : "skipped"; save(); closeSheet(); render(); },
  slot: (el) => slotSheet(el.dataset.t, Number(el.dataset.i)),
  "slot-step": (el) => {
    const { s, t, i } = slotOf(el);
    const k = el.dataset.k, d = Number(el.dataset.d);
    const lim = { sets: [1, 8], rir: [0, 5], repLow: [1, 60], repHigh: [1, 120], rest: [15, 300] }[k];
    s[k] = Math.max(lim[0], Math.min(lim[1], s[k] + d));
    if (s.repLow > s.repHigh) { if (k === "repLow") s.repHigh = s.repLow; else s.repLow = s.repHigh; }
    recompute(me()); save(); slotSheet(t.id, i); render();
  },
  "slot-up": (el) => { const { t, i } = slotOf(el); [t.slots[i - 1], t.slots[i]] = [t.slots[i], t.slots[i - 1]]; save(); slotSheet(t.id, i - 1); render(); },
  "slot-down": (el) => { const { t, i } = slotOf(el); [t.slots[i + 1], t.slots[i]] = [t.slots[i], t.slots[i + 1]]; save(); slotSheet(t.id, i + 1); render(); },
  "slot-swap": (el) => { const { s } = slotOf(el); s.exerciseId = el.dataset.id; s.pattern = EX[el.dataset.id].pattern; recompute(me()); save(); closeSheet(); render(); toast(`Swapped to ${EX[el.dataset.id].name}`); },
  "slot-del": (el) => {
    const { t, i, s } = slotOf(el);
    if (t.slots.length <= 1) return toast("A session needs at least one exercise.");
    if (!confirm(`Remove ${EX[s.exerciseId].name}?`)) return;
    t.slots.splice(i, 1); recompute(me()); save(); closeSheet(); render();
  },
  "slot-add": (el) => addSheet(el.dataset.t),
  "slot-add-pick": (el) => {
    const p = me();
    const t = templateOf(p, el.dataset.t);
    const ex = EX[el.dataset.id];
    const rx = prescriptionFor({ pattern: ex.pattern, role: "accessory", load: ex.load, style: p.program.style, experience: p.profile.experience });
    t.slots.push({ id: `s${Date.now().toString(36)}`, pattern: ex.pattern, role: "accessory", exerciseId: ex.id, ...rx });
    recompute(p); save(); closeSheet(); render(); toast(`Added ${ex.name}`);
  },
  replan: () => import("./onboard.js").then((m) => m.startOnboarding(me().id)),
});
