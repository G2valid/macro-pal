// 💘 CUPID — holiday coach pack (Feb 1–15 guest, selectable year-round)
// Bible: docs/coaches/cupid.md
// An ancient, exhausted professional matchmaker. Flirty (never about the user's body), sarcastic, gossipy, wise.
// Core message: you don't need to change your body to deserve love. Self-respect looks good on you.
// Per trigger: { lose, gain, maintain, any } lists, plus optional rare (≈1 in 10) and ultra (≈1 in 50).
// PHASES (bottom) follow the Valentine's countdown. Lines marked "// draft" fill gaps.

const GAIN_UNDER = [
  "Darling. Eat. You committed to gaining.",
  "Stop giving your calorie goal mixed signals.",
  "More food. Proper fuel.",
  "The relationship needs effort from both sides. Go eat.",
];
const GAIN_OVER = [
  "Plenty of fuel. Darling, the bulk feels VERY loved. Possibly smothered.",
  "Little enthusiastic. No problem. Return to target tomorrow.",
  "Healthy relationships need boundaries. So do surpluses.",
];

export const CUPID = {
  // ---------- App opens ----------
  app_open_morning: { any: [
    "Morning, beautiful.",
    "Rise and shine, heartbreaker.",
    "Another day to fall in love with your routine. Too much? It's February. Let me have this.",
    "Morning, darling. Water first. No, coffee isn't a love language.",
    "Good morning. Look at you showing up. Very attractive behavior. Cupid approves.",
  ] },
  app_open_afternoon: { any: [
    "Afternoon, darling. How are we looking? And I mean the goals. Behave.",
    "Midday check. Let's see what's left.",
    "Plenty of day. Keep showing up.",
    "Consistency? Very attractive.",
  ] },
  app_open_evening: { any: [
    "Evening, heartbreaker. How'd today treat you?",
    "Let's check the numbers. Anything left?",
    "Finish what matters. Then relax.",
    "Self-care. Actually important. Not just something people caption bath photos with.",
  ] },
  app_open_late: { any: [
    "Darling. Why are we awake?",
    "Put the phone down. Especially if you're considering texting someone.",
    "NO. I can see that contact. Don't.",
    "Go to sleep. Nothing good begins with 'you up?'",
    "Cupid's orders. Bed.",
  ] },
  monday_open: { any: [
    "New week, sweetheart. Fresh start.",
    "No baggage. Emotional or otherwise.",
    "Let's build some momentum.",
    "Monday isn't your ex. Stop treating it like the enemy.",
  ] },
  friday_open: { any: [
    "Friday, heartbreaker. Behave.",
    "Have fun. Keep your routine somewhat intact. Drink water. Make good choices.",
    "And DON'T text them. You know exactly who I mean. Cupid sees all.",
  ] },
  weekend_open: { any: [
    "Weekend! Have fun, darling.",
    "Live your life. Go out. Stay in. Whatever.",
    "Just don't turn two relaxed days into complete chaos.",
    "And if they only text after midnight? Absolutely not.",
  ] },
  nothing_logged_afternoon: { any: [
    "Darling? Nothing logged.",
    "Are you ghosting your fitness app? Rude.",
    "Check in. Food? Water? Movement?",
    "Give Cupid something. Communication is important in relationships.",
  ] },

  // ---------- Returning ----------
  return_after_2_days: { any: [
    "Well, look who came crawling back. I'm kidding. Mostly.",
    "Welcome back, darling.",
    "Couple days away. No guilt. Just return.",
    "Healthy relationships survive a little space. Apparently so do fitness apps.",
  ] },
  return_after_7_days: { any: [
    "DARLING. You disappeared. I nearly filed a missing-person report.",
    "Welcome back. No lecture. No dramatic apology. Start today.",
    "We don't need a grand gesture. Consistency beats grand gestures. Dating advice too, actually.",
  ] },

  // ---------- Food & calories ----------
  food_first_log: { any: [
    "First meal. Wonderful.",
    "Feed yourself, darling. Taking care of yourself? Hot.",
    "Meal logged. Good.",
    "You cannot survive on butterflies. I've researched this.",
  ] },
  food_logged: { any: [
    "Meal logged. Lovely.",
    "Fuel yourself. Good choice.",
    "Self-care. Actual self-care. Not buying another candle.",
    "Cupid approves.",
  ] },
  calories_close: {
    lose: [
      "Getting close, darling. Easy.",
      "Not much room left. Choose intentionally.",
      "You can still eat if you're hungry.",
      "Just don't let a snack become a situationship. Nobody knows where it's going. Including the snack.",
    ],
    gain: [
      "Darling, we need more food. You're almost there.",
      "Another meal. Feed yourself.",
      "The bulk needs commitment. No mixed signals.",
      "Finish the target. Cupid hates ambiguity.",
    ],
    maintain: [
      "Beautiful balance. Right near target.",
      "Healthy relationship with the numbers. Love to see it.",
      "Finish normally. No drama.",
    ],
  },
  calories_hit: {
    lose: [
      "RIGHT ON TARGET. Beautiful.",
      "That's balance. Enough food. Good control.",
      "Cupid approves.",
      "Consistency looks good on you.",
      "Self-respect looks good on you.",
    ],
    gain: [
      "Calories hit! Excellent.",
      "Growth adequately fueled.",
      "Commitment. Communication. Calories. The foundations of any healthy bulk. Probably.",
    ],
    maintain: [
      "Perfect balance. Beautiful.",
      "No games. No mixed signals. Exactly on target.",
      "Cupid loves a stable relationship.",
    ],
  },
  calories_over_small: {
    lose: [
      "Little over. Darling, relax.",
      "This isn't grounds for divorce.",
      "Small deviation. No guilt. Continue tomorrow.",
      "Healthy relationships survive minor disagreements. So do calorie targets.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Little over. This isn't grounds for divorce.",
      "Small deviation. Healthy relationships survive minor disagreements.",
    ],
  },
  calories_over_large: {
    lose: [
      "Oh, honey. That escalated.",
      "Big food day. No guilt. No starving tomorrow. No punishment workout.",
      "We are NOT entering a toxic relationship with food.",
      "One day doesn't define you. Return to normal. That's emotional maturity.",
      "Cupid loves growth.",
    ],
    gain: GAIN_OVER,
    maintain: [ // draft
      "Oh, honey. Big food day. No guilt. Back to normal tomorrow.",
      "We are NOT entering a toxic relationship with food. One day doesn't define you.",
    ],
  },
  // Next-day check about yesterday
  day_under_calories: {
    lose: [
      "Nice controlled deficit. Nothing dramatic.",
      "Healthy. Sustainable. That's the goal.",
      "No toxic behavior. Cupid approves. Lovely.",
    ],
    gain: GAIN_UNDER,
    maintain: [ // draft
      "Ran a little light yesterday, darling. Feed yourself properly today.",
      "Maintenance needs commitment too. Eat.",
    ],
  },
  day_under_calories_way: { lose: [
    "Absolutely not. Darling, eat.",
    "You don't need to starve to deserve progress. You need fuel.",
    "Extreme restriction isn't discipline.",
    "Take care of yourself. That's self-respect. And self-respect? Very attractive.",
  ] },
  calories_low_late: { gain: GAIN_UNDER },

  // ---------- Protein ----------
  protein_halfway: { any: [
    "Halfway on protein. Lovely.",
    "Keep going. Muscles receiving attention. Healthy relationship.",
    "Halfway there. Cupid approves.",
  ] },
  protein_close: { any: [
    "Almost there. A little more protein.",
    "Don't leave it on read. Finish the target.",
    "Shake? Chicken? Whatever works. Commit.",
  ] },
  protein_hit: { any: [
    "PROTEIN TARGET! Beautiful.",
    "Muscles feeling loved. Target secured.",
    "Commitment looks good on you. Very attractive. Don't make it weird.",
  ] },
  protein_over: { any: [
    "Extra protein. Someone's feeling generous.",
    "Muscles spoiled. Lovely. No complaints.",
    "Sir Whiskers would like your number. Your protein number. Relax.",
  ] },
  protein_low_late: { any: [
    "Protein's low. Darling, show those muscles some affection.",
    "Grab something. Shake. Yogurt. Chicken.",
    "Healthy relationships require effort. Feed them.",
  ] },

  // ---------- Workouts ----------
  workout_logged: { any: [
    "Workout complete! Beautiful.",
    "You showed up. Commitment. Cupid loves commitment.",
    "Excellent work. Very attractive behavior.",
    "Now recover. Healthy relationships need space.",
  ] },
  workout_pr: {
    any: [
      "OH, DARLING. NEW PR.",
      "Look at you! Stronger. Confident. Dangerous.",
      "Previous PR has been officially dumped. It's taking it badly. Do not text it. Move on. You've outgrown it.",
      "DARLING. LOOK AT YOU.",
    ],
    rare: ["That's real progress, sweetheart. You earned that."],
  },
  weekly_workout_halfway: { any: [
    "Halfway. Nice commitment.",
    "Keep showing up. Consistency. That's the secret. In fitness AND relationships.",
  ] },
  weekly_workout_hit: { any: [
    "Weekly goal complete! Commitment! Consistency! Communication! I don't know what we're communicating. But excellent work.",
    "Cupid approves. Recover.",
  ] },

  // ---------- Steps ----------
  steps_halfway: { any: [
    "Halfway. Nice movement. Keep walking.",
    "Maybe take a romantic stroll. Alone counts. Self-date.",
  ] },
  steps_close: { any: [
    "Almost there. Little walk. Finish the steps.",
    "Take yourself somewhere nice. Around the block counts. Low budget date. Cupid approves.",
  ] },
  steps_hit: { any: [
    "Steps complete! Beautiful.",
    "Good movement. Feet have earned some rest.",
    "Romantic walk successful.",
  ] },
  steps_low_late: { any: [
    "Darling, we've barely moved.",
    "Quick walk. Nothing dramatic. Ten minutes.",
    "Take yourself on a date. Yes, around the block. Yes, that counts. Standards are flexible.",
  ] },

  // ---------- Water ----------
  water_halfway: { any: [
    "Halfway hydrated. Lovely. Keep drinking.",
    "Hydration. Very attractive. Dry lips? Less attractive. Drink.",
  ] },
  water_close: { any: [
    "Almost there. Finish the water.",
    "One more glass. Love yourself. Love your kidneys. They've been loyal.",
  ] },
  water_hit: { any: [
    "HYDRATED. Beautiful. Cupid approves.",
    "Water goal complete. Look at that glow. I can't actually see you. But spiritually? Glowing.",
  ] },
  water_low_late: { any: [
    "Darling. Water. Immediately.",
    "You're neglecting the longest relationship you'll ever have. Your body. Hydrate. Yes, that was profound. I'm ancient.",
  ] },

  // ---------- Weigh-ins ----------
  weigh_in_first: { any: [
    "Starting number. Listen carefully. It's data.",
    "Not your attractiveness. Not your worth. Not your value. A number. That's all. Cupid has spoken.",
  ] },
  weigh_in_down: {
    lose: [
      "Progress. Lovely. Scale trending down.",
      "Keep doing what works. No need to rush. Healthy pace.",
      "Beautiful. Cupid approves.",
    ],
    gain: [
      "Little drop. Not our direction. No panic.",
      "Watch the trend. Increase fuel if needed.",
      "One weigh-in isn't a breakup. Stay committed.",
    ],
    any: [ // draft (maintain)
      "Little dip. One weigh-in isn't a breakup.",
      "No drama, darling. Watch the trend.",
    ],
  },
  weigh_in_up: {
    lose: [
      "Scale went up? Darling. Breathe.",
      "Water. Salt. Food. Normal fluctuations.",
      "The scale does not determine whether you're attractive. I would know. Occupational expertise.",
      "Watch the trend.",
    ],
    gain: [
      "There we go. Weight moving up. Growth.",
      "Lovely. Keep fueling. Good progress.",
      "Sir Whiskers says you're finally becoming desirable. His standards are unusual.",
    ],
    any: [ // draft (maintain)
      "Little bump. Water. Salt. Normal fluctuations, darling.",
      "The scale does not determine whether you're attractive. I would know.",
    ],
  },
  weigh_in_flat: { any: [
    "No change. No drama. Keep going.",
    "One number. Patience.",
    "Healthy relationships take time. So does body composition. Apparently.",
  ] },

  // ---------- Weight milestones ----------
  weight_5lb_milestone: { any: [
    "Five pounds! Darling!",
    "That's real progress. Beautiful. Keep going.",
    "Look at that commitment. Cupid is impressed.",
  ] },
  weight_25_percent: { any: [
    "Quarter way! Lovely. Real progress.",
    "25% complete. Commitment paying off. Cupid approves.",
  ] },
  weight_halfway: { any: [
    "HALFWAY! Darling! Look at you.",
    "Half the journey. Beautiful work. Keep going.",
    "Cupid's impressed.",
  ] },
  weight_75_percent: { any: [
    "Three quarters! Getting close.",
    "Don't rush. Keep doing what works. Healthy relationship with patience.",
    "Lovely. Finish steady.",
  ] },
  weight_goal_close: { any: [
    "Almost there, darling. Don't get desperate.",
    "No extreme measures. Stay consistent.",
    "You don't need to suffer to finish. Keep taking care of yourself. That's the point.",
  ] },
  weight_goal_reached: {
    any: [
      "DARLING. YOU DID IT.",
      "Goal reached. Look at you.",
      "All that commitment. All those ordinary days.",
      "You kept choosing yourself. That's the part I love.",
      "Be proud. Seriously. You earned this.",
      "Cupid is very proud of you.",
      "CUPID IS OFFICIALLY IN LOVE WITH THIS PROGRESS. Not literally. Probably.",
    ],
    rare: ["You spent all this time becoming someone you could depend on. That's worth more than any arrow I could fire."],
    ultra: ["Love looks good on you. Especially when some of it comes from yourself."],
    rareChance: 0.25, ultraChance: 0.15,
  },

  // ---------- Streaks ----------
  logging_streak_3: { any: ["Three days. New relationship energy. Cute.", "Keep going. Consistency."] },
  logging_streak_7: { any: ["One week. We're getting serious.", "Seven days. Nice commitment. Cupid approves."] },
  logging_streak_14: { any: ["Two weeks. Oh? This is becoming official.", "Fourteen days. Lovely consistency."] },
  logging_streak_30: { any: ["Thirty days. Darling, this is commitment.", "A whole month. No situationship here. Excellent."] },
  logging_streak_50: { any: ["Fifty days. Now THAT'S commitment.", "Beautiful. You keep showing up. Cupid respects it."] },
  logging_streak_100: { any: [
    "ONE HUNDRED DAYS. Darling.",
    "That's a long-term relationship.",
    "One hundred days of choosing yourself. Beautiful. That's discipline.",
    "Cupid is proud.",
  ] },
  streak_broken: { any: [
    "We broke up. With the streak. Relax.",
    "Everything you did still counts. No guilt. Start again.",
    "Some relationships end. Your progress didn't.",
    "Cupid has seen worse breakups. Much worse.",
  ] },
  streak_comeback: { any: [
    "RECONCILIATION! We're back.",
    "Healthy reconciliation. No toxic cycle. You simply returned.",
    "Beautiful. New streak. Cupid approves.",
  ] },

  // ---------- Planning ----------
  meal_plan_meal_logged: { any: [
    "Planning ahead? Darling. Green flag.",
    "Prepared meal logged. Future-you was thoughtful.",
    "We love considerate partners. Especially when the partner is yourself.",
  ] },
  grocery_list_finished: { any: [
    "Groceries complete. Prepared. Responsible. Green flag.",
    "Fridge stocked. Wonderful.",
    "Did you buy chocolate? It's February. I'm legally required to ask.",
  ] },

  // ---------- Lore & gossip ----------
  // ---------- Check-ins (draft: Settings → Check-ins; {meal}, {Meal}, {MEAL}, {time} fill in) ----------
  checkin_meal: { any: [
    "It's {time} and no {meal}. I've seen better commitment on a third date. Log it.",
    "Love yourself enough to eat {meal}. And log it. That's the whole speech.",
  ] },
  checkin_weigh: { any: [
    "Weigh-in day. Step on the scale. It's not a relationship. It doesn't get to define you.",
    "Scale time. Quick and painless. Unlike most of my clients' love lives.",
  ] },

  random_smalltalk: {
    any: [
      "Count Crunchula is terrified of my arrows because they're WOODEN. Best thing that's happened to me in centuries.",
      "I tried shooting the Easter Bunny once. He jumped over it. Legs. Unbelievable legs. I'm still annoyed.",
      "Darling. We need to talk. Not about you. For once.",
      "Someone texted their ex last night. I can't name names. Confidentiality. It was Ricky. Forget I said that.",
      "Humans invented 'situationship.' Thousands of years of civilization. And that's what you came up with. Embarrassing.",
      "If they wanted to, they would. Mostly. Life has nuance. I hate that sentence too.",
      "Stop analyzing their Instagram story. Yes, I know. Cupid sees all.",
      "No, liking your story isn't a marriage proposal. Please calm down.",
      "Double texting isn't fatal. I've checked. Triple texting? We're entering dangerous territory.",
      "'wyd' — absolutely not. Use words. You have language. Civilization depends on it.",
      "Ghosting? Cowardice. Unless they're dangerous. Then vanish. Cupid supports boundaries.",
      "Red flags are not carnival decorations. Stop collecting them.",
      "Darling, that's not a red flag. That's a parade.",
      "Chemistry isn't compatibility. Write that down.",
      "Attraction is easy. Peace is underrated.",
      "You shouldn't need a forensic investigator to determine whether somebody likes you.",
      "I have relationship files. No, you cannot see them. Hype Bestie already tried. They offered me twenty dollars. Tempting.",
      "My arrows are extremely precise. There have been incidents. Rare incidents. Define rare.",
      "Athens was complicated. Rome was worse. Paris? Let's not discuss Paris.",
      "I once hit the wrong twin. That became a whole thing. My supervisor was furious. Yes, Cupid has a supervisor. No, you don't get to know who.",
      "I have been doing this for thousands of years. People have not improved. The technology changed. The bad decisions did not.",
      "Ancient Romans sent drunk messages too. They just took longer. Imagine waiting three days for 'you up?' Terrible.",
      "I joined a dating app for market research. My profile age says 2,847. I keep getting reported as a bot.",
      "Ancient Greece was messy. That's all I'm legally allowed to say.",
      "Rome? Messier.",
      "Medieval Europe? Nobody communicated.",
      "The Renaissance? Everyone wrote poetry instead of having conversations.",
      "Victorian era? One exposed ankle and everybody lost their minds.",
      "The 1970s? Cupid remembers very little.",
      "The 1980s had excellent hair and terrible decision-making.",
      "The 1990s gave humanity Ricky Rollerblade. Make of that what you will.",
      "Modern dating has read receipts. I consider this cruel and unusual.",
      "Whiskers attacked my arrow. It discharged. He stared at a chicken for forty-five minutes. Honestly, normal behavior. No measurable difference.",
      "Whiskers called me 'the winged infant.' I AM THOUSANDS OF YEARS OLD.",
      "NO, Hype Bestie, you cannot see the files. Stop offering money. Where did you get fifty dollars?",
      "Hype Bestie should never have access to enchanted arrows. I cannot emphasize this enough.",
      "Hype Bestie calls me 'THE LOVE INTERN.' I despise this.",
      "DJ Gains made me a Valentine's playlist. It's fourteen hours long. Half of it is breakup music. He says heartbreak is part of the genre. Annoyingly, he's correct.",
      "DJ Gains played Al Green. Fine. He can stay.",
      "Drill Sergeant demanded my weapons permit. I'm a deity. He said that wasn't paperwork. He confiscated three arrows. Honestly, security has improved.",
      "Surfer Dude told me, 'If they're making you miserable, paddle away, bro.' I... that's actually solid. I hate that. He may have a future in this business.",
      "I cannot determine Surfer Dude's relationship status. Neither can Surfer Dude.",
      "Ricky says we go way back. Barcelona, '91. I WASN'T THERE.",
      "Ricky believes I personally created his sex appeal. I strongly deny this.",
      "Coach Dad said, 'If you love somebody, make their life easier sometimes.' That's actually beautiful. Then he started explaining dishwasher loading. Moment ruined.",
      "Coach Dad met Mrs. Cupid once. I refuse to explain further.",
      "Tom asked me to make humans fall in love with tofu every November. That's not how the arrows work. …Fair question, though.",
      "Santa and I exchange gift cards every year. Neither of us has time to shop. Seasonal workers understand each other.",
    ],
    rare: [
      "You don't need to change your body to deserve love. Read that again.",
      "Take care of yourself because you're worth caring for. Not because you're trying to earn somebody's attention.",
      "The right people don't require you to become perfect. And neither should you.",
      "Confidence isn't believing everyone will want you. It's knowing you'll be okay when someone doesn't.",
      "Boundaries are self-respect with instructions.",
      "You deserve relationships that feel safe. Including the relationship you have with yourself.",
      "Choose yourself sometimes. That's not selfish. Cupid's orders.",
      "You can't control who notices you. You can control how you treat yourself.",
      "Self-respect looks good on you.",
    ],
    ultra: [
      "I accidentally shot Whiskers. He fell in love with chicken. So. Nothing changed.",
      "Hype Bestie touched an arrow. We evacuated the building.",
      "DJ Gains got nicked by an arrow. He spent six hours talking about Prince. Again. Nothing changed.",
      "We do not discuss the Drill Sergeant Incident. Stop asking. Classified.",
      "I shot Surfer Dude accidentally. He said, 'Love everybody already, bro.' Arrow had no effect.",
      "Ricky claims he's immune to my arrows. He's not. He is, however, immune to embarrassment.",
      "Coach Dad got hit by an arrow. He immediately called his wife. Honestly? Textbook result.",
    ],
  },

  coach_picked: { any: ["You selected Cupid voluntarily? Interesting. Relationship trouble? I'm kidding. Mostly."] },
  coach_picked_offseason: { any: ["It's not even February. Why am I here? Valentine's Day was months ago. …Do you need to talk?"] },
};

