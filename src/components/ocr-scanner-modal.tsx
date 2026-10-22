import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  ChevronRight,
  FileText,
  RotateCw,
  Key,
  ExternalLink,
} from "lucide-react";
import {
  extractDataWithGeminiVision,
  parseLabelText,
  SAMPLE_LABELS,
  getStoredGeminiKey,
  saveStoredGeminiKey,
  type OCRResult,
} from "@/lib/ocr";
import { computeNutriScore, type FoodCategory, type NutriScoreResult } from "@/lib/nutriscore";
import { GradeLetter, NovaBadge } from "@/components/nourish";
import { extractAdditives, type Additive } from "@/lib/additives";
import { personalFlags, type PersonalFlag } from "@/lib/personalization";
import { useProfile } from "@/lib/profile";
import { saveCustomProduct, type Product } from "@/lib/products";

interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: Product) => void;
}

export function OCRScannerModal({ isOpen, onClose, onProductCreated }: OCRScannerModalProps) {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [activeTab, setActiveTab] = useState<"upload" | "samples">("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable Raw OCR text
  const [rawTextState, setRawTextState] = useState("");

  // Form state for editing parsed values
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<FoodCategory>("general");
  const [energyKcal, setEnergyKcal] = useState<number>(0);
  const [sugars, setSugars] = useState<number>(0);
  const [saturatedFat, setSaturatedFat] = useState<number>(0);
  const [salt, setSalt] = useState<number>(0);
  const [fiber, setFiber] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [fruitVegLegume, setFruitVegLegume] = useState<number>(0);
  const [ingredients, setIngredients] = useState("");
  const [novaScore, setNovaScore] = useState<1 | 2 | 3 | 4>(3);

  useEffect(() => {
    const key = getStoredGeminiKey();
    if (key) {
      setApiKey(key);
    }
  }, []);

  if (!isOpen) return null;

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    saveStoredGeminiKey(key);
  };

  const handleApplyResult = (result: OCRResult) => {
    try {
      setOcrResult(result);
      setRawTextState(result.rawText || "");
      setName(result.suggestedName || "Scanned Food Product");
      setBrand(result.suggestedBrand || "Scanned Brand");
      setCategory(result.category || "general");
      setEnergyKcal(result.nutrients?.energyKcal ?? 0);
      setSugars(result.nutrients?.sugars ?? 0);
      setSaturatedFat(result.nutrients?.saturatedFat ?? 0);
      setSalt(result.nutrients?.salt ?? 0);
      setFiber(result.nutrients?.fiber ?? 0);
      setProtein(result.nutrients?.protein ?? 0);
      setFruitVegLegume(result.nutrients?.fruitVegLegume ?? 0);
      setIngredients(result.ingredients || "");
      setNovaScore(result.novaScore || 3);
    } catch (err) {
      console.error("Error applying OCR result:", err);
    }
  };

  const handleReparseRawText = (text: string) => {
    const parsed = parseLabelText(text);
    handleApplyResult(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey.trim()) {
      setError("Please configure your free Gemini API key below to scan label photos.");
      setShowKeyInput(true);
      return;
    }

    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);

      try {
        const result = await extractDataWithGeminiVision(dataUrl, apiKey, (status, prog) => {
          setProgressStatus(status);
          setProgressValue(prog);
        });
        handleApplyResult(result);
        setError(null);
      } catch (geminiErr: unknown) {
        console.error("Gemini Vision AI error:", geminiErr);
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: (typeof SAMPLE_LABELS)[0]) => {
    try {
      setError(null);
      setLoading(true);
      setImagePreview(null);
      setProgressStatus("Parsing sample label data...");
      setProgressValue(0.7);

      setTimeout(() => {
        try {
          const parsed = parseLabelText(sample.sampleText);
          handleApplyResult(parsed);
          setProgressValue(1.0);
        } catch (err) {
          console.error("Sample parsing error:", err);
          setError("Error parsing sample label text.");
        } finally {
          setLoading(false);
        }
      }, 200);
    } catch (err) {
      console.error("Sample click error:", err);
      setLoading(false);
    }
  };

  // Compute live Nutri-Score & flags safely
  const liveNutrients = {
    energyKcal: Number(energyKcal) || 0,
    sugars: Number(sugars) || 0,
    saturatedFat: Number(saturatedFat) || 0,
    salt: Number(salt) || 0,
    fiber: Number(fiber) || 0,
    protein: Number(protein) || 0,
    fruitVegLegume: Number(fruitVegLegume) || 0,
  };

  let liveNutriScore: NutriScoreResult;
  try {
    liveNutriScore = computeNutriScore(liveNutrients, category);
  } catch {
    liveNutriScore = {
      grade: "C",
      score: 5,
      negativePoints: 5,
      positivePoints: 0,
      rows: [],
      category,
      proteinWithheld: false,
    };
  }

  let liveAdditives: Additive[] = [];
  try {
    liveAdditives = extractAdditives(ingredients);
  } catch {
    liveAdditives = [];
  }

  let livePersonalFlags: PersonalFlag[] = [];
  try {
    livePersonalFlags = personalFlags(liveNutrients, profile?.conditions || []);
  } catch {
    livePersonalFlags = [];
  }

  const handleSaveAndNavigate = () => {
    try {
      const customId = `custom-ocr-${Date.now()}`;
      const newProduct: Product = {
        id: customId,
        name: name.trim() || "Scanned Food Product",
        brand: brand.trim() || "Scanned Brand",
        barcode: `OCR-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        categoryLabel: category === "beverage" ? "Beverage" : "Packaged Food",
        category,
        nova: novaScore,
        novaSource: "off",
        ingredients: ingredients || "Ingredients extracted via Gemini AI Vision label scan.",
        source: "label",
        group: "scanned",
        nutrients: liveNutrients,
      };

      saveCustomProduct(newProduct);
      if (onProductCreated) {
        onProductCreated(newProduct);
      }
      onClose();
      navigate({ to: "/product/$productId", params: { productId: customId } });
    } catch (err) {
      console.error("Save custom product error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Gemini AI Vision Food Label Scanner</h2>
              <p className="text-xs text-muted-foreground">
                Smart multimodal AI vision extracts structured nutrients & scores food labels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Gemini API Key Box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Powered by Gemini 1.5 Flash Vision AI
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Get Free API Key at Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Key className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="Paste your free Gemini API key here (AIzaSy...)"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs outline-none focus:border-primary font-mono"
                />
              </div>
              {apiKey ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 rounded-lg shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Key Saved
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => window.open("https://aistudio.google.com/app/apikey", "_blank")}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shrink-0"
                >
                  Get Key (Free)
                </button>
              )}
            </div>
            <p className="text-[0.7rem] text-muted-foreground">
              Free forever: Google AI Studio includes 1,500 free label scans per day with zero credit card required.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-surface p-1 border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-4 w-4" /> Upload Image
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("samples")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "samples"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-4 w-4 text-amber-500" /> Try Sample Labels
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === "upload" && (
            <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-6 text-center hover:bg-surface transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="label-ocr-input"
                className="hidden"
              />
              <label htmlFor="label-ocr-input" className="cursor-pointer block space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Click to upload food label photo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PNG, JPG, WebP photos of Nutrition Facts tables & Ingredient lists
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Samples Tab */}
          {activeTab === "samples" && (
            <div className="grid gap-3 sm:grid-cols-3">
              {SAMPLE_LABELS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="group text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-xs">
                    <FileText className="h-4 w-4" /> {sample.title}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {sample.subtitle}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[0.7rem] font-bold text-primary">
                    Parse Sample Label <ChevronRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Progress / Loading */}
          {loading && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> {progressStatus || "Analyzing with Gemini AI Vision..."}
              </div>
              <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(15, progressValue * 100)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results & Form */}
          {ocrResult && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Image Preview / Text Snippet */}
              {imagePreview ? (
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-surface p-3.5 rounded-xl border border-border">
                  <img
                    src={imagePreview}
                    alt="Label Preview"
                    className="h-20 w-20 rounded-lg object-cover border border-border shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Extracted by Gemini 1.5 Flash Vision AI
                    </p>
                    <textarea
                      rows={2}
                      value={rawTextState}
                      onChange={(e) => setRawTextState(e.target.value)}
                      className="w-full text-xs font-mono bg-card/70 p-2 rounded border border-border/60 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleReparseRawText(rawTextState)}
                      className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-primary hover:underline cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" /> Re-parse Text
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-surface p-3 rounded-xl border border-border space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sample Label Parsed Successfully
                  </p>
                  <textarea
                    rows={2}
                    value={rawTextState}
                    onChange={(e) => setRawTextState(e.target.value)}
                    className="w-full text-xs font-mono bg-card/70 p-2 rounded border border-border/60 outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleReparseRawText(rawTextState)}
                    className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3" /> Re-parse Text
                  </button>
                </div>
              )}

              {/* Live Grade Preview Card */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Live Score Computation
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nutri-Score 2023 Algorithm
                  </span>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <GradeLetter grade={liveNutriScore.grade} size="lg" />
                  <div>
                    <h3 className="font-bold text-base">{name || "Unnamed Product"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {brand || "Brand"} · Category: {category === "beverage" ? "Beverage" : "General Food"}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <NovaBadge nova={novaScore} mocked />
                  </div>
                </div>

                {/* Additive Flags Preview */}
                {liveAdditives.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{liveAdditives.length} Additive Flag(s) Detected: </span>
                      {liveAdditives.map((a) => a.name).join(", ")}
                    </div>
                  </div>
                )}

                {/* Health Condition Flags Preview */}
                {livePersonalFlags.length > 0 && (
                  <div className="rounded-lg bg-flag-soft border border-flag-border p-2.5 text-xs text-flag-foreground flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-flag" />
                    <div>
                      <span className="font-bold">Personal Health Flags: </span>
                      {livePersonalFlags.map((f) => f.title).join(" · ")}
                    </div>
                  </div>
                )}
              </div>

              {/* Editable Fields Grid */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm border-b border-border pb-1 flex items-center justify-between">
                  <span>Extracted Data (Verify & Edit)</span>
                  <span className="text-xs text-muted-foreground font-normal">Values per 100g / 100ml</span>
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Food Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FoodCategory)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="general">General Food</option>
                      <option value="beverage">Beverage</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      NOVA Processing (1-4)
                    </label>
                    <select
                      value={novaScore}
                      onChange={(e) => setNovaScore(Number(e.target.value) as 1 | 2 | 3 | 4)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value={1}>NOVA 1 (Unprocessed)</option>
                      <option value={2}>NOVA 2 (Processed Culinary)</option>
                      <option value={3}>NOVA 3 (Processed)</option>
                      <option value={4}>NOVA 4 (Ultra-Processed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Energy (kcal / 100g)
                    </label>
                    <input
                      type="number"
                      value={energyKcal}
                      onChange={(e) => setEnergyKcal(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Complete Nutrients Grid including Protein & Fruit/Veg */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">
                      Protein (g) 🥩
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={protein}
                      onChange={(e) => setProtein(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Fiber (g) 🌾
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={fiber}
                      onChange={(e) => setFiber(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Sugars (g) 🍬
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={sugars}
                      onChange={(e) => setSugars(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Sat Fat (g) 🧈
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={saturatedFat}
                      onChange={(e) => setSaturatedFat(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Salt (g) 🧂
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={salt}
                      onChange={(e) => setSalt(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Fruit / Veg / Nut (%) 🍎
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={fruitVegLegume}
                      onChange={(e) => setFruitVegLegume(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Ingredients List (Text for Additive & E-Number Detection)
                  </label>
                  <textarea
                    rows={3}
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="e.g. Wheat flour, sugar, palm oil, salt, INS 500(ii), INS 322, E171..."
                    className="w-full rounded-lg border border-input bg-background p-3 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndNavigate}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md cursor-pointer"
                >
                  Save Product & View Full Report <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
