import mongoose from "mongoose";

export const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    MECHANIC: "MECHANIC",
    OWNER: "OWNER",
    CUSTOMER: "CUSTOMER",
});

const emptyToUndefined = (value) => {
    return (
        value === null || (typeof value === 'string' && value.trim() === "")
        ? undefined : value
    )
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
userSchema.index({ role: 1, isActive: 1});

export const User = mongoose.model("User", userSchema);
