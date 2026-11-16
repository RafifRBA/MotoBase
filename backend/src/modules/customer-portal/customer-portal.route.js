import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { createRequestSchema } from "../service-requests/service-request.validation.js";
import { ROLES } from "../users/user.model.js";
import * as portalController from "./customer-portal.controller.js";
import {
    createOwnVehicleSchema,
    listOwnSchema,
    updateProfileSchema,
} from "./customer-portal.validation.js";

const router = Router();

// Seluruh route portal hanya untuk akun CUSTOMER.
router.use(authenticate, authorize(ROLES.CUSTOMER));

router.get("/me", portalController.me);
router.patch("/me", validate(updateProfileSchema), portalController.updateMe);
router.get("/vehicles", validate(listOwnSchema), portalController.listVehicles);
router.post("/vehicles", validate(createOwnVehicleSchema), portalController.createVehicle);
router.get("/service-orders", validate(listOwnSchema), portalController.listOrders);
router.get("/service-requests", validate(listOwnSchema), portalController.listRequests);
router.post("/service-requests", validate(createRequestSchema), portalController.createRequest);

export default router;
