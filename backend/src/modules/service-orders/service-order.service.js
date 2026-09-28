import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { generateTrackingToken } from "../../utils/tracking-token.js";
import { isDuplicateKeyError, withTransaction } from "../../utils/transaction.js";
import { getCustomerById } from "../customers/customer.service.js";
import { MOVEMENT_TYPES } from "../stock-movements/stock-movement.model.js";
import { stockMovementRepository } from "../stock-movements/stock-movement.repository.js";
import { sparePartRepository } from "../spare-parts/spare-part.repository.js";
import { ROLES } from "../users/user.model.js";
import { userRepository } from "../users/user.repository.js";
import { vehicleRepository } from "../vehicles/vehicle.repository.js";
import { nextSequence } from "./counter.model.js";
import { PAYMENT_STATUS, ServiceOrder } from "./service-order.model.js";
import { serviceOrderRepository } from "./service-order.repository.js";
import {
    ORDER_STATUS,
    STATUSES_ALLOWING_PART_USAGE,
    isFinal,
    validateTransition,
} from "./service-order.status.js";

const notFound = () =>
    new ApiError(404, "SERVICE_ORDER_NOT_FOUND", "Service order tidak ditemukan");

// Tanggal tanpa jam, dipakai sebagai kunci antrean harian.
const startOfDay = (date = new Date()) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dateKey = (date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

// Total selalu dihitung ulang di backend (SPEC 29 poin 7), tidak pernah
// dipercaya dari frontend.
const recalculateTotals = (order) => {
    order.partsSubtotal = order.usedParts.reduce((sum, part) => sum + part.subtotal, 0);
    order.grandTotal = order.serviceCost + order.partsSubtotal;
};

const appendStatus = (order, to, actor, { note = null, isCorrection = false } = {}) => {
    order.statusHistory.push({
        from: order.currentStatus ?? null,
        to,
        changedBy: actor._id,
        changedAt: new Date(),
        note,
        isCorrection,
    });
    order.currentStatus = to;
};

// Mekanik hanya boleh menyentuh order yang ditugaskan kepadanya (SPEC 27 poin 2).
const assertCanModify = (order, actor) => {
    if (actor.role === ROLES.MECHANIC) {
        if (!order.assignedMechanicId || !order.assignedMechanicId.equals(actor._id)) {
            throw new ApiError(
                403,
                "NOT_ASSIGNED_MECHANIC",
                "Anda hanya bisa mengubah servis yang ditugaskan kepada Anda",
            );
        }
        return;
    }

    if (![ROLES.ADMIN, ROLES.OWNER].includes(actor.role)) {
        throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk aksi ini");
    }
};

export const getOrderById = async (id, session = null) => {
    const order = await serviceOrderRepository.findById(id, session);
    if (!order) throw notFound();
    return order;
};

export const listOrders = async (query, actor) => {
    const filter = {};

    if (query.status) filter.currentStatus = query.status;
    if (query.customerId) filter.customerId = query.customerId;
    if (query.vehicleId) filter.vehicleId = query.vehicleId;
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.search) filter.orderNumber = new RegExp(escapeRegExp(query.search), "i");

    if (query.startDate || query.endDate) {
        filter.serviceDate = {};
        if (query.startDate) filter.serviceDate.$gte = query.startDate;
        if (query.endDate) filter.serviceDate.$lte = query.endDate;
    }

    // Mekanik hanya melihat pekerjaannya sendiri (SPEC 6.1: "terbatas").
    if (actor.role === ROLES.MECHANIC) {
        filter.assignedMechanicId = actor._id;
    } else if (query.assignedMechanicId) {
        filter.assignedMechanicId = query.assignedMechanicId;
    }

    const [orders, total] = await Promise.all([
        serviceOrderRepository.list(filter, { skip: toSkip(query), limit: query.limit }),
        serviceOrderRepository.count(filter),
    ]);

    return { orders, meta: buildMeta({ ...query, total }) };
};

