import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { AlertTriangle, Camera, Loader2, ScanBarcode, Upload, X } from "lucide-react";
import {
  cleanBarcode,
  isPlausibleBarcode,
  lookupProduct,
  saveLookedUpProduct,
} from "@/lib/barcode-lookup";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the product is missing or incomplete, so the parent can open the label (OCR) scanner. */
  onUseLabelScan?: () => void;
}

const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

function cameraErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The camera only works on a secure (https) page or on localhost. Open the deployed link, or type the barcode below.";
  }
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError") return "Camera permission was blocked. Allow camera access in the browser, or type the barcode below.";
  if (name === "NotFoundError") return "No camera was found on this device. Type the barcode or upload a photo instead.";
  if (name === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  return "Could not start the camera. Type the barcode or upload a photo instead.";
}

export function BarcodeScannerModal({ isOpen, onClose, onUseLabelScan }: BarcodeScannerModalProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handlingRef = useRef(false);

  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "missing"; text: string } | null>(null);
  // Shown when the found product relied on assumptions (e.g. missing fibre), before opening the report.
  const [pending, setPending] = useState<{ id: string; title: string; notes: string[] } | null>(null);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraOn(false);
  }, []);

  const handleCode = useCallback(
    async (raw: string) => {
      if (handlingRef.current) return;
      const code = cleanBarcode(raw);
      if (!isPlausibleBarcode(code)) {
        setMessage({ kind: "error", text: "A barcode has 8 to 14 digits. Check the number and try again." });
        return;
      }

      handlingRef.current = true;
      stopCamera();
      setBusy(true);
      setMessage(null);
      setPending(null);

      try {
        const result = await lookupProduct(code);
        if (result.status === "found") {
          const id = saveLookedUpProduct(result.product);
          if (result.notes.length > 0) {
            setPending({ id, title: `${result.product.brand} ${result.product.name}`, notes: result.notes });
            return;
          }
          onClose();
          navigate({ to: "/product/$productId", params: { productId: id } });
          return;
        }
        if (result.status === "incomplete") {
          setMessage({
            kind: "missing",
            text: `${result.brand === "Unknown brand" ? "" : result.brand + " "}${result.name} is in Open Food Facts, but its label data is incomplete (missing ${result.missing.join(", ")}). A grade would be a guess, so scan the nutrition label instead.`,
          });
        } else if (result.status === "not-found") {
          setMessage({
            kind: "missing",
            text: `No product found for barcode ${code}. Scan its nutrition label instead.`,
          });
        } else {
          setMessage({ kind: "error", text: result.message });
        }
      } finally {
        setBusy(false);
        handlingRef.current = false;
      }
    },
    [navigate, onClose, stopCamera],
  );

  const startCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setCameraError(null);
    try {
      const reader = new BrowserMultiFormatReader(HINTS);
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        (result) => {
          if (result) void handleCode(result.getText());
        },
      );
      controlsRef.current = controls;
      setCameraOn(true);
    } catch (err) {
      console.error("Camera start failed:", err);
      setCameraError(cameraErrorMessage(err));
      setCameraOn(false);
    }
  }, [handleCode]);

  // Start the camera when the modal opens, and always release it on close.
  useEffect(() => {
    if (!isOpen) return;
    handlingRef.current = false;
    setMessage(null);
    setPending(null);
    setManual("");
    void startCamera();
    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(HINTS);
      const result = await reader.decodeFromImageUrl(url);
      await handleCode(result.getText());
    } catch {
      setMessage({
        kind: "error",
        text: "No barcode was found in that photo. Make sure the bars are sharp and fill most of the frame, or type the number.",
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ScanBarcode className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">Scan barcode</h2>
              <p className="text-xs text-muted-foreground">Point the camera at the bars on the pack</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close barcode scanner"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {cameraOn && !busy && (
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm font-semibold text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking up product
              </div>
            )}
            {!cameraOn && !busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white">
                {cameraError ? (
                  <p>{cameraError}</p>
                ) : (
                  <p className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Starting camera
                  </p>
                )}
                {cameraError && (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-black"
                  >
                    <Camera className="h-4 w-4" /> Try camera again
                  </button>
                )}
              </div>
            )}
          </div>

          {message && (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-border bg-surface p-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alert" />
              <div className="space-y-2">
                <p>{message.text}</p>
                {message.kind === "missing" && onUseLabelScan && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onUseLabelScan();
                    }}
                    className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                  >
                    Scan the nutrition label
                  </button>
                )}
                {message.kind === "missing" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(null);
                      void startCamera();
                    }}
                    className="ml-2 cursor-pointer text-xs font-semibold text-primary underline"
                  >
                    Scan another barcode
                  </button>
                )}
              </div>
            </div>
          )}

          {pending && (
            <div className="space-y-2 rounded-xl border border-border bg-surface p-3 text-sm">
              <p className="font-semibold">{pending.title}</p>
              <p className="text-xs text-muted-foreground">
                Found on Open Food Facts. The grade uses these assumptions:
              </p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {pending.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  const id = pending.id;
                  onClose();
                  navigate({ to: "/product/$productId", params: { productId: id } });
                }}
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                View report
              </button>
            </div>
          )}

          <div>
            <label htmlFor="barcode-manual" className="mb-1 block text-xs font-semibold text-muted-foreground">
              Or type the barcode number
            </label>
            <div className="flex gap-2">
              <input
                id="barcode-manual"
                type="text"
                inputMode="numeric"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCode(manual);
                }}
                placeholder="e.g. 8901719117206"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => void handleCode(manual)}
                disabled={busy}
                className="shrink-0 cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Look up
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs font-semibold text-muted-foreground hover:bg-surface">
            <Upload className="h-4 w-4" /> Upload a photo of the barcode
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
        </div>
      </div>
    </div>
  );
}
