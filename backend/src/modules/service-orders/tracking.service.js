import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { generateTrackingToken, hashTrackingToken } from "../../utils/tracking-token.js";
import { customerRepository } from "../customers/customer.repository.js";
import { userRepository } from "../users/user.repository.js";
import { vehicleRepository } from "../vehicles/vehicle.repository.js";
import { serviceOrderRepository } from "./service-order.repository.js";

// Satu pesan error untuk semua kegagalan: token salah, kedaluwarsa, dan dicabut
// tidak dibedakan. Membedakannya akan memberi tahu penebak bahwa token yang ia
// coba pernah ada.
const invalidToken = () =>
    new ApiError(404, "TRACKING_NOT_FOUND", "Link tracking tidak valid atau sudah kedaluwarsa");

export const findOrderByTrackingToken = async (rawToken) => {
    if (typeof rawToken !== "string" || rawToken.length !== 64) throw invalidToken();

    // Token dari URL di-hash lalu dibandingkan dengan yang tersimpan (SPEC 9).
    const order = await serviceOrderRepository.findByTrackingHash(hashTrackingToken(rawToken));
    if (!order) throw invalidToken();

    if (order.trackingRevokedAt) throw invalidToken();
    if (order.trackingExpiresAt && order.trackingExpiresAt <= new Date()) throw invalidToken();

    const [customer, vehicle, mechanic] = await Promise.all([
        customerRepository.findById(order.customerId),
        vehicleRepository.findById(order.vehicleId),
        order.assignedMechanicId ? userRepository.findById(order.assignedMechanicId) : null,
    ]);

    return { order, customer, vehicle, mechanic };
};

// Token lama langsung tidak berlaku begitu yang baru diterbitkan.
export const rotateTrackingToken = async (orderId, actor) => {
    const order = await serviceOrderRepository.findById(orderId);
    if (!order) {
        throw new ApiError(404, "SERVICE_ORDER_NOT_FOUND", "Service order tidak ditemukan");
    }

    const tracking = generateTrackingToken();
    order.trackingTokenHash = tracking.tokenHash;
    order.trackingExpiresAt = tracking.expiresAt;
    order.trackingRevokedAt = null;
    await order.save();

    logger.info({ actorId: actor.id, orderId: order.id }, "Tracking token dibuat ulang");

    return { order, trackingToken: tracking.token };
};

export const revokeTrackingToken = async (orderId, actor) => {
    const order = await serviceOrderRepository.findById(orderId);
    if (!order) {
        throw new ApiError(404, "SERVICE_ORDER_NOT_FOUND", "Service order tidak ditemukan");
    }

    if (order.trackingRevokedAt) {
        throw new ApiError(409, "TRACKING_ALREADY_REVOKED", "Link tracking sudah dicabut");
    }

    order.trackingRevokedAt = new Date();
    await order.save();

    logger.info({ actorId: actor.id, orderId: order.id }, "Tracking token dicabut");
    return order;
};
