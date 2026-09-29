import { randomBytes } from "node:crypto";

import { env } from "../config/env.js";
import { hashSHA256 } from "./hash.js";

// Token tracking untuk pelanggan tanpa login.
// Token mentah HANYA dikirim ke pelanggan; database menyimpan hash-nya.
export const generateTrackingToken = () => {
    // 32 byte acak kriptografis = 64 karakter hex. Mustahil ditebak.
    const token = randomBytes(32).toString("hex");

    return {
        token,
        tokenHash: hashSHA256(token),
        expiresAt: new Date(Date.now() + env.TRACKING_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    };
};

// Pencarian dilakukan dengan meng-hash token dari URL lalu membandingkannya
// dengan trackingTokenHash, bukan sebaliknya.
export const hashTrackingToken = (token) => hashSHA256(token);
