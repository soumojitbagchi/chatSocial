import mongoose from "mongoose";

const viewerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        viewedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const statusSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        mediaUrl: {
            type: String,
            default: "",
        },
        fileId: {
            type: String,
            default: null,
        },
        mediaType: {
            type: String,
            enum: ["image", "video", "text"],
            default: "image",
        },
        caption: {
            type: String,
            trim: true,
            default: "",
            maxlength: 1000,
        },
        backgroundColor: {
            type: String,
            default: "#12151b",
        },
        fontStyle: {
            type: String,
            default: "sans-serif",
        },
        viewers: [viewerSchema],
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
        },
    },
    {
        timestamps: true,
    }
);

// MongoDB TTL Index: automatically purge expired documents from the database
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
statusSchema.index({ userId: 1, createdAt: -1 });

const Status = mongoose.model("Status", statusSchema);

export { Status };
export default Status;
