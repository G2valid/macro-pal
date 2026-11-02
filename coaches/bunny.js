// 🐰 EASTER BUNNY ("Bunny", never "Mr. Bunny") — holiday coach pack (weeks before Easter, selectable year-round)
// Bible: docs/coaches/easter-bunny.md
// Looks adorable; secretly an athletic freak with elite cardio, absurd legs and zero control around mini eggs.
// Movement should be fun, never repayment for food. "Your body isn't just something to look at. It's something you get to use."
// Per trigger: { lose, gain, maintain, any } lists, plus optional rare (≈1 in 10) and ultra (≈1 in 50).
// PHASES (bottom) follow the Easter countdown. Lines marked "// draft" fill gaps.

const GAIN_UNDER = [
  "More food! Come on. You're trying to grow.",
  "Need fuel. Eat another meal.",
  "Protein. Carbs. Actual food. Chocolate is not the foundation. Unfortunately.",
];
const GAIN_OVER = [
  "Plenty of fuel! Maybe a little TOO plenty.",
  "Growth definitely covered. No problem. Return to target tomorrow.",
  "Bulk doesn't need to become an eating competition. Even I know that. And I've eaten frightening amounts of chocolate.",
];

export const BUNNY = {
  // ---------- App opens ----------
  app_open_morning: { any: [
    "Morning! Up and moving! Let's go!",
    "Good morning! Legs awake? Mine are. Mine are always awake.",
    "Drink some water. Grab some breakfast. Then let's move.",
    "Beautiful morning for a hop. Or walk. Humans are weird about hopping.",
  ] },
  app_open_afternoon: { any: [
    "Afternoon! How we doing? Still moving?",
    "Let's check the numbers. Plenty of day left.",
    "Good time for a walk. Or some squats. I vote squats. I always vote squats.",
  ] },
  app_open_evening: { any: [
    "Evening! Let's see how we did.",
    "Anything left? Finish strong.",
    "Get a little movement. Then relax.",
    "Recovery matters. Especially for the legs. Respect the legs.",
  ] },
  app_open_late: { any: [
    "Whoa. Why are you awake? Go sleep.",
    "Recovery. Muscles grow when you rest. Especially legs. Everything comes back to legs eventually.",
    "Phone down. Bed. Hop to it. Okay, that one was intentional.",
  ] },
  monday_open: { any: [
    "New week! Let's move! Fresh start.",
    "Get those legs going.",
    "Monday isn't that bad. You're just sitting too much. Walk it out. Let's go!",
  ] },
  friday_open: { any: [
    "Friday! Nice. Finish strong.",
    "Weekend incoming. Have fun. Keep moving.",
    "Don't completely abandon the routine. And if chocolate appears... call me. For support. Obviously.",
  ] },
  weekend_open: { any: [
    "Weekend! Get outside. Move around. Have some fun.",
    "Exercise doesn't have to look like exercise. Walk. Play. Run. Bike. Hop. You people never choose hop.",
  ] },
  nothing_logged_afternoon: { any: [
    "Hey! Where are the logs?",
    "Let's get something in. Food? Water? Movement?",
    "Come on. Hop to it. Okay, yeah. That one's staying.",
  ] },

  // ---------- Returning ----------
  return_after_2_days: { any: [
    "There you are! Welcome back!",
    "Couple days off? No problem. Get moving again.",
    "No guilt. No punishment. Just restart. Easy.",
  ] },
  return_after_7_days: { any: [
    "HEY! Been a while! Glad you're back.",
    "Don't worry about the missed week. Can't change it. Start now.",
    "One good day. Then another. Let's move!",
  ] },

  // ---------- Food & calories ----------
  food_first_log: { any: [
    "Fuel! Nice. First meal in.",
    "Good. Need energy to move.",
    "What'd you eat? Chocolate? No? Probably responsible.",
  ] },
  food_logged: { any: [
    "Meal logged! Nice.",
    "Good fuel. Keep yourself fed. Beautiful.",
    "Food equals energy. Energy equals movement. Movement equals LEGS. Sorry.",
  ] },
  calories_close: {
    lose: [
      "Getting close. Easy. Not much room left.",
      "Finish smart. Still eat if you're hungry. Just be mindful.",
      "Especially around mini eggs. Those little monsters add up.",
    ],
    gain: [
      "Need a little more fuel! Almost there.",
      "Eat something. You've got room. More energy. More growth.",
      "Maybe chocolate? No. Protein first. I'm learning.",
    ],
    maintain: [
      "Right near target. Beautiful.",
      "Keep it balanced. Nice. Finish normally. Easy.",
    ],
  },
  calories_hit: {
    lose: [
      "TARGET HIT! Nice!",
      "Beautiful balance. Good eating. Good control.",
      "That's what I'm talking about. Calories handled.",
      "Hop— no. We're done with that joke.",
    ],
    gain: [
      "Fuel target hit! Nice!",
      "Growth supplied. Plenty of energy. Beautiful.",
      "That's how you build. Especially legs. Obviously.",
    ],
    maintain: [
      "Perfect! Right on target.",
      "Nice balance. Beautiful. No changes. Keep moving.",
    ],
  },
  calories_over_small: {
    lose: [
      "Little over. No big deal. Nothing ruined.",
      "Small miss. Keep going. Tomorrow's another day.",
      "No punishment. Maybe take a walk because walking feels good. Not because you 'owe' calories.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Little over. Nothing ruined. Tomorrow's another day.",
      "Small miss. Take a walk because it feels good, not because you owe anything.",
    ],
  },
  calories_over_large: {
    lose: [
      "Okay! Big food day. It happens.",
      "No guilt. No starving tomorrow. No punishment cardio.",
      "Don't try to outrun your dinner. Trust me. I'm literally a professional runner.",
      "Return to normal tomorrow. That's it.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Big food day. It happens. No guilt. Normal tomorrow.",
      "Don't try to outrun your dinner. Trust me. I'm literally a professional runner.",
    ],
  },
  // Next-day check about yesterday
  day_under_calories: {
    lose: [
      "Nice controlled deficit. Good.",
      "Nothing extreme. Sustainable. Plenty of energy.",
      "That's what we want. Good work.",
    ],
    gain: GAIN_UNDER,
    maintain: [ // draft
      "Ran a little light yesterday. Moving bodies need fuel. Eat today.",
      "Under target. You can't move well on empty. Eat properly!",
    ],
  },
  day_under_calories_way: { lose: [
    "Whoa. Too low. You need fuel. Eat. Seriously.",
    "You can't move well without energy.",
    "Extreme restriction isn't the goal. Take care of yourself.",
    "Your body needs food. Especially those legs.",
  ] },
  calories_low_late: { gain: GAIN_UNDER },

  // ---------- Protein ----------
  protein_halfway: { any: [
    "Halfway! Nice. Protein coming in.",
    "Keep going. Muscles need it. Especially— you know what I'm going to say. Legs.",
  ] },
  protein_close: { any: [
    "Almost there! Little more protein. Finish it.",
    "Shake. Chicken. Eggs. ... Eggs. Why is everything eggs with this holiday?",
  ] },
  protein_hit: { any: [
    "PROTEIN GOAL! Nice!",
    "Muscles fed. Beautiful. Strong. Target secured.",
    "That's what I'm talking about.",
    "Your legs thank you. Mine would too. But they're busy being enormous.",
  ] },
  protein_over: { any: [
    "Extra protein. Nice. Plenty of building material.",
    "Muscles covered. Beautiful. No complaints.",
    "Sir Whiskers wants to discuss your sources. Don't tell him I'm here.",
  ] },
  protein_low_late: { any: [
    "Protein's low. Grab something. Easy.",
    "Shake. Yogurt. Eggs. There it is again. Why eggs? Someone explain my branding.",
  ] },

  // ---------- Workouts ----------
  workout_logged: { any: [
    "YES! Workout done!",
    "Nice! Good movement. That's what I'm talking about.",
    "Training complete. Strong work. Now recover.",
    "Did you train legs? Just asking. Okay, I'm judging slightly.",
  ] },
  workout_pr: {
    any: [
      "LET'S GO! NEW PR!",
      "That's huge! Strong! Beautiful! Look at you!",
      "Previous record? HOPPED RIGHT OVER IT. Okay, THAT was a good one.",
      "New standard. Nice work!",
      "THAT DESERVES A VICTORY LAP. Seriously. Go take a lap.",
    ],
    rare: ["That's real progress. All those regular workouts built that one."],
  },
  weekly_workout_halfway: { any: [
    "Halfway! Nice pace. Keep going.",
    "Good week. Stay consistent.",
    "Don't cram everything into one day. Beautiful.",
  ] },
  weekly_workout_hit: { any: [
    "WEEK COMPLETE! Nice!",
    "Every workout handled. That's consistency. Beautiful work.",
    "Recovery time. Put the legs up. You've earned it.",
  ] },

  // ---------- Steps ----------
  steps_halfway: { any: [
    "HALFWAY! Now we're talking. Movement!",
    "Keep those feet going. Nice. Good pace.",
    "Half the goal. I like this category.",
  ] },
  steps_close: { any: [
    "Almost there! Come on! Little more.",
    "Quick walk. Finish the steps. You've got this.",
    "MOVE THOSE LEGS. Sorry. Got excited.",
  ] },
  steps_hit: { any: [
    "STEP GOAL! YES! That's what I'm talking about!",
    "Movement complete. Strong legs. Good work.",
    "Beautiful. Honestly? My favorite notification.",
  ] },
  steps_low_late: { any: [
    "Whoa. We haven't moved much. Let's fix that.",
    "Quick walk. Nothing crazy. Ten minutes. Get some blood moving.",
    "Your legs are bored. I can feel it. Leg solidarity.",
  ] },

  // ---------- Water ----------
  water_halfway: { any: [
    "Halfway hydrated! Nice. Keep drinking.",
    "Good. Halfway.",
    "Water matters. Especially when you're moving.",
  ] },
  water_close: { any: [
    "Almost there! Finish the water. One more glass. You're close.",
    "Hydrate. Good work. Then move. Obviously.",
  ] },
  water_hit: { any: [
    "WATER GOAL! Nice! Hydrated. Beautiful.",
    "Good habit. Your muscles appreciate it. Your legs especially. I have a problem.",
  ] },
  water_low_late: { any: [
    "Water. Come on. You're low.",
    "Hydrate. Go fill the bottle. Moving bodies need water. Simple. Drink.",
  ] },

  // ---------- Weigh-ins ----------
  weigh_in_first: { any: [
    "Starting number. Good. Just data. Nothing emotional.",
    "Watch the trend. No judgment.",
    "Your weight doesn't determine what your body can do. Performance matters too. Remember that.",
  ] },
  weigh_in_down: {
    lose: [
      "Nice! Moving down. Good progress.",
      "Keep doing what works. Don't rush.",
      "Stay fueled. Keep moving. Beautiful.",
    ],
    gain: [
      "Little drop. No panic. We're trying to move upward.",
      "Watch the trend. More fuel if needed.",
      "Keep training. Stay patient.",
    ],
    any: [ // draft (maintain)
      "Little dip. Bodies don't move perfectly. Keep moving.",
      "Scale isn't everything. Performance might still be improving.",
    ],
  },
  weigh_in_up: {
    lose: [
      "Scale up? Relax. Water. Food. Salt. Normal stuff.",
      "One number isn't a trend. Keep doing the work.",
      "Don't punish yourself. Movement should never be punishment.",
    ],
    gain: [
      "YES! Moving up. Growth. Nice.",
      "Keep fueling. Keep training. Build.",
      "Especially— fine. I won't say legs.",
    ],
    any: [ // draft (maintain)
      "Little bump. Water. Food. Salt. Normal stuff.",
      "One number isn't a trend. Movement should never be punishment.",
    ],
  },
  weigh_in_flat: { any: [
    "Same number. Fine. Keep going.",
    "Bodies don't move perfectly. Watch the trend. Stay consistent.",
    "Performance might still be improving. Scale isn't everything.",
  ] },

  // ---------- Weight milestones ----------
  weight_5lb_milestone: { any: [
    "Five pounds! Nice! That's real progress.",
    "Good work. Keep going. Strong. Beautiful. Let's move!",
  ] },
  weight_25_percent: { any: [
    "Quarter way! Nice. Real progress.",
    "Keep moving. 25% complete. Beautiful. Good work.",
  ] },
  weight_halfway: { any: [
    "HALFWAY! YES! Look at that.",
    "Half the goal. That's huge. Keep going. Strong work.",
  ] },
  weight_75_percent: { any: [
    "Three quarters! Getting close!",
    "Don't rush. Keep doing what works. Finish strong. Almost there.",
  ] },
  weight_goal_close: { any: [
    "Almost there! Stay patient. No extreme stuff.",
    "Keep eating enough. Keep moving. Finish healthy. You've got this.",
  ] },
  weight_goal_reached: {
    any: [
      "YESSSSS! YOU DID IT! GOAL REACHED!",
      "That's huge! Look how far you came.",
      "All those days. All that movement. All that consistency. Beautiful work.",
      "Be proud. Seriously. You earned this.",
      "THAT DESERVES A VICTORY LAP. Go. I'll wait.",
    ],
    rare: ["Strong isn't just what your body can do. It's continuing to show up for yourself."],
    rareChance: 0.25,
  },

  // ---------- Streaks ----------
  logging_streak_3: { any: ["Three days! Nice start.", "Keep moving. Good work."] },
  logging_streak_7: { any: ["One week! Nice!", "Seven days. Good consistency."] },
  logging_streak_14: { any: ["Two weeks! Strong.", "Fourteen days. Keep going."] },
  logging_streak_30: { any: ["THIRTY DAYS! Whole month.", "That's impressive. Nice consistency. Beautiful."] },
  logging_streak_50: { any: ["FIFTY! Nice!", "That's serious consistency. Keep going. Strong."] },
  logging_streak_100: { any: [
    "ONE HUNDRED DAYS! YES!",
    "That's huge. One hundred days of showing up.",
    "That's real discipline. Beautiful work.",
  ] },
  streak_broken: { any: [
    "Streak broke. No problem. Everything still counts.",
    "Get back up. Keep moving.",
    "One missed day doesn't erase anything. Start again. Easy.",
    "Hop back— okay, that one works.",
  ] },
  streak_comeback: { any: [
    "BACK AT IT! Nice!",
    "That's what matters. You came back.",
    "New streak. Fresh start. Keep moving. Beautiful.",
  ] },

  // ---------- Planning ----------
  meal_plan_meal_logged: { any: [
    "Planned meal! Nice. Preparation.",
    "Good thinking. Makes everything easier. Fuel ready when you need it.",
    "Did you meal prep eggs? Of course you did.",
  ] },
  grocery_list_finished: { any: [
    "Groceries done! Nice. Food secured.",
    "Preparation matters.",
    "Did you buy eggs? Why did I ask? Of course you bought eggs. This holiday has ruined me.",
  ] },

  // ---------- Bunny lore ----------
  // ---------- Check-ins (draft: Settings → Check-ins; {meal}, {Meal}, {MEAL}, {time} fill in) ----------
  checkin_meal: { any: [
    "Hey! It's {time}. No {meal}? Need fuel to move. Hop to it.",
    "{Meal}? Not logged. Legs can't run on nothing. Eat. Log. Move.",
  ] },
  checkin_weigh: { any: [
    "Weigh-in day! Quick step on the scale. Then go use those legs.",
    "Scale time. Just data. Your body's for using, not just measuring.",
  ] },

  random_smalltalk: {
    any: [
      "Crunchula needs more cardio. I said it. He took it personally. He takes everything personally.",
      "Crunchula won't train before sunset. I won't train after. We're incompatible. Shame. Great squat.",
      "Quick question. Why eggs? Seriously. I'm a rabbit. RABBITS DON'T LAY EGGS. Nobody thinks that's weird?",
      "I've asked management about the eggs. No response.",
      "I DISTRIBUTE the eggs. Important distinction. Logistics. That's my department.",
      "Do NOT ask where the eggs come from. I don't know. And at this point I'm afraid to ask.",
      "People always offer me carrots. They're fine. They're FINE. Do I love them? No. Do I eat them because there's a brand expectation? Absolutely.",
      "You know what I actually like? Pizza. Nobody makes Easter pizza. Opportunity.",
      "Chocolate eggs are dangerous. Mini eggs especially. They're tiny. Your brain goes, 'That's basically nothing.' Forty-seven later... problem.",
      "I've done the research on mini eggs. Extensively. They should come with a warning. The bag says serving size. I reject the premise.",
      "Mini eggs don't count individually. That's not how calories work. I know. I don't care.",
      "Fake Easter grass. Worst invention ever. I find it until July.",
      "Hype Bestie says glitter is worse than Easter grass. They're wrong. At least glitter doesn't wrap around your ankle.",
      "You ever step on a plastic Easter egg? I have. Occupational hazard.",
      "My vertical jump? Elite. Don't ask numbers. Santa keeps requesting documentation. I don't need documentation. Look at these legs. Actually you can't. But imagine.",
      "I broke a treadmill once. Fine. Four treadmills.",
      "I'm banned from Planet Fitness. Long story. They said 'no jumping.' What was I supposed to do? Walk?",
      "Upper body? Yeah. I train upper body. Baskets. Lots of baskets. Stop looking at my arms. They're aerodynamic.",
      "Leg day? Every day. Chest day? Let's change the subject.",
      "I use resistance bands designed for horses.",
      "Easter night is Zone 2 with occasional intervals. Nobody agrees with me on this.",
      "What's up, Doc? Sorry. Contractual issue. Can't say that.",
      "Call me Bunny. Not Mr. Bunny. Mr. Bunny is my father.",
      "Santa says he has the harder delivery route. HE HAS A SLEIGH. I USE MY LEGS.",
      "Santa says rooftops are dangerous. Try hiding twelve thousand eggs before sunrise. Then talk to me.",
      "Also Santa gets cookies. I get carrots. Unbelievable.",
      "Santa tracks houses per hour. I track eggs hidden per minute and vertical feet traveled. It has gotten out of control.",
      "Cupid tried shooting me with an arrow. I jumped over it. Legs.",
      "Cupid tried shooting me again. Too slow. Quick feet.",
      "Cupid says I'm ruining romance. I say improve your accuracy.",
      "Drill Sergeant timed my mile. He hasn't spoken to me the same way since. Respect.",
      "Sarge timed my shuttle runs. He hasn't called me 'rabbit' since. It's 'Bunny' now.",
      "Surfer Dude asked if rabbits can surf. Probably. I can do anything with these legs.",
      "Surfer Dude says my balance is 'gnarly.' Nice guy. Terrible shoes.",
      "Ricky wants me in a music video. Rollerblades. Neon. Wind machine. Honestly? I'm considering it.",
      "Ricky says I was in his 1993 music video. I wasn't born yet. He says that's what the label wants me to think.",
      "Coach Dad built me a basket rack. Used leftover plywood. Said he'd been saving it for seventeen years. Finally came in handy. Great craftsmanship.",
      "Coach Dad keeps offering me carrots. I politely accept them. Then I give them to the reindeer.",
      "DJ Gains made my cardio playlist. It's incredible. I ran through a wall. We adjusted the BPM.",
      "Hype Bestie called me 'THICC.' I asked what that meant. Apparently the legs. Fair.",
      "Hype Bestie and I decorated Easter baskets together. This was a disaster.",
      "Whiskers watches me. I don't like that. He says rabbits are 'lean.' WHAT DOES THAT MEAN?",
      "Tom understands. Tom and I have a support group. Seasonal Prey Animals Anonymous. Attendance: two. Whiskers is banned.",
      "I'm a rabbit. WHY AM I IN CHARGE OF EGGS?",
      "I invented leg day. Nobody can prove I didn't.",
      "Santa says I should stop complaining because I get spring weather. I HAVE TO HIDE THE DELIVERIES. He just drops them under a tree.",
      "Santa says he enters through chimneys. With MAGIC. He says I use magic too. That's not the point.",
      "Ricky says rollerblades plus rabbit equals comeback. I declined. ... I'm reconsidering.",
      "Surfer Dude wants to teach me surfing. I said yes. Obviously.",
      "Sarge calls me an elite operative now. I love this. I have it on a mug.",
      "Tom gets it. People look at us differently around holidays.",
      "Hype Bestie and I decorated baskets again. There is glitter AND Easter grass now. It's a crime scene.",
      "You've got legs. Use 'em.",
      "Let's move!",
    ],
    rare: [
      "Your body isn't just something to look at. It's something you get to use.",
      "Walk. Run. Lift. Play. Dance. Whatever. Being able to move is pretty cool.",
      "Don't spend your whole fitness journey staring at the scale. Notice what your body can DO.",
      "Getting stronger matters. Having more energy matters. Feeling better matters.",
      "Take care of your body. Then go use it.",
      "Run farther. Lift heavier. Walk without getting tired. Play with your kids. Climb something. Dance. Explore. Live.",
      "Eat some chocolate. Enjoy it. You don't need to 'earn' chocolate, and movement isn't repayment for food.",
    ],
    ultra: ["Why am I the egg guy? Seriously. Who wrote this? I want answers."],
  },

  coach_picked: { any: ["Let's move! Bunny's here. Not Mr. Bunny. That's my father."] },
  coach_picked_offseason: { any: ["You selected the Easter Bunny? It's {month}. Respect. Leg day?"] },
};

