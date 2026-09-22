import { env } from "./config/env.js";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";

async function startServer() {
    await connectDB();

    app.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, `Server berhasil berjalan di http://localhost:${env.PORT}`);
    });
}

startServer();
