import Message from "../../model/message.model.js";

let messageIdCount = 1;

const messageHandlers = (io, socket) => {
    const currentUserId = socket.user?.id || socket.user?._id?.toString() || socket.id;

    socket.on("sendMessage", async ({ roomId, text, message, user }) => {
        try {
            const messageText = text || message;
            const senderId = user?._id || user?.id || currentUserId;

            if (!roomId || !messageText) {
                return socket.emit("error", { message: "Room ID and message text are required" });
            }

            const savedMessage = await Message.create({
                messageId: messageIdCount++,
                userId: senderId,
                roomId,
                text: messageText,
                timestamp: new Date(),
            });

            const populatedMessage = await savedMessage.populate("userId", "name username");
            io.to(roomId).emit("receiveMessage", populatedMessage);
        } catch (error) {
            console.error("Error in sendMessage:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    socket.on("editMessage", async ({ messageId, newMessage, user }) => {
        try {
            const requesterId = user?._id || user?.id || user || currentUserId;

            if (!messageId || !newMessage) {
                return socket.emit("error", { message: "Invalid message data" });
            }

            const targetMessage = await Message.findById(messageId);
            if (!targetMessage) {
                return socket.emit("error", { message: "Message not found" });
            }

            if (targetMessage.userId.toString() !== requesterId.toString()) {
                return socket.emit("error", { message: "Unauthorized to edit this message" });
            }

            targetMessage.text = newMessage;
            targetMessage.edited = true;
            await targetMessage.save();

            const populated = await targetMessage.populate("userId", "name username");
            const roomId = targetMessage.roomId.toString();
            io.to(roomId).emit("receiveMessage", populated);
            io.to(roomId).emit("messageUpdated", populated);
        } catch (error) {
            console.error("Error in editMessage:", error);
            socket.emit("error", { message: "Failed to edit message" });
        }
    });

    socket.on("deleteMessage", async ({ messageId, user }) => {
        try {
            const requesterId = user?._id || user?.id || user || currentUserId;

            if (!messageId) {
                return socket.emit("error", { message: "Invalid message data" });
            }

            const targetMessage = await Message.findById(messageId);
            if (!targetMessage) {
                return socket.emit("error", { message: "Message not found" });
            }

            if (targetMessage.userId.toString() !== requesterId.toString()) {
                return socket.emit("error", { message: "You are not authorized to delete this message" });
            }

            const roomId = targetMessage.roomId.toString();
            await Message.findByIdAndDelete(messageId);

            io.to(roomId).emit("messageDeleted", { messageId });
        } catch (error) {
            console.error("Error in deleteMessage:", error);
            socket.emit("error", { message: "Failed to delete message" });
        }
    });
};

export default messageHandlers;