// Runs the personal trainer inside Bite Club's Fitness tab.
//
// Bite Club calls initTraining(host) once, then trainingHome()/renderTrainingView()
// from its own renderFitness(). The trainer keeps its set-by-set history and
// plan in IndexedDB; Bite Club's workout log stays the single list of workouts.

import { ctx, initState, me, save, setRender, actions, closeSheet, sheetOpen, today, fmtDur, esc } from "./ui/core.js";
import { setBiteHost, biteProfiles } from "./store.js";
import { renderOnboarding, onboardInput, ob } from "./ui/onboard.js";
import { trainingHome } from "./ui/today.js";
import { renderWorkout, workoutInput, tickRest, syncWakeLock } from "./ui/workout.js";
import { renderPlan, planInput } from "./ui/plan.js";
import { renderLibrary, libraryInput } from "./ui/library.js";
import { renderProgress, progressInput, chartHover, logSheet } from "./ui/progress.js";
import { syncAll } from "./ui/sync.js";
import { weekStart, addDays } from "./domain/schedule.js";

let ready = false;
const TITLES = { plan: "My plan", library: "Exercises", progress: "Strength stats", onboard: "Your training plan", workout: "" };

/** Point the trainer at the Bite Club profile that's active right now. */
function follow() {
  const id = ctx.host.activeId();
  if (ctx.state.activeId !== id) {
    ctx.state.activeId = id;
    if (ctx.tab !== "onboard") ctx.tab = me()?.active ? "workout" : "today";
  }
}

export async function initTraining(host) {
  ctx.host = host;
  setBiteHost(host);
  await initState();
  // People set up in the old separate trainer without a Bite Club link: match by name.
  const bites = biteProfiles();
  for (const p of Object.values(ctx.state.people)) {
    if (!p.biteId) {
      const b = bites.find((x) => x.name.trim().toLowerCase() === (p.name || "").trim().toLowerCase() && !ctx.state.people[x.id]);
      if (b) { delete ctx.state.people[p.id]; p.id = b.id; p.biteId = b.id; ctx.state.people[b.id] = p; }
    }
  }
  setRender(() => host.rerender());
  ready = true;
  follow();
  if (me()?.active) ctx.tab = "workout";
  const n = syncAll(); // copy anything finished in the old trainer into the Fitness log
  save();
  wire();
  return n;
}

export const trainingReady = () => ready;

/** Is a full-screen trainer view (plan, workout, …) showing instead of the Fitness home? */
export function inTrainingView() {
  if (!ready) return false;
  follow();
  if (ctx.tab === "onboard") return !!ob;
  if (ctx.tab === "workout") return !!me()?.active;
  return ["plan", "library", "progress"].includes(ctx.tab) && !!me();
}

/** The trainer's card(s) at the top of the Fitness tab. */
export function trainingSection(date) {
  if (!ready) return "";
  follow();
  return trainingHome(date);
}

export function renderTrainingView(el) {
  follow();
  const body = document.createElement("div");
  body.className = "tc tc-stack";
  if (ctx.tab === "onboard") renderOnboarding(body);
  else if (ctx.tab === "workout") renderWorkout(body);
  else if (ctx.tab === "plan") renderPlan(body);
  else if (ctx.tab === "library") renderLibrary(body);
  else if (ctx.tab === "progress") renderProgress(body);
  el.innerHTML = ctx.tab === "onboard" ? ""
    : `<div class="tc sub-head"><button class="back" data-ta="tab" data-v="today">‹ Fitness</button><h2>${TITLES[ctx.tab]}</h2><span>${ctx.tab === "workout" ? `<small class="muted">keeps running</small>` : ""}</span></div>`;
  el.append(body);
  document.body.classList.toggle("tc-workout", ctx.tab === "workout");
  syncWakeLock(!!me()?.active);
}

/** Leaving the Fitness tab: drop back to its home (an open workout stays open). */
export function leaveTraining() {
  if (ctx.tab !== "workout" && ctx.tab !== "onboard") ctx.tab = "today";
  document.body.classList.remove("tc-workout");
}

/** Planned sessions this week (Mon–Sun), for Bite Club's weekly ring. */
export function plannedThisWeek(startDate = weekStart(today())) {
  if (!ready) return null;
  follow();
  const p = me();
  if (!p) return null;
  const end = addDays(startDate, 6);
  const n = p.sessions.filter((s) => s.date >= startDate && s.date <= end && s.status !== "skipped").length;
  return n || null;
}

/** A Fitness-log entry written by the trainer: show its sets instead of the edit form. */
export function openTrainerWorkout(id) {
  if (!ready || !id?.startsWith("tc-")) return false;
  const p = me();
  const log = p?.logs.find((l) => `tc-${l.id}` === id);
  if (!log) return false;
  logSheet(log.id);
  return true;
}

/** A workout was deleted from the Fitness log: keep the plan in step. */
export function workoutDeleted(id) {
  if (!ready) return;
  const p = me();
  if (!p) return;
  let changed = false;
  if (id?.startsWith("tc-")) {
    const rid = id.slice(3);
    const before = p.logs.length + p.cardioLogs.length;
    p.logs = p.logs.filter((l) => l.id !== rid);
    p.cardioLogs = p.cardioLogs.filter((c) => c.id !== rid);
    changed = p.logs.length + p.cardioLogs.length !== before;
    for (const s of p.sessions) if (s.logId === rid) { s.status = "planned"; delete s.logId; changed = true; }
  }
  for (const s of p.sessions) if (s.countedFrom === id) { s.status = "planned"; delete s.countedFrom; changed = true; }
  if (changed) save();
}

/** Everything the trainer stores, for Bite Club's backup file. */
export const trainingBackup = () => (ready ? JSON.parse(JSON.stringify(ctx.state)) : null);
export function restoreTraining(data) {
  if (!ready || !data?.people) return;
  ctx.state = { version: 1, activeId: null, ...data };
  ctx.tab = "today";
  save();
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-ta]");
    if (!el) return;
    const act = el.dataset.ta;
    if (act === "close") { closeSheet(); return; }
    if (act === "tab") {
      if (sheetOpen()) closeSheet();
      ctx.tab = el.dataset.v;
      if (el.dataset.v === "plan") ctx.planWeekOffset = 0;
      document.body.classList.remove("tc-workout");
      ctx.host.rerender(); window.scrollTo(0, 0);
      return;
    }
    const fn = actions[act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener("input", (e) => { onboardInput(e) || workoutInput(e) || libraryInput(e) || progressInput(e) || planInput(e); });
  document.addEventListener("pointermove", chartHover);
  document.addEventListener("pointerdown", chartHover);
  setInterval(() => {
    tickRest();
    const el = document.getElementById("wkElapsed");
    const a = me()?.active;
    if (el && a) el.textContent = fmtDur((Date.now() - a.startedAt) / 1000);
  }, 500);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncWakeLock(!!me()?.active); });
}
