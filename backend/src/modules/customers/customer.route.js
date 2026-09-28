import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as orderController from "../service-orders/service-order.controller.js";
import * as vehicleController from "../vehicles/vehicle.controller.js";
import * as customerController from "./customer.controller.js";
import * as selfController from "./customer-self.controller.js";
import {
    claimOrderSchema,
    createCustomerSchema,
    customerIdSchema,
    customerOrdersSchema,
    linkUserSchema,
    listCustomersSchema,
    myOrderDetailSchema,
    myOrdersSchema,
    updateCustomerSchema,
    updateOwnCustomerSchema,
} from "./customer.validation.js";

const router = Router();

router.use(authenticate);

// SPEC 6.1: admin boleh mengubah, owner hanya melihat, mekanik tidak boleh
// mengakses data pelanggan sama sekali.
const canRead = authorize(ROLES.ADMIN, ROLES.OWNER);
const canWrite = authorize(ROLES.ADMIN);
const customerOnly = authorize(ROLES.CUSTOMER);

// Route "/me" HARUS didaftarkan sebelum "/:id", kalau tidak Express membaca
// "me" sebagai nilai parameter :id dan validasi ObjectId menolaknya.
router.get("/me", customerOnly, selfController.getMe);
router.patch("/me", customerOnly, validate(updateOwnCustomerSchema), selfController.updateMe);
router.get("/me/vehicles", customerOnly, selfController.myVehicles);
router.get("/me/service-orders", customerOnly, validate(myOrdersSchema), selfController.myOrders);
router.get(
    "/me/service-orders/:orderId",
    customerOnly,
    validate(myOrderDetailSchema),
    selfController.myOrderDetail,
);
router.post(
    "/me/claim-service-order",
    customerOnly,
    validate(claimOrderSchema),
    selfController.claimServiceOrder,
);

router.get("/", canRead, validate(listCustomersSchema), customerController.list);
router.post("/", canWrite, validate(createCustomerSchema), customerController.create);
router.get("/:id", canRead, validate(customerIdSchema), customerController.getById);
router.patch("/:id", canWrite, validate(updateCustomerSchema), customerController.update);
router.get("/:id/vehicles", canRead, validate(customerIdSchema), vehicleController.listByCustomer);
// Dipakai admin setelah memverifikasi identitas pelanggan di bengkel.
router.post("/:id/link-user", canWrite, validate(linkUserSchema), selfController.linkUser);
router.get(
    "/:id/service-orders",
    canRead,
    validate(customerOrdersSchema),
    orderController.listByCustomer,
);

export default router;
