import { canSeeInternalNotes, toServiceOrderResponse } from "./service-order.mapper.js";
import * as orderService from "./service-order.service.js";

const idempotencyKeyOf = (req) => {
    const key = req.get("idempotency-key");
    return typeof key === "string" && key.trim().length > 0 ? key.trim().slice(0, 128) : undefined;
};

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
        // Peringatan stok menipis (SPEC 4).
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
