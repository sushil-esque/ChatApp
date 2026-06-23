import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg'

import { PrismaClient } from "../../generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                  // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 10000, // timeout if can't connect in 10s
})


const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient  | undefined };
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

export { prisma };