import mongoose from "mongoose";

// Penomoran urut yang aman terhadap dua request bersamaan (SPEC 13).
// JANGAN memakai countDocuments() + 1: dua request bisa membaca angka yang sama
// lalu menghasilkan nomor kembar.
const counterSchema = new mongoose.Schema(
    {
        // Contoh _id: "service-order:20260926" — satu counter per hari, sehingga
        // nomor antrean otomatis mulai dari 1 lagi setiap hari.
        _id: { type: String },
        seq: { type: Number, default: 0 },
    },
    { versionKey: false },
);

export const Counter = mongoose.model("Counter", counterSchema);

// $inc + upsert dijalankan MongoDB sebagai satu operasi yang tidak bisa disela,
// jadi dua request yang datang bersamaan pasti mendapat angka berbeda.
export const nextSequence = async (key, session = null) => {
    const counter = await Counter.findByIdAndUpdate(
        key,
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after", session },
    );

    return counter.seq;
};
