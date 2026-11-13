// Onboarding: an adaptive questionnaire that ends with a generated program
// the person reviews before anything is saved.

import { ctx, me, save, render, toast, esc, uid, today, $, on, applyTheme, evBadge } from "./core.js";
import { biteProfiles, biteProfile } from "../store.js";
import { EXPERIENCE, GOALS, MUSCLES, TRACKED_MUSCLES, EQUIPMENT, GYM_EQUIPMENT, JOINTS } from "../domain/vocab.js";
import { CARDIO_ABILITY, STYLE_NOTES, CARDIO_TARGET_NOTE } from "../domain/prescribe.js";
import { generateProgram, SPLITS } from "../domain/generate.js";
import { buildCalendar, addDays, dowOf } from "../domain/schedule.js";
import { EX } from "../domain/exercises.js";
import { DEFAULT_LOADS } from "../domain/loads.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const CARDIO_MODES = {
  walking: "🚶 Walking", treadmill: "⛰️ Incline treadmill", running: "🏃 Running", cycling: "🚴 Cycling / Peloton",
  elliptical: "〰️ Elliptical", rowing: "🚣 Rowing", stairs: "🪜 Stair climber", swimming: "🏊 Swimming",
};
const SCREEN = {
  heart: "Has a doctor diagnosed a heart, lung, kidney or metabolic condition (including diabetes)?",
  symptoms: "Do you get chest pain, unusual breathlessness, dizziness or fainting with activity — or at rest?",
  pregnant: "Are you pregnant, or have you given birth in the last 12 months?",
  injury: "Are you recovering from a recent injury or surgery?",
  doctor: "Has a doctor told you to limit or avoid exercise?",
};
const HOME_DEFAULT = ["dumbbells", "bench", "bands"];

export let ob = null;

/** Start onboarding, optionally editing an existing person's answers. */
export function startOnboarding(editId = null, { biteId = null } = {}) {
  const p = editId ? ctx.state.people[editId] : null;
  const pr = p?.profile;
  ob = {
    step: 0, editing: editId,
    biteId: p?.biteId ?? null, name: p?.name || "", age: p?.age || "", heightFt: "", heightIn: "", weightLb: "",
    screen: pr?.screen || {}, experience: pr?.experience || "", offFor: pr?.offFor || "",
    primary: pr?.primary || "", secondary: pr?.secondary || [], priority: pr?.priority || [],
    days: pr?.days || [1, 3, 5], minutes: pr?.minutes || 60,
    location: pr?.location || "gym", equipment: pr?.equipment || [...GYM_EQUIPMENT],
    dumbbellList: p?.loads?.dumbbells?.join(", ") || "",
    limits: pr?.limits || {}, cardioAbility: pr?.cardioAbility || "", cardioModes: pr?.cardioModes || [],
    weeks: p?.program?.weeks || 6, startDate: nextStart(),
    program: null,
  };
  if (!editId && biteId) { ob.biteId = biteId; ob.name = biteProfile(biteId)?.name || ""; }
  ob.first = editId || biteId ? 1 : 0; // skip "who" when we already know
  ob.step = ob.first;
  ctx.tab = "onboard";
  render();
}

function nextStart() {
  const t = today();
  return t; // start today; the calendar only includes planned weekdays
}

const STEPS = ["who", "safety", "experience", "goals", "priority", "schedule", "equipment", "limits", "cardio", "review"];

function stepValid(k) {
  switch (k) {
    case "who": return !!(ob.biteId || (ob.name.trim() && Number(ob.age) >= 13));
    case "experience": return !!ob.experience && (ob.experience !== "returning" || !!ob.offFor);
    case "goals": return !!ob.primary;
    case "schedule": return ob.days.length >= 1;
    case "cardio": return !!ob.cardioAbility;
    default: return true;
  }
}

const optBtn = (act, v, on, title, hint = "", extra = "") =>
  `<button type="button" class="opt ${on ? "on" : ""}" data-ta="${act}" data-v="${v}" ${extra}><b>${title}</b>${hint ? `<span>${hint}</span>` : ""}</button>`;
const chip = (act, v, on, label) => `<button type="button" class="chip ${on ? "on" : ""}" data-ta="${act}" data-v="${v}">${label}</button>`;

