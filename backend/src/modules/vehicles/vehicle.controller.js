import { toVehicleResponse } from "./vehicle.mapper.js";
import * as vehicleService from "./vehicle.service.js";

export const list = async (req, res) => {
    const { vehicles, meta } = await vehicleService.listVehicles(req.validated.query);

    return res.status(200).json({
        success: true,
        data: vehicles.map(toVehicleResponse),
        meta,
    });
};

export const getById = async (req, res) => {
    const vehicle = await vehicleService.getVehicleById(req.validated.params.id);
    return res.status(200).json({ success: true, data: toVehicleResponse(vehicle) });
};

export const create = async (req, res) => {
    const vehicle = await vehicleService.createVehicle(req.validated.body, req.user);

    return res.status(201).json({
        success: true,
        message: "Kendaraan berhasil dibuat",
        data: toVehicleResponse(vehicle),
    });
};

export const update = async (req, res) => {
    const vehicle = await vehicleService.updateVehicle(
        req.validated.params.id,
        req.validated.body,
        req.user,
    );

    return res.status(200).json({
        success: true,
        message: "Kendaraan berhasil diperbarui",
        data: toVehicleResponse(vehicle),
    });
};

export const listByCustomer = async (req, res) => {
    const vehicles = await vehicleService.listVehiclesByCustomer(req.validated.params.id);

    return res.status(200).json({
        success: true,
        data: vehicles.map(toVehicleResponse),
    });
};
