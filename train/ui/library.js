// Exercise library: search, filters, muscle selector, and the detail sheet.

import { ctx, me, save, render, esc, on, openSheet, sheetTitle, $ } from "./core.js";
import { EXERCISES, EX, alternativesFor, hasEquipment } from "../domain/exercises.js";
import { MUSCLES, PATTERNS, EQUIPMENT, LEVELS, JOINTS } from "../domain/vocab.js";
import { personalRecords } from "../domain/history.js";

const GROUPS = {
  Upper: ["chest", "front_delts", "side_delts", "rear_delts", "lats", "upper_back", "biceps", "triceps", "forearms"],
  Lower: ["glutes", "quads", "hamstrings", "adductors", "calves"],
  Core: ["abs", "obliques", "lower_back"],
};

function matches(e, q) {
  if (!q) return true;
  const hay = `${e.name} ${e.primary.map((m) => MUSCLES[m]).join(" ")} ${PATTERNS[e.pattern].label} ${e.equip.map((x) => EQUIPMENT[x]).join(" ")}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function renderLibrary(el) {
  const p = me();
  const equip = p?.profile?.equipment;
  const list = EXERCISES.filter((e) =>
    matches(e, ctx.libQuery) &&
    (!ctx.libMuscle || e.primary.includes(ctx.libMuscle) || e.secondary.includes(ctx.libMuscle)) &&
    (!ctx.libPattern || e.pattern === ctx.libPattern) &&
    (!ctx.libMine || !equip || hasEquipment(e, equip)))
    .sort((a, b) => (ctx.libMuscle ? Number(b.primary.includes(ctx.libMuscle)) - Number(a.primary.includes(ctx.libMuscle)) : 0) || a.level - b.level || a.name.localeCompare(b.name));
  el.innerHTML = `
    <input class="input search" type="search" placeholder="Search ${EXERCISES.length} exercises" value="${esc(ctx.libQuery)}" data-lib="q" autocomplete="off">
    <div class="card">
      <div class="card-head"><h2>Explore by muscle</h2>${ctx.libMuscle ? `<button class="pill-btn" data-ta="lib-muscle" data-v="">Clear</button>` : ""}</div>
      ${Object.entries(GROUPS).map(([g, ms]) => `<div class="mgroup"><span class="section-label">${g}</span><div class="chips">${ms.map((m) => `<button class="chip ${ctx.libMuscle === m ? "on" : ""}" data-ta="lib-muscle" data-v="${m}">${MUSCLES[m]}</button>`).join("")}</div></div>`).join("")}
    </div>
    <div class="filter-row">
      <select data-lib="pattern" class="input"><option value="">All movements</option>${Object.entries(PATTERNS).map(([k, v]) => `<option value="${k}" ${ctx.libPattern === k ? "selected" : ""}>${v.label}</option>`).join("")}</select>
      ${equip ? `<label class="toggle-inline"><input type="checkbox" data-lib="mine" ${ctx.libMine ? "checked" : ""}> My equipment</label>` : ""}
    </div>
    <div class="food-list">${list.map((e) => `<button class="food-item" data-ta="ex-info" data-id="${e.id}">
      <div class="grow"><b>${esc(e.name)}</b><div class="small muted">${e.primary.map((m) => MUSCLES[m]).join(", ")} · ${e.equip.length ? e.equip.map((x) => EQUIPMENT[x].split(" (")[0]).join(", ") : "No equipment"}</div></div>
      <span class="lvl lvl${e.level}">${LEVELS[e.level]}</span></button>`).join("") || `<div class="empty">No exercises match.</div>`}</div>`;
}

export function exerciseSheet(id) {
  const e = EX[id];
  if (!e) return;
  const p = me();
  const pr = p ? personalRecords(p)[id] : null;
  const alts = alternativesFor(id, p?.profile?.equipment).slice(0, 6);
  const disliked = p?.profile?.disliked?.includes(id);
  const link = (x) => `<button class="link" data-ta="ex-info" data-id="${x}">${esc(EX[x].name)}</button>`;
  openSheet(`${sheetTitle(esc(e.name))}
    <div class="chips" style="margin-bottom:12px"><span class="lvl lvl${e.level}">${LEVELS[e.level]}</span><span class="badge">${PATTERNS[e.pattern].label}</span>${e.uni ? `<span class="badge">One side at a time</span>` : ""}</div>
    <div class="card">
      <div class="kv"><span>Main muscles</span><b>${e.primary.map((m) => MUSCLES[m]).join(", ")}</b></div>
      ${e.secondary.length ? `<div class="kv"><span>Also works</span><b>${e.secondary.map((m) => MUSCLES[m]).join(", ")}</b></div>` : ""}
      <div class="kv"><span>Equipment</span><b>${e.equip.length ? e.equip.map((x) => EQUIPMENT[x].split(" (")[0]).join(", ") : "None"}</b></div>
      ${e.joints.length ? `<div class="kv"><span>Loads</span><b>${e.joints.map((j) => JOINTS[j]).join(", ")}</b></div>` : ""}
    </div>
    <div class="card"><h3>Why do it</h3><p>${esc(e.why)}</p></div>
    <div class="card"><h3>How to do it</h3><ol class="steps">${e.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <h3>Cues</h3><ul>${e.cues.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <h3>Common mistakes</h3><ul>${e.mistakes.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <h3>Range of motion</h3><p>${esc(e.rom)}</p>
      <h3>Breathing</h3><p>${esc(e.breathing)}</p></div>
    ${pr ? `<div class="card"><h3>Your best</h3><p>${pr.heaviest ? `Heaviest: <b>${pr.heaviest} lb</b>` : `Most reps: <b>${pr.mostReps}</b>`}${pr.bestE1rmSet ? ` · Best set: <b>${pr.bestE1rmSet.weight} × ${pr.bestE1rmSet.reps}</b> (est. max ${Math.round(pr.bestE1rm)} lb)` : ""}</p></div>` : ""}
    ${e.easier.length || e.harder.length ? `<div class="card">${e.easier.length ? `<p><b>Easier:</b> ${e.easier.map(link).join(", ")}</p>` : ""}${e.harder.length ? `<p><b>Harder:</b> ${e.harder.map(link).join(", ")}</p>` : ""}</div>` : ""}
    ${alts.length ? `<div class="card"><h3>Alternatives${p ? " with your equipment" : ""}</h3><p>${alts.map((a) => link(a.id)).join(", ")}</p></div>` : ""}
    <p class="hint">Video demos aren't included yet — they need properly licensed footage. Follow the steps and start light.</p>
    ${p ? `<button class="btn secondary" data-ta="ex-dislike" data-id="${id}">${disliked ? "Allow in future plans" : "Don't use in future plans"}</button>` : ""}`);
}

on({
  "lib-muscle": (el) => { ctx.libMuscle = ctx.libMuscle === el.dataset.v ? "" : el.dataset.v; render(); },
  "ex-dislike": (el) => {
    const pr = me().profile;
    pr.disliked = pr.disliked?.includes(el.dataset.id) ? pr.disliked.filter((x) => x !== el.dataset.id) : [...(pr.disliked || []), el.dataset.id];
    save(); exerciseSheet(el.dataset.id);
  },
});

export function libraryInput(e) {
  const k = e.target.dataset.lib;
  if (!k) return false;
  if (k === "q") {
    ctx.libQuery = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const s = $('[data-lib="q"]'); s.focus(); s.setSelectionRange(pos, pos);
  } else if (k === "pattern") { ctx.libPattern = e.target.value; render(); }
  else if (k === "mine") { ctx.libMine = e.target.checked; render(); }
  return true;
}
