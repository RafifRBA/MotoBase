import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { objectIdSchema } from "../users/user.validation.js";
import { PAYMENT_METHODS } from "./service-order.model.js";
import { ORDER_STATUS } from "./service-order.status.js";

const rupiahSchema = z.coerce.number().int().min(0).max(1_000_000_000);

export const orderIdSchema = { params: z.object({ id: objectIdSchema }) };

export const listOrdersSchema = {
    query: paginationSchema.extend({
        status: z.enum(Object.values(ORDER_STATUS)).optional(),
        customerId: objectIdSchema.optional(),
        vehicleId: objectIdSchema.optional(),
        assignedMechanicId: objectIdSchema.optional(),
        paymentStatus: z.enum(["BELUM_DIBAYAR", "DIBAYAR"]).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        search: z.string().trim().min(1).max(50).optional(),
    }),
};

export const createOrderSchema = {
    body: z.object({
        customerId: objectIdSchema,
        vehicleId: objectIdSchema,
        complaint: z.string().trim().min(3).max(1000),
        // Opsional saat order dibuat; biasanya diisi setelah diperiksa.
        serviceCost: rupiahSchema.default(0),
        assignedMechanicId: objectIdSchema.optional(),
        internalNotes: z.string().trim().max(1000).optional(),
    }),
};

export const updateOrderSchema = {
    params: z.object({ id: objectIdSchema }),
    // Status, total, dan nomor order TIDAK bisa diubah di sini. Masing-masing
    // punya endpoint sendiri supaya selalu ada jejak audit.
    body: z
        .object({
            complaint: z.string().trim().min(3).max(1000).optional(),
            diagnosis: z.string().trim().max(1000).optional(),
            internalNotes: z.string().trim().max(1000).optional(),
            serviceCost: rupiahSchema.optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};

export const assignMechanicSchema = {
    params: z.object({ id: objectIdSchema }),
    // null berarti melepas penugasan.
    body: z.object({ mechanicId: objectIdSchema.nullable() }),
};

export const updateStatusSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({
        status: z.enum(Object.values(ORDER_STATUS)),
        note: z.string().trim().max(300).optional(),
        // Koreksi mundur hanya boleh admin, dan wajib menyatakan niatnya
        // secara eksplisit lewat flag ini (SPEC 11).
        isCorrection: z.boolean().default(false),
    }),
};

export const addPartSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({
        sparePartId: objectIdSchema,
        quantity: z.coerce.number().int().min(1).max(1000),
    }),
};

export const removePartSchema = {
    params: z.object({ id: objectIdSchema, usageId: objectIdSchema }),
    body: z
        .object({ reason: z.string().trim().min(3).max(300).optional() })
        .optional()
        .default({}),
};

export const paymentSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({ method: z.enum(PAYMENT_METHODS) }),
};
