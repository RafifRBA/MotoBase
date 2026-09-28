import { isProduction } from "../../config/env.js";
import { toUserResponse } from "../users/user.mapper.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";

// path dibatasi ke route auth saja: cookie tidak ikut terkirim di setiap
// request biasa, jadi permukaan kebocorannya lebih kecil.
const REFRESH_COOKIE_PATH = "/api/v1/auth";

const refreshCookieOptions = (expires) => ({
    httpOnly: true, // tidak bisa dibaca JavaScript di browser (anti-XSS)
    secure: isProduction, // hanya lewat HTTPS di production
    sameSite: "strict", // tidak ikut terkirim dari situs lain (anti-CSRF)
    path: REFRESH_COOKIE_PATH,
    expires,
});

const requestMeta = (req) => ({
    userAgent: req.get("user-agent")?.slice(0, 300) ?? null,
    ipAddress: req.ip ?? null,
});

const sendSession = (res, message, session, status = 200) => {
    res.cookie(
        REFRESH_COOKIE_NAME,
        session.refreshToken,
        refreshCookieOptions(session.refreshTokenExpiresAt),
    );

    return res.status(status).json({
        success: true,
        message,
        data: {
            accessToken: session.accessToken,
            user: toUserResponse(session.user),
        },
    });
};

const clearRefreshCookie = (res) =>
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(undefined));

export const login = async (req, res) => {
    const session = await authService.login(req.validated.body, requestMeta(req));
    return sendSession(res, "Login berhasil", session);
};

export const refresh = async (req, res) => {
    try {
        const session = await authService.refresh(
            req.cookies?.[REFRESH_COOKIE_NAME],
            requestMeta(req),
        );
        return sendSession(res, "Token berhasil diperbarui", session);
    } catch (error) {
        // Cookie yang sudah tidak berlaku dibersihkan supaya browser tidak
        // mengirimnya lagi di percobaan berikutnya.
        clearRefreshCookie(res);
        throw error;
    }
};

export const logout = async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
    clearRefreshCookie(res);
    return res.status(204).end();
};

export const me = (req, res) =>
    res.status(200).json({ success: true, data: toUserResponse(req.user) });

export const registerCustomer = async (req, res) => {
    const session = await authService.registerCustomer(req.validated.body, requestMeta(req));
    return sendSession(res, "Registrasi berhasil", session, 201);
};
