import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { SparePart } from "../../src/modules/spare-parts/spare-part.model.js";
import { StockMovement } from "../../src/modules/stock-movements/stock-movement.model.js";
import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole } from "../helpers/api.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const busi = {
    sku: "BUSI-NGK-01",
    name: "Busi NGK",
    category: "Mesin",
    sellingPrice: 25000,
    purchasePrice: 18000,
    initialStock: 10,
    minimumStock: 3,
    unit: "pcs",
};

const buatPart = async (admin, override = {}) => {
    const res = await admin.post("/api/v1/spare-parts").send({ ...busi, ...override });
    return res.body.data;
};

describe("POST /api/v1/spare-parts", () => {
    it("admin bisa mendaftarkan suku cadang beserta stok awal", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.post("/api/v1/spare-parts").send(busi);

        expect(res.status).toBe(201);
        expect(res.body.data.currentStock).toBe(10);
        expect(res.body.data.sku).toBe("BUSI-NGK-01");
    });

    it("stok awal ikut tercatat sebagai movement bertipe IN", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const movements = await StockMovement.find({ sparePartId: part.id });

        expect(movements).toHaveLength(1);
        expect(movements[0]).toMatchObject({
            type: "IN",
            quantity: 10,
            stockBefore: 0,
            stockAfter: 10,
        });
    });

    it("SKU duplikat ditolak 409", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await buatPart(admin);

        const res = await admin.post("/api/v1/spare-parts").send(busi);

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("SKU_ALREADY_USED");
    });

    it("minimumStock memakai LOW_STOCK_DEFAULT kalau tidak diisi", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const tanpaMinimum = { ...busi };
        delete tanpaMinimum.minimumStock;
        const res = await admin.post("/api/v1/spare-parts").send(tanpaMinimum);

        expect(res.body.data.minimumStock).toBe(5);
    });

    it("harga bukan bilangan bulat ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin
            .post("/api/v1/spare-parts")
            .send({ ...busi, sellingPrice: 25000.5 });

        expect(res.status).toBe(400);
    });

    it("mekanik tidak boleh membuat suku cadang", async () => {
        const mechanic = await asRole(ROLES.MECHANIC);
        const res = await mechanic.post("/api/v1/spare-parts").send(busi);

        expect(res.status).toBe(403);
    });
});

describe("Harga modal", () => {
    it("owner melihat purchasePrice", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await buatPart(admin);
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/spare-parts");

        expect(res.body.data[0].purchasePrice).toBe(18000);
    });

    it.each([ROLES.ADMIN, ROLES.MECHANIC])("%s tidak melihat purchasePrice", async (role) => {
        const admin = await asRole(ROLES.ADMIN);
        await buatPart(admin);
        const user = await asRole(role);

        const res = await user.get("/api/v1/spare-parts");

        expect(res.body.data[0].purchasePrice).toBeUndefined();
        expect(res.body.data[0].sellingPrice).toBe(25000);
    });
});

describe("POST /api/v1/spare-parts/:id/stock-in", () => {
    it("menambah stok dan membuat movement", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/stock-in`)
            .send({ quantity: 5, reason: "Kiriman supplier" });

        expect(res.status).toBe(200);
        expect(res.body.data.sparePart.currentStock).toBe(15);
        expect(res.body.data.movement).toMatchObject({
            type: "IN",
            stockBefore: 10,
            stockAfter: 15,
        });
    });

    it("retry dengan Idempotency-Key yang sama tidak menambah stok dua kali", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);
        const key = "kunci-retry-123";

        const pertama = await admin
            .post(`/api/v1/spare-parts/${part.id}/stock-in`)
            .set("Idempotency-Key", key)
            .send({ quantity: 5 });
        const kedua = await admin
            .post(`/api/v1/spare-parts/${part.id}/stock-in`)
            .set("Idempotency-Key", key)
            .send({ quantity: 5 });

        expect(pertama.body.data.sparePart.currentStock).toBe(15);
        expect(kedua.body.data.sparePart.currentStock).toBe(15);
        expect(kedua.body.data.movement.id).toBe(pertama.body.data.movement.id);

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(15);
    });

    it("tanpa Idempotency-Key, dua request memang menambah dua kali", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        await admin.post(`/api/v1/spare-parts/${part.id}/stock-in`).send({ quantity: 5 });
        await admin.post(`/api/v1/spare-parts/${part.id}/stock-in`).send({ quantity: 5 });

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(20);
    });

    it("dua request bersamaan dengan key sama hanya dihitung sekali", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);
        const key = "kunci-balapan-456";

        await Promise.all([
            admin
                .post(`/api/v1/spare-parts/${part.id}/stock-in`)
                .set("Idempotency-Key", key)
                .send({ quantity: 5 }),
            admin
                .post(`/api/v1/spare-parts/${part.id}/stock-in`)
                .set("Idempotency-Key", key)
                .send({ quantity: 5 }),
        ]);

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(15);
        expect(await StockMovement.countDocuments({ idempotencyKey: key })).toBe(1);
    });

    it("suku cadang nonaktif tidak bisa ditambah stoknya", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);
        await admin.patch(`/api/v1/spare-parts/${part.id}`).send({ isActive: false });

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/stock-in`)
            .send({ quantity: 5 });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("SPARE_PART_INACTIVE");
    });

    it("quantity 0 atau negatif ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        expect(
            (await admin.post(`/api/v1/spare-parts/${part.id}/stock-in`).send({ quantity: 0 }))
                .status,
        ).toBe(400);
        expect(
            (await admin.post(`/api/v1/spare-parts/${part.id}/stock-in`).send({ quantity: -5 }))
                .status,
        ).toBe(400);
    });
});

