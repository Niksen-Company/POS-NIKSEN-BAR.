import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { storage } from "./storage";
import { insertProductSchema, insertClientSchema, ROLE_PERMISSIONS } from "@shared/schema";
import { getUserByEmail, getUserById, verifyPassword, hashPassword, toSafeUser } from "./auth";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { z } from "zod";

type GoogleLoginUser = {
  id: number;
  role: string;
};

function getGoogleEmail(profile: Profile): string | null {
  const email = profile.emails?.[0]?.value?.toLowerCase().trim();
  return email || null;
}

function isAllowedDomain(email: string): boolean {
  const allowedDomain = process.env.ALLOWED_DOMAIN?.toLowerCase().trim();
  if (!allowedDomain || allowedDomain === "*") return true;
  return email.endsWith(`@${allowedDomain}`);
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const u = await getUserById(req.session.userId);
    if (!u || !roles.includes(u.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

const checkoutSchema = z.object({
  clientId:      z.number().nullable().optional(),
  items: z.array(z.object({
    productId: z.number(),
    name:      z.string(),
    icon:      z.string(),
    imgUrl:    z.string().nullable().optional(),
    price:     z.number(),
    qty:       z.number().min(1),
  })).min(1),
  discountPct:   z.number().min(0).max(100).default(0),
  discountFlat:  z.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "card", "transfer", "qr"]),
  notes:         z.string().optional(),
});

export function registerRoutes(app: Express) {

  const googleOAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL,
  );

  if (googleOAuthEnabled) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = getGoogleEmail(profile);
            if (!email) return done(new Error("Google account has no email"));
            if (!isAllowedDomain(email)) return done(null, false);

            const user = await getUserByEmail(email);
            if (!user || !user.active) return done(null, false);

            await db
              .update(users)
              .set({
                lastLogin: new Date(),
                avatar: profile.photos?.[0]?.value ?? user.avatar,
              })
              .where(eq(users.id, user.id));

            return done(null, { id: user.id, role: user.role } satisfies GoogleLoginUser);
          } catch (error) {
            return done(error as Error);
          }
        },
      ),
    );
  } else {
    console.warn("Google OAuth is disabled: missing GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL");
  }

  // ══ AUTH ══════════════════════════════════════════════════════════════════

  app.get("/api/auth/google/enabled", (_req, res) => {
    res.json({ enabled: googleOAuthEnabled });
  });

  app.get("/auth/google", (req, res, next) => {
    if (!googleOAuthEnabled) {
      return res.status(503).json({ error: "Google OAuth is not configured" });
    }
    return passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      prompt: "select_account",
    })(req, res, next);
  });

  app.get("/auth/google/callback", (req, res, next) => {
    if (!googleOAuthEnabled) {
      return res.status(503).json({ error: "Google OAuth is not configured" });
    }

    return passport.authenticate(
      "google",
      { session: false, failureRedirect: "/login?error=google_auth_failed" },
      (error: unknown, user: GoogleLoginUser | false) => {
        if (error || !user) {
          return res.redirect("/login?error=google_auth_failed");
        }

        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.save(() => res.redirect("/"));
      },
    )(req, res, next);
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });
      const user = await getUserByEmail(email);
      if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      // Update last login
      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
      req.session.userId = user.id;
      req.session.userRole = user.role;
      res.json({ user: toSafeUser(user) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // Get current session user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const user = await getUserById(req.session.userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      res.json({ user: toSafeUser(user) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ USERS (owner only) ════════════════════════════════════════════════════

  app.get("/api/users", requireRole("owner"), async (_req, res) => {
    try {
      const all = await db.select({
        id: users.id, name: users.name, email: users.email,
        role: users.role, active: users.active, avatar: users.avatar,
        createdAt: users.createdAt, lastLogin: users.lastLogin,
      }).from(users).orderBy(users.role, users.name);
      res.json(all);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/users", requireRole("owner"), async (req, res) => {
    try {
      const { name, email, password, role, pin } = req.body;
      if (!name || !email || !password || !role) return res.status(400).json({ error: "Missing fields" });
      const passwordHash = await hashPassword(password);
      const [u] = await db.insert(users).values({ name, email: email.toLowerCase(), passwordHash, role, pin: pin || null, active: true }).returning();
      res.status(201).json(toSafeUser(u));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/users/:id", requireRole("owner", "manager"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const { name, email, role, active, pin, password } = req.body;
      const updateData: any = {};
      if (name)     updateData.name   = name;
      if (email)    updateData.email  = email.toLowerCase();
      if (role)     updateData.role   = role;
      if (active !== undefined) updateData.active = active;
      if (pin !== undefined)    updateData.pin    = pin;
      if (password) updateData.passwordHash = await hashPassword(password);
      const [u] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
      if (!u) return res.status(404).json({ error: "Not found" });
      res.json(toSafeUser(u));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/users/:id", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      await db.update(users).set({ active: false }).where(eq(users.id, id));
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ PRODUCTS ═════════════════════════════════════════════════════════════

  app.get("/api/products", requireAuth, async (_req, res) => {
    try { res.json(await storage.getProducts()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/products", requireRole("owner","manager"), async (req, res) => {
    const p = insertProductSchema.partial().safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.flatten() });
    try { res.status(201).json(await storage.createProduct(p.data)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/products/:id", requireRole("owner","manager"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const u = await storage.updateProduct(id, req.body);
      if (!u) return res.status(404).json({ error: "Not found" });
      res.json(u);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/products/:id/image", requireRole("owner","manager","staff"), async (req, res) => {
    const id = parseInt(req.params.id);
    const { imgUrl } = req.body as { imgUrl: string | null };
    try {
      const u = await storage.updateProductImage(id, imgUrl ?? null);
      if (!u) return res.status(404).json({ error: "Not found" });
      res.json(u);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/products/:id", requireRole("owner"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const ok = await storage.deleteProduct(id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ CLIENTS ═══════════════════════════════════════════════════════════════

  app.get("/api/clients", requireAuth, async (_req, res) => {
    try { res.json(await storage.getClients()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/clients", requireRole("owner","manager","staff"), async (req, res) => {
    const p = insertClientSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.flatten() });
    try { res.status(201).json(await storage.createClient(p.data)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/clients/:id", requireRole("owner","manager"), async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const u = await storage.updateClient(id, req.body);
      if (!u) return res.status(404).json({ error: "Not found" });
      res.json(u);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ ORDERS ════════════════════════════════════════════════════════════════

  app.get("/api/orders", requireRole("owner","manager"), async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    try { res.json(await storage.getOrders(limit)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/checkout", requireRole("owner","manager","staff"), async (req, res) => {
    const p = checkoutSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.flatten() });
    try {
      const order = await storage.checkout({ ...p.data, createdBy: req.session.userId });
      res.status(201).json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ STATS ═════════════════════════════════════════════════════════════════

  app.get("/api/stats", requireRole("owner","manager"), async (_req, res) => {
    try {
      const stats = await storage.getStats();
      const recentOrders = await storage.getOrders(5);
      res.json({ ...stats, recentOrders });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: new Date() }));
}
