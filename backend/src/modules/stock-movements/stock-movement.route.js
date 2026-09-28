import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { listMovementsSchema } from "../spare-parts/spare-part.validation.js";
import { ROLES } from "../users/user.model.js";
import * as movementController from "./stock-movement.controller.js";

const router = Router();

router.use(authenticate);

// Riwayat pergerakan stok adalah data internal: admin dan pemilik saja.
router.get(
    "/",
    authorize(ROLES.ADMIN, ROLES.OWNER),
    validate(listMovementsSchema),
    movementController.list,
);

export default router;
