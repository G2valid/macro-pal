import { estimateFood, readFitnessScreens, prepareImage, MODELS, DEFAULT_MODEL } from "./ai.js";

/* =========================================================
   Storage
   ========================================================= */
const KEY = "macropal.v1";
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];
const ACTIVITY = [
  { v: 1.2, label: "Sedentary", hint: "Desk job, little exercise" },
  { v: 1.375, label: "Lightly active", hint: "Exercise 1–3 days/week" },
  { v: 1.55, label: "Moderately active", hint: "Exercise 3–5 days/week" },
  { v: 1.725, label: "Very active", hint: "Hard exercise 6–7 days/week" },
  { v: 1.9, label: "Athlete", hint: "Physical job + training" },
];
const PRESETS = {
  balanced: { label: "Balanced", p: 30, c: 40, f: 30 },
  highprotein: { label: "High protein", p: 40, c: 35, f: 25 },
  lowcarb: { label: "Low carb", p: 40, c: 20, f: 40 },
  keto: { label: "Keto", p: 25, c: 5, f: 70 },
  custom: { label: "Custom" },
};
const THEMES = {
  ocean: { label: "Lagoon", g: ["#2dd4bf", "#0284c7"] },
  sky: { label: "Ocean", g: ["#38bdf8", "#6366f1"] },
  grape: { label: "Grape", g: ["#a855f7", "#4f46e5"] },
  berry: { label: "Berry", g: ["#f472b6", "#9333ea"] },
  candy: { label: "Candy", g: ["#f9a8d4", "#818cf8"] },
  sunset: { label: "Sunset", g: ["#fb923c", "#e11d48"] },
  fire: { label: "Fire", g: ["#fbbf24", "#dc2626"] },
  forest: { label: "Lime", g: ["#a3e635", "#059669"] },
  midnight: { label: "Midnight", g: ["#7c3aed", "#0891b2"] },
  mono: { label: "Mono", g: ["#52525b", "#18181b"] },
};
const MEAL_EMO = { Breakfast: "🍳", Lunch: "🥗", Dinner: "🍽️", Snacks: "🍿" };
const WORKOUTS = {
  cycling: { emo: "🚴", label: "Cycling" }, running: { emo: "🏃", label: "Running" }, walking: { emo: "🚶", label: "Walking" },
  strength: { emo: "🏋️", label: "Strength" }, hiit: { emo: "⚡", label: "HIIT" }, yoga: { emo: "🧘", label: "Yoga" },
  stretching: { emo: "🤸", label: "Stretch" }, rowing: { emo: "🚣", label: "Rowing" }, swimming: { emo: "🏊", label: "Swim" },
  other: { emo: "💪", label: "Other" },
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.profiles) return s;
  } catch {}
  return { profiles: {}, activeId: null, apiKey: "", model: DEFAULT_MODEL };
}
let state = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast("Couldn't save — storage is full."); }
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const P = () => state.profiles[state.activeId];

/* =========================================================
   Dates & units
   ========================================================= */
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const today = () => ymd(new Date());
let currentDay = today();

