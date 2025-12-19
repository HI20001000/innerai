import { PrismaClient } from '@prisma/client';
import { databaseUrl } from './config.js';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Lightweight query/action logging without dumping full parameters to avoid leaking secrets
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;
  // eslint-disable-next-line no-console
  console.log(
    `[prisma] ${params.model ?? 'raw'}.${params.action} took ${duration}ms`,
  );
  return result;
});
