import { Router } from "express";

import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { validate } from "../../middlewares/validate.js";
import { ROLES } from "../users/user.model.js";
import * as requestController from "./service-request.controller.js";
import { listRequestsSchema, reviewRequestSchema } from "./service-request.validation.js";

const router = Router();

router.use(authenticate);

router.get(
    "/",
    authorize(ROLES.ADMIN, ROLES.OWNER),
    validate(listRequestsSchema),
    requestController.list,
);
router.patch(
    "/:id",
    authorize(ROLES.ADMIN),
    validate(reviewRequestSchema),
    requestController.review,
);

export default router;
