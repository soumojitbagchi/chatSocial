import Message from "../../model/message.model.js";

const messageHandlers = (io, socket) => {
    const currentUserId = socket.user?.id || socket.user?._id?.toString() || socket.id;

    socket.on("sendMessage", async ({ roomId, text, message } = {}) => {
        try {
            const messageText = (text || message || "").trim();

            if (!roomId || !messageText) {
                return socket.emit("message:error", { message: "Room ID and message text are required" });
            }

            const savedMessage = await Message.create({
                userId: currentUserId,
                roomId,
                text: messageText,
            });

            const populatedMessage = await savedMessage.populate("userId", "name username");
            io.to(roomId).emit("receiveMessage", populatedMessage);
        } catch (error) {
            console.error("Error in sendMessage:", error);
            socket.emit("message:error", { message: error.message || "Failed to send message" });
        }
    });

    socket.on("editMessage", async ({ messageId, newMessage, text } = {}) => {
        try {
            const updatedText = (newMessage || text || "").trim();

            if (!messageId || !updatedText) {
                return socket.emit("message:error", { message: "Message ID and updated text are required" });
            }

            const targetMessage = await Message.findById(messageId);
            if (!targetMessage) {
                return socket.emit("message:error", { message: "Message not found" });
            }

            if (targetMessage.userId.toString() !== currentUserId.toString()) {
                return socket.emit("message:error", { message: "Unauthorized to edit this message" });
            }

            targetMessage.text = updatedText;
            targetMessage.edited = true;
            await targetMessage.save();

            const populated = await targetMessage.populate("userId", "name username");
            const roomId = targetMessage.roomId.toString();
            io.to(roomId).emit("messageUpdated", populated);
        } catch (error) {
            console.error("Error in editMessage:", error);
            socket.emit("message:error", { message: error.message || "Failed to edit message" });
        }
    });

    socket.on("deleteMessage", async ({ messageId } = {}) => {
        try {
            if (!messageId) {
                return socket.emit("message:error", { message: "Message ID is required" });
            }

            const targetMessage = await Message.findById(messageId);
            if (!targetMessage) {
                return socket.emit("message:error", { message: "Message not found" });
            }

            if (targetMessage.userId.toString() !== currentUserId.toString()) {
                return socket.emit("message:error", { message: "You are not authorized to delete this message" });
            }

            const roomId = targetMessage.roomId.toString();
            await Message.findByIdAndDelete(messageId);

            io.to(roomId).emit("messageDeleted", { messageId, roomId });
        } catch (error) {
            console.error("Error in deleteMessage:", error);
            socket.emit("message:error", { message: error.message || "Failed to delete message" });
        }
    });
};

export default messageHandlers;
