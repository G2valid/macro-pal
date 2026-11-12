// Live workout: fast logging with prefilled targets, rest timer and autosave.

import { ctx, me, save, render, toast, esc, uid, today, $, on, openSheet, closeSheet, sheetTitle, fmtDur, fmtRest, fmtDate } from "./core.js";
import { EX, alternativesFor } from "../domain/exercises.js";
import { MUSCLES } from "../domain/vocab.js";
import { startWorkout, exerciseEntry, exerciseHistory, workoutSummary, templateOf } from "../domain/history.js";
import { adjustNextSet, detectPRs, workingSets } from "../domain/progression.js";
import { isWeighted, warmupSets, platesPerSide, fmtLb, DEFAULT_LOADS } from "../domain/loads.js";
import { fitToTime, estimateMinutes } from "../domain/generate.js";
import { exerciseSheet } from "./library.js";

const RIR_OPTS = [["", "RIR"], ["0", "0 · max"], ["1", "1 left"], ["2", "2 left"], ["3", "3 left"], ["4", "4+ left"]];

export function beginWorkout(sessionId, templateId = null) {
  const p = me();
  if (p.active) { ctx.tab = "workout"; render(); return; }
  const session = sessionId ? p.sessions.find((s) => s.id === sessionId) : null;
  const log = startWorkout(p, { session, templateId, today: today(), id: uid() });
  if (!log) return toast("Couldn't find that workout.");
  p.active = log;
  save();
  ctx.tab = "workout";
  render();
  window.scrollTo(0, 0);
}

const repsText = (rx) => `${rx.repLow === rx.repHigh ? rx.repLow : `${rx.repLow}–${rx.repHigh}`}${rx.unit === "sec" ? " s" : ""}`;

function targetLine(e) {
  const t = e.target;
  const ex = EX[e.exerciseId];
  const w = isWeighted(ex.load);
  const unit = e.rx.unit === "sec" ? " s" : " reps";
  let head;
  switch (t.action) {
    case "calibrate": head = w ? "Find your starting weight" : `Aim for ${repsText(e.rx)}`; break;
    case "increase": head = `↑ ${fmtLb(t.weight)} × ${t.reps}+`; break;
    case "reduce": head = `↓ ${fmtLb(t.weight)} × ${t.reps}+`; break;
    case "pain": head = `🩹 Keep it at ${fmtLb(t.weight)} or lighter`; break;
    case "level_up": head = `⬆ Ready for ${EX[t.exerciseId]?.name}`; break;
    default: head = w ? `${fmtLb(t.weight)} × ${t.reps}${unit}` : `${t.reps}${unit} per set`;
  }
  return `<details class="target t-${t.action}"><summary><b>${head}</b><span class="why-tag">why?</span></summary><p>${esc(t.why)}</p>
    ${t.action === "level_up" ? `<button class="pill-btn" data-act="wk-levelup" data-i="${e._i}">Switch to ${esc(EX[t.exerciseId].name)}</button>` : ""}</details>`;
}

function lastTime(e) {
  const h = exerciseHistory(me(), e.exerciseId)[0];
  if (!h) return "";
  const sets = workingSets(h);
  const w = isWeighted(EX[e.exerciseId].load);
  return `<div class="last small muted">Last (${fmtDate(h.date, { month: "short", day: "numeric" })}): ${sets.map((s) => (w ? `${s.weight}×${s.reps}` : `${s.reps}`)).join(" · ")}${h.pain ? " · 🩹" : ""}</div>`;
}

function warmups(e) {
  const ex = EX[e.exerciseId];
  if (e.role !== "main" || !isWeighted(ex.load)) return "";
  const w = e.sets.find((s) => s.weight > 0)?.weight;
  if (!w) return "";
  const loads = me().loads || DEFAULT_LOADS;
  const ws = warmupSets(w, ex.load, loads);
  if (!ws.length) return "";
  const plates = (x) => { const r = platesPerSide(x, loads.bar); return r.plates.length ? ` <span class="muted">(${r.plates.join("+")}/side)</span>` : ` <span class="muted">(bar)</span>`; };
  return `<details class="warm small"><summary>Warm-up sets</summary>${ws.map((s) => `<div>${s.weight} lb × ${s.reps}${ex.load === "barbell" ? plates(s.weight) : ""}</div>`).join("")}
    ${ex.load === "barbell" ? `<div style="margin-top:4px">Working: ${w} lb${plates(w)}</div>` : ""}</details>`;
}

