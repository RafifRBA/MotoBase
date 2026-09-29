import mongoose from "mongoose";

const emptyToUndefined = (value) =>
    value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

const customerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        // Selalu disimpan dalam format 62xxxxxxxxxx.
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true, set: emptyToUndefined },
        address: { type: String, trim: true, maxlength: 500, set: emptyToUndefined },
        notes: { type: String, trim: true, maxlength: 1000, set: emptyToUndefined },
    },
    { timestamps: true },
);

// Nomor telepon unik: dipakai admin untuk mencari pelanggan lama dengan cepat
// dan mencegah data pelanggan yang sama terinput dua kali.
customerSchema.index({ phone: 1 }, { unique: true });
customerSchema.index({ name: 1 });

export const Customer = mongoose.model("Customer", customerSchema);
