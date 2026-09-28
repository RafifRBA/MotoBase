import { z } from "zod";

// Filter laporan minimal: ?startDate=2026-09-01&endDate=2026-09-30 (SPEC 15.10).
export const reportRangeSchema = {
    query: z
        .object({
            startDate: z.coerce.date().optional(),
            endDate: z.coerce.date().optional(),
        })
        .refine(
            (query) => !query.startDate || !query.endDate || query.startDate <= query.endDate,
            "startDate harus lebih awal dari endDate",
        ),
};
