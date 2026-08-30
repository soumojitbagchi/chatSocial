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

const app = express()

app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

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