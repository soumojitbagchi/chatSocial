/**
 * Presence Service
 * Manages online user presence and maps userIds to active socketIds.
 */

// userId -> Set<socketId>
const onlineUsers = new Map();
// socketId -> userId
const socketToUser = new Map();

export const addOnlineUser = (userId, socketId) => {
    if (!userId || !socketId) return { isFirstSocket: false };
    const strUserId = String(userId);
    const strSocketId = String(socketId);

    const isFirstSocket = !onlineUsers.has(strUserId) || onlineUsers.get(strUserId).size === 0;

    if (!onlineUsers.has(strUserId)) {
        onlineUsers.set(strUserId, new Set());
    }
    onlineUsers.get(strUserId).add(strSocketId);
    socketToUser.set(strSocketId, strUserId);

    return { isFirstSocket };
};

export const removeOnlineUser = (userId, socketId) => {
    const strSocketId = socketId ? String(socketId) : null;
    const strUserId = userId ? String(userId) : (strSocketId ? socketToUser.get(strSocketId) : null);

    if (!strUserId) {
        if (strSocketId) socketToUser.delete(strSocketId);
        return { isLastSocket: false, userId: null };
    }

    let isLastSocket = false;

    if (onlineUsers.has(strUserId)) {
        const userSockets = onlineUsers.get(strUserId);
        if (strSocketId) {
            userSockets.delete(strSocketId);
        }
        if (userSockets.size === 0) {
            onlineUsers.delete(strUserId);
            isLastSocket = true;
        }
    }

    if (strSocketId) {
        socketToUser.delete(strSocketId);
    }

    return { isLastSocket, userId: strUserId };
};

export const isUserOnline = (userId) => {
    if (!userId) return false;
    const strUserId = String(userId);
    return onlineUsers.has(strUserId) && onlineUsers.get(strUserId).size > 0;
};

export const getUserSocketIds = (userId) => {
    if (!userId) return [];
    const strUserId = String(userId);
    if (!onlineUsers.has(strUserId)) return [];
    return Array.from(onlineUsers.get(strUserId));
};

export const getUserFirstSocketId = (userId) => {
    const socketIds = getUserSocketIds(userId);
    return socketIds.length > 0 ? socketIds[0] : null;
};

export const getUserIdBySocketId = (socketId) => {
    if (!socketId) return null;
    return socketToUser.get(String(socketId)) || null;
};

export const getAllOnlineUserIds = () => {
    return Array.from(onlineUsers.keys());
};

export const clearAllPresence = () => {
    onlineUsers.clear();
    socketToUser.clear();
};

export default {
    addOnlineUser,
    removeOnlineUser,
    isUserOnline,
    getUserSocketIds,
    getUserFirstSocketId,
    getUserIdBySocketId,
    getAllOnlineUserIds,
    clearAllPresence,
};
