// Built-in "example day": splits daily targets into meal budgets and fills
// each meal with everyday foods, portioned to land close to the budget.

// Macros per 100 g (cooked/as eaten). unit/unitG/step give friendly portions.
const F = {
  chicken: { name: "chicken breast", short: "Chicken", p: 31, c: 0, f: 3.6, unit: "oz", unitG: 28.35, step: 0.5 },
  salmon: { name: "salmon", short: "Salmon", p: 22, c: 0, f: 12, unit: "oz", unitG: 28.35, step: 0.5 },
  turkey: { name: "93% lean ground turkey", short: "Turkey", p: 27, c: 0, f: 9, unit: "oz", unitG: 28.35, step: 0.5 },
  shrimp: { name: "shrimp", short: "Shrimp", p: 24, c: 0.2, f: 0.3, unit: "oz", unitG: 28.35, step: 0.5 },
  tofu: { name: "firm tofu", short: "Tofu", p: 17, c: 3, f: 9, unit: "oz", unitG: 28.35, step: 1 },
  eggWhites: { name: "egg whites", p: 11, c: 0.7, f: 0.2, unit: "cup", unitG: 243, step: 0.25 },
  egg: { name: "whole egg", plural: "whole eggs", p: 12.6, c: 0.7, f: 9.5, unit: "", unitG: 50, step: 1 },
  greekYog: { name: "nonfat Greek yogurt", p: 10, c: 3.6, f: 0.4, unit: "cup", unitG: 227, step: 0.25 },
  soyYog: { name: "high-protein soy yogurt", p: 7, c: 6, f: 3, unit: "cup", unitG: 227, step: 0.25 },
  cottage: { name: "2% cottage cheese", p: 11, c: 4.3, f: 2.3, unit: "cup", unitG: 226, step: 0.25 },
  whey: { name: "whey protein", p: 80, c: 8, f: 5, unit: "scoop", unitG: 30, step: 0.5 },
  pea: { name: "pea protein", p: 80, c: 5, f: 7, unit: "scoop", unitG: 30, step: 0.5 },
  rice: { name: "cooked rice", p: 2.7, c: 28, f: 0.3, unit: "cup", unitG: 158, step: 0.25 },
  potato: { name: "potato", p: 2.5, c: 21, f: 0.1, unit: "medium", unitG: 173, step: 0.5 },
  sweetPotato: { name: "sweet potato", p: 2, c: 21, f: 0.2, unit: "medium", unitG: 150, step: 0.5 },
  oats: { name: "rolled oats (dry)", gf: "certified gluten-free oats (dry)", p: 13, c: 68, f: 6.5, unit: "cup", unitG: 80, step: 0.25 },
  banana: { name: "banana", p: 1.1, c: 23, f: 0.3, unit: "", unitG: 118, step: 0.5 },
  berries: { name: "berries", p: 0.7, c: 12, f: 0.3, unit: "cup", unitG: 148, step: 0.25 },
  apple: { name: "apple", p: 0.3, c: 14, f: 0.2, unit: "", unitG: 182, step: 0.5 },
  toast: { name: "whole-grain toast", gf: "gluten-free toast", p: 9, c: 49, f: 3.2, gfMacros: { p: 4, c: 44, f: 5 }, unit: "slice", unitG: 32, step: 1 },
  tortilla: { name: "corn tortilla", p: 5.7, c: 45, f: 2.9, unit: "", unitG: 26, step: 1 },
  avocado: { name: "avocado", p: 2, c: 9, f: 15, unit: "", unitG: 150, step: 0.25 },
  oil: { name: "olive oil", p: 0, c: 0, f: 100, unit: "tsp", unitG: 4.5, step: 1 },
  pb: { name: "peanut butter", p: 25, c: 20, f: 50, unit: "tbsp", unitG: 16, step: 0.5 },
  sunButter: { name: "sunflower seed butter", p: 20, c: 23, f: 51, unit: "tbsp", unitG: 16, step: 0.5 },
  almonds: { name: "almonds", p: 21, c: 22, f: 50, unit: "oz", unitG: 28, step: 0.5 },
  pepitas: { name: "pumpkin seeds", p: 30, c: 10, f: 49, unit: "oz", unitG: 28, step: 0.5 },
  cheese: { name: "cheddar cheese", p: 25, c: 1.3, f: 33, unit: "oz", unitG: 28, step: 0.5 },
  beef93: { name: "93% lean ground beef", short: "Beef", p: 26, c: 0, f: 8, unit: "oz", unitG: 28.35, step: 0.5 },
  honey: { name: "hot honey", p: 0.3, c: 82, f: 0, unit: "tbsp", unitG: 21, fixed: 1 },
  riceCake: { name: "rice cake", plural: "rice cakes", p: 8, c: 80, f: 3, unit: "", unitG: 9, step: 1 },
  jerky: { name: "beef jerky", gf: "gluten-free beef jerky", p: 33, c: 11, f: 7, unit: "oz", unitG: 28, step: 0.5 },
  turkeyDeli: { name: "sliced deli turkey", p: 18, c: 2, f: 2, unit: "oz", unitG: 28, step: 1 },
  tuna: { name: "tuna (canned in water)", p: 26, c: 0, f: 1, unit: "oz", unitG: 28, step: 0.5 },
  edamame: { name: "shelled edamame", p: 11, c: 9, f: 5, unit: "cup", unitG: 155, step: 0.25 },
  stringCheese: { name: "string cheese", plural: "string cheese sticks", p: 24, c: 3, f: 21, unit: "", unitG: 28, step: 1 },
  chocMilk: { name: "low-fat chocolate milk", p: 3.2, c: 10, f: 1, unit: "cup", unitG: 250, step: 0.5 },
  pineapple: { name: "pineapple", p: 0.5, c: 13, f: 0.1, unit: "cup", unitG: 165, step: 0.25 },
  grapes: { name: "frozen grapes", p: 0.7, c: 18, f: 0.2, unit: "cup", unitG: 151, step: 0.25 },
  popcorn: { name: "air-popped popcorn", p: 13, c: 78, f: 4.5, unit: "cups", unitG: 8, step: 1 },
  hummus: { name: "hummus", p: 8, c: 14, f: 18, unit: "tbsp", unitG: 15, step: 1 },
  chocChips: { name: "dark chocolate chips", p: 6, c: 60, f: 30, unit: "tbsp", unitG: 10, step: 0.5 },
  cocoa: { name: "cocoa powder", p: 20, c: 58, f: 14, unit: "tbsp", unitG: 5, fixed: 1 },
  veggies: { name: "carrot & cucumber sticks", p: 1, c: 7, f: 0.2, unit: "cup", unitG: 110, fixed: 1 },
  broccoli: { name: "broccoli", p: 2.8, c: 7, f: 0.4, unit: "cup", unitG: 91, fixed: 1 },
  salad: { name: "salad greens", p: 1.4, c: 3, f: 0.2, unit: "cups", unitG: 35, fixed: 2 },
};

