const demoMode = process.env.JUSTICELINK_DEMO_MODE !== 'false';

const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const demoLocalOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const origins = Array.from(new Set([
  ...configuredOrigins,
  ...(demoMode ? demoLocalOrigins : []),
]));

export const env = {
  PORT: Number(process.env.PORT || 4000),
  HOST: process.env.HOST || '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'change_me',
  CORS_ORIGINS: origins,
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  DEMO_MODE: demoMode,
} as const;
