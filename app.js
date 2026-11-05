import { estimateFood, readFitnessScreens, suggestMeals, reviewEating, suggestExampleDay, readLabel, generatePlan, prepareImage, MODELS, DEFAULT_MODEL, LABEL_MODEL } from "./ai.js?v=12";
import { buildPlanPrompt, parsePlanReply, normalizePlan, groceryList, groceryText, fmtQty } from "./planner.js?v=2";
import { buildExampleDay, mealBudgets, MEAL_PATTERNS } from "./mealplan.js?v=2";
import { COACHES, DEFAULT_COACH, seasonalCoach, coachLine, guestChance, phaseLine, inSeason } from "./coaches.js?v=16";
import { TRIGGER_META, LINE_ID, FALLBACK, T } from "./triggers.js?v=6";

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
  ocean: { label: "Lagoon", g: ["#2dd4bf", "#06b6d4", "#2563eb"] },
  sky: { label: "Ocean", g: ["#38bdf8", "#6366f1", "#a855f7"] },
  grape: { label: "Grape", g: ["#c084fc", "#8b5cf6", "#4f46e5"] },
  berry: { label: "Berry", g: ["#fb7185", "#ec4899", "#9333ea"] },
  candy: { label: "Candy", g: ["#f9a8d4", "#c4b5fd", "#7dd3fc"] },
  sunset: { label: "Sunset", g: ["#fcd34d", "#fb923c", "#e11d48"] },
  fire: { label: "Fire", g: ["#fde047", "#f97316", "#dc2626"] },
  forest: { label: "Lime", g: ["#bef264", "#22c55e", "#0d9488"] },
  midnight: { label: "Midnight", g: ["#7c3aed", "#4338ca", "#0891b2"] },
  mono: { label: "Mono", g: ["#71717a", "#3f3f46", "#18181b"] },
  aurora: { label: "Aurora", g: ["#34d399", "#22d3ee", "#a78bfa"], dyn: true, dark: true },
  synthwave: { label: "Synthwave", g: ["#fb923c", "#ec4899", "#7c3aed"], dyn: true, dark: true },
};
const MEAL_EMO = { Breakfast: "🍳", Lunch: "🥗", Dinner: "🍽️", Snacks: "🍿" };
const WORKOUTS = {
  cycling: { emo: "🚴", label: "Cycling" }, running: { emo: "🏃", label: "Running" }, walking: { emo: "🚶", label: "Walking" },
  strength: { emo: "🏋️", label: "Strength" }, pilates: { emo: "🩰", label: "Pilates" }, hiit: { emo: "⚡", label: "HIIT" }, yoga: { emo: "🧘", label: "Yoga" },
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
const r2 = (n) => Math.round((n || 0) * 100) / 100;
/** Leading amount of a portion like "6 oz", "1 1/2 cups", "2/3 cup", "0.5 bar". */
function parseQty(str) {
  const m = String(str ?? "").trim().match(/^(\d+)\s+(\d+)\/(\d+)|^(\d+)\/(\d+)|^(\d*\.?\d+)/);
  if (!m) return null;
  if (m[1]) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  if (m[4]) return Number(m[4]) / Number(m[5]);
  return Number(m[6]);
}
const QTY_RE = /^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)/;
const numQty = (q) => String(+q.toFixed(2));

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
  root.dataset.glow = p?.glow || "on";
  const mode = p?.mode || "auto";
  if (mode === "auto") delete root.dataset.theme;
  else root.dataset.theme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEMES[p?.accent]?.dark ? "#0b0b18" : (THEMES[p?.accent] || THEMES.ocean).g[1];
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
    const hit = val >= goal * 0.95;
    return `<div class="macro-row">
      <div class="top"><span class="name"><span class="emo">${emo}</span>${name}</span>
      <span class="num"><b>${r0(val)}</b> / ${goal} g</span></div>
      <div class="bar ${hit ? "hit" : ""}" role="progressbar" aria-label="${name}" aria-valuenow="${r0(val)}" aria-valuemax="${goal}"><i style="width:${w}%;--bc:var(--${color});background:var(--bc)"></i></div>
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
          ${(() => { const ci = isToday && cycleInfo(); return ci ? `<div><span class="goal-chip">${PHASES[ci.phase][0]} Cycle day ${ci.day}</span></div>` : ""; })()}
          <div><span class="goal-chip">${tg.direction === "lose" ? "📉 Losing" : tg.direction === "gain" ? "📈 Gaining" : "⚖️ Maintaining"} · ${fmtW(latestWeightKg(), 0)} → ${fmtW(p.goalWeightKg, 0)}</span></div>
        </div>
      </div>
    </div>
    ${state.apiKey ? `<form class="quicklog" id="quickLog">
      <input id="quickLogText" class="input" enterkeyhint="send" autocomplete="off" placeholder="✍️ Type or 🎤 say what you ate">
      <button class="quicklog-go" aria-label="Log it">➜</button>
    </form>` : ""}
    ${isToday ? checkinStrip() : ""}
    ${needsWeigh ? `<button class="banner pop" data-act="log-weight"><span class="big-emo">⚖️</span><div><b>It's weigh-in day!</b><span>Log your weekly number to track real progress.</span></div></button>` : ""}
    <div class="card macros">
      <div class="card-head" style="margin-bottom:0"><h2>Macros</h2><button class="icon-q" data-act="edit-macros" aria-label="What are macros?">?</button></div>
      ${macro("🥩", "Protein", tot.p, tg.protein, "protein")}
      ${macro("🍞", "Carbs", tot.c, tg.carbs, "carbs")}
      ${macro("🥑", "Fat", tot.f, tg.fat, "fat")}
    </div>
    ${todaysPlanCard()}
    <div class="card">
      <div class="card-head"><h2>🧑‍🍳 Food coach</h2><span class="meta">by Claude</span></div>
      <button class="btn" data-act="plan-open" style="margin-bottom:8px">🛒 ${state.plan ? "Weekly meal plan & groceries" : "Plan our week + grocery list"}</button>
      <button class="btn secondary" data-act="example-day" style="margin-bottom:8px">🗓️ Example day: map out ${dayGoal(today()).kcal} kcal</button>
      <div class="btn-row">
        <button class="btn secondary" data-act="coach-ideas">💡 What should I eat?</button>
        <button class="btn secondary" data-act="coach-review">📋 How am I eating?</button>
      </div>
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

  $("#quickLog")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("#quickLogText").value.trim();
    if (!text) return;
    $("#quickLogText").blur();
    openAdd(null, text);
  });
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
        ${(() => { const ci = cycleInfo(lastW.date); return ci && (ci.phase === "pre" || ci.phase === "period") && prevW && lastW.kg > prevW.kg ? `<div class="note small" style="margin:10px 0 0">🌸 This weigh-in fell ${ci.phase === "pre" ? "right before" : "during"} your period, so some of that is likely water weight.</div>` : ""; })()}
        <div class="weigh-list" style="margin-top:10px">${[...weekly].reverse().slice(1, 9).map((w, i, arr) => {
          const older = weekly[weekly.length - 3 - i];
          return `<div class="wl"><span>${parseYmd(w.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span><b class="num">${fmtW(w.kg)}</b> ${older ? deltaChip(w.kg - older.kg) : ""}</span></div>`;
        }).join("")}</div>`
      : `<div class="empty">Weigh in on ${WEEKDAYS[wd]}s — that number becomes your official weekly check-in. Daily weigh-ins still feed the trend line.</div>`}
    </div>

    ${renderCycle()}
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
    ${renderBody()}
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
  loadPhotoGrid();
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
      <button data-act="edit-diet"><span>🌾 Dietary needs</span><span class="v">${(p.diet || []).length ? esc(p.diet.join(", ")) : "None"} ›</span></button>
      <button data-act="toggle-cycle"><span>🌸 Cycle tracking</span><span class="v">${p.cycle?.enabled ? "On 🔒" : "Off"} ›</span></button>
      <button data-act="edit-water"><span>💧 Water goal</span><span class="v">${p.waterGoal || 8} cups ›</span></button>
      <button data-act="edit-fitness-goals"><span>👟 Steps & exercise</span><span class="v">${(p.stepGoal || 8000).toLocaleString()} steps ›</span></button>
    </div>

    <div class="section-label">Coach</div>
    <div class="list">
      <button data-act="coach-open"><span>${(COACHES[coachCfg().id] || COACHES[DEFAULT_COACH]).emoji} ${esc((COACHES[coachCfg().id] || COACHES[DEFAULT_COACH]).name)}</span><span class="v">${{ off: "Off", chill: "Chill", normal: "Normal", chatty: "Chatty" }[coachCfg().freq]} ›</span></button>
      <button data-act="checkins-open"><span>⏰ Check-ins</span><span class="v">${Object.keys(CHECKS).filter((k) => checkinCfg()[k].on).length} on ›</span></button>
    </div>

    <div class="section-label">Theme</div>
    <div class="card">
      ${(() => { const sw = ([k, t]) => `<button class="swatch ${t.dyn ? "dyn" : ""} ${(p.accent || "ocean") === k ? "on" : ""}" data-act="accent" data-v="${k}"><i style="background:linear-gradient(135deg, ${t.g.join(", ")}${t.dyn ? `, ${t.g[0]}` : ""})"></i>${t.label}</button>`;
        const all = Object.entries(THEMES);
        return `<div class="swatches">${all.filter(([, t]) => !t.dyn).map(sw).join("")}<div class="swatch-label">✨ Animated</div>${all.filter(([, t]) => t.dyn).map(sw).join("")}</div>`; })()}
      <div class="seg" style="margin:14px 0 0">${["auto", "light", "dark"].map((m) => `<button class="${(p.mode || "auto") === m ? "on" : ""}" data-act="mode" data-v="${m}">${m === "auto" ? "Match phone" : m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>
      ${THEMES[p.accent]?.dark || p.accent === "midnight" ? `<p class="hint" style="margin:8px 0 0">${THEMES[p.accent].label} is always dark.</p>` : ""}
      <div style="font-weight:600;margin:14px 2px 8px">✨ Glow</div>
      <div class="seg" style="margin:0">${[["off", "Off"], ["on", "Glow"], ["neon", "Neon"]].map(([k, l]) => `<button class="${(p.glow || "on") === k ? "on" : ""}" data-act="glow" data-v="${k}">${l}</button>`).join("")}</div>
    </div>

    <div class="section-label">Claude (photos & screenshots)</div>
    <div class="list">
      <button data-act="edit-ai"><span>✨ API key & models</span><span class="v">${state.apiKey ? "Connected ✓" : "Not set up"} ›</span></button>
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
  ${isNew && !Object.keys(state.profiles).length ? `<div class="welcome"><img class="logo" src="icons/icon.svg" alt=""><h2>Welcome to Bite Club</h2><p>A few quick details and we'll set your daily calorie and macro targets.</p></div><br>` : sheetTitle(isNew ? "Add a person" : "Body stats & goal", true)}
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
    const date = e.target.d.value || today();
    const prevWeekly = weeklyWeights().filter((w) => w.date < date).pop();
    logWeight(fromDispW(v), date);
    save(); closeSheet(); render(); toast("Weight logged");
    coachFire(weighTriggers(fromDispW(v), date, prevWeekly));
  });
}

/* =========================================================
   Add food sheet
   ========================================================= */
let addState = null;

function openAdd(meal, text = "") {
  addState = { meal: meal || defaultMeal(), mode: text ? "type" : P().addMode || (state.apiKey ? "label" : "foods"), q: "" };
  photo = { images: [], est: null, answers: {}, desc: text };
  lbl = null;
  renderAdd();
  if (text && state.apiKey) runEstimate(false);
  else setTimeout(() => $("#photoDesc")?.focus(), 250);
}

function mealPicker() {
  return `<div class="seg">${MEALS.map((m) => `<button class="${addState.meal === m ? "on" : ""}" data-act="pick-meal" data-v="${m}">${m}</button>`).join("")}</div>`;
}

function renderAdd() {
  const modes = [["label", "🏷️ Label reader"], ["type", "✍️ Type it"], ["photo", "📷 Photo"], ["foods", "My foods"], ["quick", "Manual"]];
  let body = "";
  if (addState.mode === "type") body = typeBody();
  if (addState.mode === "photo") body = photoBody();
  if (addState.mode === "label") body = labelBody();
  if (addState.mode === "foods") body = foodsBody();
  if (addState.mode === "quick") body = quickBody();
  const html = `${sheetTitle(`Add to ${addState.meal}`)}
    ${mealPicker()}
    <div class="chips" style="margin-bottom:14px">${modes.map(([k, l]) => `<button class="chip ${addState.mode === k ? "on" : ""}" data-act="add-mode" data-v="${k}">${l}</button>`).join("")}</div>
    <div id="addBody">${body}</div>`;
  const focusKey = document.activeElement?.dataset?.fk;
  if ($("#sheet").hidden) openSheet(html, () => (addState = null));
  else $("#sheetBody").innerHTML = html;
  if (addState.mode === "foods" || addState.mode === "label") { bindFoodSearch(); bindLabel(); }
  if ((addState.mode === "photo" || addState.mode === "type") && photo?.est) bindAiItems();
  if (focusKey) $(`[data-fk="${focusKey}"]`)?.focus({ preventScroll: true });
  if (addState.mode === "type") {
    $("#photoDesc")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runEstimate(false); }
    });
  }
  if (addState.mode === "quick") bindQuick();
}

/** Saved foods, one per name (a scanned label wins over an older estimate), most recently used first. */
function savedFoods() {
  const seen = new Map();
  const all = [...(P().foods || [])].sort((a, b) => (b.label ? 1 : 0) - (a.label ? 1 : 0) || (b.lastUsed || 0) - (a.lastUsed || 0));
  for (const f of all) {
    const k = (f.name || "").trim().toLowerCase();
    if (k && !seen.has(k)) seen.set(k, f);
  }
  return [...seen.values()].sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
}

