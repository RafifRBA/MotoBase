import mongoose from "mongoose";

import ApiError from "../utils/api-error.js";
import { verifyAccessToken } from "../modules/auth/token.js";
import { User } from "../modules/users/user.model.js";

// Menjawab "siapa yang mengirim request ini". User diambil ulang dari database,
// bukan dipercaya dari isi token, supaya perubahan role atau penonaktifan akun
// langsung berlaku.
export const authenticate = async (req, _res, next) => {
    const [scheme, token] = (req.get("authorization") ?? "").split(" ");

    if (scheme !== "Bearer" || !token) {
        throw new ApiError(401, "UNAUTHENTICATED", "Silakan login terlebih dahulu");
    }

    const payload = verifyAccessToken(token);

    if (!mongoose.isValidObjectId(payload.sub)) {
        throw new ApiError(401, "INVALID_TOKEN", "Token tidak valid");
    }

    const user = await User.findById(payload.sub);
    if (!user) {
        throw new ApiError(401, "INVALID_TOKEN", "Token tidak valid");
    }

    if (!user.isActive) {
        throw new ApiError(403, "ACCOUNT_INACTIVE", "Akun Anda dinonaktifkan");
    }

    req.user = user;
    next();
};
