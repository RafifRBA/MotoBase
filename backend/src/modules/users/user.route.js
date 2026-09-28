import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "./user.model.js";
import * as userController from "./user.controller.js";
import {
    createUserSchema,
    listUsersSchema,
    updateUserSchema,
    updateUserStatusSchema,
    userIdSchema,
} from "./user.validation.js";

const router = Router();

// Seluruh route di bawah ini butuh login.
router.use(authenticate);

// Melihat daftar staf: pemilik dan admin (admin perlu tahu daftar mekanik saat
// menugaskan pekerjaan). Membuat dan mengubah akun: pemilik saja.
router.get(
    "/",
    authorize(ROLES.OWNER, ROLES.ADMIN),
    validate(listUsersSchema),
    userController.list,
);
router.get(
    "/:id",
    authorize(ROLES.OWNER, ROLES.ADMIN),
    validate(userIdSchema),
    userController.getById,
);
router.post("/", authorize(ROLES.OWNER), validate(createUserSchema), userController.create);
router.patch("/:id", authorize(ROLES.OWNER), validate(updateUserSchema), userController.update);
router.patch(
    "/:id/status",
    authorize(ROLES.OWNER),
    validate(updateUserStatusSchema),
    userController.updateStatus,
);

export default router;
