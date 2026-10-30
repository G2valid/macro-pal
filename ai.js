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
export async function estimateFood({ apiKey, model, image, description, answers = [], previous = null }) {
  const client = await getClient(apiKey);

  const content = [];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
  }
  let text = description?.trim()
    ? `Description from the user: ${description.trim()}`
    : "Estimate the food in this photo.";
  if (previous) {
    text += `\n\nYour previous estimate was:\n${JSON.stringify(previous.items)}`;
  }
  if (answers.length) {
    text += `\n\nThe user answered your questions:\n` +
      answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n") +
      `\n\nUpdate the estimate using these answers.`;
  }
  content.push({ type: "text", text });

  const params = {
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
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
    throw new Error("Claude declined to estimate this one. Try a different photo or add a description.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("The estimate got cut off. Please try again.");
  }
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No estimate came back. Please try again.");
  let data;
  try {
    data = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Couldn't read Claude's answer. Please try again.");
  }
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
