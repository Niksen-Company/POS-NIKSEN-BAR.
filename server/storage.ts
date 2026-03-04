import { eq, desc, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { products, clients, orders, orderItems } from "@shared/schema";
import type {
  Product, Client, Order, OrderItem, OrderWithItems,
  InsertProduct, InsertClient, CheckoutPayload
} from "@shared/schema";

export interface IStorage {
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(data: Partial<InsertProduct>): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductImage(id: number, imgUrl: string | null): Promise<Product | undefined>;

  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: number, data: Partial<InsertClient>): Promise<Client | undefined>;

  getOrders(limit?: number): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  checkout(payload: CheckoutPayload): Promise<OrderWithItems>;

  getDailyRevenue(): Promise<number>;
  getMonthlyRevenue(): Promise<number>;
  getStats(): Promise<{ daily: number; monthly: number; orderCount: number; productCount: number }>;
}

export class PgStorage implements IStorage {
  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts() {
    return db.select().from(products).where(eq(products.active, true)).orderBy(products.category, products.name);
  }

  async getProduct(id: number) {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }

  async createProduct(data: Partial<InsertProduct>) {
    const [p] = await db.insert(products).values(data as InsertProduct).returning();
    return p;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>) {
    const [p] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return p;
  }

  async deleteProduct(id: number) {
    const [p] = await db.update(products).set({ active: false }).where(eq(products.id, id)).returning();
    return !!p;
  }

  async updateProductImage(id: number, imgUrl: string | null) {
    const [p] = await db.update(products).set({ imgUrl }).where(eq(products.id, id)).returning();
    return p;
  }

  // ── Clients ─────────────────────────────────────────────────────────────────
  async getClients() {
    return db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number) {
    const [c] = await db.select().from(clients).where(eq(clients.id, id));
    return c;
  }

  async createClient(data: InsertClient) {
    const [c] = await db.insert(clients).values(data).returning();
    return c;
  }

  async updateClient(id: number, data: Partial<InsertClient>) {
    const [c] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return c;
  }

  // ── Orders ───────────────────────────────────────────────────────────────────
  async getOrders(limit = 100): Promise<OrderWithItems[]> {
    const rows = await db.select().from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return Promise.all(rows.map(async o => {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
      const client = o.clientId ? (await db.select().from(clients).where(eq(clients.id, o.clientId)))[0] ?? null : null;
      return { ...o, items, client };
    }));
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    if (!o) return undefined;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const client = o.clientId ? (await db.select().from(clients).where(eq(clients.id, o.clientId)))[0] ?? null : null;
    return { ...o, items, client };
  }

  async checkout(payload: CheckoutPayload & { createdBy?: number }): Promise<OrderWithItems> {
    const subtotal = payload.items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = Math.min(subtotal, (subtotal * payload.discountPct / 100) + payload.discountFlat);
    const after = subtotal - disc;
    const vat = after * 0.07;
    const total = after + vat;

    const [order] = await db.insert(orders).values({
      clientId:      payload.clientId ?? null,
      subtotal:      subtotal.toFixed(2),
      discountPct:   payload.discountPct.toFixed(2),
      discountFlat:  payload.discountFlat.toFixed(2),
      vatAmount:     vat.toFixed(2),
      total:         total.toFixed(2),
      paymentMethod: payload.paymentMethod,
      createdBy: payload.createdBy ?? null,
      notes:         payload.notes ?? null,
    }).returning();

    const items = await db.insert(orderItems).values(
      payload.items.map(i => ({
        orderId:   order.id,
        productId: i.productId,
        name:      i.name,
        icon:      i.icon,
        imgUrl:    i.imgUrl ?? null,
        price:     i.price.toFixed(2),
        qty:       i.qty,
        lineTotal: (i.price * i.qty).toFixed(2),
      }))
    ).returning();

    const client = payload.clientId
      ? (await db.select().from(clients).where(eq(clients.id, payload.clientId)))[0] ?? null
      : null;

    return { ...order, items, client };
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  async getDailyRevenue(): Promise<number> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [row] = await db.select({ sum: sql<string>`COALESCE(SUM(total),0)` })
      .from(orders).where(gte(orders.createdAt, today));
    return parseFloat(row?.sum ?? "0");
  }

  async getMonthlyRevenue(): Promise<number> {
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    const [row] = await db.select({ sum: sql<string>`COALESCE(SUM(total),0)` })
      .from(orders).where(gte(orders.createdAt, start));
    return parseFloat(row?.sum ?? "0");
  }

  async getStats() {
    const [daily, monthly] = await Promise.all([this.getDailyRevenue(), this.getMonthlyRevenue()]);
    const [{ count: orderCount }] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
    const [{ count: productCount }] = await db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.active, true));
    return { daily, monthly, orderCount: Number(orderCount), productCount: Number(productCount) };
  }
}

export const storage = new PgStorage();
