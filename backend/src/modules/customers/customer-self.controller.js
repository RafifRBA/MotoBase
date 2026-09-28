import { toServiceOrderResponse } from "../service-orders/service-order.mapper.js";
import { toVehicleResponse } from "../vehicles/vehicle.mapper.js";
import { toCustomerSelfResponse } from "./customer.mapper.js";
import * as selfService from "./customer-self.service.js";

// Pelanggan tidak pernah melihat catatan internal bengkel.
const presentOrder = (order) => toServiceOrderResponse(order, { includeInternalNotes: false });

export const getMe = async (req, res) => {
    const customer = await selfService.getMyCustomer(req.user);
    return res.status(200).json({ success: true, data: toCustomerSelfResponse(customer) });
};

export const updateMe = async (req, res) => {
    const customer = await selfService.updateMyCustomer(req.user, req.validated.body);

    return res.status(200).json({
        success: true,
        message: "Data berhasil diperbarui",
        data: toCustomerSelfResponse(customer),
    });
};

export const myVehicles = async (req, res) => {
    const vehicles = await selfService.listMyVehicles(req.user);

    return res.status(200).json({ success: true, data: vehicles.map(toVehicleResponse) });
};

export const myOrders = async (req, res) => {
    const { orders, meta } = await selfService.listMyOrders(req.user, req.validated.query);

    return res.status(200).json({ success: true, data: orders.map(presentOrder), meta });
};

export const myOrderDetail = async (req, res) => {
    const order = await selfService.getMyOrder(req.user, req.validated.params.orderId);

    return res.status(200).json({ success: true, data: presentOrder(order) });
};

export const claimServiceOrder = async (req, res) => {
    const customer = await selfService.claimServiceOrder(
        req.user,
        req.validated.body.trackingToken,
    );

    return res.status(200).json({
        success: true,
        message: "Service order berhasil ditambahkan ke akun Anda",
        data: toCustomerSelfResponse(customer),
    });
};

export const linkUser = async (req, res) => {
    const customer = await selfService.linkUserToCustomer(
        req.validated.params.id,
        req.validated.body.userId,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Akun pelanggan berhasil dihubungkan",
        data: { id: customer.id, userId: customer.userId.toString() },
    });
};
