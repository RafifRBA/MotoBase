import ApiError from "../utils/api-error.js";

export const notFoundHandler = (req, res, next) => {
    const error = new ApiError(
        404,
        "ROUTE_NOT_FOUND",
        `${req.method} ${req.originalUrl} tidak ditemukan.`
    );

    next(error);
};