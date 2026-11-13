// Progress: consistency, volume, strength, cardio, bodyweight, records, history.

import { ctx, me, save, render, esc, today, on, openSheet, sheetTitle, fmtDate, $, $$ } from "./core.js";
import { EX } from "../domain/exercises.js";
import { MUSCLES, TRACKED_MUSCLES } from "../domain/vocab.js";
import { isWeighted } from "../domain/loads.js";
import { workingSets } from "../domain/progression.js";
import { adherence, addDays, weekStart, cardioMinutesForWeek, parseYmd } from "../domain/schedule.js";
import { doneLogs, setsByMuscle, personalRecords, strengthSeries, repsSeries, loggedExercises, cardioMinutes, workoutSummary } from "../domain/history.js";
import { biteWeights } from "../store.js";
import { biteFor } from "./today.js";
import { unsyncFromBite } from "./sync.js";

/* ---------------- Charts (single series, accent colour) ---------------- */
const W = 340, H = 170, PAD = { l: 34, r: 10, t: 12, b: 22 };

function lineChart(id, pts, { unit = "" } = {}) {
  if (pts.length < 2) return `<p class="muted small">${pts.length ? "One session logged — the chart appears after the next one." : "Nothing logged yet."}</p>`;
  const ys = pts.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const padY = Math.max(1, (hi - lo) * 0.15);
  lo = Math.max(0, lo - padY); hi += padY;
  const x = (i) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const data = pts.map((p, i) => ({ x: x(i), y: y(p.y), tip: p.tip }));
  return `<div class="chart-wrap" data-chart="${id}" data-pts='${esc(JSON.stringify(data))}'>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(pts.map((p) => p.tip).join("; "))}">
      <g class="grid">${ticks.map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}"/>`).join("")}</g>
      <g class="axis">${ticks.map((t) => `<text x="${PAD.l - 6}" y="${y(t) + 4}" text-anchor="end">${Math.round(t)}</text>`).join("")}
        <text x="${PAD.l}" y="${H - 4}">${esc(pts[0].label)}</text><text x="${W - PAD.r}" y="${H - 4}" text-anchor="end">${esc(pts[pts.length - 1].label)}</text></g>
      <polyline class="trend" points="${data.map((d) => `${d.x},${d.y}`).join(" ")}"/>
      ${data.map((d) => `<circle class="pt" cx="${d.x}" cy="${d.y}" r="4"/>`).join("")}
      <line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" visibility="hidden"/>
      <circle class="hdot" r="5" visibility="hidden"/>
    </svg><div class="tip" hidden></div></div>`;
}

function barChart(id, bars, target) {
  const max = Math.max(target || 0, ...bars.map((b) => b.value), 1) * 1.1;
  const bw = (W - PAD.l - PAD.r) / bars.length;
  const y = (v) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const data = bars.map((b, i) => ({ x: PAD.l + bw * i + bw / 2, y: y(b.value), tip: b.tip }));
  return `<div class="chart-wrap" data-chart="${id}" data-pts='${esc(JSON.stringify(data))}'>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(bars.map((b) => b.tip).join("; "))}">
      <g class="grid"><line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(0)}" y2="${y(0)}"/></g>
      ${target ? `<line class="goal-line" x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(target)}" y2="${y(target)}"/><text class="goal-lbl" x="${W - PAD.r}" y="${y(target) - 4}" text-anchor="end">target ${target}</text>` : ""}
      ${bars.map((b, i) => {
        // Bar anchored to the baseline with 4px rounded top corners.
        const base = y(0), top = y(b.value), h = base - top;
        if (h <= 0) return "";
        const x0 = PAD.l + bw * i + 3, w = Math.max(4, bw - 6), r = Math.min(4, h, w / 2);
        return `<path class="bar" d="M${x0},${base} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + w - r} Q${x0 + w},${top} ${x0 + w},${top + r} V${base} Z"/>`;
      }).join("")}
      <g class="axis">${bars.map((b, i) => `<text x="${PAD.l + bw * i + bw / 2}" y="${H - 4}" text-anchor="middle">${esc(b.label)}</text>`).join("")}</g>
      <line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" visibility="hidden"/>
    </svg><div class="tip" hidden></div></div>`;
}

/** Hover/tap: nearest point's tooltip + crosshair. */
export function chartHover(e) {
  const wrap = e.target.closest?.(".chart-wrap[data-pts]");
  if (!wrap) { for (const w of $$(".chart-wrap .tip:not([hidden])")) { w.hidden = true; w.parentElement.querySelector(".cross")?.setAttribute("visibility", "hidden"); w.parentElement.querySelector(".hdot")?.setAttribute("visibility", "hidden"); } return; }
  const svg = wrap.querySelector("svg");
  const r = svg.getBoundingClientRect();
  const sx = ((e.clientX - r.left) / r.width) * W;
  const pts = JSON.parse(wrap.dataset.pts);
  const p = pts.reduce((a, b) => (Math.abs(b.x - sx) < Math.abs(a.x - sx) ? b : a));
  const cross = wrap.querySelector(".cross");
  cross.setAttribute("x1", p.x); cross.setAttribute("x2", p.x); cross.setAttribute("visibility", "visible");
  const dot = wrap.querySelector(".hdot");
  if (dot) { dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); dot.setAttribute("visibility", "visible"); }
  const tip = wrap.querySelector(".tip");
  tip.textContent = p.tip; tip.hidden = false;
  tip.style.left = `${Math.min(Math.max((p.x / W) * r.width, 60), r.width - 60)}px`;
}

/* ---------------- View ---------------- */
export function renderProgress(el) {
  const p = me();
  const t = today();
  const logs = doneLogs(p);
  const blockSessions = p.sessions.filter((s) => s.date >= (p.program.startDate || "0"));
  const adh = adherence(blockSessions, t);
  const prs = personalRecords(p);
  const ws = weekStart(t);
  const vol = setsByMuscle(p, ws, addDays(ws, 6));
  const { low, high } = p.program.volumeTargets;
  const vmax = Math.max(high + 4, ...Object.values(vol));
  const exs = loggedExercises(p);
  if (!ctx.progressEx || !exs.includes(ctx.progressEx)) ctx.progressEx = exs[0] || "";
  const sel = ctx.progressEx ? EX[ctx.progressEx] : null;
  const series = sel ? (isWeighted(sel.load) ? strengthSeries(p, sel.id) : repsSeries(p, sel.id)) : [];
  const short = (d) => fmtDate(d, { month: "short", day: "numeric" });

  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, (i - 7) * 7));
  const cardioBars = weeks.map((w) => { const m = cardioMinutes(p, w, addDays(w, 6), biteFor(p)).total; return { label: fmtDate(w, { month: "numeric", day: "numeric" }), value: m, tip: `Week of ${short(w)}: ${m} min` }; });
  const wkIdx = Math.max(0, Math.floor((parseYmd(t) - parseYmd(p.program.startDate)) / 604800000));
  const cardioTarget = cardioMinutesForWeek(p.program.cardio, Math.min(wkIdx, p.program.weeks - 1));
  const weights = p.biteId ? biteWeights(p.biteId).filter((w) => w.date >= addDays(t, -120)) : [];

  el.innerHTML = `
    <div class="card"><div class="card-head"><h2>Consistency</h2><span class="meta">This block</span></div>
      <div class="stats3">
        <div class="stat"><div class="v">${adh.pct ?? "–"}${adh.pct != null ? "%" : ""}</div><div class="k">Sessions done</div></div>
        <div class="stat"><div class="v">${logs.length}</div><div class="k">Workouts total</div></div>
        <div class="stat"><div class="v">${logs.reduce((n, l) => n + (l.prs?.length || 0), 0)}</div><div class="k">PRs</div></div>
      </div>
      <p class="hint" style="margin-top:8px">${adh.due ? `${adh.done} of ${adh.due} planned sessions so far.` : "Your first sessions will show here."} Steady weeks beat perfect ones.</p></div>

    <div class="card"><div class="card-head"><h2>Sets this week</h2><span class="meta">target ${low}–${high}</span></div>
      <div class="vbars">${TRACKED_MUSCLES.map((m) => `<div class="vb" title="${MUSCLES[m]}: ${vol[m]} sets"><span>${MUSCLES[m]}</span>
        <div class="track"><div class="band" style="left:${(low / vmax) * 100}%;width:${((high - low) / vmax) * 100}%"></div><div class="fill" style="width:${(vol[m] / vmax) * 100}%"></div></div><b class="num">${vol[m]}</b></div>`).join("")}</div></div>

    <div class="card"><div class="card-head"><h2>Strength</h2></div>
      ${exs.length ? `<select class="input" data-prog="ex" style="margin-bottom:10px">${exs.map((id) => `<option value="${id}" ${id === ctx.progressEx ? "selected" : ""}>${esc(EX[id].name)}</option>`).join("")}</select>
      ${lineChart("str", series.map((s) => ({ y: s.value, label: short(s.date), tip: isWeighted(sel.load) ? `${short(s.date)}: ${s.weight} × ${s.reps} → est. max ${Math.round(s.value)} lb` : `${short(s.date)}: ${s.reps} reps` })))}
      <p class="hint">${sel && isWeighted(sel.load) ? "Estimated one-rep max from your best set each session (Epley formula). It's an estimate for tracking trends, not a target to test." : "Best set each session."}</p>` : `<p class="muted">Finish a workout to see strength trends.</p>`}</div>

    <div class="card"><div class="card-head"><h2>Cardio minutes</h2><span class="meta">last 8 weeks</span></div>
      ${barChart("cardio", cardioBars, cardioTarget)}
      <p class="hint">Includes cardio logged in Bite Club.</p></div>

    ${weights.length >= 2 ? `<div class="card"><div class="card-head"><h2>Bodyweight</h2><span class="meta">from Bite Club</span></div>
      ${lineChart("bw", weights.map((w) => ({ y: w.kg / 0.45359237, label: short(w.date), tip: `${short(w.date)}: ${(w.kg / 0.45359237).toFixed(1)} lb` })))}</div>` : ""}

    <div class="card"><div class="card-head"><h2>Personal records</h2></div>
      ${Object.values(prs).length ? `<div class="list flat">${Object.values(prs).sort((a, b) => EX[a.exerciseId].name.localeCompare(EX[b.exerciseId].name)).map((r) => `<button data-act="ex-info" data-id="${r.exerciseId}"><span>${esc(EX[r.exerciseId].name)}</span><span class="v">${r.bestE1rmSet ? `${r.bestE1rmSet.weight} lb × ${r.bestE1rmSet.reps}${r.heaviest > r.bestE1rmSet.weight ? ` · top ${r.heaviest} lb` : ""}` : `${r.mostReps} reps`}</span></button>`).join("")}</div>` : `<p class="muted">Records appear as you log workouts.</p>`}</div>

    <div class="card"><div class="card-head"><h2>History</h2></div>
      ${logs.length ? `<div class="list flat">${[...logs].sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt).slice(0, 30).map((l) => { const s = workoutSummary(l); return `<button data-act="log" data-id="${l.id}"><span><b>${esc(l.name)}</b><br><span class="small muted">${fmtDate(l.date)}</span></span><span class="v">${s.sets} sets · ${s.minutes} min</span></button>`; }).join("")}</div>` : `<p class="muted">No workouts yet.</p>`}</div>`;
}

function logSheet(id) {
  const l = me().logs.find((x) => x.id === id);
  if (!l) return;
  const s = workoutSummary(l);
  openSheet(`${sheetTitle(esc(l.name))}
    <p class="muted">${fmtDate(l.date, { weekday: "long", month: "long", day: "numeric" })} · ${s.minutes} min · ${s.sets} sets · ${s.volume.toLocaleString()} lb</p>
    ${l.exercises.filter((e) => workingSets(e).length).map((e) => `<div class="card"><b>${esc(EX[e.exerciseId].name)}</b>${e.pain ? " 🩹" : ""}
      <div class="small muted">${workingSets(e).map((x) => `${x.weight ? `${x.weight}×` : ""}${x.reps}${x.rir != null ? ` @${x.rir}` : ""}`).join(" · ")}</div></div>`).join("")}
    ${l.notes ? `<div class="note">${esc(l.notes)}</div>` : ""}
    <p class="hint">@ = reps in reserve.</p>
    <button class="btn danger" data-act="log-del" data-id="${l.id}">Delete this workout</button>`);
}

on({
  log: (el) => logSheet(el.dataset.id),
  "log-del": (el) => {
    if (!confirm("Delete this workout from your history?")) return;
    const p = me();
    p.logs = p.logs.filter((l) => l.id !== el.dataset.id);
    unsyncFromBite(p, el.dataset.id);
    for (const s of p.sessions) if (s.logId === el.dataset.id) { s.status = "planned"; delete s.logId; }
    save(); document.querySelector('[data-act="close"]')?.click(); render();
  },
});

export function progressInput(e) {
  if (e.target.dataset.prog !== "ex") return false;
  ctx.progressEx = e.target.value; render(); return true;
}
