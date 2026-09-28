import mongoose from "mongoose";

const emptyToUndefined = (value) =>
    value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;

const sparePartSchema = new mongoose.Schema(
    {
        sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
        name: { type: String, required: true, trim: true, maxlength: 150 },
        category: { type: String, trim: true, maxlength: 50, set: emptyToUndefined },

        // Nilai uang disimpan sebagai INTEGER rupiah (SPEC 12.4): 75000, bukan
        // 75000.00. Bilangan pecahan biner tidak bisa menyimpan nilai desimal
        // dengan tepat, dan kesalahan sepersekian rupiah akan menumpuk di total.
        sellingPrice: { type: Number, required: true, min: 0 },
        purchasePrice: { type: Number, required: true, min: 0 },

        currentStock: { type: Number, required: true, min: 0, default: 0 },
        minimumStock: { type: Number, required: true, min: 0, default: 0 },
        unit: { type: String, required: true, trim: true, maxlength: 20, default: "pcs" },
        isActive: { type: Boolean, default: true },

        // Bertambah setiap kali stok berubah. Berguna untuk optimistic
        // concurrency control dan untuk melacak seberapa sering part bergerak.
        version: { type: Number, default: 0 },
    },
    { timestamps: true },
);

sparePartSchema.index({ sku: 1 }, { unique: true });
sparePartSchema.index({ name: 1 });
sparePartSchema.index({ isActive: 1, category: 1 });

export const SparePart = mongoose.model("SparePart", sparePartSchema);
