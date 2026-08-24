import { Server } from "socket.io";
import { createServer } from "http";
import app from "../app.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
});
io.use((socket, next) => {
    console.log("Socket upgraded");
    next();
}); // DUMMY   



io.on("connection", (socket) => {
    console.log("User connected");
});

socket.on("disconnect", () => {
    console.log("User disconnected");
});

export default io;
