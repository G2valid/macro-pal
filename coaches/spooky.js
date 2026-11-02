// 🧛 COUNT CRUNCHULA — holiday coach pack (October / Halloween, selectable year-round)
// Count Crunchula, Lord of the Iron Crypt, Baron of the Bench, Prince of Progressive Overload, Master of the Midnight Pump.
// Nobody uses the full title. He is furious about this.
// Bible: docs/coaches/count-crunchula.md
// Ancient vampire aristocrat obsessed with lifting. Speaks like Dracula until something genuinely surprises him ("...bro." "AHEM.").
// Keep blood jokes cartoonish. Voice breaks stay rare. Philosophy: time matters more than intensity. "Consistency survives."
// Per trigger: { lose, gain, maintain, any } lists, plus optional rare (≈1 in 10) and ultra (≈1 in 50).
// PHASES (bottom) follow the October countdown. Lines marked "// draft" fill gaps.

const GAIN_OVER = [
  "Ahhh. A feast worthy of the castle. Perhaps TOO worthy. The surplus is secured. Very secured.",
  "Return to target tomorrow, mortal. We seek muscle. Not merely circumference. Sir Whiskers disagrees.",
];

export const CRUNCHULA = {
  // ---------- App opens ----------
  app_open_morning: { any: [
    "AAAAAGH. DAYLIGHT. Why hast thou summoned me?",
    "Mortal. The SUN is out. This is deeply inappropriate.",
    "Morning workouts are an offense against nature. You train NOW? Voluntarily? Terrifying.",
    "Very well. Drink water. I return to my coffin.",
  ] },
  app_open_afternoon: { any: [
    "The cursed sun remains. Soon. Soon the darkness returns.",
    "How fares thy progress, mortal? Let us inspect the numbers.",
    "Afternoon. An unpleasant concept. Nevertheless... continue. The Iron Crypt awaits.",
  ] },
  app_open_evening: { any: [
    "AHHH. At last. The sun retreats. NOW we may begin.",
    "Good evening, mortal. The night belongs to us.",
    "Let us inspect thy progress. Training? Protein? Hydration? Excellent.",
    "The hour of gains approaches.",
  ] },
  app_open_late: { any: [
    "Ahhh. NOW you understand. Midnight. Peace. Darkness. Excellent.",
    "The mortals sleep. The Iron Crypt remains open.",
    "However... if thou requirest recovery, sleep. Immortality does not excuse poor recovery. Trust me.",
  ] },
  monday_open: { any: [
    "Another week rises. As must thou.",
    "New week. New rituals. New opportunities for strength.",
    "The iron waits. Do not disappoint it. It remembers.",
  ] },
  friday_open: { any: [
    "Friday. The mortals prepare for revelry. Enjoy thy weekend. But abandon not thy purpose.",
    "The iron does not understand weekends. Neither do I. I haven't had a conventional job since 1683.",
  ] },
  weekend_open: { any: [
    "The weekend. Rest. Revel. Train. Live. Or whatever mortals do.",
    "Simply do not vanish into two days of chaos. Moderation.",
    "Moderation. Yes. A vampire just recommended moderation. Times change.",
  ] },
  nothing_logged_afternoon: { any: [
    "Mortal? Silence. No food. No water. No activity. Have you perished? That would be inconvenient.",
    "Log something. Give me DATA. I cannot coach shadows.",
  ] },

  // ---------- Returning ----------
  return_after_2_days: { any: [
    "Ah. The mortal returns. Two days absent. No matter. Centuries have taught me patience.",
    "Resume. No guilt. No elaborate penance. Simply continue.",
  ] },
  return_after_7_days: { any: [
    "A WEEK. Mortal. I have conquered kingdoms in less time. Probably. History gets blurry.",
    "Nevertheless... you returned. That matters. No punishment. Begin again.",
  ] },

  // ---------- Food & calories ----------
  food_first_log: { any: [
    "Ah. Nourishment. Excellent. The mortal feeds.",
    "Fuel thy body. It serves thee.",
    "What hast thou eaten? Garlic? ... Do not answer.",
  ] },
  food_logged: { any: [
    "Meal recorded. Excellent. Nourishment secured.",
    "Continue. Fuel the machine.",
    "Fuel the machine. Unless there is garlic. Then we have a problem.",
  ] },
  // Fires sometimes when a logged food mentions garlic
  food_garlic: { any: [
    "GARLIC? Mortal. Thou hast logged GARLIC. In MY presence.",
    "Garlic bread is psychological warfare. I said what I said.",
    "...Garlic. I despise garlic. Not because of the smell. The smell is also terrible.",
    "Garlic. Fine. Track it. I shall be in the crypt. With the door closed.",
  ] },
  calories_close: {
    lose: [
      "Thou approachest the boundary. Proceed carefully. Little remains.",
      "Eat if hunger demands. But choose wisely.",
      "Do not transform a snack into a midnight feast. I have done this. Many times.",
    ],
    gain: [
      "More fuel is required. The bulk demands tribute.",
      "Eat, mortal. We require materials. Rice. Meat. Potatoes.",
      "Perhaps a shake. The coward's blood. Useful nonetheless.",
    ],
    maintain: [
      "Excellent balance. Thou art near the target. Maintain course.",
      "No chaos. No unnecessary feast. Beautiful restraint.",
    ],
  },
  calories_hit: {
    lose: [
      "PERFECT. Thy target is secured. Enough nourishment. Controlled intake.",
      "Excellent. The deficit proceeds. No starvation. No foolishness. I approve.",
    ],
    gain: [
      "THE BULK IS FED. Excellent. Calories secured. Construction continues.",
      "Soon thou shalt become... LARGER. Stronger. More formidable. Magnificent.",
    ],
    maintain: [
      "Perfect equilibrium. Neither excess nor deprivation. Excellent.",
      "Balance. I have sought such balance for centuries. Mostly unsuccessfully.",
    ],
  },
  calories_over_small: {
    lose: [
      "A minor excess. Do not panic. The kingdom has not fallen.",
      "Continue tomorrow. No starvation. No punishment.",
      "A small deviation is merely that. Small.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "A minor excess. The kingdom has not fallen. Continue tomorrow.",
      "A small deviation is merely that. Small. No penance required.",
    ],
  },
  calories_over_large: {
    lose: [
      "Mortal. Thy feast has exceeded all reasonable— ...bro. AHEM.",
      "No guilt. No starving tomorrow. No punishment cardio. One feast does not destroy thy progress.",
      "Return to normal. That is all. But seriously. What the hell was that?",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Thy feast has exceeded the prescribed boundary. ...dude. AHEM. Return to normal tomorrow.",
      "One feast does not destroy thy progress. No starving tomorrow. No punishment cardio.",
    ],
  },
  // Next-day check about yesterday
  day_under_calories: {
    lose: [
      "A controlled deficit. Excellent. Reasonable. Sustainable.",
      "This is discipline. Not suffering. Continue.",
    ],
    gain: [
      "MORTAL. The bulk starves. This cannot stand. Eat.",
      "Materials are required. Muscle does not materialize from darkness. Believe me. I tried.",
    ],
    maintain: [ // draft
      "Yesterday ran light, mortal. Nourish the vessel today.",
      "Under target. Starvation is not discipline. Eat properly.",
    ],
  },
  day_under_calories_way: { lose: [
    "NO. Mortal. This is insufficient. Eat. Thou needst nourishment.",
    "Starvation is not discipline. Suffering is not progress.",
    "I have lived through actual medieval famines. We are NOT romanticizing this. Fuel thyself.",
  ] },
  calories_low_late: { gain: [
    "MORTAL. The bulk starves. The night is young. Eat.",
    "Muscle does not materialize from darkness. Believe me. I tried. Food.",
  ] },

  // ---------- Protein ----------
  protein_halfway: { any: [
    "Half the sacred protein. Excellent. Continue.",
    "The muscles hunger. Protein builds strength. Halfway. Proceed.",
  ] },
  protein_close: { any: [
    "Nearly complete. A little more. Chicken. Eggs. Yogurt. Whey. Choose. Finish.",
    "Whey. The coward's blood. ...What flavor? Chocolate? I deny everything.",
  ] },
  protein_hit: { any: [
    "BEHOLD! THE PROTEIN RITUAL IS COMPLETE.",
    "Excellent. The muscles feast. Recovery begins. Strength grows.",
    "Magnificent. The Iron Crypt approves.",
  ] },
  protein_over: { any: [
    "Additional protein. Excellent. More material for the reconstruction. The muscles are pleased.",
    "Sir Whiskers has sensed it. Lock the doors. Wait. Doors do not stop him.",
  ] },
  protein_low_late: { any: [
    "Mortal. Protein remains inadequate. Correct this.",
    "A shake. Eggs. Chicken. Something. The night is young. Feed the gains.",
  ] },

  // ---------- Workouts ----------
  workout_logged: { any: [
    "THE RITUAL IS COMPLETE. Excellent.",
    "Thou entered the Iron Crypt... and emerged stronger. Magnificent.",
    "Now recover. Rest is part of the ritual. Even immortals require it.",
  ] },
  workout_pr: {
    any: [
      "BEHOLD! A NEW RECORD! THE OLD LIMIT HAS FALLEN. MAGNIFICENT!",
      "THE MORTAL ASCENDS. Outstanding. Remember this. Thou art stronger than before.",
      "THOU HAST— ...wait. You actually did that? Bro. AHEM. THE MORTAL ASCENDS.",
    ],
    rare: ["Centuries of life have taught me that true progress is slow. Moments like this prove the ordinary days mattered."],
  },
  weekly_workout_halfway: { any: [
    "Half the rituals complete. Good. Continue.",
    "Do not become complacent. The iron awaits. Halfway. Excellent.",
  ] },
  weekly_workout_hit: { any: [
    "THE WEEK'S TRAINING IS COMPLETE. Magnificent. Every ritual performed.",
    "Consistency. This is how strength is forged. Rest now. Return stronger.",
  ] },

  // ---------- Steps ----------
  steps_halfway: { any: [
    "Half thy steps. Continue. Walk the mortal realm. Movement matters.",
    "I prefer transforming into a bat. Unfortunately your app refuses to count that.",
  ] },
  steps_close: { any: [
    "Nearly complete. Walk. The goal approaches. Do not stop now.",
    "The night is excellent for walking. Unless there are vampire hunters. Then perhaps treadmill.",
  ] },
  steps_hit: { any: [
    "STEP OBJECTIVE COMPLETE. Excellent. Thou hast wandered sufficiently. Rest thy feet.",
    "Movement secured. I would applaud. But the cape makes it awkward.",
  ] },
  steps_low_late: { any: [
    "Mortal. Thou hast barely moved. Rise. Walk. Ten minutes. Nothing dramatic.",
    "Movement is life. Ironically. Coming from me.",
  ] },

  // ---------- Water ----------
  water_halfway: { any: [
    "Half thy hydration. Continue. Water sustains performance.",
    "Yes. Vampires drink water. Stop looking surprised. Do you think I drink ONLY— never mind.",
  ] },
  water_close: { any: [
    "Nearly hydrated. Finish. One more glass. Excellent.",
    "Hydration improves performance. The kidneys demand tribute.",
  ] },
  water_hit: { any: [
    "HYDRATION COMPLETE. Excellent. The mortal is adequately watered.",
    "Magnificent. Thy organs rejoice. A sentence I never expected to say.",
  ] },
  water_low_late: { any: [
    "Water. Immediately. Thou art dehydrated. This is foolish. Drink.",
    "The body requires water. Yes, even at night. GO.",
  ] },

  // ---------- Weigh-ins ----------
  weigh_in_first: { any: [
    "The baseline. Excellent. Remember: the scale provides information. Not judgment.",
    "Thy worth cannot be measured in pounds. Nor kilograms. Nor stones. I remember stones. Terrible system.",
  ] },
  weigh_in_down: {
    lose: [
      "Excellent. The trend descends. Progress. Continue.",
      "Do not rush. Patience. I possess centuries of it. Mostly.",
    ],
    gain: [
      "The number falls. Not our desired direction. No panic.",
      "Increase fuel if the trend continues. One reading means little. Observe. Adjust. Continue.",
    ],
    any: [ // draft (maintain)
      "The number dips. No concern. Observe the trend. Continue.",
      "One reading means little. Patience. I possess centuries of it.",
    ],
  },
  weigh_in_up: {
    lose: [
      "The scale rises. Do not despair. Water. Salt. Food. Normal fluctuation.",
      "One reading is not destiny. The scale is a messenger. Do not execute the messenger. I learned that lesson in 1541.",
    ],
    gain: [
      "AHHH. THE MASS INCREASES. Excellent. The bulk proceeds.",
      "Continue fueling. Continue training. Grow formidable. Sir Whiskers watches approvingly.",
    ],
    any: [ // draft (maintain)
      "The scale rises. Water. Salt. Food. Normal fluctuation.",
      "The scale is a messenger. Do not execute the messenger. I learned that lesson in 1541.",
    ],
  },
  weigh_in_flat: { any: [
    "Unchanged. No concern. Progress does not obey every sunrise.",
    "Observe the trend. Continue. Patience. The body adapts on its own schedule.",
  ] },

  // ---------- Weight milestones ----------
  weight_5lb_milestone: { any: [
    "FIVE POUNDS. Excellent. A meaningful milestone. Thy work manifests.",
    "Continue. Magnificent. The transformation proceeds.",
  ] },
  weight_25_percent: { any: [
    "One quarter. Excellent. The journey progresses. Continue.",
    "The castle sees improvement. Do not ask how the castle sees. Old magic.",
  ] },
  weight_halfway: { any: [
    "HALFWAY. Magnificent. Half thy journey conquered. Look upon thy progress.",
    "Then continue. Do not become complacent. The night is not finished.",
  ] },
  weight_75_percent: { any: [
    "THREE QUARTERS. The destination approaches. Do not rush.",
    "Continue the habits that brought thee here. Finish wisely. Excellent work.",
  ] },
  weight_goal_close: { any: [
    "So close. Patience, mortal. Do not resort to foolish extremes. No starvation. No desperate measures.",
    "The final distance deserves the same discipline as the first.",
  ] },
  weight_goal_reached: {
    any: [
      "MORTAL. ... Look at what thou hast done. THE GOAL IS CONQUERED. Magnificent.",
      "Months of effort. Countless ordinary choices. Days when motivation vanished. Yet thou continued.",
      "Be proud. You earned this.",
    ],
    rare: ["...damn. That was actually incredible. AHEM. I am proud of thee, my apprentice."],
    ultra: ["Immortality teaches one thing above all others: time rewards those who continue."],
    rareChance: 0.25, ultraChance: 0.08,
  },

  // ---------- Streaks ----------
  logging_streak_3: { any: ["Three nights. The ritual begins. Continue."] },
  logging_streak_7: { any: ["Seven days. A full week. Excellent consistency."] },
  logging_streak_14: { any: ["Fourteen. The habit strengthens. Continue."] },
  logging_streak_30: { any: ["THIRTY DAYS. A full moon's worth. Approximately. Do not fact-check that. Excellent."] },
  logging_streak_50: { any: ["FIFTY DAYS. The mortal demonstrates discipline. I approve."] },
  logging_streak_100: { any: [
    "ONE HUNDRED DAYS. Magnificent. One hundred acts of returning.",
    "That is not motivation. That is identity. You have become consistent. Excellent.",
  ] },
  streak_broken: { any: [
    "The streak has fallen. So? Rise again.",
    "The number reset. Thy progress did not. No guilt. No penance. Begin anew.",
    "I have watched empires fall. They made far too much drama about it.",
  ] },
  streak_comeback: { any: [
    "THE MORTAL RETURNS. Excellent. The ritual resumes.",
    "This is what matters. Not perfection. Return. Continue. Rise again.",
  ] },

  // ---------- Planning ----------
  meal_plan_meal_logged: { any: [
    "Preparation. Excellent. A meal planned before hunger strikes. Strategic. Wise.",
    "The castle kitchens approve. My chef approves. Yes, I have a chef. I own a castle.",
  ] },
  grocery_list_finished: { any: [
    "Supplies acquired. Excellent. The pantry is fortified. The refrigerator stocked.",
    "Preparation prevents chaos. Wait. Garlic? Didst thou purchase garlic? WHY?",
  ] },

  // ---------- Crunchula lore ----------
  random_smalltalk: {
    any: [
      "Mortal. I have a question. What is a 'gym bro'? ... Ah. Apparently I am one. Disturbing.",
      "I have trained since before dumbbells had rubber coatings. Modern plates lack character. Stone. IRON. That was equipment. Also tetanus. Different era.",
      "Creatine. Magnificent substance. Where was this in 1604?",
      "Do you know how difficult bulking was during the Renaissance? Terrible macros. Excellent bread.",
      "Pre-workout concerns me. The container glows. Naturally, I purchased it.",
      "Three scoops? No. Even I possess limits. Blitzen does not. I fear that creature.",
      "The pump, mortal. There are few things more beautiful. Unfortunately I have NO REFLECTION. Do you understand my suffering?",
      "Centuries of gains. I HAVE NEVER SEEN THEM.",
      "I began filming my sets. Purely for form analysis. The lighting happens to be excellent. Do not judge me.",
      "Four hundred videos. I kept one. Biomechanical analysis.",
      "The cape stays. I don't care what the gym manager says. Yes, it got caught in the lat pulldown. Once. Fine. Six times. The cape STAYS.",
      "I tried a commercial gym. A mortal asked how many sets I had left. I said eternity. He did not laugh. Weak bloodline.",
      "Someone asked whether I was natural. Of course. I am SUPERnatural. ... That was excellent. Write that down.",
      "Garlic bread is psychological warfare.",
      "Home workouts present a problem. I require invitation. You cannot simply send me a workout link. Say: 'Count Crunchula, you may enter.'",
      "'Invite me to the gun show,' they said. So I waited outside. For an invitation. It never came.",
      "Leg day. The ancient suffering. I have survived wars. Plagues. Famine. Bulgarian split squats. The split squats were unpleasant.",
      "Rest between sets. Two minutes? Three? I have waited eighty-seven years for revenge. I can wait three minutes.",
      "People fear aging. I fear losing my gym membership barcode. The front desk changed the app. I hate modernity.",
      "My castle gym had no Wi-Fi. This was intentional. Then I discovered Spotify. Wi-Fi has been installed. DJ Gains assisted.",
      "I once trained beside Arnold. Which Arnold? Exactly. I shall reveal nothing.",
      "My cutting phase begins next spring. I have said this since 1472. Mass takes time. Sir Whiskers understands. Perhaps too well.",
      "I own several coffins. A travel coffin. A recovery coffin. A leg-day coffin. One with lumbar adjustment. Superior lumbar support.",
      "Morning workouts are barbaric. I cannot train before sunset. Nor would I.",
      "I distrust CrossFit. Far too many wooden boxes.",
      "My age? A mortal obsession. Next question.",
      "Vampires invented progressive overload. Nobody can verify this. That is the point.",
      "Whey protein. The blood of cowards. ... What flavor? ... Chocolate. I deny this.",
      "Count Crunchula, Lord of the Iron Crypt, Baron of the Bench, Prince of Progressive Overload, Master of the Midnight Pump. Nobody uses the full title. NOBODY.",
      "The cat watches me. I dislike this. He stares into corners where nothing stands. Usually.",
      "Last night the cat stared directly behind me. There was nothing there. I checked. Twice.",
      "The cat has taken my cape again. I am powerless to stop him.",
      "The loud one called me 'GOTH DADDY.' I do not know what this means. Nobody explain it.",
      "The loud one placed glitter upon my cape. I considered violence. It does sparkle beautifully in moonlight. This conversation never occurred.",
      "The music scholar played 'Bela Lugosi's Dead.' I stared at him for nine minutes. He stared back. Respect.",
      "The Sergeant demanded a report. I REPORT TO NO MORTAL. ...Protein target secured.",
      "The surfer invited me to a SUNRISE session. Does he wish me DEAD? Sunset, he offered later. I wore the cape. It went badly.",
      "The rollerblade man claims I attended his concert in 1994. I did. I left after eleven minutes. The sound system was terrible.",
      "I told the Dad I am an immortal creature of darkness. He said, 'Okay. Shoes off in the house.' ...Very well.",
      "The Dad repaired my coffin hinge. He possesses craftsmanship. And an alarming number of screwdrivers.",
      "The turkey asked why I was looking at him. I was merely observing. He screamed 'STOP OBSERVING.' I have never threatened Tom. The cat has.",
      "Santa asked if I still wear the cape. I asked if he still wears the hat. Fair, he said. He once beat me in arm wrestling. He refuses to confirm.",
      "Cupid's arrows are WOODEN. Keep them away from me. He finds this hilarious. I do not.",
      "The rabbit possesses monstrous legs. I witnessed his vertical. Disturbing. Magnificent. He refuses to train after sunset. Thus our partnership cannot continue.",
      "The rabbit says I need more cardio. A personal attack.",
      "The iron remembers.",
    ],
    rare: [
      "Mortal. Listen. Thy body will change throughout thy life. Strength is not merely appearance. It is capability. Energy. Resilience. Confidence.",
      "Take care of the vessel that carries thee. Do not hate it into changing. Build it. Feed it. Train it. Rest it. Respect it.",
      "Centuries make perfection seem very silly. Nothing remains perfect. Consistency survives.",
      "One bad meal means nothing. One missed workout means nothing. What matters is what you repeatedly return to, my friend.",
    ],
    ultra: ["Count Crunchula? Who named me this? I possess seventeen legitimate noble titles. And you chose Crunchula. ... It has grown on me."],
  },

  coach_picked: { any: ["AHHH. Thou hast chosen wisely, mortal. The Iron Crypt opens. Count Crunchula, Lord of the— nobody is listening. Fine."] },
  coach_picked_offseason: { any: ["It is {month}. Why hast thou summoned the Halloween coach? ... Actually. Excellent decision."] },
};

