import * as messageService from "../../service/message.service.js";

const messageHandlers = (io, socket) => {
    const currentUserId = socket.user?.id || socket.user?._id?.toString() || socket.id;

    // Send message ,
    socket.on("sendMessage", async ({ roomId, text, message } = {}) => {
        try {
            const content = text || message;
            const savedMessage = await messageService.createMessage({
                userId: currentUserId,
                roomId,
                text: content,
            });

            io.to(roomId).emit("receiveMessage", savedMessage);
        } catch (error) {
            console.error("Error in sendMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to send message" });
        }
    });

    // Edit message
    socket.on("editMessage", async ({ messageId, newMessage, text } = {}) => {
        try {
            const content = newMessage || text;
            const updatedMessage = await messageService.updateMessage({
                messageId,
                userId: currentUserId,
                text: content,
            });

            const roomId = updatedMessage.roomId.toString();
            io.to(roomId).emit("messageUpdated", updatedMessage);
        } catch (error) {
            console.error("Error in editMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to edit message" });
        }
    });

    // Delete message (soft delete)
    socket.on("deleteMessage", async ({ messageId } = {}) => {
        try {
            const deletedMessage = await messageService.deleteMessage({
                messageId,
                userId: currentUserId,
            });

            const roomId = deletedMessage.roomId.toString();
            io.to(roomId).emit("messageDeleted", {
                messageId,
                roomId,
                message: deletedMessage,
            });
        } catch (error) {
            console.error("Error in deleteMessage:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to delete message" });
        }
    });

    // Fetch message history for a room
    socket.on("getMessages", async ({ roomId, limit, page } = {}) => {
        try {
            const messages = await messageService.getAllMessages({ roomId, limit, page });
            socket.emit("messages:list", { roomId, messages });
        } catch (error) {
            console.error("Error in getMessages:", error.message);
            socket.emit("message:error", { message: error.message || "Failed to fetch messages" });
        }
    });
};

export default messageHandlers;
