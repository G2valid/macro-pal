// Persistence. Training data lives in IndexedDB (plenty of room, separate from
// Bite Club's localStorage quota). Bite Club's data is only ever READ here.

const DB = "trainpal";
const STORE = "kv";
const KEY = "state";
const FALLBACK_KEY = "trainpal.v1";
const BITE_KEY = "macropal.v1";

let dbp = null;
function db() {
  if (!("indexedDB" in self)) return Promise.reject(new Error("no indexedDB"));
  dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

export const emptyState = () => ({ version: 1, activeId: null, people: {} });

export async function loadState() {
  try {
    const d = await db();
    const v = await new Promise((res, rej) => {
      const r = d.transaction(STORE).objectStore(STORE).get(KEY);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (v?.people) return v;
  } catch {}
  try {
    const v = JSON.parse(localStorage.getItem(FALLBACK_KEY));
    if (v?.people) return v;
  } catch {}
  return emptyState();
}

let pending = null, writing = false;
/** Save the whole state. Writes are serialized; the latest state always wins. */
export function saveState(state) {
  pending = JSON.parse(JSON.stringify(state));
  if (!writing) flush();
}
async function flush() {
  writing = true;
  while (pending) {
    const snap = pending; pending = null;
    try {
      const d = await db();
      await new Promise((res, rej) => {
        const tx = d.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(snap, KEY);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });
    } catch {
      try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(snap)); } catch { self.dispatchEvent?.(new CustomEvent("save-failed")); }
    }
  }
  writing = false;
}

/** Ask the browser not to evict our data (iOS clears unused site data). */
export async function requestPersistence() {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

/* ---------------- Bite Club (read-only) ---------------- */
function bite() {
  try { return JSON.parse(localStorage.getItem(BITE_KEY)) || null; } catch { return null; }
}

const ageOf = (p) => (p.birthYear ? new Date().getFullYear() - p.birthYear : p.age || null);
const latestKg = (p) => {
  const w = [...(p.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
  return w.length ? w[w.length - 1].kg : p.startWeightKg || null;
};

/** Bite Club profiles on this device, summarised. */
export function biteProfiles() {
  const s = bite();
  if (!s?.profiles) return [];
  return Object.values(s.profiles).map((p) => ({
    id: p.id, name: p.name, age: ageOf(p), heightCm: p.heightCm || null, weightKg: latestKg(p), sex: p.sex || null,
    accent: p.accent || "ocean", mode: p.mode || "auto", activity: p.activity || null, goalWeightKg: p.goalWeightKg || null,
  }));
}
export const biteProfile = (id) => biteProfiles().find((p) => p.id === id) || null;

const CARDIO_TYPES = new Set(["cycling", "running", "walking", "rowing", "swimming", "hiit", "other"]);

/** Cardio-type workouts logged in Bite Club on a date (e.g. Peloton imports). */
export function biteCardio(id, date) {
  const p = bite()?.profiles?.[id];
  return (p?.days?.[date]?.workouts || []).filter((w) => CARDIO_TYPES.has(w.type)).map((w) => ({
    type: w.type, title: w.title || "", minutes: w.minutes || 0, distance: w.distance || 0, distUnit: w.distUnit || "mi", avgHr: w.avgHr || 0, kcal: w.kcal || 0,
  }));
}

/** Weight entries (kg) from Bite Club, oldest first. */
export function biteWeights(id) {
  const p = bite()?.profiles?.[id];
  return [...(p?.weights || [])].sort((a, b) => a.date.localeCompare(b.date));
}

/** Steps logged in Bite Club for a date. */
export function biteSteps(id, date) {
  return bite()?.profiles?.[id]?.days?.[date]?.activity?.steps || 0;
}

/** The Claude API key saved in Bite Club, so the coach can reuse it later. */
export const biteApiKey = () => bite()?.apiKey || "";
