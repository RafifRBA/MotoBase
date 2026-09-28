import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

import ApiError from "../../utils/api-error.js";

const ALGORITHM = "HS256";

// Access
export const signAccessToken = (user) => {
    return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
        algorithm: ALGORITHM,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        subject: user.id,
    });
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new ApiError(
                401,
                "TOKEN_EXPIRED",
                "Sesi Anda telah berakhir, silahkan login kembali",
            );
        }

        if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "INVALID_TOKEN", "Token tidak valid atau telah diubah");
        }

        throw new ApiError(500, "JWT_ERROR", "Terjadi kesalahan pada verifikasi keamanan sesi");
    }
};

// Refresh
export const signRefreshToken = (userId, sessionId) => {
    return jwt.sign({}, env.JWT_REFRESH_SECRET, {
        algorithm: ALGORITHM,
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        subject: userId,
        jwtid: sessionId,
    });
};

export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] });
    } catch {
        throw new ApiError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Sesi tidak valid. Silahkan login kembali",
        );
    }
};

// Exp Token
export const getTokenExpiry = (token) => {
    const payload = jwt.decode(token);

    if (!payload || !payload.exp) {
        throw new ApiError(500, "JWT_DECODE_ERROR", "Token tidak memiliki klaim masa kadaluwarsa");
    }

    return new Date(payload.exp * 1000);
};
