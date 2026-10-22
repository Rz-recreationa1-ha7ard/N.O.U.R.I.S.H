import { GoogleGenAI } from "@google/genai";
import type { Nutrients, FoodCategory } from "./nutriscore";

export interface OCRResult {
  rawText: string;
  suggestedName: string;
  suggestedBrand: string;
  category: FoodCategory;
  nutrients: Nutrients;
  ingredients: string;
  novaScore: 1 | 2 | 3 | 4;
}

interface GeminiNutritionJSON {
  suggestedName?: string;
  suggestedBrand?: string;
  category?: string;
  energyKcal?: number | string;
  sugars?: number | string;
  saturatedFat?: number | string;
  salt?: number | string;
  fiber?: number | string;
  protein?: number | string;
  fruitVegLegume?: number | string;
  ingredients?: string;
  novaScore?: number | string;
  rawText?: string;
}

const GEMINI_KEY_STORAGE = "nourish_gemini_api_key";

export function getStoredGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_KEY_STORAGE) || import.meta.env["VITE_GEMINI_API_KEY"] || "";
}

export function saveStoredGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key.trim()) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  }
}

/**
 * Ensures image data URL is in a MIME format supported by Gemini Vision.
 * If unsupported (e.g. image/avif, image/svg+xml), convert via an HTML canvas to image/jpeg.
 */
async function ensureSupportedImageFormat(dataUrl: string): Promise<{ mimeType: string; base64Data: string }> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const rawMime = match ? match[1]?.toLowerCase() || "image/jpeg" : "image/jpeg";
  const rawBase64 = match ? match[2] || "" : dataUrl.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

  const supportedTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/gif",
    "image/bmp",
    "image/tiff",
  ]);

  const normalizedMime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;

  if (supportedTypes.has(normalizedMime)) {
    return { mimeType: normalizedMime, base64Data: rawBase64 };
  }

  // If in browser environment, convert unsupported format (e.g. image/avif) to image/jpeg
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const convertedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              return reject(new Error("Failed to get canvas 2D context"));
            }
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.95));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image for format conversion"));
        img.src = dataUrl;
      });

      const convMatch = convertedDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (convMatch && convMatch[1] && convMatch[2]) {
        return { mimeType: convMatch[1], base64Data: convMatch[2] };
      }
    } catch (conversionErr) {
      console.warn("Canvas format conversion fallback:", conversionErr);
    }
  }

  return { mimeType: "image/jpeg", base64Data: rawBase64 };
}

/**
 * Multimodal Gemini Vision AI OCR using the official @google/genai SDK (gemini-3.6-flash)
 */
export async function extractDataWithGeminiVision(
  imageDataUrl: string,
  apiKey: string,
  onProgress?: (status: string, progress: number) => void
): Promise<OCRResult> {
  const cleanKey = apiKey.trim() || getStoredGeminiKey();
  if (!cleanKey) {
    throw new Error("Gemini API key required. Please enter your free key from aistudio.google.com");
  }

  if (onProgress) {
    onProgress("Preparing food label photo for Gemini Vision AI...", 0.2);
  }

  // Extract base64 data and normalize mime type (converting AVIF/etc if needed)
  const { mimeType, base64Data } = await ensureSupportedImageFormat(imageDataUrl);

  const prompt = `You are a world-class food label OCR nutritionist. Analyze this packaged food label photo carefully.
Extract the nutritional facts per 100g or per 100ml.
Return ONLY valid JSON matching this exact structure:
{
  "suggestedName": "Product Name",
  "suggestedBrand": "Brand Name",
  "category": "general" or "beverage",
  "energyKcal": number,
  "sugars": number,
  "saturatedFat": number,
  "salt": number,
  "fiber": number,
  "protein": number,
  "fruitVegLegume": number,
  "ingredients": "full declared ingredients list string including E-numbers and INS numbers",
  "novaScore": 1 or 2 or 3 or 4,
  "rawText": "transcription of visible label text"
}
Key Instructions:
1. Convert Sodium in mg to grams of Salt using formula: (mg_sodium / 1000) * 2.5.
2. If label lists per serving AND per 100g, ALWAYS output the per 100g/100ml values.
3. Extract all E-numbers and INS numbers in ingredients accurately.`;

  if (onProgress) {
    onProgress("Analyzing label with Gemini 3.6 Flash Vision AI...", 0.5);
  }

  const ai = new GoogleGenAI({ apiKey: cleanKey });

  let rawOutput = "";
  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: [
        { type: "text", text: prompt },
        {
          type: "image",
          data: base64Data,
          mime_type: mimeType,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
    });

    rawOutput = interaction.output_text?.trim() || "";
    if (!rawOutput && interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === "model_output" && Array.isArray(step.content)) {
          for (const part of step.content) {
            if ("text" in part && typeof (part as { text?: string }).text === "string") {
              rawOutput += (part as { text: string }).text;
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini Vision AI request failed: ${message}`);
  }

  if (!rawOutput) {
    throw new Error("No response received from Gemini Vision AI.");
  }

  if (onProgress) {
    onProgress("Parsing nutritional facts & NOVA classification...", 0.9);
  }

  const cleanedJson = rawOutput
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: GeminiNutritionJSON;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch {
    const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (innerErr) {
        throw new Error(
          `Failed to parse nutrition JSON from Gemini response: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
        );
      }
    } else {
      throw new Error("Gemini response did not contain valid JSON data.");
    }
  }

  const novaVal = Number(parsed.novaScore);
  const validNova = ([1, 2, 3, 4].includes(novaVal) ? novaVal : 3) as 1 | 2 | 3 | 4;

  return {
    rawText: typeof parsed.rawText === "string" && parsed.rawText ? parsed.rawText : rawOutput.substring(0, 300),
    suggestedName:
      typeof parsed.suggestedName === "string" && parsed.suggestedName.trim()
        ? parsed.suggestedName.trim()
        : "Scanned Food Product",
    suggestedBrand:
      typeof parsed.suggestedBrand === "string" && parsed.suggestedBrand.trim()
        ? parsed.suggestedBrand.trim()
        : "Scanned Brand",
    category: parsed.category === "beverage" ? "beverage" : "general",
    nutrients: {
      energyKcal: Number(parsed.energyKcal) || 0,
      sugars: Number(parsed.sugars) || 0,
      saturatedFat: Number(parsed.saturatedFat) || 0,
      salt: Number(parsed.salt) || 0,
      fiber: Number(parsed.fiber) || 0,
      protein: Number(parsed.protein) || 0,
      fruitVegLegume: Number(parsed.fruitVegLegume) || 0,
    },
    ingredients:
      typeof parsed.ingredients === "string" && parsed.ingredients.trim()
        ? parsed.ingredients.trim()
        : "No ingredients list detected.",
    novaScore: validNova,
  };
}

