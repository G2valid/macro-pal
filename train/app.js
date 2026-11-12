// Training Coach — entry point. Wires events and routes between views.

import { ctx, initState, me, save, render, setRender, actions, $, esc, applyTheme, closeSheet, sheetOpen, today, toast, fmtDur } from "./ui/core.js";
import { requestPersistence } from "./store.js";
import { renderOnboarding, startOnboarding, onboardInput, ob } from "./ui/onboard.js";
import { renderToday } from "./ui/today.js";
import { renderWorkout, workoutInput, tickRest, syncWakeLock } from "./ui/workout.js";
import { renderPlan } from "./ui/plan.js";
import { renderLibrary, libraryInput } from "./ui/library.js";
import { renderProgress, progressInput, chartHover } from "./ui/progress.js";
import { renderSettings, importBackup } from "./ui/settings.js";
import { markMissed } from "./domain/schedule.js";

const VIEWS = { today: renderToday, workout: renderWorkout, plan: renderPlan, library: renderLibrary, progress: renderProgress, settings: renderSettings };

function draw() {
  const p = me();
  if (!p && ctx.tab !== "onboard") { startOnboarding(); return; }
  if (ctx.tab === "onboard" && !ob) ctx.tab = "today";
  const view = $("#view");
  const onboarding = ctx.tab === "onboard";
  document.body.classList.toggle("onboarding", onboarding);
  document.body.classList.toggle("in-workout", ctx.tab === "workout");
  $("#tabbar").hidden = onboarding;
  $("#profileChip").innerHTML = p ? `<span class="avatar">${esc(p.name[0] || "?")}</span><span>${esc(p.name)}</span>` : "";
  $("#profileChip").style.visibility = !p || onboarding ? "hidden" : "visible";
  for (const t of document.querySelectorAll(".tab")) t.classList.toggle("active", t.dataset.v === ctx.tab || (ctx.tab === "workout" && t.dataset.v === "today"));
  if (onboarding) renderOnboarding(view);
  else (VIEWS[ctx.tab] || renderToday)(view);
  syncWakeLock(!!me()?.active);
}
setRender(draw);

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act === "close") return closeSheet();
  if (act === "tab") {
    if (sheetOpen()) closeSheet();
    ctx.tab = el.dataset.v === "today" && me()?.active ? "workout" : el.dataset.v;
    if (el.dataset.v === "plan") ctx.planWeekOffset = 0;
    render(); window.scrollTo(0, 0); return;
  }
  const fn = actions[act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener("input", (e) => { onboardInput(e) || workoutInput(e) || libraryInput(e) || progressInput(e); });
document.addEventListener("pointermove", chartHover);
document.addEventListener("pointerdown", chartHover);
$("#backdrop").addEventListener("click", closeSheet);
$("#profileChip").addEventListener("click", () => { ctx.tab = "settings"; render(); });
$("#importInput").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) importBackup(f); });

// Clock: rest timer and the workout's elapsed time.
setInterval(() => {
  tickRest();
  const el = document.getElementById("wkElapsed");
  const a = me()?.active;
  if (el && a) el.textContent = fmtDur((Date.now() - a.startedAt) / 1000);
}, 500);

// Coming back to the app (e.g. next day): refresh "today" and the theme.
let lastDay = today();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  syncWakeLock(!!me()?.active); // iOS releases the lock when the app is backgrounded
  applyTheme(); // Bite Club theme may have changed
  if (today() !== lastDay) { lastDay = today(); if (ctx.tab !== "workout" && ctx.tab !== "onboard") render(); }
});

(async function boot() {
  await initState();
  // Sessions in the past that were never done are shown as missed (kept as "planned" in storage).
  if (ctx.state.activeId && !ctx.state.people[ctx.state.activeId]) ctx.state.activeId = Object.keys(ctx.state.people)[0] || null;
  if (me()?.active) ctx.tab = "workout";
  applyTheme();
  render();
  requestPersistence();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
})();
