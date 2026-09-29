import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as reportController from "./report.controller.js";
import { reportRangeSchema } from "./report.validation.js";

const router = Router();

router.use(authenticate);

// Pemilik melihat semua laporan; admin hanya sebagian. Pendapatan dan
// penilaian kinerja mekanik adalah wewenang pemilik.
const ownerOnly = authorize(ROLES.OWNER);
const ownerOrAdmin = authorize(ROLES.OWNER, ROLES.ADMIN);

router.get(
    "/service-summary",
    ownerOrAdmin,
    validate(reportRangeSchema),
    reportController.serviceSummary,
);
router.get(
    "/revenue-summary",
    ownerOnly,
    validate(reportRangeSchema),
    reportController.revenueSummary,
);
router.get("/parts-usage", ownerOrAdmin, validate(reportRangeSchema), reportController.partsUsage);
router.get("/low-stock", ownerOrAdmin, reportController.lowStock);
router.get(
    "/mechanic-performance",
    ownerOnly,
    validate(reportRangeSchema),
    reportController.mechanicPerformance,
);

export default router;
