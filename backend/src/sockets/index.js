import messageHandlers from "./handlers/message.handlers.js";
import roomHandler from "./handlers/room.handlers.js";
import presentHandler from "./handlers/present.handler.js";

const registerSocketHandler = (io)=>{

    io.use((socket,next)=>{
        console.log("socket updated")
        next()
    })

    io.on("connection", (socket) => {
        console.log("User connected");
        presentHandler(io,socket);
        messageHandlers(io,socket);
        roomHandler(io,socket);
        socket.on("disconnect", () => {
            console.log("User disconnected");
            io.emit("userDisconnected", socket.id);
        });
    });    
}





export default io;