// [title, protein, carb, fat, veg?]
const TEMPLATES = {
  breakfast: [
    ["Yogurt power bowl", "greekYog", "berries", "almonds"],
    ["Eggs, toast & avocado", "eggWhites", "toast", "egg", null, "avocado"],
    ["Protein oats", "whey", "oats", "pb"],
    ["🔥 Viral baked oats", "greekYog", "oats", "egg"],
  ],
  lunch: [
    ["{P} rice bowl", "chicken", "rice", "avocado", "broccoli"],
    ["{P} tacos", "turkey", "tortilla", "cheese", "salad"],
    ["{P} stir-fry", "shrimp", "rice", "oil", "broccoli"],
    ["🔥 Smash burger tacos", "beef93", "tortilla", "cheese", "salad"],
  ],
  dinner: [
    ["{P} & potatoes", "salmon", "potato", "oil", "broccoli"],
    ["{P} & sweet potato", "chicken", "sweetPotato", "oil", "salad"],
    ["{P} burrito bowl", "turkey", "rice", "avocado", "salad"],
    ["🔥 Hot honey {P} bowl", "chicken", "rice", "avocado", "broccoli", "honey"],
  ],
  snack: [
    ["Chocolate PB protein pudding", "greekYog", "banana", "pb", "cocoa"],
    ["Jerky & cheese snack box", "jerky", "grapes", "stringCheese"],
    ["Cottage cheese & pineapple", "cottage", "pineapple", "almonds"],
    ["Tuna avocado rice cakes", "tuna", "riceCake", "avocado"],
    ["🔥 Viral frozen yogurt bark", "greekYog", "berries", "chocChips"],
    ["🔥 Protein cookie dough", "greekYog", "riceCake", "pb", "cocoa"],
    ["🔥 Cottage cheese \"ice cream\"", "cottage", "berries", "pb"],
    ["Turkey & cheese roll-ups", "turkeyDeli", "riceCake", "stringCheese"],
    ["Hummus & veggie plate", "edamame", "riceCake", "hummus", "veggies"],
    ["Protein shake & apple", "whey", "apple", "almonds"],
    ["Hard-boiled eggs & frozen grapes", "egg", "grapes", "almonds"],
    ["Movie-night popcorn & cheese", "stringCheese", "popcorn", "chocChips"],
    ["Chocolate milk & PB rice cake", "chocMilk", "riceCake", "pb"],
    ["Yogurt, banana & PB", "greekYog", "banana", "pb"],
  ],
};

