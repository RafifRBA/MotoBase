import mongoose from "mongoose";

const emptyToUndefined = (value) =>
    value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

const customerSchema = new mongoose.Schema(
    {
        // Pelanggan bisa dibuat admin sebelum punya akun (SPEC 8), jadi userId
        // opsional. Diisi saat pelanggan mendaftar dan kepemilikannya terbukti.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            set: emptyToUndefined,
        },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        // Selalu disimpan dalam format 62xxxxxxxxxx.
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true, set: emptyToUndefined },
        address: { type: String, trim: true, maxlength: 500, set: emptyToUndefined },
        notes: { type: String, trim: true, maxlength: 1000, set: emptyToUndefined },
    },
    { timestamps: true },
);

customerSchema.index({ userId: 1 }, { unique: true, sparse: true });
// Nomor telepon dibuat unik supaya penghubungan akun di Tahap 7 tidak ambigu.
customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });

export const Customer = mongoose.model("Customer", customerSchema);
