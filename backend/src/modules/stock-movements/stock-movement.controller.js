import { buildMeta, toSkip } from "../../utils/pagination.js";
import { StockMovement } from "./stock-movement.model.js";

export const toStockMovementResponse = (movement) => ({
    id: movement.id,
    sparePartId: movement.sparePartId.toString(),
    serviceOrderId: movement.serviceOrderId ? movement.serviceOrderId.toString() : null,
    type: movement.type,
    quantity: movement.quantity,
    stockBefore: movement.stockBefore,
    stockAfter: movement.stockAfter,
    reason: movement.reason,
    referenceId: movement.referenceId ?? null,
    createdBy: movement.createdBy.toString(),
    createdAt: movement.createdAt,
});

export const listMovements = async (query) => {
    const filter = {};
    if (query.sparePartId) filter.sparePartId = query.sparePartId;
    if (query.serviceOrderId) filter.serviceOrderId = query.serviceOrderId;
    if (query.type) filter.type = query.type;

    if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate) filter.createdAt.$gte = query.startDate;
        if (query.endDate) filter.createdAt.$lte = query.endDate;
    }

    const [movements, total] = await Promise.all([
        StockMovement.find(filter).sort({ createdAt: -1 }).skip(toSkip(query)).limit(query.limit),
        StockMovement.countDocuments(filter),
    ]);

    return { movements, meta: buildMeta({ ...query, total }) };
};

export const list = async (req, res) => {
    const { movements, meta } = await listMovements(req.validated.query);

    return res.status(200).json({
        success: true,
        data: movements.map(toStockMovementResponse),
        meta,
    });
};