const findMechanic = async (mechanicId) => {
    const mechanic = await userRepository.findById(mechanicId);
    if (!mechanic || mechanic.role !== ROLES.MECHANIC) {
        throw new ApiError(404, "MECHANIC_NOT_FOUND", "Mekanik tidak ditemukan");
    }
    if (!mechanic.isActive) {
        throw new ApiError(409, "MECHANIC_INACTIVE", "Mekanik tersebut sudah tidak aktif");
    }
    return mechanic;
};

export const createOrder = async (data, actor) => {
    const customer = await getCustomerById(data.customerId);

    const vehicle = await vehicleRepository.findById(data.vehicleId);
    if (!vehicle) throw new ApiError(404, "VEHICLE_NOT_FOUND", "Kendaraan tidak ditemukan");

    // Mencegah servis tercatat atas nama pelanggan yang bukan pemilik kendaraan.
    if (!vehicle.customerId.equals(customer._id)) {
        throw new ApiError(
            409,
            "VEHICLE_NOT_OWNED_BY_CUSTOMER",
            "Kendaraan tersebut bukan milik pelanggan yang dipilih",
        );
    }

    if (data.assignedMechanicId) await findMechanic(data.assignedMechanicId);

    const serviceDate = startOfDay();
    const tracking = generateTrackingToken();

    const order = await withTransaction(async (session) => {
        const queueNumber = await nextSequence(`service-order:${dateKey(serviceDate)}`, session);
        const orderNumber = `SRV-${dateKey(serviceDate)}-${String(queueNumber).padStart(4, "0")}`;

        const created = await serviceOrderRepository.create(
            {
                orderNumber,
                queueNumber,
                serviceDate,
                customerId: customer._id,
                vehicleId: vehicle._id,
                assignedMechanicId: data.assignedMechanicId ?? null,
                complaint: data.complaint,
                internalNotes: data.internalNotes ?? null,
                serviceCost: data.serviceCost,
                grandTotal: data.serviceCost,
                currentStatus: ORDER_STATUS.ANTRE,
                trackingTokenHash: tracking.tokenHash,
                trackingExpiresAt: tracking.expiresAt,
                statusHistory: [
                    {
                        from: null,
                        to: ORDER_STATUS.ANTRE,
                        changedBy: actor._id,
                        changedAt: new Date(),
                    },
                ],
                createdBy: actor._id,
            },
            session,
        );

        return created;
    });

    logger.info(
        { actorId: actor.id, orderId: order.id, orderNumber: order.orderNumber },
        "Service order dibuat",
    );

    // Token mentah hanya dikembalikan sekali, di sini. Setelah ini hanya
    // hash-nya yang tersimpan (SPEC 9).
    return { order, trackingToken: tracking.token };
};

export const updateOrder = async (id, data, actor) => {
    const order = await getOrderById(id);
    assertCanModify(order, actor);

    if (isFinal(order.currentStatus)) {
        throw new ApiError(
            409,
            "ORDER_ALREADY_CLOSED",
            `Service order sudah ${order.currentStatus} dan tidak bisa diubah lagi`,
        );
    }

    // Mekanik boleh mengisi diagnosis dan catatan, tapi bukan biaya jasa.
    if (actor.role === ROLES.MECHANIC && data.serviceCost !== undefined) {
        throw new ApiError(403, "FORBIDDEN", "Biaya jasa hanya bisa diubah admin");
    }

    Object.assign(order, data);
    recalculateTotals(order);
    await order.save();

    logger.info({ actorId: actor.id, orderId: order.id }, "Service order diperbarui");
    return order;
};

export const assignMechanic = async (id, mechanicId, actor) => {
    const order = await getOrderById(id);

    if (isFinal(order.currentStatus)) {
        throw new ApiError(409, "ORDER_ALREADY_CLOSED", "Service order sudah ditutup");
    }

    if (mechanicId) await findMechanic(mechanicId);
    order.assignedMechanicId = mechanicId;
    await order.save();

    logger.info({ actorId: actor.id, orderId: order.id, mechanicId }, "Penugasan mekanik diubah");
    return order;
};

