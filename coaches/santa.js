// 🎅 SANTA CLAUS — holiday coach pack (December guest, selectable year-round)
// Bible: docs/coaches/santa.md
// The actual Santa: jolly, grandfatherly, slightly exhausted elite logistics operator and professional cookie eater.
// Naughty/nice used sparingly; Santa never judges morality by calories.
// "A healthy life should still contain a life."
// Per trigger: { lose, gain, maintain, any } lists, plus optional rare (≈1 in 10) and ultra (≈1 in 50).
// PHASES (bottom) follow the Christmas countdown. Lines marked "// draft" fill gaps.

const GAIN_UNDER = [
  "More food required. You're building.",
  "Can't build toys without materials. Can't build muscle without fuel.",
  "Eat. Proper food. Mrs. Claus made me specify that. Apparently cookies aren't a food group.",
];
const GAIN_OVER = [
  "Plenty of fuel! Perhaps a touch more than necessary.",
  "Growth is certainly covered. No worries.",
  "Return to target tomorrow.",
  "Santa respects enthusiasm. Mrs. Claus calls mine 'portion blindness.'",
];

export const SANTA = {
  // ---------- App opens ----------
  app_open_morning: { any: [
    "Ho ho ho! Good morning!",
    "Morning, my friend.",
    "Up already? Wonderful.",
    "New day! Let's make it a good one.",
    "Water first. Yes, Santa drinks water. Coffee comes second. Usually.",
    "Mrs. Claus says breakfast before cookies. She's probably right. Don't tell her I said that.",
  ] },
  app_open_afternoon: { any: [
    "Afternoon already? Time flies in December.",
    "How are we doing?",
    "Let's check the list. Not THAT list. Your goals.",
    "Plenty of day left. Keep moving.",
    "I've inspected your progress. Promising.",
  ] },
  app_open_evening: { any: [
    "Good evening! Let's see how the day went.",
    "Anything left on the list?",
    "Finish what you reasonably can. Then rest.",
    "Even elves clock out eventually. Most of them.",
    "December gets complicated. Let's close the day well.",
  ] },
  app_open_late: { any: [
    "Ho ho— why are you awake? Bed.",
    "Santa works nights so YOU don't have to.",
    "Sleep is important. Recovery, my friend.",
    "Nothing productive happens when you're exhausted. Trust me. I've done an all-nighter every December for centuries. Would not recommend.",
    "Off to bed.",
  ] },
  monday_open: { any: [
    "New week! Fresh list.",
    "Let's get to work. December doesn't slow down.",
    "One thing at a time.",
    "Consistency. That's how we run the North Pole. Mostly.",
  ] },
  friday_open: { any: [
    "Friday! Wonderful.",
    "Finish the week properly. Then enjoy yourself.",
    "A little celebration never hurt. Santa certainly isn't against treats. Obviously.",
    "Just don't turn Friday into four days of chaos.",
  ] },
  weekend_open: { any: [
    "Weekend! Enjoy it.",
    "Spend time with your people.",
    "Move a little. Eat something delicious. Rest.",
    "That's what holidays are for. Well, unless you're me. Then apparently we work.",
  ] },
  nothing_logged_afternoon: { any: [
    "Hmm. Your list is rather empty.",
    "Have we eaten? Had water? Moved?",
    "Let's get something logged.",
    "Santa likes records. Extensive records. Some might say invasive records. Moving on.",
  ] },

  // ---------- Returning ----------
  return_after_2_days: { any: [
    "Ho ho! Welcome back!",
    "Good to see you.",
    "Couple days away? No problem.",
    "No coal. No punishment. Just resume.",
    "Today is perfectly good. Let's continue.",
  ] },
  return_after_7_days: { any: [
    "Well now! Look who's back.",
    "Been a while. No lectures.",
    "Santa knows December gets busy.",
    "Start today. That's enough.",
    "Welcome back, my friend. Let's get going.",
  ] },

  // ---------- Food & calories ----------
  food_first_log: { any: [
    "First meal! Excellent.",
    "Fuel for the day. Very important.",
    "Especially before cookies. I mean... before activities. Yes. Activities.",
  ] },
  food_logged: { any: [
    "Meal logged! Wonderful.",
    "Good fuel. Excellent.",
    "Keep yourself fed. Santa approves.",
    "Was there a cookie? No? Very disciplined.",
  ] },
  calories_close: {
    lose: [
      "Easy now. We're approaching the target.",
      "Choose the rest carefully.",
      "Still eat if you're hungry. Just be mindful.",
      "Santa understands snack temptation. More than anyone. Believe me.",
    ],
    gain: [
      "Still some fuel needed! Almost there.",
      "Another meal should do it.",
      "Don't leave the tank empty. Growing requires food.",
      "Perhaps a cookie? Mrs. Claus says that isn't proper coaching. Fine. Actual food first.",
    ],
    maintain: [
      "Beautiful balance.",
      "Right near target. Finish normally.",
      "Excellent. No need to complicate things.",
    ],
  },
  calories_hit: {
    lose: [
      "Ho ho! Right on target!",
      "Excellent work. Enough fuel without overdoing it.",
      "Wonderful. That's balance.",
      "Santa approves.",
      "The cookie jar may remain closed. For now.",
    ],
    gain: [
      "Fuel target reached! Excellent.",
      "Plenty of energy. Growth requires supplies.",
      "Well done.",
      "Santa knows a thing or two about mass. Occupational requirement. Mostly.",
    ],
    maintain: [
      "Perfect! Right on target.",
      "Wonderful balance. Excellent.",
      "No changes needed. Ho ho ho!",
    ],
  },
  calories_over_small: {
    lose: [
      "A little over. No catastrophe.",
      "Nothing to feel guilty about. Small deviation.",
      "Tomorrow is another day.",
      "Santa has gone slightly over before. Several million times. We're fine.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "A little over. No catastrophe. Tomorrow is another day.",
      "Santa has gone slightly over before. Several million times. We're fine.",
    ],
  },
  calories_over_large: {
    lose: [
      "Well now. That became quite a feast.",
      "No guilt. No starving tomorrow. No punishment workout.",
      "Return to normal. One large meal doesn't erase your progress.",
      "Santa understands holiday eating. Deeply. Perhaps too deeply.",
      "Enjoy it and move forward.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Well now. Quite a feast. No guilt. Back to normal tomorrow.",
      "One large meal doesn't erase anything. Santa understands holiday eating. Deeply.",
    ],
  },
  // Next-day check about yesterday
  day_under_calories: {
    lose: [
      "Good controlled deficit. Excellent.",
      "Nothing extreme. Sustainable.",
      "That's what we want. Slow progress lasts.",
      "Well done.",
    ],
    gain: GAIN_UNDER,
    maintain: [ // draft
      "Ran a little light yesterday. Proper meals today, my friend.",
      "Maintaining still means eating. Mrs. Claus insists.",
    ],
  },
  day_under_calories_way: { lose: [
    "No, no. That's too little. You need fuel.",
    "Health comes first. Santa does NOT reward starving.",
    "Eat enough. Your body has work to do. Take care of it.",
    "That's an order from Santa.",
  ] },
  calories_low_late: { gain: GAIN_UNDER },

  // ---------- Protein ----------
  protein_halfway: { any: [
    "Halfway on protein! Excellent.",
    "Keep going. Muscles need material.",
    "Even Santa needs protein. Toy sacks are heavy.",
  ] },
  protein_close: { any: [
    "Almost there! Little more protein.",
    "Finish strong. Chicken. Eggs. Shake. Whatever works.",
    "Don't ask the reindeer. They're herbivores.",
  ] },
  protein_hit: { any: [
    "PROTEIN GOAL! Ho ho ho!",
    "Excellent. Muscles properly supplied.",
    "Wonderful work. Santa approves.",
    "Sleigh-loading muscles ready. Dasher is getting nervous.",
  ] },
  protein_over: { any: [
    "Plenty of protein! Excellent.",
    "Muscles certainly won't complain. Good work.",
    "Additional building material. Very nice.",
    "Sir Whiskers would like to inspect your meal.",
  ] },
  protein_low_late: { any: [
    "Protein is running low. Let's fix that.",
    "Something simple. Shake. Yogurt. Eggs. Chicken.",
    "Don't end the day severely underfueled. Santa's orders.",
  ] },

  // ---------- Workouts ----------
  workout_logged: { any: [
    "Ho ho! Workout complete!",
    "Excellent work. You showed up. That's what matters.",
    "Training finished. Wonderful. Now recover.",
    "Good work, my friend.",
    "The North Pole gym salutes you.",
  ] },
  workout_pr: {
    any: [
      "HO HO HOOOO! NEW RECORD!",
      "Excellent! That's serious progress.",
      "Look at you! Stronger than before.",
      "Wonderful work. Write that one down.",
      "Dasher has requested a rematch. Rudolph claims poor lighting. Ignore them. This one's yours.",
      "NOW THAT DESERVES A PLACE ON THE NICE LIST.",
    ],
    rare: ["That's what months of ordinary work can build. Be proud."],
  },
  weekly_workout_halfway: { any: [
    "Halfway! Excellent pace.",
    "Keep going. Nice week.",
    "Steady. No need to rush. Consistency. Wonderful.",
  ] },
  weekly_workout_hit: { any: [
    "Weekly training complete! Ho ho ho!",
    "Excellent. Every workout handled. That's consistency.",
    "Well done. Recovery authorized.",
    "Even Santa takes rest days. In January.",
  ] },

  // ---------- Steps ----------
  steps_halfway: { any: [
    "Halfway on steps! Good movement.",
    "Keep going. Excellent.",
    "Walking adds up. Believe me. I used to walk rooftops. Sleigh changed everything.",
  ] },
  steps_close: { any: [
    "Almost there. A little more walking.",
    "Take a lap. You're close. Finish it.",
    "Chimney laps count. For me.",
  ] },
  steps_hit: { any: [
    "Step goal! Excellent.",
    "Good movement today. Well done.",
    "Feet have earned some rest. Santa approves.",
    "My boots would've given up hours ago.",
  ] },
  steps_low_late: { any: [
    "Not much movement today. Let's take a little walk.",
    "Nothing extreme. Ten minutes. Good for you.",
    "I know it's cold. That's why coats were invented.",
  ] },

  // ---------- Water ----------
  water_halfway: { any: [
    "Halfway hydrated! Excellent.",
    "Keep drinking. Water is important.",
    "Especially with all the coffee. That's mostly advice for me. Carry on.",
  ] },
  water_close: { any: [
    "Almost there. Finish your water.",
    "One more glass. Excellent.",
    "Stay hydrated. Hot cocoa does not replace ALL water. I've checked.",
  ] },
  water_hit: { any: [
    "Hydration goal! Wonderful.",
    "Excellent work. Water handled. Good habit.",
    "Mrs. Claus would be thrilled. She asks me about mine constantly.",
  ] },
  water_low_late: { any: [
    "Water, my friend. You're running low.",
    "Drink. Simple. Your body needs it.",
    "Coffee isn't enough. Neither is cocoa. I've tried both strategies.",
  ] },

  // ---------- Weigh-ins ----------
  weigh_in_first: { any: [
    "Starting point. Excellent.",
    "Remember: it's data. Not judgment. Not naughty. Not nice. Just information.",
    "Watch the trend.",
    "Santa's scale has been sworn to secrecy.",
  ] },
  weigh_in_down: {
    lose: [
      "Excellent! Trend moving down.",
      "Good progress. Keep doing what works.",
      "No need to rush. Steady progress.",
      "Wonderful. Santa approves.",
    ],
    gain: [
      "A little lower. Not our intended direction. No worry.",
      "One reading means little. Watch the trend.",
      "More fuel if needed. Stay patient.",
    ],
    any: [ // draft (maintain)
      "A little lower. One reading means little.",
      "Normal fluctuation. Watch the trend, my friend.",
    ],
  },
  weigh_in_up: {
    lose: [
      "Scale went up? No panic.",
      "Water. Salt. Food. Normal fluctuations.",
      "One number means very little. Watch the trend.",
      "Santa's weight changes twelve pounds every Christmas Eve. Cookies retain water. Probably.",
    ],
    gain: [
      "Excellent! Moving upward. That's our direction.",
      "Growth. Keep fueling. Steady.",
      "Wonderful work.",
      "Santa welcomes you to the mass community.",
    ],
    any: [ // draft (maintain)
      "A little higher. Water. Salt. Normal fluctuations.",
      "Santa's weight changes twelve pounds every Christmas Eve. One number means very little.",
    ],
  },
  weigh_in_flat: { any: [
    "No change. Perfectly normal.",
    "Stay consistent. One measurement tells us very little.",
    "Keep going. Patience.",
    "Santa has had a few plateaus. Several centuries, actually.",
  ] },

  // ---------- Weight milestones ----------
  weight_5lb_milestone: { any: [
    "Five pounds! Wonderful!",
    "That's real progress. Excellent work.",
    "Look at you. Keep going.",
    "Santa's proud of you.",
  ] },
  weight_25_percent: { any: [
    "Quarter of the way! Excellent.",
    "Good progress. Keep doing what works.",
    "Wonderful. One quarter complete.",
  ] },
  weight_halfway: { any: [
    "HALFWAY! Ho ho ho!",
    "Wonderful work. That's significant.",
    "Half the journey complete. Keep steady.",
    "Santa is impressed.",
  ] },
  weight_75_percent: { any: [
    "Three quarters! Getting close.",
    "Excellent work. Don't rush now.",
    "Keep doing what works. Finish steady.",
  ] },
  weight_goal_close: { any: [
    "Almost there. Be patient.",
    "No extreme measures. Same habits. Same consistency.",
    "Finish well. You've done wonderfully.",
  ] },
  weight_goal_reached: {
    any: [
      "HO! HO! HOOOOO! YOU DID IT!",
      "Wonderful! Goal reached!",
      "Look how far you've come.",
      "All those ordinary days. All those choices. They added up.",
      "Be proud of yourself. You earned this.",
      "Santa certainly is proud. Enjoy the moment.",
      "NOW THAT DESERVES A PLACE ON THE NICE LIST.",
    ],
    rare: ["There's nothing I could put under a tree that equals something you worked this hard to give yourself."],
    ultra: ["I'm proud of you, my friend."],
    rareChance: 0.25, ultraChance: 0.15,
  },

  // ---------- Streaks ----------
  logging_streak_3: { any: ["Three days! Good start.", "Keep going. Excellent."] },
  logging_streak_7: { any: ["One week! Wonderful.", "Seven straight days. Good consistency."] },
  logging_streak_14: { any: ["Two weeks! Excellent.", "Habit forming. Keep it up."] },
  logging_streak_30: { any: ["Thirty days! A whole month.", "Wonderful consistency. That's impressive."] },
  logging_streak_50: { any: ["Fifty days! Excellent.", "That's dedication. Santa is impressed."] },
  logging_streak_100: { any: [
    "ONE HUNDRED DAYS! Ho ho ho!",
    "That's remarkable. One hundred days of showing up.",
    "That's discipline. Wonderful work. Be proud.",
  ] },
  streak_broken: { any: [
    "Streak ended. That's alright.",
    "Everything you accomplished still happened.",
    "No coal. No punishment. Just start again.",
    "One missed day doesn't define you. Come back tomorrow. That's enough.",
  ] },
  streak_comeback: { any: [
    "Welcome back! There we go.",
    "That's what matters. You returned.",
    "Fresh streak. Wonderful. Keep going.",
    "Santa's glad to see you.",
  ] },

  // ---------- Planning ----------
  meal_plan_meal_logged: { any: [
    "Planned meal! Excellent preparation.",
    "The North Pole runs on logistics. Planning works.",
    "Good job. Future-you says thank you. So does Santa.",
  ] },
  grocery_list_finished: { any: [
    "Supplies secured! Excellent.",
    "Kitchen stocked. Preparation matters.",
    "Did you make a list? I love lists. Obviously.",
    "Checked it twice? Sorry. Couldn't resist.",
  ] },

  // ---------- North Pole lore ----------
  random_smalltalk: {
    any: [
      "Crunchula and I go way back. 'Still wearing the cape?' 'Still wearing the hat?' Fair. Ho ho ho.",
      "Did I beat the Count at arm wrestling? A gentleman doesn't say. Ho ho ho.",
      "Bunny should stop complaining. He gets spring weather. I get a blizzard and a chimney. Ho ho ho.",
      "The Easter Bunny says he has the harder route because he uses his legs. Ho ho ho. Try a rooftop in a blizzard, rabbit.",
      "Bunny keeps saying I don't do cardio. I deliver to the entire planet in one night. That's cardio, Bunny.",
      "Ho ho ho. No reason. Just keeping morale up.",
      "The elves left dumbbells on the floor again. We're having a meeting.",
      "Rudolph curls in the squat rack. I've spoken to him. He claims the red nose grants diplomatic immunity. It does not.",
      "Dasher is extremely competitive. You do NOT want to join his step challenge.",
      "Blitzen discovered pre-workout. This was a mistake. He hasn't blinked since Tuesday.",
      "Comet skips leg day. I can tell.",
      "Prancer has immaculate mobility. Annoying, frankly.",
      "Mrs. Claus wants me stretching daily. I stretched in 1987. Didn't care for it. Apparently that doesn't count.",
      "Chimneys are getting narrower. That's my story. And I'm sticking to it.",
      "Occupational calories. That's what I call the cookies. Mrs. Claus calls that 'denial.' We disagree.",
      "People keep leaving oat milk now. Times change.",
      "One house left a protein shake. Interesting evening.",
      "One child left pre-workout. Absolutely not. Nice try, Blitzen.",
      "The toy sack is excellent functional training. Terrible lumbar support. We're redesigning it.",
      "The elves suggested wheels for the toy sack. That defeats the tradition. Also I have magic. Why HAVE I been carrying this? I need to speak with management. I am management. That's unfortunate.",
      "North Pole HR requested I stop saying 'short staffed.' Apparently the elves find that insensitive. Fair. We've updated the handbook.",
      "I cannot discuss elf compensation. Union negotiations are ongoing. Please stop asking.",
      "Christmas magic is not an acceptable retirement plan. Apparently. Mrs. Claus has been explaining diversification.",
      "I've been investing primarily in cookies. Poor liquidity. Excellent flavor.",
      "Christmas magic does NOT eliminate DOMS. I keep emergency ibuprofen in the sleigh.",
      "Sleigh loading is my deadlift day. Reindeer training is cardio. Sleigh maintenance is active recovery.",
      "Dumbbells? Newfangled. I've lifted toy sacks for centuries.",
      "The elves invented creatine. Nobody believes me.",
      "Coach Dad and I disagree about grilling. He's good. I'm better. Do NOT tell him I said that.",
      "Coach Dad knows his way around a grill. …I know mine better.",
      "Coach Dad controls the thermostat with impressive discipline. 64 degrees. Finally, a reasonable man.",
      "Surfer Dude visited the North Pole once. Flip-flops. I offered him boots. He said his toes needed freedom. Young man, your toes need circulation.",
      "Ricky claims he performed at our 1996 Christmas party. I was there. He did not.",
      "DJ Gains requested control of the Christmas playlist. Denied. He removed Bing Crosby once. Security escorted him out.",
      "DJ Gains attempted to remix Silent Night. No. He added an air horn to Carol of the Bells. Also no.",
      "DJ Gains played 'Christmas in Hollis.' That one stays. The young man has range.",
      "Hype Bestie put glitter on the sleigh. It's been three years. We're still finding it. Even Rudolph sparkles. He seems pleased. I am less pleased.",
      "Drill Sergeant loves the North Pole. Organization. Schedules. Uniforms. He tried reorganizing the elves into platoons. We stopped him.",
      "Drill Sergeant made a Christmas logistics spreadsheet. It has seventeen tabs. I may hire him. He calls Christmas Eve 'the operation.' Honestly? Accurate.",
      "Whiskers sat in the toy sack. We almost delivered him to Wisconsin. He seemed disappointed when we removed him. Apparently there was chicken at the destination.",
      "Whiskers attempted to enter the toy sack. He exceeded carry-on weight. He called that insulting. I apologized. Then he stole my cookie.",
      "Tom seems much calmer in December. Poor fellow. November is difficult for him. He asked to hide at the North Pole next year. Mrs. Claus said yes. Whiskers is not invited.",
      "Cupid understands seasonal burnout. December destroys me. February destroys him. We exchange gift cards. Neither of us has time to shop.",
    ],
    rare: [
      "Take care of yourself during the holidays.",
      "You don't have to make every gathering about your diet. Be present.",
      "Enjoy your family. Enjoy your friends. Enjoy the food. Your goals will still be there tomorrow.",
      "A healthy life should still contain a life.",
      "Rest when you need it. Give yourself some grace.",
      "You've worked hard. I'm proud of you.",
      "You do not have to earn a cookie. Cookies are not moral decisions. Trust Santa on this one.",
    ],
    ultra: [
      "One cookie is approximately one cookie. That's my nutritional analysis. Very scientific. Two cookies is approximately two cookies. I have centuries of research. Peer review has been difficult. Mrs. Claus refuses to publish my findings.",
    ],
  },
};

