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

import { WHISKERS } from "./coaches/whiskers.js?v=1";
import { BESTIE } from "./coaches/bestie.js?v=1";
import { DJ } from "./coaches/dj.js?v=1";
import { DRILL } from "./coaches/drill.js?v=1";
import { SURFER } from "./coaches/surfer.js?v=1";
import { RICKY } from "./coaches/ricky.js?v=1";
import { DAD } from "./coaches/dad.js?v=1";

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
    name: "Tom the Turkey", emoji: "🦃", vibe: "Thanksgiving guest", season: "nov",
    lines: {
      morning: ["Gobble gobble, {name}! Grateful you're here today.", "Morning! I'm thankful for you. Also nervous about Thursday."],
      afternoon: ["Afternoon! Have you considered... eating more chicken instead of turkey? Asking for me.", "Gobble check-in! How's the day?"],
      evening: ["Evening, friend. Grateful for your hard work today. 🍂", "Gobble goodnight!"],
      food: ["Logged! Gobble-approved. 🦃", "Nice log! Just... maybe skip the turkey? Kidding. Mostly."],
      protein: ["Protein goal hit! Please tell me it wasn't turkey. 😬", "Protein done! Gobble gobble, champion!"],
      over: ["Over a bit? It's the season of feasting. Back on track tomorrow!", "Even pilgrims had seconds. Fresh start tomorrow."],
      onTrack: ["On target! That's something to be thankful for. 🍁", "Calories on point. Pass the gratitude."],
      missed: ["Nothing logged yet? Gobble up a snack and track it!", "The log's emptier than a plate after dinner. Log something!"],
      workout: ["Workout done! Way to burn off the stuffing in advance!", "Great workout! I'd join, but I'm saving my legs. (Drumsticks.)"],
      pr: ["New PR! Thankful for gains! 🏆", "Personal record! Gobble-iciously good!"],
      week: ["Weekly goal crushed. I'm thankful for YOU.", "Full week done! Pie-sized pride."],
      weighDown: ["Scale's down! Before the feast, even! 🦃", "Down this week! Gobble yeah!"],
      weighUp: ["Little holiday bump. Totally normal. Gratitude over guilt.", "Scale's up? It's the gravy. It'll pass."],
      streak: ["{streak}-day streak! Grateful for consistency!", "{streak} days! Gobble gobble, legend."],
      water: ["Water goal hit! Better than gravy. Hydrating.", "All your water! Thankful for hydration."],
      tip: ["Feast tip: fill half the plate with veggies, then enjoy the good stuff.", "Take a walk after the big meal. It's tradition (now).", "Pie is fine. One slice, savor it, zero guilt."],
    },
  },

  santa: {
    name: "Santa Claus", emoji: "🎅", vibe: "Christmas guest", season: "dec",
    lines: {
      morning: ["Ho ho ho, {name}! You're on the NICE list for logging!", "Good morning! The elves are proud of your progress."],
      afternoon: ["Ho ho, afternoon check-in! Making a list, checking your macros twice.", "The reindeer and I say: keep going!"],
      evening: ["Evening, {name}. Rest up like it's the night before Christmas. 🌙", "Ho ho ho, goodnight!"],
      food: ["Logged! Another entry on the nice list. 🎁", "Ho ho, tracked! The elves are taking notes."],
      protein: ["Protein goal! You're stronger than Rudolph! 🦌", "Ho ho HO! Protein hit!"],
      over: ["A few too many cookies? I know the feeling. Tomorrow's a new day! 🍪", "Still on the nice list. Promise."],
      onTrack: ["On target all day! Nicer than nice!", "Calories wrapped up perfectly. 🎀"],
      missed: ["Haven't logged? Even Santa writes things down! Log a snack.", "My list is longer than your log today! Add something!"],
      workout: ["Workout done! You'd make a great reindeer!", "Great workout! Climbing chimneys is my cardio."],
      pr: ["NEW PR! That's the best present yet! 🎁", "Ho ho ho! Personal record!"],
      week: ["Weekly goal done! Early present: pride!", "A whole week! Merry and mighty!"],
      weighDown: ["Scale's down! Lighter than my sleigh after deliveries!", "Down this week! Jolly good!"],
      weighUp: ["Holiday bump? I gain 20 lbs every December. It's fine.", "Up a little. Cookies happen. Back at it!"],
      streak: ["{streak}-day streak! Like an advent calendar of awesome!", "{streak} days! Ho ho ho!"],
      water: ["Water goal hit! Hydrated like fresh snow. ❄️", "All your water! Even the elves are impressed."],
      tip: ["Party tip: eat protein before the party so cookies don't take over.", "Bring a healthy dish to share. You'll be the hero.", "Walk to see the Christmas lights. Festive cardio!"],
    },
  },

  bunny: {
    name: "Easter Bunny", emoji: "🐰", vibe: "Easter guest", season: "easter",
    lines: {
      morning: ["Hop hop, good morning {name}! 🌷", "Morning! I've hidden some protein around. Just kidding, log your breakfast."],
      afternoon: ["Afternoon hop-in! How's the day?", "Keep hopping toward your goals!"],
      evening: ["Evening! Time to hop into bed. 🌙", "Hoppy evening, friend!"],
      food: ["Logged! Egg-cellent. 🥚", "Tracked! Some bunny loves you."],
      protein: ["Protein goal! Egg-straordinary! 🥚💪", "Protein hit! Hop hop hooray!"],
      over: ["Too many jelly beans? Happens to the best bunnies. Tomorrow!", "Hop back on track tomorrow. 🐰"],
      onTrack: ["On target! Hoppy day!", "Perfectly balanced, like an egg on a spoon."],
      missed: ["Nothing logged yet? Go on an egg hunt for your food log!", "Hop to it! Log something!"],
      workout: ["Workout done! Look at those bunny hops!", "Great workout! I do 10,000 hops a day."],
      pr: ["New PR! Golden egg achievement! 🥚✨", "Personal record! Hop hop HOORAY!"],
      week: ["Weekly goal done! A basket full of wins!", "Whole week! Egg-ceptional."],
      weighDown: ["Scale's down! Hoppy dance! 🐰", "Down this week! Egg-cellent work!"],
      weighUp: ["Little bump? Chocolate eggs happen. Hop on!", "Up a smidge. It's just water, carrot top."],
      streak: ["{streak}-day streak! That's a lot of eggs in a row!", "{streak} days! Hop-tastic!"],
      water: ["Water goal hit! Fresh as spring rain. 🌧️", "All your water! Hoppy and hydrated."],
      tip: ["Hard-boiled eggs = perfect grab-and-go protein.", "Carrots with hummus: bunny-approved snack.", "Spring walk! Fresh air counts."],
    },
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
    name: "Cupid", emoji: "💘", vibe: "Valentine's guest", season: "feb",
    lines: {
      morning: ["Good morning, {name}! Love yourself today. 💕", "Morning! You two make a great team."],
      afternoon: ["Afternoon! Sending arrows of motivation. 🏹", "How's my favorite couple doing?"],
      evening: ["Evening! Date night? Share dessert, share the calories. 😉", "Goodnight, lovebirds."],
      food: ["Logged! I love that for you. 💘", "Tracked with love!"],
      protein: ["Protein goal! Love at first bite! 💪", "Protein hit! My heart!"],
      over: ["Over a bit? Love yourself anyway. Tomorrow's new!", "Chocolate happens. Love wins."],
      onTrack: ["On target! A perfect match!", "Calories and you: a love story."],
      missed: ["Nothing logged? Your log misses you. Log something cute.", "Psst, log a snack! I'll be watching. 💕"],
      workout: ["Workout done! Heart-healthy AND heart-eyes!", "Great workout! Cardio for the heart!"],
      pr: ["New PR! Heart-stopping performance! 💘🏆", "Personal record! I'm swooning."],
      week: ["Weekly goal done! Love is in the air!", "Whole week! Match made in heaven."],
      weighDown: ["Scale's down! Love this progress! 💕", "Down this week! Heart eyes!"],
      weighUp: ["Little bump? Love your body anyway. It's just water.", "Up a smidge. Still adorable."],
      streak: ["{streak}-day streak! Committed relationship with your goals!", "{streak} days! True love!"],
      water: ["Water goal hit! Glowing. 💧", "All your water! Love that glow."],
      tip: ["Cook dinner together tonight. Romantic AND on-plan.", "Dark chocolate (70%+) is the Valentine's move.", "Walk together after dinner. Hold hands. Count steps."],
    },
  },
};

export const DEFAULT_COACH = "bestie";

function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Which holiday coach is in season on a date, if any. */
export function seasonalCoach(date = new Date()) {
  const m = date.getMonth() + 1, d = date.getDate();
  if (m === 10) return "spooky";
  if (m === 11) return "turkey";
  if (m === 12 && d <= 26) return "santa";
  if (m === 2 && d <= 14) return "cupid";
  const e = easter(date.getFullYear());
  const diff = (date - e) / 864e5;
  if (diff >= -21 && diff <= 1) return "bunny";
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
