import ApiError from "../utils/api-error.js";

// Menjawab "boleh atau tidak". Selalu dipasang SETELAH authenticate.
export const authorize =
    (...allowedRoles) =>
    (req, _res, next) => {
        if (!req.user) {
            throw new ApiError(401, "UNAUTHENTICATED", "Silakan login terlebih dahulu");
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk aksi ini");
        }

        next();
    };
