import mongoose from "mongoose";

export const MOVEMENT_TYPES = Object.freeze({
    IN: "IN", // stok masuk dari supplier
    USAGE: "USAGE", // dipakai pada service order
    ADJUSTMENT: "ADJUSTMENT", // penyesuaian hasil stok opname
    REVERSAL: "REVERSAL", // pembatalan pemakaian, stok dikembalikan
});

// Collection ini bersifat APPEND-ONLY (SPEC 12.6). Koreksi dilakukan dengan
// membuat movement baru bertipe REVERSAL atau ADJUSTMENT, bukan menghapus atau
// mengubah catatan lama. Dengan begitu riwayat stok selalu bisa ditelusuri.
const stockMovementSchema = new mongoose.Schema(
    {
        sparePartId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SparePart",
            required: true,
        },
        serviceOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceOrder",
            default: null,
        },
        type: { type: String, enum: Object.values(MOVEMENT_TYPES), required: true },

        // Selalu positif. Arah pergerakan dibaca dari `type` dan dari selisih
        // stockBefore ke stockAfter.
        quantity: { type: Number, required: true, min: 1 },
        stockBefore: { type: Number, required: true, min: 0 },
        stockAfter: { type: Number, required: true, min: 0 },

        reason: { type: String, required: true, trim: true, maxlength: 300 },
        referenceId: { type: String, trim: true, maxlength: 100, default: null },

        // Mencegah retry dari frontend mengurangi stok dua kali (SPEC 14).
        idempotencyKey: { type: String, default: undefined },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ sparePartId: 1, createdAt: -1 });
stockMovementSchema.index({ serviceOrderId: 1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
