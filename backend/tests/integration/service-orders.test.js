import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { SparePart } from "../../src/modules/spare-parts/spare-part.model.js";
import { StockMovement } from "../../src/modules/stock-movements/stock-movement.model.js";
import { ServiceOrder } from "../../src/modules/service-orders/service-order.model.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { advanceTo, createOrder, seedWorkshop } from "../helpers/seed.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

describe("POST /api/v1/service-orders", () => {
    it("membuat order dengan nomor, antrean, status ANTRE, dan tracking token", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const res = await admin.post("/api/v1/service-orders").send({
            customerId: customer.id,
            vehicleId: vehicle.id,
            complaint: "Mesin sulit menyala",
            serviceCost: 50000,
        });

        expect(res.status).toBe(201);
        expect(res.body.data.orderNumber).toMatch(/^SRV-\d{8}-0001$/);
        expect(res.body.data.queueNumber).toBe(1);
        expect(res.body.data.currentStatus).toBe("ANTRE");
        expect(res.body.data.grandTotal).toBe(50000);
        expect(res.body.data.trackingToken).toHaveLength(64);
        expect(res.body.data.statusHistory).toHaveLength(1);
    });

    it("token mentah tidak pernah disimpan di database", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const tersimpan = await ServiceOrder.findById(order.id);

        expect(tersimpan.trackingTokenHash).toHaveLength(64);
        expect(tersimpan.trackingTokenHash).not.toBe(order.trackingToken);
    });

    it("nomor antrean urut dan tidak kembar walau dibuat bersamaan", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();

        const hasil = await Promise.all(
            Array.from({ length: 5 }, () =>
                admin.post("/api/v1/service-orders").send({
                    customerId: customer.id,
                    vehicleId: vehicle.id,
                    complaint: "Servis rutin",
                }),
            ),
        );

        const nomor = hasil.map((r) => r.body.data.queueNumber).sort((a, b) => a - b);
        expect(nomor).toEqual([1, 2, 3, 4, 5]);
        expect(new Set(hasil.map((r) => r.body.data.orderNumber)).size).toBe(5);
    });

    it("kendaraan milik pelanggan lain ditolak", async () => {
        const { admin, vehicle } = await seedWorkshop();
        const lain = await admin
            .post("/api/v1/customers")
            .send({ name: "Orang Lain", phone: "081298765432" });

        const res = await admin.post("/api/v1/service-orders").send({
            customerId: lain.body.data.id,
            vehicleId: vehicle.id,
            complaint: "Servis rutin",
        });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("VEHICLE_NOT_OWNED_BY_CUSTOMER");
    });

    it("mekanik tidak boleh membuat order", async () => {
        const { mechanic, customer, vehicle } = await seedWorkshop();
        const res = await mechanic.post("/api/v1/service-orders").send({
            customerId: customer.id,
            vehicleId: vehicle.id,
            complaint: "Servis rutin",
        });

        expect(res.status).toBe(403);
    });
});

