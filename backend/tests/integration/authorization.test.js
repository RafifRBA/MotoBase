import express from "express";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { errorHandler } from "../../src/middlewares/error-handler.js";
import { authenticate } from "../../src/middlewares/authenticate.js";
import { authorize } from "../../src/middlewares/authorize.js";
import { signAccessToken } from "../../src/modules/auth/token.js";
import { ROLES } from "../../src/modules/users/user.model.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { createUser } from "../helpers/factories.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

// Route contoh: Tahap 2 belum punya endpoint yang dibatasi role, jadi middleware
// diuji lewat aplikasi kecil di sini.
const app = express();
app.get("/owner-only", authenticate, authorize(ROLES.OWNER), (req, res) =>
    res.json({ success: true, role: req.user.role }),
);
app.get("/staff", authenticate, authorize(ROLES.OWNER, ROLES.ADMIN, ROLES.MECHANIC), (req, res) =>
    res.json({ success: true, role: req.user.role }),
);
app.use(errorHandler);

const asRole = async (role) => {
    const user = await createUser({ role });
    return signAccessToken(user);
};

describe("authorize", () => {
    it("tanpa token ditolak 401, bukan 403", async () => {
        const res = await request(app).get("/owner-only");

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("OWNER boleh masuk route khusus owner", async () => {
        const token = await asRole(ROLES.OWNER);
        const res = await request(app).get("/owner-only").set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
    });

    it.each([ROLES.ADMIN, ROLES.MECHANIC, ROLES.CUSTOMER])(
        "%s ditolak 403 di route khusus owner",
        async (role) => {
            const token = await asRole(role);
            const res = await request(app)
                .get("/owner-only")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(403);
            expect(res.body.error.code).toBe("FORBIDDEN");
        },
    );

    it("CUSTOMER ditolak di route staf, tiga role internal diterima", async () => {
        for (const role of [ROLES.OWNER, ROLES.ADMIN, ROLES.MECHANIC]) {
            const token = await asRole(role);
            const res = await request(app).get("/staff").set("Authorization", `Bearer ${token}`);
            expect(res.status).toBe(200);
        }

        const token = await asRole(ROLES.CUSTOMER);
        const res = await request(app).get("/staff").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it("role dibaca dari database, bukan dari isi token", async () => {
        // Token dibuat saat user masih MECHANIC, lalu rolenya dinaikkan di database.
        const user = await createUser({ role: ROLES.MECHANIC });
        const token = signAccessToken(user);

        user.role = ROLES.OWNER;
        await user.save();

        const res = await request(app).get("/owner-only").set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.role).toBe(ROLES.OWNER);
    });
});
