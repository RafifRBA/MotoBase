import { env } from "./config/env.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { pinoHttp } from "pino-http";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";

import cors from "cors";
import express from "express"
import helmet from "helmet";
import compression from "compression";
import apiRouter from "./routes/index.js"
import logger from "./utils/logger.js";
import ApiError from "./utils/api-error.js";

const genReqId = (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
};

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new ApiError(429, "TOO_MANY_REQUESTS", "Terlalu banyak request, coba lagi nanti"));
    },
});

const app = express();

app.disable("x-powered-by");
app.use(pinoHttp({ logger, genReqId }));
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/health", (req, res) =>{
    res.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

app.use(globalLimiter);
app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;