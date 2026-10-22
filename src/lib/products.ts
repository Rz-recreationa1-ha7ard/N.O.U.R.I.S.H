import type { FoodCategory, Nutrients } from "./nutriscore";

export interface Product {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  categoryLabel: string;
  category: FoodCategory;
  /** 1-4, mocked from Open Food Facts labels until the text classifier ships */
  nova: 1 | 2 | 3 | 4;
  novaSource: "off" | "ifct";
  ingredients: string;
  source: "off" | "ifct" | "label";
  nutrients: Nutrients;
  /** grouping key for alternatives */
  group: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "maggi-masala",
    name: "Maggi 2-Minute Masala Noodles",
    brand: "Nestlé India",
    barcode: "8901058000023",
    categoryLabel: "Instant noodles",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Refined wheat flour (maida), palm oil, salt, wheat gluten, thickener (INS 508, INS 412), acidity regulators (INS 501(i), INS 500(i)), humectant (INS 451(i)), tastemaker: hydrolysed groundnut protein, spices, flavour enhancer (INS 621), colour (INS 150d), antioxidant (INS 320).",
    source: "label",
    group: "noodles",
    nutrients: {
      energyKcal: 452,
      sugars: 4.6,
      saturatedFat: 8.9,
      salt: 4.2,
      fiber: 2.1,
      protein: 9.6,
      fruitVegLegume: 0,
    },
  },
  {
    id: "kurkure-masala",
    name: "Kurkure Masala Munch",
    brand: "PepsiCo India",
    barcode: "8901491101837",
    categoryLabel: "Extruded corn snack",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Rice meal, corn meal, edible vegetable oil (palmolein), gram meal, spices and condiments, salt, flavour enhancer (INS 621), acidity regulator (INS 330), colour (INS 102), antioxidant (INS 320).",
    source: "label",
    group: "namkeen",
    nutrients: {
      energyKcal: 546,
      sugars: 2.5,
      saturatedFat: 12.7,
      salt: 2.6,
      fiber: 2.8,
      protein: 6.5,
      fruitVegLegume: 0,
    },
  },
  {
    id: "haldirams-bhujia",
    name: "Haldiram's Bikaneri Bhujia",
    brand: "Haldiram's",
    barcode: "8904063200144",
    categoryLabel: "Namkeen",
    category: "general",
    nova: 3,
    novaSource: "off",
    ingredients:
      "Gram flour, edible vegetable oil (palmolein), moth bean flour, salt, spices, clove oil, acidity regulator (INS 330).",
    source: "label",
    group: "namkeen",
    nutrients: {
      energyKcal: 566,
      sugars: 1.8,
      saturatedFat: 14.2,
      salt: 2.1,
      fiber: 6.2,
      protein: 14.1,
      fruitVegLegume: 0,
    },
  },
  {
    id: "parle-g",
    name: "Parle-G Glucose Biscuits",
    brand: "Parle Products",
    barcode: "8901719101014",
    categoryLabel: "Biscuits",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Refined wheat flour, sugar, edible vegetable oil (palm), invert sugar syrup, leavening agents (INS 503(ii), INS 500(ii)), salt, emulsifier (INS 322), dough conditioner (INS 223), artificial flavour (vanilla).",
    source: "label",
    group: "biscuits",
    nutrients: {
      energyKcal: 452,
      sugars: 26.5,
      saturatedFat: 6.4,
      salt: 0.85,
      fiber: 1.4,
      protein: 7.1,
      fruitVegLegume: 0,
    },
  },
  {
    id: "britannia-nutrichoice",
    name: "Britannia NutriChoice Digestive High Fibre",
    brand: "Britannia",
    barcode: "8901063142008",
    categoryLabel: "Biscuits",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Whole wheat flour, edible vegetable oil, sugar, wheat bran, invert syrup, raising agents (INS 500(ii), INS 503(ii)), salt, emulsifiers (INS 322, INS 471).",
    source: "label",
    group: "biscuits",
    nutrients: {
      energyKcal: 450,
      sugars: 15.2,
      saturatedFat: 8.1,
      salt: 1.1,
      fiber: 9.4,
      protein: 8.2,
      fruitVegLegume: 0,
    },
  },
  {
    id: "thums-up",
    name: "Thums Up",
    brand: "Coca-Cola India",
    barcode: "8901764012345",
    categoryLabel: "Carbonated soft drink",
    category: "beverage",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Carbonated water, sugar, acidity regulator (INS 338), caffeine, caramel colour (INS 150d), added flavours.",
    source: "label",
    group: "cola",
    nutrients: {
      energyKcal: 44,
      sugars: 10.8,
      saturatedFat: 0,
      salt: 0.02,
      fiber: 0,
      protein: 0,
      fruitVegLegume: 0,
    },
  },
  {
    id: "coke-zero",
    name: "Coca-Cola Zero Sugar",
    brand: "Coca-Cola India",
    barcode: "8901764019876",
    categoryLabel: "Carbonated soft drink",
    category: "beverage",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Carbonated water, caramel colour (INS 150d), acidity regulators (INS 338, INS 331(iii)), sweeteners (INS 951, INS 950), preservative (INS 211), caffeine.",
    source: "label",
    group: "cola",
    nutrients: {
      energyKcal: 0.3,
      sugars: 0,
      saturatedFat: 0,
      salt: 0.03,
      fiber: 0,
      protein: 0,
      fruitVegLegume: 0,
    },
  },
  {
    id: "real-mixed-fruit",
    name: "Real Mixed Fruit Juice",
    brand: "Dabur",
    barcode: "8901207033407",
    categoryLabel: "Fruit beverage",
    category: "beverage",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Water, fruit juice concentrates (mango, grape, apple, pineapple, orange 24%), sugar, acidity regulator (INS 330), antioxidant (INS 300), stabiliser (INS 440).",
    source: "label",
    group: "juice",
    nutrients: {
      energyKcal: 52,
      sugars: 12.6,
      saturatedFat: 0,
      salt: 0.03,
      fiber: 0.2,
      protein: 0.1,
      fruitVegLegume: 24,
    },
  },
  {
    id: "amul-taaza",
    name: "Amul Taaza Toned Milk",
    brand: "Amul",
    barcode: "8901262010016",
    categoryLabel: "Toned milk",
    category: "beverage",
    nova: 1,
    novaSource: "off",
    ingredients: "Toned milk (homogenised, UHT treated).",
    source: "label",
    group: "dairy",
    nutrients: {
      energyKcal: 58,
      sugars: 4.7,
      saturatedFat: 2.1,
      salt: 0.11,
      fiber: 0,
      protein: 3.2,
      fruitVegLegume: 0,
    },
  },
  {
    id: "amul-masti-dahi",
    name: "Amul Masti Dahi",
    brand: "Amul",
    barcode: "8901262230018",
    categoryLabel: "Curd",
    category: "general",
    nova: 1,
    novaSource: "off",
    ingredients: "Pasteurised toned milk, active lactic cultures.",
    source: "label",
    group: "dairy",
    nutrients: {
      energyKcal: 60,
      sugars: 4.2,
      saturatedFat: 2.0,
      salt: 0.1,
      fiber: 0,
      protein: 3.1,
      fruitVegLegume: 0,
    },
  },
  {
    id: "amul-cheese",
    name: "Amul Processed Cheese Block",
    brand: "Amul",
    barcode: "8901262130012",
    categoryLabel: "Processed cheese",
    category: "cheese",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Cheese, water, milk solids, emulsifying salts (INS 339(ii), INS 450(i)), common salt, citric acid (INS 330), preservative (INS 200), colour (INS 160a).",
    source: "label",
    group: "dairy",
    nutrients: {
      energyKcal: 315,
      sugars: 1.9,
      saturatedFat: 16.8,
      salt: 2.9,
      fiber: 0,
      protein: 20.0,
      fruitVegLegume: 0,
    },
  },
  {
    id: "bournvita",
    name: "Cadbury Bournvita Health Drink",
    brand: "Mondelez India",
    barcode: "7622201234561",
    categoryLabel: "Malted drink powder",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Malt extract, sugar, cocoa solids, liquid glucose, milk solids, emulsifier (INS 322), raising agent (INS 500(ii)), vitamins and minerals, flavour, colour (INS 150c).",
    source: "label",
    group: "drinkmix",
    nutrients: {
      energyKcal: 400,
      sugars: 37.4,
      saturatedFat: 0.9,
      salt: 0.45,
      fiber: 1.6,
      protein: 7.2,
      fruitVegLegume: 0,
    },
  },
  {
    id: "lays-classic",
    name: "Lay's India's Magic Masala",
    brand: "PepsiCo India",
    barcode: "8901491100175",
    categoryLabel: "Potato chips",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Potatoes, edible vegetable oil (palmolein), seasoning: spices, salt, sugar, flavour enhancers (INS 627, INS 631, INS 621), acidity regulators (INS 330, INS 296), colour (INS 110), anticaking agent (INS 551).",
    source: "label",
    group: "chips",
    nutrients: {
      energyKcal: 532,
      sugars: 2.1,
      saturatedFat: 13.4,
      salt: 1.6,
      fiber: 3.6,
      protein: 6.4,
      fruitVegLegume: 40,
    },
  },
  {
    id: "too-yumm-multigrain",
    name: "Too Yumm! Multigrain Chips",
    brand: "Guiltfree Industries",
    barcode: "8906086481234",
    categoryLabel: "Baked chips",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Multigrain flour (rice, jowar, ragi, oats), edible vegetable oil, salt, spices, acidity regulator (INS 330), flavour.",
    source: "label",
    group: "chips",
    nutrients: {
      energyKcal: 428,
      sugars: 2.0,
      saturatedFat: 4.6,
      salt: 1.3,
      fiber: 4.1,
      protein: 7.0,
      fruitVegLegume: 0,
    },
  },
  {
    id: "dairy-milk",
    name: "Cadbury Dairy Milk",
    brand: "Mondelez India",
    barcode: "7622210993104",
    categoryLabel: "Milk chocolate",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Sugar, milk solids, cocoa butter, cocoa solids, emulsifiers (INS 442, INS 476), raising agent (INS 500(ii)), artificial flavour (vanilla).",
    source: "label",
    group: "chocolate",
    nutrients: {
      energyKcal: 534,
      sugars: 56.4,
      saturatedFat: 18.6,
      salt: 0.24,
      fiber: 1.4,
      protein: 7.3,
      fruitVegLegume: 0,
    },
  },
  {
    id: "frooti",
    name: "Mango Frooti",
    brand: "Parle Agro",
    barcode: "8901207011115",
    categoryLabel: "Mango drink",
    category: "beverage",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Water, mango pulp (17%), sugar, acidity regulator (INS 330), colour (INS 102), stabiliser (INS 440), added flavours.",
    source: "label",
    group: "juice",
    nutrients: {
      energyKcal: 66,
      sugars: 15.8,
      saturatedFat: 0,
      salt: 0.02,
      fiber: 0.1,
      protein: 0.1,
      fruitVegLegume: 17,
    },
  },
  {
    id: "saffola-gold",
    name: "Saffola Gold Blended Cooking Oil",
    brand: "Marico",
    barcode: "8901207200011",
    categoryLabel: "Edible oil",
    category: "fat",
    nova: 3,
    novaSource: "off",
    ingredients:
      "Refined rice bran oil, refined sunflower oil, antioxidant (INS 319), added vitamins A, D.",
    source: "label",
    group: "oil",
    nutrients: {
      energyKcal: 900,
      sugars: 0,
      saturatedFat: 19,
      salt: 0,
      fiber: 0,
      protein: 0,
      fruitVegLegume: 0,
      totalFat: 100,
    },
  },
  {
    id: "amul-butter",
    name: "Amul Butter",
    brand: "Amul",
    barcode: "8901262010030",
    categoryLabel: "Butter",
    category: "fat",
    nova: 3,
    novaSource: "off",
    ingredients: "Butter (from pasteurised cream), common salt, colour (INS 160a).",
    source: "label",
    group: "oil",
    nutrients: {
      energyKcal: 720,
      sugars: 0.5,
      saturatedFat: 51,
      salt: 2.2,
      fiber: 0,
      protein: 0.5,
      fruitVegLegume: 0,
      totalFat: 80,
    },
  },
  {
    id: "quaker-oats",
    name: "Quaker Oats (plain)",
    brand: "PepsiCo India",
    barcode: "8901491102345",
    categoryLabel: "Rolled oats",
    category: "general",
    nova: 1,
    novaSource: "off",
    ingredients: "100% wholegrain rolled oats.",
    source: "label",
    group: "breakfast",
    nutrients: {
      energyKcal: 389,
      sugars: 1.0,
      saturatedFat: 1.2,
      salt: 0.02,
      fiber: 10.1,
      protein: 13.5,
      fruitVegLegume: 0,
    },
  },
  {
    id: "kelloggs-chocos",
    name: "Kellogg's Chocos",
    brand: "Kellogg India",
    barcode: "8901499008102",
    categoryLabel: "Breakfast cereal",
    category: "general",
    nova: 4,
    novaSource: "off",
    ingredients:
      "Whole wheat flour, sugar, cocoa solids, edible vegetable oil, salt, invert sugar, emulsifier (INS 322), colour (INS 150c), vitamins and minerals.",
    source: "label",
    group: "breakfast",
    nutrients: {
      energyKcal: 408,
      sugars: 34.2,
      saturatedFat: 2.6,
      salt: 0.45,
      fiber: 5.0,
      protein: 7.4,
      fruitVegLegume: 0,
    },
  },
];

