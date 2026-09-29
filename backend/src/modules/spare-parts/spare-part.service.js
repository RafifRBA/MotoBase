import { env } from "../../config/env.js";
import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { isDuplicateKeyError, withTransaction } from "../../utils/transaction.js";
import { MOVEMENT_TYPES, StockMovement } from "../stock-movements/stock-movement.model.js";
import { SparePart } from "./spare-part.model.js";

const notFound = () => new ApiError(404, "SPARE_PART_NOT_FOUND", "Suku cadang tidak ditemukan");

const insufficientStock = (part, requested) =>
    new ApiError(
        409,
        "INSUFFICIENT_STOCK",
        `Stok ${part.name} tidak mencukupi. Tersedia ${part.currentStock} ${part.unit}, diminta ${requested}`,
    );

// currentStock <= minimumStock. Perbandingan antar-field butuh $expr.
export const lowStockFilter = () => ({
    isActive: true,
    $expr: { $lte: ["$currentStock", "$minimumStock"] },
});

// Syarat "stok cukup" menyatu dengan operasi pengurangan, jadi MongoDB tidak
// mengubah apa pun kalau stoknya kurang dan stok tidak mungkin jadi negatif.
export const decreaseStock = (id, quantity, session) =>
    SparePart.findOneAndUpdate(
        { _id: id, isActive: true, currentStock: { $gte: quantity } },
        { $inc: { currentStock: -quantity, version: 1 } },
        { returnDocument: "after", session },
    );

const increaseStock = (id, quantity, session) =>
    SparePart.findOneAndUpdate(
        { _id: id, isActive: true },
        { $inc: { currentStock: quantity, version: 1 } },
        { returnDocument: "after", session },
    );

// Tanpa syarat isActive: pengembalian stok harus tetap bisa dilakukan untuk
// suku cadang yang sudah dinonaktifkan sejak dipakai.
export const returnStock = (id, quantity, session) =>
    SparePart.findOneAndUpdate(
        { _id: id },
        { $inc: { currentStock: quantity, version: 1 } },
        { returnDocument: "after", session },
    );

export const getSparePartById = async (id) => {
    const part = await SparePart.findById(id);
    if (!part) throw notFound();
    return part;
};

export const listSpareParts = async (query) => {
    const filter = {};
    if (query.search) {
        const pattern = new RegExp(escapeRegExp(query.search), "i");
        filter.$or = [{ name: pattern }, { sku: pattern }];
    }
    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
    if (query.lowStock === "true") Object.assign(filter, lowStockFilter());

    const [parts, total] = await Promise.all([
        SparePart.find(filter).sort({ name: 1 }).skip(toSkip(query)).limit(query.limit),
        SparePart.countDocuments(filter),
    ]);

    return { parts, meta: buildMeta({ ...query, total }) };
};

export const listLowStock = async () => {
    const filter = lowStockFilter();
    const [parts, total] = await Promise.all([
        SparePart.find(filter).sort({ name: 1 }).limit(100),
        SparePart.countDocuments(filter),
    ]);

    return { parts, total };
};

export const createSparePart = async (data, actor) => {
    const { initialStock, minimumStock, ...rest } = data;
    const sku = rest.sku.toUpperCase();

    if (await SparePart.findOne({ sku })) {
        throw new ApiError(409, "SKU_ALREADY_USED", "SKU sudah dipakai suku cadang lain");
    }

    // Stok awal dan catatan pergerakannya harus tercipta bersama-sama.
    return withTransaction(async (session) => {
        const [part] = await SparePart.create(
            [
                {
                    ...rest,
                    sku,
                    currentStock: initialStock,
                    minimumStock: minimumStock ?? env.LOW_STOCK_DEFAULT,
                },
            ],
            { session },
        );

        if (initialStock > 0) {
            await StockMovement.create(
                [
                    {
                        sparePartId: part._id,
                        type: MOVEMENT_TYPES.IN,
                        quantity: initialStock,
                        stockBefore: 0,
                        stockAfter: initialStock,
                        reason: "Stok awal saat pendaftaran suku cadang",
                        createdBy: actor._id,
                    },
                ],
                { session },
            );
        }

        logger.info({ actorId: actor.id, sparePartId: part.id, sku }, "Suku cadang dibuat");
        return part;
    });
};