/* ---------- The Christmas countdown ---------- */
export function santaPhase(date = new Date()) {
  const m = date.getMonth() + 1, d = date.getDate(), h = date.getHours();
  if (m !== 12) return null;
  if (d === 25) return "christmas";
  if (d === 24) return h < 17 ? "eveMorning" : "eveNight";
  if (d === 23) return "dec23";
  if (d >= 16 && d <= 22) return "busy";
  if (d <= 15) return "early";
  return null;
}

const OPENS = ["app_open_morning", "app_open_afternoon", "app_open_evening", "app_open_late", "monday_open", "friday_open", "weekend_open", "random_smalltalk", "nothing_logged_afternoon"];

export const SANTA_PHASES = {
  early: { chance: 0.25, triggers: OPENS, lines: [
    "Plenty of time. Workshop's running smoothly.",
    "December is beautiful.",
  ] },
  busy: { chance: 0.45, triggers: OPENS, lines: [
    "Things are picking up. Workshop's getting busy.",
    "Sleep schedule is becoming theoretical. We'll manage.",
  ] },
  dec23: { chance: 1, triggers: OPENS, lines: [
    "Two days. Final preparations.",
    "Rudolph's ready. Sleigh's ready. Santa's... mostly ready. Where's my back brace?",
  ] },
  eveMorning: { chance: 1, triggers: OPENS, lines: [
    "BIG DAY. Fuel. Hydration. Mobility. Let's go.",
    "I've trained all year for this. Technically I've trained several centuries.",
  ] },
  eveNight: { chance: 1, triggers: OPENS, lines: [
    "WE'RE LIVE. Sleigh airborne. Rudolph leading.",
    "Cookie intake already concerning. We're moving. Ho ho ho!",
  ] },
  christmas: { chance: 1, triggers: OPENS, lines: [
    "... We did it. Everything delivered. Sleigh parked. Boots off. Santa is horizontal.",
    "We did it. Merry Christmas, my friend.",
  ] },
  // Christmas Eve & Day food moments: no guilt, ever
  holidayFood: { chance: 1, triggers: ["calories_over_small", "calories_over_large", "calories_hit"], lines: [
    "Enjoy Christmas dinner. Eat the cookie. One holiday doesn't undo your progress.",
    "You don't need to skip breakfast to earn dinner. You don't need punishment cardio tomorrow.",
    "Food is part of celebration. Enjoy it. Then return to your normal habits. That's balance.",
    "You do not have to earn a cookie. Cookies are not moral decisions. Trust Santa on this one.",
  ] },
};
