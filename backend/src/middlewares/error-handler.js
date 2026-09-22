import { isProduction } from "../config/env.js";
import { ZodError } from "zod";
import ApiError from "../utils/api-error.js";
import logger from "../utils/logger.js";


const sendError = (req, res, statusCode, code, message, details = null) =>
    res.status(statusCode).json({
        success: false,
        error: { code, message, details, requestId: req.id ?? null },
    });


export const errorHandler = (err, req, res, next) => {
    const log = req.log ?? logger;

    if(err instanceof ApiError) {
        log.warn({
            code: err.code,
            statusCode: err.statusCode,
            details: err.details
        }, err.message);

        return sendError(
            req, res, err.statusCode, err.code,
            err.message,
            err.details,
        );
    }

    if(err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));

        return sendError(
            req, res, 400, "VALIDATION_ERROR",
            "Data yang dikirim tidak valid",
            details,
        );
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err && err.type === 'entity.parse.failed') {
        const clientMessage = 'Format JSON yang Anda kirimkan rusak atau tidak valid';
        
        log.warn({
            code: 'INVALID_JSON',
            statusCode: 400,
            originalError: err.message
        }, clientMessage);

        return sendError(
            req, res, 400, "INVALID_JSON",
            clientMessage,
            null,
        );
    }

    log.error({ err }, 'Unexpected Error');

    return sendError(
        req, res, 500, "INTERNAL_SERVER_ERROR",
        "Terjadi kesalahan internal pada server",
        isProduction ? null : err.stack,
    );
};