const LB = 0.45359237;
const imperial = () => P()?.units !== "metric";
const wUnit = () => (imperial() ? "lb" : "kg");
const toDispW = (kg) => (imperial() ? kg / LB : kg);
const fromDispW = (v) => (imperial() ? v * LB : v);
const fmtW = (kg, d = 1) => (kg == null ? "—" : `${toDispW(kg).toFixed(d)} ${wUnit()}`);
const r0 = (n) => Math.round(n || 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;

/* =========================================================
   Nutrition math
   ========================================================= */
function latestWeightKg(p = P()) {
  const w = [...(p.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  return w.length ? w[w.length - 1].kg : p.startWeightKg;
}
function ageOf(p) {
  if (!p.birthYear) return p.age || 30;
  return new Date().getFullYear() - p.birthYear;
}
function computeTargets(p = P()) {
  const kg = latestWeightKg(p);
  const age = ageOf(p);
  const bmr = 10 * kg + 6.25 * p.heightCm - 5 * age + (p.sex === "male" ? 5 : -161);
  const tdee = bmr * p.activity;
  const diffKg = p.goalWeightKg - kg;
  let direction = "maintain";
  if (diffKg < -0.5) direction = "lose";
  else if (diffKg > 0.5) direction = "gain";
  // pace is stored in kg/week; 1 kg fat ≈ 7700 kcal
  const dailyDelta = direction === "maintain" ? 0 : (p.paceKg * 7700) / 7;
  let kcal = direction === "lose" ? tdee - dailyDelta : direction === "gain" ? tdee + dailyDelta : tdee;
  const floor = p.sex === "male" ? 1500 : 1200;
  let floored = false;
  if (kcal < floor) { kcal = floor; floored = true; }
  if (p.kcalOverride) kcal = p.kcalOverride;
  kcal = Math.round(kcal / 10) * 10;

  let protein, carbs, fat, split;
  if (p.macroMode === "coach") {
    // grams per lb of goal weight; carbs get whatever calories are left
    const goalLb = p.goalWeightKg / LB;
    protein = Math.round(goalLb * (p.proteinPerLb || 1));
    fat = Math.round(goalLb * (p.fatPerLb || 0.35));
    carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const sum = protein * 4 + carbs * 4 + fat * 9;
    split = { p: Math.round((protein * 400) / sum), c: Math.round((carbs * 400) / sum), f: Math.round((fat * 900) / sum) };
  } else {
    split = p.macroPreset === "custom" ? p.customSplit : PRESETS[p.macroPreset] || PRESETS.balanced;
    protein = Math.round((kcal * split.p) / 100 / 4);
    carbs = Math.round((kcal * split.c) / 100 / 4);
    fat = Math.round((kcal * split.f) / 100 / 9);
  }

  let weeks = null;
  if (direction !== "maintain") {
    const actualDaily = Math.abs(kcal - tdee);
    const kgPerWeek = (actualDaily * 7) / 7700;
    if (kgPerWeek > 0.01) weeks = Math.abs(diffKg) / kgPerWeek;
  }
  const goalDate = weeks != null ? new Date(Date.now() + weeks * 7 * 864e5) : null;
  return { bmr: r0(bmr), tdee: r0(tdee), kcal, protein, carbs, fat, direction, floored, goalDate, weeks, split };
}

function dayData(date = currentDay) {
  const p = P();
  p.days ||= {};
  return p.days[date] || { entries: [], water: 0 };
}
function ensureDay(date = currentDay) {
  const p = P();
  p.days ||= {};
  p.days[date] ||= { entries: [], water: 0 };
  return p.days[date];
}
function totals(entries) {
  return entries.reduce(
    (t, e) => {
      const s = e.servings || 1;
      t.kcal += e.kcal * s; t.p += e.p * s; t.c += e.c * s; t.f += e.f * s;
      return t;
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}
function defaultMeal() {
  const h = new Date().getHours();
  if (h < 10.5) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snacks";
}

/* =========================================================
   Helpers
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2400);
}
function applyTheme() {
  const p = P();
  const root = document.documentElement;
  root.dataset.accent = p?.accent || "ocean";
  const mode = p?.mode || "auto";
  if (mode === "auto") delete root.dataset.theme;
  else root.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = (THEMES[p?.accent] || THEMES.ocean).g[1];
}

/* =========================================================
   Sheet (modal)
   ========================================================= */
let sheetOnClose = null;
function openSheet(html, onClose) {
  $("#sheetBody").innerHTML = html;
  $("#sheet").hidden = false;
  $("#backdrop").hidden = false;
  $("#sheetBody").scrollTop = 0;
  sheetOnClose = onClose || null;
}
function closeSheet() {
  $("#sheet").hidden = true;
  $("#backdrop").hidden = true;
  $("#sheetBody").innerHTML = "";
  const cb = sheetOnClose;
  sheetOnClose = null;
  cb?.();
}
$("#backdrop").addEventListener("click", () => {
  if (!P()) return; // onboarding can't be dismissed
  closeSheet();
});
const sheetTitle = (t, closable = true) =>
  `<div class="sheet-title"><h2>${t}</h2>${closable ? `<button class="close-x" data-act="close" aria-label="Close">✕</button>` : ""}</div>`;

/* =========================================================
   Rendering: Today
   ========================================================= */
let tab = "today";
function render() {
  const p = P();
  if (!p) return;
  applyTheme();
  $("#profileChip").innerHTML = `<span class="avatar">${esc(p.name[0]?.toUpperCase() || "?")}</span><span>${esc(p.name)}</span>`;
  const t = today();
  $("#dateLabel").textContent =
    currentDay === t ? "Today" : currentDay === addDays(t, -1) ? "Yesterday" : currentDay === addDays(t, 1) ? "Tomorrow" :
    parseYmd(currentDay).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  $("#dateNav").style.visibility = tab === "today" || tab === "fitness" ? "visible" : "hidden";
  document.querySelectorAll(".tab[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  for (const v of ["today", "fitness", "progress", "settings"]) $(`#view-${v}`).hidden = v !== tab;
  if (tab === "today") renderToday();
  if (tab === "fitness") renderFitness();
  if (tab === "progress") renderProgress();
  if (tab === "settings") renderSettings();
}

function streakDays(p = P()) {
  let d = today();
  if (!dayData(d).entries.length) d = addDays(d, -1);
  let n = 0;
  while ((p.days?.[d]?.entries || []).length) { n++; d = addDays(d, -1); }
  return n;
}

function exerciseKcal(date = currentDay) {
  return (dayData(date).workouts || []).reduce((s, w) => s + (w.kcal || 0), 0);
}

/** Calorie goal for a day, including any "eat back" exercise calories. */
function dayGoal(date = currentDay) {
  const tg = computeTargets();
  const bonus = Math.round(exerciseKcal(date) * (P().eatBack || 0));
  return { ...tg, base: tg.kcal, bonus, kcal: tg.kcal + bonus, carbs: tg.carbs + Math.round(bonus / 4) };
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function renderToday() {
  const p = P();
  const tg = dayGoal();
  const day = dayData();
  const tot = totals(day.entries);
  const remaining = tg.kcal - tot.kcal;
  const pct = Math.min(1, tot.kcal / tg.kcal);
  const C = 2 * Math.PI * 62;
  const over = remaining < 0;
  const streak = streakDays();
  const isToday = currentDay === today();

  const macro = (emo, name, val, goal, color) => {
    const w = Math.min(100, (val / goal) * 100);
    const left = goal - val;
    return `<div class="macro-row">
      <div class="top"><span class="name"><span class="emo">${emo}</span>${name}</span>
      <span class="num"><b>${r0(val)}</b> / ${goal} g</span></div>
      <div class="bar" role="progressbar" aria-label="${name}" aria-valuenow="${r0(val)}" aria-valuemax="${goal}"><i style="width:${w}%;background:var(--${color})"></i></div>
      <div class="left">${left > 0 ? `${r0(left)} g left` : left === 0 || r0(left) === 0 ? "Goal hit! 🎉" : `${r0(-left)} g over`}</div>
    </div>`;
  };

  const waterGoal = p.waterGoal || 8;
  const cups = Array.from({ length: Math.max(waterGoal, day.water) }, (_, i) => `<span class="cup ${i < day.water ? "full" : ""}"></span>`).join("");

  const meals = MEALS.map((m) => {
    const es = day.entries.filter((e) => e.meal === m);
    const mt = totals(es);
    return `<div class="card meal">
      <div class="meal-head"><h3><span class="emo">${MEAL_EMO[m]}</span> ${m}${es.length ? `<span class="kc num">${r0(mt.kcal)} kcal</span>` : ""}</h3>
        <button class="meal-add" data-act="open-add" data-meal="${m}" aria-label="Add to ${m}">+</button></div>
      ${es.length ? es.map((e) => `<button class="entry" data-act="edit-entry" data-id="${e.id}">
          <div><div class="nm">${esc(e.name)}${e.ai ? " ✨" : ""}</div>
          <div class="sub num">${e.servings && e.servings !== 1 ? `${e.servings} × ` : ""}${esc(e.portion || "")}${e.portion ? " · " : ""}P ${r0(e.p * (e.servings || 1))} · C ${r0(e.c * (e.servings || 1))} · F ${r0(e.f * (e.servings || 1))}</div></div>
          <div class="kcal num">${r0(e.kcal * (e.servings || 1))}</div></button>`).join("")
        : `<div class="empty-meal">Nothing logged yet</div>`}
    </div>`;
  }).join("");

  const weighDay = p.weighDay ?? 1;
  const needsWeigh = isToday && new Date().getDay() === weighDay && !(p.weights || []).some((w) => w.date === today());

  $("#view-today").innerHTML = `
    <div class="hero">
      <div class="hero-top"><h2>${isToday ? `${greeting()}, ${esc(p.name)}` : parseYmd(currentDay).toLocaleDateString(undefined, { weekday: "long" })}</h2>
        ${streak ? `<span class="streak">🔥 ${streak}-day streak</span>` : ""}</div>
      <div class="summary">
        <div class="ring">
          <svg viewBox="0 0 150 150" aria-hidden="true">
            <circle class="track" cx="75" cy="75" r="62" fill="none" stroke-width="13"/>
            <circle class="prog ${over ? "over" : ""}" cx="75" cy="75" r="62" fill="none" stroke-width="13" stroke-linecap="round"
              stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
          </svg>
          <div class="ring-center"><div class="big num">${r0(Math.abs(remaining))}</div><div class="lbl">${over ? "kcal over" : "kcal left"}</div></div>
        </div>
        <div class="cal-lines">
          <div><span class="muted">Goal</span><b>${tg.kcal}</b></div>
          ${tg.bonus ? `<div><span class="muted">incl. exercise</span><b>+${tg.bonus}</b></div>` : ""}
          <div><span class="muted">Eaten</span><b>${r0(tot.kcal)}</b></div>
          <div><span class="muted">${over ? "Over" : "Remaining"}</span><b>${r0(Math.abs(remaining))}</b></div>
          <div><span class="goal-chip">${tg.direction === "lose" ? "📉 Losing" : tg.direction === "gain" ? "📈 Gaining" : "⚖️ Maintaining"} · ${fmtW(latestWeightKg(), 0)} → ${fmtW(p.goalWeightKg, 0)}</span></div>
        </div>
      </div>
    </div>
    ${needsWeigh ? `<button class="banner pop" data-act="log-weight"><span class="big-emo">⚖️</span><div><b>It's weigh-in day!</b><span>Log your weekly number to track real progress.</span></div></button>` : ""}
    <div class="card macros">
      <div class="card-head" style="margin-bottom:0"><h2>Macros</h2><button class="icon-q" data-act="edit-macros" aria-label="What are macros?">?</button></div>
      ${macro("🥩", "Protein", tot.p, tg.protein, "protein")}
      ${macro("🍞", "Carbs", tot.c, tg.carbs, "carbs")}
      ${macro("🥑", "Fat", tot.f, tg.fat, "fat")}
    </div>
    ${meals}
    <div class="card">
      <div class="card-head"><h2>💧 Water</h2><span class="meta num">${day.water} / ${waterGoal} cups</span></div>
      <div class="water"><div class="cups">${cups}</div>
        <button class="pill-btn" data-act="water" data-n="-1" aria-label="Remove a cup">−</button>
        <button class="pill-btn" data-act="water" data-n="1" aria-label="Add a cup">+ Cup</button></div>
    </div>
    <button class="btn secondary" data-act="copy-yesterday">Copy yesterday's meals</button>
  `;

  // Celebrate hitting the protein goal (once per day).
  if (isToday && tg.protein && tot.p >= tg.protein) {
    p.celebrated ||= {};
    if (p.celebrated.protein !== currentDay) {
      p.celebrated.protein = currentDay;
      save();
      confetti();
      toast("Protein goal hit! 💪");
    }
  }
}

/* Tiny confetti burst */
function confetti() {
  const cv = $("#confetti");
  if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = cv.getContext("2d");
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.hidden = false;
  const css = getComputedStyle(document.documentElement);
  const colors = [css.getPropertyValue("--g1"), css.getPropertyValue("--g2"), "#3987e5", "#eb6834", "#1baf7a", "#fde047"].map((c) => c.trim());
  const parts = Array.from({ length: 120 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0],
  }));
  const t0 = performance.now();
  const step = (t) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const q of parts) {
      q.vy += 0.35; q.x += q.vx; q.y += q.vy; q.a += q.va; q.vx *= 0.99;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillStyle = q.c;
      ctx.fillRect(-q.r / 2, -q.r / 4, q.r, q.r / 2); ctx.restore();
    }
    if (t - t0 < 2200) requestAnimationFrame(step);
    else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.hidden = true; }
  };
  requestAnimationFrame(step);
}

/* =========================================================
   Rendering: Progress
   ========================================================= */
function movingAvg(points, windowDays = 7) {
  return points.map((pt, i) => {
    const start = parseYmd(pt.date).getTime() - (windowDays - 1) * 864e5;
    const win = points.slice(0, i + 1).filter((q) => parseYmd(q.date).getTime() >= start);
    return { date: pt.date, kg: win.reduce((s, q) => s + q.kg, 0) / win.length };
  });
}

function weightChart(points, goalKg) {
  if (points.length < 2) {
    return `<div class="empty">Log at least two weigh-ins to see your trend.</div>`;
  }
  const W = 340, H = 200, L = 36, R = 8, T = 10, B = 24;
  const avg = movingAvg(points);
  const t0 = parseYmd(points[0].date).getTime();
  const t1 = parseYmd(points[points.length - 1].date).getTime();
  const vals = points.map((p) => toDispW(p.kg)).concat([toDispW(goalKg)]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const padV = Math.max(1, (hi - lo) * 0.1);
  lo -= padV; hi += padV;
  const x = (d) => L + ((parseYmd(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (kg) => T + (1 - (toDispW(kg) - lo) / (hi - lo)) * (H - T - B);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / ticks;
    const yy = T + (1 - i / ticks) * (H - T - B);
    return `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join("");
  const fmtD = (d) => parseYmd(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const gy = y(goalKg);
  const showGoal = gy >= T && gy <= H - B;
  const path = avg.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const wd = P().weighDay ?? 1;
  const dots = points.map((p) => parseYmd(p.date).getDay() === wd
    ? `<circle class="wk" cx="${x(p.date)}" cy="${y(p.kg)}" r="5"/>`
    : `<circle class="raw" cx="${x(p.date)}" cy="${y(p.kg)}" r="3"/>`).join("");
  window.__chart = { points, avg, x, y, W };
  return `<div class="chart-wrap" id="wChart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend chart">
      <g class="grid axis">${grid}</g>
      ${showGoal ? `<line class="goal-line" x1="${L}" x2="${W - R}" y1="${gy}" y2="${gy}"/><text class="goal-lbl" x="${W - R}" y="${gy - 4}" text-anchor="end">Goal</text>` : ""}
      ${dots}
      <path class="trend" d="${path}"/>
      <g class="axis"><text x="${L}" y="${H - 6}">${fmtD(points[0].date)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtD(points[points.length - 1].date)}</text></g>
      <g id="hover" style="display:none"><line class="cross" y1="${T}" y2="${H - B}"/><circle class="hdot" r="5"/></g>
    </svg>
    <div class="tip" id="wTip" hidden></div>
  </div>
  <div class="legend"><span><i></i>7-day trend</span><span><i class="dot"></i>Daily</span><span><i class="dot wkdot"></i>Weekly (${WEEKDAYS[wd]})</span></div>`;
}

function bindChartHover() {
  const wrap = $("#wChart");
  if (!wrap || !window.__chart) return;
  const { points, avg, x, y, W } = window.__chart;
  const svg = wrap.querySelector("svg");
  const hover = wrap.querySelector("#hover");
  const tip = wrap.querySelector("#wTip");
  const move = (ev) => {
    const rect = svg.getBoundingClientRect();
    const cx = ((ev.touches?.[0]?.clientX ?? ev.clientX) - rect.left) * (W / rect.width);
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.date) - cx) < Math.abs(x(points[best].date) - cx)) best = i; });
    const p = points[best], a = avg[best];
    const px = x(p.date);
    hover.style.display = "";
    hover.querySelector("line").setAttribute("x1", px);
    hover.querySelector("line").setAttribute("x2", px);
    hover.querySelector("circle").setAttribute("cx", px);
    hover.querySelector("circle").setAttribute("cy", y(a.kg));
    tip.hidden = false;
    tip.style.left = `${(px / W) * rect.width}px`;
    const wk = parseYmd(p.date).getDay() === (P().weighDay ?? 1) ? " ⭐" : "";
    tip.innerHTML = `${parseYmd(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${wk} · <b>${fmtW(p.kg)}</b> · trend ${fmtW(a.kg)}`;
  };
  const leave = () => { hover.style.display = "none"; tip.hidden = true; };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", leave);
}

function weeklyWeights(p = P()) {
  const wd = p.weighDay ?? 1;
  return [...(p.weights || [])].filter((w) => parseYmd(w.date).getDay() === wd).sort((a, b) => a.date.localeCompare(b.date));
}

function renderProgress() {
  const p = P();
  const tg = computeTargets();
  const pts = [...(p.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  const weekly = weeklyWeights();
  const wd = p.weighDay ?? 1;
  // Goal progress follows the weekly number when there is one.
  const cur = weekly.length ? weekly[weekly.length - 1].kg : latestWeightKg();
  const total = Math.abs(p.goalWeightKg - p.startWeightKg);
  const done = Math.abs(cur - p.startWeightKg);
  const towardGoal = Math.sign(p.goalWeightKg - p.startWeightKg) === Math.sign(cur - p.startWeightKg);
  const prog = total > 0 ? Math.max(0, Math.min(1, towardGoal ? done / total : 0)) : 1;
  const losing = p.goalWeightKg < p.startWeightKg;

  const deltaChip = (d) => {
    if (d == null) return "";
    const v = toDispW(Math.abs(d)).toFixed(1);
    if (Math.abs(d) < 0.02) return `<span class="delta">± 0.0</span>`;
    const good = losing ? d < 0 : d > 0;
    return `<span class="delta ${good ? "good" : "bad"}">${d < 0 ? "▼" : "▲"} ${v} ${wUnit()}</span>`;
  };
  const lastW = weekly[weekly.length - 1];
  const prevW = weekly[weekly.length - 2];

  // last 7 days of calories
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6));
  const kcals = days.map((d) => totals(dayData(d).entries).kcal);
  const maxK = Math.max(tg.kcal * 1.25, ...kcals);
  const logged = kcals.filter((k) => k > 0);
  const avgK = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const onTarget = logged.filter((k) => Math.abs(k - tg.kcal) <= tg.kcal * 0.1).length;
  const weekBars = days.map((d, i) => {
    const k = kcals[i];
    const h = k ? Math.max(3, (k / maxK) * 100) : 3;
    const cls = !k ? "none" : k > tg.kcal * 1.1 ? "over" : "";
    return `<div class="col" title="${r0(k)} kcal"><div class="b-area"><div class="b ${cls}" style="height:${h}%"></div></div><div class="d">${parseYmd(d).toLocaleDateString(undefined, { weekday: "narrow" })}</div></div>`;
  }).join("");

  $("#view-progress").innerHTML = `
    <div class="hero">
      <div class="hero-top"><h2>🎯 Goal progress</h2><span class="streak">${Math.round(prog * 100)}%</span></div>
      <div class="stats3">
        <div class="stat" style="background:rgba(255,255,255,.18)"><div class="v">${toDispW(p.startWeightKg).toFixed(1)}</div><div class="k muted">Start (${wUnit()})</div></div>
        <div class="stat" style="background:rgba(255,255,255,.18)"><div class="v">${toDispW(cur).toFixed(1)}</div><div class="k muted">${weekly.length ? "This week" : "Current"}</div></div>
        <div class="stat" style="background:rgba(255,255,255,.18)"><div class="v">${toDispW(p.goalWeightKg).toFixed(1)}</div><div class="k muted">Goal</div></div>
      </div>
      <div class="goal-bar" style="background:rgba(255,255,255,.25)"><i style="width:${prog * 100}%;background:#fff"></i></div>
      <div class="small muted">${
        tg.direction === "maintain" ? "You're at your goal — targets are set to maintain." :
        `${toDispW(Math.abs(p.goalWeightKg - cur)).toFixed(1)} ${wUnit()} to go${tg.goalDate ? ` · on pace for <b>${tg.goalDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</b>` : ""}`
      }</div>
    </div>

    <div class="card">
      <div class="card-head"><h2>⭐ Weekly weigh-in</h2><button class="meta" data-act="edit-weighday" style="color:var(--accent);font-weight:600">${WEEKDAYS[wd]}s ›</button></div>
      ${lastW ? `<div class="wk-hero"><div><div class="v">${toDispW(lastW.kg).toFixed(1)} <span class="small muted">${wUnit()}</span></div>
          <div class="small muted">${parseYmd(lastW.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${prevW ? " · vs last week" : " · your first weekly number"}</div></div>
          ${prevW ? deltaChip(lastW.kg - prevW.kg) : ""}</div>
        <div class="weigh-list" style="margin-top:10px">${[...weekly].reverse().slice(1, 9).map((w, i, arr) => {
          const older = weekly[weekly.length - 3 - i];
          return `<div class="wl"><span>${parseYmd(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span><b class="num">${fmtW(w.kg)}</b> ${older ? deltaChip(w.kg - older.kg) : ""}</span></div>`;
        }).join("")}</div>`
      : `<div class="empty">Weigh in on ${WEEKDAYS[wd]}s — that number becomes your official weekly check-in. Daily weigh-ins still feed the trend line.</div>`}
    </div>

    <div class="card">
      <div class="card-head"><h2>📈 Weight trend</h2><button class="pill-btn" data-act="log-weight">+ Weigh in</button></div>
      ${weightChart(pts, p.goalWeightKg)}
    </div>
    <div class="card">
      <div class="card-head"><h2>🔥 Last 7 days</h2><span class="meta num">avg ${r0(avgK)} kcal</span></div>
      <div class="week-wrap">
        <div class="week">${weekBars}</div>
        <div class="week-target" style="bottom:${(tg.kcal / maxK) * (120 - 17) + 17}px" title="Target"></div>
      </div>
      <div class="small muted" style="margin-top:8px">${logged.length} of 7 days logged · ${onTarget} within 10% of your ${tg.kcal} kcal goal (dashed line)</div>
    </div>
    <div class="card">
      <div class="card-head"><h2>All weigh-ins</h2></div>
      <div class="weigh-list">${
        pts.length ? [...pts].reverse().slice(0, 30).map((w) => {
          const wk = parseYmd(w.date).getDay() === wd;
          return `<div class="wl ${wk ? "weekly" : ""}"><span>${parseYmd(w.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${wk ? `<span class="weekly-tag">Weekly</span>` : ""}</span>
          <span><b class="num">${fmtW(w.kg)}</b> <button data-act="del-weight" data-date="${w.date}" aria-label="Delete">✕</button></span></div>`;
        }).join("")
        : `<div class="empty">No weigh-ins yet.</div>`
      }</div>
    </div>`;
  bindChartHover();
}

/* =========================================================
   Rendering: Settings
   ========================================================= */
function renderSettings() {
  const p = P();
  const tg = computeTargets();
  const others = Object.values(state.profiles).filter((x) => x.id !== p.id);
  const macroLabel = p.macroMode === "coach" ? `${(p.proteinPerLb || 1).toFixed(2).replace(/0$/, "")} g/lb protein` : PRESETS[p.macroPreset]?.label || "Custom";
  $("#view-settings").innerHTML = `
    <div class="hero">
      <div class="hero-top"><h2>Daily targets</h2><button class="streak" data-act="edit-macros">Adjust ›</button></div>
      <div class="targets-grid">
        <div><div class="v">${tg.kcal}</div><div class="k muted">kcal</div></div>
        <div><div class="v">${tg.protein}g</div><div class="k muted">🥩 Protein</div></div>
        <div><div class="v">${tg.carbs}g</div><div class="k muted">🍞 Carbs</div></div>
        <div><div class="v">${tg.fat}g</div><div class="k muted">🥑 Fat</div></div>
      </div>
      <p class="small muted" style="margin:12px 0 0">Maintenance ≈ ${tg.tdee} kcal/day${p.kcalOverride ? " · calorie goal set manually" : ""}</p>
    </div>
    ${tg.floored && !p.kcalOverride ? `<div class="note warn small">Your pace would put you below a safe minimum, so the goal is held at ${tg.kcal} kcal. A slower pace is more sustainable.</div>` : ""}

    <div class="section-label">Profile</div>
    <div class="list">
      <button data-act="edit-profile"><span>📏 Body stats & goal</span><span class="v">${fmtW(latestWeightKg(), 0)} → ${fmtW(p.goalWeightKg, 0)} ›</span></button>
      <button data-act="edit-macros"><span>🥩 Calories & macros</span><span class="v">${macroLabel} ›</span></button>
      <button data-act="edit-weighday"><span>⭐ Weekly weigh-in day</span><span class="v">${WEEKDAYS[p.weighDay ?? 1]} ›</span></button>
      <button data-act="edit-water"><span>💧 Water goal</span><span class="v">${p.waterGoal || 8} cups ›</span></button>
      <button data-act="edit-fitness-goals"><span>👟 Steps & exercise</span><span class="v">${(p.stepGoal || 8000).toLocaleString()} steps ›</span></button>
    </div>

    <div class="section-label">Theme</div>
    <div class="card">
      <div class="swatches">${Object.entries(THEMES).map(([k, t]) => `<button class="swatch ${p.accent === k ? "on" : ""}" data-act="accent" data-v="${k}"><i style="background:linear-gradient(135deg, ${t.g[0]}, ${t.g[1]})"></i>${t.label}</button>`).join("")}</div>
      <div class="seg" style="margin:14px 0 0">${["auto", "light", "dark"].map((m) => `<button class="${(p.mode || "auto") === m ? "on" : ""}" data-act="mode" data-v="${m}">${m === "auto" ? "Match phone" : m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>
      ${p.accent === "midnight" ? `<p class="hint" style="margin:8px 0 0">Midnight is always dark.</p>` : ""}
    </div>

    <div class="section-label">Claude (photos & screenshots)</div>
    <div class="list">
      <button data-act="edit-ai"><span>✨ API key & model</span><span class="v">${state.apiKey ? "Connected ✓" : "Not set up"} ›</span></button>
    </div>

    <div class="section-label">People on this device</div>
    <div class="list">
      ${others.map((o) => `<button data-act="switch" data-id="${o.id}"><span>Switch to ${esc(o.name)}</span><span class="v">›</span></button>`).join("")}
      <button data-act="new-profile"><span>Add a person</span><span class="v">+</span></button>
    </div>

    <div class="section-label">Data</div>
    <div class="list">
      <button data-act="export"><span>Back up / export</span><span class="v">.json ›</span></button>
      <button data-act="import"><span>Restore from backup</span><span class="v">›</span></button>
      <button data-act="delete-profile" style="color:var(--danger)"><span>Delete ${esc(p.name)}'s profile</span><span></span></button>
    </div>
    <p class="small muted" style="text-align:center">Data is stored only on this device.</p>`;
}

/* =========================================================
   Profile form (onboarding + editing)
   ========================================================= */
function profileForm(p, isNew) {
  const imp = (p?.units || "imperial") === "imperial";
  const hIn = p ? p.heightCm / 2.54 : 67;
  const curKg = p ? latestWeightKg(p) : null;
  const wv = (kg) => (kg == null ? "" : (imp ? kg / LB : kg).toFixed(1).replace(/\.0$/, ""));
  const paceOpts = imp
    ? [[0.25, "0.25 lb/week (gentle)"], [0.5, "0.5 lb/week"], [1, "1 lb/week (recommended)"], [1.5, "1.5 lb/week"], [2, "2 lb/week (aggressive)"]]
    : [[0.1, "0.1 kg/week (gentle)"], [0.25, "0.25 kg/week"], [0.5, "0.5 kg/week (recommended)"], [0.75, "0.75 kg/week"], [1, "1 kg/week (aggressive)"]];
  const curPace = p ? (imp ? p.paceKg / LB : p.paceKg) : imp ? 1 : 0.5;
  const nearestPace = paceOpts.reduce((a, b) => (Math.abs(b[0] - curPace) < Math.abs(a[0] - curPace) ? b : a))[0];

  return `
  ${isNew && !Object.keys(state.profiles).length ? `<div class="welcome"><img class="logo" src="icons/icon.svg" alt=""><h2>Welcome to Macro Pal</h2><p>A few quick details and we'll set your daily calorie and macro targets.</p></div><br>` : sheetTitle(isNew ? "Add a person" : "Body stats & goal", true)}
  <form id="profileForm" autocomplete="off">
    <label class="field"><span>Name</span><input name="name" required maxlength="24" value="${esc(p?.name || "")}" placeholder="Your name"></label>
    <div class="seg" data-units>${["imperial", "metric"].map((u) => `<button type="button" class="${(p?.units || "imperial") === u ? "on" : ""}" data-units-v="${u}">${u === "imperial" ? "lb / ft" : "kg / cm"}</button>`).join("")}</div>
    <input type="hidden" name="units" value="${p?.units || "imperial"}">
    <div class="row2">
      <label class="field"><span>Sex</span><select name="sex"><option value="male" ${p?.sex === "male" ? "selected" : ""}>Male</option><option value="female" ${p?.sex === "female" ? "selected" : ""}>Female</option></select></label>
      <label class="field"><span>Age</span><input name="age" type="number" inputmode="numeric" min="13" max="100" required value="${p ? ageOf(p) : ""}"></label>
    </div>
    <div class="height-imp" ${imp ? "" : "hidden"}>
      <div class="row2">
        <label class="field"><span>Height (ft)</span><input name="ft" type="number" inputmode="numeric" min="3" max="8" value="${Math.floor(hIn / 12)}"></label>
        <label class="field"><span>(in)</span><input name="in" type="number" inputmode="numeric" min="0" max="11" value="${Math.round(hIn % 12)}"></label>
      </div>
    </div>
    <div class="height-met" ${imp ? "hidden" : ""}>
      <label class="field"><span>Height (cm)</span><input name="cm" type="number" inputmode="decimal" min="100" max="250" value="${p ? Math.round(p.heightCm) : ""}"></label>
    </div>
    <div class="row2">
      <label class="field"><span>Current weight (<i class="wu">${imp ? "lb" : "kg"}</i>)</span><input name="weight" type="number" inputmode="decimal" step="0.1" required value="${wv(curKg)}"></label>
      <label class="field"><span>Goal weight (<i class="wu">${imp ? "lb" : "kg"}</i>)</span><input name="goal" type="number" inputmode="decimal" step="0.1" required value="${wv(p?.goalWeightKg)}"></label>
    </div>
    <label class="field"><span>Activity level</span><select name="activity">${ACTIVITY.map((a) => `<option value="${a.v}" ${(p?.activity || 1.375) === a.v ? "selected" : ""}>${a.label} — ${a.hint}</option>`).join("")}</select></label>
    <label class="field"><span>Pace toward goal</span><select name="pace">${paceOpts.map(([v, l]) => `<option value="${v}" ${v === nearestPace ? "selected" : ""}>${l}</option>`).join("")}</select>
      <span class="hint">Used when your goal is to lose or gain. For gaining, slower is usually better.</span></label>
    ${isNew ? `<label class="field"><span>Protein goal</span><select name="ppl">
        <option value="0.7">Moderate — 0.7 g per lb of goal weight</option>
        <option value="0.8">Active — 0.8 g per lb</option>
        <option value="1" selected>Lifting / toning — 1 g per lb (popular)</option>
        <option value="1.2">High — 1.2 g per lb</option>
      </select><span class="hint">You can fine-tune this any time with the macro coach.</span></label>` : ""}
    <button class="btn" type="submit">${isNew ? "Calculate my targets" : "Save"}</button>
    ${!isNew ? "" : Object.keys(state.profiles).length ? `<button class="btn secondary" type="button" data-act="close">Cancel</button>` : ""}
  </form>`;
}

function bindProfileForm(existing) {
  const form = $("#profileForm");
  form.querySelectorAll("[data-units-v]").forEach((b) =>
    b.addEventListener("click", () => {
      const u = b.dataset.unitsV;
      const prev = form.units.value;
      if (u === prev) return;
      form.units.value = u;
      form.querySelectorAll("[data-units-v]").forEach((x) => x.classList.toggle("on", x === b));
      form.querySelector(".height-imp").hidden = u !== "imperial";
      form.querySelector(".height-met").hidden = u === "imperial";
      form.querySelectorAll(".wu").forEach((x) => (x.textContent = u === "imperial" ? "lb" : "kg"));
      const conv = (v) => (v === "" ? "" : r1(u === "metric" ? Number(v) * LB : Number(v) / LB));
      form.weight.value = conv(form.weight.value);
      form.goal.value = conv(form.goal.value);
      if (u === "metric" && form.ft.value) form.cm.value = Math.round((Number(form.ft.value) * 12 + Number(form.in.value || 0)) * 2.54);
      if (u === "imperial" && form.cm.value) { const i = Number(form.cm.value) / 2.54; form.ft.value = Math.floor(i / 12); form.in.value = Math.round(i % 12); }
      // pace options are unit-specific; rebuild by re-rendering pace select
      const opts = u === "imperial"
        ? [[0.25, "0.25 lb/week (gentle)"], [0.5, "0.5 lb/week"], [1, "1 lb/week (recommended)"], [1.5, "1.5 lb/week"], [2, "2 lb/week (aggressive)"]]
        : [[0.1, "0.1 kg/week (gentle)"], [0.25, "0.25 kg/week"], [0.5, "0.5 kg/week (recommended)"], [0.75, "0.75 kg/week"], [1, "1 kg/week (aggressive)"]];
      form.pace.innerHTML = opts.map(([v, l]) => `<option value="${v}" ${l.includes("recommended") ? "selected" : ""}>${l}</option>`).join("");
    })
  );
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const imp = f.units === "imperial";
    const heightCm = imp ? (Number(f.ft) * 12 + Number(f.in || 0)) * 2.54 : Number(f.cm);
    const toKg = (v) => (imp ? Number(v) * LB : Number(v));
    if (!f.name.trim() || !heightCm || !Number(f.weight) || !Number(f.goal)) return toast("Please fill in every field.");
    const weightKg = toKg(f.weight);
    const base = {
      name: f.name.trim(), units: f.units, sex: f.sex,
      birthYear: new Date().getFullYear() - Number(f.age),
      heightCm, goalWeightKg: toKg(f.goal), activity: Number(f.activity),
      paceKg: imp ? Number(f.pace) * LB : Number(f.pace),
    };
    if (existing) {
      const goalChanged = Math.abs(existing.goalWeightKg - base.goalWeightKg) > 0.05;
      Object.assign(existing, base);
      if (Math.abs(latestWeightKg(existing) - weightKg) > 0.05) logWeight(weightKg, today(), existing);
      if (goalChanged) existing.startWeightKg = weightKg;
      save(); closeSheet(); render(); toast("Saved");
    } else {
      const id = uid();
      const accents = Object.keys(THEMES);
      const used = Object.values(state.profiles).map((x) => x.accent);
      state.profiles[id] = {
        id, ...base, startWeightKg: weightKg, macroMode: "coach", proteinPerLb: Number(f.ppl) || 1, fatPerLb: 0.35, macroPreset: "balanced",
        weighDay: 1, stepGoal: 8000, eatBack: 0,
        customSplit: { p: 30, c: 40, f: 30 }, accent: accents.find((a) => !used.includes(a)) || "ocean",
        mode: "auto", waterGoal: 8, days: {}, weights: [{ date: today(), kg: weightKg }], foods: [],
      };
      state.activeId = id;
      save(); closeSheet(); tab = "today"; currentDay = today(); render();
      showTargetsIntro();
    }
  });
}

function showTargetsIntro() {
  const tg = computeTargets();
  openSheet(`${sheetTitle("Your daily targets")}
    <div class="card" style="margin-bottom:12px"><div class="targets-grid">
      <div><div class="v">${tg.kcal}</div><div class="k">kcal</div></div>
      <div><div class="v" style="color:var(--protein)">${tg.protein}g</div><div class="k">Protein</div></div>
      <div><div class="v" style="color:var(--carbs)">${tg.carbs}g</div><div class="k">Carbs</div></div>
      <div><div class="v" style="color:var(--fat)">${tg.fat}g</div><div class="k">Fat</div></div></div></div>
    <div class="note">Your body burns about <b>${tg.tdee} kcal/day</b>. ${
      tg.direction === "lose" ? `Eating ${tg.kcal} puts you on track to reach your goal around <b>${tg.goalDate?.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</b>.` :
      tg.direction === "gain" ? `Eating ${tg.kcal} puts you on track to reach your goal around <b>${tg.goalDate?.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</b>.` :
      "These targets will keep you at your current weight."}</div>
    ${tg.floored ? `<div class="note warn">That pace would go below a safe minimum, so your goal is held at ${tg.kcal} kcal.</div>` : ""}
    <p class="small muted">Tip: tap <b>+</b> to log food. Add a photo and Claude will estimate it. Tap <b>?</b> next to Macros any time for the macro coach. Change themes and add your partner's profile in Settings.</p>
    <button class="btn" data-act="close">Let's go</button>`);
}

/* =========================================================
   Weight
   ========================================================= */
function logWeight(kg, date = today(), p = P()) {
  p.weights ||= [];
  p.weights = p.weights.filter((w) => w.date !== date);
  p.weights.push({ date, kg });
  p.weights.sort((a, b) => a.date.localeCompare(b.date));
}
function openWeightSheet() {
  openSheet(`${sheetTitle("Weigh in")}
    <form id="wForm">
      <label class="field"><span>Weight (${wUnit()})</span><input name="w" type="number" inputmode="decimal" step="0.1" required autofocus value="${toDispW(latestWeightKg()).toFixed(1)}"></label>
      <label class="field"><span>Date</span><input name="d" type="date" value="${today()}" max="${today()}"></label>
      <p class="hint">Weigh at the same time each day (morning, after the bathroom) for the cleanest trend. Your targets update automatically.</p>
      <button class="btn">Save</button>
    </form>`);
  $("#wForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = Number(e.target.w.value);
    if (!v) return;
    logWeight(fromDispW(v), e.target.d.value || today());
    save(); closeSheet(); render(); toast("Weight logged");
  });
}

/* =========================================================
   Add food sheet
   ========================================================= */
let addState = null;

function openAdd(meal) {
  addState = { meal: meal || defaultMeal(), mode: "photo", q: "" };
  renderAdd();
}

function mealPicker() {
  return `<div class="seg">${MEALS.map((m) => `<button class="${addState.meal === m ? "on" : ""}" data-act="pick-meal" data-v="${m}">${m}</button>`).join("")}</div>`;
}

function renderAdd() {
  const modes = [["photo", "📷 Photo"], ["foods", "My foods"], ["quick", "Quick add"]];
  let body = "";
  if (addState.mode === "photo") body = photoBody();
  if (addState.mode === "foods") body = foodsBody();
  if (addState.mode === "quick") body = quickBody();
  const html = `${sheetTitle(`Add to ${addState.meal}`)}
    ${mealPicker()}
    <div class="chips" style="margin-bottom:14px">${modes.map(([k, l]) => `<button class="chip ${addState.mode === k ? "on" : ""}" data-act="add-mode" data-v="${k}">${l}</button>`).join("")}</div>
    <div id="addBody">${body}</div>`;
  if ($("#sheet").hidden) openSheet(html, () => (addState = null));
  else $("#sheetBody").innerHTML = html;
  if (addState.mode === "foods") bindFoodSearch();
  if (addState.mode === "quick") bindQuick();
}

function foodsBody() {
  return `<input class="input search" id="foodSearch" type="search" placeholder="Search your foods" value="${esc(addState.q)}">
    <div id="foodResults">${foodResults()}</div>`;
}
function foodResults() {
  const p = P();
  const q = addState.q.trim().toLowerCase();
  let foods = [...(p.foods || [])];
  foods.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  if (q) foods = foods.filter((f) => f.name.toLowerCase().includes(q));
  if (!foods.length) return `<div class="empty">${q ? "No matches." : "Foods you log are saved here for one-tap adding."}</div>`;
  return `<div class="food-list">${foods.slice(0, 60).map((f) => `
    <button class="food-item" data-act="add-food" data-id="${f.id}">
      <div class="grow"><div class="nm">${esc(f.name)}</div><div class="sub num">${f.portion ? esc(f.portion) + " · " : ""}${r0(f.kcal)} kcal · P ${r0(f.p)} · C ${r0(f.c)} · F ${r0(f.f)}</div></div>
      <span class="plus-sm">+</span></button>`).join("")}</div>`;
}
function bindFoodSearch() {
  const s = $("#foodSearch");
  s?.addEventListener("input", () => { addState.q = s.value; $("#foodResults").innerHTML = foodResults(); });
}

function entryFields(e = {}) {
  return `
    <label class="field"><span>Food name</span><input name="name" required maxlength="60" value="${esc(e.name || "")}" placeholder="e.g. Greek yogurt"></label>
    <div class="row2">
      <label class="field"><span>Serving</span><input name="portion" maxlength="30" value="${esc(e.portion || "")}" placeholder="e.g. 1 cup"></label>
      <label class="field"><span>Servings eaten</span><input name="servings" type="number" inputmode="decimal" step="0.25" min="0.25" value="${e.servings || 1}"></label>
    </div>
    <label class="field"><span>Calories (per serving)</span><input name="kcal" type="number" inputmode="decimal" min="0" value="${e.kcal ?? ""}" placeholder="auto from macros if blank"></label>
    <div class="row3">
      <label class="field"><span style="color:var(--protein)">Protein g</span><input name="p" type="number" inputmode="decimal" step="0.1" min="0" value="${e.p ?? ""}"></label>
      <label class="field"><span style="color:var(--carbs)">Carbs g</span><input name="c" type="number" inputmode="decimal" step="0.1" min="0" value="${e.c ?? ""}"></label>
      <label class="field"><span style="color:var(--fat)">Fat g</span><input name="f" type="number" inputmode="decimal" step="0.1" min="0" value="${e.f ?? ""}"></label>
    </div>`;
}
function readEntry(form) {
  const f = Object.fromEntries(new FormData(form));
  const p = Number(f.p) || 0, c = Number(f.c) || 0, fat = Number(f.f) || 0;
  let kcal = Number(f.kcal);
  if (!f.kcal) kcal = p * 4 + c * 4 + fat * 9;
  return { name: f.name.trim(), portion: f.portion.trim(), servings: Number(f.servings) || 1, kcal: r0(kcal), p: r1(p), c: r1(c), f: r1(fat) };
}

function quickBody() {
  return `<form id="quickForm">${entryFields()}
    <label class="field" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="save" checked style="width:auto"> <span style="font-weight:500">Save to My foods</span></label>
    <button class="btn">Add</button></form>`;
}
function bindQuick() {
  $("#quickForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const en = readEntry(e.target);
    if (!en.name) return toast("Give it a name.");
    const meal = addState.meal;
    addEntry(en, { saveFood: e.target.save.checked });
    closeSheet(); render(); toast(`Added to ${meal}`);
  });
}

function addEntry(en, { saveFood = true, ai = false } = {}) {
  const day = ensureDay();
  const entry = { id: uid(), meal: addState?.meal || defaultMeal(), ...en, ai };
  day.entries.push(entry);
  if (saveFood) rememberFood(en);
  save();
  return entry;
}
function rememberFood(en) {
  const p = P();
  p.foods ||= [];
  const key = en.name.toLowerCase();
  let f = p.foods.find((x) => x.name.toLowerCase() === key && (x.portion || "") === (en.portion || ""));
  if (!f) { f = { id: uid(), uses: 0 }; p.foods.push(f); }
  Object.assign(f, { name: en.name, portion: en.portion, kcal: en.kcal, p: en.p, c: en.c, f: en.f, lastUsed: Date.now() });
  f.uses = (f.uses || 0) + 1;
}

/* ---------- Photo / Claude ---------- */
let photo = null; // { file, image, est, answers, loading, error, desc }

function photoBody() {
  if (!state.apiKey) {
    return `<div class="note">Photo estimates use Claude. Add your Anthropic API key once in <b>Settings → API key</b>, then snap a photo and get calories and macros in seconds.</div>
      <button class="btn" data-act="edit-ai">Set up photo estimates</button>
      <p class="small muted" style="text-align:center;margin-top:10px">Or describe the meal in words after setup — no photo needed.</p>`;
  }
  if (!photo) photo = { image: null, est: null, answers: {}, desc: "" };
  if (photo.loading) {
    return `${photo.image ? `<img class="photo-preview" src="${photo.image.dataUrl}" alt="Your photo">` : ""}
      <div class="empty"><div class="spinner"></div>Claude is looking at your food…</div>`;
  }
  if (!photo.est) {
    return `${photo.image
        ? `<img class="photo-preview" src="${photo.image.dataUrl}" alt="Your photo"><button class="btn secondary" data-act="pick-photo" style="margin-bottom:12px">Retake / choose another</button>`
        : `<button class="photo-drop" data-act="pick-photo"><span class="cam">📷</span><b>Take or choose a photo</b><span class="small">Claude will estimate calories and macros</span></button><br>`}
      <label class="field"><span>Anything Claude should know? (optional)</span>
        <textarea id="photoDesc" rows="2" placeholder="e.g. chicken burrito bowl, no sour cream, I ate about half">${esc(photo.desc)}</textarea></label>
      ${photo.error ? `<div class="note warn">${esc(photo.error)}</div>` : ""}
      <button class="btn" data-act="run-estimate">${photo.image ? "Estimate this meal" : "Estimate from description"}</button>`;
  }
  const est = photo.est;
  const tot = est.items.reduce((t, i) => ({ kcal: t.kcal + i.kcal, p: t.p + i.p, c: t.c + i.c, f: t.f + i.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return `${photo.image ? `<img class="photo-preview" src="${photo.image.dataUrl}" alt="Your photo" style="max-height:160px">` : ""}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Claude's estimate</b><span class="badge">${esc(est.confidence)} confidence</span></div>
    ${est.notes ? `<div class="note">${esc(est.notes)}</div>` : ""}
    ${photo.error ? `<div class="note warn">${esc(photo.error)}</div>` : ""}
    ${est.questions.length ? `<div style="margin-bottom:6px"><b>A few quick questions</b> <span class="small muted">— answer to sharpen the estimate</span></div>
      ${est.questions.map((q, qi) => `<div class="question"><p>${esc(q.question)}</p>
        <div class="chips">${q.options.map((o) => `<button class="chip ${photo.answers[qi] === o ? "on" : ""}" data-act="answer" data-q="${qi}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
        <input class="input" data-q-text="${qi}" placeholder="Or type an answer" value="${esc(q.options.includes(photo.answers[qi]) ? "" : photo.answers[qi] || "")}"></div>`).join("")}
      <button class="btn secondary" data-act="refine" style="margin-bottom:14px">Update estimate with my answers</button>` : ""}
    <div id="aiItems">${est.items.map((it, i) => `<div class="ai-item" data-i="${i}">
        <div class="hdr"><input class="input" data-k="name" value="${esc(it.name)}" aria-label="Food name"><button class="rm" data-act="ai-rm" data-i="${i}">Remove</button></div>
        <div class="small muted" style="margin-bottom:6px">${esc(it.portion)}</div>
        <div class="row4">
          <label>kcal<input class="input num" data-k="kcal" type="number" inputmode="decimal" value="${it.kcal}"></label>
          <label style="color:var(--protein)">Protein<input class="input num" data-k="p" type="number" inputmode="decimal" value="${it.p}"></label>
          <label style="color:var(--carbs)">Carbs<input class="input num" data-k="c" type="number" inputmode="decimal" value="${it.c}"></label>
          <label style="color:var(--fat)">Fat<input class="input num" data-k="f" type="number" inputmode="decimal" value="${it.f}"></label>
        </div></div>`).join("") || `<div class="empty">No food found. Try another photo or add a description.</div>`}</div>
    ${est.items.length ? `<div class="ai-total num"><span>Total</span><span>${r0(tot.kcal)} kcal · P ${r0(tot.p)} · C ${r0(tot.c)} · F ${r0(tot.f)}</span></div>
    <button class="btn" data-act="ai-add">Add ${est.items.length > 1 ? `all ${est.items.length} items` : "to log"}</button>` : ""}
    <button class="btn secondary" data-act="ai-reset">Start over</button>`;
}

function syncAiEdits() {
  if (!photo?.est) return;
  document.querySelectorAll("#aiItems .ai-item").forEach((el) => {
    const it = photo.est.items[Number(el.dataset.i)];
    el.querySelectorAll("[data-k]").forEach((inp) => {
      const k = inp.dataset.k;
      it[k] = k === "name" ? inp.value : Number(inp.value) || 0;
    });
  });
  document.querySelectorAll("[data-q-text]").forEach((inp) => {
    if (inp.value.trim()) photo.answers[Number(inp.dataset.qText)] = inp.value.trim();
  });
}

async function runEstimate(refine = false) {
  const descEl = $("#photoDesc");
  if (descEl) photo.desc = descEl.value;
  if (!photo.image && !photo.desc.trim()) return toast("Add a photo or a description first.");
  let answers = [], previous = null;
  if (refine) {
    syncAiEdits();
    answers = photo.est.questions.map((q, i) => ({ question: q.question, answer: photo.answers[i] })).filter((a) => a.answer);
    if (!answers.length) return toast("Answer at least one question first.");
    previous = photo.est;
  }
  photo.loading = true; photo.error = null;
  const keepEst = photo.est;
  renderAdd();
  try {
    const est = await estimateFood({
      apiKey: state.apiKey, model: state.model || DEFAULT_MODEL,
      image: photo.image, description: photo.desc, answers, previous,
    });
    if (!photo) return; // sheet was closed
    photo.est = est; photo.answers = {};
  } catch (err) {
    if (!photo) return;
    photo.error = err.message;
    photo.est = keepEst;
  }
  photo.loading = false;
  if (addState) renderAdd();
}

/* =========================================================
   Edit entry
   ========================================================= */
function openEditEntry(id) {
  const day = ensureDay();
  const e = day.entries.find((x) => x.id === id);
  if (!e) return;
  openSheet(`${sheetTitle("Edit food")}
    <form id="editForm">
      <label class="field"><span>Meal</span><select name="meal">${MEALS.map((m) => `<option ${m === e.meal ? "selected" : ""}>${m}</option>`).join("")}</select></label>
      ${entryFields(e)}
      <button class="btn">Save</button>
      <button class="btn danger" type="button" data-act="del-entry" data-id="${id}">Delete</button>
    </form>`);
  $("#editForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    Object.assign(e, readEntry(ev.target), { meal: ev.target.meal.value });
    save(); closeSheet(); render();
  });
}

/* =========================================================
   Other sheets
   ========================================================= */
let coach = null; // draft while the macro coach is open

function paceChoices() {
  return imperial()
    ? [0.25, 0.5, 1, 1.5, 2].map((v) => ({ kg: v * LB, label: `${v} lb/week` }))
    : [0.1, 0.25, 0.5, 0.75, 1].map((v) => ({ kg: v, label: `${v} kg/week` }));
}

function proteinNote(ppl) {
  if (ppl < 0.75) return "Baseline — covers general health needs.";
  if (ppl < 0.95) return "Active — good if you exercise regularly.";
  if (ppl < 1.15) return "Lifting — the popular gym rule of thumb. 👍";
  if (ppl < 1.35) return "High — on the upper end of what research supports.";
  return "Very high — more than most bodies use; it crowds out carbs. Fine if you like it!";
}

function openMacros() {
  const p = P();
  coach = {
    mode: p.macroMode === "preset" && p.seenCoach ? "preset" : "coach",
    ppl: p.proteinPerLb || 1, fpl: p.fatPerLb || 0.35,
    preset: p.macroPreset || "balanced", custom: { ...(p.customSplit || { p: 30, c: 40, f: 30 }) },
    paceKg: p.paceKg, override: p.kcalOverride || 0,
  };
  renderCoach();
}

function coachProfile() {
  const p = P();
  return { ...p, macroMode: coach.mode, proteinPerLb: coach.ppl, fatPerLb: coach.fpl, macroPreset: coach.preset, customSplit: coach.custom, paceKg: coach.paceKg, kcalOverride: coach.override };
}

function renderCoach() {
  const p = P();
  const tg = computeTargets(coachProfile());
  const goalLb = p.goalWeightKg / LB;
  const html = `${sheetTitle("Calories & macros")}
    <details class="explain" ${p.seenCoach ? "" : "open"}>
      <summary>🤔 What are macros?</summary>
      <div class="in">
        <p>Every calorie you eat comes from three <b>macros</b>:</p>
        <div class="kcal-per"><div>🥩<b>4</b>kcal per g<br>Protein</div><div>🍞<b>4</b>kcal per g<br>Carbs</div><div>🥑<b>9</b>kcal per g<br>Fat</div></div>
        <p>A <b>macro split</b> like 40/30/30 means 40% of your <i>calories</i> come from protein. Because percentages scale with calories, they can give strange numbers: 50% protein on a 3,200 kcal day is 1,600 kcal ÷ 4 = <b>400 g</b>. Way too much!</p>
        <p>The easier way, used below: <b>① pick your calories</b>, <b>② set protein by your goal weight</b> (grams per lb), <b>③ keep fat at a healthy amount</b>, and carbs fill in the rest automatically.</p>
      </div>
    </details>

    <div class="seg">${[["coach", "Macro coach (grams)"], ["preset", "% presets"]].map(([k, l]) => `<button class="${coach.mode === k ? "on" : ""}" data-act="coach-mode" data-v="${k}">${l}</button>`).join("")}</div>

    <h3 style="margin:4px 2px 4px">① Daily calories</h3>
    <p class="small muted" style="margin:0 2px 10px">Your body burns about <b>${tg.tdee} kcal/day</b> (maintenance) at your current weight and activity level. ${
      tg.direction === "lose" ? "Eat less than that to lose:" : tg.direction === "gain" ? "Eat more than that to gain:" : "You're at your goal, so aim for maintenance."}</p>
    <div class="pace-list" id="paceList">${tg.direction === "maintain" ? "" : paceChoices().map((c) => {
      const t = computeTargets({ ...coachProfile(), paceKg: c.kg, kcalOverride: 0 });
      const on = !coach.override && Math.abs(c.kg - coach.paceKg) < 0.01;
      return `<button class="pace ${on ? "on" : ""} ${t.floored ? "low" : ""}" data-act="coach-pace" data-v="${c.kg}">
        <div><div style="font-weight:600">${tg.direction === "lose" ? "Lose" : "Gain"} ${c.label}</div>
        <div class="d">${t.floored ? "Too aggressive — held at safe minimum" : t.goalDate ? `Goal around ${t.goalDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : ""}</div></div>
        <b class="num">${t.kcal}</b></button>`;
    }).join("")}</div>
    <label class="field"><span>Or set your own calorie goal</span><input id="coachKcal" type="number" inputmode="numeric" min="800" max="6000" value="${coach.override || ""}" placeholder="Using ${computeTargets({ ...coachProfile(), kcalOverride: 0 }).kcal} kcal"></label>

    ${coach.mode === "coach" ? `
    <h3 style="margin:14px 2px 8px">② Protein</h3>
    <div class="slider-card">
      <div class="top"><span><b class="num" id="pG">${Math.round(goalLb * coach.ppl)} g</b> <span class="muted small">/day</span></span><span class="num" id="pPer" style="font-weight:700;color:var(--protein)">${coach.ppl.toFixed(2)} g/lb</span></div>
      <div class="sub" id="pSub">${coach.ppl.toFixed(2)} g × ${Math.round(goalLb)} lb goal weight · ${proteinNote(coach.ppl)}</div>
      <input type="range" id="pRange" min="0.6" max="1.6" step="0.05" value="${coach.ppl}" aria-label="Protein grams per pound">
      <div class="ticks"><span>0.6</span><span>0.8</span><span>1.0</span><span>1.2</span><span>1.4</span><span>1.6</span></div>
    </div>
    <h3 style="margin:14px 2px 8px">③ Fat</h3>
    <div class="slider-card">
      <div class="top"><span><b class="num" id="fG">${Math.round(goalLb * coach.fpl)} g</b> <span class="muted small">/day</span></span><span class="num" style="font-weight:700;color:var(--fat)" id="fPer">${coach.fpl.toFixed(2)} g/lb</span></div>
      <div class="sub">Keep at least ~0.3 g per lb for hormones and energy. 0.35–0.45 suits most people.</div>
      <input type="range" id="fRange" min="0.25" max="0.6" step="0.05" value="${coach.fpl}" aria-label="Fat grams per pound">
    </div>` : `
    <h3 style="margin:14px 2px 8px">② Pick a split</h3>
    <div class="chips" style="margin-bottom:12px">${Object.entries(PRESETS).map(([k, v]) => `<button class="chip ${coach.preset === k ? "on" : ""}" data-act="coach-preset" data-v="${k}">${v.label}${v.p ? ` ${v.p}/${v.c}/${v.f}` : ""}</button>`).join("")}</div>
    ${coach.preset === "custom" ? `<div class="row3">
      <label class="field"><span style="color:var(--protein)">Protein %</span><input id="cP" type="number" inputmode="numeric" value="${coach.custom.p}"></label>
      <label class="field"><span style="color:var(--carbs)">Carbs %</span><input id="cC" type="number" inputmode="numeric" value="${coach.custom.c}"></label>
      <label class="field"><span style="color:var(--fat)">Fat %</span><input id="cF" type="number" inputmode="numeric" value="${coach.custom.f}"></label></div>` : ""}`}

    <h3 style="margin:14px 2px 8px">Your day looks like</h3>
    <div class="slider-card" id="coachResult">${coachResult(tg)}</div>
    <button class="btn" data-act="coach-save">Save targets</button>`;
  if ($("#sheet").hidden) openSheet(html, () => (coach = null));
  else { const st = $("#sheetBody").scrollTop; $("#sheetBody").innerHTML = html; $("#sheetBody").scrollTop = st; }
  bindCoach();
}

function coachResult(tg) {
  const pk = tg.protein * 4, ck = tg.carbs * 4, fk = tg.fat * 9, sum = pk + ck + fk || 1;
  const pct = (k) => Math.round((k / sum) * 100);
  return `<div class="top"><span><b class="num">${tg.kcal}</b> <span class="muted small">kcal/day</span></span></div>
    <div class="stack" aria-hidden="true"><i style="flex:${pk};background:var(--protein)"></i><i style="flex:${ck};background:var(--carbs)"></i><i style="flex:${fk};background:var(--fat)"></i></div>
    <div class="stack-legend">
      <div><span>🥩 Protein</span><b class="num">${tg.protein} g</b><span class="muted num">${pk} kcal · ${pct(pk)}%</span></div>
      <div><span>🍞 Carbs</span><b class="num">${tg.carbs} g</b><span class="muted num">${ck} kcal · ${pct(ck)}%</span></div>
      <div><span>🥑 Fat</span><b class="num">${tg.fat} g</b><span class="muted num">${fk} kcal · ${pct(fk)}%</span></div>
    </div>
    ${coach.mode === "coach" && tg.carbs < 50 ? `<div class="note warn small" style="margin:10px 0 0">Almost no room left for carbs. Lower protein or fat, or raise calories.</div>` : ""}`;
}

function bindCoach() {
  const live = () => {
    const tg = computeTargets(coachProfile());
    const goalLb = P().goalWeightKg / LB;
    if ($("#pG")) {
      $("#pG").textContent = `${Math.round(goalLb * coach.ppl)} g`;
      $("#pPer").textContent = `${coach.ppl.toFixed(2)} g/lb`;
      $("#pSub").textContent = `${coach.ppl.toFixed(2)} g × ${Math.round(goalLb)} lb goal weight · ${proteinNote(coach.ppl)}`;
      $("#fG").textContent = `${Math.round(goalLb * coach.fpl)} g`;
      $("#fPer").textContent = `${coach.fpl.toFixed(2)} g/lb`;
    }
    $("#coachResult").innerHTML = coachResult(tg);
  };
  $("#pRange")?.addEventListener("input", (e) => { coach.ppl = Number(e.target.value); live(); });
  $("#fRange")?.addEventListener("input", (e) => { coach.fpl = Number(e.target.value); live(); });
  $("#coachKcal")?.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    coach.override = v >= 800 ? v : 0;
    document.querySelectorAll(".pace").forEach((b) => b.classList.toggle("on", !coach.override && Math.abs(Number(b.dataset.v) - coach.paceKg) < 0.01));
    live();
  });
  for (const [id, k] of [["cP", "p"], ["cC", "c"], ["cF", "f"]]) {
    $("#" + id)?.addEventListener("input", (e) => { coach.custom[k] = Number(e.target.value) || 0; live(); });
  }
}

function saveCoach() {
  const p = P();
  if (coach.mode === "preset" && coach.preset === "custom") {
    const t = coach.custom.p + coach.custom.c + coach.custom.f;
    if (t !== 100) return toast(`Your % add up to ${t} — they need to make 100.`);
  }
  Object.assign(p, {
    macroMode: coach.mode, proteinPerLb: coach.ppl, fatPerLb: coach.fpl, macroPreset: coach.preset,
    customSplit: coach.custom, paceKg: coach.paceKg, kcalOverride: coach.override, seenCoach: true,
  });
  save(); closeSheet(); render(); toast("Targets updated 🎯");
}

function openAiSettings() {
  openSheet(`${sheetTitle("Photo estimates")}
    <div class="note small">Photo estimates send your picture to Claude (Anthropic) for analysis. You'll need an API key from <b>console.anthropic.com</b> → API Keys. Each photo costs roughly a few cents. Setting a monthly spend limit in the console is a good idea.</div>
    <form id="aiForm">
      <label class="field"><span>Anthropic API key</span><input name="key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(state.apiKey)}"></label>
      <label class="field"><span>Model</span><select name="model">${MODELS.map((m) => `<option value="${m.id}" ${(state.model || DEFAULT_MODEL) === m.id ? "selected" : ""}>${m.label}</option>`).join("")}</select></label>
      <p class="hint">The key is saved only on this device and shared by everyone who uses it here.</p>
      <button class="btn">Save</button>
      ${state.apiKey ? `<button class="btn danger" type="button" data-act="clear-key">Remove key</button>` : ""}
    </form>`);
  $("#aiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.apiKey = e.target.key.value.trim();
    state.model = e.target.model.value;
    save(); closeSheet(); render(); toast(state.apiKey ? "Photo estimates ready" : "Saved");
  });
}

function openWater() {
  const p = P();
  openSheet(`${sheetTitle("Water goal")}
    <form id="waterForm"><label class="field"><span>Cups per day (8 oz / 240 ml)</span><input name="w" type="number" inputmode="numeric" min="1" max="24" value="${p.waterGoal || 8}"></label>
    <button class="btn">Save</button></form>`);
  $("#waterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    p.waterGoal = Math.max(1, Number(e.target.w.value) || 8);
    save(); closeSheet(); render();
  });
}

function openProfileSwitcher() {
  const ps = Object.values(state.profiles);
  openSheet(`${sheetTitle("Who's tracking?")}
    <div class="list" style="margin-bottom:12px">${ps.map((o) => `<button data-act="switch" data-id="${o.id}">
      <span style="display:flex;align-items:center;gap:10px"><span class="avatar" style="background:linear-gradient(135deg, ${(THEMES[o.accent] || THEMES.ocean).g.join(", ")});color:#fff">${esc(o.name[0]?.toUpperCase())}</span>${esc(o.name)}</span>
      <span class="v">${o.id === state.activeId ? "✓" : ""}</span></button>`).join("")}</div>
    <button class="btn secondary" data-act="new-profile">+ Add a person</button>`);
}

function openNewProfile(existing) {
  openSheet(profileForm(existing, !existing));
  bindProfileForm(existing);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ ...state, apiKey: "" }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `macropal-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("#importInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.profiles) throw new Error();
    if (!confirm("Replace all data on this device with this backup?")) return;
    state = { ...data, apiKey: state.apiKey, model: data.model || state.model };
    if (!state.profiles[state.activeId]) state.activeId = Object.keys(state.profiles)[0];
    save(); render(); toast("Backup restored");
  } catch { toast("That file isn't a Macro Pal backup."); }
});

$("#photoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !photo) return;
  try {
    const descEl = $("#photoDesc");
    if (descEl) photo.desc = descEl.value;
    photo.image = await prepareImage(file);
    photo.est = null; photo.error = null;
    renderAdd();
  } catch (err) { toast(err.message || "Couldn't read that photo."); }
});

/* =========================================================
   Fitness
   ========================================================= */
function renderFitness() {
  const p = P();
  const day = dayData();
  const act = day.activity || {};
  const ws = day.workouts || [];
  const stepGoal = p.stepGoal || 8000;
  const C = 2 * Math.PI * 46;
  const sp = Math.min(1, (act.steps || 0) / stepGoal);

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentDay, i - 6));
  const wk = days.map((d) => ({ d, a: dayData(d).activity || {}, w: dayData(d).workouts || [] }));
  const nW = wk.reduce((s, x) => s + x.w.length, 0);
  const mins = wk.reduce((s, x) => s + x.w.reduce((t, w) => t + (w.minutes || 0), 0), 0);
  const burn = wk.reduce((s, x) => s + x.w.reduce((t, w) => t + (w.kcal || 0), 0), 0);
  const stepDays = wk.filter((x) => x.a.steps);
  const avgSteps = stepDays.length ? stepDays.reduce((s, x) => s + x.a.steps, 0) / stepDays.length : 0;
  const maxSteps = Math.max(stepGoal, ...wk.map((x) => x.a.steps || 0));
  const bars = wk.map((x) => {
    const h = x.a.steps ? Math.max(4, (x.a.steps / maxSteps) * 100) : 4;
    return `<div class="col" title="${(x.a.steps || 0).toLocaleString()} steps"><div class="b-area"><div class="b ${x.a.steps ? "" : "none"}" style="height:${h}%"></div></div><div class="d">${parseYmd(x.d).toLocaleDateString(undefined, { weekday: "narrow" })}</div></div>`;
  }).join("");

  const stat = (v, l) => `<div><b class="num">${v || "—"}</b><span>${l}</span></div>`;
  $("#view-fitness").innerHTML = `
    <div class="btn-row">
      <button class="btn" data-act="open-import">📸 Import screenshot</button>
      <button class="btn secondary" data-act="open-workout">+ Log workout</button>
    </div>
    <div class="card">
      <div class="card-head"><h2>👟 Activity</h2><button class="pill-btn" data-act="open-activity">Edit</button></div>
      <div class="act-grid">
        <div class="ring">
          <svg viewBox="0 0 112 112" aria-hidden="true">
            <defs><linearGradient id="stepsGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--g1)"/><stop offset="1" stop-color="var(--g2)"/></linearGradient></defs>
            <circle class="track" cx="56" cy="56" r="46" fill="none" stroke-width="11"/>
            <circle class="prog" cx="56" cy="56" r="46" fill="none" stroke-width="11" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - sp)}"/>
          </svg>
          <div class="ring-center"><div class="big num">${act.steps ? (act.steps >= 10000 ? (act.steps / 1000).toFixed(1) + "k" : act.steps.toLocaleString()) : "0"}</div><div class="lbl">of ${(stepGoal / 1000).toFixed(stepGoal % 1000 ? 1 : 0)}k steps</div></div>
        </div>
        <div class="act-stats">
          ${stat(act.activeKcal, "Active kcal")}
          ${stat(act.sleepH ? `${act.sleepH}h` : "", "Sleep")}
          ${stat(act.restingHr, "Resting HR")}
          ${stat(act.hrv ? `${act.hrv}ms` : "", "HRV")}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h2>🏋️ Workouts</h2><span class="meta num">${ws.length ? `${ws.reduce((t, w) => t + (w.kcal || 0), 0)} kcal` : ""}</span></div>
      ${ws.length ? ws.map((w) => {
        const t = WORKOUTS[w.type] || WORKOUTS.other;
        const bits = [w.minutes ? `${w.minutes} min` : "", w.distance ? `${w.distance} ${w.distUnit || ""}` : "", w.output ? `${w.output} kJ` : "", w.avgHr ? `${w.avgHr} bpm` : ""].filter(Boolean).join(" · ");
        return `<button class="workout" data-act="open-workout" data-id="${w.id}"><span class="wico">${t.emo}</span>
          <div class="grow"><div class="nm">${esc(w.title || t.label)}</div><div class="sub num">${bits}</div></div>
          <div class="kcal num">${w.kcal ? `${w.kcal} kcal` : ""}</div></button>`;
      }).join("") : `<div class="empty">No workouts logged ${currentDay === today() ? "today" : "this day"}. Import a Peloton or RingConn screenshot, or log one by hand.</div>`}
      ${ws.length && (P().eatBack || 0) > 0 ? `<p class="small muted" style="margin:8px 0 0">${P().eatBack === 1 ? "All" : "Half"} of these calories are added to today's food goal.</p>` : ""}
    </div>
    <div class="card">
      <div class="card-head"><h2>📅 Last 7 days</h2><span class="meta num">avg ${Math.round(avgSteps).toLocaleString()} steps</span></div>
      <div class="mini-bars">${bars}</div>
      <div class="stats3" style="margin-top:12px">
        <div class="stat"><div class="v">${nW}</div><div class="k">Workouts</div></div>
        <div class="stat"><div class="v">${mins}</div><div class="k">Minutes</div></div>
        <div class="stat"><div class="v">${burn.toLocaleString()}</div><div class="k">kcal burned</div></div>
      </div>
    </div>`;
}

function openFitnessAdd() {
  openSheet(`${sheetTitle("Add activity")}
    <button class="banner" data-act="open-import" style="margin-bottom:10px"><span class="big-emo">📸</span><div><b>Import screenshots</b><span>Peloton, RingConn or any app — Claude reads them for you</span></div></button>
    <button class="banner" data-act="open-workout" style="margin-bottom:10px"><span class="big-emo">🏋️</span><div><b>Log a workout</b><span>Type it in yourself</span></div></button>
    <button class="banner" data-act="open-activity"><span class="big-emo">👟</span><div><b>Steps, sleep & heart rate</b><span>Daily stats from your ring</span></div></button>`);
}

let wDraft = null;
function openWorkout(id) {
  const day = ensureDay();
  day.workouts ||= [];
  const w = id ? day.workouts.find((x) => x.id === id) : null;
  wDraft = { type: w?.type || "cycling", id };
  const v = (k) => (w?.[k] ? esc(w[k]) : "");
  openSheet(`${sheetTitle(w ? "Edit workout" : "Log workout")}
    <div class="type-pick">${Object.entries(WORKOUTS).map(([k, t]) => `<button type="button" class="${wDraft.type === k ? "on" : ""}" data-act="wtype" data-v="${k}"><span>${t.emo}</span>${t.label}</button>`).join("")}</div>
    <form id="wkForm">
      <label class="field"><span>Name (optional)</span><input name="title" maxlength="60" value="${v("title")}" placeholder="e.g. 30 min Pop Ride with Cody"></label>
      <div class="row2">
        <label class="field"><span>Minutes</span><input name="minutes" type="number" inputmode="numeric" min="0" value="${v("minutes")}"></label>
        <label class="field"><span>Calories burned</span><input name="kcal" type="number" inputmode="numeric" min="0" value="${v("kcal")}"></label>
      </div>
      <div class="row3">
        <label class="field"><span>Distance</span><input name="distance" type="number" inputmode="decimal" step="0.01" min="0" value="${v("distance")}"></label>
        <label class="field"><span>Unit</span><select name="distUnit"><option ${w?.distUnit === "km" ? "" : "selected"}>mi</option><option ${w?.distUnit === "km" ? "selected" : ""}>km</option></select></label>
        <label class="field"><span>Avg HR</span><input name="avgHr" type="number" inputmode="numeric" min="0" value="${v("avgHr")}"></label>
      </div>
      <label class="field"><span>Output (kJ, Peloton)</span><input name="output" type="number" inputmode="numeric" min="0" value="${v("output")}"></label>
      <label class="field"><span>Notes</span><input name="notes" maxlength="120" value="${v("notes")}"></label>
      <button class="btn">Save workout</button>
      ${w ? `<button class="btn danger" type="button" data-act="del-workout" data-id="${w.id}">Delete</button>` : ""}
    </form>`, () => (wDraft = null));
  $("#wkForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const rec = {
      type: wDraft.type, title: f.title.trim(), minutes: Number(f.minutes) || 0, kcal: Number(f.kcal) || 0,
      distance: Number(f.distance) || 0, distUnit: f.distUnit, avgHr: Number(f.avgHr) || 0, output: Number(f.output) || 0, notes: f.notes.trim(),
    };
    if (w) Object.assign(w, rec);
    else day.workouts.push({ id: uid(), source: "manual", ...rec });
    save(); closeSheet(); render(); toast(w ? "Saved" : "Workout logged 💪");
  });
}

function openActivity() {
  const day = ensureDay();
  const a = day.activity || {};
  const v = (k) => (a[k] ? a[k] : "");
  openSheet(`${sheetTitle("Daily stats")}
    <form id="actForm">
      <div class="row2">
        <label class="field"><span>👟 Steps</span><input name="steps" type="number" inputmode="numeric" min="0" value="${v("steps")}"></label>
        <label class="field"><span>🔥 Active kcal</span><input name="activeKcal" type="number" inputmode="numeric" min="0" value="${v("activeKcal")}"></label>
      </div>
      <div class="row3">
        <label class="field"><span>😴 Sleep (h)</span><input name="sleepH" type="number" inputmode="decimal" step="0.1" min="0" value="${v("sleepH")}"></label>
        <label class="field"><span>❤️ Rest HR</span><input name="restingHr" type="number" inputmode="numeric" min="0" value="${v("restingHr")}"></label>
        <label class="field"><span>📈 HRV</span><input name="hrv" type="number" inputmode="numeric" min="0" value="${v("hrv")}"></label>
      </div>
      <p class="hint">Tip: screenshot your RingConn summary and use Import instead.</p>
      <button class="btn">Save</button>
    </form>`);
  $("#actForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    day.activity = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, Number(x) || 0]));
    save(); closeSheet(); render(); toast("Saved");
  });
}

/* ---------- Screenshot import ---------- */
let shots = null; // { images, loading, error, result }

function openImport() {
  shots = { images: [], loading: false, error: null, result: null };
  renderImport();
}

function renderImport() {
  let body;
  if (!state.apiKey) {
    body = `<div class="note">Screenshot import uses Claude. Add your Anthropic API key once in <b>Settings → API key</b>.</div><button class="btn" data-act="edit-ai">Set up Claude</button>`;
  } else if (shots.loading) {
    body = `<div class="shots">${shots.images.map((im) => `<img src="${im.dataUrl}" alt="">`).join("")}</div><div class="empty"><div class="spinner"></div>Claude is reading your screenshot${shots.images.length > 1 ? "s" : ""}…</div>`;
  } else if (!shots.result) {
    body = `${shots.images.length ? `<div class="shots">${shots.images.map((im) => `<img src="${im.dataUrl}" alt="Screenshot">`).join("")}</div>` : ""}
      <button class="photo-drop" data-act="pick-shots"><span class="cam">🖼️</span><b>${shots.images.length ? "Choose different screenshots" : "Choose screenshots"}</b><span class="small">Up to 4 from the same day — e.g. your Peloton workout summary and RingConn daily overview</span></button><br>
      ${shots.error ? `<div class="note warn">${esc(shots.error)}</div>` : ""}
      ${shots.images.length ? `<button class="btn" data-act="run-shots">Read ${shots.images.length > 1 ? "screenshots" : "screenshot"}</button>` : ""}`;
  } else {
    const r = shots.result;
    const d = r.daily;
    const num = (k, label, step = 1) => `<label class="field"><span>${label}</span><input type="number" inputmode="decimal" step="${step}" data-daily="${k}" value="${d[k] || ""}"></label>`;
    body = `<div class="note">✨ ${esc(r.summary)}</div>
      <label class="field"><span>Which day is this for?</span><input type="date" id="shotDate" value="${r.date || currentDay}" max="${today()}"></label>
      ${r.workouts.length ? `<h3 style="margin:6px 2px 8px">Workouts</h3>${r.workouts.map((w, i) => `<div class="ai-item" data-wi="${i}">
          <div class="hdr"><span style="font-size:22px">${(WORKOUTS[w.type] || WORKOUTS.other).emo}</span><input class="input" data-k="title" value="${esc(w.title || (WORKOUTS[w.type] || WORKOUTS.other).label)}"><button class="rm" data-act="shot-rm" data-i="${i}">Remove</button></div>
          <div class="row4">
            <label>Min<input class="input num" data-k="minutes" type="number" value="${w.minutes || ""}"></label>
            <label>kcal<input class="input num" data-k="kcal" type="number" value="${w.kcal || ""}"></label>
            <label>${esc(w.distUnit || "dist")}<input class="input num" data-k="distance" type="number" step="0.01" value="${w.distance || ""}"></label>
            <label>${w.output ? "kJ" : "Avg HR"}<input class="input num" data-k="${w.output ? "output" : "avgHr"}" type="number" value="${(w.output || w.avgHr) || ""}"></label>
          </div></div>`).join("")}` : ""}
      ${Object.values(d).some(Boolean) ? `<h3 style="margin:6px 2px 8px">Daily stats</h3>
        <div class="row2">${num("steps", "👟 Steps")}${num("activeKcal", "🔥 Active kcal")}</div>
        <div class="row3">${num("sleepH", "😴 Sleep h", 0.1)}${num("restingHr", "❤️ Rest HR")}${num("hrv", "📈 HRV")}</div>` : ""}
      ${!r.workouts.length && !Object.values(d).some(Boolean) ? `<div class="empty">Nothing to import was found in that screenshot.</div>` : `<button class="btn" data-act="save-shots">Save to log</button>`}
      <button class="btn secondary" data-act="open-import">Start over</button>`;
  }
  const html = `${sheetTitle("Import screenshots")}${body}`;
  if ($("#sheet").hidden) openSheet(html, () => (shots = null));
  else $("#sheetBody").innerHTML = html;
}

function syncShotEdits() {
  if (!shots?.result) return;
  document.querySelectorAll("[data-wi]").forEach((el) => {
    const w = shots.result.workouts[Number(el.dataset.wi)];
    el.querySelectorAll("[data-k]").forEach((inp) => { w[inp.dataset.k] = inp.dataset.k === "title" ? inp.value : Number(inp.value) || 0; });
  });
  document.querySelectorAll("[data-daily]").forEach((inp) => { shots.result.daily[inp.dataset.daily] = Number(inp.value) || 0; });
  const dt = $("#shotDate");
  if (dt?.value) shots.result.date = dt.value;
}

async function runShots() {
  shots.loading = true; shots.error = null;
  renderImport();
  try {
    const result = await readFitnessScreens({ apiKey: state.apiKey, model: state.model || DEFAULT_MODEL, images: shots.images, todayYmd: today() });
    if (!shots) return;
    shots.result = result;
  } catch (err) {
    if (!shots) return;
    shots.error = err.message;
  }
  shots.loading = false;
  renderImport();
}

function saveShots() {
  syncShotEdits();
  const r = shots.result;
  const date = r.date || currentDay;
  const day = ensureDay(date);
  day.workouts ||= [];
  let added = 0;
  for (const w of r.workouts) {
    const dup = day.workouts.some((x) => (x.title || "") === (w.title || "") && x.minutes === w.minutes && x.kcal === w.kcal);
    if (!dup) { day.workouts.push({ id: uid(), source: "screenshot", ...w }); added++; }
  }
  const nz = Object.fromEntries(Object.entries(r.daily).filter(([, v]) => v));
  if (Object.keys(nz).length) day.activity = { ...(day.activity || {}), ...nz };
  save(); closeSheet();
  currentDay = date; tab = "fitness"; render();
  toast(added ? `Logged ${added} workout${added > 1 ? "s" : ""} 💪` : "Daily stats saved");
  if (added) confetti();
}

$("#shotInput").addEventListener("change", async (e) => {
  const files = [...e.target.files].slice(0, 4);
  e.target.value = "";
  if (!files.length || !shots) return;
  try {
    shots.images = await Promise.all(files.map(prepareImage));
    shots.result = null; shots.error = null;
    renderImport();
  } catch (err) { toast(err.message || "Couldn't read those images."); }
});

/* ---------- Small settings sheets ---------- */
function openWeighDay() {
  const p = P();
  openSheet(`${sheetTitle("Weekly weigh-in day")}
    <p class="small muted" style="margin-top:0">Weigh in as often as you like — daily numbers feed the trend line. The weigh-in on this day becomes your official <b>weekly</b> number, so normal day-to-day swings don't throw you off.</p>
    <div class="day-pick">${WEEKDAYS.map((d, i) => `<button class="${(p.weighDay ?? 1) === i ? "on" : ""}" data-act="set-weighday" data-v="${i}">${d}</button>`).join("")}</div>
    <p class="hint" style="margin-top:12px">Tip: pick a morning you're usually home — weigh right after waking up.</p>`);
}

function openFitnessGoals() {
  const p = P();
  openSheet(`${sheetTitle("Steps & exercise")}
    <form id="fgForm">
      <label class="field"><span>Daily step goal</span><input name="steps" type="number" inputmode="numeric" min="1000" step="500" value="${p.stepGoal || 8000}"></label>
      <label class="field"><span>Add workout calories to my food goal?</span></label>
      <div class="seg">${[[0, "Off"], [0.5, "Half"], [1, "All"]].map(([v, l]) => `<button type="button" class="${(p.eatBack || 0) === v ? "on" : ""}" data-act="eatback" data-v="${v}">${l}</button>`).join("")}</div>
      <p class="hint" style="margin-top:-6px">Your activity level already counts typical exercise, so <b>Off</b> is the safe default. <b>Half</b> is a good middle ground on big workout days — trackers tend to overestimate calories burned.</p>
      <button class="btn">Save</button>
    </form>`);
  $("#fgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    p.stepGoal = Math.max(1000, Number(e.target.steps.value) || 8000);
    save(); closeSheet(); render();
  });
}

/* =========================================================
   Global actions
   ========================================================= */
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("[data-act],[data-tab]");
  if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; window.scrollTo(0, 0); render(); return; }
  const a = t.dataset.act, v = t.dataset.v, p = P();
  switch (a) {
    case "close": closeSheet(); break;
    case "day-prev": currentDay = addDays(currentDay, -1); render(); break;
    case "day-next": currentDay = addDays(currentDay, 1); render(); break;
    case "day-today": currentDay = today(); render(); break;
    case "open-add":
      if (tab === "fitness" && !t.dataset.meal) { openFitnessAdd(); break; }
      photo = null; openAdd(t.dataset.meal); break;
    case "open-import": shots ? (shots = { images: [], loading: false, error: null, result: null }, renderImport()) : (closeSheet(), openImport()); break;
    case "pick-shots": $("#shotInput").click(); break;
    case "run-shots": runShots(); break;
    case "shot-rm": syncShotEdits(); shots.result.workouts.splice(Number(t.dataset.i), 1); renderImport(); break;
    case "save-shots": saveShots(); break;
    case "open-workout": closeSheet(); openWorkout(t.dataset.id); break;
    case "wtype": wDraft.type = v; document.querySelectorAll(".type-pick button").forEach((b) => b.classList.toggle("on", b === t)); break;
    case "del-workout": {
      const day = ensureDay();
      day.workouts = (day.workouts || []).filter((x) => x.id !== t.dataset.id);
      save(); closeSheet(); render(); toast("Deleted");
      break;
    }
    case "open-activity": closeSheet(); openActivity(); break;
    case "edit-weighday": openWeighDay(); break;
    case "set-weighday": p.weighDay = Number(v); save(); closeSheet(); render(); toast(`Weekly weigh-in: ${WEEKDAYS[p.weighDay]}s`); break;
    case "edit-fitness-goals": openFitnessGoals(); break;
    case "eatback": p.eatBack = Number(v); save(); document.querySelectorAll("[data-act=eatback]").forEach((b) => b.classList.toggle("on", b === t)); break;
    case "coach-mode": coach.mode = v; renderCoach(); break;
    case "coach-pace": coach.paceKg = Number(v); coach.override = 0; renderCoach(); break;
    case "coach-preset": coach.preset = v; renderCoach(); break;
    case "coach-save": saveCoach(); break;
    case "pick-meal": addState.meal = v; renderAdd(); break;
    case "add-mode": syncAiEdits(); addState.mode = v; renderAdd(); break;
    case "add-food": {
      const f = p.foods.find((x) => x.id === t.dataset.id);
      if (!f) break;
      addEntry({ name: f.name, portion: f.portion, kcal: f.kcal, p: f.p, c: f.c, f: f.f, servings: 1 });
      toast(`${f.name} added to ${addState.meal}`);
      render();
      break;
    }
    case "pick-photo": { const d = $("#photoDesc"); if (d && photo) photo.desc = d.value; $("#photoInput").click(); break; }
    case "run-estimate": runEstimate(false); break;
    case "refine": runEstimate(true); break;
    case "answer": {
      syncAiEdits();
      const qi = Number(t.dataset.q);
      photo.answers[qi] = photo.answers[qi] === v ? undefined : v;
      renderAdd();
      break;
    }
    case "ai-rm": syncAiEdits(); photo.est.items.splice(Number(t.dataset.i), 1); renderAdd(); break;
    case "ai-reset": photo = null; renderAdd(); break;
    case "ai-add": {
      syncAiEdits();
      const meal = addState.meal;
      photo.est.items.forEach((it) => addEntry({ name: it.name || "Food", portion: it.portion, kcal: r0(it.kcal), p: r1(it.p), c: r1(it.c), f: r1(it.f), servings: 1 }, { ai: true }));
      photo = null; closeSheet(); render(); toast(`Added to ${meal}`);
      break;
    }
    case "edit-entry": openEditEntry(t.dataset.id); break;
    case "del-entry": {
      const day = ensureDay();
      day.entries = day.entries.filter((x) => x.id !== t.dataset.id);
      save(); closeSheet(); render(); toast("Deleted");
      break;
    }
    case "water": {
      const day = ensureDay();
      day.water = Math.max(0, (day.water || 0) + Number(t.dataset.n));
      save(); render();
      break;
    }
    case "copy-yesterday": {
      const prev = dayData(addDays(currentDay, -1));
      if (!prev.entries.length) { toast("Nothing logged the day before."); break; }
      const day = ensureDay();
      prev.entries.forEach((e) => day.entries.push({ ...e, id: uid() }));
      save(); render(); toast(`Copied ${prev.entries.length} items`);
      break;
    }
    case "log-weight": openWeightSheet(); break;
    case "del-weight":
      if (!confirm("Delete this weigh-in?")) break;
      p.weights = p.weights.filter((w) => w.date !== t.dataset.date);
      save(); render();
      break;
    case "edit-profile": openNewProfile(p); break;
    case "edit-macros": closeSheet(); openMacros(); break;
    case "edit-water": openWater(); break;
    case "edit-ai": openAiSettings(); break;
    case "clear-key": state.apiKey = ""; save(); closeSheet(); render(); toast("Key removed"); break;
    case "accent": p.accent = v; save(); render(); break;
    case "mode": p.mode = v; save(); render(); break;
    case "switch": state.activeId = t.dataset.id; save(); closeSheet(); currentDay = today(); render(); toast(`Hi, ${P().name}!`); break;
    case "new-profile": closeSheet(); openNewProfile(null); break;
    case "export": exportData(); break;
    case "import": $("#importInput").click(); break;
    case "delete-profile": {
      if (!confirm(`Delete ${p.name}'s profile and all their data? This can't be undone.`)) break;
      delete state.profiles[p.id];
      state.activeId = Object.keys(state.profiles)[0] || null;
      save();
      if (!state.activeId) { boot(); break; }
      render();
      break;
    }
  }
});
$("#profileChip").addEventListener("click", openProfileSwitcher);

/* =========================================================
   Boot
   ========================================================= */
function boot() {
  if (!P()) {
    state.activeId = Object.keys(state.profiles)[0] || null;
  }
  if (!P()) {
    applyTheme();
    $("#view-today").innerHTML = "";
    openNewProfile(null);
    return;
  }
  render();
}
boot();

// Refresh "today" if the app is left open past midnight.
let lastToday = today();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && today() !== lastToday) {
    if (currentDay === lastToday) currentDay = today();
    lastToday = today();
    if (P()) render();
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