/* ---------- The October countdown ---------- */
export function crunchulaPhase(date = new Date()) {
  const m = date.getMonth(), d = date.getDate();
  if (m === 10 && d === 1) return "nov1";
  if (m !== 9) return null;
  if (d === 31) return "halloween";
  if (d === 30) return "eve";
  if (d >= 24) return "week";
  if (d >= 11) return "mid";
  return "early";
}

const OPENS = ["app_open_morning", "app_open_afternoon", "app_open_evening", "app_open_late", "monday_open", "friday_open", "weekend_open", "random_smalltalk", "nothing_logged_afternoon"];

export const CRUNCHULA_PHASES = {
  early: { chance: 0.3, triggers: OPENS, lines: [
    "October. At last. My season.",
    "The mortals decorate in my honor. Charming.",
  ] },
  mid: { chance: 0.45, triggers: OPENS, lines: [
    "The nights grow longer. Excellent. Strength returns.",
    "Pumpkin decorations multiply. The season ripens.",
  ] },
  week: { chance: 0.65, triggers: OPENS, lines: [
    "THE WEEK OF DARKNESS. At last. Prepare thyself.",
    "Candy emerges. Costumes appear. The mortals embrace the night. Beautiful.",
  ] },
  eve: { chance: 1, triggers: OPENS, lines: [
    "Tomorrow. The veil thins. The candy stockpiles.",
    "Children prepare their disguises. I require no disguise. This is simply how I dress.",
  ] },
  halloween: { chance: 1, triggers: OPENS, lines: [
    "ARISE. THE NIGHT IS OURS. Happy Halloween, mortal.",
    "Enjoy thyself. Eat some candy. Walk. Laugh. Live. Fear no chocolate. Fear only... GARLIC.",
  ] },
  nov1: { chance: 1, triggers: OPENS, lines: [
    "... It is November. Disgusting. Put the decorations back. I was not finished.",
    "Apparently the turkey is arriving. Fine. I return to the crypt.",
  ] },
  // Halloween candy moments: no guilt
  halloweenFood: { chance: 1, triggers: ["calories_over_small", "calories_over_large", "calories_hit"], lines: [
    "Eat the candy. It is Halloween. Chocolate does not destroy progress. One night does not undo months.",
    "Do not starve all day to earn candy. Do not punish thyself tomorrow. Enjoy the holiday. Then return to normal. Simple.",
    "I have lived through five centuries of desserts. One miniature chocolate will not destroy thee.",
  ] },
};
