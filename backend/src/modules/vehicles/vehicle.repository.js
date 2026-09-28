import { Vehicle } from "./vehicle.model.js";

export const vehicleRepository = {
    findById: (id) => Vehicle.findById(id),

    findByPlate: (licensePlateNormalized) => Vehicle.findOne({ licensePlateNormalized }),

    list: (filter, { skip, limit }) =>
        Vehicle.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    listByCustomer: (customerId) => Vehicle.find({ customerId }).sort({ createdAt: -1 }),

    count: (filter) => Vehicle.countDocuments(filter),

    create: (data) => Vehicle.create(data),
};
