import messageHandlers from "./handlers/message.handlers.js";
import roomHandler from "./handlers/room.handlers.js";
import presentHandler from "./handlers/present.handler.js";

const registerSocketHandler = (io) => {
    io.use((socket, next) => {
        if (!socket.user) {
            socket.user = {
                id: socket.id,
                username: "User_" + socket.id.slice(0, 5),
            };
        }
        next();
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);
        presentHandler(io, socket);
        messageHandlers(io, socket);
        roomHandler(io, socket);
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
            io.emit("userDisconnected", socket.id);
        });
    });
};

export default registerSocketHandler;
