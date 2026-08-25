import mongoose from "mongoose"

const roomSchema = new mongoose.Schema(
    {
        roomname: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        createdBy: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Room = mongoose.model("Room", roomSchema);

export { Room, Room as roomData };
export default Room;