/**
 * Fallback parser for text inputs or sample labels
 */
export function parseLabelText(text: string): OCRResult {
  const cleanText = (text || "").replace(/\r\n/g, "\n");
  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

  let suggestedName = "Scanned Packaged Food";
  let suggestedBrand = "Scanned Brand";

  for (const line of lines.slice(0, 8)) {
    if (
      !/nutrition|ingredients|facts|per 100|servings|energy|kcal|table|information|values|approx/i.test(line) &&
      line.length > 3 &&
      line.length < 50
    ) {
      suggestedName = line;
      break;
    }
  }

  const extractNumbersFromLine = (line: string): number[] => {
    const sanitized = line.replace(/(\d+),(\d+)/g, "$1.$2");
    const matches = sanitized.match(/[-+]?\d+(?:\.\d+)?/g);
    if (!matches) return [];
    return matches.map((m) => parseFloat(m)).filter((n) => !isNaN(n));
  };

  const findNutrientInLines = (keywords: RegExp[], preferLarger = false): number => {
    for (const line of lines) {
      const isMatch = keywords.some((kw) => kw.test(line));
      if (!isMatch) continue;

      const nums = extractNumbersFromLine(line);
      if (nums.length === 0) continue;

      const validNums = nums.filter((n) => n >= 0 && n < 10000);
      if (validNums.length === 0) continue;

      if (validNums.length === 1) {
        return validNums[0] ?? 0;
      }

      if (preferLarger) {
        return Math.max(...validNums);
      }
      return validNums[0] ?? 0;
    }
    return 0;
  };

  let energyKcal = findNutrientInLines([/energy/i, /calorie/i, /kcal/i, /kca/i], true);
  if (energyKcal > 10000) energyKcal = 0;

  if (energyKcal > 2000 && /kj/i.test(cleanText)) {
    const kJVal = findNutrientInLines([/kj/i]);
    if (kJVal > 0) {
      energyKcal = Math.round(kJVal / 4.184);
    }
  }

  const sugars = findNutrientInLines([/total\s*sugars?/i, /added\s*sugars?/i, /sugars?/i, /sugan/i]);

  const saturatedFat = findNutrientInLines([
    /saturated\s*fat/i,
    /sat\s*fat/i,
    /saturated\s*fatty/i,
    /sat\.?\s*fat/i,
    /saturated/i,
  ]);

  let salt = 0;
  const directSalt = findNutrientInLines([/edible\s*salt/i, /salt/i]);
  const sodiumMg = findNutrientInLines([/sodium/i, /sodlum/i, /\bna\b/i]);

  if (directSalt > 0 && directSalt < 30) {
    salt = directSalt;
  } else if (sodiumMg > 0) {
    if (sodiumMg > 50) {
      salt = parseFloat(((sodiumMg / 1000) * 2.5).toFixed(2));
    } else {
      salt = parseFloat((sodiumMg * 2.5).toFixed(2));
    }
  }

  const fiber = findNutrientInLines([/dietary\s*fibre/i, /dietary\s*fiber/i, /fibre/i, /fiber/i]);
  const protein = findNutrientInLines([/proteins?/i, /protien/i, /pratein/i, /prot\b/i], true);
  const fruitVegLegume = findNutrientInLines([/fruit/i, /vegetable/i, /nuts/i, /legumes/i]);

  let ingredients = "";
  const ingredientsMatch = cleanText.match(/ingredients?\s*[:\-]([\s\S]*?)(?:\.|nutrition|contains|allergen|mfd|batch|$)/i);

  if (ingredientsMatch && ingredientsMatch[1] && ingredientsMatch[1].trim().length > 5) {
    ingredients = ingredientsMatch[1].trim().replace(/\s+/g, " ");
  } else {
    const ingLines = lines.filter((l) =>
      /flour|oil|sugar|salt|water|milk|wheat|syrup|ins\s*\d+|e\d+|powder|extract|flavor|colour|emulsifier/i.test(l)
    );
    if (ingLines.length > 0) {
      ingredients = ingLines.join(" ");
    } else {
      ingredients = cleanText.substring(0, 350);
    }
  }

  let novaScore: 1 | 2 | 3 | 4 = 3;
  if (/ins\s*\d+|e\d+|flavour enhancer|emulsifier|preservative|colour|artificial|hydrogenated/i.test(ingredients)) {
    novaScore = 4;
  } else if (/oil|sugar|salt|butter|maida/i.test(ingredients)) {
    novaScore = 3;
  } else {
    novaScore = 1;
  }

  const isBeverage = /beverage|drink|juice|soda|cola|tea|coffee|ml\b/i.test(cleanText);

  return {
    rawText: cleanText,
    suggestedName,
    suggestedBrand,
    category: isBeverage ? "beverage" : "general",
    nutrients: {
      energyKcal: isNaN(energyKcal) ? 0 : energyKcal,
      sugars: isNaN(sugars) ? 0 : sugars,
      saturatedFat: isNaN(saturatedFat) ? 0 : saturatedFat,
      salt: isNaN(salt) ? 0 : salt,
      fiber: isNaN(fiber) ? 0 : fiber,
      protein: isNaN(protein) ? 0 : protein,
      fruitVegLegume: isNaN(fruitVegLegume) ? 0 : fruitVegLegume,
    },
    ingredients: ingredients || "No ingredients list detected.",
    novaScore,
  };
}

