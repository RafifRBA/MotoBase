import cors from "cors";
import express from "express"

import apiRouter from "./routes/index.js"

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) =>{
    res.status(200).json({
        success: true,
        status: "healthy",
        timestamp: new Date().toISOString(),
    });
});

app.use("/api/v1", apiRouter);

export default app;