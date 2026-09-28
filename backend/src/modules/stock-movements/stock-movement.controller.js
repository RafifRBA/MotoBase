import { toStockMovementResponse } from "./stock-movement.mapper.js";
import * as movementService from "./stock-movement.service.js";

export const list = async (req, res) => {
    const { movements, meta } = await movementService.listMovements(req.validated.query);

    return res.status(200).json({
        success: true,
        data: movements.map(toStockMovementResponse),
        meta,
    });
};