describe("POST /api/v1/spare-parts/:id/adjust-stock", () => {
    it("penyesuaian negatif mengurangi stok", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: -3, reason: "Hasil stok opname" });

        expect(res.status).toBe(200);
        expect(res.body.data.sparePart.currentStock).toBe(7);
        expect(res.body.data.movement).toMatchObject({
            type: "ADJUSTMENT",
            quantity: 3,
            stockBefore: 10,
            stockAfter: 7,
        });
    });

    it("stok tidak pernah negatif dan seluruh transaksi dibatalkan", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);
        const jumlahMovementAwal = await StockMovement.countDocuments();

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: -50, reason: "Melebihi stok yang ada" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(10);
        // Tidak ada movement yang tertinggal dari transaksi yang gagal.
        expect(await StockMovement.countDocuments()).toBe(jumlahMovementAwal);
    });

    it("alasan wajib diisi", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: -1 });

        expect(res.status).toBe(400);
    });

    it("penyesuaian 0 ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: 0, reason: "Tidak ada perubahan" });

        expect(res.status).toBe(400);
    });

    it("beberapa pengurangan bersamaan tidak membuat stok negatif", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin, { initialStock: 10 });

        // 5 request paralel masing-masing mengurangi 3 dari stok 10.
        // Paling banyak 3 yang boleh berhasil (total 9).
        const hasil = await Promise.all(
            Array.from({ length: 5 }, () =>
                admin
                    .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
                    .send({ quantity: -3, reason: "Uji paralel" }),
            ),
        );

        const berhasil = hasil.filter((r) => r.status === 200).length;
        const tersimpan = await SparePart.findById(part.id);

        expect(tersimpan.currentStock).toBe(10 - berhasil * 3);
        expect(tersimpan.currentStock).toBeGreaterThanOrEqual(0);
        expect(berhasil).toBeLessThanOrEqual(3);
    });
});

describe("Stok menipis", () => {
    it("ditandai isLowStock saat currentStock <= minimumStock", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin, { initialStock: 4, minimumStock: 3 });

        const sebelum = await admin.get(`/api/v1/spare-parts/${part.id}`);
        expect(sebelum.body.data.isLowStock).toBe(false);

        const res = await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: -1, reason: "Terpakai" });

        expect(res.body.data.isLowStock).toBe(true);
    });

    it("GET /spare-parts/low-stock hanya menampilkan yang menipis", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await buatPart(admin, { sku: "AMAN-01", initialStock: 50, minimumStock: 3 });
        await buatPart(admin, { sku: "TIPIS-01", initialStock: 2, minimumStock: 5 });

        const res = await admin.get("/api/v1/spare-parts/low-stock");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].sku).toBe("TIPIS-01");
    });

    it("filter ?lowStock=true memberi hasil yang sama", async () => {
        const admin = await asRole(ROLES.ADMIN);
        await buatPart(admin, { sku: "AMAN-01", initialStock: 50, minimumStock: 3 });
        await buatPart(admin, { sku: "TIPIS-01", initialStock: 2, minimumStock: 5 });

        const res = await admin.get("/api/v1/spare-parts?lowStock=true");

        expect(res.body.data).toHaveLength(1);
    });
});

describe("Riwayat pergerakan stok", () => {
    it("tercatat urut dari yang terbaru", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);
        await admin.post(`/api/v1/spare-parts/${part.id}/stock-in`).send({ quantity: 5 });
        await admin
            .post(`/api/v1/spare-parts/${part.id}/adjust-stock`)
            .send({ quantity: -2, reason: "Rusak" });

        const res = await admin.get(`/api/v1/spare-parts/${part.id}/movements`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.data.map((m) => m.type)).toEqual(["ADJUSTMENT", "IN", "IN"]);
    });

    it("stok tidak bisa diubah langsung lewat PATCH", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const part = await buatPart(admin);

        const res = await admin
            .patch(`/api/v1/spare-parts/${part.id}`)
            .send({ currentStock: 9999, name: "Busi NGK Baru" });

        expect(res.status).toBe(200);
        expect(res.body.data.currentStock).toBe(10);
        expect(res.body.data.name).toBe("Busi NGK Baru");
    });

    it("GET /stock-movements butuh role internal", async () => {
        const mechanic = await asRole(ROLES.MECHANIC);
        const res = await mechanic.get("/api/v1/stock-movements");

        expect(res.status).toBe(403);
    });
});
