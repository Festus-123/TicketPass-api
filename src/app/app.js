import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import PinoHttp from "pino-http";

import authRoutes from "../routes/authRoutes.js";
import eventRoutes from "../routes/eventRoutes.js";
import bookingRoutes from "../routes/bookingRoutes.js";
import errorHandlerMiddleware from "../middlewares/errorandlerMiddleware.js";

const app = express()

// Allow all origins (or configure specifically for your mobile app)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));  

app.use(express.json());
app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
});

app.use(limiter);
app.use(PinoHttp());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" })); 

app.use("/api/v1/auth", authRoutes)
app.use("/api/v1/events", eventRoutes)
app.use("/api/v1/bookings", bookingRoutes)

app.use(errorHandlerMiddleware)

export default app;