import mongoose from "mongoose";

import { env } from "./env.js";
import logger from "../utils/logger.js";

export const connectDB = async () => {
    try {
        await mongoose.connect(env.MONGODB_URI);
        logger.info("MongoDB Atlas connected...");
    } catch (error) {
        logger.error({ err: error }, "MongoDB connection failed");
        process.exit(1);
    }
};
