// Screenshot import (Peloton, RingConn, any fitness app) — the same reader
// and API key as Bite Club. Results are saved into Bite Club's log; matching
// cardio sessions in the plan are ticked off.

import { me, save, render, toast, esc, uid, today, $, on, openSheet, closeSheet, sheetTitle } from "./core.js";
import { biteApiKey, biteModel, biteProfile, biteSaveImport } from "../store.js";

const EMO = { cycling: "🚴", running: "🏃", walking: "🚶", strength: "🏋️", pilates: "🩰", yoga: "🧘", stretching: "🤸", hiit: "⚡", rowing: "🚣", swimming: "🏊", other: "💪" };
const CARDIO = new Set(["cycling", "running", "walking", "rowing", "swimming", "hiit", "other"]);
const TO_MODE = { cycling: "cycling", running: "running", walking: "walking", rowing: "rowing", swimming: "swimming" };

let shots = null;
let ai = null;
const loadAi = async () => (ai ||= await import("../../ai.js"));

export function openImport() {
  shots = { images: [], loading: false, error: null, result: null };
  renderImport();
}

function body() {
  const p = me();
  if (!p.biteId || !biteProfile(p.biteId)) {
    return `<div class="note">Screenshot import saves into Bite Club, so it needs this person linked to a Bite Club profile on this phone. ${esc(p.name)} was set up without one.</div>`;
  }
  if (!biteApiKey()) {
    return `<div class="note">Screenshot import uses Claude with the API key saved in Bite Club. Add it once in <b>Bite Club → Settings</b>, then come back.</div><a class="btn" href="../">Open Bite Club</a>`;
  }
  if (shots.loading) {
    return `<div class="shots">${shots.images.map((im) => `<img src="${im.dataUrl}" alt="">`).join("")}</div><div class="empty"><div class="spinner"></div>Claude is reading your screenshot${shots.images.length > 1 ? "s" : ""}…</div>`;
  }
  if (!shots.result) {
    return `${shots.images.length ? `<div class="shots">${shots.images.map((im) => `<img src="${im.dataUrl}" alt="Screenshot">`).join("")}</div>` : ""}
      <button class="photo-drop" data-act="imp-pick"><span class="cam">🖼️</span><b>${shots.images.length ? "Choose different screenshots" : "Choose screenshots"}</b><span class="small">Up to 4 from the same day — e.g. a Peloton workout summary and your RingConn daily overview</span></button><br>
      ${shots.error ? `<div class="note warn">${esc(shots.error)}</div>` : ""}
      ${shots.images.length ? `<button class="btn" data-act="imp-run">Read ${shots.images.length > 1 ? "screenshots" : "screenshot"}</button>` : ""}
      <p class="hint">Uses one Claude request with your Bite Club key and model setting.</p>`;
  }
  const r = shots.result;
  const d = r.daily;
  const stats = [d.steps && `👟 ${d.steps.toLocaleString()} steps`, d.activeKcal && `🔥 ${d.activeKcal} active kcal`, d.sleepH && `😴 ${d.sleepH} h sleep`, d.restingHr && `❤️ ${d.restingHr} resting HR`, d.hrv && `📈 HRV ${d.hrv}`].filter(Boolean);
  return `${r.summary ? `<div class="note">✨ ${esc(r.summary)}</div>` : ""}
    <label class="field"><span>Which day is this for?</span><input type="date" data-imp="date" value="${r.date || today()}" max="${today()}"></label>
    ${r.workouts.map((w, i) => `<div class="card imp-w">
      <div class="imp-hdr"><span>${EMO[w.type] || EMO.other}</span><input class="input" data-imp="title" data-i="${i}" value="${esc(w.title || w.type)}"><button class="link" data-act="imp-rm" data-i="${i}">Remove</button></div>
      <div class="row3">
        <label class="field"><span>Minutes</span><input type="number" inputmode="numeric" data-imp="minutes" data-i="${i}" value="${w.minutes || ""}"></label>
        <label class="field"><span>kcal</span><input type="number" inputmode="numeric" data-imp="kcal" data-i="${i}" value="${w.kcal || ""}"></label>
        <label class="field"><span>Distance${w.distUnit ? ` (${esc(w.distUnit)})` : ""}</span><input type="number" inputmode="decimal" step="0.01" data-imp="distance" data-i="${i}" value="${w.distance || ""}"></label>
      </div></div>`).join("")}
    ${stats.length ? `<div class="card"><h3>Daily stats</h3><p class="small">${stats.join(" · ")}</p></div>` : ""}
    ${!r.workouts.length && !stats.length ? `<div class="empty">Nothing to import was found in that screenshot.</div>` : `<button class="btn" data-act="imp-save">Save to log</button>`}
    <button class="btn secondary" data-act="imp-restart">Start over</button>`;
}