export const updateSparePart = async (id, data, actor) => {
    const part = await getSparePartById(id);

    Object.assign(part, data);
    await part.save();

    logger.info({ actorId: actor.id, sparePartId: part.id }, "Suku cadang diperbarui");
    return part;
};

// Kalau request dengan idempotencyKey yang sama diulang (misalnya frontend
// retry karena koneksi putus), hasil yang lama dikembalikan apa adanya dan stok
// tidak berubah dua kali.
const findIdempotentResult = async (idempotencyKey) => {
    if (!idempotencyKey) return null;

    const existing = await StockMovement.findOne({ idempotencyKey });
    if (!existing) return null;

    return {
        part: await SparePart.findById(existing.sparePartId),
        movement: existing,
        replayed: true,
    };
};

export const stockIn = async (id, { quantity, reason, referenceId }, actor, idempotencyKey) => {
    const replayed = await findIdempotentResult(idempotencyKey);
    if (replayed) return replayed;

    try {
        return await withTransaction(async (session) => {
            const part = await increaseStock(id, quantity, session);

            if (!part) {
                // Bisa karena id tidak ada, atau karena part sudah nonaktif.
                const existing = await SparePart.findById(id).session(session);
                if (!existing) throw notFound();
                throw new ApiError(
                    409,
                    "SPARE_PART_INACTIVE",
                    "Suku cadang nonaktif, aktifkan dulu sebelum menambah stok",
                );
            }

            const [movement] = await StockMovement.create(
                [
                    {
                        sparePartId: part._id,
                        type: MOVEMENT_TYPES.IN,
                        quantity,
                        stockBefore: part.currentStock - quantity,
                        stockAfter: part.currentStock,
                        reason,
                        referenceId: referenceId ?? null,
                        idempotencyKey,
                        createdBy: actor._id,
                    },
                ],
                { session },
            );

            logger.info(
                {
                    actorId: actor.id,
                    sparePartId: part.id,
                    quantity,
                    stockAfter: part.currentStock,
                },
                "Stok masuk dicatat",
            );

            return { part, movement, replayed: false };
        });
    } catch (error) {
        // Dua request dengan key sama tiba nyaris bersamaan: yang kalah balapan
        // kena unique index, lalu membaca hasil yang sudah dibuat pemenangnya.
        if (isDuplicateKeyError(error)) {
            const result = await findIdempotentResult(idempotencyKey);
            if (result) return result;
        }
        throw error;
    }
};

export const adjustStock = async (id, { quantity, reason }, actor, idempotencyKey) => {
    const replayed = await findIdempotentResult(idempotencyKey);
    if (replayed) return replayed;

    const isIncrease = quantity > 0;
    const amount = Math.abs(quantity);

    try {
        return await withTransaction(async (session) => {
            const part = isIncrease
                ? await returnStock(id, amount, session)
                : await decreaseStock(id, amount, session);

            if (!part) {
                const existing = await SparePart.findById(id).session(session);
                if (!existing) throw notFound();
                if (!existing.isActive) {
                    throw new ApiError(409, "SPARE_PART_INACTIVE", "Suku cadang nonaktif");
                }
                // Satu-satunya kemungkinan tersisa: stok tidak cukup.
                throw insufficientStock(existing, amount);
            }

            const [movement] = await StockMovement.create(
                [
                    {
                        sparePartId: part._id,
                        type: MOVEMENT_TYPES.ADJUSTMENT,
                        quantity: amount,
                        stockBefore: isIncrease
                            ? part.currentStock - amount
                            : part.currentStock + amount,
                        stockAfter: part.currentStock,
                        reason,
                        idempotencyKey,
                        createdBy: actor._id,
                    },
                ],
                { session },
            );

            logger.info(
                {
                    actorId: actor.id,
                    sparePartId: part.id,
                    quantity,
                    stockAfter: part.currentStock,
                },
                "Penyesuaian stok dicatat",
            );

            return { part, movement, replayed: false };
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            const result = await findIdempotentResult(idempotencyKey);
            if (result) return result;
        }
        throw error;
    }
};
