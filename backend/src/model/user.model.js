import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    }, 
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
        minlength: 6,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

const userData = mongoose.model("User", userSchema);

export { userData, userData as User };
export default userData;
