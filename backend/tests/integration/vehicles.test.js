import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole } from "../helpers/api.js";
import { clearTestDB, connectTestDB, disconnectTestDB } from "../helpers/db.js";

beforeAll(connectTestDB);
afterEach(clearTestDB);
afterAll(disconnectTestDB);

const buatPelanggan = async (admin, phone = "081234567890") => {
    const res = await admin.post("/api/v1/customers").send({ name: "Rafif", phone });
    return res.body.data.id;
};

const contohKendaraan = (customerId) => ({
    customerId,
    licensePlate: "AB 1234 XY",
    brand: "Honda",
    model: "Vario",
    year: 2020,
});

describe("POST /api/v1/vehicles", () => {
    it("admin bisa mendaftarkan kendaraan", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);

        const res = await admin.post("/api/v1/vehicles").send(contohKendaraan(customerId));

        expect(res.status).toBe(201);
        expect(res.body.data.licensePlate).toBe("AB 1234 XY");
    });

    it("plat sama dengan format berbeda ditolak duplikat", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);
        await admin.post("/api/v1/vehicles").send(contohKendaraan(customerId));

        const res = await admin
            .post("/api/v1/vehicles")
            .send({ ...contohKendaraan(customerId), licensePlate: "ab1234xy" });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe("LICENSE_PLATE_ALREADY_USED");
    });

    it("customerId yang tidak ada ditolak 404", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin
            .post("/api/v1/vehicles")
            .send(contohKendaraan("507f1f77bcf86cd799439011"));

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe("CUSTOMER_NOT_FOUND");
    });

    it("mekanik boleh melihat tapi tidak boleh membuat", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);
        const mechanic = await asRole(ROLES.MECHANIC);

        expect(
            (await mechanic.post("/api/v1/vehicles").send(contohKendaraan(customerId))).status,
        ).toBe(403);
        expect((await mechanic.get("/api/v1/vehicles")).status).toBe(200);
    });

    it("tahun di luar rentang wajar ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);

        const res = await admin
            .post("/api/v1/vehicles")
            .send({ ...contohKendaraan(customerId), year: 1800 });

        expect(res.status).toBe(400);
    });
});

describe("GET /api/v1/vehicles", () => {
    it("bisa disaring per pelanggan", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerA = await buatPelanggan(admin, "081234567890");
        const customerB = await buatPelanggan(admin, "081298765432");

        await admin.post("/api/v1/vehicles").send(contohKendaraan(customerA));
        await admin
            .post("/api/v1/vehicles")
            .send({ ...contohKendaraan(customerB), licensePlate: "AB 5678 ZZ" });

        const res = await admin.get(`/api/v1/vehicles?customerId=${customerA}`);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].customerId).toBe(customerA);
    });

    it("pencarian plat mengabaikan spasi dan huruf besar-kecil", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);
        await admin.post("/api/v1/vehicles").send(contohKendaraan(customerId));

        const res = await admin.get("/api/v1/vehicles?search=ab 1234");

        expect(res.body.data).toHaveLength(1);
    });
});

describe("GET /api/v1/customers/:id/vehicles", () => {
    it("mengembalikan kendaraan milik pelanggan itu saja", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerA = await buatPelanggan(admin, "081234567890");
        const customerB = await buatPelanggan(admin, "081298765432");

        await admin.post("/api/v1/vehicles").send(contohKendaraan(customerA));
        await admin
            .post("/api/v1/vehicles")
            .send({ ...contohKendaraan(customerB), licensePlate: "AB 5678 ZZ" });

        const res = await admin.get(`/api/v1/customers/${customerA}/vehicles`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
    });

    it("pelanggan tidak ada menghasilkan 404", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const res = await admin.get("/api/v1/customers/507f1f77bcf86cd799439011/vehicles");

        expect(res.status).toBe(404);
    });
});

describe("PATCH /api/v1/vehicles/:id", () => {
    it("perpindahan pemilik dilakukan dengan mengubah customerId", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const lama = await buatPelanggan(admin, "081234567890");
        const baru = await buatPelanggan(admin, "081298765432");
        const { body } = await admin.post("/api/v1/vehicles").send(contohKendaraan(lama));

        const res = await admin
            .patch(`/api/v1/vehicles/${body.data.id}`)
            .send({ customerId: baru });

        expect(res.status).toBe(200);
        expect(res.body.data.customerId).toBe(baru);
    });

    it("mengubah plat menjadi plat milik kendaraan lain ditolak", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);
        const satu = await admin.post("/api/v1/vehicles").send(contohKendaraan(customerId));
        const dua = await admin
            .post("/api/v1/vehicles")
            .send({ ...contohKendaraan(customerId), licensePlate: "AB 5678 ZZ" });

        const res = await admin
            .patch(`/api/v1/vehicles/${dua.body.data.id}`)
            .send({ licensePlate: satu.body.data.licensePlate });

        expect(res.status).toBe(409);
    });

    it("plat sendiri boleh ditulis ulang dengan format berbeda", async () => {
        const admin = await asRole(ROLES.ADMIN);
        const customerId = await buatPelanggan(admin);
        const { body } = await admin.post("/api/v1/vehicles").send(contohKendaraan(customerId));

        const res = await admin
            .patch(`/api/v1/vehicles/${body.data.id}`)
            .send({ licensePlate: "AB-1234-XY" });

        expect(res.status).toBe(200);
        expect(res.body.data.licensePlate).toBe("AB-1234-XY");
    });
});