function foodsBody() {
  if (!lbl) lbl = { items: [] };
  const has = lbl.items.length > 0;
  return `${addState.local ? `<div class="note">✨ All found in your saved foods, so no Claude needed (free). Check the amounts. <button class="link-btn" data-act="local-to-claude">Ask Claude instead</button></div>` : ""}
    ${plateHtml()}
    ${has ? `<div class="sl-head" style="margin-top:16px"><b>Add more</b></div>` : ""}
    <input class="input search" id="foodSearch" type="search" placeholder="Search your foods" value="${esc(addState.q)}">
    <div id="foodResults">${foodResults()}</div>`;
}
function foodResults() {
  const inPlate = new Set((lbl?.items || []).map((it) => it.foodId).filter(Boolean));
  const q = (addState.q || "").trim().toLowerCase();
  let foods = savedFoods().filter((f) => !inPlate.has(f.id));
  if (q) foods = foods.filter((f) => f.name.toLowerCase().includes(q));
  if (!foods.length) return `<div class="empty">${q ? "No matches." : (P().foods || []).length ? "Everything's on your plate already." : "Labels you scan and foods you log are saved here. Pick one, set the amount, done."}</div>`;
  return `<div class="food-list">${foods.slice(0, 60).map((f) => {
    const serv = f.label?.servText || f.portion || "1 serving";
    const lastA = f.label ? f.label.lastAmount : f.lastAmount, lastU = f.label ? f.label.lastUnit : f.lastUnit;
    return `<button class="food-item" data-act="lbl-saved" data-id="${f.id}">
      <div class="grow"><div class="nm">${f.label ? "🏷️" : "⭐"} ${esc(f.name)}</div><div class="sub num">per ${esc(serv)} · ${r0(f.kcal)} kcal · P ${r0(f.p)} · C ${r0(f.c)} · F ${r0(f.f)}${lastA ? ` · last time ${lastA} ${esc(lastU || "")}` : ""}</div></div>
      <span class="plus-sm">+</span></button>`;
  }).join("")}</div>`;
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
    </div>
    <div class="ai-total num entry-total"></div>`;
}
/** Live "you're logging" line, so changing servings or numbers shows the real total. */
function bindEntryTotal(form) {
  const el = form?.querySelector(".entry-total");
  if (!el) return;
  const upd = () => {
    const e = readEntry(form);
    const s = e.servings || 1;
    el.innerHTML = `<span>${s !== 1 ? `${numQty(s)} servings =` : "You're logging"}</span><span>${r0(e.kcal * s)} kcal · P ${r0(e.p * s)} · C ${r0(e.c * s)} · F ${r0(e.f * s)}</span>`;
  };
  form.addEventListener("input", upd);
  upd();
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
  bindEntryTotal($("#quickForm"));
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
  const beforeTot = totals(day.entries);
  const firstToday = currentDay === today() && !day.entries.length;
  const entry = { id: uid(), meal: addState?.meal || defaultMeal(), ...en, ai };
  day.entries.push(entry);
  if (saveFood) rememberFood(en);
  save();
  if (currentDay === today()) coachFire(foodTriggers(beforeTot, totals(day.entries), firstToday, en.name));
  return entry;
}
function rememberFood(en) {
  const p = P();
  p.foods ||= [];
  const key = en.name.trim().toLowerCase();
  const same = p.foods.filter((x) => x.name.trim().toLowerCase() === key);
  let f = same.find((x) => x.label) || same.sort((x, y) => (y.lastUsed || 0) - (x.lastUsed || 0))[0];
  if (!f) { f = { id: uid(), uses: 0 }; p.foods.push(f); }
  if (!f.label) Object.assign(f, { name: en.name, portion: en.portion, kcal: en.kcal, p: en.p, c: en.c, f: en.f, lastAmount: undefined, lastUnit: undefined });
  f.lastUsed = Date.now();
  f.uses = (f.uses || 0) + 1;
}

/** "Just type or say it": free text, parsed by Claude, reviewed with the photo UI. */
function typeBody() {
  if (!state.apiKey) {
    return `<div class="note">Typing or saying what you ate uses Claude. Add your Anthropic API key once in <b>Settings → API key</b>.</div><button class="btn" data-act="edit-ai">Set up Claude</button>`;
  }
  if (!photo) photo = { images: [], est: null, answers: {}, desc: "" };
  if (photo.loading || photo.est) return photoBody();
  return `<label class="field"><span>What did you eat?</span>
      <textarea id="photoDesc" rows="3" enterkeyhint="send" placeholder="e.g. 2 eggs, a slice of toast with butter and a black coffee">${esc(photo.desc)}</textarea></label>
    <p class="hint" style="margin-top:-6px">🎤 Tap the microphone on your keyboard to just say it. Amounts help: "85 g granola", "6 oz chicken", "half a burrito".</p>
    ${photo.error ? `<div class="note warn">${esc(photo.error)}</div>` : ""}
    <button class="btn" data-act="run-estimate">✨ Log it</button>`;
}

/** Saved foods with exact numbers, so "85 g of my granola" uses the label. */
function knownFoodsText(limit = 40, foods = savedFoods()) {
  return [...foods].sort((a, b) => (b.label ? 1 : 0) - (a.label ? 1 : 0) || (b.uses || 0) - (a.uses || 0)).slice(0, limit)
    .map((f) => `- ${f.name}: ${f.kcal} kcal, P ${f.p} g, C ${f.c} g, F ${f.f} g per ${f.label?.servText || f.portion || "serving"}`).join("\n");
}

/* ---------- Nutrition labels + scale (several at once) ---------- */
let lbl = null; // { items: [{ id, image, loading, error, data, amount, unit, foodId }], error }
const MAX_LABELS = 12;

/** "4 cookies (33g)" → { count: 4, unit: "cookies" }; null when the serving isn't a count of something. */
function labelCount(servText = "") {
  const m = String(servText).trim().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s+([a-z][a-z.\- ]*?)\s*(?:\(|$)/i);
  if (!m) return null;
  const unit = m[2].trim().toLowerCase();
  if (/^(g|grams?|oz|ounces?|ml|mls|fl\.? ?oz|servings?)$/.test(unit)) return null;
  const count = parseQty(m[1]);
  return count > 0 ? { count, unit } : null;
}

function labelUnits(d) {
  const u = [];
  const pc = labelCount(d.servText);
  if (d.servAmt && d.servUnit) u.push(d.servUnit);
  if (pc) u.push(pc.unit);
  if (d.servAmt && d.servUnit === "g") u.push("oz");
  u.push("servings");
  return u;
}

/** How many label servings an amount is, and back again. */
function toServings(d, amount, unit) {
  if (unit === "servings") return amount;
  const pc = labelCount(d.servText);
  if (pc && unit === pc.unit) return amount / pc.count;
  if (!d.servAmt) return amount;
  if (unit === "oz") return (amount * 28.3495) / d.servAmt;
  return amount / d.servAmt; // g or ml
}
function fromServings(d, s, unit) {
  if (unit === "servings") return r2(s);
  const pc = labelCount(d.servText);
  if (pc && unit === pc.unit) return r2(s * pc.count);
  if (unit === "oz") return r1((s * d.servAmt) / 28.3495);
  return r0(s * d.servAmt);
}

function labelMath(d, amount, unit) {
  const factor = toServings(d, amount, unit);
  return { kcal: r0(d.kcal * factor), p: r1(d.p * factor), c: r1(d.c * factor), f: r1(d.f * factor) };
}

/** Basic reader (cheapest) unless Settings says otherwise; "smart" is the retry. */
const labelReader = (smart = false) => (smart || state.labelModel === "main"
  ? { model: state.model || DEFAULT_MODEL, effort: "medium" }
  : { model: LABEL_MODEL, effort: "low" });

/** Grams in a serving description: "4 cookies (33g)", "150 g", "6 oz". */
function portionGrams(text = "") {
  let m = String(text).match(/\((\d*\.?\d+)\s*(g|ml)\)/i);
  if (m) return { amt: Number(m[1]), unit: m[2].toLowerCase() };
  m = String(text).trim().match(/^(\d*\.?\d+)\s*(g|grams?|ml)\b/i);
  if (m) return { amt: Number(m[1]), unit: /ml/i.test(m[2]) ? "ml" : "g" };
  m = String(text).trim().match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(oz|ounces?)\b/i);
  if (m) return { amt: r1(parseQty(m[1]) * 28.3495), unit: "g" };
  return { amt: 0, unit: "" };
}
/** Start in the unit the serving is written in ("6 oz" → oz, "2 slices" → slices); scanned labels start in grams. */
function defaultUnit(d) {
  const units = labelUnits(d);
  if (d.isLabel) return units[0];
  const lead = String(d.servText || "").trim().match(/^(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*([a-z]+)/i)?.[1]?.toLowerCase() || "";
  if (/^(oz|ounces?)$/.test(lead) && units.includes("oz")) return "oz";
  if (/^(g|grams?)$/.test(lead) && units.includes("g")) return "g";
  const pc = labelCount(d.servText);
  return pc ? pc.unit : "servings";
}

function savedFoodItem(f) {
  const L = f.label;
  const servText = L?.servText || f.portion || "1 serving";
  const g = L ? { amt: L.servAmt, unit: L.servUnit } : portionGrams(servText);
  const data = { name: f.name, servText, servAmt: g.amt || 0, servUnit: g.unit || "", kcal: f.kcal, p: f.p, c: f.c, f: f.f, fiber: L?.fiber || 0, allergens: L?.allergens || "", isLabel: !!L };
  const lastU = L ? L.lastUnit : f.lastUnit, lastA = L ? L.lastAmount : f.lastAmount;
  const ok = lastU && labelUnits(data).includes(lastU);
  return lblItem({ foodId: f.id, unit: ok ? lastU : defaultUnit(data), amount: ok ? lastA ?? "" : "", data });
}

/** Saved foods list inside the Label reader tab (same list as My foods). */
function savedLabelsList() {
  if (!(P().foods || []).length) return "";
  return `<div class="saved-lbls">
    <div class="sl-head"><b>⭐ Your saved foods</b><span class="small muted">tap, set the amount, done</span></div>
    ${savedFoods().length > 6 ? `<input class="input search" id="foodSearch" type="search" placeholder="Search your foods" value="${esc(addState.q || "")}">` : ""}
    <div id="foodResults">${foodResults()}</div></div>`;
}

const lblItem = (fields = {}) => ({ id: uid(), image: null, loading: false, error: null, data: null, amount: "", unit: "", foodId: null, ...fields });
const lblReady = () => (lbl?.items || []).filter((it) => it.data && !it.loading);

function labelCard(it, i) {
  const thumb = it.image ? `<img class="lbl-thumb" src="${it.image.dataUrl}" alt="Label ${i + 1}">` : `<span class="lbl-thumb lbl-thumb-emo">${it.data && !it.data.isLabel ? "⭐" : "🏷️"}</span>`;
  const rm = `<button class="rm" data-act="lbl-rm" data-i="${i}">Remove</button>`;
  if (it.loading) {
    return `<div class="ai-item lbl-card"><div class="lbl-row">${thumb}<div class="grow lbl-wait"><div class="spinner sm"></div><span class="small muted">Reading label ${i + 1}…</span></div></div></div>`;
  }
  if (!it.data) {
    return `<div class="ai-item lbl-card"><div class="lbl-row">${thumb}<div class="grow">
      <div class="note warn" style="margin:0 0 8px">${esc(it.error || "Couldn't read this label.")}</div>
      <div class="lbl-actions">${it.image ? `<button class="chip" data-act="lbl-retry" data-i="${i}">${state.labelModel === "main" ? "Try again" : "✨ Try the smarter reader"}</button>` : ""}${rm}</div></div></div></div>`;
  }
  const d = it.data;
  const units = labelUnits(d);
  if (!units.includes(it.unit)) it.unit = defaultUnit(d);
  if (it.amount === "") it.amount = fromServings(d, 1, it.unit);
  const gfWarn = (P().diet || []).includes("Gluten-free") && /wheat|barley|rye|malt|gluten/i.test(d.allergens) && !/gluten[- ]free/i.test(d.allergens);
  return `<div class="ai-item lbl-card">
    <div class="lbl-row">${thumb}<div class="grow">
      <div class="hdr"><input class="input" data-lk="name" data-i="${i}" data-fk="name-${it.id}" maxlength="60" value="${esc(d.name)}" aria-label="Food name">${rm}</div>
      <div class="small muted">Per ${esc(d.servText || "1 serving")} · <span class="num">${d.kcal} kcal · <span style="color:var(--protein)">P ${d.p}</span> · <span style="color:var(--carbs)">C ${d.c}</span> · <span style="color:var(--fat)">F ${d.f}</span></span> <button class="lbl-fix" data-act="lbl-fix" data-i="${i}">${it.editing ? "Done" : "✏️ Fix"}</button></div>
      ${d.allergens ? `<div class="small muted" style="margin-top:2px">${esc(d.allergens)}</div>` : ""}
    </div></div>
    ${gfWarn ? `<div class="note warn" style="margin:8px 0 0">⚠️ This label lists a gluten source (${esc(d.allergens)}).</div>` : ""}
    ${it.editing ? `<div class="lbl-edit">
      <div class="small muted" style="margin:8px 0 4px">Per serving${d.isLabel ? ", as printed on the label" : ""}:</div>
      <div class="row4">${[["kcal", "kcal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]].map(([k, l]) => `<label>${l}<input class="input num" data-lk="${k}" data-i="${i}" data-fk="${k}-${it.id}" type="number" inputmode="decimal" step="any" value="${d[k]}"></label>`).join("")}</div>
      <div class="row2" style="margin-top:6px"><label class="field" style="margin:0"><span>Serving size</span><input class="input" data-lk="servText" data-i="${i}" data-fk="st-${it.id}" value="${esc(d.servText || "")}" placeholder="4 cookies (33g)"></label>
        <label class="field" style="margin:0"><span>Grams per serving</span><input class="input num" data-lk="servAmt" data-i="${i}" data-fk="sa-${it.id}" type="number" inputmode="decimal" step="any" value="${d.servAmt || ""}"></label></div>
    </div>` : ""}
    <div class="field-label" style="margin-top:10px">How much did you have?</div>
    <div class="lbl-amt">
      <input class="input num" data-lk="amt" data-i="${i}" data-fk="amt-${it.id}" type="number" inputmode="decimal" step="any" min="0" value="${it.amount}" aria-label="Amount">
      <div class="seg">${units.map((u) => `<button class="${it.unit === u ? "on" : ""}" data-act="lbl-unit" data-i="${i}" data-v="${esc(u)}">${esc(u)}</button>`).join("")}</div>
    </div>
    ${!d.servAmt ? `<p class="hint" style="margin:6px 0 0">No gram amount on this label, so enter servings.</p>` : ""}
    <div class="lbl-sub num" data-lt="${i}"></div>
  </div>`;
}

/** The foods picked for this meal (scanned or saved), each with its own amount. */
function plateHtml(extra = "") {
  if (!lbl?.items.length) return "";
  const ready = lblReady();
  const busy = lbl.items.some((it) => it.loading);
  const n = ready.length;
  return `${lbl.items.map(labelCard).join("")}${extra}
    ${n ? `<div class="ai-total num" id="lblTotal"></div>` : ""}
    <button class="btn sticky-add" data-act="lbl-add" ${busy || !n ? "disabled" : ""}>${busy ? "Reading labels…" : `Add ${n > 1 ? `all ${n} ` : ""}to ${addState.meal}`}</button>`;
}

function labelBody() {
  if (!lbl) lbl = { items: [] };
  const saved = savedLabelsList();
  if (!lbl.items.length) {
    const scan = !state.apiKey
      ? `<div class="note">Reading new labels uses Claude. Add your Anthropic API key once in <b>Settings → Claude</b>.</div><button class="btn" data-act="edit-ai" style="margin-bottom:14px">Set up Claude</button>`
      : (saved
        ? `<button class="btn" data-act="pick-label" style="margin-bottom:14px">📷 Scan new label(s)</button>`
        : `<button class="photo-drop" data-act="pick-label"><span class="cam">🏷️</span><b>Snap or choose labels</b><span class="small">Several in one meal? Pick them all at once, one label per photo.</span></button>`)
        + (lbl.error ? `<div class="note warn">${esc(lbl.error)}</div>` : "");
    return `${scan}${saved || `<p class="small muted" style="text-align:center;margin-top:10px">Every label you scan is saved as a product, so next time you just tap it and enter the amount.</p>`}`;
  }
  const scanMore = lbl.items.length < MAX_LABELS && state.apiKey ? `<button class="btn secondary" data-act="pick-label" style="margin-bottom:10px">📷 Scan another label</button>` : "";
  return `${plateHtml(scanMore)}${saved ? `<div style="margin-top:16px">${saved}</div>` : ""}`;
}

function bindLabel() {
  const upd = () => {
    const ready = lblReady();
    const sum = { kcal: 0, p: 0, c: 0, f: 0 };
    ready.forEach((it) => {
      const t = labelMath(it.data, Number(it.amount) || 0, it.unit);
      for (const k in sum) sum[k] += t[k];
      const el = document.querySelector(`[data-lt="${lbl.items.indexOf(it)}"]`);
      if (el) el.textContent = `= ${t.kcal} kcal · P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}`;
    });
    const tot = $("#lblTotal");
    if (tot) tot.innerHTML = `<span>${ready.length > 1 ? "Meal total" : "You're logging"}</span><span>${r0(sum.kcal)} kcal · P ${r0(sum.p)} · C ${r0(sum.c)} · F ${r0(sum.f)}</span>`;
  };
  document.querySelectorAll("[data-lk]").forEach((inp) => inp.addEventListener("input", () => {
    const it = lbl.items[Number(inp.dataset.i)];
    if (!it?.data) return;
    const k = inp.dataset.lk;
    if (k === "amt") it.amount = inp.value;
    else if (k === "name" || k === "servText") it.data[k] = inp.value;
    else it.data[k] = Number(inp.value) || 0;
    upd();
  }));
  upd();
}

/** Run fn over items, at most n at a time. */
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

const labelChanged = (mine) => addState && lbl === mine && addState.mode === "label" && renderAdd();

async function readOneLabel(it, mine, smart = false) {
  try {
    it.data = await readLabel({ apiKey: state.apiKey, image: it.image, ...labelReader(smart) });
    it.data.isLabel = true;
  } catch (err) {
    it.error = err.message;
  }
  it.loading = false;
  labelChanged(mine);
}

async function runLabels(files) {
  if (!lbl) lbl = { items: [] };
  lbl.error = null;
  const room = MAX_LABELS - lbl.items.length;
  if (files.length > room) toast(`Up to ${MAX_LABELS} labels at a time.`);
  const batch = files.slice(0, Math.max(0, room)).map(() => lblItem({ loading: true }));
  if (addState) addState.mode = "label";
  if (!batch.length) return;
  const mine = lbl;
  mine.items.push(...batch);
  renderAdd();
  // Shrink the photos first (quick, on the phone), then read up to 3 labels at once.
  for (let i = 0; i < batch.length; i++) {
    try { batch[i].image = await prepareImage(files[i]); } catch (err) { batch[i].error = err.message || "Couldn't open that photo."; batch[i].loading = false; }
  }
  labelChanged(mine);
  await pool(batch.filter((it) => it.image), 3, (it) => readOneLabel(it, mine));
}

function addFromLabels() {
  const ready = lblReady();
  if (!ready.length) return;
  if (ready.some((it) => !(Number(it.amount) > 0))) return toast("Enter how much you had of each.");
  const meal = addState.meal;
  const p = P();
  p.foods ||= [];
  for (const it of ready) {
    const d = it.data;
    const amount = Number(it.amount);
    const t = labelMath(d, amount, it.unit);
    const name = (d.name || "Food").trim();
    const portion = it.unit === "servings" ? `${amount} serving${amount === 1 ? "" : "s"}` : `${amount} ${it.unit}`;
    addEntry({ name, portion, kcal: t.kcal, p: r1(t.p), c: r1(t.c), f: r1(t.f), servings: 1 }, { saveFood: false });
    // Remember the product per serving (and this amount) so next time it's tap + amount.
    let f = (it.foodId && p.foods.find((x) => x.id === it.foodId)) || (d.isLabel && p.foods.find((x) => x.label && x.name.toLowerCase() === name.toLowerCase()));
    if (!f) { f = { id: uid(), uses: 0 }; p.foods.push(f); }
    Object.assign(f, { name, portion: d.servText || "1 serving", kcal: d.kcal, p: d.p, c: d.c, f: d.f, lastUsed: Date.now() });
    if (d.isLabel) f.label = { servText: d.servText, servAmt: d.servAmt, servUnit: d.servUnit, fiber: d.fiber, allergens: d.allergens, lastUnit: it.unit, lastAmount: amount };
    else Object.assign(f, { lastUnit: it.unit, lastAmount: amount });
    f.uses = (f.uses || 0) + 1;
  }
  save();
  const skipped = lbl.items.length - ready.length;
  lbl = null; photo = null;
  closeSheet(); render();
  toast(`${ready.length > 1 ? `Added ${ready.length} items` : "Added"} to ${meal} ✅${skipped ? ` · skipped ${skipped} unreadable` : ""}`);
}

$("#labelInput").addEventListener("change", (e) => {
  const files = [...e.target.files];
  e.target.value = "";
  if (files.length && addState) runLabels(files);
});

/* ---------- Photo / Claude ---------- */
let photo = null; // { images, est, answers, loading, error, desc }
const MAX_PHOTOS = 6;

function photoThumbs(editable, small = false) {
  const ims = photo.images;
  return `<div class="thumbs ${small ? "small" : ""} ${ims.length === 1 && !small ? "one" : ""}">${ims.map((im, i) => `<div class="thumb"><img src="${im.dataUrl}" alt="Photo ${i + 1}">${editable ? `<button class="thumb-x" data-act="photo-rm" data-i="${i}" aria-label="Remove photo ${i + 1}">✕</button>` : ""}</div>`).join("")}${
    editable && ims.length < MAX_PHOTOS ? `<button class="thumb thumb-add" data-act="pick-photo" aria-label="Add another photo"><span>＋</span><small>Add photo</small></button>` : ""}</div>`;
}

function photoBody() {
  if (!state.apiKey) {
    return `<div class="note">Photo estimates use Claude. Add your Anthropic API key once in <b>Settings → API key</b>, then snap a photo and get calories and macros in seconds.</div>
      <button class="btn" data-act="edit-ai">Set up photo estimates</button>
      <p class="small muted" style="text-align:center;margin-top:10px">Or describe the meal in words after setup — no photo needed.</p>`;
  }
  if (!photo) photo = { images: [], est: null, answers: {}, desc: "" };
  if (photo.loading) {
    return `${photo.images.length ? photoThumbs(false) : ""}
      <div class="empty"><div class="spinner"></div>Claude is looking at your ${photo.images.length > 1 ? `${photo.images.length} photos` : "food"}…</div>`;
  }
  if (!photo.est) {
    return `${photo.images.length
        ? photoThumbs(true)
        : `<button class="photo-drop" data-act="pick-photo"><span class="cam">📷</span><b>Take or choose photos</b><span class="small">Several dishes or a drink too? Pick them all at once. Claude estimates the whole meal.</span></button><br>`}
      <label class="field"><span>Anything Claude should know? (optional)</span>
        <textarea id="photoDesc" rows="2" placeholder="e.g. chicken burrito bowl, no sour cream, I ate about half">${esc(photo.desc)}</textarea></label>
      ${photo.error ? `<div class="note warn">${esc(photo.error)}</div>` : ""}
      <button class="btn" data-act="run-estimate">${photo.images.length ? `Estimate this meal${photo.images.length > 1 ? ` (${photo.images.length} photos)` : ""}` : "Estimate from description"}</button>`;
  }
  const est = photo.est;
  return `${photo.images.length ? photoThumbs(false, true) : ""}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Claude's estimate</b><span class="badge">${esc(est.confidence)} confidence</span></div>
    ${est.notes ? `<div class="note">${esc(est.notes)}</div>` : ""}
    ${photo.error ? `<div class="note warn">${esc(photo.error)}</div>` : ""}
    ${est.questions.length ? `<div style="margin-bottom:6px"><b>A few quick questions</b> <span class="small muted">— answer to sharpen the estimate</span></div>
      ${est.questions.map((q, qi) => `<div class="question"><p>${esc(q.question)}</p>
        <div class="chips">${q.options.map((o) => `<button class="chip ${photo.answers[qi] === o ? "on" : ""}" data-act="answer" data-q="${qi}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
        <input class="input" data-q-text="${qi}" placeholder="Or type an answer" value="${esc(q.options.includes(photo.answers[qi]) ? "" : photo.answers[qi] || "")}"></div>`).join("")}
      <button class="btn secondary" data-act="refine" style="margin-bottom:14px">Update estimate with my answers</button>` : ""}
    <div id="aiItems">${est.items.map((it, i) => { const s = scaled(it); return `<div class="ai-item" data-i="${i}">
        <div class="hdr"><input class="input" data-k="name" value="${esc(it.name)}" aria-label="Food name"><button class="rm" data-act="ai-rm" data-i="${i}">Remove</button></div>
        <div class="amt-row">
          <button class="amt-btn" data-act="ai-amt" data-i="${i}" data-d="-1" aria-label="Less">−</button>
          <input class="input" data-k="portion" data-fk="portion-${i}" value="${esc(it.portion)}" aria-label="How much">
          <button class="amt-btn" data-act="ai-amt" data-i="${i}" data-d="1" aria-label="More">+</button>
        </div>
        <div class="row4">
          <label>kcal<input class="input num" data-k="kcal" data-fk="kcal-${i}" type="number" inputmode="decimal" value="${s.kcal}"></label>
          <label style="color:var(--protein)">Protein<input class="input num" data-k="p" data-fk="p-${i}" type="number" inputmode="decimal" value="${s.p}"></label>
          <label style="color:var(--carbs)">Carbs<input class="input num" data-k="c" data-fk="c-${i}" type="number" inputmode="decimal" value="${s.c}"></label>
          <label style="color:var(--fat)">Fat<input class="input num" data-k="f" data-fk="f-${i}" type="number" inputmode="decimal" value="${s.f}"></label>
        </div></div>`; }).join("") || `<div class="empty">No food found. Try another photo or add a description.</div>`}</div>
    ${est.items.length ? `<p class="hint" style="margin:-2px 2px 8px">Change an amount (or tap − / +) and the calories and macros update.</p>
    <div class="ai-total num" id="aiTotal"></div>
    <button class="btn sticky-add" data-act="ai-add">Add ${est.items.length > 1 ? `all ${est.items.length} items` : "to log"}</button>` : ""}
    <button class="btn secondary" data-act="ai-reset">Start over</button>`;
}

