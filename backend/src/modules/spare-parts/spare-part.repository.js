import { SparePart } from "./spare-part.model.js";

// Query bertanda (session) ikut dalam transaction pemanggilnya.
export const sparePartRepository = {
    findById: (id, session = null) => SparePart.findById(id).session(session),

    findBySku: (sku) => SparePart.findOne({ sku }),

    list: (filter, { skip, limit }) =>
        SparePart.find(filter).sort({ name: 1 }).skip(skip).limit(limit),

    count: (filter) => SparePart.countDocuments(filter),

    create: (data, session = null) => SparePart.create([data], { session }).then(([doc]) => doc),

    // Menambah stok sekaligus menaikkan version dalam satu operasi atomik.
    increaseStock: (id, quantity, session) =>
        SparePart.findOneAndUpdate(
            { _id: id, isActive: true },
            { $inc: { currentStock: quantity, version: 1 } },
            { returnDocument: "after", session },
        ),

    // Syarat currentStock >= quantity ikut dalam filter, bukan diperiksa
    // terpisah di service. Kalau stok tidak cukup, MongoDB tidak mengubah
    // apa pun dan mengembalikan null (SPEC 14).
    decreaseStock: (id, quantity, session) =>
        SparePart.findOneAndUpdate(
            { _id: id, isActive: true, currentStock: { $gte: quantity } },
            { $inc: { currentStock: -quantity, version: 1 } },
            { returnDocument: "after", session },
        ),

    // Dipakai REVERSAL: mengembalikan stok tanpa syarat part masih aktif,
    // karena pembatalan harus tetap bisa dilakukan untuk part yang sudah
    // dinonaktifkan.
    returnStock: (id, quantity, session) =>
        SparePart.findOneAndUpdate(
            { _id: id },
            { $inc: { currentStock: quantity, version: 1 } },
            { returnDocument: "after", session },
        ),

    // currentStock <= minimumStock. Perbandingan antar-field butuh $expr.
    lowStockFilter: () => ({
        isActive: true,
        $expr: { $lte: ["$currentStock", "$minimumStock"] },
    }),
};
