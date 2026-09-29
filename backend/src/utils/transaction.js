import mongoose from "mongoose";

// Menjalankan fn di dalam satu MongoDB transaction: semua berhasil, atau semua
// dibatalkan. Wajib untuk operasi yang menyentuh lebih dari satu
// collection dan harus konsisten, misalnya mengurangi stok sekaligus mencatat
// StockMovement.
//
// Catatan: transaction hanya jalan di replica set. MongoDB Atlas sudah replica
// set, dan tes memakai MongoMemoryReplSet. mongod lokal standalone tidak bisa.
//
// session.withTransaction bisa MENGULANG fn kalau MongoDB melaporkan error
// sementara, jadi fn tidak boleh punya efek samping di luar database.
export const withTransaction = async (fn) => {
    const session = await mongoose.startSession();

    try {
        let result;
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result;
    } finally {
        await session.endSession();
    }
};

// MongoDB memakai kode 11000 untuk pelanggaran unique index.
export const isDuplicateKeyError = (error) => error?.code === 11000;
