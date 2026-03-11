import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  email:        text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role:         text("role").notNull().default("staff"),
  active:       boolean("active").notNull().default(true),
  avatar:       text("avatar"),
  pin:          text("pin"),
  createdAt:    timestamp("created_at").defaultNow(),
  lastLogin:    timestamp("last_login"),
});

// ── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id:            serial("id").primaryKey(),
  sku:           text("sku"),
  name:          text("name").notNull(),
  category:      text("category").notNull().default("misc"),
  price:         decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  cost:          decimal("cost",  { precision: 10, scale: 2 }).notNull().default("0"),
  unit:          text("unit").notNull().default("unit"),
  stock:         integer("stock"),
  lowStock:      integer("low_stock"),
  icon:          text("icon").notNull().default("📦"),
  imgUrl:        text("img_url"),
  options:       jsonb("options").default([]),
  variablePrice: boolean("variable_price").notNull().default(false),
  active:        boolean("active").notNull().default(true),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ── Clients ──────────────────────────────────────────────────────────────────
export const clients = pgTable("clients", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  phone:       text("phone"),
  email:       text("email"),
  nationality: text("nationality"),
  channel:     text("channel").notNull().default("walkin"),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// ── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id:            serial("id").primaryKey(),
  clientId:      integer("client_id").references(() => clients.id),
  createdBy:     integer("created_by").references(() => users.id),
  subtotal:      decimal("subtotal",      { precision: 10, scale: 2 }).notNull(),
  discountPct:   decimal("discount_pct",  { precision: 5,  scale: 2 }).default("0"),
  discountFlat:  decimal("discount_flat", { precision: 10, scale: 2 }).default("0"),
  vatAmount:     decimal("vat_amount",    { precision: 10, scale: 2 }).default("0"),
  total:         decimal("total",         { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  notes:         text("notes"),
  createdAt:     timestamp("created_at").defaultNow(),
});

// ── Order Items ───────────────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id:        serial("id").primaryKey(),
  orderId:   integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  name:      text("name").notNull(),
  icon:      text("icon").notNull().default("📦"),
  imgUrl:    text("img_url"),
  price:     decimal("price",      { precision: 10, scale: 2 }).notNull(),
  qty:       integer("qty").notNull().default(1),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

// ── Zod / Types ───────────────────────────────────────────────────────────────
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertClientSchema  = createInsertSchema(clients).omit({ id: true, createdAt: true });
export const insertUserSchema    = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });

export type User        = typeof users.$inferSelect;
export type Product     = typeof products.$inferSelect;
export type Client      = typeof clients.$inferSelect;
export type Order       = typeof orders.$inferSelect;
export type OrderItem   = typeof orderItems.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertClient  = z.infer<typeof insertClientSchema>;

export type Role = "owner" | "manager" | "staff" | "customer";

export type SafeUser = Omit<User, "passwordHash" | "pin">;

export type OrderWithItems = Order & {
  items:     OrderItem[];
  client:    Client | null;
  createdByUser: SafeUser | null;
};

export type CartItem = {
  productId: number;
  name:      string;
  icon:      string;
  imgUrl:    string | null;
  price:     number;
  qty:       number;
};

export type CheckoutPayload = {
  clientId?:     number | null;
  items:         CartItem[];
  discountPct:   number;
  discountFlat:  number;
  paymentMethod: "cash" | "card" | "transfer" | "qr";
  notes?:        string;
};

export type LoginPayload = { email: string; password: string };

// Role permissions matrix
export const ROLE_PERMISSIONS = {
  owner: {
    canSell:         true,
    canViewDash:     true,
    canManageStock:  true,
    canManageUsers:  true,
    canViewReports:  true,
    canApplyDiscount:true,
    canViewCost:     true,
    canDeleteOrders: true,
    canManageClients:true,
    label: "Owner",
    color: "#ffd43b",
    badge: "👑",
  },
  manager: {
    canSell:         true,
    canViewDash:     true,
    canManageStock:  true,
    canManageUsers:  false,
    canViewReports:  true,
    canApplyDiscount:true,
    canViewCost:     true,
    canDeleteOrders: false,
    canManageClients:true,
    label: "Manager",
    color: "#4da8f7",
    badge: "🔷",
  },
  staff: {
    canSell:         true,
    canViewDash:     false,
    canManageStock:  false,
    canManageUsers:  false,
    canViewReports:  false,
    canApplyDiscount:false,
    canViewCost:     false,
    canDeleteOrders: false,
    canManageClients:false,
    label: "Staff",
    color: "#00e87a",
    badge: "🟢",
  },
  customer: {
    canSell:         false,
    canViewDash:     false,
    canManageStock:  false,
    canManageUsers:  false,
    canViewReports:  false,
    canApplyDiscount:false,
    canViewCost:     false,
    canDeleteOrders: false,
    canManageClients:false,
    label: "Customer",
    color: "#cc5de8",
    badge: "🛒",
  },
} as const satisfies Record<Role, {
  canSell: boolean; canViewDash: boolean; canManageStock: boolean;
  canManageUsers: boolean; canViewReports: boolean; canApplyDiscount: boolean;
  canViewCost: boolean; canDeleteOrders: boolean; canManageClients: boolean;
  label: string; color: string; badge: string;
}>;
