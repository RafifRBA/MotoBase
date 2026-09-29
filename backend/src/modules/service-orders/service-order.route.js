import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as orderController from "./service-order.controller.js";
import {
    addPartSchema,
    assignMechanicSchema,
    createOrderSchema,
    listOrdersSchema,
    orderIdSchema,
    paymentSchema,
    removePartSchema,
    updateOrderSchema,
    updateStatusSchema,
} from "./service-order.validation.js";

const router = Router();

router.use(authenticate);

const anyStaff = authorize(ROLES.ADMIN, ROLES.OWNER, ROLES.MECHANIC);
const adminOnly = authorize(ROLES.ADMIN);
const adminOrMechanic = authorize(ROLES.ADMIN, ROLES.MECHANIC);

// Daftar order: mekanik ikut boleh, tapi service-nya menyaring agar hanya
// order yang ditugaskan kepadanya yang muncul.
router.get("/", anyStaff, validate(listOrdersSchema), orderController.list);
router.post("/", adminOnly, validate(createOrderSchema), orderController.create);
router.get("/:id", anyStaff, validate(orderIdSchema), orderController.getById);
router.patch("/:id", adminOrMechanic, validate(updateOrderSchema), orderController.update);

router.patch(
    "/:id/assign-mechanic",
    adminOnly,
    validate(assignMechanicSchema),
    orderController.assignMechanic,
);

// Asumsi admin DAN mekanik boleh mengubah status. Di bengkel kecil,
// mekanik sering tidak memegang komputer.
router.patch(
    "/:id/status",
    adminOrMechanic,
    validate(updateStatusSchema),
    orderController.updateStatus,
);

router.post("/:id/parts", adminOrMechanic, validate(addPartSchema), orderController.addPart);
router.delete(
    "/:id/parts/:usageId",
    adminOrMechanic,
    validate(removePartSchema),
    orderController.removePart,
);

router.post("/:id/payment", adminOnly, validate(paymentSchema), orderController.pay);

// Link tracking hanya boleh diputar ulang atau dicabut oleh admin.
router.post(
    "/:id/rotate-tracking-token",
    adminOnly,
    validate(orderIdSchema),
    orderController.rotateTracking,
);
router.post(
    "/:id/revoke-tracking-token",
    adminOnly,
    validate(orderIdSchema),
    orderController.revokeTracking,
);

export default router;
