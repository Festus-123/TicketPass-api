import express from "express";
import cors from "cors";
import authRoutes from "../routes/authRoutes.js";
import eventRoutes from "../routes/eventRoutes.js";
import errorHandlerMiddleware from "../middlewares/errorandlerMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/events", eventRoutes);

app.use(errorHandlerMiddleware);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}...`));
