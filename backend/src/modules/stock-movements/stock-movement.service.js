import { buildMeta, toSkip } from "../../utils/pagination.js";
import { stockMovementRepository } from "./stock-movement.repository.js";

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
        stockMovementRepository.list(filter, { skip: toSkip(query), limit: query.limit }),
        stockMovementRepository.count(filter),
    ]);

    return { movements, meta: buildMeta({ ...query, total }) };
};