export const SAMPLE_LABELS = [
  {
    id: "sample-biscuits",
    title: "Digestive Biscuit Label",
    subtitle: "High fiber, medium sugar, palm oil & additives",
    sampleText: `BRITANNIA NUTRICHOICE DIGESTIVE
NUTRITION INFORMATION (Per 100g)
Energy: 480 kcal
Protein: 8.5 g
Carbohydrate: 68 g
Total Sugars: 15.2 g
Added Sugars: 12.0 g
Total Fat: 20.0 g
Saturated Fat: 9.5 g
Dietary Fibre: 6.0 g
Sodium: 450 mg

INGREDIENTS: Wheat Flour (Atta) (55%), Refined Palm Oil, Sugar, Wheat Bran (4.5%), High Fructose Corn Syrup, Raising Agents (INS 503(ii), INS 500(ii)), Salt, Emulsifier (INS 322), Acidity Regulator (INS 330), Antioxidant (INS 319). CONTAINS PERMITTED NATURAL COLOUR (INS 150d) AND ADDED FLAVOURS.`,
  },
  {
    id: "sample-chips",
    title: "Crisps / Namkeen Label",
    subtitle: "High sodium & saturated fat, ultra-processed",
    sampleText: `SPICY CRUNCH POTATO CHIPS
NUTRITIONAL FACTS Per 100g:
Energy: 540 Kcal
Protein: 6.8g
Carbohydrates: 52g
Total Sugars: 2.1g
Total Fat: 34g
Saturated Fatty Acids: 14.5g
Sodium: 820mg
Dietary Fibre: 3.2g

INGREDIENTS: Potato (62%), Edible Vegetable Oil (Palmolein), Seasoning (Spices & Condiments, Salt, Maltodextrin, Sugar, Flavour Enhancers (INS 621, INS 635), Acidity Regulators (INS 330, INS 260), Anti-caking Agent (INS 551), Synthetic Food Colour (INS 102, INS 110)).`,
  },
  {
    id: "sample-juice",
    title: "Real Fruit Packaged Juice",
    subtitle: "Beverage category, high free sugars",
    sampleText: `REAL MANGO NECTAR BEVERAGE
NUTRITIONAL INFORMATION per 100 ml:
Energy: 62 kcal
Protein: 0.4 g
Carbohydrate: 15.0 g
Total Sugars: 14.2 g
Added Sugars: 11.5 g
Fat: 0.1 g
Saturated Fat: 0.0 g
Sodium: 15 mg
Vitamin C: 20 mg

INGREDIENTS: Water, Mango Pulp (25%), Sugar, Acidity Regulator (INS 330), Antioxidant (INS 300), Stabilizer (INS 440). Contains added nature identical flavouring substances.`,
  },
];
