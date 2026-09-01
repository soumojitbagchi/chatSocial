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

const profileSchema = new mongoose.Schema({
    displayName: {
        type: String,
        trim: true,
        default: "",
    },
    bio: {
        type: String,
        trim: true,
        default: "Building clean, fast, and delightful interfaces ⚡",
    },
    phone: {
        type: String,
        trim: true,
        default: "+1 (555) 234-5678",
    },
    statusMessage: {
        type: String,
        trim: true,
        default: "Available",
    },
    location: {
        type: String,
        trim: true,
        default: "",
    },
    website: {
        type: String,
        trim: true,
        default: "",
    },
    bannerUrl: {
        type: String,
        default: "",
    },
    theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "dark",
    },
    notifications: {
        sound: { type: Boolean, default: true },
        desktop: { type: Boolean, default: true },
        readReceipts: { type: Boolean, default: true },
    },
}, { _id: false });

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
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
        default: null,
        index: true,
    },
    emailVerificationExpires: {
        type: Date,
        default: null,
    },
    emailOtp: {
        type: String,
        default: null,
    },
    emailOtpExpires: {
        type: Date,
        default: null,
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
    phone: {
        type: String,
        trim: true,
        default: "+1 (555) 234-5678",
    },
    profile: {
        type: profileSchema,
        default: () => ({}),
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

export { userData, userData as User, profileSchema };
export default userData;
