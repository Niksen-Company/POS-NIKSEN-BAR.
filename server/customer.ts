/**
 * NIKSEN Bar — Customer Menu API
 * Public routes — no authentication required
 * GET  /api/customer/menu     → products (active, with category filter)
 * POST /api/customer/order    → create order (marks as customer order)
 * GET  /api/customer/order/:id → order status
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { products, orders, orderItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const customerOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.number(),
    name:      z.string(),
    icon:      z.string(),
    imgUrl:    z.string().nullable().optional(),
    price:     z.number(),
    qty:       z.number().min(1),
  })).min(1),
  tableNote:     z.string().optional(),   // e.g. "T3" or "Bar"
  notes:         z.string().optional(),   // special requests
  paymentMethod: z.enum(["cash", "card", "transfer", "qr"]).default("cash"),
});

export function registerCustomerRoutes(app: Express) {

  // ── GET /api/customer/menu ─────────────────────────────────────────────────
  // Returns active products — no auth needed
  app.get("/api/customer/menu", async (_req: Request, res: Response) => {
    try {
      const items = await db
        .select({
          id:       products.id,
          name:     products.name,
          category: products.category,
          price:    products.price,
          icon:     products.icon,
          imgUrl:   products.imgUrl,
          unit:     products.unit,
          stock:    products.stock,
          options:  products.options,
        })
        .from(products)
        .where(eq(products.active, true))
        .orderBy(products.category, products.name);

      // Group by category
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        const cat = item.category || "other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }

      res.json({ items, grouped });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POST /api/customer/order ───────────────────────────────────────────────
  // Creates an order from the customer menu — no auth needed
  app.post("/api/customer/order", async (req: Request, res: Response) => {
    const parsed = customerOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { items, tableNote, notes, paymentMethod } = parsed.data;

    try {
      // Calculate totals
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of items) {
        // Verify product still exists and is active
        const [product] = await db
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.active, true)));

        if (!product) {
          return res.status(400).json({ error: `Product ${item.name} is no longer available` });
        }

        const lineTotal = Number(product.price) * item.qty;
        subtotal += lineTotal;
        resolvedItems.push({
          ...item,
          price:    Number(product.price),
          lineTotal,
          icon:     product.icon,
          imgUrl:   product.imgUrl ?? null,
        });
      }

      const vatAmount = Math.round(subtotal * 0.07);
      const total     = subtotal + vatAmount;

      // Build combined notes
      const fullNotes = [
        tableNote ? `Table: ${tableNote}` : null,
        notes     ? `Note: ${notes}`      : null,
        "SOURCE: Customer Menu",
      ].filter(Boolean).join(" | ");

      // Insert order
      const [order] = await db
        .insert(orders)
        .values({
          clientId:      null,
          createdBy:     null,       // no staff — customer placed
          subtotal:      subtotal.toFixed(2),
          discountPct:   "0",
          discountFlat:  "0",
          vatAmount:     vatAmount.toFixed(2),
          total:         total.toFixed(2),
          paymentMethod,
          notes:         fullNotes,
        })
        .returning();

      // Insert order items
      await db.insert(orderItems).values(
        resolvedItems.map(item => ({
          orderId:   order.id,
          productId: item.productId,
          name:      item.name,
          icon:      item.icon,
          imgUrl:    item.imgUrl,
          price:     item.price.toFixed(2),
          qty:       item.qty,
          lineTotal: item.lineTotal.toFixed(2),
        }))
      );

      res.status(201).json({
        orderId:    order.id,
        orderNum:   `#${String(order.id).padStart(4, "0")}`,
        total:      total,
        subtotal:   subtotal,
        vatAmount:  vatAmount,
        items:      resolvedItems.length,
        tableNote:  tableNote ?? null,
        createdAt:  order.createdAt,
        message:    "Order received! Your drinks are being prepared. 🍺",
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── GET /api/customer/order/:id ────────────────────────────────────────────
  app.get("/api/customer/order/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid order ID" });

    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      if (!order) return res.status(404).json({ error: "Order not found" });

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      res.json({ ...order, items });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
