import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole, app, request } from "../helpers/api.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const contohPelanggan = {
    name: "Rafif Raihan",
    phone: "081234567890",
    email: "rafif@contoh.id",
    address: "Jl. Kaliurang No. 1",
};

describe("POST /api/v1/customers", () => {
    it("admin bisa membuat pelanggan dan nomornya dinormalisasi", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.post("/api/v1/customers").send(contohPelanggan);

        expect(res.status).toBe(201);
        expect(res.body.data.phone).toBe("6281234567890");
    });

    it("nomor telepon yang sama dalam format berbeda ditolak duplikat", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await admin.post("/api/v1/customers").send(contohPelanggan);

        const res = await admin
            .post("/api/v1/customers")
            .send({ ...contohPelanggan, phone: "+62 812-3456-7890", email: "lain@contoh.id" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("PHONE_ALREADY_USED");
    });

    it("dua pelanggan dengan nama sama tapi nomor berbeda tetap boleh", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await admin.post("/api/v1/customers").send(contohPelanggan);

        const res = await admin
            .post("/api/v1/customers")
            .send({ name: "Rafif Raihan", phone: "081298765432" });

        expect(res.status).toBe(201);
    });

    it("nomor telepon tidak valid ditolak 400", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin
            .post("/api/v1/customers")
            .send({ name: "Budi", phone: "bukan-nomor" });

        expect(res.status).toBe(400);
        expect(res.body.error.details[0].path).toBe("phone");
    });

    it("mekanik ditolak 403", async () => {
        const mechanic = await asRole(ROLES.MECHANIC);
        const res = await mechanic.post("/api/v1/customers").send(contohPelanggan);

        expect(res.status).toBe(403);
    });

    it("owner hanya boleh melihat, tidak boleh membuat", async () => {
        const owner = await asRole(ROLES.OWNER);

        expect((await owner.post("/api/v1/customers").send(contohPelanggan)).status).toBe(403);
        expect((await owner.get("/api/v1/customers")).status).toBe(200);
    });

    it("tanpa login ditolak 401", async () => {
        const res = await request(app).post("/api/v1/customers").send(contohPelanggan);

        expect(res.status).toBe(401);
    });
});

describe("GET /api/v1/customers", () => {
    it("mengembalikan meta pagination", async () => {
        const admin = await asRole(ROLES.ADMIN);
        for (let i = 0; i < 3; i += 1) {
            await admin
                .post("/api/v1/customers")
                .send({ name: `Orang ${i}`, phone: `08123456780${i}` });
        }

        const res = await admin.get("/api/v1/customers?page=1&limit=2");

        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it("pencarian berdasarkan nama", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await admin.post("/api/v1/customers").send(contohPelanggan);
        await admin.post("/api/v1/customers").send({ name: "Siti", phone: "081298765432" });

        const res = await admin.get("/api/v1/customers?search=rafif");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].name).toBe("Rafif Raihan");
    });

    it("karakter khusus di pencarian tidak merusak query", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await admin.post("/api/v1/customers").send(contohPelanggan);

        const res = await admin.get("/api/v1/customers?search=%28%28%28%2A%2B");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    it("limit di atas 100 ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/customers?limit=5000");

        expect(res.status).toBe(400);
    });
});

describe("GET & PATCH /api/v1/customers/:id", () => {
    it("id yang tidak ada menghasilkan 404", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/customers/507f1f77bcf86cd799439011");

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("CUSTOMER_NOT_FOUND");
    });

    it("id yang bukan ObjectId menghasilkan 400, bukan 500", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/customers/bukan-id");

        expect(res.status).toBe(400);
    });

    it("admin bisa memperbarui sebagian field", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const { body } = await admin.post("/api/v1/customers").send(contohPelanggan);

        const res = await admin
            .patch(`/api/v1/customers/${body.data.id}`)
            .send({ address: "Jl. Baru No. 2" });

        expect(res.status).toBe(200);
        expect(res.body.data.address).toBe("Jl. Baru No. 2");
        expect(res.body.data.name).toBe("Rafif Raihan");
    });

    it("body kosong ditolak 400", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const { body } = await admin.post("/api/v1/customers").send(contohPelanggan);

        const res = await admin.patch(`/api/v1/customers/${body.data.id}`).send({});

        expect(res.status).toBe(400);
    });
});
