import ApiError from "../../utils/api-error.js";
import logger from "../../utils/logger.js";
import { buildMeta, escapeRegExp, toSkip } from "../../utils/pagination.js";
import { getCustomerById } from "../customers/customer.service.js";
import { normalizeLicensePlate } from "./vehicle.model.js";
import { vehicleRepository } from "./vehicle.repository.js";

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
        vehicleRepository.list(filter, { skip: toSkip(query), limit: query.limit }),
        vehicleRepository.count(filter),
    ]);

    return { vehicles, meta: buildMeta({ ...query, total }) };
};

export const getVehicleById = async (id) => {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) throw notFound();
    return vehicle;
};

export const listVehiclesByCustomer = async (customerId) => {
    // Memastikan pelanggannya benar-benar ada, supaya id ngawur menghasilkan
    // 404 yang jelas, bukan daftar kosong yang membingungkan.
    await getCustomerById(customerId);
    return vehicleRepository.listByCustomer(customerId);
};

export const createVehicle = async (data, actor) => {
    await getCustomerById(data.customerId);

    const licensePlateNormalized = normalizeLicensePlate(data.licensePlate);
    if (await vehicleRepository.findByPlate(licensePlateNormalized)) throw plateTaken();

    const vehicle = await vehicleRepository.create({ ...data, licensePlateNormalized });

    logger.info({ actorId: actor.id, vehicleId: vehicle.id }, "Kendaraan dibuat");
    return vehicle;
};

export const updateVehicle = async (id, data, actor) => {
    const vehicle = await getVehicleById(id);

    if (data.customerId) await getCustomerById(data.customerId);

    if (data.licensePlate) {
        const licensePlateNormalized = normalizeLicensePlate(data.licensePlate);
        const existing = await vehicleRepository.findByPlate(licensePlateNormalized);
        if (existing && existing.id !== vehicle.id) throw plateTaken();
        vehicle.licensePlateNormalized = licensePlateNormalized;
    }

    Object.assign(vehicle, data);
    await vehicle.save();

    logger.info({ actorId: actor.id, vehicleId: vehicle.id }, "Kendaraan diperbarui");
    return vehicle;
};