/** Claude's items keep their numbers for the portion Claude saw (base); mult scales them. */
function normEst(est) {
  est.items = (est.items || []).map((it) => ({
    name: it.name, portion: it.portion, basePortion: it.portion, baseQty: parseQty(it.portion), mult: 1,
    base: { kcal: it.kcal, p: it.p, c: it.c, f: it.f },
  }));
  return est;
}
const scaled = (it) => ({ kcal: r0(it.base.kcal * it.mult), p: r1(it.base.p * it.mult), c: r1(it.base.c * it.mult), f: r1(it.base.f * it.mult) });

function aiTotal() {
  const el = $("#aiTotal");
  if (!el || !photo?.est) return;
  const t = photo.est.items.map(scaled).reduce((s, i) => ({ kcal: s.kcal + i.kcal, p: s.p + i.p, c: s.c + i.c, f: s.f + i.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  el.innerHTML = `<span>Total</span><span>${r0(t.kcal)} kcal · P ${r0(t.p)} · C ${r0(t.c)} · F ${r0(t.f)}</span>`;
}

function bindAiItems() {
  document.querySelectorAll("#aiItems .ai-item").forEach((el) => {
    const it = photo.est.items[Number(el.dataset.i)];
    const showNums = () => {
      const s = scaled(it);
      for (const k of ["kcal", "p", "c", "f"]) el.querySelector(`[data-k="${k}"]`).value = s[k];
    };
    el.querySelector('[data-k="name"]').addEventListener("input", (e) => (it.name = e.target.value));
    el.querySelector('[data-k="portion"]').addEventListener("input", (e) => {
      it.portion = e.target.value;
      const q = parseQty(it.portion);
      if (q && it.baseQty) { it.mult = q / it.baseQty; showNums(); aiTotal(); }
    });
    for (const k of ["kcal", "p", "c", "f"]) {
      el.querySelector(`[data-k="${k}"]`).addEventListener("input", (e) => { it.base[k] = (Number(e.target.value) || 0) / (it.mult || 1); aiTotal(); });
    }
  });
  aiTotal();
}

/** − / + on an item: step the number in its portion ("6 oz" → "7 oz"), or multiply ("1.5 × half a burrito"). */
function stepAiItem(it, dir) {
  const cur = parseQty(it.portion);
  if (cur && it.baseQty && QTY_RE.test(it.portion)) {
    const step = cur <= 1 ? 0.25 : cur < 4 ? 0.5 : cur < 20 ? 1 : cur < 100 ? 5 : 10;
    const next = Math.max(step, r2(cur + dir * step));
    it.portion = it.portion.replace(QTY_RE, (m) => m.replace(m.trim(), numQty(next)));
    it.mult = next / it.baseQty;
  } else {
    it.mult = Math.max(0.5, r2((it.mult || 1) + dir * 0.5));
    it.portion = it.mult === 1 ? it.basePortion : `${numQty(it.mult)} × ${it.basePortion}`;
  }
}

function syncAiEdits() {
  if (!photo?.est) return;
  document.querySelectorAll("[data-q-text]").forEach((inp) => {
    if (inp.value.trim()) photo.answers[Number(inp.dataset.qText)] = inp.value.trim();
  });
}

/* ---- Typed meals made only of saved foods are logged without Claude ---- */
const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, half: 0.5, quarter: 0.25 };
const STOP = new Set(["of", "my", "the", "some", "a", "an", "and", "with", "plus", "i", "had", "ate", "for", "breakfast", "lunch", "dinner", "snack", "little", "bit", "few"]);
const stemW = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const wordsOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stemW);

function matchPart(part, foods) {
  let s = part.trim().replace(/^(i had|i ate|ate|had)\s+/, "");
  let qty = null, unit = null;
  let m = s.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*/);
  if (m) { qty = parseQty(m[1]); s = s.slice(m[0].length); }
  else {
    const w = s.split(/\s+/)[0];
    if (w in NUM_WORDS) { qty = NUM_WORDS[w]; s = s.slice(w.length).trim().replace(/^(a|an)\s+/, ""); }
  }
  m = s.match(/^(grams?|gr|g|ounces?|oz|servings?|ml)\b\.?\s*/);
  if (m) { unit = /^g/.test(m[1]) ? "g" : /^o/.test(m[1]) ? "oz" : /^s/.test(m[1]) ? "servings" : "ml"; s = s.slice(m[0].length); }
  const q = wordsOf(s);
  if (!q.length) return null;
  let best = null;
  for (const f of foods) {
    const fw = wordsOf(f.name);
    if (!fw.length || !q.every((w) => fw.some((x) => x === w || (w.length >= 4 && x.startsWith(w))))) continue;
    const cover = q.length / fw.length;
    if (!best || cover > best.cover || (cover === best.cover && (f.uses || 0) > (best.f.uses || 0))) best = { f, cover };
  }
  if (!best) return null;
  const item = savedFoodItem(best.f);
  if (qty == null && !unit) return item; // no amount given: last time's amount
  const units = labelUnits(item.data);
  const pc = labelCount(item.data.servText);
  if (!unit) unit = pc && q.includes(stemW(pc.unit.split(" ").pop())) ? pc.unit : "servings";
  if (!units.includes(unit)) return null;
  item.unit = unit;
  item.amount = qty ?? 1;
  return item;
}

/** Every part of "6 goodie girl cookies and 150g greek yogurt" must match a saved food, or Claude handles it. */
function localMatch(text) {
  const foods = savedFoods();
  if (!foods.length || !text.trim()) return null;
  const parts = text.toLowerCase().split(/,|;|\n|\+|&|\band\b|\bwith\b|\bplus\b/).map((s) => s.trim()).filter(Boolean);
  const items = [];
  for (const part of parts) {
    const it = matchPart(part, foods);
    if (!it || items.some((x) => x.foodId === it.foodId)) return null;
    items.push(it);
  }
  return items.length ? items : null;
}

async function runEstimate(refine = false, { noLocal = false } = {}) {
  const descEl = $("#photoDesc");
  if (descEl) photo.desc = descEl.value;
  if (!photo.images.length && !photo.desc.trim()) return toast(addState?.mode === "type" ? "Type what you ate first." : "Add a photo or a description first.");
  if (!refine && !noLocal && !photo.images.length) {
    const local = localMatch(photo.desc);
    if (local) {
      lbl = { items: local };
      addState.mode = "foods"; addState.local = true; addState.q = "";
      renderAdd();
      return;
    }
  }
  let answers = [], previous = null;
  if (refine) {
    syncAiEdits();
    answers = photo.est.questions.map((q, i) => ({ question: q.question, answer: photo.answers[i] })).filter((a) => a.answer);
    if (!answers.length) return toast("Answer at least one question first.");
    previous = { items: photo.est.items.map((it) => ({ name: it.name, portion: it.portion, ...scaled(it) })) };
  }
  photo.loading = true; photo.error = null;
  const keepEst = photo.est;
  renderAdd();
  try {
    const est = await estimateFood({
      apiKey: state.apiKey, model: state.model || DEFAULT_MODEL,
      images: photo.images, description: photo.desc, answers, previous, diet: P().diet || [], known: photo.images.length ? "" : knownFoodsText(),
    });
    if (!photo) return; // sheet was closed
    photo.est = normEst(est); photo.answers = {};
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
  bindEntryTotal($("#editForm"));
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
  openSheet(`${sheetTitle("Claude")}
    <div class="note small">Reading labels, typing a meal and photo estimates send your words or picture to Claude (Anthropic). They're paid from the API credits on your key from <b>console.anthropic.com</b> → API Keys, not your Claude app subscription. Setting a monthly spend limit in the console is a good idea.</div>
    <form id="aiForm">
      <label class="field"><span>Anthropic API key</span><input name="key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(state.apiKey)}"></label>
      <label class="field"><span>Model for typed meals, photos & coaching</span><select name="model">${MODELS.map((m) => `<option value="${m.id}" ${(state.model || DEFAULT_MODEL) === m.id ? "selected" : ""}>${m.label}</option>`).join("")}</select></label>
      <label class="field"><span>🏷️ Label reader</span><select name="labelModel">
        <option value="basic" ${state.labelModel !== "main" ? "selected" : ""}>Basic: Claude Haiku 5.5 (about 0.05¢ a label)</option>
        <option value="main" ${state.labelModel === "main" ? "selected" : ""}>Same model as above</option></select></label>
      <p class="hint" style="margin-top:-6px">A clear Nutrition Facts panel only needs the basic reader. If it ever can't read one, tap "Try the smarter reader".</p>
      <p class="hint">The key is saved only on this device and shared by everyone who uses it here.</p>
      <button class="btn">Save</button>
      ${state.apiKey ? `<button class="btn danger" type="button" data-act="clear-key">Remove key</button>` : ""}
    </form>`);
  $("#aiForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.apiKey = e.target.key.value.trim();
    state.model = e.target.model.value;
    state.labelModel = e.target.labelModel.value;
    save(); closeSheet(); render(); toast(state.apiKey ? "Claude is ready" : "Saved");
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
  a.download = `biteclub-backup-${today()}.json`;
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
  } catch { toast("That file isn't a Bite Club backup."); }
});

$("#photoInput").addEventListener("change", async (e) => {
  const files = [...e.target.files];
  e.target.value = "";
  if (!files.length || !photo) return;
  const descEl = $("#photoDesc");
  if (descEl) photo.desc = descEl.value;
  const room = MAX_PHOTOS - photo.images.length;
  if (files.length > room) toast(`Up to ${MAX_PHOTOS} photos per meal.`);
  for (const file of files.slice(0, Math.max(0, room))) {
    try { photo.images.push(await prepareImage(file)); } catch (err) { toast(err.message || "Couldn't read that photo."); }
  }
  photo.est = null; photo.error = null;
  if (addState) renderAdd();
});

/* =========================================================
   Food coach (Claude)
   ========================================================= */
const DIETS = ["Gluten-free", "Dairy-free", "Vegetarian", "Vegan", "Pescatarian", "Nut allergy", "Low FODMAP", "Kosher", "Halal"];
const dietLine = (p = P()) => (p.diet?.length ? `STRICT dietary needs (must follow): ${p.diet.join(", ")}.` : "");
const MOODS = ["Quick & easy", "High protein", "Sweet tooth", "Comfort food", "Eating out", "Meal prep", "Vegetarian", "Snack"];
let ideas = null; // { moods:Set, request, loading, error, data, meal }

