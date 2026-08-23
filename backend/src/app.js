import express from "express"
import authRoutes from "./routes/auth.routes.js"

const app = express()

app.use("/api/auth", authRoutes)

export default app