describe("Alur status", () => {
    it("maju bertahap ANTRE sampai DIAMBIL", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const hasil = await advanceTo(admin, order.id, "DIAMBIL");

        expect(hasil.currentStatus).toBe("DIAMBIL");
        expect(hasil.statusHistory.map((h) => h.to)).toEqual([
            "ANTRE",
            "DIPERIKSA",
            "DIKERJAKAN",
            "SELESAI",
            "DIAMBIL",
        ]);
        expect(hasil.completedAt).not.toBeNull();
        expect(hasil.pickedUpAt).not.toBeNull();
    });

    it("lompatan status ditolak 409", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const res = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "SELESAI" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("setiap perubahan mencatat actor dan waktu", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const res = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA", note: "Mulai pemeriksaan" });

        const terakhir = res.body.data.statusHistory.at(-1);
        expect(terakhir).toMatchObject({
            from: "ANTRE",
            to: "DIPERIKSA",
            note: "Mulai pemeriksaan",
        });
        expect(terakhir.changedBy).toBe(admin.user.id);
        expect(terakhir.changedAt).toBeTruthy();
    });

    it("order yang sudah DIAMBIL tidak bisa diubah lagi", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });
        await advanceTo(admin, order.id, "DIAMBIL");

        const res = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIKERJAKAN" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("ORDER_ALREADY_CLOSED");
    });

    it("DIBATALKAN bisa dari status mana pun yang belum final", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });
        await advanceTo(admin, order.id, "DIKERJAKAN");

        const res = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIBATALKAN", note: "Pelanggan membatalkan" });

        expect(res.status).toBe(200);
        expect(res.body.data.cancelledAt).not.toBeNull();
    });

    it("koreksi mundur hanya boleh admin dan wajib beralasan", async () => {
        const { admin, mechanic, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, {
            customer,
            vehicle,
            assignedMechanicId: undefined,
        });
        await advanceTo(admin, order.id, "DIKERJAKAN");

        const tanpaAlasan = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA", isCorrection: true });
        expect(tanpaAlasan.status).toBe(400);

        await admin
            .patch(`/api/v1/service-orders/${order.id}/assign-mechanic`)
            .send({ mechanicId: mechanic.user.id });
        const olehMekanik = await mechanic
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA", isCorrection: true, note: "Salah klik" });
        expect(olehMekanik.status).toBe(403);

        const res = await admin
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA", isCorrection: true, note: "Salah input status" });

        expect(res.status).toBe(200);
        expect(res.body.data.currentStatus).toBe("DIPERIKSA");
        expect(res.body.data.statusHistory.at(-1).isCorrection).toBe(true);
    });

    it("mekanik hanya bisa mengubah order yang ditugaskan kepadanya", async () => {
        const { admin, mechanic, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const sebelumDitugaskan = await mechanic
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA" });
        expect(sebelumDitugaskan.status).toBe(403);
        expect(sebelumDitugaskan.body.error.code).toBe("NOT_ASSIGNED_MECHANIC");

        await admin
            .patch(`/api/v1/service-orders/${order.id}/assign-mechanic`)
            .send({ mechanicId: mechanic.user.id });

        const sesudah = await mechanic
            .patch(`/api/v1/service-orders/${order.id}/status`)
            .send({ status: "DIPERIKSA" });
        expect(sesudah.status).toBe(200);
    });
});

describe("Pemakaian suku cadang", () => {
    const siapkanOrderDikerjakan = async () => {
        const konteks = await seedWorkshop();
        const order = await createOrder(konteks.admin, konteks);
        await advanceTo(konteks.admin, order.id, "DIKERJAKAN");
        return { ...konteks, order };
    };

    it("mengurangi stok, membuat movement USAGE, dan menghitung ulang total", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();
        await admin.patch(`/api/v1/service-orders/${order.id}`).send({ serviceCost: 50000 });

        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 2 });

        expect(res.status).toBe(201);
        expect(res.body.data.usedParts).toHaveLength(1);
        expect(res.body.data.partsSubtotal).toBe(50000);
        expect(res.body.data.grandTotal).toBe(100000);

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(8);

        const movement = await StockMovement.findOne({ type: "USAGE" });
        expect(movement).toMatchObject({ quantity: 2, stockBefore: 10, stockAfter: 8 });
    });

    it("harga disalin sehingga perubahan harga tidak mengubah servis lama", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();
        await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 1 });

        await admin.patch(`/api/v1/spare-parts/${part.id}`).send({ sellingPrice: 99000 });

        const res = await admin.get(`/api/v1/service-orders/${order.id}`);
        expect(res.body.data.usedParts[0].unitPrice).toBe(25000);
        expect(res.body.data.grandTotal).toBe(25000);
    });

    it("stok tidak cukup membatalkan seluruh transaksi", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();

        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 999 });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(10);
        expect(await StockMovement.countDocuments({ type: "USAGE" })).toBe(0);

        const orderRes = await admin.get(`/api/v1/service-orders/${order.id}`);
        expect(orderRes.body.data.usedParts).toHaveLength(0);
    });

    it("retry dengan Idempotency-Key sama tidak mengurangi stok dua kali", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();
        const key = "pakai-part-123";

        await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .set("Idempotency-Key", key)
            .send({ sparePartId: part.id, quantity: 2 });
        const kedua = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .set("Idempotency-Key", key)
            .send({ sparePartId: part.id, quantity: 2 });

        expect(kedua.body.data.usedParts).toHaveLength(1);

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(8);
    });

    it("tidak bisa mencatat part saat status ANTRE", async () => {
        const { admin, customer, vehicle, part } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });

        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 1 });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("INVALID_STATUS_FOR_PART_USAGE");
    });

    it("pembatalan membuat REVERSAL dan mengembalikan stok", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();
        const tambah = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 3 });
        const usageId = tambah.body.data.usedParts[0].id;

        const res = await admin.delete(`/api/v1/service-orders/${order.id}/parts/${usageId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.usedParts).toHaveLength(0);
        expect(res.body.data.grandTotal).toBe(0);

        const tersimpan = await SparePart.findById(part.id);
        expect(tersimpan.currentStock).toBe(10);

        // Catatan lama tidak dihapus; ada movement baru yang mengimbanginya.
        expect(await StockMovement.countDocuments({ type: "USAGE" })).toBe(1);
        const reversal = await StockMovement.findOne({ type: "REVERSAL" });
        expect(reversal).toMatchObject({ quantity: 3, stockBefore: 7, stockAfter: 10 });
    });

    it("peringatan stok menipis muncul setelah pemakaian", async () => {
        const { admin, customer, vehicle, part } = await seedWorkshop({ initialStock: 4 });
        const order = await createOrder(admin, { customer, vehicle });
        await advanceTo(admin, order.id, "DIKERJAKAN");

        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/parts`)
            .send({ sparePartId: part.id, quantity: 2 });

        expect(res.body.meta.isLowStock).toBe(true);
    });

    it("beberapa pemakaian bersamaan tidak membuat stok negatif", async () => {
        const { admin, part, order } = await siapkanOrderDikerjakan();

        const hasil = await Promise.all(
            Array.from({ length: 6 }, () =>
                admin
                    .post(`/api/v1/service-orders/${order.id}/parts`)
                    .send({ sparePartId: part.id, quantity: 3 }),
            ),
        );

        const berhasil = hasil.filter((r) => r.status === 201).length;
        const tersimpan = await SparePart.findById(part.id);

        expect(tersimpan.currentStock).toBe(10 - berhasil * 3);
        expect(tersimpan.currentStock).toBeGreaterThanOrEqual(0);
    });
});

