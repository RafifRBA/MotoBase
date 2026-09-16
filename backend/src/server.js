import dotenv from "dotenv"

import app from "./app.js";
import { connectDB } from "./config/db.js";
dotenv.config();

const PORT = process.env.PORT

async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
    });
}

startServer();