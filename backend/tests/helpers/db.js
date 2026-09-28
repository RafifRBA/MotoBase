import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Replica set (bukan server biasa) karena transaction MongoDB hanya jalan di
// replica set, dan mulai Tahap 4 pemakaian suku cadang membutuhkannya.
let replSet;

export const connectTestDB = async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri("motobase-test"));
    // Index (unique, sparse, TTL) tidak otomatis siap saat koneksi dibuat.
    await mongoose.connection.syncIndexes();
};

export const clearTestDB = async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
};

export const disconnectTestDB = async () => {
    await mongoose.disconnect();
    await replSet?.stop();
};
