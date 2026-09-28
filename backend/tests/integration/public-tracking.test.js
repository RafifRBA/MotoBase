import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { advanceTo, createOrder, seedWorkshop } from "../helpers/seed.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const track = (token) => request(app).get(`/api/v1/public/service-orders/track/${token}`);

const siapkan = async () => {
    const konteks = await seedWorkshop();
    const order = await createOrder(konteks.admin, {
        ...konteks,
        serviceCost: 50000,
        internalNotes: "Pelanggan cerewet, hati-hati",
    });
    await konteks.admin
        .patch(`/api/v1/service-orders/${order.id}/assign-mechanic`)
        .send({ mechanicId: konteks.mechanic.user.id });

    return { ...konteks, order };
};

describe("GET /api/v1/public/service-orders/track/:token", () => {
    it("bisa dibuka tanpa login", async () => {
        const { order } = await siapkan();
        const res = await track(order.trackingToken);

        expect(res.status).toBe(200);
        expect(res.body.data.orderNumber).toBe(order.orderNumber);
        expect(res.body.data.currentStatus).toBe("ANTRE");
    });

    it("menyamarkan plat nomor dan nama pelanggan", async () => {
        const { order } = await siapkan();
        const res = await track(order.trackingToken);

        expect(res.body.data.vehicle.licensePlate).toBe("AB 12** XY");
        expect(res.body.data.customerName).toBe("Ra***");
        expect(res.body.data.vehicle.brand).toBe("Honda");
    });

    it("mekanik hanya ditampilkan nama depannya", async () => {
        const { order } = await siapkan();
        const res = await track(order.trackingToken);

        expect(res.body.data.mechanic.name).toBe("Pengguna");
    });

    it("tidak membocorkan data internal apa pun", async () => {
        const { admin, order, part } = await siapkan();
        await advanceTo(admin, order.id, "DIKERJAKAN");
        await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 1 });

        const res = await track(order.trackingToken);
        const teks = JSON.stringify(res.body);

        expect(teks).not.toContain("6281234567890"); // nomor telepon lengkap
        expect(teks).not.toContain("Pelanggan cerewet"); // catatan internal
        expect(teks).not.toContain("18000"); // harga modal
        expect(teks).not.toContain("purchasePrice");
        expect(teks).not.toContain("internalNotes");
        expect(teks).not.toContain("currentStock");
        expect(teks).not.toContain("customerId");
        expect(teks).not.toContain("assignedMechanicId");
        expect(teks).not.toContain("changedBy");
    });

    it("menampilkan suku cadang, biaya, dan timeline status", async () => {
        const { admin, order, part } = await siapkan();
        await advanceTo(admin, order.id, "DIKERJAKAN");
        await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 2 });

        const res = await track(order.trackingToken);

        expect(res.body.data.usedSpareParts).toEqual([
            { name: "Busi NGK", quantity: 2, unitPrice: 25000, subtotal: 50000 },
        ]);
        expect(res.body.data.serviceCost).toBe(50000);
        expect(res.body.data.grandTotal).toBe(100000);
        expect(res.body.data.statusHistory.map((h) => h.status)).toEqual([
            "ANTRE",
            "DIPERIKSA",
            "DIKERJAKAN",
        ]);
    });

    it("menandai motor siap diambil saat SELESAI", async () => {
        const { admin, order } = await siapkan();
        await advanceTo(admin, order.id, "SELESAI");

        const res = await track(order.trackingToken);

        expect(res.body.data.isReadyForPickup).toBe(true);
        expect(res.body.data.completedAt).not.toBeNull();
    });

    it("koreksi status admin tidak muncul di timeline pelanggan", async () => {
        const { admin, order } = await siapkan();
        await advanceTo(admin, order.id, "DIKERJAKAN");
        await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA", isCorrection: true, note: "Salah input" });

        const res = await track(order.trackingToken);

        expect(res.body.data.statusHistory).toHaveLength(3);
        expect(JSON.stringify(res.body)).not.toContain("Salah input");
    });

    it("token yang salah ditolak 404 dengan pesan yang sama", async () => {
        await siapkan();
        const res = await track("a".repeat(64));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("TRACKING_NOT_FOUND");
    });

    it("token dengan format tidak valid ditolak 400", async () => {
        const res = await track("token-pendek");

        expect(res.status).toBe(400);
    });

    it("token yang dicabut tidak bisa dipakai lagi", async () => {
        const { admin, order } = await siapkan();
        await admin.post(`/api/v1/service-orders/${order.id}/revoke-tracking-token`);

        const res = await track(order.trackingToken);

        expect(res.status).toBe(404);
        // Pesannya sama persis dengan token yang tidak pernah ada, supaya tidak
        // membocorkan bahwa token itu dulu valid.
        expect(res.body.error.code).toBe("TRACKING_NOT_FOUND");
    });

    it("token tidak pernah bisa mengubah data", async () => {
        const { order } = await siapkan();

        const patch = await request(app)
            .patch(`/api/v1/public/service-orders/track/${order.trackingToken}`)
            .send({ currentStatus: "SELESAI" });
        expect(patch.status).toBe(404);

        const tanpaLogin = await request(app)
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA" });
        expect(tanpaLogin.status).toBe(401);
    });

    it("token kedaluwarsa ditolak", async () => {
        const { order } = await siapkan();

        const { ServiceOrder } =
            await import("../../src/modules/service-orders/service-order.model.js");
        await ServiceOrder.updateOne(
            { _id: order.id },
            { $set: { trackingExpiresAt: new Date(Date.now() - 1000) } },
        );

        const res = await track(order.trackingToken);
        expect(res.status).toBe(404);
    });
});

describe("Rotasi dan pencabutan token", () => {
    it("rotasi membuat token baru dan mematikan yang lama", async () => {
        const { admin, order } = await siapkan();

        const rotasi = await admin.post(`/api/v1/service-orders/${order.id}/rotate-tracking-token`);

        expect(rotasi.status).toBe(200);
        expect(rotasi.body.data.trackingToken).toHaveLength(64);
        expect(rotasi.body.data.trackingToken).not.toBe(order.trackingToken);

        expect((await track(order.trackingToken)).status).toBe(404);
        expect((await track(rotasi.body.data.trackingToken)).status).toBe(200);
    });

    it("rotasi menghidupkan kembali link yang sudah dicabut", async () => {
        const { admin, order } = await siapkan();
        await admin.post(`/api/v1/service-orders/${order.id}/revoke-tracking-token`);

        const rotasi = await admin.post(`/api/v1/service-orders/${order.id}/rotate-tracking-token`);

        expect((await track(rotasi.body.data.trackingToken)).status).toBe(200);
    });

    it("hanya admin yang boleh memutar ulang token", async () => {
        const { mechanic, order } = await siapkan();

        const res = await mechanic.post(`/api/v1/service-orders/${order.id}/rotate-tracking-token`);

        expect(res.status).toBe(403);
    });
});
