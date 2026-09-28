import { User } from "./user.model.js";

export const userRepository = {
    findById: (id) => User.findById(id),

    findByEmail: (email) => User.findOne({ email }),

    findByPhone: (phone) => User.findOne({ phone }),

    // Satu-satunya tempat yang boleh mengambil passwordHash. Namanya sengaja
    // panjang supaya jelas bahwa hasilnya membawa data sensitif.
    findByEmailWithPassword: (email) => User.findOne({ email }).select("+passwordHash"),

    existsByRole: (role) => User.exists({ role }),

    list: (filter, { skip, limit }) =>
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    count: (filter) => User.countDocuments(filter),

    create: (data) => User.create(data),

    updateLastLogin: (id, date) => User.updateOne({ _id: id }, { $set: { lastLoginAt: date } }),
};
