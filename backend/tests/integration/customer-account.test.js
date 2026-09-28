import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";
import { createOrder, seedWorkshop } from "../helpers/seed.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const PASSWORD = "RahasiaKuat123";

const daftar = async (override = {}) => {
    const res = await request(app)
        .post("/api/v1/auth/customer/register")
        .send({
            name: "Rafif Raihan",
            phone: "081234567890",
            password: PASSWORD,
            ...override,
        });

    const token = res.body.data?.accessToken;
    const withAuth = (method) => (url) =>
        request(app)[method](url).set("Authorization", `Bearer ${token}`);

    return {
        res,
        user: res.body.data?.user,
        get: withAuth("get"),
        post: withAuth("post"),
        patch: withAuth("patch"),
    };
};

describe("POST /api/v1/auth/customer/register", () => {
    it("pelanggan bisa mendaftar dan langsung mendapat token", async () => {
        const { res } = await daftar();

        expect(res.status).toBe(201);
        expect(res.body.data.user.role).toBe("CUSTOMER");
        expect(res.body.data.accessToken).toEqual(expect.any(String));
        expect(res.headers["set-cookie"].some((c) => c.startsWith("refreshToken="))).toBe(true);
    });

    it("nomor telepon dinormalisasi dan tidak boleh duplikat", async () => {
        const { res } = await daftar();
        expect(res.body.data.user.phone).toBe("6281234567890");

        const kedua = await daftar({ phone: "+62 812-3456-7890" });
        expect(kedua.res.status).toBe(409);
        expect(kedua.res.body.error.code).toBe("PHONE_ALREADY_USED");
    });

    it("password lemah ditolak", async () => {
        const { res } = await daftar({ password: "123" });
        expect(res.status).toBe(400);
    });

    it("akun baru belum terhubung ke data pelanggan", async () => {
        const pelanggan = await daftar();
        const res = await pelanggan.get("/api/v1/customers/me");

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("CUSTOMER_PROFILE_NOT_FOUND");
    });
});

describe("Penghubungan akun oleh admin", () => {
    const siapkan = async () => {
        const konteks = await seedWorkshop();
        const pelanggan = await daftar();
        return { ...konteks, pelanggan };
    };

    it("admin menghubungkan akun setelah memverifikasi identitas", async () => {
        const { admin, customer, pelanggan } = await siapkan();

        const res = await admin
            .post(`/api/v1/customers/${customer.id}/link-user`)
            .send({ userId: pelanggan.user.id });

        expect(res.status).toBe(200);

        const me = await pelanggan.get("/api/v1/customers/me");
        expect(me.status).toBe(200);
        expect(me.body.data.name).toBe("Rafif Raihan");
        // Catatan internal bengkel tidak ikut terkirim ke pelanggan.
        expect(me.body.data.notes).toBeUndefined();
    });

    it("nomor telepon yang tidak cocok ditolak", async () => {
        const { admin, customer } = await siapkan();
        const lain = await daftar({ phone: "081298765432", name: "Orang Lain" });

        const res = await admin
            .post(`/api/v1/customers/${customer.id}/link-user`)
            .send({ userId: lain.user.id });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("PHONE_MISMATCH");
    });

    it("satu data pelanggan tidak bisa dihubungkan ke dua akun", async () => {
        const { admin, customer, pelanggan } = await siapkan();
        await admin
            .post(`/api/v1/customers/${customer.id}/link-user`)
            .send({ userId: pelanggan.user.id });

        const res = await admin
            .post(`/api/v1/customers/${customer.id}/link-user`)
            .send({ userId: pelanggan.user.id });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("CUSTOMER_ALREADY_LINKED");
    });
});

