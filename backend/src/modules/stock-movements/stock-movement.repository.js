import { StockMovement } from "./stock-movement.model.js";

export const stockMovementRepository = {
    create: (data, session) => StockMovement.create([data], { session }).then(([doc]) => doc),

    findByIdempotencyKey: (idempotencyKey) => StockMovement.findOne({ idempotencyKey }),

    list: (filter, { skip, limit }) =>
        StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    count: (filter) => StockMovement.countDocuments(filter),

    // Dipakai saat membatalkan pemakaian part pada service order (Tahap 5).
    findUsageByOrderAndId: (serviceOrderId, id) =>
        StockMovement.findOne({ _id: id, serviceOrderId }),
};
