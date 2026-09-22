import { isProduction, env } from "../config/env.js";
import { pino } from "pino";

const defaultLoglevel = env.LOG_LEVEL

const logger = pino({
    level: defaultLoglevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: !isProduction ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
        },
    }
    : undefined,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "password", "*.password",
            "passwordHash", "*.passwordHash",
            "token", "*.token",
            "otp", "*.otp",
            "refreshToken", "*.refreshToken"
        ],
        censor: "[REDACTED]",
    }
});

export default logger;
