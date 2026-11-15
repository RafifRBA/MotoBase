import mongoose from "mongoose";

export const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    MECHANIC: "MECHANIC",
    OWNER: "OWNER",
    CUSTOMER: "CUSTOMER",
});

// Role yang bekerja di bengkel. CUSTOMER sengaja tidak termasuk.
export const STAFF_ROLES = Object.freeze([ROLES.ADMIN, ROLES.MECHANIC, ROLES.OWNER]);

const emptyToUndefined = (value) => {
    return value === null || (typeof value === "string" && value.trim() === "") ? undefined : value;
};

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            set: emptyToUndefined,
        },
        phone: {
            type: String,
            trim: true,
            set: emptyToUndefined,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            required: true,
            enum: Object.values(ROLES),
        },
        // Hanya terisi untuk akun CUSTOMER: menautkan akun ke data pelanggannya.
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        phoneVerifiedAt: {
            type: Date,
        },
        lastLoginAt: {
            type: Date,
        },
    },

    { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ customerId: 1 }, { unique: true, sparse: true });

export const User = mongoose.model("User", userSchema);
