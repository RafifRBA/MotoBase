import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { isDuplicateKeyError, withTransaction } from "../../utils/transaction.js";
import { env } from "../../config/env.js";
import { MOVEMENT_TYPES } from "../stock-movements/stock-movement.model.js";
import { stockMovementRepository } from "../stock-movements/stock-movement.repository.js";
import { sparePartRepository } from "./spare-part.repository.js";

const notFound = () => new ApiError(404, "SPARE_PART_NOT_FOUND", "Suku cadang tidak ditemukan");

const insufficientStock = (part, requested) =>
    new ApiError(
        409,
        "INSUFFICIENT_STOCK",
        `Stok ${part.name} tidak mencukupi. Tersedia ${part.currentStock} ${part.unit}, diminta ${requested}`,
    );

export const getSparePartById = async (id) => {
    const part = await sparePartRepository.findById(id);
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
    if (query.lowStock === "true") Object.assign(filter, sparePartRepository.lowStockFilter());

    const [parts, total] = await Promise.all([
        sparePartRepository.list(filter, { skip: toSkip(query), limit: query.limit }),
        sparePartRepository.count(filter),
    ]);

    return { parts, meta: buildMeta({ ...query, total }) };
};

export const listLowStock = async () => {
    const filter = sparePartRepository.lowStockFilter();
    const [parts, total] = await Promise.all([
        sparePartRepository.list(filter, { skip: 0, limit: 100 }),
        sparePartRepository.count(filter),
    ]);

    return { parts, total };
};

export const createSparePart = async (data, actor) => {
    const { initialStock, minimumStock, ...rest } = data;
    const sku = rest.sku.toUpperCase();

    if (await sparePartRepository.findBySku(sku)) {
        throw new ApiError(409, "SKU_ALREADY_USED", "SKU sudah dipakai suku cadang lain");
    }

    // Stok awal dan catatan pergerakannya harus tercipta bersama-sama.
    return withTransaction(async (session) => {
        const part = await sparePartRepository.create(
            {
                ...rest,
                sku,
                currentStock: initialStock,
                minimumStock: minimumStock ?? env.LOW_STOCK_DEFAULT,
            },
            session,
        );

        if (initialStock > 0) {
            await stockMovementRepository.create(
                {
                    sparePartId: part._id,
                    type: MOVEMENT_TYPES.IN,
                    quantity: initialStock,
                    stockBefore: 0,
                    stockAfter: initialStock,
                    reason: "Stok awal saat pendaftaran suku cadang",
                    createdBy: actor._id,
                },
                session,
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
// retry karena koneksi putus), movement lama dikembalikan apa adanya dan stok
// TIDAK berubah dua kali (SPEC 14).
const findIdempotentResult = async (idempotencyKey) => {
    if (!idempotencyKey) return null;

    const existing = await stockMovementRepository.findByIdempotencyKey(idempotencyKey);
    if (!existing) return null;

    const part = await sparePartRepository.findById(existing.sparePartId);
    return { part, movement: existing, replayed: true };
};

export const stockIn = async (id, { quantity, reason, referenceId }, actor, idempotencyKey) => {
    const replayed = await findIdempotentResult(idempotencyKey);
    if (replayed) return replayed;

    try {
        return await withTransaction(async (session) => {
            const part = await sparePartRepository.increaseStock(id, quantity, session);

            if (!part) {
                // Bisa karena id tidak ada, atau karena part sudah nonaktif.
                const existing = await sparePartRepository.findById(id, session);
                if (!existing) throw notFound();
                throw new ApiError(
                    409,
                    "SPARE_PART_INACTIVE",
                    "Suku cadang nonaktif, aktifkan dulu sebelum menambah stok",
                );
            }

            const movement = await stockMovementRepository.create(
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
                session,
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
                ? await sparePartRepository.returnStock(id, amount, session)
                : await sparePartRepository.decreaseStock(id, amount, session);

            if (!part) {
                const existing = await sparePartRepository.findById(id, session);
                if (!existing) throw notFound();
                if (!existing.isActive) {
                    throw new ApiError(409, "SPARE_PART_INACTIVE", "Suku cadang nonaktif");
                }
                // Satu-satunya kemungkinan tersisa: stok tidak cukup.
                throw insufficientStock(existing, amount);
            }

            const movement = await stockMovementRepository.create(
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
                session,
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
