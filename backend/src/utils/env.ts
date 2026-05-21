const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const demoMode = process.env.JUSTICELINK_DEMO_MODE !== 'false';

export const env = {
  PORT: Number(process.env.PORT || 4000),
  HOST: process.env.HOST || '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'change_me',
  CORS_ORIGINS: origins,
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  DEMO_MODE: demoMode,
} as const;