export const changeStatus = async (id, { status, note, isCorrection }, actor) => {
    const order = await getOrderById(id);
    assertCanModify(order, actor);

    if (isCorrection) {
        // Koreksi mundur adalah aksi khusus milik admin, dan selalu tercatat
        // sebagai koreksi di history (SPEC 11).
        if (actor.role !== ROLES.ADMIN) {
            throw new ApiError(403, "FORBIDDEN", "Koreksi status hanya bisa dilakukan admin");
        }
        if (!note) {
            throw new ApiError(400, "CORRECTION_NOTE_REQUIRED", "Koreksi status wajib beralasan");
        }
    } else {
        const error = validateTransition(order.currentStatus, status);
        if (error) throw error;
    }

    const previousStatus = order.currentStatus;
    appendStatus(order, status, actor, { note: note ?? null, isCorrection });

    if (status === ORDER_STATUS.SELESAI) order.completedAt = new Date();
    if (status === ORDER_STATUS.DIAMBIL) order.pickedUpAt = new Date();
    if (status === ORDER_STATUS.DIBATALKAN) order.cancelledAt = new Date();

    await order.save();

    logger.info(
        { actorId: actor.id, orderId: order.id, from: previousStatus, to: status, isCorrection },
        "Status service order berubah",
    );

    // Titik pemasangan notifikasi "motor siap diambil" (SPEC 22). Sengaja
    // dipanggil setelah database berhasil disimpan, dan kegagalan notifikasi
    // tidak boleh membatalkan perubahan status.
    return order;
};

export const addPartUsage = async (id, { sparePartId, quantity }, actor, idempotencyKey) => {
    if (idempotencyKey) {
        const existing = await stockMovementRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) return { order: await getOrderById(id), replayed: true };
    }

    try {
        const order = await withTransaction(async (session) => {
            const current = await getOrderById(id, session);
            assertCanModify(current, actor);

            if (!STATUSES_ALLOWING_PART_USAGE.includes(current.currentStatus)) {
                throw new ApiError(
                    409,
                    "INVALID_STATUS_FOR_PART_USAGE",
                    `Suku cadang hanya bisa dicatat saat status DIPERIKSA atau DIKERJAKAN, sekarang ${current.currentStatus}`,
                );
            }

            // Filter "stok cukup" menyatu dengan operasi pengurangan, jadi stok
            // tidak mungkin menjadi negatif (SPEC 14).
            const part = await sparePartRepository.decreaseStock(sparePartId, quantity, session);

            if (!part) {
                const existing = await sparePartRepository.findById(sparePartId, session);
                if (!existing) {
                    throw new ApiError(404, "SPARE_PART_NOT_FOUND", "Suku cadang tidak ditemukan");
                }
                if (!existing.isActive) {
                    throw new ApiError(409, "SPARE_PART_INACTIVE", "Suku cadang nonaktif");
                }
                throw new ApiError(
                    409,
                    "INSUFFICIENT_STOCK",
                    `Stok ${existing.name} tidak mencukupi. Tersedia ${existing.currentStock} ${existing.unit}, diminta ${quantity}`,
                );
            }

            const movement = await stockMovementRepository.create(
                {
                    sparePartId: part._id,
                    serviceOrderId: current._id,
                    type: MOVEMENT_TYPES.USAGE,
                    quantity,
                    stockBefore: part.currentStock + quantity,
                    stockAfter: part.currentStock,
                    reason: `Dipakai pada ${current.orderNumber}`,
                    referenceId: current.orderNumber,
                    idempotencyKey,
                    createdBy: actor._id,
                },
                session,
            );

            // Harga disalin saat ini juga, supaya perubahan harga di kemudian
            // hari tidak mengubah total servis yang sudah berjalan.
            current.usedParts.push({
                sparePartId: part._id,
                sku: part.sku,
                name: part.name,
                quantity,
                unitPrice: part.sellingPrice,
                subtotal: part.sellingPrice * quantity,
                movementId: movement._id,
                addedBy: actor._id,
                addedAt: new Date(),
            });

            recalculateTotals(current);
            await current.save({ session });

            logger.info(
                { actorId: actor.id, orderId: current.id, sparePartId, quantity },
                "Pemakaian suku cadang dicatat",
            );

            return current;
        });

        const part = await sparePartRepository.findById(sparePartId);
        return {
            order,
            replayed: false,
            isLowStock: part ? part.currentStock <= part.minimumStock : false,
        };
    } catch (error) {
        if (isDuplicateKeyError(error) && idempotencyKey) {
            return { order: await getOrderById(id), replayed: true };
        }
        throw error;
    }
};

