-- Enhanced schema for Bar POS System with full features

-- Drop existing tables if needed (for fresh start)
-- DROP TABLE IF EXISTS order_items CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS business_categories CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS business_type CASCADE;
-- DROP TYPE IF EXISTS role CASCADE;

-- Create enums
CREATE TYPE IF NOT EXISTS business_type AS ENUM ('bar', 'coworking', 'community', 'crafts');
CREATE TYPE IF NOT EXISTS role AS ENUM ('admin', 'manager', 'bartender', 'cashier', 'staff');
CREATE TYPE IF NOT EXISTS order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled');
CREATE TYPE IF NOT EXISTS payment_method AS ENUM ('cash', 'card', 'mobile', 'tab', 'member_credit');

-- Enhanced Users table with Google OAuth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  password TEXT,
  google_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  profile_picture TEXT,
  role role DEFAULT 'staff' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Business categories
CREATE TABLE IF NOT EXISTS business_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type business_type NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Products/Menu items
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  category_id INTEGER REFERENCES business_categories(id),
  business_type business_type NOT NULL,
  img_url TEXT,
  barcode TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  -- Bar specific fields
  alcohol_content DECIMAL(5, 2), -- ABV percentage
  serving_size TEXT, -- e.g., "330ml", "1 pint"
  prep_time INTEGER DEFAULT 0, -- in minutes
  is_popular BOOLEAN DEFAULT false,
  is_happy_hour BOOLEAN DEFAULT false,
  happy_hour_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Customers/Members
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  date_of_birth DATE,
  -- Membership (coworking)
  membership_type TEXT,
  membership_expiry TIMESTAMP,
  membership_number TEXT UNIQUE,
  -- Credits & Loyalty
  credit_balance DECIMAL(10, 2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  -- Bar tab
  tab_limit DECIMAL(10, 2) DEFAULT 0,
  current_tab_balance DECIMAL(10, 2) DEFAULT 0,
  -- Other
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tables (bar seating)
CREATE TABLE IF NOT EXISTS bar_tables (
  id SERIAL PRIMARY KEY,
  table_number TEXT NOT NULL UNIQUE,
  table_name TEXT,
  capacity INTEGER DEFAULT 4,
  location TEXT, -- 'indoor', 'outdoor', 'bar'
  is_occupied BOOLEAN DEFAULT false,
  current_order_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  user_id INTEGER REFERENCES users(id) NOT NULL,
  table_id INTEGER REFERENCES bar_tables(id),
  business_type business_type NOT NULL,
  order_type TEXT DEFAULT 'dine_in', -- 'dine_in', 'takeaway', 'delivery'
  status order_status DEFAULT 'pending',
  -- Amounts
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  service_charge DECIMAL(10, 2) DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  tip DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  -- Payment
  payment_method payment_method NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP,
  -- Other
  notes TEXT,
  is_tab BOOLEAN DEFAULT false,
  served_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id INTEGER REFERENCES products(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  -- Modifications (e.g., "extra ice", "no sugar")
  modifiers JSONB,
  status order_status DEFAULT 'pending',
  prepared_at TIMESTAMP,
  served_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Bookings (coworking space)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  resource_type TEXT NOT NULL, -- 'meeting_room', 'hot_desk', 'dedicated_desk', 'event_space'
  resource_name TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'confirmed',
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'adjustment', 'waste'
  quantity INTEGER NOT NULL,
  cost_per_unit DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Shifts (staff clock in/out)
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  break_duration INTEGER DEFAULT 0, -- in minutes
  total_sales DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Cash Register Operations
CREATE TABLE IF NOT EXISTS cash_register (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  shift_id INTEGER REFERENCES shifts(id),
  operation_type TEXT NOT NULL, -- 'open', 'close', 'deposit', 'withdrawal'
  amount DECIMAL(10, 2) NOT NULL,
  expected_amount DECIMAL(10, 2),
  difference DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_business_type ON products(business_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_type ON orders(business_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, username, password, first_name, last_name, role, is_active)
VALUES ('admin@yourcompany.com', 'admin', '$2a$10$YourHashedPasswordHere', 'Admin', 'User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- Insert bar categories
INSERT INTO business_categories (name, type, description, color, icon) VALUES
('Beer', 'bar', 'Draft and bottled beers', '#FCD34D', '🍺'),
('Wine', 'bar', 'Red, white, and sparkling wines', '#DC2626', '🍷'),
('Cocktails', 'bar', 'Mixed drinks and cocktails', '#EC4899', '🍹'),
('Spirits', 'bar', 'Whiskey, vodka, rum, etc.', '#F59E0B', '🥃'),
('Soft Drinks', 'bar', 'Non-alcoholic beverages', '#3B82F6', '🥤'),
('Snacks', 'bar', 'Bar snacks and appetizers', '#10B981', '🍿'),
('Coffee & Tea', 'bar', 'Hot beverages', '#92400E', '☕')
ON CONFLICT DO NOTHING;

-- Insert sample bar products
INSERT INTO products (name, sku, description, price, cost, stock, category_id, business_type, alcohol_content, serving_size, is_available)
SELECT 
  'Heineken Beer', 'BEER-001', 'Classic Dutch lager', 8.00, 4.00, 100, id, 'bar', 5.0, '330ml', true
FROM business_categories WHERE name = 'Beer' AND type = 'bar'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, price, cost, stock, category_id, business_type, alcohol_content, serving_size, is_available)
SELECT 
  'Corona Extra', 'BEER-002', 'Mexican pale lager', 9.00, 4.50, 80, id, 'bar', 4.6, '330ml', true
FROM business_categories WHERE name = 'Beer' AND type = 'bar'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, price, cost, stock, category_id, business_type, is_available)
SELECT 
  'Coca-Cola', 'SOFT-001', 'Classic Coke', 3.50, 1.50, 200, id, 'bar', true
FROM business_categories WHERE name = 'Soft Drinks' AND type = 'bar'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, price, cost, stock, category_id, business_type, alcohol_content, serving_size, is_available)
SELECT 
  'Mojito', 'COCK-001', 'Rum, mint, lime, and soda', 12.00, 5.00, 50, id, 'bar', 12.0, '250ml', true
FROM business_categories WHERE name = 'Cocktails' AND type = 'bar'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, description, price, cost, stock, category_id, business_type, alcohol_content, serving_size, is_available)
SELECT 
  'Margarita', 'COCK-002', 'Tequila, lime, triple sec', 13.00, 5.50, 45, id, 'bar', 15.0, '250ml', true
FROM business_categories WHERE name = 'Cocktails' AND type = 'bar'
ON CONFLICT (sku) DO NOTHING;

-- Insert bar tables
INSERT INTO bar_tables (table_number, table_name, capacity, location) VALUES
('T1', 'Table 1', 4, 'indoor'),
('T2', 'Table 2', 4, 'indoor'),
('T3', 'Table 3', 2, 'indoor'),
('T4', 'Table 4', 6, 'indoor'),
('T5', 'Table 5', 4, 'outdoor'),
('T6', 'Table 6', 4, 'outdoor'),
('BAR1', 'Bar Stool 1', 1, 'bar'),
('BAR2', 'Bar Stool 2', 1, 'bar'),
('BAR3', 'Bar Stool 3', 1, 'bar')
ON CONFLICT (table_number) DO NOTHING;

-- Insert sample customer
INSERT INTO customers (name, email, phone, loyalty_points, tab_limit) VALUES
('John Doe', 'john@example.com', '+1234567890', 100, 500.00),
('Jane Smith', 'jane@example.com', '+1234567891', 250, 1000.00)
ON CONFLICT (email) DO NOTHING;