function whoStep() {
  const used = new Set(Object.values(ctx.state.people).map((p) => p.biteId).filter(Boolean));
  const bites = biteProfiles().filter((b) => !used.has(b.id));
  return `<h2>Who's training?</h2>
    ${bites.length ? `<p class="muted">Pick your Bite Club profile — your age, height and weight come across automatically, so you won't type them twice.</p>
      <div class="opts">${bites.map((b) => optBtn("ob-bite", b.id, ob.biteId === b.id, esc(b.name), [b.age && `${b.age} yrs`, b.heightCm && `${Math.floor(b.heightCm / 2.54 / 12)}′${Math.round(b.heightCm / 2.54 % 12)}″`].filter(Boolean).join(" · "))).join("")}
      ${optBtn("ob-bite", "", !!ob.manual, "Someone else", "Not in Bite Club on this device")}</div>` : ""}
    ${!bites.length || (ob.biteId === null && ob.manual) ? `<div class="card" style="margin-top:12px">
      <label class="field"><span>Name</span><input data-ob="name" value="${esc(ob.name)}" maxlength="30" autocomplete="off"></label>
      <div class="row2"><label class="field"><span>Age</span><input data-ob="age" type="number" inputmode="numeric" value="${esc(ob.age)}"></label>
      <label class="field"><span>Weight (lb, optional)</span><input data-ob="weightLb" type="number" inputmode="decimal" value="${esc(ob.weightLb)}"></label></div>
      <p class="hint">Training plans don't depend on your weight. It's only used for progress charts.</p></div>` : ""}`;
}

function safetyStep() {
  const any = Object.values(ob.screen).some(Boolean);
  return `<h2>Quick safety check</h2>
    <p class="muted">Based on the ACSM's pre-exercise screening. Answering yes doesn't stop you training — it changes how we start.</p>
    <div class="list">${Object.entries(SCREEN).map(([k, q]) => `<label class="toggle-row"><span>${q}</span><input type="checkbox" data-ob-screen="${k}" ${ob.screen[k] ? "checked" : ""}></label>`).join("")}</div>
    ${any ? `<div class="note warn" style="margin-top:12px"><b>Please check in with your doctor</b> before starting anything vigorous, and mention the kind of training you plan to do. Your plan will start conservatively — every set stops well short of failure, cardio stays at an easy, conversational pace — and you can adjust it once you've been cleared. This app can't give medical advice.</div>` : ""}`;
}