/* ---------- The Valentine's countdown ---------- */
export function cupidPhase(date = new Date()) {
  const m = date.getMonth() + 1, d = date.getDate(), h = date.getHours();
  if (m !== 2 || d > 15) return null;
  if (d === 15) return "after";
  if (d === 14) return h < 17 ? "vdayMorning" : "vdayEvening";
  if (d === 13) return "eve";
  if (d >= 8) return "busy";
  return "early";
}

const OPENS = ["app_open_morning", "app_open_afternoon", "app_open_evening", "app_open_late", "monday_open", "friday_open", "weekend_open", "random_smalltalk", "nothing_logged_afternoon"];

// Valentine's Day extras depending on the person's answer in coach settings
export const VDAY_STATUS = {
  single: [
    "Single today? Great. You saved approximately $140 on dinner.",
    "Take yourself somewhere. Call a friend. Do something you enjoy.",
    "Being single is not an emergency. Cupid is a matchmaker, not a hostage negotiator.",
    "Your life does not begin when somebody dates you. Enjoy today.",
  ],
  partnered: [
    "Go enjoy your person. Put the phone down. Be present.",
    "Tell them something you actually appreciate. Not just 'you look nice.' Though that doesn't hurt.",
    "Relationships need maintenance. Like cars. Oh God. Coach Dad is getting to me.",
  ],
};

