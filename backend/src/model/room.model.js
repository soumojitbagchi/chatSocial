import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
    roomname: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy:{
        type:String
    }
})

export const roomData = mongoose.model("Room", roomSchema)
