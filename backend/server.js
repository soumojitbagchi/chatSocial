import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDB from "./src/config/connectDB.js";
import { closeRedis, connectRedis, startRedisAutoReconnect } from "./src/config/redis.js";
import { createServer } from "http";
import app from "./src/app.js";
import { Server } from "socket.io";
import registerSocketHandler from "./src/sockets/index.js";

const PORT = process.env.PORT || 8080;
const SHUTDOWN_TIMEOUT_MS = 10000;

let httpServer = null;
let io = null;
let isShuttingDown = false;

const closeHttpServer = () => new Promise((resolve) => {
    if (!httpServer?.listening) return resolve();
    httpServer.close(() => resolve());
});

const closeSocketServer = () => new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
});

const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received; shutting down`);

    const forceExitTimer = setTimeout(() => {
        console.error("Graceful shutdown timed out");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    try {
        await closeSocketServer();
        await closeHttpServer();
        await Promise.allSettled([
            closeRedis(),
            mongoose.disconnect(),
        ]);
        clearTimeout(forceExitTimer);
        process.exit(0);
    } catch (error) {
        clearTimeout(forceExitTimer);
        console.error("Graceful shutdown failed:", error);
        process.exit(1);
    }
};

const startServer = async () => {
    try {
        await connectDB();
        try {
            await connectRedis();
        } catch (redisError) {
            console.error("[redis] Initial connection failed, running in degraded cache mode:", redisError.message);
        }
        // Always run background reconnect: if the client later exhausts its
        // 6 retry attempts and gives up, this creates a fresh client every
        // 15s so Redis recovers without a process restart. Auth stays up
        // meanwhile via Mongo fallback (see auth.controller fallbacks).
        startRedisAutoReconnect();
        httpServer = createServer(app);
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

            return allowedOrigins.includes(cleanOrigin);
        };

        io = new Server(httpServer, {
            cors: {
                origin: function (origin, callback) {
                    if (isAllowedOrigin(origin)) {
                        return callback(null, true);
                    }
                    return callback(new Error("Not allowed by CORS"));
                },
                credentials: true,
            },
        });

        registerSocketHandler(io);

        await new Promise((resolve, reject) => {
            httpServer.once("error", reject);
            httpServer.listen(PORT, () => {
                httpServer.off("error", reject);
                console.log(`Server is running on port ${PORT}`);
                resolve();
            });
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        await Promise.allSettled([
            closeRedis(),
            mongoose.disconnect(),
        ]);
        process.exit(1);
    }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startServer();
