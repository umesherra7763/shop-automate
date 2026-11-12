import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

// Neon's pooled connection (host contains "-pooler") runs PgBouncer; tell Prisma so it
// doesn't rely on prepared statements across pooled connections.
function url(): string | undefined {
  const u = process.env.DATABASE_URL;
  if (!u || !u.includes("-pooler") || u.includes("pgbouncer=")) return u;
  return u + (u.includes("?") ? "&" : "?") + "pgbouncer=true";
}

export const db = g.prisma ?? new PrismaClient({ datasourceUrl: url() });

if (process.env.NODE_ENV !== "production") g.prisma = db;
