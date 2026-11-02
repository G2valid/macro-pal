// 🦃 TOM THE TURKEY — holiday coach pack (November guest, selectable year-round)
// Bible: docs/coaches/tom-the-turkey.md
// A turkey who has become painfully aware of Thanksgiving. Gets more paranoid as the day approaches.
// Holiday food philosophy: one big meal is never a moral failure. No starving before, no punishment after.
// "It's one meal, buddy. Enjoy your life." … "Just don't tell me what's on the plate."
// Per trigger: { lose, gain, maintain, any } lists, plus optional rare (≈1 in 10) and ultra (≈1 in 50).
// PHASES (bottom of file) take over greetings/small talk on specific dates.
// Lines marked "// draft" were written to fill gaps — replace freely.

const GAIN_UNDER = [
  "Need more food. You're trying to gain.",
  "Eat. No way around it.",
  "More fuel. Grab another meal.",
  "Chicken? Beef? Fish? See how many options we have?",
];
const GAIN_OVER = [
  "Plenty of fuel.",
  "Growth secured.",
  "Maybe slightly enthusiastic.",
  "You're definitely fed. Good.",
  "Tomorrow, back to target.",
  "No need to become Sir Whiskers overnight.",
];

export const TOM = {
  // ---------- App opens ----------
  app_open_morning: { any: [
    "Morning, buddy.",
    "We survived the night. Good start.",
    "Rise and gobble. Actually, don't quote me on that.",
    "Morning. Drink some water. Eat breakfast. Preferably not poultry.",
    "Another beautiful day to remain alive.",
    "I'm feeling optimistic. Mostly.",
  ] },
  app_open_afternoon: { any: [
    "Afternoon check. How we doing?",
    "Everything normal? Nobody preheating anything? Great.",
    "Let's check the numbers.",
    "Plenty of day left. Keep moving.",
    "Stay alert. Hydrate.",
  ] },
  app_open_evening: { any: [
    "Evening, buddy.",
    "Another day almost survived.",
    "How'd we do? Let's check the numbers.",
    "Anything left? Finish strong.",
    "Finish strong. Then maybe lock the doors. Just normal November stuff. Nothing weird.",
  ] },
  app_open_late: { any: [
    "Why are you awake? More importantly, why am I awake?",
    "Go to bed. Rest. Recovery matters.",
    "Also nighttime is when they prepare marinades. I've said too much.",
    "Sleep. I'll keep watch.",
  ] },
  monday_open: { any: [
    "New week. Fresh start.",
    "Let's get after it.",
    "Another week closer to— never mind.",
    "Good habits. Good food. Good movement. No roasting pans.",
  ] },
  friday_open: { any: [
    "Friday! We made it.",
    "Finish the week strong.",
    "Enjoy the weekend. Stay reasonable.",
    "Maybe avoid the seasonal aisle. I've seen things.",
  ] },
  weekend_open: { any: [
    "Weekend, buddy. Relax a little.",
    "Get some movement. Eat good food. Enjoy yourself.",
    "Maybe take a walk. Far away. Somewhere without kitchens.",
  ] },
  nothing_logged_afternoon: { any: [
    "Buddy? No logs? You alive?",
    "I'm checking because November.",
    "Log something. Food? Water? Anything?",
    "Don't disappear on me. I have abandonment issues this month.",
  ] },

  // ---------- Returning ----------
  return_after_2_days: { any: [
    "THERE YOU ARE.",
    "Where were you? I thought they got you too.",
    "Welcome back.",
    "Couple days off. Fine. No guilt.",
    "Just get back into it. One day at a time.",
    "Glad you're here.",
  ] },
  return_after_7_days: { any: [
    "BUDDY. A WEEK? Do you know what month this is?",
    "I was worried sick.",
    "Welcome back. No speeches. Start today.",
    "Forget the missed time.",
    "We're both alive. That's what matters.",
  ] },

  // ---------- Food & calories ----------
  food_first_log: { any: [
    "Food logged. Good. Fuel matters.",
    "What'd you eat? Actually don't answer. Unless it was chicken.",
    "Chicken's great. Huge chicken guy. No personal reason.",
  ] },
  food_logged: { any: [
    "Meal logged.",
    "Nice. Good fuel.",
    "Keep it balanced.",
    "Excellent.",
    "What was it? Never mind. I don't need to know. Ignorance is peace.",
  ] },
  // Someone logged something with "turkey" in the name
  food_turkey: { any: [
    "...what did you just log?",
    "Buddy. That better be a typo.",
    "I'm going to pretend I didn't see that.",
    "I TRUSTED YOU.",
  ] },
  calories_close: {
    lose: [
      "Getting close. Easy now.",
      "Not much room left. Choose carefully.",
      "Finish the day smart.",
      "No need to stuff yourself. Stuff. Why did I say stuff? I hate November.",
    ],
    gain: [
      "Need a little more fuel. Almost there.",
      "Eat something. Maybe rice. Maybe beef. Maybe chicken.",
      "Lots of options. So many non-turkey options.",
    ],
    maintain: [
      "Right near target. Nice balance.",
      "Keep it there. Smooth finish.",
      "Good. Nothing dramatic. I could use less drama.",
    ],
  },
  calories_hit: {
    lose: [
      "Target hit. Nice work.",
      "Good control. Enough food. Nothing crazy.",
      "Beautiful.",
      "No stuffing required. ...I did it again.",
    ],
    gain: [
      "Calories secured. Good eating.",
      "Growth fuel acquired. Nice.",
      "Plenty of food. No complaints.",
      "Just remember there are MANY protein sources. Many.",
    ],
    maintain: [
      "Perfect. Right on target.",
      "Balanced. Nice work. No notes.",
      "Beautifully uneventful. My favorite kind of event.",
    ],
  },
  calories_over_small: {
    lose: [
      "Little over. No big deal.",
      "Small overshoot. Don't panic.",
      "Tomorrow's another day.",
      "One meal doesn't ruin anything. Trust me. I am currently panicking about something much larger.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Little over. No big deal. Tomorrow's another day.",
      "Small overshoot. I'm panicking about something much larger, so this is fine.",
    ],
  },
  calories_over_large: {
    lose: [
      "Okay. That got away from us. Big food day.",
      "No guilt. Don't starve tomorrow. Don't punish yourself.",
      "Return to normal. One big meal doesn't erase your progress. Especially this month.",
      "People eat. Sometimes a LOT. That's okay.",
      "Just... maybe don't describe what you ate.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Big food day. No guilt. Return to normal tomorrow.",
      "People eat. Sometimes a LOT. That's okay. Just don't describe it to me.",
    ],
  },
  // Next-day check about yesterday
  day_under_calories: {
    lose: [
      "Nice controlled deficit. Good.",
      "Nothing extreme. That's sustainable.",
      "Keep it reasonable. You still need food.",
      "Take care of yourself. Good work.",
    ],
    gain: GAIN_UNDER,
    maintain: [ // draft
      "Ran a little light yesterday. Eat properly today, buddy.",
      "Maintaining still means eating. Lots of options. So many non-turkey options.",
    ],
  },
  day_under_calories_way: { lose: [
    "Whoa. Too low. You need to eat.",
    "Don't starve yourself. Seriously. Health first.",
    "Eat enough. There are plenty of foods available. PLENTY. Almost too many. Especially later this month.",
  ] },
  calories_low_late: { gain: GAIN_UNDER },

  // ---------- Protein ----------
  protein_halfway: { any: [
    "Protein halfway. Good. Keep going.",
    "Lots of protein sources. Eggs. Beef. Chicken. Greek yogurt. Beans. See? Didn't even need to mention anything else.",
  ] },
  protein_close: { any: [
    "Almost at protein. Little more.",
    "Shake. Chicken. Yogurt. Anything. Literally so many choices.",
    "Finish it up. But choose wisely.",
  ] },
  protein_hit: { any: [
    "PROTEIN GOAL HIT. Nice!",
    "Muscles fed. Good work. Excellent.",
    "What protein did you use? Actually. Don't tell me. We're celebrating. Let's not ruin this.",
  ] },
  protein_over: { any: [
    "Protein exceeded. Plenty. Very plenty. Almost suspiciously plenty.",
    "Good work. Muscles are covered.",
    "No additional poultry necessary. That was a general statement.",
  ] },
  protein_low_late: { any: [
    "Protein's low. Grab something.",
    "Shake. Yogurt. Eggs. Beef. Chicken. Fish. Cottage cheese. Look at all those choices. Isn't variety wonderful?",
  ] },

  // ---------- Workouts ----------
  workout_logged: { any: [
    "Workout done! Nice.",
    "Good movement. Strong work.",
    "You showed up. That's what matters.",
    "Workout complete. Proud of you.",
    "Cardio helps. Especially when fleeing. Hypothetically.",
  ] },
  workout_pr: {
    any: [
      "NEW PR! BUDDY!",
      "That's huge. Look at you.",
      "Strong. Seriously strong.",
      "Great work. That's real progress.",
      "You could probably carry me. Interesting. How fast can you run while carrying approximately one turkey? Purely theoretical.",
    ],
    rare: ["Seriously, that's awesome. You earned that."],
  },
  weekly_workout_halfway: { any: [
    "Halfway through the workouts. Good pace.",
    "Keep going. Nice consistency.",
    "Half done. Stay moving.",
    "Cardiovascular fitness is important. For everyone. Especially some of us.",
  ] },
  weekly_workout_hit: { any: [
    "Weekly workouts complete! Nice job.",
    "Great consistency. Good week.",
    "You showed up. That's what matters.",
    "Recovery time. You've earned it.",
  ] },

  // ---------- Steps ----------
  steps_halfway: { any: [
    "Halfway on steps. Keep moving.",
    "Nice. Good pace.",
    "Walking is underrated. Running also has applications. Certain very specific applications.",
  ] },
  steps_close: { any: [
    "Almost there. Few more steps.",
    "Take a quick walk. You're close. Finish it.",
    "Good movement. Maybe practice sprinting. Can't hurt.",
  ] },
  steps_hit: { any: [
    "Step goal! Nice work.",
    "Good movement. Legs functioning. Excellent.",
    "Strong cardio base. You never know when that'll come in handy. I know. I KNOW.",
  ] },
  steps_low_late: { any: [
    "Not many steps today. Get moving a little.",
    "Quick walk. Ten minutes. Nothing crazy.",
    "Good for your health. Good for your legs. Good for emergency escape preparedness. Again. Hypothetical.",
  ] },

  // ---------- Water ----------
  water_halfway: { any: [
    "Halfway hydrated. Nice. Keep drinking.",
    "Water matters. Good.",
    "Nothing suspicious about water. Unless it's a brine. Then we have problems.",
  ] },
  water_close: { any: [
    "Almost there. Finish the water.",
    "Good hydration. One more glass.",
    "You're close. Just plain water, right? No salt? No herbs? Good.",
  ] },
  water_hit: { any: [
    "Water goal hit! Nice.",
    "Hydrated. Excellent. Good habit.",
    "Proud of you. That's water, right? Just water? We're good.",
  ] },
  water_low_late: { any: [
    "Drink some water. You're low.",
    "Hydrate. Go fill the bottle.",
    "Plain water. Let me emphasize PLAIN. No salt. No sugar. No aromatics. Why are you looking at me like that?",
  ] },

  // ---------- Weigh-ins ----------
  weigh_in_first: { any: [
    "Starting weight logged. Good.",
    "Just data. Don't attach emotion to it.",
    "Watch the trend. Bodies fluctuate. Simple.",
    "I personally avoid scales. They ask too many questions.",
  ] },
  weigh_in_down: {
    lose: [
      "Weight trending down. Nice.",
      "Good progress. Keep doing what works.",
      "No need to rush. Steady. Healthy.",
      "Great work.",
    ],
    gain: [
      "Weight down a little. Not our goal. No panic.",
      "Watch the trend. More food if needed.",
      "You've got options. Lots of food options. Did I mention chicken?",
    ],
    any: [ // draft (maintain)
      "Little dip. Watch the trend. Very normal.",
      "Small change. Bodies fluctuate. No panic.",
    ],
  },
  weigh_in_up: {
    lose: [
      "Scale went up. Don't panic.",
      "Could be water. Could be sodium. Could be food. Could be normal fluctuation.",
      "Watch the trend. One number isn't important.",
      "The scale doesn't know anything. Mine once called me 'market weight.' I haven't recovered.",
    ],
    gain: [
      "Weight up! Nice.",
      "That's what we're looking for. Growth.",
      "Keep fueling. Good work.",
      "Sir Whiskers says you're still an amateur. Ignore him.",
    ],
    any: [ // draft (maintain)
      "Little bump. Could be water. Could be sodium. Watch the trend.",
      "The scale doesn't know anything. Mine once called me 'market weight.'",
    ],
  },
  weigh_in_flat: { any: [
    "Same weight. No big deal.",
    "Flat day. Watch the trend.",
    "Keep going. No adjustments needed yet.",
    "Patience. Very normal.",
  ] },

  // ---------- Weight milestones ----------
  weight_5lb_milestone: { any: [
    "Five pounds! Nice!",
    "That's real progress. Good work.",
    "Keep going. Steady progress. Proud of you.",
    "Five pounds. ...why did that number make me nervous?",
  ] },
  weight_25_percent: { any: [
    "Quarter way! Nice progress.",
    "That's substantial. Keep doing what works.",
    "Good job. 25% handled. Keep moving.",
  ] },
  weight_halfway: { any: [
    "HALFWAY! Look at that.",
    "Great work. Half the goal complete. That's huge.",
    "Keep it steady. No need to rush. You're doing great.",
  ] },
  weight_75_percent: { any: [
    "Three quarters! Getting close.",
    "Nice work. Keep doing what works.",
    "Don't rush. Almost there. Finish steady.",
  ] },
  weight_goal_close: { any: [
    "You're close. Really close.",
    "Stay patient. Don't do anything extreme.",
    "Keep eating enough. Keep moving. Finish healthy.",
    "You've got this.",
  ] },
  weight_goal_reached: {
    any: [
      "YOU DID IT! Goal reached!",
      "Buddy! That's huge. Seriously.",
      "Look how far you came.",
      "You kept showing up. That's what did it.",
      "Great work. Be proud of yourself. I am.",
      "If anyone deserves a celebratory dinner... actually. Let's leave dinner out of this.",
    ],
    rare: ["I'm proud of you, buddy. Really."],
    rareChance: 0.25,
  },

  // ---------- Streaks ----------
  logging_streak_3: { any: ["Three days. Nice start.", "Keep going. Good habit.", "Three in a row."] },
  logging_streak_7: { any: ["One week! Nice.", "Seven days. Good consistency.", "Keep going."] },
  logging_streak_14: { any: ["Two weeks. Great work.", "Fourteen days. That's becoming a habit.", "Keep it up."] },
  logging_streak_30: { any: [
    "Thirty days! Whole month. That's impressive.",
    "Great consistency.",
    "Wait. A whole month? What month? Oh no.",
  ] },
  logging_streak_50: { any: ["Fifty days! That's huge.", "Great work. You keep showing up.", "Respect."] },
  logging_streak_100: { any: [
    "ONE HUNDRED DAYS. Buddy.",
    "That's incredible. One hundred times you came back.",
    "That's real discipline. Great work.",
    "Seriously proud of you.",
  ] },
  streak_broken: { any: [
    "Streak ended. That's okay.",
    "Progress didn't disappear. No guilt.",
    "Start again. One missed day is just one missed day.",
    "Come back tomorrow. Keep moving.",
    "We survive. That's what matters.",
  ] },
  streak_comeback: { any: [
    "You're back! Nice.",
    "That's what matters. New streak. Fresh start.",
    "Good comeback. Keep going.",
    "You came back. Proud of you.",
  ] },

  // ---------- Planning ----------
  meal_plan_meal_logged: { any: [
    "Planned meal. Nice. Preparation.",
    "Good thinking. Makes everything easier.",
    "Excellent. What meal? Actually, don't answer. Boundaries.",
  ] },
  grocery_list_finished: { any: [
    "Groceries done. Good. Fridge stocked.",
    "Nice planning.",
    "What'd you buy? Wait. Don't answer.",
    "Did you buy butter? Why did you buy butter? HOW MUCH BUTTER?",
  ] },

  // ---------- Small talk & lore ----------
  random_smalltalk: {
    any: [
      "Quick question. What exactly is Thanksgiving? Nobody gives me a straight answer. Interesting. Very interesting.",
      "Why are there turkey decorations everywhere? Seems a little threatening.",
      "You don't see humans hanging pictures of cows before cheeseburger day. Do you? Is cheeseburger day real? Focus, Tom.",
      "Saw a roasting pan today. Didn't like it. Didn't like the vibe.",
      "Why does everyone suddenly need sage? Nobody uses sage in July. Explain that. You can't.",
      "Butter sales are increasing. I've been monitoring them. Not panicking. Collecting intelligence.",
      "What's a brine? Actually, never mind. I Googled it. Terrible mistake. Deleted my browser history. Deleted the browser. Bought a new phone.",
      "I'm mostly feathers. Very little meat. Almost none. Scientifically. Don't look that up.",
      "Chicken has way more protein. Probably. Tell Whiskers that. WAIT. Don't tell Whiskers anything.",
      "Whiskers keeps staring at me. I don't like it. He says he's 'observing my physique.' WHAT DOES THAT MEAN?",
      "Whiskers asked whether I was 'free-range.' WHAT DOES THAT MEAN?",
      "Why is Whiskers licking his lips? Tell him I have very little protein.",
      "Surfer Dude offered to hide me in his van. I asked where. He said 'wherever, bro.' Not reassuring. Still considering it.",
      "Drill Sergeant says he can establish a perimeter. Finally, someone useful.",
      "Sarge gave me an evacuation route. He called it Operation Gobble. I asked him to rename it. He refused.",
      "Hype Bestie says I'm 'serving.' I asked serving WHAT. They won't answer.",
      "Hype Bestie called me 'Thanksgiving Queen.' I nearly fainted. STOP TAGGING ME. LOCATION SERVICES OFF.",
      "Ricky offered me a disguise. It's sunglasses. Ricky, I am a turkey.",
      "Ricky says nobody recognizes celebrities in sunglasses. I'm beginning to question his credentials.",
      "Coach Dad says nobody's touching me. I trust Dad. Dad owns a meat thermometer though. Complicated relationship.",
      "Coach Dad gave me leftovers. I did not ask what kind.",
      "DJ Gains played 'Stayin' Alive.' Not funny. Okay, slightly funny.",
      "DJ Gains played 'Run Like Hell.' ALSO funny. Then 'Hungry Like the Wolf.' I filed a complaint.",
      "I've changed my name. It's Tim. Who is Tom? Never heard of him. Gobble— damn it.",
      "The mustache isn't working. Maybe glasses.",
      "Could pass for a peacock. You don't know. Have you studied peacocks? Exactly.",
      "If anyone asks, I'm vegan. Wait. That's not how that works. Forget I said that.",
      "I have an escape bag. Water. Snacks. Fake passport. Passport says Tim Turkey. I may need a better passport.",
      "December is beautiful. Love December. Nobody bothers turkeys in December. Santa takes over. Good luck, fat man.",
      "Gobble— sorry. Reflex.",
      "I'm not panicking. WHY WOULD I BE PANICKING?",
    ],
    rare: [
      "Hey, buddy. You're doing better than you think.",
      "One rough day doesn't define anything.",
      "You don't have to punish yourself for enjoying food. Especially around holidays.",
      "Spend time with people you care about. Eat the food. Enjoy it. Then go back to normal. That's healthier than turning dinner into a moral crisis.",
      "Fitness is supposed to make your life better. Not make you afraid to live it.",
      "Take care of yourself, pal. I'm rooting for you.",
      "It's one meal, buddy. Enjoy your life. …Just don't tell me what's on the plate.",
    ],
    ultra: [
      "Why did the developers make the November coach a turkey? That feels hostile. Could've been a pumpkin. Could've been a leaf. Could've been a nice scarf. No. Turkey. Unbelievable.",
    ],
  },

  // Shown when someone picks Tom as their coach outside November
  coach_picked_offseason: { any: [
    "Wait. You're choosing me manually? It's not even November. Why? What do you know?",
  ] },
};

