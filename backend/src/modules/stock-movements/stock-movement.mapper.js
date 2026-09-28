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
