import { ROLES } from "../users/user.model.js";
import { maskLicensePlate, maskName, publicFirstName } from "../../utils/mask.js";
import * as orderService from "./service-order.service.js";

const idempotencyKeyOf = (req) => {
    const key = req.get("idempotency-key");
    return typeof key === "string" && key.trim().length > 0 ? key.trim().slice(0, 128) : undefined;
};

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

// DTO publik untuk halaman tracking tanpa login.
//
// Dibentuk lewat mapper khusus, BUKAN dengan mengirim dokumen Mongoose lalu
// menghapus field satu per satu. Dengan allowlist seperti ini, field
// baru di model tidak pernah ikut bocor tanpa sengaja.
//
// Yang sengaja TIDAK ada di sini: nomor telepon, alamat, email,
// harga modal, catatan internal, audit log, id internal, dan data stok.
export const toPublicTrackingResponse = ({ order, customer, vehicle, mechanic }) => ({
    orderNumber: order.orderNumber,
    queueNumber: order.queueNumber,
    serviceDate: order.serviceDate,

    vehicle: {
        licensePlate: maskLicensePlate(vehicle?.licensePlate ?? ""),
        brand: vehicle?.brand ?? null,
        model: vehicle?.model ?? null,
    },

    customerName: maskName(customer?.name ?? ""),
    complaint: order.complaint,
    currentStatus: order.currentStatus,

    mechanic: mechanic ? { name: publicFirstName(mechanic.name) } : null,

    // Timeline publik: hanya status dan waktunya. Tidak ada actor, tidak ada
    // catatan internal, dan koreksi administratif tidak ditampilkan.
    statusHistory: order.statusHistory
        .filter((entry) => !entry.isCorrection)
        .map((entry) => ({ status: entry.to, timestamp: entry.changedAt })),

    usedSpareParts: order.usedParts.map((part) => ({
        name: part.name,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        subtotal: part.subtotal,
    })),

    serviceCost: order.serviceCost,
    grandTotal: order.grandTotal,
    paymentStatus: order.paymentStatus,

    completedAt: order.completedAt ?? null,
    pickedUpAt: order.pickedUpAt ?? null,
    isReadyForPickup: order.currentStatus === "SELESAI",
});

const present = (req, order) =>
    toServiceOrderResponse(order, { includeInternalNotes: canSeeInternalNotes(req.user) });

export const list = async (req, res) => {
    const { orders, meta } = await orderService.listOrders(req.validated.query, req.user);

    return res.status(200).json({
        success: true,
        data: orders.map((order) => present(req, order)),
        meta,
    });
};

export const getById = async (req, res) => {
    const order = await orderService.getOrderById(req.validated.params.id);
    return res.status(200).json({ success: true, data: present(req, order) });
};

export const create = async (req, res) => {
    const { order, trackingToken } = await orderService.createOrder(req.validated.body, req.user);

    return res.status(201).json({
        success: true,
        message: "Service order berhasil dibuat",
        data: {
            ...present(req, order),
            // Hanya muncul sekali, saat order dibuat. Kirimkan ke pelanggan
            // lewat WhatsApp atau cetak sebagai QR code.
            trackingToken,
        },
    });
};

export const update = async (req, res) => {
    const order = await orderService.updateOrder(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Service order berhasil diperbarui",
        data: present(req, order),
    });
};

export const assignMechanic = async (req, res) => {
    const order = await orderService.assignMechanic(
        req.validated.params.id,
        req.validated.body.mechanicId,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: req.validated.body.mechanicId ? "Mekanik ditugaskan" : "Penugasan mekanik dilepas",
        data: present(req, order),
    });
};

export const updateStatus = async (req, res) => {
    const order = await orderService.changeStatus(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: `Status diubah menjadi ${order.currentStatus}`,
        data: present(req, order),
    });
};

export const addPart = async (req, res) => {
    const { order, isLowStock } = await orderService.addPartUsage(
        req.validated.params.id,
        req.validated.body,
        req.user,
        idempotencyKeyOf(req),
    );

    return res.status(201).json({
        success: true,
        message: "Pemakaian suku cadang dicatat",
        data: present(req, order),
        // Peringatan stok menipis.
        meta: { isLowStock: Boolean(isLowStock) },
    });
};

export const removePart = async (req, res) => {
    const order = await orderService.removePartUsage(
        req.validated.params.id,
        req.validated.params.usageId,
        req.validated.body ?? {},
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Pemakaian suku cadang dibatalkan dan stok dikembalikan",
        data: present(req, order),
    });
};

export const pay = async (req, res) => {
    const order = await orderService.payOrder(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Pembayaran berhasil dicatat",
        data: present(req, order),
    });
};

export const listByVehicle = async (req, res) => {
    const orders = await orderService.listOrdersByVehicle(req.validated.params.id);

    return res.status(200).json({
        success: true,
        data: orders.map((order) => present(req, order)),
    });
};

export const listByCustomer = async (req, res) => {
    const { orders, meta } = await orderService.listOrdersByCustomer(
        req.validated.params.id,
        req.validated.query,
    );

    return res.status(200).json({
        success: true,
        data: orders.map((order) => present(req, order)),
        meta,
    });
};

// Endpoint publik: tanpa JWT, hanya baca, dan selalu lewat mapper publik.
export const track = async (req, res) => {
    const context = await orderService.findOrderByTrackingToken(req.validated.params.token);

    return res.status(200).json({
        success: true,
        data: toPublicTrackingResponse(context),
    });
};

export const rotateTracking = async (req, res) => {
    const { order, trackingToken } = await orderService.rotateTrackingToken(
        req.validated.params.id,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Link tracking baru berhasil dibuat. Link lama sudah tidak berlaku.",
        data: {
            ...present(req, order),
            trackingToken,
        },
    });
};

export const revokeTracking = async (req, res) => {
    const order = await orderService.revokeTrackingToken(req.validated.params.id, req.user);

    return res.status(200).json({
        success: true,
        message: "Link tracking dicabut",
        data: present(req, order),
    });
};
