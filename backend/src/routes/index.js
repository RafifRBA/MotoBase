import { Router } from "express";

import authRouter from "../modules/auth/auth.route.js";
import publicTrackingRouter from "../modules/service-orders/public-tracking.route.js";
import customerRouter from "../modules/customers/customer.route.js";
import serviceOrderRouter from "../modules/service-orders/service-order.route.js";
import reportRouter from "../modules/reports/report.route.js";
import sparePartRouter from "../modules/spare-parts/spare-part.route.js";
import stockMovementRouter from "../modules/stock-movements/stock-movement.route.js";
import userRouter from "../modules/users/user.route.js";
import vehicleRouter from "../modules/vehicles/vehicle.route.js";

const router = Router();

router.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "MotoBase API berjalan...",
    });
});

router.use("/public", publicTrackingRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/customers", customerRouter);
router.use("/vehicles", vehicleRouter);
router.use("/service-orders", serviceOrderRouter);
router.use("/spare-parts", sparePartRouter);
router.use("/stock-movements", stockMovementRouter);
router.use("/reports", reportRouter);

export default router;
