
const onlineUsers = new Map();

const presentHandler = (io, socket) => {
    const userId = socket.user?.id || socket.user?._id?.toString() || socket.id;
    const username = socket.user?.username || socket.user?.name || "Anonymous";

    socket.on("online", () => {
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
            socket.broadcast.emit("user:online", { userId, username });
        }
        onlineUsers.get(userId).add(socket.id);
        socket.emit("users:online-list", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", () => {
        if (onlineUsers.has(userId)) {
            const userSockets = onlineUsers.get(userId);
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);
                io.emit("user:offline", { userId, username });
            }
        }
    });
};

export default presentHandler;