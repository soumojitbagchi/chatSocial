import dotenv from "dotenv";
dotenv.config();
import connectDB from "./src/config/connectDB.js";
import { createServer } from "http";
import app from "./src/app.js";
import { Server } from "socket.io";
import registerSocketHandler from "./src/sockets/index.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connectDB();

        const httpServer = createServer(app);
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

        const io = new Server(httpServer, {
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

        httpServer.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
