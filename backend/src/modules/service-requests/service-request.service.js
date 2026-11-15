import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, toSkip } from "../../utils/pagination.js";
import { createOrder } from "../service-orders/service-order.service.js";
import { Vehicle } from "../vehicles/vehicle.model.js";
import { REQUEST_STATUS, ServiceRequest } from "./service-request.model.js";

// Batas supaya satu akun tidak bisa membanjiri kotak masuk admin.
const MAX_PENDING_PER_CUSTOMER = 5;

export const createRequest = async (customerId, { vehicleId, complaint, serviceDate }) => {
    // Kendaraan dicari BERSAMA customerId: kendaraan milik orang lain dijawab
    // "tidak ditemukan", bukan "bukan milik Anda", supaya tidak membocorkan keberadaannya.
    const vehicle = await Vehicle.findOne({ _id: vehicleId, customerId });
    if (!vehicle) throw new ApiError(404, "VEHICLE_NOT_FOUND", "Kendaraan tidak ditemukan");

    const pending = await ServiceRequest.countDocuments({
        customerId,
        status: REQUEST_STATUS.MENUNGGU_VERIFIKASI,
    });
    if (pending >= MAX_PENDING_PER_CUSTOMER) {
        throw new ApiError(
            409,
            "TOO_MANY_PENDING_REQUESTS",
            "Masih ada beberapa pengajuan yang belum diverifikasi. Tunggu hingga ditinjau admin",
        );
    }

    return ServiceRequest.create({ customerId, vehicleId, complaint, serviceDate });
};

// Satu fungsi untuk dua kebutuhan: daftar milik pelanggan (isi customerId)
// dan kotak masuk admin (isi status).
export const listRequests = async ({ customerId, status, page, limit }) => {
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (status) filter.status = status;

    const [requests, total] = await Promise.all([
        ServiceRequest.find(filter)
            .sort({ createdAt: -1 })
            .skip(toSkip({ page, limit }))
            .limit(limit),
        ServiceRequest.countDocuments(filter),
    ]);

    return { requests, meta: buildMeta({ page, limit, total }) };
};

export const reviewRequest = async (id, { decision, serviceCost, mechanicId, note }, actor) => {
    // Pengajuan "diklaim" secara atomik: kalau dua admin menekan Terima
    // bersamaan, hanya satu yang berhasil dan order tidak terbuat dua kali.
    const claimed = await ServiceRequest.findOneAndUpdate(
        { _id: id, status: REQUEST_STATUS.MENUNGGU_VERIFIKASI },
        {
            status: decision,
            reviewedBy: actor._id,
            reviewedAt: new Date(),
            reviewNote: note ?? null,
        },
        { returnDocument: "after" },
    );

    if (!claimed) {
        const exists = await ServiceRequest.exists({ _id: id });
        throw exists
            ? new ApiError(409, "REQUEST_ALREADY_REVIEWED", "Pengajuan sudah ditinjau")
            : new ApiError(404, "REQUEST_NOT_FOUND", "Pengajuan tidak ditemukan");
    }

    if (decision === REQUEST_STATUS.DITOLAK) {
        logger.info({ actorId: actor.id, requestId: id }, "Pengajuan servis ditolak");
        return claimed;
    }

    try {
        const { order } = await createOrder(
            {
                customerId: claimed.customerId.toString(),
                vehicleId: claimed.vehicleId.toString(),
                complaint: claimed.complaint,
                serviceCost,
                assignedMechanicId: mechanicId,
                internalNotes: `Pengajuan pelanggan untuk tanggal ${claimed.serviceDate.toISOString().slice(0, 10)}`,
            },
            actor,
        );

        claimed.orderId = order._id;
        await claimed.save();

        logger.info({ actorId: actor.id, requestId: id, orderId: order.id }, "Pengajuan diterima");
        return claimed;
    } catch (error) {
        // Pembuatan order gagal (mis. mekanik nonaktif): kembalikan pengajuan
        // ke antrean verifikasi supaya admin bisa mencoba lagi.
        await ServiceRequest.updateOne(
            { _id: id },
            {
                status: REQUEST_STATUS.MENUNGGU_VERIFIKASI,
                reviewedBy: null,
                reviewedAt: null,
                reviewNote: null,
            },
        );
        throw error;
    }
};