// A small slice of IFCT 2017 (Indian Food Composition Tables) used to demo the
// base scoring engine on raw Indian nutrient data (per 100 g, edible portion).
export interface IfctFood {
  code: string;
  name: string;
  group: string;
  nutrients: Nutrients;
}

export const IFCT_FOODS: IfctFood[] = [
  { code: "A001", name: "Rice, raw, milled", group: "Cereals", nutrients: { energyKcal: 356, sugars: 0.1, saturatedFat: 0.2, salt: 0.01, fiber: 2.8, protein: 7.9, fruitVegLegume: 0 } },
  { code: "A014", name: "Wheat flour, atta", group: "Cereals", nutrients: { energyKcal: 321, sugars: 1.6, saturatedFat: 0.3, salt: 0.01, fiber: 11.4, protein: 10.6, fruitVegLegume: 0 } },
  { code: "B012", name: "Bengal gram, dal", group: "Pulses", nutrients: { energyKcal: 342, sugars: 3.4, saturatedFat: 0.6, salt: 0.02, fiber: 15.1, protein: 21.6, fruitVegLegume: 100 } },
  { code: "B024", name: "Green gram, whole", group: "Pulses", nutrients: { energyKcal: 334, sugars: 2.5, saturatedFat: 0.3, salt: 0.02, fiber: 15.8, protein: 23.9, fruitVegLegume: 100 } },
  { code: "C021", name: "Spinach (palak)", group: "Vegetables", nutrients: { energyKcal: 24, sugars: 0.6, saturatedFat: 0.1, salt: 0.16, fiber: 3.1, protein: 2.6, fruitVegLegume: 100 } },
  { code: "C044", name: "Potato, with skin", group: "Vegetables", nutrients: { energyKcal: 87, sugars: 1.2, saturatedFat: 0.05, salt: 0.01, fiber: 2.4, protein: 2.0, fruitVegLegume: 100 } },
  { code: "D009", name: "Banana, ripe", group: "Fruits", nutrients: { energyKcal: 116, sugars: 15.6, saturatedFat: 0.1, salt: 0.01, fiber: 2.2, protein: 1.3, fruitVegLegume: 100 } },
  { code: "D031", name: "Mango, ripe", group: "Fruits", nutrients: { energyKcal: 74, sugars: 14.8, saturatedFat: 0.1, salt: 0.01, fiber: 1.8, protein: 0.6, fruitVegLegume: 100 } },
  { code: "E006", name: "Groundnut, roasted", group: "Nuts & oilseeds", nutrients: { energyKcal: 567, sugars: 4.0, saturatedFat: 7.9, salt: 0.02, fiber: 8.5, protein: 25.3, fruitVegLegume: 0 } },
  { code: "F004", name: "Buffalo milk, whole", group: "Milk", nutrients: { energyKcal: 97, sugars: 5.0, saturatedFat: 4.4, salt: 0.1, fiber: 0, protein: 3.8, fruitVegLegume: 0 } },
  { code: "G012", name: "Chicken, breast, raw", group: "Meat", nutrients: { energyKcal: 109, sugars: 0, saturatedFat: 0.6, salt: 0.15, fiber: 0, protein: 21.8, fruitVegLegume: 0 } },
  { code: "H003", name: "Rohu fish, raw", group: "Fish", nutrients: { energyKcal: 101, sugars: 0, saturatedFat: 0.9, salt: 0.14, fiber: 0, protein: 16.6, fruitVegLegume: 0 } },
];

/**
 * Storage key for custom user products created via OCR scanning
 */
const CUSTOM_PRODUCTS_KEY = "nourish_custom_products";

export function getCustomProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomProduct(product: Product): void {
  if (typeof window === "undefined") return;
  try {
    const list = getCustomProducts();
    const filtered = list.filter((p) => p.id !== product.id);
    filtered.unshift(product);
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to save custom OCR product", err);
  }
}

export function getAllProducts(): Product[] {
  return [...getCustomProducts(), ...PRODUCTS];
}

export function getProductById(id: string): Product | undefined {
  const custom = getCustomProducts().find((p) => p.id === id);
  if (custom) return custom;
  return PRODUCTS.find((p) => p.id === id);
}