function renderImport() {
  const html = `${sheetTitle("Import screenshots")}${body()}`;
  if ($("#sheet").hidden) openSheet(html, () => (shots = null));
  else $("#sheetBody").innerHTML = html;
}

on({
  "imp-open": () => openImport(),
  "imp-pick": () => $("#shotInput").click(),
  "imp-restart": () => { shots = { images: [], loading: false, error: null, result: null }; renderImport(); },
  "imp-rm": (el) => { shots.result.workouts.splice(Number(el.dataset.i), 1); renderImport(); },
  "imp-run": async () => {
    shots.loading = true; shots.error = null; renderImport();
    try {
      const m = await loadAi();
      const result = await m.readFitnessScreens({ apiKey: biteApiKey(), model: biteModel() || m.DEFAULT_MODEL, images: shots.images, todayYmd: today() });
      if (!shots) return;
      shots.result = result;
    } catch (err) {
      if (!shots) return;
      shots.error = navigator.onLine === false ? "You're offline — screenshot reading needs a connection." : err.message || "Couldn't read that.";
    }
    shots.loading = false;
    renderImport();
  },
  "imp-save": () => {
    const p = me();
    const r = shots.result;
    const date = r.date || today();
    const added = biteSaveImport(p.biteId, date, r.workouts, r.daily, uid);
    if (added < 0) return toast("Couldn't save to Bite Club.");
    // Tick off planned cardio on that day with the imported cardio.
    let ticked = 0;
    for (const w of r.workouts.filter((x) => CARDIO.has(x.type) && x.minutes > 0)) {
      const s = p.sessions.find((x) => x.date === date && x.kind === "cardio" && x.status !== "done");
      if (!s) break;
      s.status = "done";
      p.cardioLogs.push({ id: uid(), date, sessionId: s.id, mode: TO_MODE[w.type] || s.cardio.mode, minutes: w.minutes, source: "bite" });
      ticked++;
    }
    save(); closeSheet(); render();
    toast(`${added ? `Saved ${added} workout${added > 1 ? "s" : ""} to Bite Club` : "Daily stats saved to Bite Club"}${ticked ? " · cardio ticked off ✓" : ""}`, 3500);
  },
});

/** Field edits in the import sheet. */
export function importInput(e) {
  const t = e.target;
  const k = t.dataset.imp;
  if (!k || !shots?.result) return false;
  if (k === "date") { shots.result.date = t.value; return true; }
  const w = shots.result.workouts[Number(t.dataset.i)];
  w[k] = k === "title" ? t.value : Number(t.value) || 0;
  return true;
}

/** Files chosen from the photo picker. */
export async function importFiles(files) {
  if (!shots || !files.length) return;
  try {
    const m = await loadAi();
    shots.images = await Promise.all([...files].slice(0, 4).map(m.prepareImage));
    shots.result = null; shots.error = null;
    renderImport();
  } catch (err) { toast(err.message || "Couldn't read those images."); }
}
