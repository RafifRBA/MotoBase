import { rateLimit } from "express-rate-limit";

import { isTest } from "../config/env.js";
import ApiError from "../utils/api-error.js";

// Pembungkus express-rate-limit supaya response 429 selalu lewat errorHandler
// dan memakai format SPEC 16.2, bukan teks bawaan library.
export const createRateLimiter = ({
    windowMs,
    limit,
    code = "TOO_MANY_REQUESTS",
    message = "Terlalu banyak request, coba lagi nanti",
    ...options
}) =>
    rateLimit({
        windowMs,
        // Semua tes berjalan dari satu IP yang sama, jadi hitungannya cepat
        // penuh dan tes saling mengganggu. Batasnya dilonggarkan khusus saat
        // NODE_ENV=test; tes yang memang menguji rate limit menaikkan sendiri
        // jumlah requestnya.
        limit: isTest ? Math.max(limit, 5000) : limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        ...options,
        handler: (req, res, next) => next(new ApiError(429, code, message)),
    });