function todayContext() {
  const p = P();
  const tg = dayGoal(today());
  const day = dayData(today());
  const tot = totals(day.entries);
  const h = new Date().getHours();
  return [
    `Goal: ${tg.direction} weight (${fmtW(latestWeightKg(), 0)} now, goal ${fmtW(p.goalWeightKg, 0)}).`,
    `Daily targets: ${tg.kcal} kcal, ${tg.protein} g protein, ${tg.carbs} g carbs, ${tg.fat} g fat.`,
    `Eaten so far today: ${r0(tot.kcal)} kcal, ${r0(tot.p)} g protein, ${r0(tot.c)} g carbs, ${r0(tot.f)} g fat${day.entries.length ? ` (${day.entries.map((e) => e.name).join(", ")})` : ""}.`,
    `Remaining today: ${r0(tg.kcal - tot.kcal)} kcal, ${r0(tg.protein - tot.p)} g protein, ${r0(tg.carbs - tot.c)} g carbs, ${r0(tg.fat - tot.f)} g fat.`,
    `Local time: ${h}:00 (${h < 11 ? "morning" : h < 15 ? "midday" : h < 20 ? "evening" : "late night"}).`,
    dietLine(p),
    p.foodPrefs ? `My food preferences and dislikes: ${p.foodPrefs}` : "",
    pantryLine(),
  ].filter(Boolean).join("\n");
}

/** Products the user keeps, with exact numbers, so suggestions can use them. */
function pantryLine(limit = 25) {
  const list = knownFoodsText(limit);
  return list ? `Foods I keep, with exact nutrition per serving (work these in where they fit, scale them to the portion, and use these numbers instead of estimating):\n${list}` : "";
}

function weekContext() {
  const p = P();
  const tg = computeTargets();
  const lines = [
    `Goal: ${tg.direction} weight (${fmtW(latestWeightKg(), 0)} now, goal ${fmtW(p.goalWeightKg, 0)}).`,
    `Daily targets: ${tg.kcal} kcal, ${tg.protein} g protein, ${tg.carbs} g carbs, ${tg.fat} g fat.`,
    dietLine(p),
    p.foodPrefs ? `Preferences and dislikes: ${p.foodPrefs}` : "",
  ].filter(Boolean);
  lines.push("");
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today(), -i);
    const es = dayData(d).entries;
    const t = totals(es);
    const label = parseYmd(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    lines.push(es.length
      ? `${label}: ${r0(t.kcal)} kcal, P ${r0(t.p)} g, C ${r0(t.c)} g, F ${r0(t.f)} g — ${es.map((e) => `${e.meal}: ${e.name} (${r0(e.kcal * (e.servings || 1))} kcal)`).join("; ")}`
      : `${label}: nothing logged`);
  }
  return lines.join("\n");
}

function openIdeas() {
  ideas = { moods: new Set(), request: "", loading: false, error: null, data: null, meal: defaultMeal() };
  renderIdeas();
}

