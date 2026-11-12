// Shared vocabulary. Every exercise, slot and rule is validated against these
// lists, so a typo in the library fails the tests instead of silently breaking
// program generation.

export const MUSCLES = {
  chest: "Chest",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  lats: "Lats",
  upper_back: "Upper back",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  lower_back: "Lower back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  adductors: "Adductors",
  calves: "Calves",
};

// Muscles the program balances weekly volume for. Forearms, lower back and
// adductors get plenty of indirect work, so they aren't given targets.
export const TRACKED_MUSCLES = [
  "chest", "side_delts", "rear_delts", "lats", "upper_back", "biceps", "triceps",
  "quads", "hamstrings", "glutes", "calves", "abs",
];

export const PATTERNS = {
  squat: { label: "Squat", region: "lower" },
  lunge: { label: "Single-leg", region: "lower" },
  hinge: { label: "Hip hinge", region: "lower" },
  hip_ext: { label: "Glute bridge / thrust", region: "lower" },
  knee_flex: { label: "Leg curl", region: "lower" },
  knee_ext: { label: "Leg extension", region: "lower" },
  hip_abd: { label: "Hip abduction", region: "lower" },
  calf: { label: "Calf raise", region: "lower" },
  h_push: { label: "Horizontal press", region: "upper" },
  v_push: { label: "Overhead press", region: "upper" },
  fly: { label: "Chest fly", region: "upper" },
  h_pull: { label: "Row", region: "upper" },
  v_pull: { label: "Vertical pull", region: "upper" },
  lat_raise: { label: "Lateral raise", region: "upper" },
  rear_delt: { label: "Rear delt", region: "upper" },
  curl: { label: "Biceps curl", region: "upper" },
  tri_ext: { label: "Triceps extension", region: "upper" },
  core_anti_ext: { label: "Core: anti-extension", region: "core" },
  core_rot: { label: "Core: anti-rotation", region: "core" },
  core_flex: { label: "Core: flexion", region: "core" },
  carry: { label: "Loaded carry", region: "core" },
  mobility: { label: "Mobility", region: "mobility" },
};

export const EQUIPMENT = {
  barbell: "Barbell & plates",
  rack: "Squat rack",
  bench: "Adjustable bench",
  dumbbells: "Dumbbells",
  kettlebell: "Kettlebell",
  cable: "Cable station (pulldown, row, pulleys)",
  leg_press: "Leg press",
  leg_curl: "Leg curl machine",
  leg_ext: "Leg extension machine",
  machines: "Other plate/pin machines (chest press, pec deck, hip abduction…)",
  pullup_bar: "Pull-up bar",
  dip_bars: "Dip bars",
  bands: "Resistance bands",
  step: "Sturdy step or box",
};

export const GYM_EQUIPMENT = Object.keys(EQUIPMENT);

// Joints an exercise loads meaningfully. Used to steer exercise choice away
// from areas the user flags; this is not an injury diagnosis.
export const JOINTS = {
  knee: "Knees",
  low_back: "Lower back",
  shoulder: "Shoulders",
  elbow: "Elbows",
  wrist: "Wrists",
  hip: "Hips",
};

// How load is added, which decides how progression works and how weights round.
export const LOAD_TYPES = ["barbell", "dumbbell", "kettlebell", "machine", "cable", "band", "bodyweight", "time"];

export const LEVELS = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

export const EXPERIENCE = {
  new: { label: "New to lifting", level: 1, hint: "Never trained consistently, or less than 3 months" },
  returning: { label: "Returning after a break", level: 2, hint: "Trained before, off for 3+ months" },
  novice: { label: "Training under a year", level: 2, hint: "3–12 months of consistent training" },
  intermediate: { label: "1–3 years", level: 3, hint: "Consistent training for 1–3 years" },
  advanced: { label: "3+ years", level: 3, hint: "Consistent, structured training for 3+ years" },
};

export const GOALS = {
  muscle: { label: "Build muscle", emo: "💪" },
  strength: { label: "Get stronger", emo: "🏋️" },
  fat_loss: { label: "Lose fat", emo: "🔥" },
  recomp: { label: "Keep muscle while losing weight", emo: "⚖️" },
  definition: { label: "Look more defined", emo: "✨" },
  endurance: { label: "Cardio endurance", emo: "🫀" },
  muscular_endurance: { label: "Muscular endurance", emo: "🔁" },
  general: { label: "General fitness & health", emo: "🌿" },
  mobility: { label: "Flexibility & mobility", emo: "🤸" },
};
