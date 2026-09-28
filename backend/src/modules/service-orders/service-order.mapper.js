import { ROLES } from "../users/user.model.js";

const idOf = (value) => (value ? value.toString() : null);

const toUsedPartResponse = (part) => ({
    id: part.id ?? part._id.toString(),
    sparePartId: idOf(part.sparePartId),
    sku: part.sku,
    name: part.name,
    quantity: part.quantity,
    unitPrice: part.unitPrice,
    subtotal: part.subtotal,
    addedAt: part.addedAt,
});

const toStatusHistoryResponse = (entry) => ({
    from: entry.from ?? null,
    to: entry.to,
    changedBy: idOf(entry.changedBy),
    changedAt: entry.changedAt,
    note: entry.note ?? null,
    isCorrection: entry.isCorrection,
});

// DTO internal untuk staf. Catatan internal hanya untuk role internal, tidak
// pernah ikut ke DTO pelanggan atau publik.
export const toServiceOrderResponse = (order, { includeInternalNotes = true } = {}) => {
    const response = {
        id: order.id,
        orderNumber: order.orderNumber,
        queueNumber: order.queueNumber,
        serviceDate: order.serviceDate,
        customerId: idOf(order.customerId),
        vehicleId: idOf(order.vehicleId),
        assignedMechanicId: idOf(order.assignedMechanicId),
        complaint: order.complaint,
        diagnosis: order.diagnosis ?? null,
        currentStatus: order.currentStatus,
        serviceCost: order.serviceCost,
        partsSubtotal: order.partsSubtotal,
        grandTotal: order.grandTotal,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod ?? null,
        paidAt: order.paidAt ?? null,
        usedParts: order.usedParts.map(toUsedPartResponse),
        statusHistory: order.statusHistory.map(toStatusHistoryResponse),
        completedAt: order.completedAt ?? null,
        pickedUpAt: order.pickedUpAt ?? null,
        cancelledAt: order.cancelledAt ?? null,
        trackingActive: Boolean(
            order.trackingTokenHash &&
            !order.trackingRevokedAt &&
            (!order.trackingExpiresAt || order.trackingExpiresAt > new Date()),
        ),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };

    if (includeInternalNotes) response.internalNotes = order.internalNotes ?? null;

    return response;
};

export const canSeeInternalNotes = (user) =>
    [ROLES.ADMIN, ROLES.OWNER, ROLES.MECHANIC].includes(user?.role);