function renderIdeas() {
  const p = P();
  let body;
  if (!state.apiKey) {
    body = `<div class="note">The food coach uses Claude. Add your Anthropic API key once in <b>Settings → API key</b>.</div><button class="btn" data-act="edit-ai">Set up Claude</button>`;
  } else if (ideas.loading) {
    body = `<div class="empty"><div class="spinner"></div>Cooking up ideas…</div>`;
  } else if (!ideas.data) {
    const tg = dayGoal(today()); const tot = totals(dayData(today()).entries);
    body = `<div class="note">You have <b>${r0(tg.kcal - tot.kcal)} kcal</b> and <b>${r0(tg.protein - tot.p)} g protein</b> left today. Claude will suggest food that fits.</div>
      <div style="font-weight:600;margin:4px 2px 8px">In the mood for…</div>
      <div class="chips" style="margin-bottom:12px">${MOODS.map((m) => `<button class="chip ${ideas.moods.has(m) ? "on" : ""}" data-act="mood" data-v="${m}">${m}</button>`).join("")}</div>
      <label class="field"><span>Anything else? (optional)</span><input id="ideaReq" class="input" value="${esc(ideas.request)}" placeholder="e.g. something with chicken, under 15 minutes"></label>
      <div style="font-weight:600;margin:4px 2px 8px">Dietary needs <span class="small muted">(always followed)</span></div>
      <div class="chips" style="margin-bottom:12px">${DIETS.map((d) => `<button class="chip ${(p.diet || []).includes(d) ? "on" : ""}" data-act="diet" data-v="${d}">${d === "Gluten-free" ? "🌾 " : ""}${d}</button>`).join("")}</div>
      <label class="field"><span>Foods you love or avoid (remembered)</span><textarea id="foodPrefs" rows="2" placeholder="e.g. no mushrooms, loves Mexican food, lactose intolerant">${esc(p.foodPrefs || "")}</textarea></label>
      ${ideas.error ? `<div class="note warn">${esc(ideas.error)}</div>` : ""}
      <button class="btn" data-act="run-ideas">💡 Get ideas</button>`;
  } else {
    body = `${(p.diet || []).length ? `<div class="small muted" style="margin:0 2px 8px">✓ All ideas are ${esc(p.diet.join(", ").toLowerCase())}</div>` : ""}<div class="note">${esc(ideas.data.intro)}</div>
      <div class="seg">${MEALS.map((m) => `<button class="${ideas.meal === m ? "on" : ""}" data-act="idea-meal" data-v="${m}">${m}</button>`).join("")}</div>
      ${ideas.data.ideas.map((it, i) => `<div class="ai-item idea">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b style="font-size:16px">${esc(it.name)}</b><span class="num" style="font-weight:700;white-space:nowrap">${it.kcal} kcal</span></div>
        <div class="small muted" style="margin:2px 0 6px">${esc(it.portion)} · <span style="color:var(--protein)">P ${r0(it.p)}</span> · <span style="color:var(--carbs)">C ${r0(it.c)}</span> · <span style="color:var(--fat)">F ${r0(it.f)}</span></div>
        <div class="small" style="margin-bottom:8px">${esc(it.why)}</div>
        <details class="small"><summary style="color:var(--accent);font-weight:600;cursor:pointer">Ingredients & how to make it</summary>
          <ul style="margin:6px 0;padding-left:18px">${it.ingredients.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p style="margin:0">${esc(it.how)}</p></details>
        <button class="btn" style="margin-top:10px;padding:10px" data-act="idea-add" data-i="${i}">+ Log to ${ideas.meal}</button>
      </div>`).join("")}
      <button class="btn secondary" data-act="idea-again">More ideas</button>`;
  }
  const html = `${sheetTitle("What should I eat?")}${body}`;
  if ($("#sheet").hidden) openSheet(html, () => (ideas = null));
  else $("#sheetBody").innerHTML = html;
}

async function runIdeas() {
  const p = P();
  ideas.request = $("#ideaReq")?.value.trim() ?? ideas.request;
  const prefs = $("#foodPrefs");
  if (prefs) { p.foodPrefs = prefs.value.trim(); save(); }
  ideas.loading = true; ideas.error = null;
  renderIdeas();
  try {
    const want = [...ideas.moods, ideas.request].filter(Boolean).join(", ");
    const data = await suggestMeals({ apiKey: state.apiKey, model: state.model || DEFAULT_MODEL, context: todayContext(), request: want });
    if (!ideas) return;
    ideas.data = data;
  } catch (err) {
    if (!ideas) return;
    ideas.error = err.message;
  }
  ideas.loading = false;
  renderIdeas();
}

let review = null; // { loading, error }
function openReview(fresh = false) {
  const p = P();
  review = { loading: false, error: null };
  if (fresh || !p.lastReview) { renderReview(); runReview(); }
  else renderReview();
}

function renderReview() {
  const p = P();
  const r = p.lastReview?.data;
  const V = { great: ["🌟", "Great"], good: ["👍", "Good"], mixed: ["🙂", "Mixed"], needs_work: ["💪", "Room to grow"], not_enough_data: ["📝", "Need more logs"] };
  let body;
  if (!state.apiKey) {
    body = `<div class="note">The food coach uses Claude. Add your Anthropic API key once in <b>Settings → API key</b>.</div><button class="btn" data-act="edit-ai">Set up Claude</button>`;
  } else if (review.loading) {
    body = `<div class="empty"><div class="spinner"></div>Reading your last 7 days…</div>`;
  } else if (!r) {
    body = `${review.error ? `<div class="note warn">${esc(review.error)}</div>` : ""}<button class="btn" data-act="review-again">Review my week</button>`;
  } else {
    const [emo, lbl] = V[r.verdict] || V.mixed;
    const list = (title, items) => items?.length ? `<h3 style="margin:14px 2px 6px">${title}</h3><div class="card" style="padding:12px 16px"><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
    body = `<div class="hero" style="margin-bottom:6px"><div class="hero-top"><h2>${emo} ${esc(r.headline)}</h2><span class="streak">${lbl}</span></div>
        <div class="small muted">Based on ${parseYmd(p.lastReview.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} and the 6 days before</div></div>
      ${review.error ? `<div class="note warn">${esc(review.error)}</div>` : ""}
      ${list("✅ Going well", r.wins)}
      ${list("🎯 Focus this week", r.focus)}
      ${r.swaps?.length ? `<h3 style="margin:14px 2px 6px">🔄 Easy swaps</h3>${r.swaps.map((s) => `<div class="ai-item"><div class="small muted" style="text-decoration:line-through">${esc(s.instead_of)}</div><div style="font-weight:700">→ ${esc(s.try)}</div><div class="small muted">${esc(s.why)}</div></div>`).join("")}` : ""}
      ${list("🛒 Grocery list", r.grocery_list)}
      <br><button class="btn secondary" data-act="review-again">Refresh review</button>
      <p class="hint" style="text-align:center">Claude's suggestions are general guidance, not medical advice.</p>`;
  }
  const html = `${sheetTitle("How am I eating?")}${body}`;
  if ($("#sheet").hidden) openSheet(html, () => (review = null));
  else $("#sheetBody").innerHTML = html;
}

async function runReview() {
  if (!state.apiKey) return;
  const p = P();
  review.loading = true; review.error = null;
  renderReview();
  try {
    const data = await reviewEating({ apiKey: state.apiKey, model: state.model || DEFAULT_MODEL, context: weekContext() });
    p.lastReview = { date: today(), data };
    save();
  } catch (err) {
    if (review) review.error = err.message;
  }
  if (!review) return;
  review.loading = false;
  renderReview();
}

/* ---------- Example day ---------- */
const SLOT_EMO = (name) => (/breakfast/i.test(name) ? "🍳" : /lunch|meal 1/i.test(name) ? "🥗" : /dinner|meal 2/i.test(name) ? "🍽️" : "🍎");
let exDay = null; // { seed, loading, error, claude }

function openExampleDay() {
  exDay = { seed: 0, loading: false, error: null, claude: null };
  renderExampleDay();
}

function renderExampleDay() {
  const p = P();
  const pattern = p.mealPattern || "3+1";
  const tg = computeTargets();
  const targets = { kcal: tg.kcal, protein: tg.protein, carbs: tg.carbs, fat: tg.fat };
  const budgets = mealBudgets(targets, pattern);
  const built = buildExampleDay(targets, pattern, p.diet || [], exDay.seed);
  const plan = exDay.claude
    ? { meals: budgets.map((b) => ({ ...b, ...(exDay.claude.meals.find((m) => m.slot.toLowerCase() === b.name.toLowerCase()) || { title: "", items: [], total: { kcal: 0, p: 0, c: 0, f: 0 } }) })) }
    : built;
  plan.total = plan.meals.reduce((t, m) => ({ kcal: t.kcal + m.total.kcal, p: t.p + m.total.p, c: t.c + m.total.c, f: t.f + m.total.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const pk = tg.protein * 4, ck = tg.carbs * 4, fk = tg.fat * 9;
  const mac = (x) => `<span style="color:var(--protein)">P ${x.p}</span> · <span style="color:var(--carbs)">C ${x.c}</span> · <span style="color:var(--fat)">F ${x.f}</span>`;

  const html = `${sheetTitle("Example day")}
    <div class="slider-card">
      <div class="top"><span><b class="num">${tg.kcal}</b> <span class="muted small">kcal/day</span></span><span class="small muted">your targets</span></div>
      <div class="stack" aria-hidden="true"><i style="flex:${pk};background:var(--protein)"></i><i style="flex:${ck};background:var(--carbs)"></i><i style="flex:${fk};background:var(--fat)"></i></div>
      <div class="stack-legend">
        <div><span>🥩 Protein</span><b class="num">${tg.protein} g</b></div>
        <div><span>🍞 Carbs</span><b class="num">${tg.carbs} g</b></div>
        <div><span>🥑 Fat</span><b class="num">${tg.fat} g</b></div>
      </div>
    </div>
    <div style="font-weight:600;margin:4px 2px 8px">How do you like to eat?</div>
    <div class="chips" style="margin-bottom:14px">${Object.entries(MEAL_PATTERNS).map(([k, v]) => `<button class="chip ${pattern === k ? "on" : ""}" data-act="meal-pattern" data-v="${k}">${v.label}</button>`).join("")}</div>
    ${exDay.loading ? `<div class="empty"><div class="spinner"></div>Claude is planning your day…</div>` : `
      ${exDay.claude ? `<div class="note">✨ ${esc(exDay.claude.intro)}</div>` : `<div class="small muted" style="margin:0 2px 10px">Example foods${(p.diet || []).length ? ` (${esc(p.diet.join(", ").toLowerCase())})` : ""}. Swap in anything with similar numbers.</div>`}
      ${exDay.error ? `<div class="note warn">${esc(exDay.error)}</div>` : ""}
      ${plan.meals.map((m) => `<div class="card" style="margin-bottom:10px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h3>${SLOT_EMO(m.name)} ${esc(m.name)}</h3><b class="num">${m.kcal} kcal</b></div>
        <div class="small muted num" style="margin:2px 0 8px">Budget: ${mac(m)} g</div>
        ${m.title ? `<div style="font-weight:600;margin-bottom:4px">${esc(m.title)}</div>` : ""}
        ${m.items.map((i) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:3px 0"><span>${esc(i.name)}</span><span class="muted num" style="white-space:nowrap">${i.kcal}</span></div>`).join("") || `<div class="small muted">—</div>`}
        <div class="small muted num" style="border-top:1px solid var(--line);margin-top:6px;padding-top:6px">≈ ${m.total.kcal} kcal · ${mac(m.total)} g</div>
      </div>`).join("")}
      <div class="note small num"><b>Day total ≈ ${plan.total.kcal} kcal</b> · ${mac(plan.total)} g<br>Portions are rounded to everyday amounts, so totals land close to, not exactly on, your targets.</div>
      ${exDay.claude?.tips?.length ? `<div class="card" style="padding:12px 16px;margin-bottom:12px"><b>💡 Planning tips</b><ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px;font-size:14px">${exDay.claude.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
      <div class="btn-row">
        <button class="btn secondary" data-act="ex-shuffle">🔀 Different foods</button>
        <button class="btn" data-act="ex-claude">✨ Make one with Claude</button>
      </div>`}`;
  if ($("#sheet").hidden) openSheet(html, () => (exDay = null));
  else { const st = $("#sheetBody").scrollTop; $("#sheetBody").innerHTML = html; $("#sheetBody").scrollTop = st; }
}

async function runExampleClaude() {
  if (!state.apiKey) { closeSheet(); openAiSettings(); return; }
  const p = P();
  const tg = computeTargets();
  const budgets = mealBudgets({ kcal: tg.kcal, protein: tg.protein, carbs: tg.carbs, fat: tg.fat }, p.mealPattern || "3+1");
  exDay.loading = true; exDay.error = null;
  renderExampleDay();
  try {
    const context = [`Daily targets: ${tg.kcal} kcal, ${tg.protein} g protein, ${tg.carbs} g carbs, ${tg.fat} g fat.`, dietLine(p), p.foodPrefs ? `Preferences and dislikes: ${p.foodPrefs}` : "", pantryLine()].filter(Boolean).join("\n");
    const data = await suggestExampleDay({ apiKey: state.apiKey, model: state.model || DEFAULT_MODEL, context, budgets });
    if (!exDay) return;
    exDay.claude = data;
  } catch (err) {
    if (!exDay) return;
    exDay.error = err.message;
  }
  exDay.loading = false;
  renderExampleDay();
}

/* =========================================================
   Weekly household meal plan
   ========================================================= */
let planUI = null; // { view: "setup" | "plan" | "groceries", busy, error, addGuest }

function household() {
  const h = (state.household ||= { include: null, guests: [], pattern: "3+1", notes: "", week: "next" });
  if (!h.include) h.include = Object.keys(state.profiles);
  return h;
}

function planPeople() {
  const h = household();
  const local = Object.values(state.profiles).filter((p) => h.include.includes(p.id)).map((p) => {
    const tg = computeTargets(p);
    return { id: p.id, name: p.name, kcal: tg.kcal, protein: tg.protein, carbs: tg.carbs, fat: tg.fat, diet: p.diet || [], prefs: p.foodPrefs || "" };
  });
  return [...local, ...h.guests];
}

function planStart(which = household().week) {
  const ws = weekStart(today());
  return which === "this" ? ws : addDays(ws, 7);
}

function myPlanId(plan = state.plan) {
  if (!plan) return null;
  const me = P();
  return (plan.people.find((x) => x.id === me.id) || plan.people.find((x) => x.name.toLowerCase() === me.name.toLowerCase()))?.id || null;
}

function slotToMeal(slot) {
  const s = slot.toLowerCase();
  if (s.includes("breakfast")) return "Breakfast";
  if (s.includes("lunch") || s === "meal 1") return "Lunch";
  if (s.includes("dinner") || s === "meal 2") return "Dinner";
  return "Snacks";
}

function openPlanner(view) {
  planUI = { view: view || (state.plan ? "plan" : "setup"), busy: false, error: null, addGuest: false, open: today() };
  renderPlanner();
}

function renderPlanner() {
  const v = planUI.view;
  const body = v === "setup" ? plannerSetup() : v === "groceries" ? plannerGroceries() : plannerPlan();
  const tabs = state.plan && v !== "setup"
    ? `<div class="seg">${[["plan", "🗓️ Plan"], ["groceries", "🛒 Groceries"]].map(([k, l]) => `<button class="${v === k ? "on" : ""}" data-act="plan-view" data-v="${k}">${l}</button>`).join("")}</div>` : "";
  const html = `${sheetTitle(v === "setup" ? "Plan a week" : "Meal plan")}${tabs}${body}`;
  if ($("#sheet").hidden) openSheet(html, () => { planUI = null; render(); });
  else {
    const st = planUI.lastView === v ? $("#sheetBody").scrollTop : 0;
    $("#sheetBody").innerHTML = html; $("#sheetBody").scrollTop = st;
  }
  planUI.lastView = v;
  bindPlanner();
}

function plannerSetup() {
  const h = household();
  const people = planPeople();
  const slots = MEAL_PATTERNS[h.pattern]?.slots || MEAL_PATTERNS["3+1"].slots;
  const fmt = (d) => parseYmd(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `
    <p class="small muted" style="margin-top:0">One plan for the household: shared meals, each person's own portions, and one combined grocery list.</p>
    <div style="font-weight:600;margin:4px 2px 8px">Which week?</div>
    <div class="seg">${["this", "next"].map((w) => `<button class="${h.week === w ? "on" : ""}" data-act="plan-week" data-v="${w}">${w === "this" ? "This week" : "Next week"} (${fmt(planStart(w))})</button>`).join("")}</div>
    <div style="font-weight:600;margin:4px 2px 8px">Who's eating?</div>
    <div class="chips" style="margin-bottom:8px">
      ${Object.values(state.profiles).map((p) => `<button class="chip ${h.include.includes(p.id) ? "on" : ""}" data-act="plan-person" data-v="${p.id}">${esc(p.name)}</button>`).join("")}
      ${h.guests.map((g) => `<button class="chip on" data-act="plan-guest-rm" data-v="${g.id}">${esc(g.name)} ✕</button>`).join("")}
      <button class="chip" data-act="plan-guest">+ Someone on another phone</button>
    </div>
    ${planUI.addGuest ? `<div class="card" style="margin-bottom:12px">
      <p class="small muted" style="margin-top:0">Their numbers are in their app under Settings → Daily targets.</p>
      <form id="guestForm">
        <label class="field"><span>Name</span><input name="name" required maxlength="24"></label>
        <div class="row4">${[["kcal", "kcal"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"]].map(([k, l]) => `<label class="field"><span>${l}</span><input name="${k}" type="number" inputmode="numeric" required></label>`).join("")}</div>
        <div class="chips" style="margin-bottom:10px">${DIETS.map((d) => `<label class="chip"><input type="checkbox" name="diet" value="${d}" style="width:auto;margin-right:4px">${d}</label>`).join("")}</div>
        <button class="btn">Add</button>
      </form></div>` : ""}
    ${people.map((x) => `<div class="small muted" style="margin:0 2px 4px">${esc(x.name)}: ${x.kcal} kcal · P ${x.protein} · C ${x.carbs} · F ${x.fat}${x.diet?.length ? ` · ${esc(x.diet.join(", "))}` : ""}</div>`).join("")}
    <div style="font-weight:600;margin:12px 2px 8px">Meals per day</div>
    <div class="chips" style="margin-bottom:12px">${Object.entries(MEAL_PATTERNS).map(([k, v]) => `<button class="chip ${h.pattern === k ? "on" : ""}" data-act="plan-pattern" data-v="${k}">${v.label}</button>`).join("")}</div>
    <label class="field"><span>Anything else? (optional)</span><input id="planNotes" class="input" value="${esc(h.notes)}" placeholder="e.g. taco Tuesday, budget-friendly, no fish, quick lunches"></label>

    <div class="card" style="margin:14px 0 10px">
      <h3 style="margin-bottom:6px">Free with your Claude app</h3>
      <ol class="small" style="margin:0 0 10px;padding-left:18px;display:grid;gap:4px">
        <li>Tap <b>Copy request</b>.</li>
        <li>Open the <b>Claude app</b>, start a new chat, paste and send.</li>
        <li>When it's done, tap the copy button under Claude's reply.</li>
        <li>Come back here, paste it below and tap <b>Build my week</b>.</li>
      </ol>
      <button class="btn" data-act="plan-copy" ${people.length ? "" : "disabled"}>📋 Copy request for Claude</button>
      <textarea id="planPaste" rows="4" class="input" style="margin-top:10px" placeholder="Paste Claude's reply here"></textarea>
      <button class="btn secondary" style="margin-top:8px" data-act="plan-build">Build my week</button>
    </div>
    ${state.apiKey ? `<button class="btn secondary" data-act="plan-api" ${people.length ? "" : "disabled"}>${planUI.busy ? "Planning… (about a minute)" : "✨ Or generate with your API key (~10–20¢)"}</button>` : ""}
    ${planUI.error ? `<div class="note warn" style="margin-top:10px">${esc(planUI.error)}</div>` : ""}
    <button class="btn secondary" data-act="plan-import" style="margin-top:8px">📥 Import a plan from your partner</button>
    ${state.plan ? `<button class="btn secondary" data-act="plan-view" data-v="plan" style="margin-top:8px">← Back to current plan</button>` : ""}
    ${slots.length ? "" : ""}`;
}

function plannerPlan() {
  const plan = state.plan;
  const me = myPlanId();
  const fmt = (d) => parseYmd(d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const myTg = me ? plan.people.find((x) => x.id === me) : null;
  return `
    <p class="small muted" style="margin:0 2px 10px">${plan.people.map((x) => esc(x.name)).join(" & ")} · week of ${parseYmd(plan.startYmd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}${me ? ` · showing ${esc(P().name)}'s portions` : ""}</p>
    ${plan.days.map((d) => {
      const mine = d.meals.map((m) => m.portions[me]).filter(Boolean);
      const tot = mine.reduce((t, x) => t + x.kcal, 0);
      const open = planUI.open === d.date;
      return `<div class="card plan-day ${d.date === today() ? "is-today" : ""}" style="margin-bottom:10px;padding:0">
        <button class="plan-day-head" data-act="plan-day" data-v="${d.date}"><b>${fmt(d.date)}${d.date === today() ? " · Today" : ""}</b><span class="muted small num">${me && tot ? `${tot}${myTg ? ` / ${myTg.kcal}` : ""} kcal` : ""} ${open ? "▴" : "▾"}</span></button>
        ${open ? d.meals.map((m) => {
          const por = m.portions[me];
          const done = plan.logged?.[`${d.date}|${m.id}|${me}`];
          return `<button class="plan-meal" data-act="plan-meal" data-v="${d.date}|${m.id}">
            <span class="emo">${SLOT_EMO(m.slot)}</span>
            <div class="grow"><div class="small muted">${esc(m.slot)}</div><div class="nm">${esc(m.title)}</div>${por ? `<div class="sub num">${esc(por.serving)}</div>` : ""}</div>
            <span class="num small" style="white-space:nowrap">${done ? "✅" : por ? `${por.kcal} kcal` : ""}</span></button>`;
        }).join("") : ""}
      </div>`;
    }).join("")}
    ${plan.tips?.length ? `<div class="card" style="padding:12px 16px;margin-bottom:12px"><b>💡 Prep tips</b><ul style="margin:6px 0 0;padding-left:18px;display:grid;gap:4px;font-size:14px">${plan.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
    <div class="btn-row">
      <button class="btn secondary" data-act="plan-send">📤 Send to partner</button>
      <button class="btn secondary" data-act="plan-view" data-v="setup">🔄 New plan</button>
    </div>`;
}

function plannerGroceries() {
  const plan = state.plan;
  const list = groceryList(plan);
  const total = list.reduce((t, a) => t + a.items.length, 0);
  const got = list.reduce((t, a) => t + a.items.filter((i) => plan.checked[i.key]).length, 0);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 10px"><span class="small muted">${got} of ${total} in the cart</span>
      <button class="pill-btn" data-act="plan-uncheck">Reset</button></div>
    ${list.map(({ aisle, items }) => `<div class="card" style="padding:6px 14px 10px;margin-bottom:10px">
      <h3 style="margin:8px 0 4px;font-size:15px">${esc(aisle)}</h3>
      ${items.map((i) => `<label class="grocery ${plan.checked[i.key] ? "got" : ""}"><input type="checkbox" data-gkey="${esc(i.key)}" ${plan.checked[i.key] ? "checked" : ""}>
        <span class="grow">${esc(i.name)}</span><span class="num muted small">${esc([fmtQty(i.qty), i.unit].filter(Boolean).join(" "))}</span></label>`).join("")}
    </div>`).join("") || `<div class="empty">No ingredients in this plan.</div>`}
    <button class="btn" data-act="plan-share-list">📤 Share list (Notes, Messages…)</button>`;
}

function bindPlanner() {
  $("#planNotes")?.addEventListener("input", (e) => { household().notes = e.target.value; save(); });
  $("#guestForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    household().guests.push({
      id: "g" + uid(), name: f.get("name").trim(), kcal: Number(f.get("kcal")), protein: Number(f.get("protein")),
      carbs: Number(f.get("carbs")), fat: Number(f.get("fat")), diet: f.getAll("diet"), prefs: "",
    });
    planUI.addGuest = false; save(); renderPlanner();
  });
  document.querySelectorAll("[data-gkey]").forEach((cb) => cb.addEventListener("change", () => {
    state.plan.checked[cb.dataset.gkey] = cb.checked || undefined;
    cb.closest(".grocery").classList.toggle("got", cb.checked);
    const all = groceryList(state.plan).flatMap((a) => a.items);
    if (cb.checked && all.length && all.every((i) => state.plan.checked[i.key]) && !state.plan.groceryDone) {
      state.plan.groceryDone = true;
      coachFire("grocery_list_finished");
    }
    save();
  }));
}

function currentPlanPrompt() {
  const h = household();
  const slots = MEAL_PATTERNS[h.pattern].slots.map(([name, kind, share]) => ({ name, kind, share }));
  // Everyone's saved products (one copy each), so the plan can use what we already buy.
  const seen = new Map();
  for (const pr of Object.values(state.profiles)) for (const f of pr.foods || []) {
    const k = (f.name || "").trim().toLowerCase();
    if (k && (!seen.has(k) || f.label)) seen.set(k, f);
  }
  return { slots, startYmd: planStart(), people: planPeople(), notes: h.notes, staples: knownFoodsText(30, [...seen.values()]) };
}

async function copyPlanRequest() {
  const text = buildPlanPrompt(currentPlanPrompt());
  try { await navigator.clipboard.writeText(text); toast("Copied! Paste it into the Claude app 📋"); }
  catch {
    openSheet(`${sheetTitle("Copy this into Claude")}<textarea class="input" rows="14" readonly id="promptBox">${esc(text)}</textarea><p class="hint">Select all and copy, then paste into the Claude app.</p><button class="btn" data-act="plan-reopen">Done</button>`);
    $("#promptBox").select();
  }
}

function acceptPlan(data) {
  const { slots, startYmd, people } = currentPlanPrompt();
  state.plan = normalizePlan(data, { startYmd, people, slots });
  state.plan.logged = {};
  save();
  planUI.view = "plan"; planUI.error = null;
  planUI.open = state.plan.days.some((d) => d.date === today()) ? today() : state.plan.days[0].date;
  renderPlanner();
  confetti(); toast("Your week is planned! 🗓️");
}

async function planViaApi() {
  if (planUI.busy) return;
  const { slots, startYmd, people } = currentPlanPrompt();
  planUI.busy = true; planUI.error = null; renderPlanner();
  try {
    const data = await generatePlan({ apiKey: state.apiKey, model: state.model || DEFAULT_MODEL, prompt: buildPlanPrompt(currentPlanPrompt()) });
    if (!planUI) return;
    planUI.busy = false;
    acceptPlan(data);
  } catch (err) {
    if (!planUI) return;
    planUI.busy = false; planUI.error = err.message; renderPlanner();
  }
}

function openPlanMeal(key) {
  const [date, id] = key.split("|");
  const plan = state.plan;
  const day = plan.days.find((d) => d.date === date);
  const m = day?.meals.find((x) => x.id === id);
  if (!m) return;
  const me = myPlanId();
  const done = plan.logged?.[`${date}|${id}|${me}`];
  openSheet(`${sheetTitle(esc(m.title))}
    <div class="small muted" style="margin:-6px 2px 10px">${SLOT_EMO(m.slot)} ${esc(m.slot)} · ${parseYmd(date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
    ${m.recipe ? `<div class="note">${esc(m.recipe)}</div>` : ""}
    <h3 style="margin:10px 2px 6px">Portions</h3>
    ${plan.people.map((x) => { const por = m.portions[x.id]; return por ? `<div class="ai-item"><div style="display:flex;justify-content:space-between"><b>${esc(x.name)}</b><b class="num">${por.kcal} kcal</b></div>
      <div class="small">${esc(por.serving)}</div><div class="small muted num">P ${por.p} · C ${por.c} · F ${por.f}</div></div>` : ""; }).join("")}
    ${m.ingredients.length ? `<h3 style="margin:10px 2px 6px">Ingredients (for everyone)</h3><div class="card" style="padding:10px 16px">${m.ingredients.map((g) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:3px 0"><span>${esc(g.name)}</span><span class="muted num">${esc([fmtQty(g.qty), g.unit].filter(Boolean).join(" "))}</span></div>`).join("")}</div>` : ""}
    <br>
    ${me && m.portions[me] ? `<button class="btn" data-act="plan-log" data-v="${key}" ${done ? "disabled" : ""}>${done ? "✅ Logged" : `+ Log my portion to ${slotToMeal(m.slot)}`}</button>` : ""}
    <button class="btn secondary" data-act="plan-reopen">← Back to plan</button>
    <button class="btn danger" data-act="plan-rm-meal" data-v="${key}">Remove from plan</button>`);
}

function logPlanMeal(key) {
  const [date, id] = key.split("|");
  const plan = state.plan;
  const m = plan.days.find((d) => d.date === date)?.meals.find((x) => x.id === id);
  const me = myPlanId();
  const por = m?.portions[me];
  if (!por) return;
  const prevDay = currentDay;
  currentDay = date;
  addState = { meal: slotToMeal(m.slot) };
  addEntry({ name: m.title.replace(/^🔥\s*/, ""), portion: por.serving, kcal: por.kcal, p: por.p, c: por.c, f: por.f, servings: 1 }, { saveFood: false });
  addState = null;
  if (date !== today()) currentDay = prevDay;
  (plan.logged ||= {})[`${date}|${id}|${me}`] = 1;
  save();
  if (date === today()) coachFire("meal_plan_meal_logged");
  toast(`Logged ${m.title} ✅`);
}

async function sendPlan() {
  const data = JSON.stringify({ kind: "biteclub-plan", version: 1, plan: { ...state.plan, logged: {}, checked: {} } });
  const file = new File([data], `biteclub-plan-${state.plan.startYmd}.json`, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Our meal plan" }); return; }
  } catch (err) { if (err.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  toast("Plan saved as a file. Send it to your partner.");
}

async function shareGroceries() {
  const text = groceryText(state.plan);
  try {
    if (navigator.share) { await navigator.share({ title: "Grocery list", text }); return; }
  } catch (err) { if (err.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); toast("List copied 📋"); } catch { toast("Couldn't share the list."); }
}

$("#planInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.kind !== "biteclub-plan" || !data.plan?.days) throw new Error();
    state.plan = { ...data.plan, logged: {}, checked: {} };
    save();
    if (!myPlanId()) toast(`No one named ${P().name} is in this plan. Portions shown for the first person.`);
    else toast("Plan imported 🗓️");
    if (planUI) { planUI.view = "plan"; renderPlanner(); } else openPlanner("plan");
  } catch { toast("That file isn't a Bite Club meal plan."); }
});

function todaysPlanCard() {
  const plan = state.plan;
  const me = myPlanId();
  const day = plan?.days.find((d) => d.date === currentDay);
  if (!day || !me) return "";
  const meals = day.meals.filter((m) => m.portions[me]);
  if (!meals.length) return "";
  return `<div class="card">
    <div class="card-head"><h2>🗓️ On the plan</h2><button class="meta" data-act="plan-open" style="color:var(--accent);font-weight:600">Full week ›</button></div>
    ${meals.map((m) => {
      const key = `${day.date}|${m.id}`;
      const done = plan.logged?.[`${key}|${me}`];
      return `<div class="plan-today"><button class="grow" data-act="plan-meal" data-v="${key}" style="text-align:left"><div class="small muted">${SLOT_EMO(m.slot)} ${esc(m.slot)}</div><div class="nm">${esc(m.title)}</div><div class="sub">${esc(m.portions[me].serving)} · ${m.portions[me].kcal} kcal</div></button>
        <button class="plan-log ${done ? "done" : ""}" data-act="plan-log" data-v="${key}" ${done ? "disabled" : ""} aria-label="Log ${esc(m.title)}">${done ? "✓" : "+"}</button></div>`;
    }).join("")}
  </div>`;
}

/* =========================================================
   Fitness
   ========================================================= */
/* ---------- Personal records & weekly goal ---------- */
const MI = 1.609344;
function weekStart(date = currentDay) {
  const d = parseYmd(date);
  const back = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(date, -back);
}
function weekTotals(date = currentDay, p = P()) {
  const start = weekStart(date);
  let workouts = 0, minutes = 0;
  for (let i = 0; i < 7; i++) {
    const ws = p.days?.[addDays(start, i)]?.workouts || [];
    workouts += ws.length;
    minutes += ws.reduce((t, w) => t + (w.minutes || 0), 0);
  }
  return { start, workouts, minutes };
}
const weeklyGoal = (p = P()) => ({ workouts: p.weeklyGoal?.workouts ?? 4, minutes: p.weeklyGoal?.minutes ?? 150 });

/** Best values across all history, keyed so we can spot new records. */
function recordMap(p = P()) {
  const rec = {};
  const bump = (key, value, info) => { if (value > 0 && (!rec[key] || value > rec[key].value)) rec[key] = { value, ...info }; };
  for (const [date, day] of Object.entries(p.days || {})) {
    for (const w of day.workouts || []) {
      const info = { date, type: w.type, title: w.title };
      bump(`out:${w.type}`, w.output || 0, info);
      bump(`min:${w.type}`, w.minutes || 0, info);
      bump(`kcal:${w.type}`, w.kcal || 0, info);
      const mi = w.distance ? (w.distUnit === "km" ? w.distance / MI : w.distance) : 0;
      bump(`dist:${w.type}`, mi, info);
    }
    bump("steps", day.activity?.steps || 0, { date });
  }
  return rec;
}
function recordLabel(key, r) {
  const [kind] = key.split(":");
  const dist = imperial() ? `${r1(r.value)} mi` : `${r1(r.value * MI)} km`;
  return { out: `${r.value} kJ output`, min: `${r.value} min`, kcal: `${r.value} kcal`, dist, steps: `${r.value.toLocaleString()} steps` }[kind];
}
const fitSnapshot = (date = currentDay) => ({ rec: recordMap(), week: weekTotals(date), steps: dayData(date).activity?.steps || 0 });

/** Celebrate new personal records and a newly reached weekly goal. */
function celebrateFitness(before, date = currentDay, addedWorkout = false) {
  const after = recordMap();
  const wins = [];
  for (const [k, r] of Object.entries(after)) {
    const old = before.rec[k];
    if (old && r.value > old.value) {
      const t = k === "steps" ? "👟" : (WORKOUTS[r.type] || WORKOUTS.other).emo;
      wins.push(`${t} ${recordLabel(k, r)}`);
    }
  }
  const goal = weeklyGoal();
  const wk = weekTotals(date);
  const hitGoal = wk.start === before.week.start &&
    ((before.week.workouts < goal.workouts && wk.workouts >= goal.workouts) || (before.week.minutes < goal.minutes && wk.minutes >= goal.minutes));
  if (wins.length || hitGoal) {
    confetti();
    setTimeout(() => toast(wins.length ? `🏆 New PR! ${wins[0]}` : "🎯 Weekly activity goal reached!"), 300);
  }
  const out = [];
  if (wins.length) out.push("workout_pr");
  if (date === today()) {
    if (hitGoal) out.push("weekly_workout_hit");
    const frac = (w) => Math.max(w.workouts / goal.workouts, w.minutes / goal.minutes);
    if (before.week.start === wk.start && frac(before.week) < 0.5 && frac(wk) >= 0.5) out.push("weekly_workout_halfway");
    if (addedWorkout) out.push("workout_logged");
    const sg = P().stepGoal || 8000;
    out.push(crossed(before.steps / sg, (dayData(date).activity?.steps || 0) / sg, [[T.half, "steps_halfway"], [T.close, "steps_close"], [1, "steps_hit"]]));
  }
  coachFire(out);
}

function miniRing(val, goal, label, sub) {
  const C = 2 * Math.PI * 30;
  const pct = Math.min(1, val / (goal || 1));
  return `<div style="display:grid;justify-items:center;gap:4px">
    <div class="ring" style="width:84px;height:84px">
      <svg viewBox="0 0 76 76" aria-hidden="true">
        <circle class="track" cx="38" cy="38" r="30" fill="none" stroke-width="9"/>
        <circle class="prog" cx="38" cy="38" r="30" fill="none" stroke-width="9" stroke-linecap="round" stroke="url(#stepsGrad)" style="stroke:url(#stepsGrad)" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/>
      </svg>
      <div class="ring-center"><div class="big num" style="font-size:20px">${val}</div><div class="lbl" style="font-size:10px;text-transform:none;letter-spacing:0">of ${goal}</div></div>
    </div>
    <div style="font-weight:700;font-size:13px">${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ""}
  </div>`;
}

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
    ${(() => {
      const g = weeklyGoal(); const wk = weekTotals();
      const done = wk.workouts >= g.workouts && wk.minutes >= g.minutes;
      return `<div class="card">
        <div class="card-head"><h2>🎯 This week</h2><span class="meta">${done ? "Goal smashed! 🎉" : `${parseYmd(wk.start).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${parseYmd(addDays(wk.start, 6)).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</span></div>
        <div style="display:flex;justify-content:space-around">${miniRing(wk.workouts, g.workouts, "Workouts")}${miniRing(wk.minutes, g.minutes, "Active minutes")}</div>
      </div>`;
    })()}
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
    ${(() => {
      const rec = recordMap();
      const types = [...new Set(Object.keys(rec).filter((k) => k.includes(":")).map((k) => k.split(":")[1]))];
      if (!types.length && !rec.steps) return "";
      return `<div class="card">
        <div class="card-head"><h2>🏆 Personal records</h2></div>
        ${types.map((t) => {
          const W = WORKOUTS[t] || WORKOUTS.other;
          const bits = ["out", "dist", "min", "kcal"].filter((k) => rec[`${k}:${t}`]).map((k) => `<b class="num">${recordLabel(`${k}:${t}`, rec[`${k}:${t}`])}</b>`).join(" · ");
          return `<div class="workout" style="cursor:default"><span class="wico">${W.emo}</span><div class="grow"><div class="nm">${W.label}</div><div class="sub" style="white-space:normal">${bits}</div></div></div>`;
        }).join("")}
        ${rec.steps ? `<div class="workout" style="cursor:default"><span class="wico">👟</span><div class="grow"><div class="nm">Most steps in a day</div><div class="sub"><b class="num">${rec.steps.value.toLocaleString()}</b> · ${parseYmd(rec.steps.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div></div></div>` : ""}
      </div>`;
    })()}
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
    const snap = fitSnapshot();
    if (w) Object.assign(w, rec);
    else day.workouts.push({ id: uid(), source: "manual", ...rec });
    save(); closeSheet(); render(); toast(w ? "Saved" : "Workout logged 💪");
    celebrateFitness(snap, currentDay, !w);
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
    const snap = fitSnapshot();
    day.activity = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, Number(x) || 0]));
    save(); closeSheet(); render(); toast("Saved");
    celebrateFitness(snap);
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
  const snap = fitSnapshot(date);
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
  celebrateFitness(snap, date, added > 0);
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
function openDiet() {
  const p = P();
  openSheet(`${sheetTitle("Dietary needs")}
    <p class="small muted" style="margin-top:0">Claude treats these as strict rules for meal ideas, the weekly review and grocery lists, and flags photo estimates that may not fit.</p>
    <div class="chips">${DIETS.map((d) => `<button class="chip ${(p.diet || []).includes(d) ? "on" : ""}" data-act="diet" data-v="${d}">${d}</button>`).join("")}</div>
    <br><button class="btn" data-act="close-render">Done</button>`);
}

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
      <div class="row2">
        <label class="field"><span>Workouts per week</span><input name="wkWorkouts" type="number" inputmode="numeric" min="1" max="14" value="${weeklyGoal().workouts}"></label>
        <label class="field"><span>Active minutes per week</span><input name="wkMinutes" type="number" inputmode="numeric" min="10" step="10" value="${weeklyGoal().minutes}"></label>
      </div>
      <p class="hint" style="margin-top:-6px">150 minutes a week is the common health guideline. Weeks run Monday to Sunday.</p>
      <label class="field"><span>Add workout calories to my food goal?</span></label>
      <div class="seg">${[[0, "Off"], [0.5, "Half"], [1, "All"]].map(([v, l]) => `<button type="button" class="${(p.eatBack || 0) === v ? "on" : ""}" data-act="eatback" data-v="${v}">${l}</button>`).join("")}</div>
      <p class="hint" style="margin-top:-6px">Your activity level already counts typical exercise, so <b>Off</b> is the safe default. <b>Half</b> is a good middle ground on big workout days — trackers tend to overestimate calories burned.</p>
      <button class="btn">Save</button>
    </form>`);
  $("#fgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    p.stepGoal = Math.max(1000, Number(e.target.steps.value) || 8000);
    p.weeklyGoal = { workouts: Math.max(1, Number(e.target.wkWorkouts.value) || 4), minutes: Math.max(10, Number(e.target.wkMinutes.value) || 150) };
    save(); closeSheet(); render();
  });
}

/* =========================================================
   Private: body measurements, progress photos, cycle
   (stored only on this device and never shared)
   ========================================================= */
const MEASURES = [["waist", "Waist"], ["hips", "Hips"], ["chest", "Chest"], ["arm", "Arm"], ["thigh", "Thigh"], ["bodyFat", "Body fat %"]];
const lenUnit = () => (imperial() ? "in" : "cm");

function renderBody() {
  const p = P();
  const ms = [...(p.measurements || [])].sort((a, b) => a.date.localeCompare(b.date));
  const first = ms[0], last = ms[ms.length - 1];
  const row = ([k, label]) => {
    const latest = [...ms].reverse().find((m) => m[k]);
    const earliest = ms.find((m) => m[k]);
    if (!latest) return "";
    const unit = k === "bodyFat" ? "%" : ` ${lenUnit()}`;
    const v = k === "bodyFat" ? latest[k] : imperial() ? latest[k] : latest[k] * 2.54;
    const d = earliest && earliest !== latest ? latest[k] - earliest[k] : null;
    const dv = d == null ? "" : k === "bodyFat" ? r1(d) : imperial() ? r1(d) : r1(d * 2.54);
    return `<div class="wl"><span>${label}</span><span><b class="num">${r1(v)}${unit}</b> ${d == null || !d ? "" : `<span class="delta ${d < 0 ? "good" : ""}">${d < 0 ? "▼" : "▲"} ${Math.abs(dv)}</span>`}</span></div>`;
  };
  return `<div class="card">
    <div class="card-head"><h2>📏 Body</h2><span class="meta">🔒 Private</span></div>
    ${ms.length ? `<div class="weigh-list">${MEASURES.map(row).join("")}</div>
      <p class="small muted" style="margin:6px 0 10px">${ms.length > 1 ? `Change since ${parseYmd(first.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : `Measured ${parseYmd(last.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</p>`
      : `<p class="small muted" style="margin-top:0">The scale can stall while your waist shrinks. Measure every 2–4 weeks to see the full picture.</p>`}
    <div class="btn-row"><button class="btn secondary" data-act="add-measure">+ Measurements</button><button class="btn secondary" data-act="add-photo">📸 Add photo</button></div>
    <div id="photoGrid"></div>
  </div>`;
}

function openMeasure() {
  const p = P();
  const ms = [...(p.measurements || [])].sort((a, b) => a.date.localeCompare(b.date));
  const last = ms[ms.length - 1] || {};
  const disp = (k) => (last[k] ? (k === "bodyFat" || imperial() ? r1(last[k]) : r1(last[k] * 2.54)) : "");
  openSheet(`${sheetTitle("Measurements")}
    <p class="small muted" style="margin-top:0">🔒 Only stored on this phone. Measure at the same spot each time, relaxed, first thing in the morning.</p>
    <form id="msForm">
      <label class="field"><span>Date</span><input type="date" name="date" value="${today()}" max="${today()}"></label>
      <div class="row2">${MEASURES.map(([k, l]) => `<label class="field"><span>${l}${k === "bodyFat" ? "" : ` (${lenUnit()})`}</span><input name="${k}" type="number" inputmode="decimal" step="0.1" min="0" placeholder="${disp(k)}"></label>`).join("")}</div>
      <p class="hint">Leave blank anything you didn't measure. Last values are shown faintly.</p>
      <button class="btn">Save</button>
    </form>`);
  $("#msForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const rec = { date: f.date || today() };
    for (const [k] of MEASURES) {
      const v = Number(f[k]);
      if (v > 0) rec[k] = k === "bodyFat" || imperial() ? v : v / 2.54; // stored in inches
    }
    if (Object.keys(rec).length < 2) return toast("Enter at least one measurement.");
    p.measurements = (p.measurements || []).filter((m) => m.date !== rec.date);
    p.measurements.push(rec);
    save(); closeSheet(); render(); toast("Measurements saved 📏");
  });
}

/* Progress photos live in IndexedDB (too big for localStorage). */
const PHOTO_DB = "macropal-photos";
function photoDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" }).createIndex("profile", "profileId");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function photoTx(mode, fn) {
  const db = await photoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const out = fn(tx.objectStore("photos"));
    tx.oncomplete = () => resolve(out?.result ?? out);
    tx.onerror = () => reject(tx.error);
  });
}
const listPhotos = (profileId) => photoTx("readonly", (st) => st.index("profile").getAll(profileId));
const putPhoto = (rec) => photoTx("readwrite", (st) => st.put(rec));
const deletePhoto = (id) => photoTx("readwrite", (st) => st.delete(id));
const photoUrls = [];

async function loadPhotoGrid() {
  const grid = $("#photoGrid");
  if (!grid) return;
  let photos = [];
  try { photos = await listPhotos(P().id); } catch { return; }
  photoUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  photos.sort((a, b) => b.date.localeCompare(a.date));
  if (!photos.length) { grid.innerHTML = ""; return; }
  const url = (ph) => { const u = URL.createObjectURL(ph.blob); photoUrls.push(u); return u; };
  grid.innerHTML = `<div class="photo-grid">${photos.slice(0, 9).map((ph) => `<button data-act="view-photo" data-id="${ph.id}"><img src="${url(ph)}" alt="Progress photo ${ph.date}"><span>${parseYmd(ph.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></button>`).join("")}</div>
    ${photos.length > 1 ? `<button class="btn secondary" style="margin-top:10px" data-act="compare-photos">↔️ Compare first & latest</button>` : ""}`;
}

async function addProgressPhoto(file) {
  const { dataUrl } = await prepareImage(file);
  const blob = await (await fetch(dataUrl)).blob();
  await putPhoto({ id: uid(), profileId: P().id, date: today(), blob });
  render(); toast("Photo saved 🔒");
}

async function viewPhoto(id) {
  const photos = await listPhotos(P().id);
  const ph = photos.find((x) => x.id === id);
  if (!ph) return;
  const u = URL.createObjectURL(ph.blob);
  openSheet(`${sheetTitle(parseYmd(ph.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }))}
    <img src="${u}" alt="" style="width:100%;border-radius:16px;display:block;margin-bottom:12px">
    <button class="btn danger" data-act="del-photo" data-id="${id}">Delete photo</button>`, () => URL.revokeObjectURL(u));
}

async function comparePhotos() {
  const photos = (await listPhotos(P().id)).sort((a, b) => a.date.localeCompare(b.date));
  const a = photos[0], b = photos[photos.length - 1];
  const ua = URL.createObjectURL(a.blob), ub = URL.createObjectURL(b.blob);
  const lbl = (ph) => parseYmd(ph.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  openSheet(`${sheetTitle("Then & now")}
    <div class="compare"><figure><img src="${ua}" alt=""><figcaption>${lbl(a)}</figcaption></figure><figure><img src="${ub}" alt=""><figcaption>${lbl(b)}</figcaption></figure></div>`,
    () => { URL.revokeObjectURL(ua); URL.revokeObjectURL(ub); });
}

$("#progressPhotoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (file) addProgressPhoto(file).catch(() => toast("Couldn't save that photo."));
});

/* ---------- Cycle tracking ---------- */
function cycleInfo(date = today(), p = P()) {
  const c = p.cycle;
  if (!c?.enabled || !c.starts?.length) return null;
  const starts = [...c.starts].sort();
  const past = starts.filter((s) => s <= date);
  if (!past.length) return null;
  const gaps = starts.slice(1).map((s, i) => (parseYmd(s) - parseYmd(starts[i])) / 864e5).filter((g) => g >= 18 && g <= 45).slice(-6);
  const avg = gaps.length ? Math.round(gaps.reduce((x, y) => x + y, 0) / gaps.length) : 28;
  const last = past[past.length - 1];
  const day = Math.round((parseYmd(date) - parseYmd(last)) / 864e5) + 1;
  const next = addDays(last, avg);
  const toNext = Math.round((parseYmd(next) - parseYmd(date)) / 864e5);
  const periodLen = c.periodLen || 5;
  let phase = "follicular";
  if (day <= periodLen) phase = "period";
  else if (Math.abs(day - (avg - 14)) <= 1) phase = "ovulation";
  else if (day > avg - 14) phase = toNext <= 5 ? "pre" : "luteal";
  return { day, avg, next, toNext, phase, last };
}
const PHASES = {
  period: ["🌸", "Period", "Water weight and cravings are normal. Go easy on yourself."],
  follicular: ["🌱", "Follicular", "Energy usually rises. A great time to push workouts."],
  ovulation: ["✨", "Ovulation window", "Often peak energy and strength."],
  luteal: ["🌙", "Luteal", "Appetite can rise a bit. Extra protein and fiber help."],
  pre: ["🌧️", "Pre-period", "The scale often jumps 1–3 lb now. That's water, not fat."],
};

function renderCycle() {
  const p = P();
  if (!p.cycle?.enabled) return "";
  const ci = cycleInfo();
  const [emo, name, tip] = ci ? PHASES[ci.phase] : ["🌸", "Cycle", ""];
  return `<div class="card">
    <div class="card-head"><h2>${emo} Cycle</h2><span class="meta">🔒 Private</span></div>
    ${ci ? `<div class="wk-hero"><div><div class="v">Day ${ci.day}</div><div class="small muted">${name} · next period ${ci.toNext > 0 ? `in ~${ci.toNext} days` : ci.toNext === 0 ? "expected today" : `${-ci.toNext} days late`}</div></div></div>
      <div class="note small" style="margin:10px 0">${tip}</div>` : `<p class="small muted" style="margin-top:0">Log the first day of your period to start predictions.</p>`}
    <button class="btn secondary" data-act="cycle-sheet">🌸 Log period / history</button>
  </div>`;
}

function openCycle() {
  const p = P();
  const c = (p.cycle ||= { enabled: true, starts: [], periodLen: 5 });
  const ci = cycleInfo();
  openSheet(`${sheetTitle("Cycle")}
    <p class="small muted" style="margin-top:0">🔒 Only stored on this phone and never shared.</p>
    <label class="field"><span>Period started on</span><input type="date" id="cycStart" value="${today()}" max="${today()}"></label>
    <button class="btn" data-act="cycle-log">Log period start</button>
    <div class="row2" style="margin-top:14px">
      <label class="field"><span>Typical period length (days)</span><input type="number" id="cycLen" inputmode="numeric" min="2" max="10" value="${c.periodLen || 5}"></label>
      <div class="field"><span>Average cycle</span><div class="input" style="background:var(--surface-2)">${ci ? `${ci.avg} days` : "—"}</div></div>
    </div>
    <div class="card"><div class="card-head"><h2>History</h2></div>
      <div class="weigh-list">${[...c.starts].sort().reverse().map((d) => `<div class="wl"><span>${parseYmd(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span><button data-act="cycle-del" data-v="${d}" aria-label="Delete">✕</button></div>`).join("") || `<div class="empty">No periods logged yet.</div>`}</div>
    </div>`, () => {
    const len = Number($("#cycLen")?.value);
    if (len >= 2 && len <= 10) { c.periodLen = len; save(); }
    render();
  });
}

/* =========================================================
   Coach pop-ups (pre-written lines from coaches.js)
   ========================================================= */
const COACH_FREQ = { off: 0, chill: 2, normal: 6, chatty: 20 };
const REPEATABLE = new Set(["food_logged", "workout_logged", "workout_pr", "meal_plan_meal_logged", "random_smalltalk"]);
const coachCfg = (p = P()) => ({ id: DEFAULT_COACH, freq: "normal", holidays: true, ...(p?.coach || {}) });
const LB_KG = LB;

function coachVars() {
  const p = P();
  const tg = dayGoal(today());
  const tot = totals(dayData(today()).entries);
  const weekly = weeklyWeights();
  const cur = weekly.length ? weekly[weekly.length - 1].kg : latestWeightKg();
  const toward = Math.sign(p.goalWeightKg - p.startWeightKg) || 1;
  return {
    name: p.name, streak: streakDays(),
    protein_left: Math.max(0, r0(tg.protein - tot.p)), kcal_left: Math.max(0, r0(tg.kcal - tot.kcal)),
    lbs_to_goal: toDispW(Math.abs(p.goalWeightKg - cur)).toFixed(1),
    lbs_lost: toDispW(Math.max(0, (cur - p.startWeightKg) * toward)).toFixed(1),
    unit: wUnit(),
    atta: p.sex === "female" ? "Atta girl" : "Atta boy",
    month: new Date().toLocaleString("en-US", { month: "long" }),
  };
}

function coachToday() {
  const p = P();
  const log = (p.coachLog ||= {});
  if (log.date !== today()) Object.assign(log, { date: today(), small: 0, nudges: 0, last: 0, fired: {} });
  log.fired ||= {};
  return log;
}

/** Can this trigger show right now under the user's chattiness setting? */
function coachAllowed(id, log, cfg) {
  const meta = TRIGGER_META[id];
  if (!meta || !COACH_FREQ[cfg.freq]) return false;
  if (!REPEATABLE.has(id) && log.fired[id]) return false;
  if (meta.type === "small") return log.small < COACH_FREQ[cfg.freq] && Date.now() - log.last > 90e3;
  if (meta.type === "nudge") return log.nudges < T.nudgesPerDay;
  if (meta.type === "checkin") return true; // once a day each (the user asked for these)
  return true; // big & huge always
}

/** Show one specific trigger (used by the queue, and by previews with force). */
function coachSay(id, { force = false } = {}) {
  const p = P();
  if (!p) return false;
  const cfg = coachCfg();
  const log = coachToday();
  if (!force && !coachAllowed(id, log, cfg)) return false;
  let who = cfg.id;
  const guest = cfg.holidays && !force && seasonalCoach();
  if (guest && guest !== who && Math.random() < guestChance(guest)) who = guest;
  const chain = [LINE_ID[id] || id];
  while (FALLBACK[chain[chain.length - 1]] && chain.length < 4) chain.push(FALLBACK[chain[chain.length - 1]]);
  const text = (!force && phaseLine(who, chain[0], new Date(), { status: cfg.valentine })) || coachLine(who, chain, { goal: computeTargets().direction, vars: { ...coachVars(), ...checkinVars(id) } });
  if (!text) return false;
  const type = TRIGGER_META[id]?.type;
  if (!force) {
    if (!REPEATABLE.has(id)) log.fired[id] = 1;
    if (type === "small") { log.small++; log.last = Date.now(); }
    if (type === "nudge") log.nudges++;
  }
  save();
  showCoach(who, text, guest === who && cfg.id !== who, id, id.startsWith("checkin_") ? checkinFact : "");
  if (type === "huge" || id === "protein_hit" || id === "workout_pr") confetti();
  return true;
}

let coachTimer;
function showCoach(id, text, isGuest, trigger = "", fact = "") {
  const c = COACHES[id];
  const el = $("#coachPop");
  el.dataset.trigger = trigger;
  el.innerHTML = `<span class="coach-av">${c.emoji}</span><div class="coach-txt"><b>${esc(c.name)}${isGuest ? ` <span class="coach-guest">Guest</span>` : ""}</b><span>${esc(text)}</span>${fact ? `<small class="coach-fact">${esc(fact)}</small>` : ""}</div>`;
  el.classList.toggle("is-checkin", !!fact);
  el.hidden = false;
  el.classList.remove("coach-in"); void el.offsetWidth; el.classList.add("coach-in");
  clearTimeout(coachTimer);
  coachTimer = setTimeout(() => (el.hidden = true), 7000 + Math.min(5000, text.length * 40));
}

$("#coachPop").addEventListener("click", () => { $("#coachPop").hidden = true; });

// Triggers that fire together (one meal can hit protein, calories and a streak)
// are collected briefly; the most important one that's allowed gets shown.
let coachPending = new Set(), coachPendingTimer;
function coachFire(...ids) {
  for (const id of ids.flat(Infinity)) if (id && TRIGGER_META[id]) coachPending.add(id);
  clearTimeout(coachPendingTimer);
  coachPendingTimer = setTimeout(flushCoach, 700);
}
function flushCoach(delay = 0) {
  const ids = [...coachPending];
  coachPending = new Set();
  if (!P() || !ids.length) return;
  const log = coachToday();
  const cfg = coachCfg();
  const ok = ids.filter((id) => coachAllowed(id, log, cfg)).sort((x, y) => TRIGGER_META[y].rank - TRIGGER_META[x].rank);
  // Threshold triggers only happen once a day, even when a bigger one was shown instead.
  for (const id of ids) if (!REPEATABLE.has(id) && id !== ok[0]) log.fired[id] = 1;
  save();
  if (ok.length) setTimeout(() => coachSay(ok[0]), delay);
}

/* ---- Trigger checks ---- */
function crossed(before, after, steps) {
  // steps: [[fraction, id], ...]; every step crossed by this change (the queue ranks them)
  return steps.filter(([f]) => before < f && after >= f).map(([, id]) => id);
}

function foodTriggers(beforeTot, afterTot, firstToday, name = "") {
  const p = P();
  const tg = dayGoal(today());
  const out = [firstToday ? "food_first_log" : "food_logged"];
  if (/turkey/i.test(name) && Math.random() < 0.5) out.push("food_turkey");
  if (/garlic/i.test(name) && Math.random() < 0.5) out.push("food_garlic");
  const cb = beforeTot.kcal / tg.kcal, ca = afterTot.kcal / tg.kcal;
  const calBand = (r) => (r > T.calOverLarge ? 4 : r > 1 ? 3 : r >= T.calHit ? 2 : r >= T.calClose ? 1 : 0);
  const bb = calBand(cb), ba = calBand(ca);
  if (ba > bb) out.push([null, "calories_close", "calories_hit", "calories_over_small", "calories_over_large"][ba]);
  out.push(crossed(beforeTot.p / tg.protein, afterTot.p / tg.protein,
    [[T.proHalf, "protein_halfway"], [T.proClose, "protein_close"], [1, "protein_hit"], [T.proOver, "protein_over"]]));
  if (firstToday) {
    const st = streakDays();
    if (T.streakMilestones.includes(st)) out.push(`logging_streak_${st}`);
    const mem = (p.coachMem ||= {});
    if (mem.comeback) { out.push("streak_comeback"); mem.comeback = false; }
  }
  return out;
}

function lastLogBefore(date) {
  const days = Object.entries(P().days || {}).filter(([d, v]) => d < date && v.entries?.length).map(([d]) => d).sort();
  return days[days.length - 1] || null;
}
function streakEndingOn(date) {
  let n = 0, d = date;
  while ((P().days?.[d]?.entries || []).length) { n++; d = addDays(d, -1); }
  return n;
}
const recentlyUsed = (fn) => Array.from({ length: 7 }, (_, i) => dayData(addDays(today(), -1 - i))).some(fn);

/* ---- Check-ins: "if I haven't done X by this time, call it out" ---- */
const CHECKS = {
  breakfast: { emo: "🍳", label: "Breakfast", def: "10:00", meal: "Breakfast", word: "breakfast", desc: "Breakfast logged", todo: "breakfast isn't logged yet", done: (d) => d.entries.some((e) => e.meal === "Breakfast") },
  lunch: { emo: "🥗", label: "Lunch", def: "14:00", meal: "Lunch", word: "lunch", desc: "Lunch logged", todo: "lunch isn't logged yet", done: (d) => d.entries.some((e) => e.meal === "Lunch") },
  dinner: { emo: "🍽️", label: "Dinner", def: "20:00", meal: "Dinner", word: "dinner", desc: "Dinner logged", todo: "dinner isn't logged yet", done: (d) => d.entries.some((e) => e.meal === "Dinner") },
  water: { emo: "💧", label: "Water", def: "14:00", desc: "Half my water", todo: "you're under half your water", done: (d, p) => (d.water || 0) >= (p.waterGoal || 8) / 2 },
  protein: { emo: "🥩", label: "Protein", def: "17:00", desc: "Half my protein", todo: "you're under half your protein", done: (d) => totals(d.entries).p >= dayGoal(today()).protein / 2 },
  move: { emo: "👟", label: "Move", def: "19:00", desc: "A workout or half my steps", todo: "no workout or steps yet", done: (d, p) => (d.workouts || []).length > 0 || (d.activity?.steps || 0) >= (p.stepGoal || 8000) / 2 },
  weigh: { emo: "⚖️", label: "Weigh-in", def: "11:00", desc: "Weekly weigh-in (weigh-in day only)", todo: "it's weigh-in day and you haven't weighed in", done: (d, p) => new Date().getDay() !== (p.weighDay ?? 1) || (p.weights || []).some((w) => w.date === today()) },
};
function checkinCfg() {
  const c = (P().checkins ||= {});
  for (const [k, v] of Object.entries(CHECKS)) c[k] = { on: true, time: v.def, ...c[k] };
  return c;
}
const fmtClock = (hm) => { const [h, m] = hm.split(":").map(Number); return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };
/** Check-ins whose time has passed today and that still aren't done. */
function dueCheckins() {
  const p = P();
  if (!p) return [];
  const cfg = checkinCfg();
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const d = dayData(today());
  return Object.entries(CHECKS).filter(([k, c]) => {
    if (!cfg[k].on) return false;
    const [h, m] = cfg[k].time.split(":").map(Number);
    return mins >= h * 60 + m && !c.done(d, p);
  }).map(([k]) => k);
}
let checkinFact = "", checkinNow = [];
function checkinVars(id) {
  const k = id.startsWith("checkin_") ? id.slice(8) : null;
  if (!k || !CHECKS[k]) return {};
  const w = CHECKS[k].word || CHECKS[k].label.toLowerCase();
  return { meal: w, MEAL: w.toUpperCase(), Meal: w[0].toUpperCase() + w.slice(1), time: fmtClock(checkinCfg()[k].time) };
}
/** Due check-ins the coach hasn't called out today (also sets the "still to do" line under the pop-up). */
function newCheckinIds() {
  const due = dueCheckins();
  checkinNow = due;
  const log = coachToday();
  const fresh = due.filter((k) => !log.fired["checkin_" + k]);
  if (!fresh.length) return [];
  const cfg = checkinCfg();
  checkinFact = due.length > 1
    ? `⏰ Still to do: ${due.map((k) => CHECKS[k].label.toLowerCase()).join(", ")}`
    : `⏰ ${fmtClock(cfg[due[0]].time)} · ${CHECKS[due[0]].todo}`;
  return fresh.map((k) => "checkin_" + k);
}
function checkinStrip() {
  const due = dueCheckins().filter((k) => k !== "weigh"); // weigh-in day has its own banner
  if (!due.length) return "";
  const cfg = checkinCfg();
  return `<div class="checkins">
    <div class="ci-head"><b>⏰ Still to do</b><button class="ci-edit" data-act="checkins-open">Edit</button></div>
    <div class="ci-chips">${due.map((k) => `<button class="ci-chip" data-act="checkin-go" data-k="${k}"><span>${CHECKS[k].emo}</span><b>${CHECKS[k].label}</b><small>by ${fmtClock(cfg[k].time)}</small></button>`).join("")}</div>
  </div>`;
}
// While the app is open, check every minute so a passing deadline gets called out right away.
let checkinSig = "";
function checkinTick() {
  if (document.visibilityState !== "visible" || !P()) return;
  const ids = newCheckinIds();
  if (ids.length) coachFire(ids);
  const sig = checkinNow.join();
  if (sig !== checkinSig) {
    const typing = document.activeElement?.matches?.("input, textarea, select");
    if (checkinSig !== "" || sig) { if (tab === "today" && currentDay === today() && $("#sheet").hidden && !typing) render(); }
    checkinSig = sig;
  }
}
setInterval(checkinTick, 60e3);

function openCheckins() {
  const cfg = checkinCfg();
  openSheet(`${sheetTitle("⏰ Check-ins")}
    <p class="small muted" style="margin-top:0">If something isn't done by its time, your coach calls it out (once a day) and it glows on Today until it's done. Works whenever the app is open.</p>
    <div class="ci-list">${Object.entries(CHECKS).map(([k, c]) => `<label class="ci-row">
      <input type="checkbox" data-ck="${k}" ${cfg[k].on ? "checked" : ""}>
      <span class="ci-txt"><b>${c.emo} ${c.label}</b><small>${c.desc} by</small></span>
      <input type="time" class="input ci-time" data-ct="${k}" value="${cfg[k].time}">
    </label>`).join("")}</div>`, () => render());
  $("#sheetBody").querySelectorAll("[data-ck]").forEach((el) => el.addEventListener("change", () => { checkinCfg()[el.dataset.ck].on = el.checked; save(); }));
  $("#sheetBody").querySelectorAll("[data-ct]").forEach((el) => el.addEventListener("change", () => { if (el.value) { checkinCfg()[el.dataset.ct].time = el.value; save(); } }));
}

/** Checks that run whenever the app is opened. */
function coachOnOpen() {
  const p = P();
  if (!p || !COACH_FREQ[coachCfg().freq]) return;
  const mem = (p.coachMem ||= {});
  const t = today();
  const now = new Date();
  const h = now.getHours();
  const day = dayData(t);
  const out = [];
  const firstOpen = mem.lastOpen !== t;
  mem.lastOpen = t;

  if (firstOpen) {
    const last = lastLogBefore(t);
    const yesterday = addDays(t, -1);
    if (last) {
      const missed = Math.round((parseYmd(t) - parseYmd(last)) / 864e5) - 1;
      if (missed >= 7) out.push("return_after_7_days");
      else if (missed >= 2) out.push("return_after_2_days");
      if (last < yesterday) {
        const len = streakEndingOn(last);
        if (len >= T.streakBrokenMin && mem.brokenFor !== last) { out.push("streak_broken"); mem.brokenFor = last; mem.comeback = true; }
      }
    }
    const yd = dayData(yesterday);
    if (yd.entries.length) {
      const yGoal = dayGoal(yesterday).kcal;
      const yKcal = totals(yd.entries).kcal;
      if (yKcal < yGoal * T.calHit) {
        const dir = computeTargets().direction;
        if (dir === "lose") out.push(yKcal < yGoal * T.calWayUnder ? "day_under_calories_way" : "day_under_calories_positive");
        else out.push(dir === "gain" ? "day_under_calories_nudge" : "day_under_calories_small");
      }
    }
    const wd = now.getDay();
    if (wd === 1) out.push("monday_open");
    else if (wd === 5) out.push("friday_open");
    else if (wd === 0 || wd === 6) out.push("weekend_open");
  }
  const part = h >= T.nightStart || h < T.nightEnd ? "late" : h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  out.push(`app_open_${part}`);

  if (h >= T.afternoonCutoff && h < T.nightStart && !day.entries.length) out.push("nothing_logged_afternoon");
  if (h >= T.lateHour) {
    const tg = dayGoal(t);
    if (day.entries.length && totals(day.entries).p < tg.protein * T.proLowLate) out.push("protein_low_late");
    if (computeTargets().direction === "gain" && totals(day.entries).kcal < tg.kcal * T.calLowLate) out.push("calories_low_late");
    const active = (d) => (d.workouts || []).length || d.activity?.steps;
    if (!active(day) && recentlyUsed(active)) out.push("steps_low_late");
    const wg = p.waterGoal || 8;
    if ((day.water || 0) < wg * 0.5 && recentlyUsed((d) => d.water > 0)) out.push("water_low_late");
  }
  if (!firstOpen && Math.random() < 0.25) out.push("random_smalltalk");
  out.push(...newCheckinIds());
  save();
  for (const id of out) coachPending.add(id);
  clearTimeout(coachPendingTimer);
  coachPendingTimer = setTimeout(() => flushCoach(), 1200);
}

/** Weekly weigh-in checks: first, up/down/flat, and goal milestones. */
function weighTriggers(newKg, date, prevWeekly) {
  const p = P();
  if (parseYmd(date).getDay() !== (p.weighDay ?? 1)) return [];
  const mem = (p.coachMem ||= {});
  const out = [];
  if (!prevWeekly) {
    if (!mem.firstWeekly) { out.push("weigh_in_first"); mem.firstWeekly = true; }
  } else {
    const diffLb = (newKg - prevWeekly.kg) / LB_KG;
    out.push(Math.abs(diffLb) <= T.flatLb ? "weigh_in_flat" : diffLb < 0 ? "weigh_in_down" : "weigh_in_up");
  }
  const start = p.startWeightKg, goal = p.goalWeightKg;
  const total = Math.abs(goal - start);
  if (total > 0.5) {
    const key = `${start.toFixed(2)}|${goal.toFixed(2)}`; // a new goal resets milestones
    const ms = ((mem.milestones ||= {})[key] ||= {});
    const toward = Math.sign(goal - start);
    const progress = (newKg - start) * toward;
    const frac = progress / total;
    const remainingLb = (total - progress) / LB_KG;
    if (frac >= 1 && !ms.reached) { out.push("weight_goal_reached"); ms.reached = 1; }
    else if (remainingLb > 0 && remainingLb <= T.goalCloseLb && !ms.close) { out.push("weight_goal_close"); ms.close = 1; }
    for (const [f, id] of [[0.75, "weight_75_percent"], [0.5, "weight_halfway"], [0.25, "weight_25_percent"]]) {
      if (frac >= f && !ms[id]) { out.push(id); ms[id] = 1; }
    }
    const fives = Math.floor(progress / LB_KG / T.milestoneLb);
    if (fives > (ms.fives || 0)) { out.push("weight_5lb_milestone"); ms.fives = fives; }
  }
  return out;
}

function openCoachPicker() {
  const p = P();
  const cfg = coachCfg();
  const season = seasonalCoach();
  const card = ([id, c]) => `<button class="coach-card ${cfg.id === id ? "on" : ""}" data-act="coach-pick" data-v="${id}">
      <span class="coach-emo">${c.emoji}</span><b>${esc(c.name)}</b><span>${esc(c.vibe)}</span>${season === id ? `<em>In season!</em>` : ""}</button>`;
  const all = Object.entries(COACHES);
  openSheet(`${sheetTitle("Your coach")}
    <p class="small muted" style="margin-top:0">Your coach pops up with motivation and tips when you open the app and when you log things.</p>
    <div class="coach-grid">${all.filter(([, c]) => !c.season).map(card).join("")}</div>
    <h3 style="margin:16px 2px 8px">Holiday guests</h3>
    <div class="coach-grid">${all.filter(([, c]) => c.season).map(card).join("")}</div>
    <label class="field" style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="coachHol" ${cfg.holidays ? "checked" : ""} style="width:auto"> <span style="font-weight:500">Holiday guests drop in during their season</span></label>
    <div style="font-weight:600;margin:6px 2px 8px">💘 On Valentine's Day, Cupid should know I'm…</div>
    <div class="seg">${[["skip", "Don't ask"], ["partnered", "Partnered"], ["single", "Single"]].map(([k, l]) => `<button class="${(cfg.valentine || "skip") === k ? "on" : ""}" data-act="coach-vday" data-v="${k}">${l}</button>`).join("")}</div>
    <div style="font-weight:600;margin:6px 2px 8px">How chatty?</div>
    <div class="seg">${[["off", "Off"], ["chill", "Chill"], ["normal", "Normal"], ["chatty", "Chatty"]].map(([k, l]) => `<button class="${cfg.freq === k ? "on" : ""}" data-act="coach-freq" data-v="${k}">${l}</button>`).join("")}</div>
    <button class="btn secondary" data-act="coach-preview">🔊 Hear from my coach</button>`, () => render());
  $("#coachHol").addEventListener("change", (e) => { p.coach = { ...coachCfg(), holidays: e.target.checked }; save(); });
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
      lbl = null; openAdd(t.dataset.meal); break;
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
    case "coach-ideas": openIdeas(); break;
    case "coach-open": openCoachPicker(); break;
    case "plan-open": closeSheet(); openPlanner(); break;
    case "plan-reopen": closeSheet(); openPlanner(state.plan ? "plan" : "setup"); break;
    case "plan-view": planUI.view = v; renderPlanner(); break;
    case "plan-week": household().week = v; save(); renderPlanner(); break;
    case "plan-pattern": household().pattern = v; save(); renderPlanner(); break;
    case "plan-person": {
      const h = household();
      h.include = h.include.includes(v) ? h.include.filter((x) => x !== v) : [...h.include, v];
      save(); renderPlanner();
      break;
    }
    case "plan-guest": planUI.addGuest = !planUI.addGuest; renderPlanner(); break;
    case "plan-guest-rm": household().guests = household().guests.filter((g) => g.id !== v); save(); renderPlanner(); break;
    case "plan-copy": copyPlanRequest(); break;
    case "plan-build":
      try { acceptPlan(parsePlanReply($("#planPaste").value)); }
      catch (err) { planUI.error = err.message; renderPlanner(); }
      break;
    case "plan-api": planViaApi(); break;
    case "plan-import": $("#planInput").click(); break;
    case "plan-day": planUI.open = planUI.open === v ? null : v; renderPlanner(); break;
    case "plan-meal": closeSheet(); openPlanMeal(v); break;
    case "plan-log":
      logPlanMeal(v);
      if (!$("#sheet").hidden) { closeSheet(); openPlanMeal(v); } else render();
      break;
    case "plan-rm-meal": {
      if (!confirm("Remove this meal from the plan? Its ingredients come off the grocery list.")) break;
      const [d, id] = v.split("|");
      const day = state.plan.days.find((x) => x.date === d);
      day.meals = day.meals.filter((m) => m.id !== id);
      save(); closeSheet(); openPlanner("plan");
      break;
    }
    case "plan-uncheck": state.plan.checked = {}; save(); renderPlanner(); break;
    case "plan-send": sendPlan(); break;
    case "plan-share-list": shareGroceries(); break;
    case "coach-pick":
      p.coach = { ...coachCfg(), id: v }; save();
      document.querySelectorAll(".coach-card").forEach((b) => b.classList.toggle("on", b === t));
      coachSay(inSeason(v) ? "coach_picked" : "coach_picked_offseason", { force: true });
      break;
    case "coach-vday":
      p.coach = { ...coachCfg(), valentine: v }; save();
      document.querySelectorAll("[data-act=coach-vday]").forEach((b) => b.classList.toggle("on", b === t));
      break;
    case "coach-freq":
      p.coach = { ...coachCfg(), freq: v }; save();
      document.querySelectorAll("[data-act=coach-freq]").forEach((b) => b.classList.toggle("on", b === t));
      break;
    case "coach-preview": coachSay(["random_smalltalk", "food_logged", "protein_hit", "workout_logged", "logging_streak_7", "weigh_in_down"][Math.floor(Math.random() * 6)], { force: true }); break;
    case "example-day": openExampleDay(); break;
    case "meal-pattern": p.mealPattern = v; save(); exDay.claude = null; renderExampleDay(); break;
    case "ex-shuffle": exDay.claude = null; exDay.seed++; renderExampleDay(); break;
    case "ex-claude": runExampleClaude(); break;
    case "edit-diet": openDiet(); break;
    case "diet": {
      p.diet ||= [];
      p.diet = p.diet.includes(v) ? p.diet.filter((x) => x !== v) : [...p.diet, v];
      save(); t.classList.toggle("on");
      break;
    }
    case "close-render": closeSheet(); render(); break;
    case "add-measure": openMeasure(); break;
    case "add-photo": $("#progressPhotoInput").click(); break;
    case "view-photo": viewPhoto(t.dataset.id); break;
    case "del-photo": if (confirm("Delete this photo?")) deletePhoto(t.dataset.id).then(() => { closeSheet(); render(); }); break;
    case "compare-photos": comparePhotos(); break;
    case "toggle-cycle":
      p.cycle ||= { enabled: false, starts: [], periodLen: 5 };
      p.cycle.enabled = !p.cycle.enabled;
      save(); render(); toast(p.cycle.enabled ? "Cycle tracking on — find it on Progress 🔒" : "Cycle tracking off");
      break;
    case "cycle-sheet": openCycle(); break;
    case "cycle-log": {
      const d = $("#cycStart").value || today();
      p.cycle.starts = [...new Set([...(p.cycle.starts || []), d])].sort();
      save(); closeSheet(); toast("Logged 🌸");
      break;
    }
    case "cycle-del": p.cycle.starts = p.cycle.starts.filter((x) => x !== v); save(); closeSheet(); openCycle(); break;
    case "mood": ideas.moods.has(v) ? ideas.moods.delete(v) : ideas.moods.add(v); t.classList.toggle("on"); break;
    case "run-ideas": runIdeas(); break;
    case "idea-meal": ideas.meal = v; renderIdeas(); break;
    case "idea-again": ideas.data = null; renderIdeas(); break;
    case "idea-add": {
      const it = ideas.data.ideas[Number(t.dataset.i)];
      currentDay = today();
      addState = { meal: ideas.meal };
      addEntry({ name: it.name, portion: it.portion, kcal: it.kcal, p: it.p, c: it.c, f: it.f, servings: 1 }, { ai: true });
      addState = null;
      render(); toast(`${it.name} added to ${ideas.meal} ✨`);
      break;
    }
    case "coach-review": openReview(false); break;
    case "review-again": runReview(); break;
    case "pick-meal": addState.meal = v; renderAdd(); break;
    case "add-mode": syncAiEdits(); addState.mode = v; addState.local = false; P().addMode = v; save(); renderAdd(); break;
    case "pick-label": $("#labelInput").click(); break;
    case "lbl-unit": {
      const it = lbl?.items[Number(t.dataset.i)];
      if (!it?.data) break;
      it.amount = fromServings(it.data, toServings(it.data, Number(it.amount) || 0, it.unit), v);
      it.unit = v; renderAdd();
      break;
    }
    case "lbl-fix": { const it = lbl?.items[Number(t.dataset.i)]; if (it) { it.editing = !it.editing; renderAdd(); } break; }
    case "lbl-saved": {
      const f = p.foods.find((x) => x.id === t.dataset.id);
      if (!f) break;
      if (!lbl) lbl = { items: [] };
      if (lbl.items.length >= MAX_LABELS) { toast(`Up to ${MAX_LABELS} foods at a time.`); break; }
      lbl.items.push(savedFoodItem(f)); addState.q = ""; renderAdd();
      setTimeout(() => $(`[data-fk="amt-${lbl.items[lbl.items.length - 1].id}"]`)?.focus(), 60);
      break;
    }
    case "local-to-claude": lbl = null; addState.local = false; addState.mode = "type"; runEstimate(false, { noLocal: true }); break;
    case "lbl-add": addFromLabels(); break;
    case "lbl-rm": lbl?.items.splice(Number(t.dataset.i), 1); renderAdd(); break;
    case "lbl-retry": {
      const it = lbl?.items[Number(t.dataset.i)];
      if (!it?.image) break;
      it.loading = true; it.error = null; renderAdd();
      readOneLabel(it, lbl, true);
      break;
    }
    case "pick-photo": { const d = $("#photoDesc"); if (d && photo) photo.desc = d.value; $("#photoInput").click(); break; }
    case "run-estimate": runEstimate(false); break;
    case "photo-rm": { const d = $("#photoDesc"); if (d && photo) photo.desc = d.value; photo?.images.splice(Number(t.dataset.i), 1); renderAdd(); break; }
    case "refine": runEstimate(true); break;
    case "answer": {
      syncAiEdits();
      const qi = Number(t.dataset.q);
      photo.answers[qi] = photo.answers[qi] === v ? undefined : v;
      renderAdd();
      break;
    }
    case "ai-rm": syncAiEdits(); photo.est.items.splice(Number(t.dataset.i), 1); renderAdd(); break;
    case "ai-amt": { const it = photo?.est?.items[Number(t.dataset.i)]; if (it) { syncAiEdits(); stepAiItem(it, Number(t.dataset.d)); renderAdd(); } break; }
    case "ai-reset": photo = addState?.mode === "type" ? { images: [], est: null, answers: {}, desc: photo?.desc || "" } : null; renderAdd(); break;
    case "ai-add": {
      syncAiEdits();
      const meal = addState.meal;
      photo.est.items.forEach((it) => addEntry({ name: (it.name || "Food").trim(), portion: it.portion, ...scaled(it), servings: 1 }, { ai: true }));
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
      const was = day.water || 0;
      day.water = Math.max(0, was + Number(t.dataset.n));
      save(); render();
      const wg = p.waterGoal || 8;
      if (currentDay === today()) coachFire(crossed(was / wg, day.water / wg, [[T.half, "water_halfway"], [T.close, "water_close"], [1, "water_hit"]]));
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
    case "glow": p.glow = v; save(); render(); break;
    case "checkins-open": openCheckins(); break;
    case "checkin-go": {
      const k = t.dataset.k;
      if (k === "water") {
        currentDay = today();
        const day = ensureDay(), was = day.water || 0, wg = p.waterGoal || 8;
        day.water = was + 1; save(); render(); toast("💧 +1 cup");
        coachFire(crossed(was / wg, day.water / wg, [[T.half, "water_halfway"], [T.close, "water_close"], [1, "water_hit"]]));
      }
      else if (k === "move") { tab = "fitness"; render(); openFitnessAdd(); }
      else if (k === "weigh") openWeightSheet();
      else { lbl = null; openAdd(CHECKS[k].meal || null); }
      break;
    }
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
  coachOnOpen();
}
boot();

// Refresh "today" if the app is left open past midnight.
let lastToday = today();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && P()) coachOnOpen();
  if (document.visibilityState === "visible" && today() !== lastToday) {
    if (currentDay === lastToday) currentDay = today();
    lastToday = today();
    if (P()) render();
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  // When an update installs, reload once so every file is the new version.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register("sw.js").then((r) => r.update()).catch(() => {});
}