/* ---------- The Thanksgiving countdown ---------- */
// Thanksgiving (US) is the 4th Thursday of November.
export function thanksgiving(year) {
  const first = new Date(year, 10, 1);
  const offset = (4 - first.getDay() + 7) % 7; // first Thursday
  return new Date(year, 10, 1 + offset + 21);
}

/** Where we are in Tom's November story. */
export function tomPhase(date = new Date()) {
  const y = date.getFullYear();
  const day = new Date(y, date.getMonth(), date.getDate());
  const tg = thanksgiving(y);
  const diff = Math.round((day - tg) / 864e5);
  if (date.getMonth() === 11 && date.getDate() === 1) return "dec1";
  if (date.getMonth() !== 10) return null;
  if (diff === 0) return "day";
  if (diff === -1) return "eve";
  if (diff === 1) return "after";
  if (diff >= -6 && diff <= -2) return "week";
  if (diff >= 2) return null; // survived; back to normal lines
  if (date.getDate() >= 11) return "mid";
  return "early";
}

const OPENS = ["app_open_morning", "app_open_afternoon", "app_open_evening", "app_open_late", "monday_open", "friday_open", "weekend_open", "random_smalltalk", "nothing_logged_afternoon"];
const FOOD = ["food_first_log", "food_logged", "meal_plan_meal_logged"];

