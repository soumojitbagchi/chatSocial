import mongoose from "mongoose";
import dotenv from "dotenv";

if (!process.env.MONGO_URI) {
    dotenv.config();
    if (!process.env.MONGO_URI) {
        dotenv.config({ path: "backend/.env" });
    }
}

const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    try {
        await mongoose.connect(uri).then(()=>
            console.log("Connected to MongoDB")
        )
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
};

export default connectDB;
