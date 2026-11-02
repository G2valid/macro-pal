# Coach triggers

Reference for writing coach lines. The trigger engine lives in `triggers.js` (thresholds in `T`) and `app.js` (Coach section).

## How pop-ups are chosen
- Triggers are only checked when the app is opened or something is logged (no background notifications).
- Only today counts: logging a past day, editing or deleting doesn't fire anything.
- When several fire together, one pop-up shows: **huge > big > nudge > small**, then the order in `triggers.js`.
- **Big / huge** always show. **Nudges**: max 2 a day. **Small**: limited by the coach setting (Chill 2, Normal 6, Chatty 20 a day, 90 s apart). Off = nothing.
- Each trigger fires once a day unless marked "repeats". Weight milestones fire once per goal (changing the goal resets them).
- Holiday guests replace the chosen coach about 1 in 3 times during their season.

## Rare lines
Each trigger can also have `rare` lines (shown about 1 in 10 times) and `ultra` lines (about 1 in 50). A trigger can raise those odds, e.g. Sir Whiskers' goal-weight lines. In the CSV, use goal `rare` or `ultra`.

## Placeholders
`{name}` `{streak}` `{protein_left}` `{kcal_left}` `{lbs_to_goal}` `{lbs_lost}` `{unit}` `{atta}` ("Atta boy" / "Atta girl" from the profile) (lb or kg; the lbs_ values follow the person's units)

## Line file format
CSV with columns `coach,trigger,goal,line`. goal is `lose`, `gain`, `maintain`, `any`, `rare` or `ultra`. If there's no line for the person's goal, the coach's `any` line is used, then the closest starter line. Several lines per trigger are picked at random.

Coach IDs: bestie, dj, drill, surfer, cat, popstar, dad, turkey, santa, bunny, spooky, cupid.

## Triggers

| Trigger ID | Fires when | Type |
|---|---|---|
| `app_open_morning` | App opened 4 am–12 pm | small |
| `app_open_afternoon` | App opened 12–5 pm | small |
| `app_open_evening` | App opened 5–10 pm | small |
| `app_open_late` | App opened 10 pm–4 am | small |
| `monday_open` | First open on a Monday | small |
| `friday_open` | First open on a Friday | small |
| `weekend_open` | First open on a Saturday or Sunday | small |
| `nothing_logged_afternoon` | Opened after 2 pm (before 10 pm) with no food logged today | nudge |
| `return_after_2_days` | First open after 2–6 days with no food logged | nudge |
| `return_after_7_days` | First open after 7+ days with no food logged | big |
| `food_first_log` | First food logged today | small |
| `food_logged` | Any later food logged (repeats) | small |
| `calories_close` | Calories cross 85% of goal | small |
| `calories_hit` | Calories land at 95–100% of goal | big |
| `calories_over_small` | Calories go over goal, up to +10% | nudge |
| `calories_over_large` | Calories go more than 10% over goal | nudge |
| `day_under_calories` | First open of the day: yesterday was logged and under 95% of goal. Big for lose, nudge for gain, small for maintain | goal-based |
| `day_under_calories_way` | Losing weight only: yesterday was logged and under 75% of goal (gets "eat enough" lines instead of praise) | nudge |
| `calories_low_late` | Gaining weight only: opened after 6 pm with calories under 60% of goal | nudge |
| `protein_halfway` | Protein crosses 50% of goal | small |
| `protein_close` | Protein crosses 90% of goal | small |
| `protein_hit` | Protein reaches 100% of goal (confetti) | big |
| `protein_over` | Protein crosses 120% of goal | small |
| `protein_low_late` | Opened after 6 pm, food logged but protein under 50% | nudge |
| `workout_logged` | Workout logged today (repeats) | big |
| `workout_pr` | New personal record (confetti, repeats) | big |
| `weekly_workout_halfway` | Halfway to weekly workouts or minutes goal (Mon–Sun) | small |
| `weekly_workout_hit` | Weekly workouts or minutes goal reached | big |
| `steps_halfway` | Steps entered/imported cross 50% of step goal | small |
| `steps_close` | Steps cross 85% of step goal | small |
| `steps_hit` | Steps reach step goal | big |
| `steps_low_late` | Opened after 6 pm with no workout and no steps logged today (only if activity was logged in the past week) | nudge |
| `water_halfway` | Water reaches 50% of goal | small |
| `water_close` | Water reaches 85% of goal | small |
| `water_hit` | Water goal reached | big |
| `water_low_late` | Opened after 6 pm with water under 50% (only if water was tracked in the past week) | nudge |
| `weigh_in_first` | First ever weekly weigh-in (on the weigh-in day) | big |
| `weigh_in_up` | Weekly weigh-in up more than 0.3 lb | big |
| `weigh_in_down` | Weekly weigh-in down more than 0.3 lb | big |
| `weigh_in_flat` | Weekly weigh-in within ±0.3 lb | big |
| `weight_5lb_milestone` | Every 5 lb of progress toward the goal (weekly weigh-ins) | big |
| `weight_25_percent` | 25% of the way to goal | big |
| `weight_halfway` | 50% of the way to goal | big |
| `weight_75_percent` | 75% of the way to goal | big |
| `weight_goal_close` | Within 2 lb of goal | big |
| `weight_goal_reached` | Goal weight reached (confetti) | huge |
| `logging_streak_3` | 3-day logging streak (on first log of the day) | small |
| `logging_streak_7` | 7-day streak | big |
| `logging_streak_14` | 14-day streak | big |
| `logging_streak_30` | 30-day streak | big |
| `logging_streak_50` | 50-day streak | big |
| `logging_streak_100` | 100-day streak (confetti) | huge |
| `streak_broken` | First open after a 5+ day streak ended (yesterday not logged) | nudge |
| `streak_comeback` | First food logged after a broken streak | big |
| `meal_plan_meal_logged` | A meal-plan meal logged (repeats) | small |
| `grocery_list_finished` | Last grocery item checked off | small |
| `random_smalltalk` | Sometimes on a later open of the day (about 1 in 4) | small |
