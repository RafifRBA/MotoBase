import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole } from "../helpers/api.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { advanceTo, createOrder, seedWorkshop } from "../helpers/seed.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

// Satu servis lengkap: dikerjakan mekanik, pakai 2 busi, selesai, dibayar.
const servisLengkap = async () => {
    const konteks = await seedWorkshop();
    const { admin, mechanic, part } = konteks;

    const order = await createOrder(admin, {
        ...konteks,
        serviceCost: 50000,
        assignedMechanicId: mechanic.user.id,
    });

    await advanceTo(admin, order.id, "DIKERJAKAN");
    await admin
        .post(`/api/v1/service-orders/${order.id}/parts`)
        .send({ sparePartId: part.id, quantity: 2 });
    await advanceTo(admin, order.id, "SELESAI").catch(() => {});
    await admin
        .patch(`/api/v1/service-orders/${order.id}/status`)
        .send({ status: "SELESAI" })
        .catch(() => {});
    await admin.post(`/api/v1/service-orders/${order.id}/payment`).send({ method: "TUNAI" });

    return { ...konteks, order };
};

describe("GET /api/v1/reports/service-summary", () => {
    it("menghitung jumlah order per status", async () => {
        const { admin } = await servisLengkap();
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/service-summary");

        expect(res.status).toBe(200);
        expect(res.body.data.totalOrder).toBe(1);
        expect(res.body.data.byStatus.SELESAI).toBe(1);
        expect(res.body.data.byStatus.ANTRE).toBe(0);
        expect(res.body.data.rataRataJamPengerjaan).not.toBeNull();
        void admin;
    });

    it("bisa disaring berdasarkan rentang tanggal", async () => {
        await servisLengkap();
        const owner = await asRole(ROLES.OWNER);

        const kemarin = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const kosong = await owner.get(
            `/api/v1/reports/service-summary?startDate=2020-01-01&endDate=${kemarin}`,
        );
        expect(kosong.body.data.totalOrder).toBe(0);

        const hariIni = new Date().toISOString().slice(0, 10);
        const ada = await owner.get(
            `/api/v1/reports/service-summary?startDate=${hariIni}&endDate=${hariIni}`,
        );
        expect(ada.body.data.totalOrder).toBe(1);
    });

    it("rentang tanggal terbalik ditolak 400", async () => {
        const owner = await asRole(ROLES.OWNER);
        const res = await owner.get(
            "/api/v1/reports/service-summary?startDate=2026-12-01&endDate=2026-01-01",
        );

        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/reports/revenue-summary", () => {
    it("memisahkan pendapatan jasa dan suku cadang", async () => {
        await servisLengkap();
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/revenue-summary");

        expect(res.body.data.totalPendapatan).toBe(100000);
        expect(res.body.data.pendapatanJasa).toBe(50000);
        expect(res.body.data.pendapatanSukuCadang).toBe(50000);
        expect(res.body.data.jumlahTransaksi).toBe(1);
        expect(res.body.data.perMetodePembayaran).toEqual([
            { metode: "TUNAI", total: 100000, jumlah: 1 },
        ]);
    });

    it("menghitung tagihan yang belum dibayar", async () => {
        const konteks = await seedWorkshop();
        await createOrder(konteks.admin, { ...konteks, serviceCost: 75000 });
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/revenue-summary");

        expect(res.body.data.totalPendapatan).toBe(0);
        expect(res.body.data.belumDibayar).toEqual({ total: 75000, jumlah: 1 });
    });

    it("admin tidak boleh melihat laporan pendapatan", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/reports/revenue-summary");

        expect(res.status).toBe(403);
    });
});

describe("GET /api/v1/reports/parts-usage", () => {
    it("owner melihat modal dan margin", async () => {
        await servisLengkap();
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/parts-usage");

        expect(res.body.data[0]).toMatchObject({
            sku: "BUSI-NGK-01",
            totalDipakai: 2,
            pendapatan: 50000,
            modal: 36000,
            margin: 14000,
            sisaStok: 8,
        });
    });

    it("admin tidak melihat modal dan margin", async () => {
        await servisLengkap();
        const admin = await asRole(ROLES.ADMIN);

        const res = await admin.get("/api/v1/reports/parts-usage");

        expect(res.body.data[0].pendapatan).toBe(50000);
        expect(res.body.data[0].modal).toBeUndefined();
        expect(res.body.data[0].margin).toBeUndefined();
    });

    it("pembatalan pemakaian tidak ikut dihitung sebagai pemakaian ganda", async () => {
        const konteks = await seedWorkshop();
        const { admin, part } = konteks;
        const order = await createOrder(admin, konteks);
        await advanceTo(admin, order.id, "DIKERJAKAN");
        const tambah = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 2 });
        await admin.delete(
            `/api/v1/service-orders/${order.id}/parts/${tambah.body.data.usedParts[0].id}`,
        );

        const owner = await asRole(ROLES.OWNER);
        const res = await owner.get("/api/v1/reports/parts-usage");

        // Movement USAGE tetap tercatat (append-only), tapi stok sudah kembali.
        expect(res.body.data[0].sisaStok).toBe(10);
    });
});

describe("GET /api/v1/reports/low-stock", () => {
    it("menampilkan kekurangan terhadap batas minimum", async () => {
        const { admin } = await seedWorkshop({ initialStock: 1 });
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/low-stock");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0]).toMatchObject({ currentStock: 1, minimumStock: 3, kekurangan: 2 });
        void admin;
    });
});

describe("GET /api/v1/reports/mechanic-performance", () => {
    it("menghitung jumlah servis selesai per mekanik", async () => {
        const { mechanic } = await servisLengkap();
        const owner = await asRole(ROLES.OWNER);

        const res = await owner.get("/api/v1/reports/mechanic-performance");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0]).toMatchObject({
            mechanicId: mechanic.user.id,
            totalOrder: 1,
            selesai: 1,
            dibatalkan: 0,
            totalNilaiServis: 100000,
        });
    });

    it("hanya pemilik yang boleh melihat kinerja mekanik", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const mechanic = await asRole(ROLES.MECHANIC);

        expect((await admin.get("/api/v1/reports/mechanic-performance")).status).toBe(403);
        expect((await mechanic.get("/api/v1/reports/mechanic-performance")).status).toBe(403);
    });
});
