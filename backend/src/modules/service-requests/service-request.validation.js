import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { objectIdSchema } from "../users/user.validation.js";
import { REQUEST_STATUS } from "./service-request.model.js";

const startOfToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// Dipakai pelanggan. customerId TIDAK ada di body: selalu diambil dari akun
// yang login, supaya pelanggan tidak bisa mengajukan atas nama orang lain.
export const createRequestSchema = {
    body: z.object({
        vehicleId: objectIdSchema,
        complaint: z.string().trim().min(3).max(1000),
        serviceDate: z.coerce
            .date()
            .refine((date) => date >= startOfToday(), "Tanggal tidak boleh di masa lalu"),
    }),
};

export const listRequestsSchema = {
    query: paginationSchema.extend({
        status: z.enum(Object.values(REQUEST_STATUS)).default(REQUEST_STATUS.MENUNGGU_VERIFIKASI),
    }),
};

export const reviewRequestSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({
        decision: z.enum([REQUEST_STATUS.DITERIMA, REQUEST_STATUS.DITOLAK]),
        // Hanya dipakai kalau diterima.
        serviceCost: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
        mechanicId: objectIdSchema.optional(),
        note: z.string().trim().max(300).optional(),
    }),
};
