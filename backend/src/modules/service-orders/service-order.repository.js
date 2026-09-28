import { ServiceOrder } from "./service-order.model.js";

export const serviceOrderRepository = {
    findById: (id, session = null) => ServiceOrder.findById(id).session(session),

    findByTrackingHash: (trackingTokenHash) => ServiceOrder.findOne({ trackingTokenHash }),

    list: (filter, { skip, limit }) =>
        ServiceOrder.find(filter)
            .sort({ serviceDate: -1, queueNumber: -1 })
            .skip(skip)
            .limit(limit),

    listByVehicle: (vehicleId) => ServiceOrder.find({ vehicleId }).sort({ serviceDate: -1 }),

    listByCustomer: (customerId, { skip, limit }) =>
        ServiceOrder.find({ customerId }).sort({ serviceDate: -1 }).skip(skip).limit(limit),

    count: (filter) => ServiceOrder.countDocuments(filter),

    create: (data, session = null) => ServiceOrder.create([data], { session }).then(([doc]) => doc),
};
