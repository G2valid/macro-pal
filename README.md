# Bite Club

A calorie and macro tracker that runs as an installable web app (PWA) on iPhone, iPad and Mac. It has no build step: these files are the whole app.

## Features
- Profile setup: sex, age, height, weight, goal weight, activity level and pace. Calculates BMR, maintenance calories, a daily calorie goal and an estimated goal date (Mifflin-St Jeor).
- Macro coach: pick calories by pace, protein by grams per lb of goal weight, fat at a healthy amount, and carbs fill the rest. Includes a "What are macros?" explainer. % presets are still available.
- Daily log with Breakfast, Lunch, Dinner and Snacks, a calorie ring, macro bars, water cups and "copy yesterday".
- Food entry: type or dictate what you ate (from a bar on the Today screen), photo + Claude estimate, nutrition label scan + scale weight, My foods, or manual entry.
- Weight log with a 7-day trend chart, plus a weekly weigh-in day whose number is highlighted with week-over-week change.
- Fitness tab: a personal training plan and workout logger (below), plus workouts, steps, sleep, resting HR and HRV. Import Peloton, RingConn or other screenshots and Claude fills them in. Workout calories can optionally be added to the food goal.
- 10 gradient themes, a daily greeting with a logging streak, and confetti when you hit your protein goal.
- Personal records (best output, distance, duration, calories, steps) and a weekly workouts/active-minutes goal.
- Private body measurements, progress photos (stored in IndexedDB) and optional cycle tracking. These are never shared.
- Claude food coach: meal ideas for what's left today, a weekly eating review, and strict dietary needs such as gluten-free.
- Weekly household meal plan: built by pasting a request into the Claude app (no API cost) or with the API key; shared meals with per-person portions, one combined grocery checklist, one-tap logging from the plan, and sharing to a partner's phone as a file.
- Coach personalities with pre-written pop-up lines (edit `coaches.js`), including seasonal holiday guests.
- Several people per device, each with their own theme (7 colors plus light, dark or match phone).
- Backup/restore to a JSON file. Works offline, except photo estimates.

## Personal trainer (Fitness tab)
The Fitness tab is also a personal trainer. Set up a plan from the Fitness tab, and everything (planned workouts, the live workout logger, hand-logged workouts and screenshot imports) lands in the one Fitness workout log.
- Adaptive setup: safety screen (based on ACSM pre-exercise screening), experience, goals, priority muscles, days, session length, equipment (including which dumbbells you own), joints to work around, and cardio ability. Age, height and weight come from the profile.
- **View my plan**: the week and month calendar, the program (swap, edit, reorder, add exercises; weekly sets per muscle), and **Change** to switch goal, level, days or session length with a preview first. History is kept.
- Program generator: recommends full body, upper/lower or push/pull/legs from your days and experience, picks exercises that fit your equipment and limits, and trims sessions to your time.
- 164-exercise library (beginner to advanced, plenty of home options) with steps, cues, common mistakes, range of motion, breathing, alternatives and evidence notes.
- Live workout logger: targets prefilled, one-tap sets, effort (reps in reserve), rest timer that flashes GO, warm-up sets with plates per side, PRs, swaps (same movement or similar muscles), pain flag, "short on time" trimming, autosave, screen kept on.
- Progression engine: double progression with smallest-available increments, stall and long-break handling, and no increases after a pain flag. Every suggestion explains why.
- Finished plan workouts are added to the Fitness log (with MET-based calorie estimates) and count toward the weekly ring, whose workouts goal follows the plan. Workouts logged by hand or imported can be counted toward a planned session.
- No AI calls: all numbers come from tested rules in `train/domain/`. Plans and set-by-set history live in IndexedDB on the device and are included in the Bite Club backup file.

Run the rule tests (Node 20+): `npm test`

## Hosting
It must be served over HTTPS. Any static host works:
- **Netlify Drop**: drag this folder onto https://app.netlify.com/drop
- **GitHub Pages**: push the folder to a repo, then Settings → Pages → Deploy from branch

## Installing on iPhone or iPad
Open the site in Safari, tap Share, then **Add to Home Screen**.
On a Mac, in Safari use File → **Add to Dock**.

## Photo estimates
Create an API key at console.anthropic.com and paste it into Settings → Photo estimates. The key is stored only on that device. Setting a monthly spend limit in the console is a good idea.

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `ai.js`: Claude photo estimates
- `vendor/anthropic-sdk.js`: bundled `@anthropic-ai/sdk` 1.3.0
- `sw.js`: offline cache. Bump `VERSION` when you change files.
- `train/`: the personal trainer shown in the Fitness tab (`embed.js` = hook-up to Bite Club, `domain/` = rules + exercise library, `ui/` = screens, `test/` = tests).

Data lives only on each device (localStorage, plus IndexedDB for progress photos). Nothing is stored online; the only network calls are to Claude for photo, label and coach features.

