// Weekly household meal plan: the request for Claude, reading the reply,
// and turning the plan into a combined grocery list.

export const AISLES = ["Produce", "Meat & Seafood", "Dairy & Eggs", "Bakery & Grains", "Pantry", "Frozen", "Snacks", "Drinks", "Other"];

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function planDates(startYmd) {
  const [y, m, d] = startYmd.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => ymd(new Date(y, m - 1, d + i)));
}

/**
 * The request text, used both for the copy-into-the-Claude-app flow and the API.
 * people: [{ name, kcal, protein, carbs, fat, diet: [], prefs }]
 * budgets: per-person list of { name, share } meal slots (same slots for everyone)
 */
export function buildPlanPrompt({ startYmd, people, slots, notes, staples = "" }) {
  const dates = planDates(startYmd);
  const label = (s) => new Date(...s.split("-").map((n, i) => (i === 1 ? n - 1 : +n))).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const diets = [...new Set(people.flatMap((p) => p.diet || []))];
  const lines = [
    "Plan a 7-day meal plan for my household so we can shop for one combined grocery list.",
    "",
    `Days: ${dates.map((d, i) => `day ${i + 1} = ${label(d)}`).join("; ")}.`,
    `Meals each day: ${slots.map((s) => s.name).join(", ")}.`,
    "",
    "Who's eating (everyone shares the same meals, with their own portion sizes):",
    ...people.map((p) => {
      const per = slots.map((s) => `${s.name} ~${Math.round(p.kcal * s.share)} kcal/${Math.round(p.protein * s.share)} g P/${Math.round(p.carbs * s.share)} g C/${Math.round(p.fat * s.share)} g F`).join("; ");
      return `- ${p.name}: ${p.kcal} kcal, ${p.protein} g protein, ${p.carbs} g carbs, ${p.fat} g fat per day${p.diet?.length ? `; dietary needs: ${p.diet.join(", ")}` : ""}${p.prefs ? `; likes/dislikes: ${p.prefs}` : ""}. Per meal: ${per}.`;
    }),
    "",
    "Rules:",
    diets.length ? `- Every meal must fit ALL dietary needs above (${diets.join(", ")}), since we eat together. Call out certified versions where it matters (e.g. gluten-free oats, tamari instead of soy sauce).` : "",
    "- Keep shopping simple: reuse ingredients across the week, cook once and eat twice (leftovers for lunch), and use a few easy batch-prep proteins.",
    "- Simple, realistic food from a normal grocery store. Weeknight dinners about 30 minutes or less.",
    "- Make snacks fun and varied (not just yogurt and almonds every day).",
    "- About one meal in four should be a trendy or viral recipe from social media food trends, adapted to our macros; start its title with \"🔥 \".",
    "- Each person's portion should land within about 10% of their per-meal numbers.",
    notes ? `- Also: ${notes}` : "",
    staples ? `- For reference only, products we already buy (exact nutrition per serving). Use them only where they fit naturally and keep the week varied; when a meal uses one, use these numbers scaled to the portion:\n${staples}` : "",
    "",
    "Reply with ONLY a JSON code block in exactly this shape (no other text):",
    "```json",
    JSON.stringify({
      meals: [{
        day: 1, slot: slots[0].name, title: "Meal name", recipe: "Short how-to in 1-3 sentences.",
        ingredients: [{ name: "chicken breast", qty: 1.5, unit: "lb", aisle: "Meat & Seafood" }],
        portions: people.map((p) => ({ person: p.name, serving: "6 oz chicken + 1 cup rice", calories: 500, protein_g: 45, carbs_g: 50, fat_g: 12 })),
      }],
      tips: ["One short prep tip"],
    }, null, 1),
    "```",
    `Include every day 1-7 and every meal slot (${7 * slots.length} meals). ingredients are the TOTAL amounts to buy for that meal for everyone, in store units (lb, oz, cups, cans, count, bunch, bag). aisle must be one of: ${AISLES.join(", ")}. Leftover meals list no ingredients (they were bought for the original meal) and say "Leftovers from day N" in the recipe.`,
  ];
  return lines.filter((l) => l !== "").join("\n").replace(/\nRules:/, "\n\nRules:").replace(/\nReply with/, "\n\nReply with");
}

