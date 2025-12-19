import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  REQUEST_BODY_LIMIT: z.string().default('10mb'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET is required'),
  REGISTER_INVITE_TOKEN: z.string().min(1, 'REGISTER_INVITE_TOKEN is required'),
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.string().default('3306'),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default('password'),
  MYSQL_DATABASE: z.string().default('ai_platform'),
  MYSQL_POOL_SIZE: z.string().default('10'),
  DIFY_API_BASE_URL: z.string().default(''),
  DIFY_API_KEY: z.string().default(''),
  DIFY_CHAT_ENDPOINT: z.string().default('/chat-messages'),
  DIFY_TOKEN_LIMIT: z.string().default('32000'),
});

const env = envSchema.parse(process.env);

export const config = {
  port: Number(env.PORT),
  host: env.HOST,
  corsOrigins: env.CORS_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
  bodyLimit: env.REQUEST_BODY_LIMIT,
  jwtSecret: env.JWT_SECRET,
  registerInviteToken: env.REGISTER_INVITE_TOKEN,
  db: {
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    poolSize: Number(env.MYSQL_POOL_SIZE),
  },
  dify: {
    baseUrl: env.DIFY_API_BASE_URL,
    apiKey: env.DIFY_API_KEY,
    chatEndpoint: env.DIFY_CHAT_ENDPOINT,
    tokenLimit: Number(env.DIFY_TOKEN_LIMIT),
  },
};

export const databaseUrl = `mysql://${config.db.user}:${encodeURIComponent(config.db.password)}@${config.db.host}:${config.db.port}/${config.db.database}`;
