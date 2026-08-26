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
        const io = new Server(httpServer, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:5173",
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
