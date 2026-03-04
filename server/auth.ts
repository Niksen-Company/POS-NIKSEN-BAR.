import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import type { SafeUser, Role } from "@shared/schema";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function getUserByEmail(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  return u ?? null;
}

export async function getUserById(id: number) {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u ?? null;
}

export function toSafeUser(u: typeof users.$inferSelect): SafeUser {
  const { passwordHash, pin, ...safe } = u;
  return safe;
}

// Seed default users if table is empty
export async function seedUsersIfEmpty() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) return;

  const defaults = [
    { name: "J Niksen",     email: "owner@niksen.co",   password: "niksen2024", role: "owner"    as Role, pin: "1234" },
    { name: "Manager Alex", email: "manager@niksen.co", password: "manager123", role: "manager"  as Role, pin: "2345" },
    { name: "Staff Sam",    email: "staff@niksen.co",   password: "staff123",   role: "staff"    as Role, pin: "3456" },
    { name: "Guest",        email: "customer@niksen.co",password: "guest123",   role: "customer" as Role, pin: null   },
  ];

  for (const d of defaults) {
    const passwordHash = await hashPassword(d.password);
    await db.insert(users).values({
      name: d.name, email: d.email, passwordHash,
      role: d.role, pin: d.pin, active: true,
    });
  }
  console.log("✓ Default users seeded");
}
