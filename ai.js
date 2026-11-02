// Photo-based food estimates via the Claude API.
// The SDK is loaded lazily so the rest of the app works offline.

const SDK_URL = "./vendor/anthropic-sdk.js"; // @anthropic-ai/sdk 1.3.0, bundled

export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (most accurate)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (cheapest, fastest)" },
];
export const DEFAULT_MODEL = "claude-opus-5-5";

const SYSTEM = `You are a nutrition estimator inside a personal macro-tracking app.
The user shows you a photo of food (and/or a short description) and you estimate calories and macronutrients.

How to work:
- Identify each distinct food or drink and estimate its portion from visual cues (plate size, utensils, hands, packaging).
- Estimate calories (kcal), protein, carbs and fat in grams for each item as served. Keep numbers internally consistent (kcal ≈ 4*protein + 4*carbs + 9*fat).
- Always give your best estimate right away, even when unsure.
- If a detail would change the total meaningfully (cooking oil or butter, dressing or sauce, portion size, milk type, hidden ingredients, how much was actually eaten), ask up to 3 short clarifying questions, each with 2-4 tappable answer options. Ask nothing if the estimate is already solid.
- If the user has already answered questions, use the answers and do not ask the same things again.
- If there is no food in the photo, return no items and say so in notes.
- With no photo, split the description into separate items, use the amounts given (grams, oz, cups, pieces, "half", etc.), and assume typical portions when none are given.
- Portions should be written in everyday units (e.g. "1 cup", "6 oz", "2 slices").
- notes: one or two sentences on key assumptions. Be plain and friendly.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "questions", "confidence", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "portion", "calories", "protein_g", "carbs_g", "fat_g"],
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options"],
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    notes: { type: "string" },
  },
};

let clientPromise = null;
let clientKey = null;

async function getClient(apiKey) {
  if (!clientPromise || clientKey !== apiKey) {
    clientKey = apiKey;
    clientPromise = import(SDK_URL).then(
      (mod) => new mod.default({ apiKey, dangerouslyAllowBrowser: true })
    );
  }
  return clientPromise;
}

/** Downscale a photo to a JPEG the API handles well (long edge <= 1568px). */
export async function prepareImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const src = bitmap || (await loadImg(file));
  const max = 1568;
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(src, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

function loadImg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Ask Claude for an estimate.
 * @param {object} o
 * @param {string} o.apiKey
 * @param {string} o.model
 * @param {{base64:string, mediaType:string}|null} o.image
 * @param {string} o.description  free-text from the user
 * @param {Array<{question:string, answer:string}>} o.answers  answers to earlier questions
 * @param {object|null} o.previous  the previous estimate, when refining
 */
export async function estimateFood({ apiKey, model, image, description, answers = [], previous = null, diet = [], known = "" }) {
  const content = [];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
  }
  let text = description?.trim()
    ? `${image ? "Description from the user" : "The user typed or dictated what they ate (no photo)"}: ${description.trim()}`
    : "Estimate the food in this photo.";
  if (known) {
    text += `\n\nFoods the user has saved, with exact nutrition. When they mention one of these, use these numbers scaled to the amount they say:\n${known}`;
  }
  if (diet.length) {
    text += `\n\nThe user's dietary needs: ${diet.join(", ")}. If any item likely conflicts (e.g. bread, pasta, breading or soy sauce for gluten-free), say so briefly in notes.`;
  }
  if (previous) {
    text += `\n\nYour previous estimate was:\n${JSON.stringify(previous.items)}`;
  }
  if (answers.length) {
    text += `\n\nThe user answered your questions:\n` +
      answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n") +
      `\n\nUpdate the estimate using these answers.`;
  }
  content.push({ type: "text", text });

  const data = await askClaude({ apiKey, model, system: SYSTEM, schema: SCHEMA, content, what: "estimate" });
  data.items = (data.items || []).map((it) => ({
    name: it.name,
    portion: it.portion,
    kcal: Math.round(it.calories),
    p: round1(it.protein_g),
    c: round1(it.carbs_g),
    f: round1(it.fat_g),
  }));
  data.questions = (data.questions || []).slice(0, 3);
  return data;
}

