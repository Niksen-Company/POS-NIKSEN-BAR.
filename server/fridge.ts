/**
 * NIKSEN Smart Fridge Detection
 * Uses Claude Vision API to analyze fridge contents
 * and sync with POS inventory
 */

import { db } from "./db";
import { products } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FridgeProduct {
  name:       string;   // Product name matched to POS
  category:   "craft_beer" | "wine" | "other";
  count:      number;   // Units detected
  confidence: number;   // 0-1
  lowStock:   boolean;
}

export interface FridgeScan {
  id:          string;
  scannedAt:   Date;
  products:    FridgeProduct[];
  rawAnalysis: string;
  imageSource: string;  // "upload" | "ezviz" | "xiaomi"
  alerts:      string[];
}

// ── In-memory scan history (last 48 scans) ───────────────────────────────────
let scanHistory: FridgeScan[] = [];

function addScan(scan: FridgeScan) {
  scanHistory.unshift(scan);
  if (scanHistory.length > 48) scanHistory = scanHistory.slice(0, 48);
}

// ── Claude Vision Analysis ────────────────────────────────────────────────────
async function analyzeWithClaude(imageBase64: string, mimeType: string): Promise<{
  products: FridgeProduct[];
  rawAnalysis: string;
}> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");

  const prompt = `You are analyzing a photo of a bar fridge/cooler at NIKSEN Bar, Koh Samui, Thailand.
The fridge contains CRAFT BEER (bottles and cans) and WINE (bottles), all standing upright with labels visible.

Your task:
1. Count every bottle and can visible
2. Identify each product by its label/brand name
3. Classify as "craft_beer" or "wine"
4. Note if any product appears low (fewer than 3 units)

Respond ONLY with valid JSON in this exact format:
{
  "products": [
    {
      "name": "Product Name",
      "category": "craft_beer",
      "count": 5,
      "confidence": 0.95,
      "lowStock": false
    }
  ],
  "summary": "Brief description of fridge contents"
}

Rules:
- If you can't read a label clearly, use descriptive name like "Unknown Craft Beer (green bottle)"
- Count only fully visible items, not partial
- confidence: 1.0 = label clearly visible, 0.5 = partially visible, 0.3 = guessing
- lowStock: true if count <= 2`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageBase64,
            },
          },
          { type: "text", text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";

  // Clean JSON
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  return {
    products: parsed.products ?? [],
    rawAnalysis: parsed.summary ?? text,
  };
}

// ── Compare with POS stock ─────────────────────────────────────────────────────
async function syncWithPOS(detected: FridgeProduct[]): Promise<{
  matched: Array<{ detected: FridgeProduct; posProduct: any }>;
  unmatched: FridgeProduct[];
  alerts: string[];
}> {
  const posProducts = await db.select().from(products).where(eq(products.active, true));

  const matched: Array<{ detected: FridgeProduct; posProduct: any }> = [];
  const unmatched: FridgeProduct[] = [];
  const alerts: string[] = [];

  for (const det of detected) {
    // Fuzzy match by name
    const pos = posProducts.find(p =>
      p.name.toLowerCase().includes(det.name.toLowerCase().split(" ")[0]) ||
      det.name.toLowerCase().includes(p.name.toLowerCase().split(" ")[0])
    );

    if (pos) {
      matched.push({ detected: det, posProduct: pos });

      // Check low stock
      if (det.lowStock || det.count <= (pos.lowStock ?? 3)) {
        alerts.push(`⚠️ Low stock: ${pos.name} — only ${det.count} left in fridge`);
      }

      // Check discrepancy between camera count and POS stock
      if (pos.stock !== null && Math.abs((pos.stock ?? 0) - det.count) > 3) {
        alerts.push(`📊 Stock mismatch: ${pos.name} — Camera: ${det.count}, POS: ${pos.stock}`);
      }
    } else {
      unmatched.push(det);
      if (det.lowStock) {
        alerts.push(`⚠️ Low stock: ${det.name} — only ${det.count} left (not in POS)`);
      }
    }
  }

  return { matched, unmatched, alerts };
}

// ── Register API Routes ────────────────────────────────────────────────────────
import type { Express, Request, Response } from "express";

export function registerFridgeRoutes(app: Express) {

  // POST /api/fridge/scan — upload image and analyze
  app.post("/api/fridge/scan", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", source = "upload" } = req.body as {
        imageBase64: string;
        mimeType?: string;
        source?: string;
      };

      if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

      // Analyze with Claude Vision
      const { products: detected, rawAnalysis } = await analyzeWithClaude(imageBase64, mimeType);

      // Sync with POS
      const { matched, unmatched, alerts } = await syncWithPOS(detected);

      const scan: FridgeScan = {
        id:          Date.now().toString(),
        scannedAt:   new Date(),
        products:    detected,
        rawAnalysis,
        imageSource: source,
        alerts,
      };

      addScan(scan);

      res.json({
        scan,
        matched,
        unmatched,
        alerts,
        totalDetected: detected.reduce((s, p) => s + p.count, 0),
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/fridge/history — last 48 scans
  app.get("/api/fridge/history", (_req: Request, res: Response) => {
    res.json(scanHistory);
  });

  // GET /api/fridge/latest — most recent scan
  app.get("/api/fridge/latest", (_req: Request, res: Response) => {
    if (scanHistory.length === 0) return res.json(null);
    res.json(scanHistory[0]);
  });

  // GET /api/fridge/alerts — current alerts
  app.get("/api/fridge/alerts", (_req: Request, res: Response) => {
    const latest = scanHistory[0];
    res.json({ alerts: latest?.alerts ?? [], lastScan: latest?.scannedAt ?? null });
  });
}
