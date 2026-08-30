import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const sentRequestSchema = new mongoose.Schema({
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

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
    avatar: {
        type: String,
        default: "",
    },
    about: {
        type: String,
        default: "Hey there! I am using chatSocial.",
    },
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    connectionRequests: [connectionRequestSchema],
    sentRequests: [sentRequestSchema],
    lastSeen: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Text index for fast user search by username, name, or email
userSchema.index({ username: "text", name: "text", email: "text" });

const userData = mongoose.model("User", userSchema);

export { userData, userData as User };
export default userData;
