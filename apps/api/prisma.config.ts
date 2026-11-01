import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// O .env compartilhado fica na raiz do monorepo.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // During Docker image builds no database environment is present; migrate uses
    // the real DATABASE_URL injected by Compose when the API container starts.
    url: process.env.DATABASE_URL ?? 'postgresql://naker:naker@127.0.0.1:5432/naker?schema=public',
  },
});
