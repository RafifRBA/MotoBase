import { maskLicensePlate, maskName, publicFirstName } from "../../utils/mask.js";

// DTO publik untuk halaman tracking tanpa login (SPEC 17).
//
// Dibentuk lewat mapper khusus, BUKAN dengan mengirim dokumen Mongoose lalu
// menghapus field satu per satu (SPEC 17). Dengan allowlist seperti ini, field
// baru di model tidak pernah ikut bocor tanpa sengaja.
//
// Yang sengaja TIDAK ada di sini (SPEC 10.2): nomor telepon, alamat, email,
// harga modal, catatan internal, audit log, id internal, dan data stok.
export const toPublicTrackingResponse = ({ order, customer, vehicle, mechanic }) => ({
    orderNumber: order.orderNumber,
    queueNumber: order.queueNumber,
    serviceDate: order.serviceDate,

    vehicle: {
        licensePlate: maskLicensePlate(vehicle?.licensePlate ?? ""),
        brand: vehicle?.brand ?? null,
        model: vehicle?.model ?? null,
    },

    customerName: maskName(customer?.name ?? ""),
    complaint: order.complaint,
    currentStatus: order.currentStatus,

    mechanic: mechanic ? { name: publicFirstName(mechanic.name) } : null,

    // Timeline publik: hanya status dan waktunya. Tidak ada actor, tidak ada
    // catatan internal, dan koreksi administratif tidak ditampilkan.
    statusHistory: order.statusHistory
        .filter((entry) => !entry.isCorrection)
        .map((entry) => ({ status: entry.to, timestamp: entry.changedAt })),

    usedSpareParts: order.usedParts.map((part) => ({
        name: part.name,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        subtotal: part.subtotal,
    })),

    serviceCost: order.serviceCost,
    grandTotal: order.grandTotal,
    paymentStatus: order.paymentStatus,

    completedAt: order.completedAt ?? null,
    pickedUpAt: order.pickedUpAt ?? null,
    isReadyForPickup: order.currentStatus === "SELESAI",
});
