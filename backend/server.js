import dotenv from "dotenv";
dotenv.config();

import connectDB from "./src/config/connectDB.js";
import express from "express";
import { createServer } from "http";
import app from "./src/app.js"; 
import { Server } from "socket.io";
const PORT = process.env.PORT || 8080;

connectDB();



const httpServer = createServer(app); // Create HTTP server
const io = new Server(httpServer)

io.on("connection", (socket) => {
    console.log("User connected"); // Log when a user connects
});

const count = io.engine.clientsCount; // gives no. of user connected
console.log(`Number of connected clients: ${count}`);

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});