function setRow(e, i, s, j) {
  const ex = EX[e.exerciseId];
  const w = isWeighted(ex.load);
  const sec = e.rx.unit === "sec";
  return `<div class="set-row ${s.done ? "done" : ""}">
    <span class="sn">${j + 1}</span>
    ${w ? `<label class="cell"><input type="number" inputmode="decimal" step="any" data-wk="weight" data-i="${i}" data-j="${j}" value="${s.weight ?? ""}" placeholder="lb" ${s.done ? "disabled" : ""}><small>lb</small></label>` : `<span class="cell bw">${ex.load === "band" ? "band" : sec ? "" : "BW"}</span>`}
    <label class="cell"><input type="number" inputmode="numeric" data-wk="reps" data-i="${i}" data-j="${j}" value="${s.reps ?? ""}" placeholder="${s.target ?? e.rx.repLow}" ${s.done ? "disabled" : ""}><small>${sec ? "sec" : "reps"}</small></label>
    <select data-wk="rir" data-i="${i}" data-j="${j}" aria-label="Reps in reserve" ${s.done ? "disabled" : ""}>${RIR_OPTS.map(([v, l]) => `<option value="${v}" ${String(s.rir ?? "") === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <button class="chk" data-act="wk-set" data-i="${i}" data-j="${j}" aria-label="${s.done ? "Undo set" : "Complete set"}">${s.done ? "✓" : ""}</button>
  </div>`;
}

export function renderWorkout(el) {
  const p = me();
  const log = p?.active;
  if (!log) { ctx.tab = "today"; render(); return; }
  const total = log.exercises.reduce((t, e) => t + e.sets.length, 0);
  const done = log.exercises.reduce((t, e) => t + e.sets.filter((s) => s.done).length, 0);
  el.innerHTML = `
    <div class="wk-head card">
      <div><h2>${esc(log.name)}</h2><span class="muted small"><span id="wkElapsed" class="num">${fmtDur((Date.now() - log.startedAt) / 1000)}</span> · ${done}/${total} sets</span></div>
      <button class="pill-btn" data-act="wk-short">⏱ Short on time</button>
    </div>
    ${log.easeIn ? `<div class="note">Ease-in week: 2 sets per exercise, stopping with 3+ reps in reserve. Focus on smooth technique — the volume comes up next week.</div>` : ""}
    ${log.trimNotes?.length ? `<div class="note">Trimmed to fit your time: ${log.trimNotes.map(esc).join(" ")}</div>` : ""}
    ${log.exercises.map((e, i) => {
      e._i = i;
      const ex = EX[e.exerciseId];
      const doneSets = e.sets.filter((s) => s.done).length;
      return `<div class="card ex-card ${doneSets === e.sets.length ? "complete" : ""}" id="ex-${i}">
        <div class="ex-head">
          <button class="ex-name" data-act="ex-info" data-id="${ex.id}"><h3>${esc(ex.name)}</h3><span class="muted small">${ex.primary.map((m) => MUSCLES[m]).join(", ")} · how-to ›</span></button>
          <span class="badge">${doneSets}/${e.sets.length}</span>
        </div>
        <div class="rx small">${e.sets.length} × ${repsText(e.rx)} · ~${e.rx.rir} in reserve · rest ${fmtRest(e.rx.rest)}${ex.uni ? " · each side" : ""}</div>
        ${targetLine(e)}
        ${lastTime(e)}
        ${warmups(e)}
        <div class="sets">${e.sets.map((s, j) => setRow(e, i, s, j)).join("")}</div>
        ${e.adjust ? `<div class="adjust small">${esc(e.adjust.why)} <button class="pill-btn" data-act="wk-apply" data-i="${i}">Use ${e.adjust.weight} lb</button></div>` : ""}
        <div class="ex-actions">
          <button data-act="wk-addset" data-i="${i}">+ Set</button>
          <button data-act="wk-swap" data-i="${i}">⇄ Swap</button>
          <button data-act="wk-pain" data-i="${i}" class="${e.pain ? "on" : ""}">🩹 ${e.pain ? "Pain noted" : "Pain"}</button>
        </div>
      </div>`;
    }).join("")}
    <div class="card"><label class="field" style="margin:0"><span>Workout notes</span><textarea data-wk="notes" rows="2" placeholder="How did it go?">${esc(log.notes)}</textarea></label></div>
    <button class="btn" data-act="wk-finish">Finish workout</button>
    <button class="btn danger" data-act="wk-discard">Discard workout</button>`;
}

/** Field edits during a workout: update and autosave without re-rendering. */
export function workoutInput(e) {
  const t = e.target;
  const k = t.dataset.wk;
  if (!k) return false;
  const log = me()?.active;
  if (!log) return true;
  if (k === "notes") { log.notes = t.value; save(); return true; }
  const s = log.exercises[Number(t.dataset.i)].sets[Number(t.dataset.j)];
  const v = t.value === "" ? null : Number(t.value);
  s[k] = k === "rir" ? (t.value === "" ? null : v) : v;
  save();
  return true;
}

/* ---------------- Rest timer ---------------- */
let audio = null;
export function startRest(sec, label) {
  ctx.rest = { endAt: Date.now() + sec * 1000, total: sec, label };
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
  tickRest();
}
function beep() {
  try {
    if (!audio) return;
    for (const [f, t] of [[880, 0], [1175, 0.18]]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, audio.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.16);
      o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.18);
    }
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}
export function tickRest() {
  const bar = $("#restBar");
  if (!ctx.rest) { bar.hidden = true; return; }
  const left = Math.ceil((ctx.rest.endAt - Date.now()) / 1000);
  if (left <= 0) {
    ctx.rest = null; bar.hidden = true; beep(); toast("Rest done — next set 💪");
    return;
  }
  bar.hidden = false;
  $("#restTime").textContent = fmtDur(left);
  $("#restLabel").textContent = ctx.rest.label || "Rest";
  $("#restFill").style.width = `${Math.max(0, Math.min(100, (left / ctx.rest.total) * 100))}%`;
}

/* ---------------- Actions ---------------- */
const log = () => me()?.active;

on({
  "wk-set": (el) => {
    const p = me(), L = log();
    const i = Number(el.dataset.i), j = Number(el.dataset.j);
    const e = L.exercises[i];
    const s = e.sets[j];
    const ex = EX[e.exerciseId];
    if (s.done) { s.done = false; e.adjust = null; save(); render(); return; }
    // Read the current inputs (iOS may not have fired "input" yet).
    for (const k of ["weight", "reps", "rir"]) {
      const inp = document.querySelector(`[data-wk="${k}"][data-i="${i}"][data-j="${j}"]`);
      if (inp && inp.value !== "") s[k] = Number(inp.value);
    }
    if (s.reps == null) s.reps = s.target ?? e.rx.repLow;
    if (isWeighted(ex.load) && !(s.weight > 0)) { toast("Enter the weight first"); return; }
    s.done = true;
    s.at = Date.now();
    // PRs against everything before today.
    const prs = detectPRs(s, exerciseHistory(p, e.exerciseId), e.exerciseId);
    if (prs.length) { (L.prs ||= []).push({ exerciseId: e.exerciseId, ...prs[0] }); toast(`🏆 ${ex.name}: ${prs[0].label}`, 3500); }
    // Carry the weight forward to later sets that weren't changed.
    for (const later of e.sets.slice(j + 1)) if (!later.done && (later.weight == null || later.weight === e.target.weight)) later.weight = s.weight;
    // Too easy / too hard? Suggest a better weight for the next set.
    const nextOpen = e.sets.find((x) => !x.done);
    e.adjust = nextOpen ? adjustNextSet(s, e.rx, ex.load, p.loads) : null;
    save();
    const lastOfAll = L.exercises.every((x) => x.sets.every((y) => y.done));
    if (lastOfAll) { ctx.rest = null; toast("All sets done — tap Finish workout 🎉", 3000); }
    else startRest(nextOpen ? e.rx.rest : 90, nextOpen ? `${ex.name} · set ${e.sets.indexOf(nextOpen) + 1} next` : "Next exercise");
    render();
  },
  "wk-apply": (el) => {
    const e = log().exercises[Number(el.dataset.i)];
    for (const s of e.sets) if (!s.done) s.weight = e.adjust.weight;
    e.adjust = null; save(); render();
  },
  "wk-addset": (el) => {
    const e = log().exercises[Number(el.dataset.i)];
    const prev = e.sets[e.sets.length - 1];
    e.sets.push({ weight: prev?.weight ?? null, reps: null, target: prev?.target ?? e.rx.repLow, rir: null, done: false });
    save(); render();
  },
  "wk-pain": (el) => {
    const e = log().exercises[Number(el.dataset.i)];
    e.pain = !e.pain;
    save(); render();
    if (e.pain) toast("Noted. Stop this exercise if the pain is sharp — next time the weight won't go up, and you can swap it.", 4500);
  },
  "wk-swap": (el) => swapSheet(Number(el.dataset.i)),
  "wk-levelup": (el) => {
    const i = Number(el.dataset.i);
    replaceExercise(i, log().exercises[i].target.exerciseId, true);
  },
  "wk-swap-pick": (el) => {
    const keep = $("#swapKeep")?.checked;
    replaceExercise(Number(el.dataset.i), el.dataset.id, keep);
    closeSheet();
  },
  "wk-short": () => {
    openSheet(`${sheetTitle("Short on time?")}
      <p class="muted">How many minutes do you have left? Exercises you haven't started are trimmed — accessories go first, your main lifts stay.</p>
      <div class="chips">${[15, 20, 25, 30, 40, 50].map((m) => `<button class="chip" data-act="wk-trim" data-v="${m}">${m} min</button>`).join("")}</div>`);
  },
  "wk-trim": (el) => {
    const L = log();
    const minutes = Number(el.dataset.v);
    const started = L.exercises.filter((e) => e.sets.some((s) => s.done));
    const open = L.exercises.filter((e) => !e.sets.some((s) => s.done));
    // Minutes still needed to finish exercises already started (~40 s per set plus rest).
    const startedLeft = started.reduce((t, e) => t + e.sets.filter((s) => !s.done).length * (40 + e.rx.rest), 0) / 60;
    // estimateMinutes includes a 5-minute warm-up; if you've started, you're already warm.
    const budget = Math.max(3, minutes - startedLeft + (started.length ? 5 : 0));
    const slots = open.map((e) => ({ id: e.id, exerciseId: e.exerciseId, role: e.role, ...e.rx, sets: e.sets.length }));
    const fit = fitToTime(slots, budget);
    const keep = new Map(fit.slots.map((s) => [s.id, s]));
    L.exercises = L.exercises.filter((e) => started.includes(e) || keep.has(e.id));
    for (const e of L.exercises) {
      const s = keep.get(e.id);
      if (!s) continue;
      e.sets = e.sets.slice(0, s.sets);
      e.rx = { ...e.rx, rest: s.rest };
    }
    L.trimNotes = fit.notes.length ? fit.notes : ["Everything fits — no changes needed."];
    save(); closeSheet(); render(); window.scrollTo(0, 0);
  },
  "wk-finish": () => {
    const L = log();
    const sum = workoutSummary({ ...L, endedAt: Date.now() });
    if (!sum.sets) return toast("Log at least one set, or discard the workout.");
    const skipped = L.exercises.filter((e) => !e.sets.some((s) => s.done)).length;
    openSheet(`${sheetTitle("Finish workout?")}
      <div class="stats3"><div class="stat"><div class="v">${sum.minutes}</div><div class="k">minutes</div></div>
      <div class="stat"><div class="v">${sum.sets}</div><div class="k">sets</div></div>
      <div class="stat"><div class="v">${sum.volume.toLocaleString()}</div><div class="k">lb lifted</div></div></div>
      ${L.prs?.length ? `<div class="note" style="margin-top:12px">🏆 ${L.prs.map((p) => `<b>${esc(EX[p.exerciseId].name)}</b> — ${esc(p.label)}`).join("<br>🏆 ")}</div>` : ""}
      ${skipped ? `<p class="muted small" style="margin-top:12px">${skipped} exercise${skipped > 1 ? "s" : ""} not done — that's fine; they're simply skipped.</p>` : ""}
      <button class="btn" data-act="wk-save" style="margin-top:12px">Save workout</button>
      <button class="btn secondary" data-act="close">Keep going</button>`);
  },
  "wk-save": () => {
    const p = me(), L = p.active;
    L.endedAt = Date.now();
    L.status = "done";
    L.date = L.date || today();
    for (const e of L.exercises) delete e._i;
    p.logs.push(L);
    const s = p.sessions.find((x) => x.id === L.sessionId);
    if (s) { s.status = "done"; s.logId = L.id; }
    p.active = null;
    ctx.rest = null;
    save(); closeSheet();
    ctx.tab = "today"; render();
    toast("Workout saved 💪");
  },
  "wk-discard": () => {
    if (!confirm("Discard this workout? Nothing from it will be saved.")) return;
    me().active = null; ctx.rest = null; save(); ctx.tab = "today"; render();
  },
  "rest-add": (el) => { if (ctx.rest) { ctx.rest.endAt += Number(el.dataset.v) * 1000; ctx.rest.total = Math.max(ctx.rest.total, (ctx.rest.endAt - Date.now()) / 1000); tickRest(); } },
  "rest-skip": () => { ctx.rest = null; tickRest(); },
  "ex-info": (el) => exerciseSheet(el.dataset.id),
});

function swapSheet(i) {
  const p = me();
  const e = log().exercises[i];
  const alts = alternativesFor(e.exerciseId, p.profile.equipment);
  const avoid = Object.keys(p.profile.limits || {}).filter((j) => p.profile.limits[j] === "avoid");
  openSheet(`${sheetTitle(`Swap ${esc(EX[e.exerciseId].name)}`)}
    <p class="muted small">Same movement pattern, so the plan stays balanced. Sets, reps and rest carry over.</p>
    <label class="toggle-row card" style="margin-bottom:10px"><span>Also change it in my plan</span><input type="checkbox" id="swapKeep"></label>
    <div class="food-list">${alts.map((a) => `<button class="food-item" data-act="wk-swap-pick" data-i="${i}" data-id="${a.id}">
      <div class="grow"><b>${esc(a.name)}</b><div class="small muted">${["", "Beginner", "Intermediate", "Advanced"][a.level]}${a.joints.some((j) => avoid.includes(j)) ? " · ⚠️ loads an area you're avoiding" : ""}</div></div><span>›</span></button>`).join("") || `<div class="empty">No alternatives with your equipment.</div>`}</div>`);
}

function replaceExercise(i, newId, permanent) {
  const p = me(), L = log();
  const old = L.exercises[i];
  const slot = { id: old.slotId, exerciseId: newId, role: old.role, ...old.rx };
  const fresh = exerciseEntry(p, slot, { today: today(), id: old.id });
  fresh.sets = fresh.sets.slice(0, old.sets.length);
  while (fresh.sets.length < old.sets.length) fresh.sets.push({ ...fresh.sets[0] });
  L.exercises[i] = fresh;
  if (permanent) {
    const t = templateOf(p, L.templateId);
    const s = t?.slots.find((x) => x.id === old.slotId);
    if (s) s.exerciseId = newId;
  }
  save(); render();
  toast(permanent ? `Swapped to ${EX[newId].name} — plan updated` : `Swapped to ${EX[newId].name} for today`);
}
