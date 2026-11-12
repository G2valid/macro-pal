// Settings: people, equipment & weights, backup, privacy.

import { ctx, me, save, render, toast, esc, on, openSheet, closeSheet, sheetTitle, applyTheme, today } from "./core.js";
import { biteProfile, biteApiKey, emptyState } from "../store.js";
import { EQUIPMENT, EXPERIENCE, GOALS } from "../domain/vocab.js";
import { DEFAULT_LOADS } from "../domain/loads.js";
import { startOnboarding } from "./onboard.js";

const THEMES = ["ocean", "sky", "grape", "berry", "candy", "sunset", "fire", "forest", "midnight", "mono"];

export function renderSettings(el) {
  const p = me();
  const bite = p.biteId ? biteProfile(p.biteId) : null;
  const L = { ...DEFAULT_LOADS, ...p.loads };
  el.innerHTML = `
    <div class="section-label">People</div>
    <div class="list">
      ${Object.values(ctx.state.people).map((x) => `<button data-act="switch" data-id="${x.id}"><span>${esc(x.name)}${x.id === p.id ? " · <b>active</b>" : ""}</span><span class="v">${x.biteId ? "Bite Club ✓" : ""}</span></button>`).join("")}
      <button data-act="add-person"><span>+ Add someone</span><span class="v">Each person has their own plan</span></button>
    </div>

    <div class="section-label">${esc(p.name)}'s training</div>
    <div class="list">
      <div><span>Goal</span><span class="v">${GOALS[p.profile.primary]?.label}</span></div>
      <div><span>Experience</span><span class="v">${EXPERIENCE[p.profile.experience]?.label}</span></div>
      <div><span>Bite Club profile</span><span class="v">${bite ? `Linked: ${esc(bite.name)}` : "Not linked"}</span></div>
      <button data-act="replan"><span>Change answers / rebuild plan</span><span class="v">History is kept ›</span></button>
    </div>

    <div class="section-label">Weights you have</div>
    <div class="card">
      <p class="small muted" style="margin-top:0">Suggestions only use weights that exist here, so the next step up is always loadable.</p>
      <form id="loadsForm">
        <div class="row2"><label class="field"><span>Barbell (lb)</span><input name="bar" type="number" inputmode="decimal" value="${L.bar}"></label>
        <label class="field"><span>Smallest plate (lb)</span><select name="smallestPlate">${[1.25, 2.5, 5].map((v) => `<option ${L.smallestPlate === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        <label class="field"><span>Dumbbells you own (blank = full gym rack)</span><input name="dumbbells" value="${L.dumbbells?.join(", ") || ""}" placeholder="e.g. 10, 15, 25, 35" inputmode="decimal"></label>
        <div class="row3"><label class="field"><span>DB step</span><input name="dumbbellStep" type="number" inputmode="decimal" value="${L.dumbbellStep}"></label>
        <label class="field"><span>Machine step</span><input name="machineStep" type="number" inputmode="decimal" value="${L.machineStep}"></label>
        <label class="field"><span>Cable step</span><input name="cableStep" type="number" inputmode="decimal" value="${L.cableStep}"></label></div>
        <button class="btn secondary">Save weights</button>
      </form>
    </div>

    <div class="section-label">Equipment</div>
    <div class="card"><p class="small muted" style="margin-top:0">${p.profile.equipment.map((q) => EQUIPMENT[q].split(" (")[0]).join(", ") || "Bodyweight only"}</p>
      <button class="btn secondary" data-act="replan">Change equipment</button></div>

    ${!bite ? `<div class="section-label">Colour</div><div class="card"><div class="chips">${THEMES.map((t) => `<button class="chip ${p.accent === t ? "on" : ""}" data-act="accent" data-v="${t}">${t}</button>`).join("")}</div>
      <div class="seg" style="margin:12px 0 0">${[["auto", "Match phone"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button class="${(p.mode || "auto") === k ? "on" : ""}" data-act="tmode" data-v="${k}">${l}</button>`).join("")}</div></div>` : ""}

    <div class="section-label">Your data</div>
    <div class="list">
      <button data-act="export"><span>Back up training data</span><span class="v">JSON file ›</span></button>
      <button data-act="import"><span>Restore from backup</span><span class="v">›</span></button>
      <button data-act="delete-person"><span style="color:var(--danger)">Delete ${esc(p.name)}'s training data</span><span></span></button>
    </div>
    <p class="hint" style="margin:8px 4px">Everything stays on this device. Nothing is uploaded. Back up now and then — clearing Safari's website data would erase it.</p>

    <div class="section-label">About the coaching</div>
    <div class="card small">
      <p style="margin-top:0">Plans, weights and schedules come from fixed, tested rules — not AI — so the numbers are consistent and explainable. Every recommendation is labelled:</p>
      <p><span class="ev ev-strong">Strong evidence</span> consistent findings across reviews and guidelines (ACSM, NSCA, U.S. Physical Activity Guidelines).</p>
      <p><span class="ev ev-moderate">Moderate evidence</span> supported, with real uncertainty or individual variation.</p>
      <p><span class="ev ev-practice">Coaching practice</span> sensible and widely used, but not rigorously tested.</p>
      <p>This app isn't medical advice. Pain that's sharp, persistent or getting worse is worth getting checked.</p>
      <p>AI coach status: not enabled — no API calls are made by the Training Coach.${biteApiKey() ? " (Your Bite Club key is available for when it's added.)" : ""}</p>
    </div>
    <a class="btn secondary" href="../" style="margin-top:12px">🍽️ Open Bite Club</a>`;

  document.getElementById("loadsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const dbs = f.dumbbells.split(/[,\s]+/).map(Number).filter((n) => n > 0);
    p.loads = { ...p.loads, bar: Number(f.bar) || 45, smallestPlate: Number(f.smallestPlate) || 2.5, dumbbells: dbs.length ? [...new Set(dbs)].sort((a, b) => a - b) : null,
      dumbbellStep: Number(f.dumbbellStep) || 5, machineStep: Number(f.machineStep) || 10, cableStep: Number(f.cableStep) || 5 };
    save(); toast("Saved");
  });
}

on({
  switch: (el) => { ctx.state.activeId = el.dataset.id; save(); applyTheme(); ctx.tab = "today"; render(); },
  "add-person": () => startOnboarding(),
  accent: (el) => { me().accent = el.dataset.v; save(); applyTheme(); render(); },
  tmode: (el) => { me().mode = el.dataset.v; save(); applyTheme(); render(); },
  export: () => {
    const blob = new Blob([JSON.stringify({ app: "training-coach", exportedAt: new Date().toISOString(), state: ctx.state }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `training-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  import: () => document.getElementById("importInput").click(),
  "delete-person": () => {
    const p = me();
    if (!confirm(`Delete all of ${p.name}'s training data — plan, workouts and records? This can't be undone. (Bite Club data isn't affected.)`)) return;
    delete ctx.state.people[p.id];
    ctx.state.activeId = Object.keys(ctx.state.people)[0] || null;
    save(); applyTheme(); ctx.tab = "today";
    if (!ctx.state.activeId) startOnboarding(); else render();
  },
});

export async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "training-coach" || !data.state?.people) throw new Error("not a backup");
    const n = Object.keys(data.state.people).length;
    if (!confirm(`Restore ${n} ${n === 1 ? "person" : "people"} from this backup? It replaces the training data on this device.`)) return;
    ctx.state = { ...emptyState(), ...data.state };
    save(); applyTheme(); ctx.tab = "today"; render(); toast("Restored");
  } catch { toast("That file isn't a Training Coach backup."); }
}