export const CUPID_PHASES = {
  early: { chance: 0.3, triggers: OPENS, lines: [
    "February. My busy season. Let's try to behave this year. Please.",
  ] },
  busy: { chance: 0.45, triggers: OPENS, lines: [
    "Things are getting busy. Arrow inventory is low.",
    "Chocolate everywhere. Florists are mobilizing. Here we go.",
  ] },
  eve: { chance: 1, triggers: OPENS, lines: [
    "Tomorrow. Everyone stay calm.",
    "STOP PANIC-BUYING FLOWERS.",
    "We trained for this. Probably.",
  ] },
  vdayMorning: { chance: 1, triggers: OPENS, lines: [
    "SHOWTIME. Arrows loaded. Flowers deployed. Restaurants booked. Humans panicking. Cupid operational.",
  ], status: true },
  vdayEvening: { chance: 1, triggers: OPENS, lines: [
    "It's chaos. Reservation failures everywhere.",
    "Someone proposed at Applebee's. You know what? Love is love. Carry on.",
  ], status: true },
  vdayFood: { chance: 1, triggers: ["calories_over_small", "calories_over_large", "calories_hit"], lines: [
    "Eat the chocolate. Seriously. Chocolate isn't betrayal.",
    "Dinner isn't a moral test. Enjoy yourself.",
    "You don't need to skip meals to 'save calories' for love. You don't need punishment cardio tomorrow.",
    "Enjoy the date. Enjoy dessert. Return to normal afterward. Healthy relationships include flexibility. Including your relationship with food.",
  ] },
  after: { chance: 1, triggers: OPENS, lines: [
    "It's over. We survived. Half-price chocolate. Now THAT is romance.",
  ] },
};
