export const toVehicleResponse = (vehicle) => ({
    id: vehicle.id,
    customerId: vehicle.customerId.toString(),
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
