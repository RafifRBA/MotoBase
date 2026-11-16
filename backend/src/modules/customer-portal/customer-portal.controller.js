import ApiError from "../../utils/api-error.js";
import { formatRef } from "../../utils/ref.js";
import * as customerService from "../customers/customer.service.js";
import { ServiceOrder } from "../service-orders/service-order.model.js";
import * as orderService from "../service-orders/service-order.service.js";
import { presentRequests } from "../service-requests/service-request.controller.js";
import * as requestService from "../service-requests/service-request.service.js";
import { toUserResponse } from "../users/user.controller.js";
import { toVehicleResponse } from "../vehicles/vehicle.controller.js";
import * as vehicleService from "../vehicles/vehicle.service.js";
import * as portalService from "./customer-portal.service.js";

// Semua data pelanggan diambil dari akun yang login. Tidak ada endpoint portal
// yang menerima customerId dari klien.
const ownCustomerId = (req) => {
    if (!req.user.customerId) {
        throw new ApiError(404, "CUSTOMER_PROFILE_NOT_FOUND", "Profil pelanggan tidak ditemukan");
    }
    return req.user.customerId.toString();
};

// Allowlist profil pelanggan. `notes` (catatan pribadi staf tentang pelanggan)
// sengaja tidak ada: pelanggan tidak boleh membacanya.
const toOwnProfileResponse = (customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? null,
    address: customer.address ?? null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
});

// DTO khusus pelanggan: tanpa catatan internal, nama mekanik, riwayat status
// (yang memuat catatan staf), dan data tracking.
const toCustomerOrderResponse = (order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    queueNumber: order.queueNumber,
    serviceDate: order.serviceDate,
    vehicleId: formatRef(order.vehicleId, ["licensePlate", "brand", "model"]),
    complaint: order.complaint,
    diagnosis: order.diagnosis ?? null,
    currentStatus: order.currentStatus,
    serviceCost: order.serviceCost,
    partsSubtotal: order.partsSubtotal,
    grandTotal: order.grandTotal,
    paymentStatus: order.paymentStatus,
    usedParts: order.usedParts.map((part) => ({
        name: part.name,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        subtotal: part.subtotal,
    })),
    completedAt: order.completedAt ?? null,
    pickedUpAt: order.pickedUpAt ?? null,
    createdAt: order.createdAt,
});

export const register = async (req, res) => {
    const user = await portalService.registerCustomer(req.validated.body);

    return res.status(201).json({
        success: true,
        message: "Akun pelanggan berhasil dibuat",
        data: toUserResponse(user),
    });
};

export const me = async (req, res) => {
    const customer = await customerService.getCustomerById(ownCustomerId(req));
    return res.status(200).json({ success: true, data: toOwnProfileResponse(customer) });
};

export const updateMe = async (req, res) => {
    ownCustomerId(req);
    const customer = await portalService.updateProfile(req.user, req.validated.body);

    return res.status(200).json({
        success: true,
        message: "Profil berhasil diperbarui",
        data: toOwnProfileResponse(customer),
    });
};

export const listVehicles = async (req, res) => {
    const { vehicles, meta } = await vehicleService.listVehicles({
        ...req.validated.query,
        customerId: ownCustomerId(req),
    });

    return res.status(200).json({ success: true, data: vehicles.map(toVehicleResponse), meta });
};

export const createVehicle = async (req, res) => {
    const vehicle = await vehicleService.createVehicle(
        { ...req.validated.body, customerId: ownCustomerId(req) },
        req.user,
    );

    return res.status(201).json({
        success: true,
        message: "Kendaraan berhasil ditambahkan",
        data: toVehicleResponse(vehicle),
    });
};

export const listOrders = async (req, res) => {
    const { orders, meta } = await orderService.listOrdersByCustomer(
        ownCustomerId(req),
        req.validated.query,
    );
    await ServiceOrder.populate(orders, [
        { path: "vehicleId", select: "licensePlate brand model" },
    ]);

    return res.status(200).json({ success: true, data: orders.map(toCustomerOrderResponse), meta });
};

export const listRequests = async (req, res) => {
    const { requests, meta } = await requestService.listRequests({
        ...req.validated.query,
        customerId: ownCustomerId(req),
    });

    return res.status(200).json({ success: true, data: await presentRequests(requests), meta });
};

export const createRequest = async (req, res) => {
    const request = await requestService.createRequest(ownCustomerId(req), req.validated.body);
    const [data] = await presentRequests([request]);

    return res.status(201).json({
        success: true,
        message: "Pengajuan terkirim dan menunggu verifikasi admin",
        data,
    });
};
