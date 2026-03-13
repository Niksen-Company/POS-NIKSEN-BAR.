/**
 * NIKSEN Bar — Google Cloud Storage Integration
 * Bucket: niksen-bar-storage (asia-southeast1)
 * Features: DB Backup, Sales CSV Export
 */

import crypto from "crypto";
import https from "https";
import { db } from "./db";
import { orders, orderItems, products, clients } from "@shared/schema";
import { gte } from "drizzle-orm";
import type { Express, Request, Response } from "express";

const GCS_ACCESS_KEY = process.env.GCS_ACCESS_KEY || "";
const GCS_SECRET     = process.env.GCS_SECRET     || "";
const GCS_BUCKET     = "niksen-bar-storage";
const GCS_REGION     = "asia-southeast1";
const GCS_ENDPOINT   = "storage.googleapis.com";

// ── HMAC-SHA256 signing (S3-compatible interop) ───────────────────────────────
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSigningKey(secret: string, date: string, region: string, service: string): Buffer {
  const kDate    = hmacSha256("AWS4" + secret, date);
  const kRegion  = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

// ── Upload to GCS via XML API (S3-compatible) ─────────────────────────────────
async function uploadToGCS(
  objectKey: string,
  body: string | Buffer,
  contentType = "text/plain"
): Promise<string> {
  const bodyBuf   = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf-8");
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]/g, "").replace(/\..+/, "Z");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash   = sha256Hex(bodyBuf);
  const canonicalUri  = `/${GCS_BUCKET}/${objectKey}`;
  const canonicalQS   = "";
  const canonicalHdrs =
    `content-type:${contentType}\n` +
    `host:${GCS_ENDPOINT}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHdrs    = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalReq  = [
    "PUT", canonicalUri, canonicalQS,
    canonicalHdrs, signedHdrs, payloadHash
  ].join("\n");

  const credScope     = `${dateStamp}/${GCS_REGION}/s3/aws4_request`;
  const stringToSign  = `AWS4-HMAC-SHA256\n${amzDate}\n${credScope}\n${sha256Hex(canonicalReq)}`;
  const signingKey    = getSigningKey(GCS_SECRET, dateStamp, GCS_REGION, "s3");
  const signature     = hmacSha256(signingKey, stringToSign).toString("hex");

  const authHeader    =
    `AWS4-HMAC-SHA256 Credential=${GCS_ACCESS_KEY}/${credScope}, ` +
    `SignedHeaders=${signedHdrs}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: GCS_ENDPOINT,
      path:     canonicalUri,
      method:   "PUT",
      headers: {
        "Content-Type":          contentType,
        "Content-Length":        bodyBuf.length,
        "x-amz-date":            amzDate,
        "x-amz-content-sha256":  payloadHash,
        "Authorization":         authHeader,
      },
    }, res => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode < 300) {
          resolve(`https://${GCS_ENDPOINT}/${GCS_BUCKET}/${objectKey}`);
        } else {
          reject(new Error(`GCS upload failed: ${res.statusCode} — ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

// ── Generate Sales CSV ────────────────────────────────────────────────────────
async function generateSalesCSV(from?: Date): Promise<string> {
  const since = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      orderId:       orders.id,
      createdAt:     orders.createdAt,
      total:         orders.total,
      paymentMethod: orders.paymentMethod,
      clientName:    clients.name,
      itemName:      orderItems.name,
      qty:           orderItems.qty,
      price:         orderItems.price,
      lineTotal:     orderItems.lineTotal,
    })
    .from(orders)
    .leftJoin(clients,    (j: any) => j.eq(orders.clientId,   clients.id))
    .leftJoin(orderItems, (j: any) => j.eq(orderItems.orderId, orders.id))
    .where(gte(orders.createdAt, since))
    .orderBy(orders.createdAt);

  const header = "Order ID,Date,Item,Qty,Price,Line Total,Payment,Client,Order Total";
  const lines  = rows.map(r =>
    [
      r.orderId,
      r.createdAt?.toISOString().slice(0, 19).replace("T", " ") ?? "",
      `"${(r.itemName ?? "").replace(/"/g, '""')}"`,
      r.qty ?? 0,
      r.price ?? 0,
      r.lineTotal ?? 0,
      r.paymentMethod,
      `"${(r.clientName ?? "Walk-in").replace(/"/g, '""')}"`,
      r.total,
    ].join(",")
  );

  return [header, ...lines].join("\n");
}

// ── Register API Routes ───────────────────────────────────────────────────────
export function registerGCSRoutes(app: Express) {

  // POST /api/gcs/export-csv — export sales CSV to GCS
  app.post("/api/gcs/export-csv", async (req: Request, res: Response) => {
    try {
      if (!GCS_ACCESS_KEY || !GCS_SECRET) {
        return res.status(500).json({ error: "GCS credentials not configured" });
      }

      const { days = 30 } = req.body as { days?: number };
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const csv  = await generateSalesCSV(from);

      const ts  = new Date().toISOString().slice(0, 10);
      const key = `exports/sales-${ts}-last${days}days.csv`;
      const url = await uploadToGCS(key, csv, "text/csv");

      res.json({ success: true, url, key, rows: csv.split("\n").length - 1 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/gcs/backup — backup DB stats snapshot to GCS
  app.post("/api/gcs/backup", async (req: Request, res: Response) => {
    try {
      if (!GCS_ACCESS_KEY || !GCS_SECRET) {
        return res.status(500).json({ error: "GCS credentials not configured" });
      }

      // Snapshot: all products + recent 500 orders
      const [prods, recentOrders] = await Promise.all([
        db.select().from(products),
        db.select().from(orders)
          .orderBy(orders.createdAt)
          .limit(500),
      ]);

      const snapshot = {
        exportedAt: new Date().toISOString(),
        products:   prods,
        orders:     recentOrders,
      };

      const ts  = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
      const key = `backups/niksen-pos-${ts}.json`;
      const url = await uploadToGCS(key, JSON.stringify(snapshot, null, 2), "application/json");

      res.json({
        success:   true,
        url,
        key,
        products:  prods.length,
        orders:    recentOrders.length,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/gcs/status — check GCS config
  app.get("/api/gcs/status", (_req: Request, res: Response) => {
    res.json({
      configured: !!(GCS_ACCESS_KEY && GCS_SECRET),
      bucket:     GCS_BUCKET,
      region:     GCS_REGION,
    });
  });
}
