// Master trigger list for coach pop-ups.
// type: small (follows the chatty setting) · nudge (max 2/day) · big (always) · huge (always + confetti)
// Order matters: when several fire together, the higher type wins, then the earlier one in this list.

export const TRIGGERS = [
  // HUGE
  ["weight_goal_reached", "huge"],
  ["logging_streak_100", "huge"],
  // Big
  ["workout_pr", "big"],
  ["weight_halfway", "big"],
  ["weight_75_percent", "big"],
  ["weight_goal_close", "big"],
  ["weight_25_percent", "big"],
  ["weight_5lb_milestone", "big"],
  ["logging_streak_30", "big"],
  ["logging_streak_50", "big"],
  ["logging_streak_14", "big"],
  ["logging_streak_7", "big"],
  ["return_after_7_days", "big"],
  ["weigh_in_first", "big"],
  ["weigh_in_down", "big"],
  ["weigh_in_up", "big"],
  ["weigh_in_flat", "big"],
  ["weekly_workout_hit", "big"],
  ["protein_hit", "big"],
  ["calories_hit", "big"],
  ["workout_logged", "big"],
  ["steps_hit", "big"],
  ["water_hit", "big"],
  ["streak_comeback", "big"],
  ["day_under_calories_positive", "big"],
  // Nudges
  ["calories_over_large", "nudge"],
  ["calories_over_small", "nudge"],
  ["streak_broken", "nudge"],
  ["return_after_2_days", "nudge"],
  ["day_under_calories_way", "nudge"],
  ["calories_low_late", "nudge"],
  ["day_under_calories_nudge", "nudge"],
  ["nothing_logged_afternoon", "nudge"],
  ["protein_low_late", "nudge"],
  ["steps_low_late", "nudge"],
  ["water_low_late", "nudge"],
  // Small talk
  ["logging_streak_3", "small"],
  ["protein_over", "small"],
  ["protein_close", "small"],
  ["calories_close", "small"],
  ["protein_halfway", "small"],
  ["weekly_workout_halfway", "small"],
  ["steps_close", "small"],
  ["steps_halfway", "small"],
  ["water_close", "small"],
  ["water_halfway", "small"],
  ["meal_plan_meal_logged", "small"],
  ["grocery_list_finished", "small"],
  ["food_first_log", "small"],
  ["food_logged", "small"],
  ["monday_open", "small"],
  ["friday_open", "small"],
  ["weekend_open", "small"],
  ["app_open_morning", "small"],
  ["app_open_afternoon", "small"],
  ["app_open_evening", "small"],
  ["app_open_late", "small"],
  ["day_under_calories_small", "small"],
  ["random_smalltalk", "small"],
];

const TYPE_RANK = { huge: 4, big: 3, nudge: 2, small: 1 };
export const TRIGGER_META = Object.fromEntries(
  TRIGGERS.map(([id, type], i) => [id, { type, rank: TYPE_RANK[type] * 1000 - i }])
);

// day_under_calories is one trigger for the line writers; its type depends on the goal.
export const LINE_ID = { day_under_calories_positive: "day_under_calories", day_under_calories_nudge: "day_under_calories", day_under_calories_small: "day_under_calories" };
// day_under_calories_way and calories_low_late have their own lines (and fall back to the ones above).

// Until a coach has lines for a trigger, borrow its closest line (followed as a chain).
export const FALLBACK = {
  day_under_calories_way: "day_under_calories", calories_low_late: "missed",
  app_open_morning: "morning", app_open_afternoon: "afternoon", app_open_evening: "evening", app_open_late: "evening",
  monday_open: "morning", friday_open: "afternoon", weekend_open: "morning",
  nothing_logged_afternoon: "missed", return_after_2_days: "missed", return_after_7_days: "missed",
  food_first_log: "food", food_logged: "food", calories_close: "food", calories_hit: "onTrack",
  calories_over_small: "over", calories_over_large: "over", day_under_calories: "onTrack",
  protein_halfway: "food", protein_close: "food", protein_hit: "protein", protein_over: "protein", protein_low_late: "tip",
  workout_logged: "workout", workout_pr: "pr", weekly_workout_halfway: "workout", weekly_workout_hit: "week",
  steps_halfway: "workout", steps_close: "workout", steps_hit: "workout", steps_low_late: "tip",
  water_halfway: "water", water_close: "water", water_hit: "water", water_low_late: "tip",
  weigh_in_first: "weighDown", weigh_in_up: "weighUp", weigh_in_down: "weighDown", weigh_in_flat: "weighUp",
  weight_5lb_milestone: "weighDown", weight_25_percent: "weighDown", weight_halfway: "weighDown", weight_75_percent: "weighDown",
  weight_goal_close: "weighDown", weight_goal_reached: "pr",
  logging_streak_3: "streak", logging_streak_7: "streak", logging_streak_14: "streak", logging_streak_30: "streak",
  logging_streak_50: "streak", logging_streak_100: "streak",
  streak_broken: "over", streak_comeback: "food", meal_plan_meal_logged: "food", grocery_list_finished: "food",
  random_smalltalk: "tip",
};

// Thresholds (fractions of the goal unless noted)
export const T = {
  calClose: 0.85, calHit: 0.95, calOverLarge: 1.10, calWayUnder: 0.75, calLowLate: 0.6,
  proHalf: 0.5, proClose: 0.9, proOver: 1.2, proLowLate: 0.5,
  half: 0.5, close: 0.85,
  lateHour: 18, afternoonCutoff: 14, nightStart: 22, nightEnd: 4,
  flatLb: 0.3, goalCloseLb: 2, milestoneLb: 5,
  streakBrokenMin: 5, streakMilestones: [3, 7, 14, 30, 50, 100],
  nudgesPerDay: 2,
};
