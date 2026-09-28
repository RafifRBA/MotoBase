import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as sparePartController from "./spare-part.controller.js";
import {
    adjustStockSchema,
    createSparePartSchema,
    listSparePartsSchema,
    partMovementsSchema,
    sparePartIdSchema,
    stockInSchema,
    updateSparePartSchema,
} from "./spare-part.validation.js";

const router = Router();

router.use(authenticate);

// Mekanik perlu melihat katalog dan sisa stok saat mengerjakan servis,
// tapi tidak boleh mengubah stok (SPEC 6.1).
const canRead = authorize(ROLES.ADMIN, ROLES.OWNER, ROLES.MECHANIC);
const canWrite = authorize(ROLES.ADMIN);
const canReadInternal = authorize(ROLES.ADMIN, ROLES.OWNER);

// Harus didaftarkan SEBELUM "/:id", kalau tidak Express akan membaca
// "low-stock" sebagai nilai parameter :id.
router.get("/low-stock", canReadInternal, sparePartController.lowStock);

router.get("/", canRead, validate(listSparePartsSchema), sparePartController.list);
router.post("/", canWrite, validate(createSparePartSchema), sparePartController.create);
router.get("/:id", canRead, validate(sparePartIdSchema), sparePartController.getById);
router.patch("/:id", canWrite, validate(updateSparePartSchema), sparePartController.update);

router.post("/:id/stock-in", canWrite, validate(stockInSchema), sparePartController.stockIn);
router.post(
    "/:id/adjust-stock",
    canWrite,
    validate(adjustStockSchema),
    sparePartController.adjustStock,
);
router.get(
    "/:id/movements",
    canReadInternal,
    validate(partMovementsSchema),
    sparePartController.listMovementsOfPart,
);

export default router;