export const MEAL_PATTERNS = {
  "3": { label: "3 meals", slots: [["Breakfast", "breakfast", 0.3], ["Lunch", "lunch", 0.35], ["Dinner", "dinner", 0.35]] },
  "3+1": { label: "3 meals + snack", slots: [["Breakfast", "breakfast", 0.25], ["Lunch", "lunch", 0.3], ["Snack", "snack", 0.12], ["Dinner", "dinner", 0.33]] },
  "3+2": { label: "3 meals + 2 snacks", slots: [["Breakfast", "breakfast", 0.22], ["Morning snack", "snack", 0.1], ["Lunch", "lunch", 0.28], ["Afternoon snack", "snack", 0.1], ["Dinner", "dinner", 0.3]] },
  "2+s": { label: "2 meals + snacks", slots: [["Meal 1", "lunch", 0.38], ["Snack", "snack", 0.12], ["Meal 2", "dinner", 0.38], ["Evening snack", "snack", 0.12]] },
};

/** Per-meal calorie and macro budgets for a pattern. */
export function mealBudgets(targets, pattern = "3+1") {
  const pat = MEAL_PATTERNS[pattern] || MEAL_PATTERNS["3+1"];
  return pat.slots.map(([name, kind, share]) => ({
    name, kind, share,
    kcal: Math.round(targets.kcal * share), p: Math.round(targets.protein * share),
    c: Math.round(targets.carbs * share), f: Math.round(targets.fat * share),
  }));
}

function swapFor(key, diet) {
  const has = (d) => diet.includes(d);
  const vegan = has("Vegan");
  const veg = vegan || has("Vegetarian");
  const dairyFree = vegan || has("Dairy-free");
  if ((veg && ["chicken", "salmon", "turkey", "shrimp", "beef93"].includes(key)) || (has("Pescatarian") && ["chicken", "turkey", "beef93"].includes(key))) {
    return has("Pescatarian") && !veg ? "salmon" : "tofu";
  }
  if (vegan && ["egg", "eggWhites"].includes(key)) return "tofu";
  if (dairyFree && key === "greekYog") return "soyYog";
  if (dairyFree && key === "cottage") return "tofu";
  if (dairyFree && key === "whey") return "pea";
  if (dairyFree && key === "cheese") return "avocado";
  if (has("Nut allergy") && key === "almonds") return "pepitas";
  if (has("Nut allergy") && key === "pb") return "sunButter";
  return key;
}

function foodFor(key, diet) {
  const base = F[key];
  if (diet.includes("Gluten-free") && base.gf) return { ...base, name: base.gf, ...(base.gfMacros || {}) };
  return base;
}

/** Choose grams of the adjustable foods so the meal's macros land near the budget. */
function fitGrams(foods, budget) {
  // Calorie-weighted least squares, solved by coordinate descent with x >= 0.
  const w = [4, 4, 9];
  const fixed = [0, 0, 0];
  for (const fd of foods.filter((x) => x.fixed)) {
    const g = fd.fixed * fd.unitG;
    fixed[0] += (fd.p * g) / 100; fixed[1] += (fd.c * g) / 100; fixed[2] += (fd.f * g) / 100;
  }
  const t = [budget.p - fixed[0], budget.c - fixed[1], budget.f - fixed[2]];
  const adj = foods.filter((x) => !x.fixed);
  const A = adj.map((fd) => [fd.p / 100, fd.c / 100, fd.f / 100]);
  const x = adj.map(() => 50);
  for (let it = 0; it < 200; it++) {
    for (let j = 0; j < adj.length; j++) {
      const r = [0, 1, 2].map((m) => t[m] - A.reduce((s, a, k) => (k === j ? s : s + a[m] * x[k]), 0));
      const num = [0, 1, 2].reduce((s, m) => s + w[m] * A[j][m] * r[m], 0);
      const den = [0, 1, 2].reduce((s, m) => s + w[m] * A[j][m] * A[j][m], 0);
      x[j] = Math.max(0, num / den);
    }
  }
  return adj.map((fd, j) => ({ fd, grams: x[j] }));
}

