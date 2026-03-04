import "dotenv/config";
import express from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { seedUsersIfEmpty } from "./auth";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "5000");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use(session({
  secret: process.env.SESSION_SECRET || "niksen-pos-secret-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

app.use(passport.initialize());

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: string;
  }
}

registerRoutes(app);

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist/public");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🍺 NIKSEN POS running on port ${PORT}`);
  try {
    await seedUsersIfEmpty();
  } catch (e) {
    console.warn("Could not seed users (DB may not be ready):", e);
  }
});

export default app;
