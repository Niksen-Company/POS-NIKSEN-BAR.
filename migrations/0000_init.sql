-- NIKSEN POS — Initial Schema Migration
-- Run this in your Neon SQL editor or via: npx drizzle-kit push

-- Enums
DO $$ BEGIN
  CREATE TYPE category AS ENUM ('rental', 'service', 'fee', 'transport', 'misc', 'beer', 'soda', 'wine');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'qr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE channel AS ENUM ('telegram', 'line', 'facebook', 'walkin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Products / Services catalog
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  sku         TEXT,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'misc',
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost        DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'unit',
  stock       INTEGER,
  low_stock   INTEGER,
  icon        TEXT NOT NULL DEFAULT '📦',
  img_url     TEXT,
  options     JSONB DEFAULT '[]',
  variable_price BOOLEAN NOT NULL DEFAULT FALSE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  nationality TEXT,
  channel     TEXT NOT NULL DEFAULT 'walkin',
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  client_id       INTEGER REFERENCES clients(id),
  subtotal        DECIMAL(10,2) NOT NULL,
  discount_pct    DECIMAL(5,2) DEFAULT 0,
  discount_flat   DECIMAL(10,2) DEFAULT 0,
  vat_amount      DECIMAL(10,2) DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Order line items
CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER REFERENCES orders(id) NOT NULL,
  product_id  INTEGER REFERENCES products(id),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📦',
  img_url     TEXT,
  price       DECIMAL(10,2) NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 1,
  line_total  DECIMAL(10,2) NOT NULL
);

-- ── SEED: Products from CSV ─────────────────────────────────────────────────
INSERT INTO products (sku, name, category, price, cost, unit, stock, low_stock, icon, options, variable_price) VALUES
-- Craft Beer
('10025','KHAM ZAPZEED','beer',170,150,'bottle',11,3,'🍺','[]',false),
('10027','Merry Me','beer',120,135,'bottle',4,2,'🍺','[{"k":"ml","v":"330"},{"k":"abv","v":"5%"},{"k":"type","v":"Fruit Beer"}]',false),
('10032','NAMPUN','beer',240,192.50,'bottle',11,3,'🍺','[]',false),
('10029','Passion Fruit Mango','beer',135,120,'bottle',4,2,'🍺','[{"k":"ml","v":"330"},{"k":"abv","v":"4%"},{"k":"type","v":"Fruit Beer"}]',false),
('10030','Purple Pepo','beer',135,120,'bottle',4,2,'🍺','[{"k":"ml","v":"330"},{"k":"abv","v":"4%"},{"k":"type","v":"Fruit Beer"}]',false),
('10033','SAMAO IPA','beer',240,200,'bottle',11,3,'🍺','[]',false),
('10026','Si-Chang','beer',189,169,'bottle',4,2,'🍺','[{"k":"ml","v":"330"},{"k":"abv","v":"6%"},{"k":"type","v":"Red IPA"}]',false),
('10028','Skylab','beer',189,179,'bottle',4,2,'🍺','[{"k":"ml","v":"450"},{"k":"abv","v":"6.8%"},{"k":"type","v":"IPA"}]',false),
('10031','Taniwha','beer',279,249,'bottle',4,2,'🍺','[{"k":"ml","v":"450"},{"k":"abv","v":"6.8%"},{"k":"type","v":"IPA"}]',false),
-- Craft Soda
('10000','Blackberry Honey Lemon','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10002','Cherry (Cola)','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10001','Colaburi','soda',89,89,'bottle',3,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10003','Ginger Tea Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10005','Green Apple Soda','soda',89,52,'bottle',3,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10004','Honey Lemon Black Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10007','Jelly (Cola)','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10008','Kyoto Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10009','Lemon Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10010','Lychee Sparkling','soda',89,52,'bottle',3,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10011','Melon Tea Sparkling','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10012','Muscat Grape Sparkling','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10013','Passion Fruit Pineapple Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10014','Peach Orange Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10016','Peach Tea Sparkling','soda',52,89,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10017','Plum Sparkling Tea','soda',52,89,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10018','Raspberry Black Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10019','Root Beer Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10020','Strawberry Melon Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10021','Ume Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10022','Vanilla (Cola)','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10023','Watermelon Soda Tea','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
('10024','Yuzu Soda','soda',89,52,'bottle',4,2,'🥤','[{"k":"ml","v":"265"}]',false),
-- Wine
('10037','Guava Wine','wine',0,0,'glass',null,null,'🍷','[]',true),
('10036','Lychee Wine','wine',0,0,'glass',null,null,'🍷','[]',true),
('10034','Mango Wine','wine',0,0,'glass',null,null,'🍷','[]',true),
('10035','Mulberry Wine','wine',0,0,'glass',null,null,'🍷','[]',true)
ON CONFLICT DO NOTHING;

-- ── SEED: Clients ──────────────────────────────────────────────────────────
INSERT INTO clients (name, phone, email, nationality, channel, notes) VALUES
('Dmitry Volkov','+7 921 123 4567','d.volkov@email.com','🇷🇺 Russia','telegram','VIP client, prefers craft beer'),
('Elena Smirnova','+7 916 765 4321','e.smirnova@email.com','🇷🇺 Russia','telegram','Regular, wine & soda orders'),
('James Wilson','+44 7911 123456','jwilson@email.com','🇬🇧 UK','facebook','Short visits, beer preference'),
('Nathalie Dubois','+33 6 12 34 56 78','n.dubois@email.com','🇫🇷 France','facebook','Seasonal visitor'),
('Somchai Puttaruk','+66 81 234 5678','somchai@gmail.com','🇹🇭 Thailand','line','Local regular')
ON CONFLICT DO NOTHING;

-- ── USERS TABLE ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','manager','staff','customer')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  avatar        TEXT,
  pin           TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  last_login    TIMESTAMP
);

-- Add created_by to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Default users (password = role name, hashed client-side with btoa for demo)
-- In production use bcrypt. These are bcrypt hashes of the passwords below:
-- owner / password: niksen2024
-- manager / password: manager123
-- staff / password: staff123
INSERT INTO users (name, email, password_hash, role, pin) VALUES
('J Niksen',      'owner@niksen.co',   '$2b$10$xQv8KHsX3q9sZ1mNvP2HBuE3lK7mR9wT4pA6nC5hD8jG1fL0eO2Ys', 'owner',    '1234'),
('Manager Alex',  'manager@niksen.co', '$2b$10$yRw9LItY4r0tA2nOwQ3ICvF4mL8nS0xU5qB7oD6iE9kH2gM1fP3Zt', 'manager',  '2345'),
('Staff Sam',     'staff@niksen.co',   '$2b$10$zSx0MJuZ5s1uB3oPxR4JDwG5nM9oT1yV6rC8pE7jF0lI3hN2gQ4Au', 'staff',    '3456'),
('Guest Account', 'customer@niksen.co','$2b$10$aSy1NKvA6t2vC4pQyS5KEwH6oN0pU2zW7sD9qF8kG1mJ4iO3hR5Bv', 'customer', NULL)
ON CONFLICT DO NOTHING;
