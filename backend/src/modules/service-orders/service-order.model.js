import mongoose from "mongoose";

import { ORDER_STATUS } from "./service-order.status.js";

export const PAYMENT_STATUS = Object.freeze({
    BELUM_DIBAYAR: "BELUM_DIBAYAR",
    DIBAYAR: "DIBAYAR",
});

export const PAYMENT_METHODS = Object.freeze(["TUNAI", "TRANSFER", "QRIS"]);

// Riwayat status yang ditampilkan ke pelanggan. Berbeda dari
// audit log internal: tidak memuat catatan internal mekanik.
const statusHistorySchema = new mongoose.Schema(
    {
        from: { type: String, enum: Object.values(ORDER_STATUS), default: null },
        to: { type: String, enum: Object.values(ORDER_STATUS), required: true },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        note: { type: String, trim: true, maxlength: 300, default: null },
        // true kalau ini koreksi mundur yang dilakukan admin.
        isCorrection: { type: Boolean, default: false },
    },
    { _id: true },
);

// Harga dan nama disalin saat pemakaian dicatat (snapshot). Kalau harga part
// berubah bulan depan, struk servis lama tidak ikut berubah.
const usedPartSchema = new mongoose.Schema(
    {
        sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: "SparePart", required: true },
        sku: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
        movementId: { type: mongoose.Schema.Types.ObjectId, ref: "StockMovement", required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
    },
    { _id: true },
);

const serviceOrderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, required: true }, // contoh: SRV-20260926-0012
        queueNumber: { type: Number, required: true, min: 1 },
        // Tanggal tanpa jam (00:00 waktu lokal), dipakai untuk reset antrean harian.
        serviceDate: { type: Date, required: true },

        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
        assignedMechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

        complaint: { type: String, required: true, trim: true, maxlength: 1000 },
        diagnosis: { type: String, trim: true, maxlength: 1000, default: null },
        // Tidak pernah keluar lewat endpoint publik.
        internalNotes: { type: String, trim: true, maxlength: 1000, default: null },

        currentStatus: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            required: true,
            default: ORDER_STATUS.ANTRE,
        },

        // Semua nilai uang berupa integer rupiah.
        serviceCost: { type: Number, required: true, min: 0, default: 0 },
        partsSubtotal: { type: Number, required: true, min: 0, default: 0 },
        grandTotal: { type: Number, required: true, min: 0, default: 0 },

        paymentStatus: {
            type: String,
            enum: Object.values(PAYMENT_STATUS),
            default: PAYMENT_STATUS.BELUM_DIBAYAR,
        },
        paymentMethod: { type: String, enum: PAYMENT_METHODS, default: null },
        paidAt: { type: Date, default: null },
        paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

        // Token mentah tidak pernah disimpan.
        trackingTokenHash: { type: String, default: undefined },
        trackingExpiresAt: { type: Date, default: null },
        trackingRevokedAt: { type: Date, default: null },

        statusHistory: { type: [statusHistorySchema], default: [] },
        usedParts: { type: [usedPartSchema], default: [] },

        completedAt: { type: Date, default: null },
        pickedUpAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true },
);

serviceOrderSchema.index({ orderNumber: 1 }, { unique: true });
// Nomor antrean unik per hari; dijamin counter atomik, index ini jaring pengaman.
serviceOrderSchema.index({ serviceDate: 1, queueNumber: 1 }, { unique: true });
serviceOrderSchema.index({ customerId: 1, createdAt: -1 });
serviceOrderSchema.index({ vehicleId: 1, createdAt: -1 });
serviceOrderSchema.index({ assignedMechanicId: 1, currentStatus: 1 });
serviceOrderSchema.index({ currentStatus: 1, serviceDate: -1 });
serviceOrderSchema.index({ trackingTokenHash: 1 }, { unique: true, sparse: true });

export const ServiceOrder = mongoose.model("ServiceOrder", serviceOrderSchema);
