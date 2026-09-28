import { canSeeInternalNotes, toServiceOrderResponse } from "./service-order.mapper.js";
import { toPublicTrackingResponse } from "./service-order.public-mapper.js";
import * as trackingService from "./tracking.service.js";

// Endpoint publik: tanpa JWT, hanya baca, dan selalu lewat mapper publik.
export const track = async (req, res) => {
    const context = await trackingService.findOrderByTrackingToken(req.validated.params.token);

    return res.status(200).json({
        success: true,
        data: toPublicTrackingResponse(context),
    });
};

export const rotate = async (req, res) => {
    const { order, trackingToken } = await trackingService.rotateTrackingToken(
        req.validated.params.id,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Link tracking baru berhasil dibuat. Link lama sudah tidak berlaku.",
        data: {
            ...toServiceOrderResponse(order, {
                includeInternalNotes: canSeeInternalNotes(req.user),
            }),
            trackingToken,
        },
    });
};

export const revoke = async (req, res) => {
    const order = await trackingService.revokeTrackingToken(req.validated.params.id, req.user);

    return res.status(200).json({
        success: true,
        message: "Link tracking dicabut",
        data: toServiceOrderResponse(order, {
            includeInternalNotes: canSeeInternalNotes(req.user),
        }),
    });
};