function portionText(fd, units) {
  const n = Number.isInteger(units) ? String(units) : units.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  const nice = { "0.25": "¼", "0.5": "½", "0.75": "¾", "1.25": "1¼", "1.5": "1½", "1.75": "1¾", "2.5": "2½", "3.5": "3½" }[n] || n;
  if (fd.unit === "tsp" && units >= 3) return portionText({ ...fd, unit: "tbsp" }, units / 3);
  if (!fd.unit) return `${nice} ${units > 1 && fd.plural ? fd.plural : fd.name}`;
  return `${nice} ${fd.unit} ${fd.name}`;
}

function buildMeal(tpl, b, diet) {
  const [title, ...keys] = tpl;
  const foods = keys.filter(Boolean).map((k) => ({ key: k, ...foodFor(swapFor(k, diet), diet) }));
  const fixedItems = foods.filter((x) => x.fixed).map((fd) => itemFor(fd, fd.fixed));
  const fitted = fitGrams(foods, b).map(({ fd, grams }) => ({ fd, units: Math.max(0, Math.round(grams / fd.unitG / fd.step) * fd.step) }));
  const missOf = (list) => {
    const t = sum([...list.filter((x) => x.units > 0).map((x) => itemFor(x.fd, x.units)), ...fixedItems]);
    // calorie-weighted miss, as a share of the meal's budget
    return (Math.abs(t.p - b.p) * 4 + Math.abs(t.c - b.c) * 4 + Math.abs(t.f - b.f) * 9) / Math.max(1, b.kcal);
  };
  // Nudge rounded portions one step at a time while it gets closer.
  for (let pass = 0; pass < 6; pass++) {
    let improved = false;
    for (const x of fitted) {
      for (const d of [x.fd.step, -x.fd.step]) {
        const before = missOf(fitted);
        const prev = x.units;
        x.units = Math.max(0, prev + d);
        if (missOf(fitted) < before - 1e-9) improved = true;
        else x.units = prev;
      }
    }
    if (!improved) break;
  }
  for (const x of fitted) if (x.fd.unit === "tsp" && x.units >= 3) x.units = Math.round(x.units / 1.5) * 1.5; // whole or half tablespoons
  const items = [...fitted.filter((x) => x.units > 0).map((x) => itemFor(x.fd, x.units)), ...fixedItems];
  const short = foods[0].short || "";
  const named = title.startsWith("{P}") ? title.replace("{P}", short) : title.replace("{P}", short.toLowerCase());
  return { title: named, items, total: sum(items), miss: missOf(fitted) };
}

/** Build an example day. seed rotates which meals come first; poor fits are skipped. */
export function buildExampleDay(targets, pattern = "3+1", diet = [], seed = 0) {
  const budgets = mealBudgets(targets, pattern);
  const used = {};
  const picked = new Set();
  const meals = budgets.map((b) => {
    const opts = TEMPLATES[b.kind];
    const start = (used[b.kind] ?? seed) % opts.length;
    used[b.kind] = start + 1;
    const tries = opts.map((_, i) => buildMeal(opts[(start + i) % opts.length], b, diet));
    const best = tries.reduce((a, m) => (m.miss < a.miss ? m : a));
    const ok = b.kind === "snack" ? 0.3 : 0.12; // small snacks can't round as precisely
    const pick = tries.find((m) => m.miss <= ok && !picked.has(m.title)) || tries.find((m) => m.miss <= ok) || best;
    picked.add(pick.title);
    return { ...b, title: pick.title, items: pick.items, total: pick.total };
  });
  return { meals, total: sum(meals.map((m) => m.total)) };
}

function itemFor(fd, units) {
  const g = units * fd.unitG;
  const p = (fd.p * g) / 100, c = (fd.c * g) / 100, f = (fd.f * g) / 100;
  return { name: portionText(fd, units), kcal: Math.round(p * 4 + c * 4 + f * 9), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
}

function sum(list) {
  return list.reduce((t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}
