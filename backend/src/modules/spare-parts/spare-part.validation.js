import { z } from "zod";

import { paginationSchema } from "../../utils/pagination.js";
import { objectIdSchema } from "../users/user.validation.js";

// Rupiah selalu bilangan bulat.
const rupiahSchema = z.coerce.number().int().min(0).max(1_000_000_000);
const quantitySchema = z.coerce.number().int().min(1).max(100_000);

export const sparePartIdSchema = { params: z.object({ id: objectIdSchema }) };

export const listSparePartsSchema = {
    query: paginationSchema.extend({
        search: z.string().trim().min(1).max(100).optional(),
        category: z.string().trim().min(1).max(50).optional(),
        isActive: z.enum(["true", "false"]).optional(),
        lowStock: z.enum(["true", "false"]).optional(),
    }),
};

export const createSparePartSchema = {
    body: z.object({
        sku: z
            .string()
            .trim()
            .min(1)
            .max(50)
            .regex(/^[A-Za-z0-9-_]+$/, "SKU hanya boleh huruf, angka, - dan _"),
        name: z.string().trim().min(1).max(150),
        category: z.string().trim().max(50).optional(),
        sellingPrice: rupiahSchema,
        purchasePrice: rupiahSchema,
        // Stok awal opsional; kalau diisi, dicatat sebagai movement bertipe IN.
        initialStock: z.coerce.number().int().min(0).max(100_000).default(0),
        minimumStock: z.coerce.number().int().min(0).max(100_000).optional(),
        unit: z.string().trim().min(1).max(20).default("pcs"),
    }),
};

export const updateSparePartSchema = {
    params: z.object({ id: objectIdSchema }),
    // currentStock TIDAK ada di sini. Stok hanya boleh berubah lewat stock-in,
    // adjust-stock, atau pemakaian pada service order, supaya setiap perubahan
    // selalu punya jejak di StockMovement.
    body: z
        .object({
            name: z.string().trim().min(1).max(150).optional(),
            category: z.string().trim().max(50).optional(),
            sellingPrice: rupiahSchema.optional(),
            purchasePrice: rupiahSchema.optional(),
            minimumStock: z.coerce.number().int().min(0).max(100_000).optional(),
            unit: z.string().trim().min(1).max(20).optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, "Tidak ada field yang diubah"),
};

export const stockInSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({
        quantity: quantitySchema,
        reason: z.string().trim().min(1).max(300).default("Stok masuk"),
        referenceId: z.string().trim().max(100).optional(),
    }),
};

export const adjustStockSchema = {
    params: z.object({ id: objectIdSchema }),
    body: z.object({
        // Bertanda: positif menambah, negatif mengurangi. Nol ditolak karena
        // penyesuaian tanpa perubahan tidak ada gunanya.
        quantity: z.coerce
            .number()
            .int()
            .min(-100_000)
            .max(100_000)
            .refine((value) => value !== 0, "Jumlah penyesuaian tidak boleh 0"),
        // Penyesuaian stok wajib beralasan supaya bisa diaudit.
        reason: z.string().trim().min(3).max(300),
    }),
};

export const listMovementsSchema = {
    query: paginationSchema.extend({
        sparePartId: objectIdSchema.optional(),
        serviceOrderId: objectIdSchema.optional(),
        type: z.enum(["IN", "USAGE", "ADJUSTMENT", "REVERSAL"]).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
    }),
};

export const partMovementsSchema = {
    params: z.object({ id: objectIdSchema }),
    query: paginationSchema,
};
