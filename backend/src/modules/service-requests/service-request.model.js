import mongoose from "mongoose";

export const REQUEST_STATUS = Object.freeze({
    MENUNGGU_VERIFIKASI: "MENUNGGU_VERIFIKASI",
    DITERIMA: "DITERIMA",
    DITOLAK: "DITOLAK",
});

// Pengajuan servis dari pelanggan. Sengaja BUKAN service order: antrean,
// laporan, dan dashboard staf tidak tercemar permintaan yang belum diverifikasi.
// Order asli baru dibuat ketika admin menerima pengajuan.
const serviceRequestSchema = new mongoose.Schema(
    {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
        complaint: { type: String, required: true, trim: true, maxlength: 1000 },
        // Tanggal yang diminta pelanggan. Hanya permintaan, bukan jadwal pasti.
        serviceDate: { type: Date, required: true },

        status: {
            type: String,
            enum: Object.values(REQUEST_STATUS),
            default: REQUEST_STATUS.MENUNGGU_VERIFIKASI,
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        // Alasan dari admin; terlihat oleh pelanggan.
        reviewNote: { type: String, trim: true, maxlength: 300, default: null },
        // Terisi kalau pengajuan diterima.
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceOrder", default: null },
    },
    { timestamps: true },
);

serviceRequestSchema.index({ status: 1, createdAt: -1 });
serviceRequestSchema.index({ customerId: 1, createdAt: -1 });

export const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
