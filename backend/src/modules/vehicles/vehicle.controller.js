import { Vehicle } from "./vehicle.model.js";
import { formatRef } from "../../utils/ref.js";
import * as vehicleService from "./vehicle.service.js";

const VEHICLE_POPULATE_PATHS = [{ path: "customerId", select: "name" }];

export const toVehicleResponse = (vehicle) => ({
    id: vehicle.id,
    customerId: formatRef(vehicle.customerId, ["name"]),
    licensePlate: vehicle.licensePlate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ?? null,
    color: vehicle.color ?? null,
    chassisNumber: vehicle.chassisNumber ?? null,
    engineNumber: vehicle.engineNumber ?? null,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
});

export const list = async (req, res) => {
    const { vehicles, meta } = await vehicleService.listVehicles(req.validated.query);

    await Vehicle.populate(vehicles, VEHICLE_POPULATE_PATHS);

    return res.status(200).json({
        success: true,
        data: vehicles.map(toVehicleResponse),
        meta,
    });
};

export const getById = async (req, res) => {
    const vehicle = await vehicleService.getVehicleById(req.validated.params.id);

    await vehicle.populate(VEHICLE_POPULATE_PATHS);

    return res.status(200).json({ success: true, data: toVehicleResponse(vehicle) });
};

export const create = async (req, res) => {
    const vehicle = await vehicleService.createVehicle(req.validated.body, req.user);

    await vehicle.populate(VEHICLE_POPULATE_PATHS);

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

    await vehicle.populate(VEHICLE_POPULATE_PATHS);

    return res.status(200).json({
        success: true,
        message: "Kendaraan berhasil diperbarui",
        data: toVehicleResponse(vehicle),
    });
};

export const listByCustomer = async (req, res) => {
    const vehicles = await vehicleService.listVehiclesByCustomer(req.validated.params.id);

    await Vehicle.populate(vehicles, VEHICLE_POPULATE_PATHS);

    return res.status(200).json({
        success: true,
        data: vehicles.map(toVehicleResponse),
    });
};
