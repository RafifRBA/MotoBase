import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { getCustomerById } from "../customers/customer.service.js";
import { Vehicle, normalizeLicensePlate } from "./vehicle.model.js";

const notFound = () => new ApiError(404, "VEHICLE_NOT_FOUND", "Kendaraan tidak ditemukan");

const plateTaken = () =>
    new ApiError(409, "LICENSE_PLATE_ALREADY_USED", "Plat nomor sudah terdaftar");

export const listVehicles = async (query) => {
    const filter = {};
    if (query.customerId) filter.customerId = query.customerId;
    if (query.search) {
        filter.licensePlateNormalized = new RegExp(
            escapeRegExp(normalizeLicensePlate(query.search)),
            "i",
        );
    }

    const [vehicles, total] = await Promise.all([
        Vehicle.find(filter).sort({ createdAt: -1 }).skip(toSkip(query)).limit(query.limit),
        Vehicle.countDocuments(filter),
    ]);

    return { vehicles, meta: buildMeta({ ...query, total }) };
};

export const getVehicleById = async (id) => {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) throw notFound();
    return vehicle;
};

export const listVehiclesByCustomer = async (customerId) => {
    // Pelanggannya dipastikan ada dulu, supaya id ngawur menghasilkan 404 yang
    // jelas, bukan daftar kosong yang membingungkan.
    await getCustomerById(customerId);
    return Vehicle.find({ customerId }).sort({ createdAt: -1 });
};

export const createVehicle = async (data, actor) => {
    await getCustomerById(data.customerId);

    const licensePlateNormalized = normalizeLicensePlate(data.licensePlate);
    if (await Vehicle.findOne({ licensePlateNormalized })) throw plateTaken();

    const vehicle = await Vehicle.create({ ...data, licensePlateNormalized });

    logger.info({ actorId: actor.id, vehicleId: vehicle.id }, "Kendaraan dibuat");
    return vehicle;
};

export const updateVehicle = async (id, data, actor) => {
    const vehicle = await getVehicleById(id);

    if (data.customerId) await getCustomerById(data.customerId);

    if (data.licensePlate) {
        const licensePlateNormalized = normalizeLicensePlate(data.licensePlate);
        const existing = await Vehicle.findOne({ licensePlateNormalized });
        if (existing && existing.id !== vehicle.id) throw plateTaken();
        vehicle.licensePlateNormalized = licensePlateNormalized;
    }

    Object.assign(vehicle, data);
    await vehicle.save();

    logger.info({ actorId: actor.id, vehicleId: vehicle.id }, "Kendaraan diperbarui");
    return vehicle;
};
