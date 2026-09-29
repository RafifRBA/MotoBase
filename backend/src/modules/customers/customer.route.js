import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as orderController from "../service-orders/service-order.controller.js";
import * as vehicleController from "../vehicles/vehicle.controller.js";
import * as customerController from "./customer.controller.js";
import {
    createCustomerSchema,
    customerIdSchema,
    customerOrdersSchema,
    listCustomersSchema,
    updateCustomerSchema,
} from "./customer.validation.js";

const router = Router();

router.use(authenticate);

// Admin boleh mengubah, pemilik hanya melihat, mekanik tidak punya akses ke
// data pelanggan.
const canRead = authorize(ROLES.ADMIN, ROLES.OWNER);
const canWrite = authorize(ROLES.ADMIN);

router.get("/", canRead, validate(listCustomersSchema), customerController.list);
router.post("/", canWrite, validate(createCustomerSchema), customerController.create);
router.get("/:id", canRead, validate(customerIdSchema), customerController.getById);
router.patch("/:id", canWrite, validate(updateCustomerSchema), customerController.update);
router.get("/:id/vehicles", canRead, validate(customerIdSchema), vehicleController.listByCustomer);
router.get(
    "/:id/service-orders",
    canRead,
    validate(customerOrdersSchema),
    orderController.listByCustomer,
);

export default router;
