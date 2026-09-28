import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { createRateLimiter } from "../../middlewares/rate-limit.js";
import { validate } from "../../middlewares/validate.js";
import * as authController from "./auth.controller.js";
import { loginSchema, registerCustomerSchema } from "./auth.validation.js";

// Jauh lebih ketat daripada limit global (SPEC 21). skipSuccessfulRequests
// membuat hanya percobaan yang GAGAL yang dihitung, jadi kasir yang login
// berkali-kali dari komputer yang sama tidak ikut terblokir.
const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    code: "TOO_MANY_LOGIN_ATTEMPTS",
    message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit",
});

// Registrasi juga dibatasi supaya tidak ada yang membuat ribuan akun.
const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    code: "TOO_MANY_REGISTRATIONS",
    message: "Terlalu banyak percobaan registrasi. Coba lagi nanti",
});

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post(
    "/customer/register",
    registerLimiter,
    validate(registerCustomerSchema),
    authController.registerCustomer,
);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
