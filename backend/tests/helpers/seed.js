import { ROLES } from "../../src/modules/users/user.model.js";
import { asRole } from "./api.js";

// Menyiapkan satu skenario lengkap: admin, mekanik, pelanggan, kendaraan,
// dan satu suku cadang berstok. Dipakai tes service order.
export const seedWorkshop = async ({ initialStock = 10 } = {}) => {
    const admin = await asRole(ROLES.ADMIN);
    const mechanic = await asRole(ROLES.MECHANIC);

    const customerRes = await admin
        .post("/api/v1/customers")
        .send({ name: "Rafif Raihan", phone: "081234567890" });
    const customer = customerRes.body.data;

    const vehicleRes = await admin.post("/api/v1/vehicles").send({
        customerId: customer.id,
        licensePlate: "AB 1234 XY",
        brand: "Honda",
        model: "Vario",
        year: 2020,
    });
    const vehicle = vehicleRes.body.data;

    const partRes = await admin.post("/api/v1/spare-parts").send({
        sku: "BUSI-NGK-01",
        name: "Busi NGK",
        sellingPrice: 25000,
        purchasePrice: 18000,
        initialStock,
        minimumStock: 3,
    });
    const part = partRes.body.data;

    return { admin, mechanic, customer, vehicle, part };
};

export const createOrder = async (admin, { customer, vehicle, ...rest }) => {
    const res = await admin.post("/api/v1/service-orders").send({
        customerId: customer.id,
        vehicleId: vehicle.id,
        complaint: "Mesin sulit menyala",
        ...rest,
    });

    return res.body.data;
};

// Memajukan status sampai target lewat endpoint, satu tahap demi satu tahap.
export const advanceTo = async (client, orderId, target) => {
    const urutan = ["DIPERIKSA", "DIKERJAKAN", "SELESAI", "DIAMBIL"];

    for (const status of urutan) {
        const res = await client.patch(`/api/v1/service-orders/${orderId}/status`).send({ status });
        if (res.status !== 200) throw new Error(`Gagal ke ${status}: ${JSON.stringify(res.body)}`);
        if (status === target) return res.body.data;
    }

    return null;
};
