import express from "express";
import { createServer } from "http";
import app from "./src/app.js";
import dotenv from "dotenv";
import connectDB from "./src/config/connectDB.js"
import { Server } from "socket.io";

dotenv.config();
connectDB()

const httpServer = createServer(app); // Create HTTP server
const io = new Server(httpServer,{
    cors: {
        origin: ["http://localhost:5173", "http://localhost:8080"]
    }
})

io.on("connection", (socket) => {
    console.log("User connected"); // Log when a user connects
});

httpServer.listen(8080, () => {
    console.log("Server is running on port 8080");
});