import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
    {
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        callId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["audio", "video"],
            default: "audio",
        },
        status: {
            type: String,
            enum: ["completed", "missed", "rejected", "busy", "failed"],
            default: "completed",
        },
        duration: {
            type: Number,
            default: 0,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model("Call", callSchema);

export default Call;
