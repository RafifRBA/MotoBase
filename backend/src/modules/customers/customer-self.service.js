import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, toSkip } from "../../utils/pagination.js";
import { serviceOrderRepository } from "../service-orders/service-order.repository.js";
import { findOrderByTrackingToken } from "../service-orders/tracking.service.js";
import { userRepository } from "../users/user.repository.js";
import { vehicleRepository } from "../vehicles/vehicle.repository.js";
import { customerRepository } from "./customer.repository.js";

const profileNotFound = () =>
    new ApiError(
        404,
        "CUSTOMER_PROFILE_NOT_FOUND",
        "Akun Anda belum terhubung ke data pelanggan. Hubungi bengkel untuk menghubungkannya.",
    );

export const getMyCustomer = async (user) => {
    const customer = await customerRepository.findByUserId(user._id);
    if (!customer) throw profileNotFound();
    return customer;
};

export const updateMyCustomer = async (user, data) => {
    const customer = await getMyCustomer(user);

    // Nomor telepon dan catatan internal sengaja tidak bisa diubah sendiri:
    // nomor adalah dasar verifikasi kepemilikan, catatan milik bengkel.
    Object.assign(customer, data);
    await customer.save();

    return customer;
};

export const listMyVehicles = async (user) => {
    const customer = await getMyCustomer(user);
    return vehicleRepository.listByCustomer(customer._id);
};

export const listMyOrders = async (user, query) => {
    const customer = await getMyCustomer(user);

    const [orders, total] = await Promise.all([
        serviceOrderRepository.listByCustomer(customer._id, {
            skip: toSkip(query),
            limit: query.limit,
        }),
        serviceOrderRepository.count({ customerId: customer._id }),
    ]);

    return { orders, meta: buildMeta({ ...query, total }) };
};

export const getMyOrder = async (user, orderId) => {
    const customer = await getMyCustomer(user);
    const order = await serviceOrderRepository.findById(orderId);

    // Pesan 404 yang sama untuk "tidak ada" dan "bukan milik Anda", supaya
    // pelanggan tidak bisa menebak id order milik orang lain.
    if (!order || !order.customerId.equals(customer._id)) {
        throw new ApiError(404, "SERVICE_ORDER_NOT_FOUND", "Service order tidak ditemukan");
    }

    return order;
};

// Menghubungkan akun pelanggan dengan data Customer lewat tracking token
// (SPEC 8.1). Mengetahui token saja TIDAK cukup: nomor telepon akun harus sudah
// terverifikasi dan sama dengan nomor pada data pelanggan.
export const claimServiceOrder = async (user, trackingToken) => {
    const { order } = await findOrderByTrackingToken(trackingToken);

    const customer = await customerRepository.findById(order.customerId);
    if (!customer) throw profileNotFound();

    if (customer.userId) {
        if (customer.userId.equals(user._id)) {
            throw new ApiError(
                409,
                "ALREADY_CLAIMED",
                "Service order ini sudah terhubung dengan akun Anda",
            );
        }
        throw new ApiError(
            409,
            "CUSTOMER_ALREADY_LINKED",
            "Data pelanggan ini sudah terhubung dengan akun lain. Hubungi bengkel.",
        );
    }

    if (!user.phoneVerifiedAt) {
        throw new ApiError(
            403,
            "PHONE_NOT_VERIFIED",
            "Nomor telepon Anda belum terverifikasi. Silakan verifikasi di bengkel terlebih dahulu.",
        );
    }

    if (!user.phone || user.phone !== customer.phone) {
        // Dicatat karena percobaan klaim yang gagal bisa menandakan
        // seseorang mencoba mengambil alih data pelanggan lain.
        logger.warn(
            { userId: user.id, customerId: customer.id },
            "Klaim service order ditolak: nomor telepon tidak cocok",
        );
        throw new ApiError(
            403,
            "PHONE_MISMATCH",
            "Nomor telepon akun Anda tidak cocok dengan data pelanggan pada servis ini",
        );
    }

    customer.userId = user._id;
    await customer.save();

    logger.info({ userId: user.id, customerId: customer.id }, "Akun dihubungkan ke data pelanggan");
    return customer;
};

// Dipakai admin setelah memverifikasi identitas pelanggan secara langsung di
// bengkel. Ini pengganti OTP selama provider WhatsApp belum diputuskan (SPEC 31).
export const linkUserToCustomer = async (customerId, userId, actor) => {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Pelanggan tidak ditemukan");

    if (customer.userId) {
        throw new ApiError(
            409,
            "CUSTOMER_ALREADY_LINKED",
            "Data pelanggan ini sudah terhubung dengan sebuah akun",
        );
    }

    const user = await userRepository.findById(userId);
    if (!user || user.role !== "CUSTOMER") {
        throw new ApiError(404, "USER_NOT_FOUND", "Akun pelanggan tidak ditemukan");
    }

    const sudahPunya = await customerRepository.findByUserId(user._id);
    if (sudahPunya) {
        throw new ApiError(
            409,
            "USER_ALREADY_LINKED",
            "Akun tersebut sudah terhubung dengan data pelanggan lain",
        );
    }

    if (user.phone !== customer.phone) {
        throw new ApiError(
            409,
            "PHONE_MISMATCH",
            "Nomor telepon akun tidak sama dengan nomor pada data pelanggan",
        );
    }

    customer.userId = user._id;
    await customer.save();

    // Admin sudah memeriksa identitas pelanggan secara langsung, jadi nomornya
    // dianggap terverifikasi sejak saat ini.
    user.phoneVerifiedAt = new Date();
    await user.save();

    logger.info(
        { actorId: actor.id, customerId: customer.id, userId: user.id },
        "Admin menghubungkan akun ke data pelanggan",
    );

    return customer;
};
