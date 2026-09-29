import { Router } from "express";
import { z } from "zod";

import { createRateLimiter } from "../../middlewares/rate-limit.js";
import { validate } from "../../middlewares/validate.js";
import * as orderController from "./service-order.controller.js";

// Tidak memakai middleware JWT, tapi WAJIB punya rate limit.
// Token 64 karakter hex mustahil ditebak, tapi tanpa batas ini penebak bisa
// membanjiri database dengan jutaan query.
const trackingLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    code: "TOO_MANY_TRACKING_REQUESTS",
    message: "Terlalu banyak permintaan. Coba lagi beberapa saat lagi",
});

const trackSchema = {
    params: z.object({
        token: z.string().regex(/^[0-9a-f]{64}$/, "Token tidak valid"),
    }),
};

const router = Router();

router.get(
    "/service-orders/track/:token",
    trackingLimiter,
    validate(trackSchema),
    orderController.track,
);

export default router;
