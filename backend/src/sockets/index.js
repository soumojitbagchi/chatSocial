import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import messageHandlers from "./handlers/message.handlers.js";
import roomHandler from "./handlers/room.handlers.js";
import presentHandler from "./handlers/present.handler.js";
import callHandlers from "./handlers/call.handlers.js";
const registerSocketHandler = (io) => {
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '') ||
                null;

            if (token && process.env.JWT_KEY) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_KEY);
                    socket.user = {
                        id: decoded.id || decoded._id,
                        username: decoded.username || decoded.name || "User",
                        email: decoded.email,
                    };
                    return next();
                } catch {
                    return next(new Error("Unauthorized: Invalid token"));
                }
            }

            // No token supplied — allow query fallback (used by older clients).
            // A supplied-but-invalid token above already fails closed.

            const queryUserId = socket.handshake.query?.userId;
            const queryUsername = socket.handshake.query?.username;
            if (queryUserId && typeof queryUserId === "string" && mongoose.Types.ObjectId.isValid(queryUserId)) {
                socket.user = {
                    id: queryUserId,
                    username: queryUsername || "User_" + queryUserId.slice(-4),
                };
                return next();
            }

            if (!socket.user) {
                socket.user = {
                    id: socket.id,
                    username: "User_" + socket.id.slice(0, 5),
                };
            }
            next();
        } catch {
            socket.user = {
                id: socket.id,
                username: "User_" + socket.id.slice(0, 5),
            };
            next();
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id} (user: ${socket.user?.username} / id: ${socket.user?.id})`);
        presentHandler(io, socket);
        messageHandlers(io, socket);
        roomHandler(io, socket);
        callHandlers(io, socket);
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            io.emit("userDisconnected", socket.id);
        });
    });
};

export default registerSocketHandler;