/** Send one request and return the parsed JSON matching `schema`. */
async function askClaude({ apiKey, model, system, schema, content, what }) {
  const client = await getClient(apiKey);
  const params = {
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  };
  // Server-side refusal fallback (not offered for Haiku).
  if (model !== "claude-haiku-5-5") {
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }

  let response;
  try {
    response = await client.beta.messages.create(params);
  } catch (err) {
    throw new Error(friendlyError(err));
  }

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined this ${what}. Try a different image or add a description.`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(`The ${what} got cut off. Please try again.`);
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error(`No ${what} came back. Please try again.`);
  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new Error("Couldn't read Claude's answer. Please try again.");
  }
}

/* ---------- Workout & activity screenshots ---------- */

const FITNESS_SYSTEM = `You read fitness app screenshots for a personal tracking app.
Screenshots are usually from Peloton (workout summaries: class title, instructor, duration, output in kJ, calories, distance, heart rate, strive score) or RingConn smart ring (steps, active calories, sleep, resting heart rate, HRV), but can be from any app or a photo of gym equipment.

How to work:
- Extract every distinct workout shown. Use the class/workout title when present.
- type must be one of: cycling, running, walking, strength, pilates, yoga, stretching, hiit, rowing, swimming, other. Use pilates for Pilates and barre classes.
- Only report numbers that are visible. Use 0 for anything not shown; never guess.
- duration_min in minutes. distance with its unit as shown ("mi" or "km", empty if none). output_kj is Peloton's total output; 0 if not shown.
- daily holds all-day stats (steps, active calories, sleep hours as a decimal, resting heart rate, HRV in ms); 0 for anything not shown.
- date: the date shown on the screenshot as YYYY-MM-DD if a full date is visible, otherwise an empty string. Today is {TODAY}; if the screenshot only says "Today" use that.
- summary: one friendly sentence describing what you found.`;

const FITNESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["date", "workouts", "daily", "summary"],
  properties: {
    date: { type: "string" },
    workouts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "duration_min", "calories", "distance", "distance_unit", "avg_hr", "output_kj", "notes"],
        properties: {
          type: { type: "string", enum: ["cycling", "running", "walking", "strength", "pilates", "yoga", "stretching", "hiit", "rowing", "swimming", "other"] },
          title: { type: "string" },
          duration_min: { type: "number" },
          calories: { type: "number" },
          distance: { type: "number" },
          distance_unit: { type: "string" },
          avg_hr: { type: "number" },
          output_kj: { type: "number" },
          notes: { type: "string" },
        },
      },
    },
    daily: {
      type: "object",
      additionalProperties: false,
      required: ["steps", "active_calories", "sleep_hours", "resting_hr", "hrv_ms"],
      properties: {
        steps: { type: "number" },
        active_calories: { type: "number" },
        sleep_hours: { type: "number" },
        resting_hr: { type: "number" },
        hrv_ms: { type: "number" },
      },
    },
    summary: { type: "string" },
  },
};

/** Read one or more workout/activity screenshots. */
export async function readFitnessScreens({ apiKey, model, images, todayYmd }) {
  const content = images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.mediaType, data: im.base64 } }));
  content.push({ type: "text", text: images.length > 1 ? "These screenshots are from the same day. Extract the workouts and daily stats." : "Extract the workouts and daily stats from this screenshot." });
  const data = await askClaude({
    apiKey, model, system: FITNESS_SYSTEM.replace("{TODAY}", todayYmd), schema: FITNESS_SCHEMA, content, what: "screenshot reading",
  });
  data.workouts = (data.workouts || []).map((w) => ({
    type: w.type, title: w.title, minutes: Math.round(w.duration_min || 0), kcal: Math.round(w.calories || 0),
    distance: round1(w.distance), distUnit: w.distance_unit || "", avgHr: Math.round(w.avg_hr || 0),
    output: Math.round(w.output_kj || 0), notes: w.notes || "",
  }));
  const d = data.daily || {};
  data.daily = {
    steps: Math.round(d.steps || 0), activeKcal: Math.round(d.active_calories || 0), sleepH: round1(d.sleep_hours),
    restingHr: Math.round(d.resting_hr || 0), hrv: Math.round(d.hrv_ms || 0),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) data.date = "";
  return data;
}

/* ---------- Nutrition labels ---------- */

const LABEL_SYSTEM = `You read Nutrition Facts panels from photos for a macro-tracking app.
Copy the numbers exactly as printed for ONE serving. Do not estimate or adjust anything.
- serving_size_text: the serving size line as printed, e.g. "2/3 cup (55g)".
- serving_amount and serving_unit: the metric amount in parentheses, e.g. 55 and "g" (or "ml" for drinks). Use 0 and "" if no metric amount is printed.
- Use 0 for any value that isn't visible. readable is false if the panel is too blurry, cut off or isn't a nutrition label.
- allergens: the "Contains:" / allergen statement and any gluten-free claim, copied as printed, or "".
- product_name: the product name if visible on the photo, otherwise a short generic name for the food.`;

const LABEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "product_name", "serving_size_text", "serving_amount", "serving_unit", "servings_per_container", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "allergens"],
  properties: {
    readable: { type: "boolean" },
    product_name: { type: "string" },
    serving_size_text: { type: "string" },
    serving_amount: { type: "number" },
    serving_unit: { type: "string", enum: ["g", "ml", ""] },
    servings_per_container: { type: "number" },
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    fiber_g: { type: "number" },
    sugar_g: { type: "number" },
    allergens: { type: "string" },
  },
};

/** Read a Nutrition Facts label (values per serving, as printed). */
export async function readLabel({ apiKey, model, image }) {
  const content = [
    { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
    { type: "text", text: "Read this nutrition label." },
  ];
  const d = await askClaude({ apiKey, model, system: LABEL_SYSTEM, schema: LABEL_SCHEMA, content, what: "label reading" });
  if (!d.readable) throw new Error("Couldn't read that label. Try again with the whole panel flat, in focus and without glare.");
  return {
    name: d.product_name, servText: d.serving_size_text, servAmt: d.serving_amount || 0, servUnit: d.serving_unit || "",
    kcal: Math.round(d.calories), p: round1(d.protein_g), c: round1(d.carbs_g), f: round1(d.fat_g),
    fiber: round1(d.fiber_g), sugar: round1(d.sugar_g), allergens: d.allergens || "",
  };
}

/* ---------- Food coach ---------- */

const COACH_SYSTEM = `You are a warm, practical nutrition coach inside a couple's personal macro-tracking app.
You are talking to one person about their own eating. Be encouraging and specific, never preachy or shaming.
Favor simple, realistic food that normal people cook or buy, including grocery-store and restaurant options.
Respect stated preferences and dislikes. Dietary needs (like gluten-free) are strict rules: every suggestion must comply, and point out hidden sources to watch for (for gluten: soy sauce, malt, regular oats, breading, beer, many sauces and dressings) and suggest certified versions where it matters. You are not a doctor; for medical conditions, suggest a professional briefly.
Now and then (roughly one suggestion in four) include a trendy or viral recipe from social media food trends, adapted to fit the macros and dietary needs, and start its name with "🔥 ".
Keep every text field short: one or two sentences.`;

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "ideas"],
  properties: {
    intro: { type: "string" },
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "why", "portion", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "how"],
        properties: {
          name: { type: "string" },
          why: { type: "string" },
          portion: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          ingredients: { type: "array", items: { type: "string" } },
          how: { type: "string" },
        },
      },
    },
  },
};

/** Suggest meals that fit what's left of today's targets. */
export async function suggestMeals({ apiKey, model, context, request }) {
  const text = `Suggest 4 meal or snack ideas for me right now.

${context}

${request ? `What I'm in the mood for: ${request}` : "Surprise me with a good mix."}

Each idea should fit inside my remaining calories and help me close my protein gap. Give macros per portion as eaten.`;
  const data = await askClaude({ apiKey, model, system: COACH_SYSTEM, schema: IDEAS_SCHEMA, content: [{ type: "text", text }], what: "meal ideas" });
  data.ideas = (data.ideas || []).map((i) => ({
    name: i.name, why: i.why, portion: i.portion, ingredients: i.ingredients || [], how: i.how,
    kcal: Math.round(i.calories), p: round1(i.protein_g), c: round1(i.carbs_g), f: round1(i.fat_g),
  }));
  return data;
}

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "verdict", "wins", "focus", "swaps", "grocery_list"],
  properties: {
    headline: { type: "string" },
    verdict: { type: "string", enum: ["great", "good", "mixed", "needs_work", "not_enough_data"] },
    wins: { type: "array", items: { type: "string" } },
    focus: { type: "array", items: { type: "string" } },
    swaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["instead_of", "try", "why"],
        properties: { instead_of: { type: "string" }, try: { type: "string" }, why: { type: "string" } },
      },
    },
    grocery_list: { type: "array", items: { type: "string" } },
  },
};

/** Review the last week of food logs. */
export async function reviewEating({ apiKey, model, context }) {
  const text = `Here is my food log for the last 7 days and my targets. Am I eating well for my goal?

${context}

Give: a one-line headline, an overall verdict, 2-3 specific wins, 2-3 things to focus on this week, up to 3 easy food swaps based on things I actually ate, and a short grocery list (6-10 items) that would make next week easier.
If I have dietary needs, flag any logged foods that commonly break them (gently, as "double-check" items) and keep every swap and grocery item compliant.
If fewer than 3 days are logged, set verdict to not_enough_data and keep the advice general.`;
  return askClaude({ apiKey, model, system: COACH_SYSTEM, schema: REVIEW_SCHEMA, content: [{ type: "text", text }], what: "review" });
}

const DAY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intro", "meals", "tips"],
  properties: {
    intro: { type: "string" },
    meals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slot", "title", "items"],
        properties: {
          slot: { type: "string" },
          title: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["food", "portion", "calories", "protein_g", "carbs_g", "fat_g"],
              properties: {
                food: { type: "string" }, portion: { type: "string" }, calories: { type: "number" },
                protein_g: { type: "number" }, carbs_g: { type: "number" }, fat_g: { type: "number" },
              },
            },
          },
        },
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
};

/** A full sample day that hits each meal's budget. */
export async function suggestExampleDay({ apiKey, model, context, budgets }) {
  const text = `Build me one realistic example day of eating that hits my targets, so I can see how to map out meals.

${context}

Meal budgets (each meal should land within about 10% of its numbers):
${budgets.map((b) => `- ${b.name}: ${b.kcal} kcal, ${b.p} g protein, ${b.c} g carbs, ${b.f} g fat`).join("\n")}

Use exactly these meal names as slot. Give each meal a short appetizing title and 2-5 foods with everyday portions (oz, cups, tbsp, pieces) and the macros for that portion. Use simple foods that are easy to buy and prep, and keep the day varied. Add 2-3 short meal-planning tips.`;
  const data = await askClaude({ apiKey, model, system: COACH_SYSTEM, schema: DAY_SCHEMA, content: [{ type: "text", text }], what: "example day" });
  data.meals = (data.meals || []).map((m) => {
    const items = (m.items || []).map((i) => ({
      name: `${i.portion} ${i.food}`.trim(), kcal: Math.round(i.calories), p: Math.round(i.protein_g), c: Math.round(i.carbs_g), f: Math.round(i.fat_g),
    }));
    const total = items.reduce((t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
    return { slot: m.slot, title: m.title, items, total };
  });
  return data;
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function friendlyError(err) {
  const status = err?.status;
  if (status === 401) return "Your Claude API key was rejected. Check it in Settings.";
  if (status === 403) return "This API key doesn't have access to that model.";
  if (status === 429) return "Too many requests right now. Wait a moment and try again.";
  if (status === 400 && /credit|billing/i.test(err?.message || "")) return "Your Anthropic account is out of credits.";
  if (status >= 500) return "Claude is having trouble right now. Try again shortly.";
  if (!navigator.onLine) return "You're offline. Photo estimates need an internet connection.";
  return err?.message || "Something went wrong talking to Claude.";
}