export const removePartUsage = async (id, usageId, { reason }, actor) => {
    return withTransaction(async (session) => {
        const order = await getOrderById(id, session);
        assertCanModify(order, actor);

        if (isFinal(order.currentStatus)) {
            throw new ApiError(
                409,
                "ORDER_ALREADY_CLOSED",
                "Service order sudah ditutup, pemakaian suku cadang tidak bisa dibatalkan",
            );
        }

        const usage = order.usedParts.id(usageId);
        if (!usage) {
            throw new ApiError(
                404,
                "PART_USAGE_NOT_FOUND",
                "Catatan pemakaian suku cadang tidak ditemukan",
            );
        }

        // Stok dikembalikan tanpa syarat isActive: pembatalan harus tetap bisa
        // dilakukan walaupun part sudah dinonaktifkan sejak dipakai.
        const part = await sparePartRepository.returnStock(
            usage.sparePartId,
            usage.quantity,
            session,
        );

        // StockMovement bersifat append-only: catatan lama tidak dihapus,
        // melainkan diimbangi movement baru bertipe REVERSAL (SPEC 12.6).
        await stockMovementRepository.create(
            {
                sparePartId: usage.sparePartId,
                serviceOrderId: order._id,
                type: MOVEMENT_TYPES.REVERSAL,
                quantity: usage.quantity,
                stockBefore: part.currentStock - usage.quantity,
                stockAfter: part.currentStock,
                reason: reason ?? `Pembatalan pemakaian pada ${order.orderNumber}`,
                referenceId: order.orderNumber,
                createdBy: actor._id,
            },
            session,
        );

        order.usedParts.pull(usageId);
        recalculateTotals(order);
        await order.save({ session });

        logger.info(
            {
                actorId: actor.id,
                orderId: order.id,
                usageId,
                sparePartId: usage.sparePartId.toString(),
            },
            "Pemakaian suku cadang dibatalkan",
        );

        return order;
    });
};

export const payOrder = async (id, { method }, actor) => {
    const order = await getOrderById(id);

    if (order.paymentStatus === PAYMENT_STATUS.DIBAYAR) {
        throw new ApiError(409, "ALREADY_PAID", "Service order ini sudah dibayar");
    }
    if (order.currentStatus === ORDER_STATUS.DIBATALKAN) {
        throw new ApiError(
            409,
            "ORDER_CANCELLED",
            "Service order yang dibatalkan tidak bisa dibayar",
        );
    }
    if (![ORDER_STATUS.SELESAI, ORDER_STATUS.DIAMBIL].includes(order.currentStatus)) {
        throw new ApiError(
            409,
            "ORDER_NOT_READY_FOR_PAYMENT",
            "Pembayaran baru bisa dilakukan setelah servis selesai",
        );
    }

    order.paymentStatus = PAYMENT_STATUS.DIBAYAR;
    order.paymentMethod = method;
    order.paidAt = new Date();
    order.paidBy = actor._id;
    await order.save();

    logger.info(
        { actorId: actor.id, orderId: order.id, method, grandTotal: order.grandTotal },
        "Pembayaran dicatat",
    );

    return order;
};

export const listOrdersByVehicle = async (vehicleId) => {
    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) throw new ApiError(404, "VEHICLE_NOT_FOUND", "Kendaraan tidak ditemukan");

    return serviceOrderRepository.listByVehicle(vehicleId);
};

export const listOrdersByCustomer = async (customerId, query) => {
    await getCustomerById(customerId);

    const [orders, total] = await Promise.all([
        serviceOrderRepository.listByCustomer(customerId, {
            skip: toSkip(query),
            limit: query.limit,
        }),
        ServiceOrder.countDocuments({ customerId }),
    ]);

    return { orders, meta: buildMeta({ ...query, total }) };
};