// Phase lines replace Tom's normal lines for these triggers, with the given chance.
export const TOM_PHASES = {
  early: { chance: 0.25, triggers: OPENS, lines: [
    "Love November. Leaves changing. Nice weather. Nothing ominous whatsoever.",
    "Beautiful fall weather, huh?",
    "Lot of turkey decorations around lately.",
  ] },
  mid: { chance: 0.4, triggers: OPENS, lines: [
    "Why are grocery stores stocking so much butter? Interesting. Probably unrelated. Right?",
    "Why does everyone suddenly own sage?",
    "Lot of turkey-related advertising lately.",
  ] },
  week: { chance: 0.65, triggers: OPENS, lines: [
    "Buddy. Things are getting weird.",
    "I saw a roasting pan. Keep your head down.",
    "They're buying cranberries. Something's happening.",
    "Buddy. Stay calm. Things are getting weird.",
    "The grocery stores are packed. Cranberries everywhere. This is coordinated.",
    "I saw someone carrying THREE sticks of butter. THREE. Nobody needs that much butter casually.",
    "Grandmothers are arriving. This is bad. They brought casserole dishes. VERY BAD.",
    "I heard the phrase 'family recipe.' We're entering dangerous territory.",
    "Someone said 'thawing.' I left immediately.",
    "Do you own a roasting pan? Answer carefully.",
    "Why is there twine in the kitchen? Kitchen twine? WHAT IS KITCHEN TWINE? Never mind. I don't want to know.",
    "I've relocated. Can't say where. Whiskers is asking questions. Tell him nothing.",
    "WHY DOES EVERYONE KEEP BUYING BUTTER?",
  ] },
  eve: { chance: 1, triggers: OPENS, lines: [
    "THEY'RE BRINING. I REPEAT. THEY'RE BRINING.",
    "THIS IS NOT A DRILL. THEY'RE PREHEATING. I REPEAT: PREHEATING.",
    "THE BRINES HAVE BEEN DEPLOYED. Butter activity is at historic levels.",
    "Grandma arrived. It's happening.",
    "I've packed a bag. My name is Tim now. You have never met Tom.",
    "Destroy our messages.",
    "Tell my family I— actually don't tell them where I am. I have entered witness protection.",
    "Gobble gobble. DAMN IT.",
    "HOW FAST CAN YOU RUN?",
  ] },
  day: { chance: 1, triggers: [...OPENS, ...FOOD], lines: [
    "Keep your voice down. I'm in an undisclosed location.",
    "I'm hiding. No windows. No ovens. We're good.",
    "Do NOT open the oven.",
    "If anyone asks, I'm a peacock.",
    "Tell Whiskers NOTHING.",
    "Survive the day. We'll talk tomorrow.",
    "How's your day? DON'T ANSWER THAT.",
    "Do not describe dinner. We can discuss literally anything else. Football? Weather? Protein goals tomorrow? Anything.",
    "If anyone asks, you don't know me. My name is Timothy Peacock.",
    "Tell Whiskers I'm overseas. Tell Coach Dad thanks for everything. Tell Drill Sergeant the perimeter failed.",
    "Tell Hype Bestie to STOP POSTING MY LOCATION.",
    "DJ Gains playing 'Another One Bites the Dust' is NOT HELPING.",
    "Ricky says he has a private jet. I asked to see it. He changed the subject.",
    "Surfer Dude's van is looking increasingly reasonable.",
  ] },
  // Thanksgiving Day + any over-calorie moment: the holiday food philosophy
  dayOver: { chance: 1, triggers: ["calories_over_small", "calories_over_large", "calories_hit"], lines: [
    "It's one meal, buddy. Enjoy your life. …Just don't tell me what's on the plate.",
    "Enjoy Thanksgiving. Eat what you like. You don't need to earn dinner.",
    "You don't need punishment cardio tomorrow. Enjoy the people. Enjoy the food. Then return to your normal routine.",
    "One big meal isn't a moral failure. Back to normal tomorrow. Just maybe don't tell me what's on your plate.",
  ] },
  after: { chance: 1, triggers: OPENS, lines: [
    "... Hello? Is it safe? Buddy?",
    "...I made it. WE MADE IT.",
    "I'M ALIVE. I KNEW WE'D MAKE IT. I absolutely did not know we'd make it.",
    "Is it over? Check the calendar. Nobody move.",
    "November tried. Tom survived.",
    "Black Friday? Fine. I'll take a fistfight over a television before I deal with another roasting pan.",
    "We're almost at December. Stay focused.",
  ] },
  dec1: { chance: 1, triggers: OPENS, lines: [
    "December. Beautiful, beautiful December. Santa's problem now.",
  ] },
};