/** Pull the plan JSON out of whatever was pasted (code fences, extra text, smart quotes). */
export function parsePlanReply(text) {
  let t = String(text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1];
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a === -1 || b <= a) throw new Error("Couldn't find the plan in that text. Copy Claude's whole reply and paste again.");
  t = t.slice(a, b + 1).replace(/[“”]/g, '"');
  let data;
  try { data = JSON.parse(t); } catch { throw new Error("The pasted plan looks cut off or incomplete. Ask Claude to \"send the full JSON again\" and paste that."); }
  if (!Array.isArray(data.meals) || !data.meals.length) throw new Error("That reply doesn't contain any meals.");
  return data;
}

const num = (x) => (Number.isFinite(+x) ? +x : 0);

/** Normalize a parsed plan (from paste or API) into the stored shape. */
export function normalizePlan(data, { startYmd, people, slots }) {
  const dates = planDates(startYmd);
  const findPerson = (name) => people.find((p) => p.name.toLowerCase() === String(name || "").trim().toLowerCase());
  const days = dates.map((date) => ({ date, meals: [] }));
  let n = 0;
  for (const m of data.meals) {
    const di = Math.min(6, Math.max(0, Math.round(num(m.day)) - 1));
    const portions = {};
    for (const por of m.portions || []) {
      const who = findPerson(por.person) || (people.length === 1 ? people[0] : null);
      if (!who) continue;
      portions[who.id] = {
        serving: String(por.serving || ""), kcal: Math.round(num(por.calories)),
        p: Math.round(num(por.protein_g)), c: Math.round(num(por.carbs_g)), f: Math.round(num(por.fat_g)),
      };
    }
    days[di].meals.push({
      id: `m${n++}`, slot: String(m.slot || slots[0]?.name || "Meal"), title: String(m.title || "Meal"),
      recipe: String(m.recipe || ""),
      ingredients: (m.ingredients || []).map((g) => ({
        name: String(g.name || "").trim(), qty: num(g.qty), unit: String(g.unit || "").trim(),
        aisle: AISLES.includes(g.aisle) ? g.aisle : "Other",
      })).filter((g) => g.name),
      portions,
    });
  }
  const order = slots.map((s) => s.name.toLowerCase());
  for (const d of days) d.meals.sort((a, b) => (order.indexOf(a.slot.toLowerCase()) + 99) % 99 - (order.indexOf(b.slot.toLowerCase()) + 99) % 99);
  return { startYmd, people, slots, days, tips: (data.tips || []).map(String).slice(0, 5), checked: {}, created: Date.now() };
}

const UNIT_ALIASES = { lbs: "lb", pound: "lb", pounds: "lb", ounce: "oz", ounces: "oz", cup: "cups", c: "cups", can: "cans", tablespoon: "tbsp", tablespoons: "tbsp", teaspoon: "tsp", teaspoons: "tsp", each: "", whole: "", count: "", pcs: "", piece: "", pieces: "" };
const normUnit = (u) => { const k = u.toLowerCase().replace(/\.$/, ""); return k in UNIT_ALIASES ? UNIT_ALIASES[k] : k; };
const normName = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/(es|s)$/, "").trim();

/** Combine every meal's ingredients into one shopping list grouped by aisle. */
export function groceryList(plan) {
  const map = new Map();
  for (const d of plan.days) for (const m of d.meals) for (const g of m.ingredients) {
    const unit = normUnit(g.unit);
    const key = `${normName(g.name)}|${unit}`;
    const cur = map.get(key) || { key, name: g.name, unit, qty: 0, aisle: g.aisle, meals: 0 };
    cur.qty += g.qty; cur.meals++;
    map.set(key, cur);
  }
  const byAisle = {};
  for (const it of map.values()) (byAisle[it.aisle] ||= []).push(it);
  for (const a of Object.keys(byAisle)) byAisle[a].sort((x, y) => x.name.localeCompare(y.name));
  return AISLES.filter((a) => byAisle[a]).map((a) => ({ aisle: a, items: byAisle[a] }));
}

export function fmtQty(q) {
  if (!q) return "";
  const r = Math.round(q * 4) / 4;
  const whole = Math.floor(r), frac = r - whole;
  const f = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[frac] || "";
  return `${whole || (f ? "" : "0")}${f}`;
}

export function groceryText(plan, { skipChecked = true } = {}) {
  const out = [`🛒 Grocery list (week of ${plan.startYmd})`];
  for (const { aisle, items } of groceryList(plan)) {
    const rows = items.filter((i) => !(skipChecked && plan.checked?.[i.key]));
    if (!rows.length) continue;
    out.push("", aisle.toUpperCase());
    for (const i of rows) out.push(`☐ ${[fmtQty(i.qty), i.unit, i.name].filter(Boolean).join(" ")}`);
  }
  return out.join("\n");
}
