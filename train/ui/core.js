// Shared UI state and helpers. Views import from here; app.js wires events.

import { loadState, saveState, biteProfile } from "../store.js";
import { ymd } from "../domain/schedule.js";

export const ctx = {
  state: null,
  tab: "today",
  planMode: "week",
  planWeekOffset: 0,
  monthOffset: 0,
  libQuery: "",
  libMuscle: "",
  libPattern: "",
  libMine: true,
  progressEx: "",
  rest: null, // { endAt, total, label }
};

export async function initState() { ctx.state = await loadState(); }
export const save = () => saveState(ctx.state);

/** The active person's training record. */
export const me = () => ctx.state.people[ctx.state.activeId] || null;

export const today = () => ymd(new Date());
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let toastT = null;
export function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.hidden = true), ms);
}

let sheetOnClose = null;
export function openSheet(html, onClose) {
  $("#sheetBody").innerHTML = html;
  $("#sheet").hidden = false;
  $("#backdrop").hidden = false;
  $("#sheetBody").scrollTop = 0;
  sheetOnClose = onClose || null;
}
export function closeSheet() {
  $("#sheet").hidden = true;
  $("#backdrop").hidden = true;
  $("#sheetBody").innerHTML = "";
  const cb = sheetOnClose;
  sheetOnClose = null;
  cb?.();
}
export const sheetOpen = () => !$("#sheet").hidden;
export const sheetTitle = (t, closable = true) =>
  `<div class="sheet-title"><h2>${t}</h2>${closable ? `<button class="close-x" data-act="close" aria-label="Close">✕</button>` : ""}</div>`;

/** Match Bite Club's look: linked people use their Bite Club theme. */
export function applyTheme() {
  const p = me();
  const linked = p?.biteId ? biteProfile(p.biteId) : null;
  const accent = linked?.accent || p?.accent || "grape";
  const mode = linked?.mode || p?.mode || "auto";
  const root = document.documentElement;
  root.dataset.accent = accent;
  if (mode === "auto") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

export const fmtDate = (s, opts = { weekday: "short", month: "short", day: "numeric" }) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
};
export const fmtDur = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
export const fmtRest = (sec) => (sec >= 60 ? (sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec / 60} min`) : `${sec} s`);
export const fmtNum = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const EVIDENCE = {
  strong: { label: "Strong evidence", cls: "ev-strong" },
  moderate: { label: "Moderate evidence", cls: "ev-moderate" },
  practice: { label: "Coaching practice", cls: "ev-practice" },
};
export const evBadge = (k) => (EVIDENCE[k] ? `<span class="ev ${EVIDENCE[k].cls}">${EVIDENCE[k].label}</span>` : "");

/** Registered actions: data-act="name" → handler(el, event). */
export const actions = {};
export const on = (map) => Object.assign(actions, map);

let renderFn = () => {};
export const setRender = (fn) => (renderFn = fn);
export const render = () => renderFn();