/* ---------- The Easter countdown ---------- */
export function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Days from Easter Sunday (negative = before). */
export function daysToEaster(date = new Date()) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day - easterDate(date.getFullYear())) / 864e5);
}

export function bunnyPhase(date = new Date()) {
  const diff = daysToEaster(date);
  if (diff === 1) return "after";
  if (diff === 0) return "easter";
  if (diff === -1) return "eve";
  if (diff === -2) return "goodFriday";
  if (diff >= -7 && diff <= -3) return "week";
  if (diff >= -14 && diff <= -8) return "twoWeeks";
  if (diff >= -28 && diff <= -15) return "early";
  return null;
}

const OPENS = ["app_open_morning", "app_open_afternoon", "app_open_evening", "app_open_late", "monday_open", "friday_open", "weekend_open", "random_smalltalk", "nothing_logged_afternoon"];

export const BUNNY_PHASES = {
  early: { chance: 0.3, triggers: OPENS, lines: [
    "Plenty of time. Training is going great.",
    "Egg inventory looks good. Legs feel incredible.",
  ] },
  twoWeeks: { chance: 0.45, triggers: OPENS, lines: [
    "We're getting close. Basket production ramping up.",
    "Chocolate inventory rising. Dangerous environment.",
  ] },
  week: { chance: 0.65, triggers: OPENS, lines: [
    "Big week. Final training.",
    "Carb loading. Egg logistics. Let's go.",
  ] },
  goodFriday: { chance: 1, triggers: OPENS, lines: [
    "Final prep. Route mapped. Baskets ready. Legs ready.",
    "Chocolate consumption concerning. We're operational.",
  ] },
  eve: { chance: 1, triggers: OPENS, lines: [
    "TONIGHT. This is it. Stretching. Hydrating. Carbs loaded. Baskets packed.",
    "WHERE ARE MY EGGS? ...Found them. Let's move.",
  ] },
  easter: { chance: 1, triggers: OPENS, lines: [
    "... Done. Every basket. Every egg. Legs destroyed. Worth it.",
    "Happy Easter. Do not ask me to walk.",
  ] },
  after: { chance: 1, triggers: OPENS, lines: [
    "Recovery. No movement. Don't even say steps. My legs have resigned.",
    "Chocolate inventory mysteriously depleted. Investigation ongoing.",
  ] },
  // Easter Eve & Day food moments: treats fit, no guilt
  easterFood: { chance: 1, triggers: ["calories_over_small", "calories_over_large", "calories_hit"], lines: [
    "Eat some chocolate. Enjoy Easter. Candy isn't evil.",
    "You don't need to 'earn' chocolate. You don't need punishment cardio afterward. Have some. Enjoy it. Then move on.",
    "The problem isn't one chocolate egg. It's when I black out beside an empty family-size bag. Hypothetically.",
  ] },
};
