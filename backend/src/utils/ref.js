import mongoose from "mongoose";

// Mengubah field relasi menjadi bentuk yang konsisten untuk respons API.
//
// - Belum di-populate (ObjectId / string)  -> string id
// - Sudah di-populate (dokumen)            -> { id, ...fields } (allowlist `fields`)
// - Kosong atau dokumen sudah terhapus     -> null
//
// `fields` adalah allowlist: field lain (passwordHash, purchasePrice, dst.)
// tidak pernah ikut walau ikut ter-populate.
export const formatRef = (value, fields = ["name"]) => {
    if (!value) return null;

    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (typeof value === "string") return value;

    if (typeof value === "object") {
        const rawId = value._id ?? value.id;
        if (!rawId) return null;

        const result = { id: rawId.toString() };

        for (const field of fields) {
            if (value[field] !== undefined) result[field] = value[field];
        }

        return result;
    }

    return null;
};
