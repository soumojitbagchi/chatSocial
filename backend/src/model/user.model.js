import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }, 
    username:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true,
        select: false,
        minlength: 6
    }
}, {
    timestamps: true
})

const userData = mongoose.model("User", userSchema)

export default userData
