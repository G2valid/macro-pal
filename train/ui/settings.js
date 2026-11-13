// Plan settings inside Fitness: the weights you have, and deleting training data.

import { ctx, me, save, render, toast, esc, on, openSheet, closeSheet, sheetTitle } from "./core.js";
import { DEFAULT_LOADS } from "../domain/loads.js";

export function loadsSheet() {
  const p = me();
  const L = { ...DEFAULT_LOADS, ...p.loads };
  openSheet(`${sheetTitle("Weights you have")}
    <p class="small muted" style="margin-top:0">Suggestions only use weights that exist here, so the next step up is always one you can load.</p>
    <form id="loadsForm">
      <div class="row2"><label class="field"><span>Barbell (lb)</span><input name="bar" type="number" inputmode="decimal" value="${L.bar}"></label>
      <label class="field"><span>Smallest plate (lb)</span><select name="smallestPlate">${[1.25, 2.5, 5].map((v) => `<option ${L.smallestPlate === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
      <label class="field"><span>Dumbbells you own (blank = full gym rack)</span><input name="dumbbells" value="${L.dumbbells?.join(", ") || ""}" placeholder="e.g. 10, 15, 25, 35" inputmode="decimal"></label>
      <div class="row3"><label class="field"><span>Dumbbell step</span><input name="dumbbellStep" type="number" inputmode="decimal" value="${L.dumbbellStep}"></label>
      <label class="field"><span>Machine step</span><input name="machineStep" type="number" inputmode="decimal" value="${L.machineStep}"></label>
      <label class="field"><span>Cable step</span><input name="cableStep" type="number" inputmode="decimal" value="${L.cableStep}"></label></div>
      <button class="btn">Save</button>
    </form>`);
  document.getElementById("loadsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const dbs = f.dumbbells.split(/[,\s]+/).map(Number).filter((n) => n > 0);
    p.loads = { ...p.loads, bar: Number(f.bar) || 45, smallestPlate: Number(f.smallestPlate) || 2.5, dumbbells: dbs.length ? [...new Set(dbs)].sort((a, b) => a - b) : null,
      dumbbellStep: Number(f.dumbbellStep) || 5, machineStep: Number(f.machineStep) || 10, cableStep: Number(f.cableStep) || 5 };
    save(); closeSheet(); toast("Saved");
  });
}

on({
  loads: () => loadsSheet(),
  "delete-training": () => {
    const p = me();
    if (!confirm(`Delete ${p.name}'s training plan, set-by-set history and records? Workouts already in your Fitness log stay there. This can't be undone.`)) return;
    delete ctx.state.people[p.id];
    save(); ctx.tab = "today"; render(); toast("Training data deleted");
  },
});
