import { formatRef } from "../../utils/ref.js";
import { ServiceRequest } from "./service-request.model.js";
import * as requestService from "./service-request.service.js";

export const REQUEST_POPULATE_PATHS = [
    { path: "customerId", select: "name phone" },
    { path: "vehicleId", select: "licensePlate brand model" },
];

export const toServiceRequestResponse = (request) => ({
    id: request.id,
    customerId: formatRef(request.customerId, ["name", "phone"]),
    vehicleId: formatRef(request.vehicleId, ["licensePlate", "brand", "model"]),
    complaint: request.complaint,
    serviceDate: request.serviceDate,
    requestStatus: request.status,
    reviewNote: request.reviewNote ?? null,
    orderId: request.orderId ? request.orderId.toString() : null,
    createdAt: request.createdAt,
});

// Populate sekali untuk seluruh daftar, lalu format.
export const presentRequests = async (requests) => {
    await ServiceRequest.populate(requests, REQUEST_POPULATE_PATHS);
    return requests.map(toServiceRequestResponse);
};

// Kotak masuk admin.
export const list = async (req, res) => {
    const { requests, meta } = await requestService.listRequests(req.validated.query);

    return res.status(200).json({
        success: true,
        data: await presentRequests(requests),
        meta,
    });
};

export const review = async (req, res) => {
    const request = await requestService.reviewRequest(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );
    const [data] = await presentRequests([request]);

    return res.status(200).json({
        success: true,
        message:
            request.status === "DITERIMA"
                ? "Pengajuan diterima dan masuk antrean servis"
                : "Pengajuan ditolak",
        data,
    });
};
