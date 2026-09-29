import mongoose from "mongoose";

// "ab 1234 xy" dan "AB1234XY" harus dianggap plat yang sama.
export const normalizeLicensePlate = (plate) =>
    typeof plate === "string" ? plate.replace(/[\s-]/g, "").toUpperCase() : plate;

const emptyToUndefined = (value) =>
    value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

const vehicleSchema = new mongoose.Schema(
    {
        // Satu kendaraan dimiliki satu pelanggan. Kalau nanti butuh akses
        // bersama (misalnya motor keluarga), tambahkan collection penghubung,
        // jangan menaruh banyak pemilik di sini.
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },
        licensePlate: { type: String, required: true, trim: true, maxlength: 20 },
        licensePlateNormalized: { type: String, required: true },
        brand: { type: String, required: true, trim: true, maxlength: 50 },
        model: { type: String, required: true, trim: true, maxlength: 50 },
        year: { type: Number, min: 1950, max: 2100, set: emptyToUndefined },
        color: { type: String, trim: true, maxlength: 30, set: emptyToUndefined },
        chassisNumber: { type: String, trim: true, maxlength: 50, set: emptyToUndefined },
        engineNumber: { type: String, trim: true, maxlength: 50, set: emptyToUndefined },
    },
    { timestamps: true },
);

vehicleSchema.index({ customerId: 1 });
// Unik secara global. Perpindahan pemilik dilakukan dengan mengubah customerId,
// bukan dengan membuat kendaraan baru berplat sama.
vehicleSchema.index({ licensePlateNormalized: 1 }, { unique: true });

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
