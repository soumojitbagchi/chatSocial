import express from "express"
import authRoutes from "./routes/auth.routes.js"
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

app.use("/api/auth", authRoutes)

app.use(errorHandler)

export default app