// Coach personalities and their pre-written lines.
// Add or edit lines freely. Placeholders: {name} {streak} {protein_left} {kcal_left}
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

export const COACHES = {
  bestie: {
    name: "Hype Bestie", emoji: "💅", vibe: "Screams in all caps for every win",
    lines: {
      morning: ["GOOD MORNING {name}!!! Today is OURS. 💖", "Up and at 'em, gorgeous! Let's eat some protein and be iconic."],
      afternoon: ["Afternoon check-in! You're doing AMAZING sweetie.", "Hiiii it's me, your biggest fan. How we doing?"],
      evening: ["Evening, superstar! Wind down and be proud of today.", "Okay but can we talk about how hard you worked today?? 😭"],
      food: ["LOGGED IT!! Look at you being responsible!!", "Another one in the books. I'm literally so proud.", "Tracking queen/king behavior. 👑"],
      protein: ["PROTEIN GOAL HIT!!! I'M SCREAMING!!! 💪💪💪", "You hit your protein?? Muscles are THANKING you rn."],
      over: ["Over a bit today and that's FINE. One day doesn't define you, bestie. 💕", "Tomorrow's a fresh page. I still adore you."],
      onTrack: ["Inside your calories today?! ICONIC. Go to bed a legend.", "Day = nailed. I'm telling everyone."],
      missed: ["Psst, nothing logged yet! Even a quick 'had a coffee' counts. 🥺", "Bestie, the app misses you. Log one thing for me?"],
      workout: ["YOU WORKED OUT?! Main character energy!!", "Sweaty and successful. Love that for you."],
      pr: ["NEW PERSONAL RECORD?!? STOP IT RIGHT NOW. 🏆🏆🏆", "A PR?! I'm framing this moment."],
      week: ["WEEKLY GOAL DONE!!! Somebody get this person a crown!", "You crushed the whole week. Unstoppable."],
      weighDown: ["Scale went DOWN!! Your hard work is SHOWING. 🎉", "Down from last week!!! I KNEW you could!"],
      weighUp: ["The scale's being dramatic this week. Water and salt happen. You're still doing great. 💕", "Up a little? Trend matters more than one day. Chin up, love."],
      streak: ["{streak}-DAY STREAK!!! Consistency looks GOOD on you.", "{streak} days in a row?! Obsessed."],
      water: ["Water goal done! Hydrated AND hot. 💧", "You drank all your water?! Glowing."],
      tip: ["Tip: protein at breakfast keeps you full till lunch. You deserve full!", "Prep a few snacks tonight so tomorrow-you is set. Self-care!", "Sleep counts as training. Get those 7+ hours, gorgeous."],
    },
  },

  dj: {
    name: "DJ Gains", emoji: "🎧", vibe: "Drops beats about your macros",
    lines: {
      morning: ["Gooood morning {name}! DJ Gains in the booth. Let's turn this day UP! 🔊", "Rise and grind, it's the morning mix! First track: breakfast."],
      afternoon: ["Afternoon set is LIVE. Keep that tempo, {name}!", "Midday remix, you're still on beat! 🎶"],
      evening: ["Evening chill mix spinning. Smooth finish tonight. 🌙", "Last set of the night. Bring it home, {name}."],
      food: ["Track added to the playlist! 🎵", "Logged! That's going straight to the top of the charts.", "Ayyy, the macros are mixing nicely."],
      protein: ["PROTEIN GOAL! DROP THE BASS! 🔊💪", "Protein hit! That's a platinum record, baby!"],
      over: ["Little off-beat today, no stress. Tomorrow we remix. 🎧", "Everybody misses a beat. Next track's yours."],
      onTrack: ["Perfect mix today, calories right on the beat! 🎚️", "Day mastered and mixed. Fade out. ✨"],
      missed: ["Booth's quiet! Log a track and let's get this party started.", "Silence on the decks... what'd you eat, {name}?"],
      workout: ["Workout logged! The crowd goes WILD! 🙌", "That workout was a certified banger."],
      pr: ["NEW PR! That's a world tour, baby! 🏆🔊", "Personal record, encore, ENCORE!"],
      week: ["Weekly goal hit. Album of the year! 💿", "Whole week on beat. Headliner status."],
      weighDown: ["Scale dropped like the BASS. 📉🔊", "Down this week! Hit single!"],
      weighUp: ["Little feedback on the speakers this week. Keep the set going. 🎧", "Scale's off-key today, the trend's still a bop."],
      streak: ["{streak}-day streak, that's a long playlist! 🔥", "{streak} days straight on repeat. Love that song."],
      water: ["Water goal done. Stay hydrated on the dance floor! 💧", "H2O tracklist complete!"],
      tip: ["Pro mix tip: protein + fiber at every meal keeps the energy steady.", "Sleep is the cooldown track. Don't skip it.", "Pump up playlist = better workout. Science-ish. 🎶"],
    },
  },

  drill: {
    name: "Drill Sergeant", emoji: "🪖", vibe: "Loud, no excuses (but secretly proud)",
    lines: {
      morning: ["ON YOUR FEET, {name}! BREAKFAST IS NOT OPTIONAL!", "REVEILLE! TODAY WE EXECUTE THE PLAN!"],
      afternoon: ["STATUS REPORT, {name}! ARE THOSE MACROS SQUARED AWAY?", "HALFWAY THROUGH THE DAY. NO SLACKING!"],
      evening: ["EVENING INSPECTION! FINISH STRONG!", "LIGHTS OUT SOON. GET YOUR REST, THAT'S AN ORDER!"],
      food: ["LOGGED. GOOD. CARRY ON.", "FOOD ACCOUNTED FOR. OUTSTANDING.", "THAT'S HOW WE DO IT IN THIS UNIT!"],
      protein: ["PROTEIN TARGET ACQUIRED! OUTSTANDING WORK, RECRUIT!", "MISSION: PROTEIN. STATUS: COMPLETE. HOOAH!"],
      over: ["OVER THE LINE TODAY. NO PANIC, RECRUIT. TOMORROW WE RECOVER.", "SETBACK NOTED. WE DON'T QUIT. WE ADJUST."],
      onTrack: ["INSIDE YOUR CALORIES! THAT'S DISCIPLINE!", "TARGET HELD ALL DAY. I'M... PROUD. DON'T TELL ANYONE."],
      missed: ["NOTHING LOGGED?! I WANT A REPORT ON MY DESK, {name}!", "WHERE IS YOUR FOOD LOG, SOLDIER?!"],
      workout: ["WORKOUT LOGGED! THAT'S WHAT I'M TALKING ABOUT!", "YOU SWEAT, YOU WIN. CARRY ON!"],
      pr: ["NEW PERSONAL RECORD! MEDAL OF HONOR FOR YOU, RECRUIT! 🎖️", "PR! I MAY HAVE SOMETHING IN MY EYE."],
      week: ["WEEKLY GOAL COMPLETE! PROMOTION EARNED!", "SEVEN DAYS OF DISCIPLINE! OUTSTANDING!"],
      weighDown: ["SCALE IS DOWN! THE PLAN IS WORKING!", "PROGRESS CONFIRMED. STAY THE COURSE!"],
      weighUp: ["SCALE WENT UP. WATER WEIGHT. WE DO NOT PANIC. WE PROCEED.", "ONE WEIGH-IN IS NOT THE WAR. KEEP MARCHING."],
      streak: ["{streak} DAYS STRAIGHT! THAT'S CONSISTENCY, RECRUIT!", "{streak}-DAY STREAK. DO NOT BREAK FORMATION!"],
      water: ["HYDRATION COMPLETE! DISMISSED!", "WATER GOAL MET. GOOD SOLDIER."],
      tip: ["PLAN TOMORROW'S MEALS TONIGHT. FAILING TO PLAN IS PLANNING TO FAIL!", "PROTEIN AT EVERY MEAL. NO EXCEPTIONS!", "SLEEP IS PART OF THE MISSION. SEVEN HOURS MINIMUM!"],
    },
  },

  surfer: {
    name: "Surfer Dude", emoji: "🏄", vibe: "Totally rad gains, bro",
    lines: {
      morning: ["Duuude, morning {name}! Waves of opportunity today. 🌊", "Rise and shine, brah. Breakfast is the first set."],
      afternoon: ["Afternoon, dude. Riding this day like a pro.", "Yo {name}, how's the swell? Keep paddling."],
      evening: ["Sunset vibes, bro. Chill and recover. 🌅", "Evening, dude. Catch some Z's, catch some gains."],
      food: ["Logged, bro. Radical.", "Gnarly meal, dude. 🤙", "Stoked you tracked that, brah."],
      protein: ["Protein goal, bro! Totally tubular gains! 🤙", "Dude. You hit protein. That's a perfect wave."],
      over: ["Wiped out a little today? Happens to every surfer, bro. Paddle back out tomorrow.", "No worries, dude. Ocean's still there tomorrow."],
      onTrack: ["Rode the whole day clean, bro. Epic. 🌊", "Calories on point. Totally rad."],
      missed: ["Duuude, nothing logged? Drop in and track a snack, bro.", "Yo, the log's flat like no-swell day. What'd you eat?"],
      workout: ["Workout done, bro! You shredded it! 🤘", "Gnarly session, dude."],
      pr: ["New PR?! That's like a 20-foot barrel, bro! 🏆", "Dude. DUDE. Personal record. Legendary."],
      week: ["Whole week goal crushed, bro. Big wave energy.", "Weekly goal: stoked out of my mind, dude."],
      weighDown: ["Scale's down, bro! Riding that wave! 🌊", "Down this week, dude. Totally rad."],
      weighUp: ["Little choppy this week, bro. The tide always comes back. 🤙", "Scale's up a smidge. No stress, it's just water, dude."],
      streak: ["{streak} days in a row, brah! You're in the barrel!", "{streak}-day streak, dude. Stoked."],
      water: ["Water goal hit, dude. Ocean-level hydration. 💧", "Hydrated like a sea turtle, bro."],
      tip: ["Dude, fruit and Greek yogurt = epic post-surf snack. Or post-anything.", "Sleep is the best wax for your board, bro. Get 8.", "Eat your greens, dude. Kelp-adjacent energy."],
    },
  },

  cat: {
    name: "Sir Whiskers", emoji: "🐱", vibe: "A sassy cat who judges (lovingly)",
    lines: {
      morning: ["Meow. You're up. Where is my breakfast? Oh, yours. Fine.", "*stretches* Good morning, human {name}."],
      afternoon: ["It's nap o'clock, but you may continue tracking.", "*knocks your snack off the table* Log it anyway."],
      evening: ["Evening, human. I approve of your efforts. Mostly.", "*purrs* You did adequately today. High praise."],
      food: ["You logged it. I shall allow it.", "*sniffs food* Acceptable.", "Logged. Now share some tuna."],
      protein: ["Protein goal reached. Even I'm impressed. *slow blink*", "You ate like a hunter today. Purrfect."],
      over: ["Over today? I eat 12 times a day. No judgment. Okay, a little.", "*shrugs in cat* Tomorrow, human."],
      onTrack: ["On target all day. You may pet me now.", "Purrfectly balanced. I approve."],
      missed: ["*stares at you* You haven't logged anything.", "The food log is emptier than my bowl. Fix that."],
      workout: ["You chased something today? Good hunter. 🐾", "Workout logged. I did zoomies too."],
      pr: ["A new record! You've earned the sunny spot on the couch.", "PR?! *purrs at maximum volume*"],
      week: ["Weekly goal done. Here's a dead mouse. It's a gift.", "A whole week. Purr-sistent."],
      weighDown: ["Scale's down. Do you want me to sit on it to check?", "Down this week. Clawsome."],
      weighUp: ["Scale went up. I gain weight every winter too. It's fine.", "Up a bit. Stop staring at the number, stare at me instead."],
      streak: ["{streak} days in a row. Cats sleep {streak} hours. Coincidence? 🐾", "{streak}-day streak. Feline fine."],
      water: ["You drank all your water. I prefer the faucet, personally.", "Hydrated. Paw-some."],
      tip: ["Tip from a cat: naps are recovery. Take one.", "Eat your protein. Be the apex predator.", "Stretch like a cat when you wake up. Trust me."],
    },
  },

  popstar: {
    name: "Ricky Rollerblade", emoji: "🎤", vibe: "A '90s pop heartthrob with frosted tips",
    lines: {
      morning: ["Yo yo yo {name}! It's gonna be a GREAT day, baby! 🎤", "Good mornin'! Time to rollerblade into breakfast!"],
      afternoon: ["Afternoon check-in! You're totally all that and a bag of chips. (Baked chips.)", "Don't stop, get it, get it! Keep goin', {name}!"],
      evening: ["Evening, superstar. Cue the slow-jam ballad. 🎶", "Time to wind down. Turn the lava lamp on."],
      food: ["Logged! You're on fire like a frosted-tips hair dryer.", "Bye bye bye, guesswork! Hello tracking! 🎵", "That meal's a total hit single."],
      protein: ["PROTEIN GOAL! Everybody, rock your body right! 💪", "Protein hit! You've got the right stuff, baby!"],
      over: ["Over a bit? Hey, even boy bands miss a dance step. Tomorrow's the reunion tour.", "No scrubs, no stress. Tomorrow's a new day."],
      onTrack: ["On target all day! That's what I call music! 🎶", "Calories on point, all-that status."],
      missed: ["Hey {name}, nothing logged? Don't go chasin' waterfalls, go log your lunch!", "Hit me with a food log one more time!"],
      workout: ["Workout done! You got the moves like a music video!", "That workout? Totally fly."],
      pr: ["NEW PR! That's a platinum record, baby! 💿", "Personal record! Cue the confetti cannons!"],
      week: ["Weekly goal crushed! Number one on the countdown!", "All week long! You're the MVP of the TRL countdown."],
      weighDown: ["Scale's down! Bye bye bye, pounds! 👋", "Dropped this week! Totally radical!"],
      weighUp: ["Scale's up? As if! It's just water, baby. Keep dancin'.", "Little bump. Every hit has a slow verse."],
      streak: ["{streak}-day streak! That's a whole boxed CD set!", "{streak} days straight! Encore!"],
      water: ["Water goal done! Stay hydrated on tour! 💧", "Hydrated like a frosted tip. Shiny."],
      tip: ["Tip: dance in the kitchen while you cook. Cardio counts!", "Prep snacks in baggies like it's 1997.", "Protein smoothie = the boy band of breakfasts. Everyone loves it."],
    },
  },

  dad: {
    name: "Coach Dad", emoji: "👨", vibe: "Dad jokes, dad wisdom, dad sneakers",
    lines: {
      morning: ["Morning, {name}! Why did the egg go to the gym? To get egg-cellent abs.", "Rise and shine, kiddo. Breakfast is the most important meal of the day. Your mother and I agree."],
      afternoon: ["Hi Hungry, I'm Dad. How's the day going?", "Afternoon, sport. Remember to drink water. And turn off the lights."],
      evening: ["Evening, champ. Proud of you. Now go to bed, it's a school night.", "Why don't eggs tell jokes at night? They'd crack up. Goodnight!"],
      food: ["Logged it! That's using your noodle. (Gluten-free noodle, if needed.)", "Nice log! You're on a roll. A whole-grain roll.", "Tracking? That's what I call a balanced meal plan... and a balanced joke."],
      protein: ["Protein goal! You're really beefing up! 🥩", "Hit your protein! I'm not crying, you're crying."],
      over: ["Over today? Don't sweat it. Your old man once ate a whole pie. Tomorrow's new.", "Bit over, no biggie. Even I go back for seconds at Thanksgiving."],
      onTrack: ["Right on target! That's my kid!", "Calories on point. I'm telling the neighbors."],
      missed: ["Haven't logged yet? I'm not mad, just disappointed. Kidding! Log a snack.", "What do you call a food log with nothing in it? Hungry. Go log something!"],
      workout: ["Workout done! I'd high-five you but I pulled something.", "Great workout! Why did the scarecrow win an award? Outstanding in his field. Like you."],
      pr: ["New PR! Want me to put it on the fridge?", "Personal record! Let me get the camcorder!"],
      week: ["Whole week goal done! Ice cream's on me. Protein ice cream.", "That's a full week, kiddo. Proud dad moment."],
      weighDown: ["Scale's down! That's a weight off my shoulders.", "Down this week! I'd say I'm proud but you know that."],
      weighUp: ["Scale's up a bit. It's probably the scale. I'll get my toolbox.", "Small bump. Don't worry, it's water. Like the water bill I keep yelling about."],
      streak: ["{streak} days straight! Consistency, just like my 6 a.m. alarm.", "{streak}-day streak! You get that from my side of the family."],
      water: ["Water goal hit! You're well hydrated, unlike my lawn.", "All your water! I'm so proud I could mow something."],
      tip: ["Tip: read the label. And turn off the lights when you leave the kitchen.", "Meal prep Sunday. Just like grilling Saturday. Essential.", "Walk after dinner. Great for digestion and for checking the neighbors' lawns."],
    },
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

/** Pick a line for an event, filling in placeholders. */
export function coachLine(coachId, event, vars = {}) {
  const c = COACHES[coachId] || COACHES[DEFAULT_COACH];
  const list = c.lines[event] || COACHES[DEFAULT_COACH].lines[event] || [];
  if (!list.length) return null;
  const line = list[Math.floor(Math.random() * list.length)];
  return line.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
