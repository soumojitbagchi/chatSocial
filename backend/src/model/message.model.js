import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            default: "text",
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        edited: {
            type: Boolean,
            default: false,
        },
        deleted: {
            type: Boolean,
            default: false,
        },
        deletedFor: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageSchema);

export { Message };
export default Message;
