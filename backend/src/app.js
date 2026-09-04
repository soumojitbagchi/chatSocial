import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import express from "express"
import authRoutes from "./routes/auth.routes.js"
import roomRoutes from "./routes/room.routes.js"
import messageRoutes from "./routes/message.route.js"
import userRoutes from "./routes/user.routes.js"
import statusRoutes from "./routes/status.routes.js"
import callRoutes from "./routes/call.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors"
import errorHandler from "./middleware/error.middleware.js"
import { isRedisReady } from "./config/redis.js";

const app = express()

app.use(express.json());
app.use(cookieParser())
const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const cleanOrigin = origin.replace(/\/+$/, "").toLowerCase();
    if (cleanOrigin.startsWith("http://localhost:") || cleanOrigin.startsWith("http://127.0.0.1:")) {
        return true;
    }
    if (cleanOrigin.endsWith(".vercel.app") || cleanOrigin.includes("vercel.app")) {
        return true;
    }
    if (cleanOrigin.endsWith(".onrender.com") || cleanOrigin.includes("onrender.com")) {
        return true;
    }
    const allowedOrigins = (process.env.CLIENT_URL || "")
        .split(",")
        .map((s) => s.trim().replace(/\/+$/, "").toLowerCase())
        .filter(Boolean);

    if (allowedOrigins.includes(cleanOrigin)) {
        return true;
    }

    return false;
};

const corsOptions = {
    origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"],
    exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));

app.get("/health", (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    return res.status(200).json({
        success: true,
        status: "live",
        dependencies: {
            mongodb: mongoReady ? "ready" : "unavailable",
            redis: isRedisReady() ? "ready" : "degraded",
        },
    });
});

app.get("/health/ready", (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = isRedisReady();
    const ready = mongoReady && redisReady;

    return res.status(ready ? 200 : 503).json({
        success: ready,
        status: ready ? "ready" : "unavailable",
        dependencies: {
            mongodb: mongoReady ? "ready" : "unavailable",
            redis: redisReady ? "ready" : "unavailable",
        },
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/statuses", statusRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/call", callRoutes);

app.use(errorHandler)

export default app