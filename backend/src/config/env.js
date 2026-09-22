import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true");

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),

    MONGODB_URI: z.string().min(1),

    // Satu origin atau beberapa yang dipisah koma, lalu dipecah jadi array
    // supaya app.js bisa langsung menyerahkannya ke cors() sebagai allowlist.
    CORS_ORIGIN: z
        .string()
        .default("http://localhost:3000")
        .transform((value) =>
            value
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean),
        ),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    LOW_STOCK_DEFAULT: z.coerce.number().int().nonnegative().default(5),
    TRACKING_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(90),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    WHATSAPP_ENABLED: booleanFromEnv,
    WHATSAPP_API_URL: z.string().optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("\nKonfigurasi environment tidak valid:\n");
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    console.error("\nPeriksa file .env\n");

    process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