describe("Pembayaran", () => {
    it("baru bisa dibayar setelah SELESAI", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle, serviceCost: 50000 });

        const terlalu = await admin
            .post(`/api/v1/service-orders/${order.id}/payment`)
            .send({ method: "TUNAI" });
        expect(terlalu.status).toBe(409);
        expect(terlalu.body.error.code).toBe("ORDER_NOT_READY_FOR_PAYMENT");

        await advanceTo(admin, order.id, "SELESAI");
        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/payment`)
            .send({ method: "TUNAI" });

        expect(res.status).toBe(200);
        expect(res.body.data.paymentStatus).toBe("DIBAYAR");
        expect(res.body.data.paidAt).not.toBeNull();
    });

    it("tidak bisa dibayar dua kali", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle, serviceCost: 50000 });
        await advanceTo(admin, order.id, "SELESAI");
        await admin.post(`/api/v1/service-orders/${order.id}/payment`).send({ method: "TUNAI" });

        const res = await admin
            .post(`/api/v1/service-orders/${order.id}/payment`)
            .send({ method: "QRIS" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("ALREADY_PAID");
    });

    it("mekanik tidak boleh mencatat pembayaran", async () => {
        const { admin, mechanic, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle });
        await advanceTo(admin, order.id, "SELESAI");

        const res = await mechanic
            .post(`/api/v1/service-orders/${order.id}/payment`)
            .send({ method: "TUNAI" });

        expect(res.status).toBe(403);
    });
});

describe("Daftar dan riwayat", () => {
    it("mekanik hanya melihat order yang ditugaskan kepadanya", async () => {
        const { admin, mechanic, customer, vehicle } = await seedWorkshop();
        const punyaDia = await createOrder(admin, {
            customer,
            vehicle,
            assignedMechanicId: mechanic.user.id,
        });
        await createOrder(admin, { customer, vehicle });

        const res = await mechanic.get("/api/v1/service-orders");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].id).toBe(punyaDia.id);
    });

    it("riwayat servis kendaraan bisa dilihat", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        await createOrder(admin, { customer, vehicle });
        await createOrder(admin, { customer, vehicle });

        const res = await admin.get(`/api/v1/vehicles/${vehicle.id}/service-orders`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });

    it("riwayat servis pelanggan bisa dilihat", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        await createOrder(admin, { customer, vehicle });

        const res = await admin.get(`/api/v1/customers/${customer.id}/service-orders`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.meta.total).toBe(1);
    });

    it("catatan internal tidak bisa diubah menjadi total oleh frontend", async () => {
        const { admin, customer, vehicle } = await seedWorkshop();
        const order = await createOrder(admin, { customer, vehicle, serviceCost: 50000 });

        const res = await admin.patch(`/api/v1/service-orders/${order.id}`).send({
            diagnosis: "Busi mati",
            grandTotal: 1,
            partsSubtotal: 1,
            currentStatus: "SELESAI",
        });

        expect(res.status).toBe(200);
        expect(res.body.data.grandTotal).toBe(50000);
        expect(res.body.data.currentStatus).toBe("ANTRE");
    });
});
