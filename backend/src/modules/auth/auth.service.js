import mongoose from "mongoose";

import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { hashSHA256 } from "../../utils/hash.js";
import { maskEmail } from "../../utils/mask.js";
import { ROLES } from "../users/user.model.js";
import { userRepository } from "../users/user.repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { refreshTokenRepository } from "./refresh-token.repository.js";
import { getTokenExpiry, signAccessToken, signRefreshToken, verifyRefreshToken } from "./token.js";

const invalidCredentials = () =>
    new ApiError(401, "INVALID_CREDENTIALS", "Email atau password salah");

const invalidRefreshToken = () =>
    new ApiError(401, "INVALID_REFRESH_TOKEN", "Sesi tidak valid. Silakan login kembali");

// Kalau email tidak ditemukan, bcrypt tetap dijalankan terhadap hash dummy ini
// supaya waktu respons login sama saja. Tanpa itu, penyerang bisa menebak email
// mana yang terdaftar hanya dari selisih waktu respons (timing attack).
let dummyHashPromise;
const getDummyHash = () => (dummyHashPromise ??= hashPassword("dummy-password-untuk-timing"));

// Membuat satu sesi login: refresh token ditandatangani dengan jti = _id sesi,
// lalu hash-nya disimpan. Token mentah tidak pernah masuk database.
const issueSession = async (user, meta) => {
    const sessionId = new mongoose.Types.ObjectId();
    const refreshToken = signRefreshToken(user.id, sessionId.toString());
    const expiresAt = getTokenExpiry(refreshToken);

    await refreshTokenRepository.create({
        _id: sessionId,
        userId: user._id,
        tokenHash: hashSHA256(refreshToken),
        expiresAt,
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ipAddress ?? null,
    });

    return {
        accessToken: signAccessToken(user),
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
    };
};

export const login = async ({ email, password }, meta) => {
    const user = await userRepository.findByEmailWithPassword(email);
    const passwordMatches = await verifyPassword(
        password,
        user?.passwordHash ?? (await getDummyHash()),
    );

    if (!user || !passwordMatches) {
        // Dicatat untuk audit login gagal berulang (SPEC 25). Email disamarkan.
        logger.warn({ email: maskEmail(email) }, "Login gagal");
        throw invalidCredentials();
    }

    if (!user.isActive) {
        throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun Anda dinonaktifkan");
    }

    await userRepository.updateLastLogin(user._id, new Date());
    const session = await issueSession(user, meta);

    logger.info({ userId: user.id, role: user.role }, "Login berhasil");
    return { user, ...session };
};

export const refresh = async (rawToken, meta) => {
    if (!rawToken) throw invalidRefreshToken();

    const payload = verifyRefreshToken(rawToken);
    if (!mongoose.isValidObjectId(payload.jti)) throw invalidRefreshToken();

    const tokenHash = hashSHA256(rawToken);
    const now = new Date();

    // Rotasi: sesi lama dicabut pada saat yang sama dengan pemeriksaannya.
    const claimed = await refreshTokenRepository.claimActive(payload.jti, tokenHash, now);

    if (!claimed) {
        const existing = await refreshTokenRepository.findById(payload.jti);

        // Token yang sudah dicabut dipakai lagi = kemungkinan token dicuri.
        // Seluruh sesi user dicabut supaya pencuri dan korban sama-sama logout.
        if (existing && existing.revokedAt && existing.tokenHash === tokenHash) {
            await refreshTokenRepository.revokeAllForUser(existing.userId, now);
            logger.warn(
                { userId: existing.userId.toString(), sessionId: payload.jti },
                "Refresh token dipakai ulang, semua sesi user dicabut",
            );
            throw new ApiError(
                401,
                "REFRESH_TOKEN_REUSED",
                "Sesi tidak valid. Silakan login kembali",
            );
        }

        throw invalidRefreshToken();
    }

    const user = await userRepository.findById(claimed.userId);
    if (!user || !user.isActive) throw invalidRefreshToken();

    const session = await issueSession(user, meta);
    return { user, ...session };
};

// Logout tidak pernah gagal: token yang sudah tidak valid tetap dianggap
// berhasil dicabut, supaya client selalu bisa membersihkan sesinya.
export const logout = async (rawToken) => {
    if (!rawToken) return;

    let payload;
    try {
        payload = verifyRefreshToken(rawToken);
    } catch {
        return;
    }

    if (!mongoose.isValidObjectId(payload.jti)) return;
    await refreshTokenRepository.revoke(payload.jti, hashSHA256(rawToken), new Date());
};

// Registrasi pelanggan. Akun yang terbentuk BELUM terhubung ke data pelanggan
// di bengkel: penghubungan butuh verifikasi kepemilikan nomor (SPEC 8).
export const registerCustomer = async ({ name, phone, email, password }, meta) => {
    if (email && (await userRepository.findByEmail(email))) {
        throw new ApiError(409, "EMAIL_ALREADY_USED", "Email sudah terdaftar");
    }
    if (await userRepository.findByPhone(phone)) {
        throw new ApiError(409, "PHONE_ALREADY_USED", "Nomor telepon sudah terdaftar");
    }

    const user = await userRepository.create({
        name,
        phone,
        email,
        role: ROLES.CUSTOMER,
        passwordHash: await hashPassword(password),
    });

    const session = await issueSession(user, meta);
    logger.info({ userId: user.id }, "Pelanggan mendaftar");

    return { user, ...session };
};
