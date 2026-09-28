import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { objectIdSchema } from "../users/user.validation.js";

const plateSchema = z
    .string()
    .trim()
    .min(3, "Plat nomor terlalu pendek")
    .max(20)
    .regex(/^[A-Za-z0-9\s-]+$/, "Plat nomor hanya boleh huruf, angka, spasi, dan tanda hubung");

export const vehicleIdSchema = { params: z.object({ id: objectIdSchema }) };

export const listVehiclesSchema = {
    query: paginationSchema.extend({
        customerId: objectIdSchema.optional(),
        search: z.string().trim().min(1).max(50).optional(),
    }),
};

export const createVehicleSchema = {
    body: z.object({
        customerId: objectIdSchema,
        licensePlate: plateSchema,
        brand: z.string().trim().min(1).max(50),
        model: z.string().trim().min(1).max(50),
        year: z.coerce.number().int().min(1950).max(2100).optional(),
        color: z.string().trim().max(30).optional(),
        chassisNumber: z.string().trim().max(50).optional(),
        engineNumber: z.string().trim().max(50).optional(),
    }),
};

export const updateVehicleSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z
        .object({
            // customerId boleh diubah: itu cara mencatat perpindahan pemilik.
            customerId: objectIdSchema.optional(),
            licensePlate: plateSchema.optional(),
            brand: z.string().trim().min(1).max(50).optional(),
            model: z.string().trim().min(1).max(50).optional(),
            year: z.coerce.number().int().min(1950).max(2100).optional(),
            color: z.string().trim().max(30).optional(),
            chassisNumber: z.string().trim().max(50).optional(),
            engineNumber: z.string().trim().max(50).optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};
