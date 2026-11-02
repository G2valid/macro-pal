// Coach personalities and their pre-written lines.
// Add or edit lines freely. Placeholders: {name} {streak} {protein_left} {kcal_left}
// {lbs_to_goal} {lbs_lost} {unit}. Lines can also be split by goal:
//   protein_hit: { lose: [...], gain: [...], maintain: [...], any: [...] }
// Trigger IDs are listed in triggers.js; the short event names below are the starter set.
//
// Events:
//   morning / afternoon / evening  greeting when the app opens
//   food        after logging food            protein   protein goal hit
//   over        just went over calories       onTrack   evening, inside the calorie goal
//   missed      afternoon, nothing logged     workout   logged a workout
//   pr          new personal record           week      weekly activity goal reached
//   weighDown   weekly weigh-in went down     weighUp   weekly weigh-in went up
//   streak      logging streak milestone      water     water goal reached
//   tip         random tip

import { WHISKERS } from "./coaches/whiskers.js?v=3";
import { BESTIE } from "./coaches/bestie.js?v=3";
import { DJ } from "./coaches/dj.js?v=2";
import { DRILL } from "./coaches/drill.js?v=2";
import { SURFER } from "./coaches/surfer.js?v=2";
import { RICKY } from "./coaches/ricky.js?v=3";
import { DAD } from "./coaches/dad.js?v=3";
import { TOM, TOM_PHASES, tomPhase } from "./coaches/tom.js?v=3";
import { SANTA, SANTA_PHASES, santaPhase } from "./coaches/santa.js?v=2";
import { CUPID, CUPID_PHASES, VDAY_STATUS, cupidPhase } from "./coaches/cupid.js?v=2";
import { BUNNY, BUNNY_PHASES, bunnyPhase } from "./coaches/bunny.js?v=1";

export const COACHES = {
  bestie: {
    name: "Hype Bestie", emoji: "💅", vibe: "Your aggressively supportive, obnoxiously loud best friend",
    lines: BESTIE,
  },
  dj: {
    name: "DJ Gains", emoji: "🎧", vibe: "A walking music encyclopedia. Expect deep cuts.",
    lines: DJ,
  },
  drill: {
    name: "Drill Sergeant", emoji: "🪖", vibe: "Treats your breakfast like a military operation",
    lines: DRILL,
  },
  surfer: {
    name: "Surfer Dude", emoji: "🏄", vibe: "The most relaxed human alive. Catch the next wave.",
    lines: SURFER,
  },
  cat: {
    name: "Sir Whiskers", emoji: "🐈‍⬛", vibe: "A strict, chonky black cat. He doesn't yell. He looks disappointed.",
    lines: WHISKERS,
  },
  popstar: {
    name: "Ricky Rollerblade", emoji: "🎤", vibe: "A '90s pop heartthrob. Allegedly. Huge in Belgium.",
    lines: RICKY,
  },
  dad: {
    name: "Coach Dad", emoji: "👨", vibe: "Who touched the thermostat? (Secretly the warmest coach.)",
    lines: DAD,
  },
  // Holiday guests (appear during their season; choose them any time)
  turkey: {
    name: "Tom the Turkey", emoji: "🦃", vibe: "Thanksgiving guest. He knows. He's not panicking.", season: "nov",
    lines: TOM,
    // Which phase lines apply today, and how often Tom drops in as a guest.
    phasesFor: (date) => { const p = tomPhase(date); return p === "day" ? ["day", "dayOver"] : p ? [p] : []; },
    phases: TOM_PHASES,
    guestChance: (date) => ({ early: 0.35, mid: 0.4, week: 0.6, eve: 0.85, day: 0.9, after: 0.85, dec1: 0.9 })[tomPhase(date)] ?? 0.35,
    inSeason: (date) => date.getMonth() === 10 || (date.getMonth() === 11 && date.getDate() === 1),
  },
  santa: {
    name: "Santa Claus", emoji: "🎅", vibe: "Christmas guest. Elite logistics, professional cookie eater.", season: "dec",
    lines: SANTA,
    phasesFor: (date) => { const p = santaPhase(date); return ["eveMorning", "eveNight", "christmas"].includes(p) ? [p, "holidayFood"] : p ? [p] : []; },
    phases: SANTA_PHASES,
    guestChance: (date) => ({ early: 0.35, busy: 0.45, dec23: 0.6, eveMorning: 0.85, eveNight: 0.85, christmas: 0.85 })[santaPhase(date)] ?? 0.35,
    inSeason: (date) => date.getMonth() === 11 && date.getDate() <= 26,
  },
  bunny: {
    name: "Easter Bunny", emoji: "🐰", vibe: "Easter guest. Call him Bunny. Elite cardio, absurd legs, no control around mini eggs.", season: "easter",
    lines: BUNNY,
    phasesFor: (date) => { const p = bunnyPhase(date); return ["eve", "easter"].includes(p) ? [p, "easterFood"] : p ? [p] : []; },
    phases: BUNNY_PHASES,
    guestChance: (date) => ({ early: 0.3, twoWeeks: 0.4, week: 0.6, goodFriday: 0.8, eve: 0.85, easter: 0.9, after: 0.85 })[bunnyPhase(date)] ?? 0.3,
    inSeason: (date) => bunnyPhase(date) !== null,
  },

  spooky: {
    name: "Count Crunchula", emoji: "🧛", vibe: "Halloween guest", season: "oct",
    lines: {
      morning: ["Good evening... er, morning, {name}. I vant to see your breakfast. 🦇", "Rise from your coffin! It's a new day!"],
      afternoon: ["Afternoon... the sun is dreadful, but your progress is not.", "Bwahaha, keep going, mortal!"],
      evening: ["Ahh, nightfall. My favorite. Rest well. 🌙", "Goodnight, mortal. Beware of midnight snacks."],
      food: ["Logged! Delightfully spooky. 🎃", "Tracked! I vant to log your macros. Done."],
      protein: ["Protein goal! You're stronger than a werewolf! 🐺", "Bwahaha! Protein hit!"],
      over: ["Too much candy? A Halloween classic. Tomorrow we rise again!", "Fear not! Fresh start tomorrow."],
      onTrack: ["On target! Frighteningly good!", "Calories in check. Spooktacular!"],
      missed: ["Your log is as empty as a haunted house! Log something!", "Boo! Nothing logged yet!"],
      workout: ["Workout done! You ran like a zombie was chasing you!", "Great workout! Monster mash approved."],
      pr: ["NEW PR! Spooktacular! 🏆🎃", "Personal record! Even the ghosts are clapping."],
      week: ["Weekly goal done! Fang-tastic!", "Whole week! Bwahaha, glorious!"],
      weighDown: ["Scale's down! Boo-yah! 👻", "Down this week! Fang-tastic!"],
      weighUp: ["Scale's up? Candy corn's fault. Not yours.", "A little bump. Don't be scared, it's water."],
      streak: ["{streak}-day streak! Frightfully consistent!", "{streak} days! I'm batty about it."],
      water: ["Water goal hit! I'll stick to... tomato juice. 🍅", "All your water! Hydrated and haunting."],
      tip: ["Candy tip: pick your favorite, enjoy a few, skip the ones you don't love.", "Pumpkin is low-cal and high fiber. Very on brand.", "Pumpkin seeds = spooky-good protein snack."],
    },
  },

  cupid: {
    name: "Cupid", emoji: "💘", vibe: "Valentine's guest. Ancient matchmaker, deeply tired of humans.", season: "feb",
    lines: CUPID,
    phasesFor: (date) => { const p = cupidPhase(date); return p?.startsWith("vday") ? [p, "vdayFood"] : p ? [p] : []; },
    phases: CUPID_PHASES,
    statusLines: VDAY_STATUS,
    guestChance: (date) => ({ early: 0.35, busy: 0.45, eve: 0.7, vdayMorning: 0.85, vdayEvening: 0.85, after: 0.8 })[cupidPhase(date)] ?? 0.35,
    inSeason: (date) => date.getMonth() === 1 && date.getDate() <= 15,
  },
};

