import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app.js";
import { RefreshToken } from "../../src/modules/auth/refresh-token.model.js";
import { ROLES } from "../../src/modules/users/user.model.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { DEFAULT_PASSWORD, createUser } from "../helpers/factories.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const login = (email, password = DEFAULT_PASSWORD) =>
    request(app).post("/api/v1/auth/login").send({ email, password });

const cookiesOf = (res) => res.headers["set-cookie"] ?? [];
const refreshCookie = (res) => cookiesOf(res).find((c) => c.startsWith("refreshToken="));

describe("POST /api/v1/auth/login", () => {
    it("berhasil dan mengembalikan access token + cookie refresh", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test", role: ROLES.ADMIN });
        const res = await login("kasir@lajujaya.test");

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toEqual(expect.any(String));
        expect(res.body.data.user).toMatchObject({ id: user.id, role: ROLES.ADMIN });

        const cookie = refreshCookie(res);
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).toContain("Path=/api/v1/auth");
    });

    it("tidak pernah membocorkan passwordHash", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const res = await login("kasir@lajujaya.test");

        expect(JSON.stringify(res.body)).not.toContain("passwordHash");
        expect(JSON.stringify(res.body)).not.toContain("$2b$");
    });

    it("menerima email dengan huruf besar dan spasi", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const res = await login("  Kasir@LajuJaya.TEST  ");

        expect(res.status).toBe(200);
    });

    it("mencatat lastLoginAt", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test" });
        expect(user.lastLoginAt).toBeUndefined();

        await login("kasir@lajujaya.test");
        const res = await login("kasir@lajujaya.test");

        expect(res.body.data.user.lastLoginAt).not.toBeNull();
    });

    it("password salah ditolak 401 dengan pesan generik", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const res = await login("kasir@lajujaya.test", "PasswordSalah123");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("email tidak terdaftar memberi pesan yang sama persis (tidak membocorkan akun)", async () => {
        await createUser({ email: "kasir@lajujaya.test" });

        const salahPassword = await login("kasir@lajujaya.test", "PasswordSalah123");
        const tidakAda = await login("hantu@lajujaya.test");

        expect(tidakAda.status).toBe(salahPassword.status);
        expect(tidakAda.body.error.code).toBe(salahPassword.body.error.code);
        expect(tidakAda.body.error.message).toBe(salahPassword.body.error.message);
    });

    it("user nonaktif ditolak 403", async () => {
        await createUser({ email: "mantan@lajujaya.test", isActive: false });
        const res = await login("mantan@lajujaya.test");

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    });

    it("body tidak valid ditolak 400 dengan detail per field", async () => {
        const res = await request(app).post("/api/v1/auth/login").send({ email: "bukan-email" });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
        expect(res.body.error.details.map((d) => d.path).sort()).toEqual(["email", "password"]);
    });

    it("field tambahan seperti role diabaikan (anti mass assignment)", async () => {
        await createUser({ email: "kasir@lajujaya.test", role: ROLES.MECHANIC });
        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: "kasir@lajujaya.test", password: DEFAULT_PASSWORD, role: ROLES.OWNER });

        expect(res.body.data.user.role).toBe(ROLES.MECHANIC);
    });
});

describe("GET /api/v1/auth/me", () => {
    it("tanpa token ditolak 401", async () => {
        const res = await request(app).get("/api/v1/auth/me");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("token ngawur ditolak 401 INVALID_TOKEN", async () => {
        const res = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", "Bearer bukan.token.jwt");

        expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("skema selain Bearer ditolak", async () => {
        const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Basic abc123");

        expect(res.status).toBe(401);
    });

    it("token valid mengembalikan data user", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test" });
        const { body } = await login("kasir@lajujaya.test");

        const res = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${body.data.accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(user.id);
    });

    it("user yang dinonaktifkan setelah login langsung ditolak", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test" });
        const { body } = await login("kasir@lajujaya.test");

        user.isActive = false;
        await user.save();

        const res = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${body.data.accessToken}`);

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
    });
});

describe("POST /api/v1/auth/refresh", () => {
    it("tanpa cookie ditolak 401", async () => {
        const res = await request(app).post("/api/v1/auth/refresh");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
    });

    it("cookie valid menghasilkan access token baru dan cookie baru", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const loginRes = await login("kasir@lajujaya.test");

        const res = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie(loginRes));

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toEqual(expect.any(String));
        expect(refreshCookie(res)).not.toBe(refreshCookie(loginRes));
    });

    it("refresh token lama tidak bisa dipakai lagi setelah rotasi", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const loginRes = await login("kasir@lajujaya.test");
        const cookieLama = refreshCookie(loginRes);

        await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieLama);
        const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookieLama);

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("REFRESH_TOKEN_REUSED");
    });

    it("pemakaian ulang mencabut SEMUA sesi user tersebut", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test" });
        const sesiA = await login("kasir@lajujaya.test");
        const sesiB = await login("kasir@lajujaya.test");

        // sesi A dirotasi, lalu token lamanya dipakai ulang
        await request(app).post("/api/v1/auth/refresh").set("Cookie", refreshCookie(sesiA));
        await request(app).post("/api/v1/auth/refresh").set("Cookie", refreshCookie(sesiA));

        const aktif = await RefreshToken.countDocuments({ userId: user._id, revokedAt: null });
        expect(aktif).toBe(0);

        const res = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie(sesiB));
        expect(res.status).toBe(401);
    });

    it("dua refresh bersamaan hanya boleh berhasil satu (race condition)", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const loginRes = await login("kasir@lajujaya.test");
        const cookie = refreshCookie(loginRes);

        const hasil = await Promise.all([
            request(app).post("/api/v1/auth/refresh").set("Cookie", cookie),
            request(app).post("/api/v1/auth/refresh").set("Cookie", cookie),
        ]);

        expect(hasil.filter((r) => r.status === 200)).toHaveLength(1);
    });

    it("cookie gagal langsung dibersihkan dari browser", async () => {
        const res = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", "refreshToken=token-palsu");

        expect(refreshCookie(res)).toMatch(/refreshToken=;/);
    });

    it("user yang dinonaktifkan tidak bisa refresh", async () => {
        const user = await createUser({ email: "kasir@lajujaya.test" });
        const loginRes = await login("kasir@lajujaya.test");

        user.isActive = false;
        await user.save();

        const res = await request(app)
            .post("/api/v1/auth/refresh")
            .set("Cookie", refreshCookie(loginRes));

        expect(res.status).toBe(401);
    });
});

describe("POST /api/v1/auth/logout", () => {
    it("mencabut sesi sehingga refresh token tidak bisa dipakai lagi", async () => {
        await createUser({ email: "kasir@lajujaya.test" });
        const loginRes = await login("kasir@lajujaya.test");
        const cookie = refreshCookie(loginRes);

        const logoutRes = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
        expect(logoutRes.status).toBe(204);

        const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
        expect(res.status).toBe(401);
    });

    it("tanpa cookie tetap 204 (idempoten)", async () => {
        const res = await request(app).post("/api/v1/auth/logout");

        expect(res.status).toBe(204);
    });
});
