import { Customer } from "./customer.model.js";

export const customerRepository = {
    findById: (id) => Customer.findById(id),

    findByPhone: (phone) => Customer.findOne({ phone }),

    findByUserId: (userId) => Customer.findOne({ userId }),

    list: (filter, { skip, limit }) =>
        Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    count: (filter) => Customer.countDocuments(filter),

    create: (data) => Customer.create(data),
};