export const DEFAULT_COACH = "bestie";

/** Which holiday coach is in season on a date, if any. */
export function seasonalCoach(date = new Date()) {
  const m = date.getMonth() + 1, d = date.getDate();
  if (m === 12 && d === 1) return "turkey"; // Tom's farewell
  if (m === 10) return "spooky";
  if (m === 11) return "turkey";
  if (m === 12 && d <= 26) return "santa";
  if (m === 2 && d <= 15) return "cupid";
  if (bunnyPhase(date)) return "bunny"; // 4 weeks before Easter through the day after
  return null;
}

/**
 * Pick a line for a trigger, filling in placeholders.
 * A coach's lines[trigger] can be a list, or { lose, gain, maintain, any, rare, ultra } lists.
 * rare lines show about 1 in 10 times and ultra about 1 in 50 (override with rareChance / ultraChance).
 * Tries each id in `chain` (the trigger, then its fallbacks) for the coach, then for the default coach.
 */
export function coachLine(coachId, chain, { goal = "any", vars = {} } = {}) {
  const ids = Array.isArray(chain) ? chain : [chain];
  const pickFrom = (entry) => {
    if (!entry) return null;
    if (Array.isArray(entry)) return entry.length ? entry : null;
    const roll = Math.random();
    if (entry.ultra?.length && roll < (entry.ultraChance ?? 0.02)) return entry.ultra;
    if (entry.rare?.length && roll < (entry.ultraChance ?? 0.02) + (entry.rareChance ?? 0.1)) return entry.rare;
    return [entry[goal], entry.any].find((l) => l?.length) || null;
  };
  const tryCoach = (c) => { if (!c) return null; for (const id of ids) { const l = pickFrom(c.lines[id]); if (l) return l; } return null; };
  const list = tryCoach(COACHES[coachId]) || tryCoach(COACHES[DEFAULT_COACH]);
  if (!list) return null;
  const line = list[Math.floor(Math.random() * list.length)];
  return line.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

/** How often a holiday guest replaces the chosen coach today (default about 1 in 3). */
export function guestChance(coachId, date = new Date()) {
  return COACHES[coachId]?.guestChance?.(date) ?? 0.35;
}

/** Date-specific lines (e.g. Tom's Thanksgiving countdown) that take over a trigger today, if any. */
export function phaseLine(coachId, trigger, date = new Date(), { status } = {}) {
  const c = COACHES[coachId];
  if (!c?.phasesFor) return null;
  for (const key of c.phasesFor(date)) {
    const ph = c.phases[key];
    if (ph && ph.triggers.includes(trigger) && Math.random() < ph.chance) {
      const lines = [...ph.lines, ...((ph.status && c.statusLines?.[status]) || [])];
      return lines[Math.floor(Math.random() * lines.length)];
    }
  }
  return null;
}

/** Is this holiday coach in season (used for the "picked me in July?" line)? */
export function inSeason(coachId, date = new Date()) {
  const c = COACHES[coachId];
  return c?.inSeason ? c.inSeason(date) : true;
}
