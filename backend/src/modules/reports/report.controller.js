import { canSeeCostPrice } from "../spare-parts/spare-part.mapper.js";
import * as reportService from "./report.service.js";

const ok = (res, data, meta) =>
    res.status(200).json({ success: true, data, ...(meta && { meta }) });

export const serviceSummary = async (req, res) =>
    ok(res, await reportService.serviceSummary(req.validated.query), req.validated.query);

export const revenueSummary = async (req, res) =>
    ok(res, await reportService.revenueSummary(req.validated.query), req.validated.query);

export const partsUsage = async (req, res) =>
    ok(
        res,
        await reportService.partsUsage(req.validated.query, {
            // Modal dan margin hanya untuk pemilik.
            includeCost: canSeeCostPrice(req.user),
        }),
    );

export const lowStock = async (req, res) => ok(res, await reportService.lowStockReport());

export const mechanicPerformance = async (req, res) =>
    ok(res, await reportService.mechanicPerformance(req.validated.query), req.validated.query);