describe("Dashboard pelanggan", () => {
    const siapkanTerhubung = async () => {
        const konteks = await seedWorkshop();
        const pelanggan = await daftar();
        await konteks.admin
            .post(`/api/v1/customers/${konteks.customer.id}/link-user`)
            .send({ userId: pelanggan.user.id });

        const order = await createOrder(konteks.admin, { ...konteks, serviceCost: 50000 });
        return { ...konteks, pelanggan, order };
    };

    it("melihat seluruh kendaraan miliknya", async () => {
        const { pelanggan } = await siapkanTerhubung();
        const res = await pelanggan.get("/api/v1/customers/me/vehicles");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].licensePlate).toBe("AB 1234 XY");
    });

    it("melihat riwayat servisnya", async () => {
        const { pelanggan, order } = await siapkanTerhubung();
        const res = await pelanggan.get("/api/v1/customers/me/service-orders");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].orderNumber).toBe(order.orderNumber);
    });

    it("melihat detail servisnya tanpa catatan internal", async () => {
        const { admin, pelanggan, order } = await siapkanTerhubung();
        await admin
            .patch(`/api/v1/service-orders/${order.id}`)
            .send({ internalNotes: "Rahasia bengkel" });

        const res = await pelanggan.get(`/api/v1/customers/me/service-orders/${order.id}`);

        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain("Rahasia bengkel");
        expect(res.body.data.internalNotes).toBeUndefined();
    });

    it("tidak bisa melihat order milik pelanggan lain", async () => {
        const { admin, pelanggan } = await siapkanTerhubung();

        const lain = await admin
            .post("/api/v1/customers")
            .send({ name: "Orang Lain", phone: "081298765432" });
        const kendaraanLain = await admin.post("/api/v1/vehicles").send({
            customerId: lain.body.data.id,
            licensePlate: "AB 9999 ZZ",
            brand: "Yamaha",
            model: "NMAX",
        });
        const orderLain = await createOrder(admin, {
            customer: lain.body.data,
            vehicle: kendaraanLain.body.data,
        });

        const res = await pelanggan.get(`/api/v1/customers/me/service-orders/${orderLain.id}`);

        expect(res.status).toBe(404);
    });

    it("pelanggan tidak bisa mengakses endpoint staf", async () => {
        const { pelanggan } = await siapkanTerhubung();

        expect((await pelanggan.get("/api/v1/customers")).status).toBe(403);
        expect((await pelanggan.get("/api/v1/service-orders")).status).toBe(403);
        expect((await pelanggan.get("/api/v1/spare-parts")).status).toBe(403);
        expect((await pelanggan.get("/api/v1/users")).status).toBe(403);
    });

    it("pelanggan tidak bisa mengubah nomor teleponnya sendiri", async () => {
        const { pelanggan } = await siapkanTerhubung();

        const res = await pelanggan
            .patch("/api/v1/customers/me")
            .send({ name: "Nama Baru", phone: "081211112222" });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe("Nama Baru");
        expect(res.body.data.phone).toBe("6281234567890");
    });

    it("link tracking tetap bisa dibuka walau pelanggan sudah punya akun", async () => {
        const { order } = await siapkanTerhubung();

        const res = await request(app).get(
            `/api/v1/public/service-orders/track/${order.trackingToken}`,
        );

        expect(res.status).toBe(200);
    });
});

describe("POST /api/v1/customers/me/claim-service-order", () => {
    it("ditolak kalau nomor telepon belum terverifikasi", async () => {
        const konteks = await seedWorkshop();
        const order = await createOrder(konteks.admin, konteks);
        const pelanggan = await daftar();

        const res = await pelanggan
            .post("/api/v1/customers/me/claim-service-order")
            .send({ trackingToken: order.trackingToken });

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("PHONE_NOT_VERIFIED");
    });

    it("ditolak kalau nomor telepon tidak cocok walau token benar", async () => {
        const konteks = await seedWorkshop();
        const order = await createOrder(konteks.admin, konteks);

        // Pelanggan lain diverifikasi lewat data pelanggan miliknya sendiri.
        const lain = await daftar({ phone: "081298765432", name: "Orang Lain" });
        const dataLain = await konteks.admin
            .post("/api/v1/customers")
            .send({ name: "Orang Lain", phone: "081298765432" });
        await konteks.admin
            .post(`/api/v1/customers/${dataLain.body.data.id}/link-user`)
            .send({ userId: lain.user.id });

        const res = await lain
            .post("/api/v1/customers/me/claim-service-order")
            .send({ trackingToken: order.trackingToken });

        // Token yang benar TIDAK cukup: nomor telepon akun harus cocok dengan
        // nomor pada data pelanggan di servis tersebut (SPEC 8.1).
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe("PHONE_MISMATCH");
    });

    it("berhasil setelah nomor terverifikasi dan cocok", async () => {
        const konteks = await seedWorkshop();

        // Data pelanggan kedua, belum terhubung ke akun mana pun.
        const dataBaru = await konteks.admin
            .post("/api/v1/customers")
            .send({ name: "Rafif Raihan", phone: "081277778888" });
        const kendaraan = await konteks.admin.post("/api/v1/vehicles").send({
            customerId: dataBaru.body.data.id,
            licensePlate: "AB 7777 AA",
            brand: "Honda",
            model: "Beat",
        });
        const order = await createOrder(konteks.admin, {
            customer: dataBaru.body.data,
            vehicle: kendaraan.body.data,
        });

        const pelanggan = await daftar({ phone: "081277778888" });

        // Verifikasi nomor dilakukan admin lewat data pelanggan lama.
        const dataLama = await konteks.admin
            .post("/api/v1/customers")
            .send({ name: "Rafif Raihan", phone: "081266665555" });
        expect(dataLama.status).toBe(201);

        // Simulasi nomor sudah terverifikasi (admin memverifikasi di bengkel).
        const { User } = await import("../../src/modules/users/user.model.js");
        await User.updateOne({ _id: pelanggan.user.id }, { $set: { phoneVerifiedAt: new Date() } });

        const res = await pelanggan
            .post("/api/v1/customers/me/claim-service-order")
            .send({ trackingToken: order.trackingToken });

        expect(res.status).toBe(200);

        const kendaraanSaya = await pelanggan.get("/api/v1/customers/me/vehicles");
        expect(kendaraanSaya.body.data).toHaveLength(1);
        expect(kendaraanSaya.body.data[0].licensePlate).toBe("AB 7777 AA");
    });

    it("token yang tidak valid ditolak", async () => {
        const pelanggan = await daftar();

        const res = await pelanggan
            .post("/api/v1/customers/me/claim-service-order")
            .send({ trackingToken: "a".repeat(64) });

        expect(res.status).toBe(404);
    });
});
