-- NIKSEN POS — Users + Roles migration
-- Run this AFTER 0000_init.sql

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

ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Default users are auto-seeded by the server on first boot.
-- Passwords:
--   owner@niksen.co    → niksen2024
--   manager@niksen.co  → manager123
--   staff@niksen.co    → staff123
--   customer@niksen.co → guest123
