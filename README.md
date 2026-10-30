# Macro Pal

A calorie and macro tracker that runs as an installable web app (PWA) on iPhone, iPad and Mac. It has no build step: these files are the whole app.

## Features
- Profile setup: sex, age, height, weight, goal weight, activity level and pace. Calculates BMR, maintenance calories, a daily calorie goal and an estimated goal date (Mifflin-St Jeor).
- Macro coach: pick calories by pace, protein by grams per lb of goal weight, fat at a healthy amount, and carbs fill the rest. Includes a "What are macros?" explainer. % presets are still available.
- Daily log with Breakfast, Lunch, Dinner and Snacks, a calorie ring, macro bars, water cups and "copy yesterday".
- Food entry three ways: photo + Claude estimate (with follow-up questions), My foods (everything you log is saved), Quick add.
- Weight log with a 7-day trend chart, plus a weekly weigh-in day whose number is highlighted with week-over-week change.
- Fitness tab: workouts, steps, sleep, resting HR and HRV. Import Peloton, RingConn or other screenshots and Claude fills them in. Workout calories can optionally be added to the food goal.
- 10 gradient themes, a daily greeting with a logging streak, and confetti when you hit your protein goal.
- Personal records (best output, distance, duration, calories, steps) and a weekly workouts/active-minutes goal.
- Private body measurements, progress photos (stored in IndexedDB) and optional cycle tracking. These are never shared.
- Claude food coach: meal ideas for what's left today, a weekly eating review, and strict dietary needs such as gluten-free.
- Several people per device, each with their own theme (7 colors plus light, dark or match phone).
- Backup/restore to a JSON file. Works offline, except photo estimates.

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

Data lives in the browser's localStorage on each device. Two phones don't sync with each other.

## Partner link (in progress)
`supabase/schema.sql` creates the tables for linking two people, challenges and cheers, with row-level security. Only a small daily summary is shared; food logs, measurements, photos and cycle data stay on the device.
