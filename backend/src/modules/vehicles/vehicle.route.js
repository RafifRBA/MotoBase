import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as orderController from "../service-orders/service-order.controller.js";
import * as vehicleController from "./vehicle.controller.js";
import {
    createVehicleSchema,
    listVehiclesSchema,
    updateVehicleSchema,
    vehicleIdSchema,
} from "./vehicle.validation.js";

const router = Router();

router.use(authenticate);

// Mekanik boleh melihat data kendaraan karena dibutuhkan saat mengerjakan
// servis, tapi tidak boleh mengubahnya.
const canRead = authorize(ROLES.ADMIN, ROLES.OWNER, ROLES.MECHANIC);
const canWrite = authorize(ROLES.ADMIN);

router.get("/", canRead, validate(listVehiclesSchema), vehicleController.list);
router.post("/", canWrite, validate(createVehicleSchema), vehicleController.create);
router.get("/:id", canRead, validate(vehicleIdSchema), vehicleController.getById);
router.patch("/:id", canWrite, validate(updateVehicleSchema), vehicleController.update);
router.get(
    "/:id/service-orders",
    canRead,
    validate(vehicleIdSchema),
    orderController.listByVehicle,
);

export default router;
