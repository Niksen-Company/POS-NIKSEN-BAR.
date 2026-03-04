# NIKSEN POS — Setup Guide

## 1. Replit Environment Variable
In your Replit project → **Secrets** tab, add:
```
DATABASE_URL = postgresql://<user>:<password>@<host>/<db>?sslmode=require
```

## 2. Run the DB Migration
In Replit Shell:
```bash
# Option A — paste the SQL directly into Neon SQL editor (fastest)
# Go to neon.tech → your project → SQL Editor → paste migrations/0000_init.sql

# Option B — push schema via drizzle
npx drizzle-kit push
```

## 3. Start the App
```bash
npm install
npm run dev
```

## 4. Deploy
```bash
npm run build
npm start
```

---

## Architecture
```
client/src/
  pages/
    pos.tsx        ← Sell tab (product grid + cart + image upload)
    dashboard.tsx  ← KPIs + charts
    inventory.tsx  ← Full CRUD catalog
    clients.tsx    ← CRM
    orders.tsx     ← Transaction history
server/
  db.ts           ← Neon PostgreSQL connection (drizzle-orm)
  storage.ts      ← PgStorage class (all DB queries)
  routes.ts       ← REST API endpoints
shared/
  schema.ts       ← Drizzle table definitions + Zod types
migrations/
  0000_init.sql   ← Initial schema + seed data (37 products + 5 clients)
```

## Image Upload Flow
1. Click any product card → **📷 ADD IMAGE** overlay appears
2. Modal opens: browse file / drag-drop / paste URL
3. On save → `PATCH /api/products/:id/image` → stored in `img_url` column in Neon DB
4. Image persists across sessions (stored as base64 or URL)
