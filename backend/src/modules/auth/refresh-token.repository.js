import { RefreshToken } from "./refresh-token.model.js";

export const refreshTokenRepository = {
    create: (data) => RefreshToken.create(data),

    findById: (id) => RefreshToken.findById(id),

    // Memeriksa "sesi masih aktif" dan mencabutnya dalam SATU operasi atomik.
    // Kalau dipisah jadi find lalu update, dua request bersamaan bisa sama-sama
    // lolos pemeriksaan (race condition) dan satu refresh token terpakai dua kali.
    // Mengembalikan dokumen kalau berhasil diklaim, atau null kalau tidak.
    claimActive: (id, tokenHash, now) =>
        RefreshToken.findOneAndUpdate(
            { _id: id, tokenHash, revokedAt: null, expiresAt: { $gt: now } },
            { $set: { revokedAt: now } },
        ),

    revoke: (id, tokenHash, now) =>
        RefreshToken.updateOne(
            { _id: id, tokenHash, revokedAt: null },
            { $set: { revokedAt: now } },
        ),

    revokeAllForUser: (userId, now) =>
        RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now } }),
};
