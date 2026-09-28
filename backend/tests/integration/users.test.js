import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole, app, request } from "../helpers/api.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { DEFAULT_PASSWORD } from "../helpers/factories.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const mekanikBaru = {
    name: "Budi Mekanik",
    email: "budi@lajujaya.id",
    password: "RahasiaKuat123",
    role: ROLES.MECHANIC,
};

describe("POST /api/v1/users", () => {
    it("owner bisa membuat akun mekanik", async () => {
        const owner = await asRole(ROLES.OWNER);
        const res = await owner.post("/api/v1/users").send(mekanikBaru);

        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe(ROLES.MECHANIC);
        expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    });

    it("mekanik yang dibuat bisa langsung login", async () => {
        const owner = await asRole(ROLES.OWNER);
        await owner.post("/api/v1/users").send(mekanikBaru);

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: mekanikBaru.email, password: mekanikBaru.password });

        expect(res.status).toBe(200);
    });

    it("admin tidak boleh membuat user", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.post("/api/v1/users").send(mekanikBaru);

        expect(res.status).toBe(403);
    });

    it("role CUSTOMER tidak boleh dibuat lewat endpoint staf", async () => {
        const owner = await asRole(ROLES.OWNER);
        const res = await owner
            .post("/api/v1/users")
            .send({ ...mekanikBaru, role: ROLES.CUSTOMER });

        expect(res.status).toBe(400);
    });

    it("email duplikat ditolak 409", async () => {
        const owner = await asRole(ROLES.OWNER);
        await owner.post("/api/v1/users").send(mekanikBaru);

        const res = await owner.post("/api/v1/users").send(mekanikBaru);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("EMAIL_ALREADY_USED");
    });

    it("password lemah ditolak 400", async () => {
        const owner = await asRole(ROLES.OWNER);
        const res = await owner.post("/api/v1/users").send({ ...mekanikBaru, password: "123" });

        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/users", () => {
    it("bisa disaring per role", async () => {
        const owner = await asRole(ROLES.OWNER);
        await owner.post("/api/v1/users").send(mekanikBaru);

        const res = await owner.get(`/api/v1/users?role=${ROLES.MECHANIC}`);

        expect(res.body.data.every((u) => u.role === ROLES.MECHANIC)).toBe(true);
        expect(res.body.data).toHaveLength(1);
    });

    it("admin boleh melihat daftar staf", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/users");

        expect(res.status).toBe(200);
    });

    it("mekanik tidak boleh melihat daftar staf", async () => {
        const mechanic = await asRole(ROLES.MECHANIC);
        const res = await mechanic.get("/api/v1/users");

        expect(res.status).toBe(403);
    });
});

describe("PATCH /api/v1/users/:id", () => {
    it("role tidak bisa diubah lewat endpoint update biasa", async () => {
        const owner = await asRole(ROLES.OWNER);
        const { body } = await owner.post("/api/v1/users").send(mekanikBaru);

        const res = await owner
            .patch(`/api/v1/users/${body.data.id}`)
            .send({ name: "Budi Baru", role: ROLES.OWNER });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe("Budi Baru");
        expect(res.body.data.role).toBe(ROLES.MECHANIC);
    });
});

describe("PATCH /api/v1/users/:id/status", () => {
    it("menonaktifkan user langsung memutus sesinya", async () => {
        const owner = await asRole(ROLES.OWNER);
        const { body } = await owner.post("/api/v1/users").send(mekanikBaru);

        const loginRes = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: mekanikBaru.email, password: mekanikBaru.password });
        const cookie = loginRes.headers["set-cookie"].find((c) => c.startsWith("refreshToken="));

        await owner.patch(`/api/v1/users/${body.data.id}/status`).send({ isActive: false });

        const akses = await request(app)
            .get("/api/v1/auth/me")
            .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);
        expect(akses.status).toBe(403);

        const refreshRes = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
        expect(refreshRes.status).toBe(401);
    });

    it("owner tidak bisa menonaktifkan dirinya sendiri", async () => {
        const owner = await asRole(ROLES.OWNER);
        const res = await owner
            .patch(`/api/v1/users/${owner.user.id}/status`)
            .send({ isActive: false });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");
    });

    it("user nonaktif bisa diaktifkan lagi dan login kembali", async () => {
        const owner = await asRole(ROLES.OWNER);
        const { body } = await owner.post("/api/v1/users").send(mekanikBaru);

        await owner.patch(`/api/v1/users/${body.data.id}/status`).send({ isActive: false });
        await owner.patch(`/api/v1/users/${body.data.id}/status`).send({ isActive: true });

        const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: mekanikBaru.email, password: DEFAULT_PASSWORD });

        expect(res.status).toBe(200);
    });
});