function experienceStep() {
  return `<h2>Your lifting experience</h2>
    <p class="muted">This decides exercise choice, how many days to lift and how fast weights go up.</p>
    <div class="opts">${Object.entries(EXPERIENCE).map(([k, v]) => optBtn("ob-exp", k, ob.experience === k, v.label, v.hint)).join("")}</div>
    ${ob.experience === "returning" ? `<h3 style="margin-top:16px">How long have you been off?</h3>
      <div class="chips" style="margin-top:8px">${[["3-6m", "3–6 months"], ["6-12m", "6–12 months"], ["1y+", "Over a year"]].map(([v, l]) => chip("ob-off", v, ob.offFor === v, l)).join("")}</div>
      <p class="hint" style="margin-top:8px">Strength and muscle tend to come back faster than they were first built ("muscle memory"), so you'll progress quickly — the first two weeks are deliberately easy to let joints and tendons catch up.</p>` : ""}
    ${ob.experience === "new" ? `<div class="note" style="margin-top:12px">Great place to start. You'll get simple, stable exercises and the first two weeks are a gentle ramp-up while you learn the movements. Beginners make the fastest progress of anyone.</div>` : ""}`;
}

function goalsStep() {
  return `<h2>What's your main goal?</h2>
    <div class="opts">${Object.entries(GOALS).map(([k, g]) => optBtn("ob-primary", k, ob.primary === k, `${g.emo} ${g.label}`)).join("")}</div>
    ${ob.primary ? `<h3 style="margin-top:16px">Anything else? <span class="muted small">(up to 2)</span></h3>
    <div class="chips" style="margin-top:8px">${Object.entries(GOALS).filter(([k]) => k !== ob.primary).map(([k, g]) => chip("ob-secondary", k, ob.secondary.includes(k), `${g.emo} ${g.label}`)).join("")}</div>` : ""}
    ${ob.primary === "definition" ? `<div class="note" style="margin-top:12px">Looking "toned" or defined comes from having muscle and lower body fat. So this plan builds muscle with normal, challenging weights while Bite Club handles the calorie side. There's no special "toning" rep range — that's a myth.</div>` : ""}
    ${ob.primary === "fat_loss" || ob.primary === "recomp" ? `<div class="note" style="margin-top:12px">Fat loss comes mainly from your calorie deficit (that's what your food targets are for). Lifting with real effort is what keeps muscle while you lose — so this plan trains for muscle, plus cardio for health and extra burn. Spot-reducing fat from one area isn't possible.</div>` : ""}`;
}

function priorityStep() {
  const beginner = ob.experience === "new";
  return `<h2>Any muscles to prioritise?</h2>
    <p class="muted">${beginner ? "Optional. As a beginner everything will grow, so priorities matter less right now — but you can still pick up to 3." : "Optional, up to 3. They'll get extra sets each week."}</p>
    <div class="chips">${TRACKED_MUSCLES.map((m) => chip("ob-prio", m, ob.priority.includes(m), MUSCLES[m])).join("")}</div>`;
}

function scheduleStep() {
  return `<h2>When can you train?</h2>
    <p class="muted">Tap every day you could work out. The plan decides which are lifting, cardio or rest.</p>
    <div class="day-pick">${DAYS.map((d, i) => `<button type="button" class="${ob.days.includes(i) ? "on" : ""}" data-ta="ob-day" data-v="${i}">${d}</button>`).join("")}</div>
    <h3 style="margin-top:18px">How long per workout?</h3>
    <div class="seg" style="margin-top:8px">${[30, 45, 60, 75, 90].map((m) => `<button type="button" class="${ob.minutes === m ? "on" : ""}" data-ta="ob-min" data-v="${m}">${m} min</button>`).join("")}</div>
    <p class="hint">Including warm-up. Sessions are trimmed to fit, cutting the least important work first.</p>`;
}

function equipmentStep() {
  return `<h2>Where do you train?</h2>
    <div class="seg">${[["gym", "Gym"], ["home", "Home"], ["both", "Both"]].map(([v, l]) => `<button type="button" class="${ob.location === v ? "on" : ""}" data-ta="ob-loc" data-v="${v}">${l}</button>`).join("")}</div>
    <p class="muted">${ob.location === "gym" ? "Untick anything your gym doesn't have." : ob.location === "home" ? "Tick what you have. Bodyweight exercises are always included." : "Tick what you can use on a typical training day."}</p>
    <div class="list">${Object.entries(EQUIPMENT).map(([k, l]) => `<label class="toggle-row"><span>${l}</span><input type="checkbox" data-ob-eq="${k}" ${ob.equipment.includes(k) ? "checked" : ""}></label>`).join("")}</div>
    ${ob.equipment.includes("dumbbells") && ob.location !== "gym" ? `<label class="field" style="margin-top:12px"><span>Which dumbbells do you have? (lb)</span>
      <input data-ob="dumbbellList" placeholder="e.g. 10, 15, 25, 35 — leave blank for a full set" value="${esc(ob.dumbbellList)}" inputmode="decimal"></label>
      <p class="hint">Weight suggestions will only use these, so the next step up is always one you own.</p>` : ""}`;
}

function limitsStep() {
  return `<h2>Anything to work around?</h2>
    <p class="muted">Tap any area that's sensitive or injured. This steers exercise choice — it isn't a diagnosis, and anything persistent is worth getting checked.</p>
    <div class="chips">${Object.entries(JOINTS).map(([k, l]) => chip("ob-joint", k, !!ob.limits[k], l)).join("")}</div>
    ${Object.keys(ob.limits).length ? `<div class="card" style="margin-top:12px">${Object.keys(ob.limits).map((j) => `<div class="limit-row"><b>${JOINTS[j]}</b>
      <div class="seg" style="margin:6px 0 0">${[["careful", "Go easy"], ["avoid", "Avoid loading"]].map(([v, l]) => `<button type="button" class="${ob.limits[j] === v ? "on" : ""}" data-ta="ob-limit" data-j="${j}" data-v="${v}">${l}</button>`).join("")}</div></div>`).join("")}
      <p class="hint" style="margin-top:10px"><b>Go easy</b> prefers exercises that load it less. <b>Avoid</b> leaves out exercises that load it meaningfully.</p></div>` : ""}
    <div class="note" style="margin-top:12px">During workouts: muscle burn and next-day soreness are normal. Sharp, pinching or joint pain isn't — stop that exercise and use the 🩹 button so the app won't push the weight up.</div>`;
}

function cardioStep() {
  const joints = ob.limits.knee || ob.limits.hip;
  return `<h2>Cardio</h2>
    <h3>Where are you now?</h3>
    <div class="opts" style="margin-top:8px">${Object.entries(CARDIO_ABILITY).map(([k, v]) => optBtn("ob-cardio", k, ob.cardioAbility === k, v.label)).join("")}</div>
    <h3 style="margin-top:16px">What do you enjoy?</h3>
    <div class="chips" style="margin-top:8px">${Object.entries(CARDIO_MODES).map(([k, l]) => chip("ob-cmode", k, ob.cardioModes.includes(k), l)).join("")}</div>
    ${joints ? `<p class="hint" style="margin-top:8px">With your ${ob.limits.knee ? "knees" : "hips"} in mind, cycling, walking, elliptical and rowing are easier on the joints than running.</p>` : ""}
    <div class="note" style="margin-top:12px">${CARDIO_TARGET_NOTE.text} ${evBadge("strong")}<br><br>Everything in your Fitness log counts — including Peloton and other screenshot imports.</div>`;
}

function profileFromOb() {
  const bite = ob.biteId ? biteProfile(ob.biteId) : null;
  return {
    experience: ob.experience, offFor: ob.offFor, primary: ob.primary, secondary: ob.secondary, priority: ob.priority,
    days: [...ob.days].sort(), minutes: ob.minutes, location: ob.location, equipment: ob.equipment, limits: ob.limits,
    cardioAbility: ob.cardioAbility, cardioModes: ob.cardioModes, screen: ob.screen,
    conservative: Object.values(ob.screen).some(Boolean),
    age: bite?.age || Number(ob.age) || null,
    disliked: ctx.state.people[ob.editing]?.profile?.disliked || [],
    liked: ctx.state.people[ob.editing]?.profile?.liked || [],
  };
}

function reviewStep() {
  const profile = profileFromOb();
  const program = generateProgram(profile, { weeks: ob.weeks });
  ob.program = program;
  const ev = STYLE_NOTES[program.style];
  const byDow = Object.fromEntries(program.weekPlan.map((p) => [p.dow, p]));
  return `<h2>Your plan</h2>
    <div class="card">
      <div class="card-head"><h2>${SPLITS[program.split].label}</h2><span class="meta">${program.templates.length} lifting day${program.templates.length > 1 ? "s" : ""}</span></div>
      <div class="weekrow">${DAYS.map((d, i) => { const p = byDow[i]; const t = p?.kind === "lift" ? program.templates.find((x) => x.id === p.templateId) : null;
        return `<div class="wd ${p ? p.kind : "rest"}"><span>${d}</span><b>${t ? esc(t.name.replace("Full Body", "Full")) : p ? "Cardio" : "Rest"}</b></div>`; }).join("")}</div>
      <ul class="reasons">${program.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      <p class="small"><b>Training style:</b> ${ev.text} ${evBadge(ev.evidence)}</p>
      ${program.warnings.length ? `<div class="note warn">${program.warnings.map(esc).join("<br>")}</div>` : ""}
    </div>
    ${program.templates.map((t) => `<div class="card">
      <div class="card-head"><h2>${esc(t.name)}</h2><span class="meta">~${t.estMinutes} min</span></div>
      ${t.slots.map((s) => `<div class="mini-ex"><span>${esc(EX[s.exerciseId].name)}</span><span class="muted num">${s.sets} × ${s.repLow === s.repHigh ? s.repLow : `${s.repLow}–${s.repHigh}`}${s.unit === "sec" ? " s" : ""}</span></div>`).join("")}
    </div>`).join("")}
    <div class="card">
      <div class="card-head"><h2>Cardio</h2><span class="meta">${program.cardio.startMinutes} → ${program.cardio.targetMinutes} min/week</span></div>
      <p class="small">Starts where you are and builds about 10% a week ${evBadge("practice")}. ${program.cardio.finishers ? "With no spare days, it's done as a short easy session after lifting." : ""}</p>
    </div>
    <div class="card">
      <label class="field"><span>Block length</span>
      <div class="seg" style="margin:0">${[4, 6, 8, 12].map((w) => `<button type="button" class="${ob.weeks === w ? "on" : ""}" data-ta="ob-weeks" data-v="${w}">${w} weeks</button>`).join("")}</div></label>
      <p class="hint">At the end of a block you'll review progress and the plan is refreshed. Every exercise can be swapped or edited in the Plan tab.</p>
      <label class="field"><span>Start date</span><input type="date" data-ob="startDate" value="${ob.startDate}"></label>
    </div>`;
}

const RENDER = { who: whoStep, safety: safetyStep, experience: experienceStep, goals: goalsStep, priority: priorityStep, schedule: scheduleStep, equipment: equipmentStep, limits: limitsStep, cardio: cardioStep, review: reviewStep };

export function renderOnboarding(el) {
  const k = STEPS[ob.step];
  const first = ob.first;
  el.innerHTML = `<div class="ob">
    <div class="ob-top">${ob.step > first ? `<button class="icon-btn" data-ta="ob-back" aria-label="Back">‹</button>` : `<span></span>`}
      <div class="dots">${STEPS.slice(first).map((_, i) => `<i class="${i + first <= ob.step ? "on" : ""}"></i>`).join("")}</div>
      ${ctx.host || Object.keys(ctx.state.people).length ? `<button class="icon-btn" data-ta="ob-cancel" aria-label="Cancel">✕</button>` : "<span></span>"}</div>
    <div class="ob-body">${RENDER[k]()}</div>
    <div class="ob-foot"><button class="btn" data-ta="${k === "review" ? "ob-finish" : "ob-next"}" ${stepValid(k) ? "" : "disabled"}>${k === "review" ? (ob.editing ? "Save new plan" : "Start my plan") : "Continue"}</button>
    ${k === "review" && ob.editing ? `<p class="hint" style="text-align:center;margin-top:8px">Your workout history is kept. Upcoming sessions are replaced.</p>` : ""}</div>
  </div>`;
}

const rerender = () => { const sy = $(".ob-body")?.scrollTop; render(); if (sy) $(".ob-body").scrollTop = sy; };
const toggle = (arr, v, max = 99) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.length < max ? [...arr, v] : arr);

on({
  "ob-bite": (el) => {
    if (el.dataset.v) { ob.biteId = el.dataset.v; ob.manual = false; ob.name = biteProfile(el.dataset.v)?.name || ""; }
    else { ob.biteId = null; ob.manual = true; ob.name = ""; }
    rerender();
  },
  "ob-exp": (el) => { ob.experience = el.dataset.v; rerender(); },
  "ob-off": (el) => { ob.offFor = el.dataset.v; rerender(); },
  "ob-primary": (el) => { ob.primary = el.dataset.v; ob.secondary = ob.secondary.filter((g) => g !== ob.primary); rerender(); },
  "ob-secondary": (el) => { ob.secondary = toggle(ob.secondary, el.dataset.v, 2); rerender(); },
  "ob-prio": (el) => { ob.priority = toggle(ob.priority, el.dataset.v, 3); rerender(); },
  "ob-day": (el) => { ob.days = toggle(ob.days, Number(el.dataset.v)); rerender(); },
  "ob-min": (el) => { ob.minutes = Number(el.dataset.v); rerender(); },
  "ob-loc": (el) => {
    ob.location = el.dataset.v;
    ob.equipment = ob.location === "gym" ? [...GYM_EQUIPMENT] : ob.location === "home" ? [...HOME_DEFAULT] : [...GYM_EQUIPMENT];
    rerender();
  },
  "ob-joint": (el) => { const j = el.dataset.v; if (ob.limits[j]) delete ob.limits[j]; else ob.limits[j] = "careful"; rerender(); },
  "ob-limit": (el) => { ob.limits[el.dataset.j] = el.dataset.v; rerender(); },
  "ob-cardio": (el) => { ob.cardioAbility = el.dataset.v; rerender(); },
  "ob-cmode": (el) => { ob.cardioModes = toggle(ob.cardioModes, el.dataset.v); rerender(); },
  "ob-weeks": (el) => { ob.weeks = Number(el.dataset.v); rerender(); },
  "ob-next": () => { if (stepValid(STEPS[ob.step])) { ob.step++; render(); $(".ob-body") && ($(".ob-body").scrollTop = 0); window.scrollTo(0, 0); } },
  "ob-back": () => { ob.step = Math.max(0, ob.step - 1); render(); },
  "ob-cancel": () => { ob = null; ctx.tab = "today"; render(); },
  "ob-finish": finish,
});

/** Inputs inside onboarding update the draft without re-rendering (keeps focus). */
export function onboardInput(e) {
  const t = e.target;
  if (t.dataset.ob) {
    ob[t.dataset.ob] = t.value;
    if (t.dataset.ob === "name" || t.dataset.ob === "age") { const b = $(".ob-foot .btn"); if (b) b.disabled = !stepValid(STEPS[ob.step]); }
    return true;
  }
  if (t.dataset.obScreen) { ob.screen[t.dataset.obScreen] = t.checked; rerender(); return true; }
  if (t.dataset.obEq) { ob.equipment = t.checked ? [...new Set([...ob.equipment, t.dataset.obEq])] : ob.equipment.filter((q) => q !== t.dataset.obEq); rerender(); return true; }
  return false;
}

/**
 * Replace a person's plan from `start` on. Workout history, records and
 * sessions already completed are kept; upcoming sessions are rebuilt.
 */
export function rebuildPlan(p, profile, program, start = today(), dumbbells = undefined) {
  program.startDate = start;
  const doneKept = (p.sessions || []).filter((s) => s.status === "done" && s.date <= start);
  const block = p.blocks?.length || 0;
  const fresh = buildCalendar(program, start)
    .filter((s) => !doneKept.some((d) => d.date === s.date && d.kind === s.kind))
    .map((s) => ({ ...s, name: s.kind === "lift" ? program.templates.find((t) => t.id === s.templateId)?.name : "Cardio" }));
  // Older blocks' sessions get unique ids so they don't collide with new ones.
  p.sessions = [...doneKept.map((s) => ({ ...s, id: s.id.startsWith("old-") ? s.id : `old-${block}-${s.id}` })), ...fresh];
  (p.blocks ||= []).push({ startDate: p.program?.startDate, split: p.program?.split, weeks: p.program?.weeks, endedOn: today() });
  p.profile = profile;
  p.program = program;
  if (dumbbells !== undefined) p.loads = { ...p.loads, dumbbells };
}

function finish() {
  const profile = profileFromOb();
  const program = ob.program || generateProgram(profile, { weeks: ob.weeks });
  const start = ob.startDate || today();
  program.startDate = start;
  const named = (sessions) => sessions.map((s) => ({ ...s, name: s.kind === "lift" ? program.templates.find((t) => t.id === s.templateId)?.name : "Cardio" }));
  const dumbbells = ob.dumbbellList.split(/[,\s]+/).map(Number).filter((n) => n > 0);
  const loads = { ...DEFAULT_LOADS, dumbbells: dumbbells.length ? [...new Set(dumbbells)].sort((a, b) => a - b) : null };

  if (ob.editing) {
    rebuildPlan(ctx.state.people[ob.editing], profile, program, start, loads.dumbbells);
    toast("New plan saved 💪");
  } else {
    const bite = ob.biteId ? biteProfile(ob.biteId) : null;
    const id = ob.biteId || uid();
    ctx.state.people[id] = {
      id, biteId: ob.biteId || null, name: bite?.name || ob.name.trim(), age: profile.age,
      weightLb: !bite && Number(ob.weightLb) ? Number(ob.weightLb) : null,
      accent: "grape", mode: "auto",
      profile, program, loads, sessions: named(buildCalendar(program, start)),
      logs: [], cardioLogs: [], active: null, blocks: [], createdAt: Date.now(),
    };
    ctx.state.activeId = id;
    toast("Your plan is ready 💪");
  }
  save();
  ob = null;
  ctx.tab = "today";
  applyTheme();
  render();
}
