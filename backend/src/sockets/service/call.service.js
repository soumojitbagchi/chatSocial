/**
 * Call Service
 * Manages 1-to-1 WebRTC call sessions, state transitions, and participant mappings.
 * Call states: "ringing" -> "connected" -> "ended"
 */

// callId -> CallSession
const activeCalls = new Map();
// userId -> callId
const userCallMap = new Map();
// socketId -> callId
const socketCallMap = new Map();

/**
 * Check if a user is currently in a call (ringing or connected)
 */
export const isUserInCall = (userId) => {
    if (!userId) return false;
    const strUserId = String(userId);
    return userCallMap.has(strUserId);
};

/**
 * Get call session by userId
 */
export const getUserCall = (userId) => {
    if (!userId) return null;
    const callId = userCallMap.get(String(userId));
    if (!callId) return null;
    return activeCalls.get(callId) || null;
};

/**
 * Get call session by socketId
 */
export const getSocketCall = (socketId) => {
    if (!socketId) return null;
    const callId = socketCallMap.get(String(socketId));
    if (!callId) return null;
    return activeCalls.get(callId) || null;
};

/**
 * Get call session by callId
 */
export const getCallById = (callId) => {
    if (!callId) return null;
    return activeCalls.get(String(callId)) || null;
};

/**
 * Initiate a new 1-to-1 call
 */
export const initiateCall = ({ callerId, callerSocketId, targetUserId, callType = "audio" }) => {
    if (!callerId || !targetUserId) {
        throw new Error("Caller ID and Target User ID are required");
    }

    const strCallerId = String(callerId);
    const strTargetId = String(targetUserId);

    if (strCallerId === strTargetId) {
        throw new Error("Cannot call yourself");
    }

    if (isUserInCall(strCallerId)) {
        throw new Error("You are already in an active call");
    }

    if (isUserInCall(strTargetId)) {
        throw new Error("Target user is busy in another call");
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const callSession = {
        callId,
        callerId: strCallerId,
        callerSocketId: callerSocketId ? String(callerSocketId) : null,
        receiverId: strTargetId,
        receiverSocketId: null,
        callType: callType || "audio",
        status: "ringing",
        createdAt: Date.now(),
        acceptedAt: null,
        endedAt: null,
    };

    activeCalls.set(callId, callSession);
    userCallMap.set(strCallerId, callId);
    userCallMap.set(strTargetId, callId);
    if (callerSocketId) {
        socketCallMap.set(String(callerSocketId), callId);
    }

    return callSession;
};

/**
 * Accept an incoming call
 */
export const acceptCall = ({ callerId, receiverId, receiverSocketId }) => {
    const strReceiverId = String(receiverId);
    const strCallerId = callerId ? String(callerId) : null;

    let call = getUserCall(strReceiverId);

    if (!call && strCallerId) {
        call = getUserCall(strCallerId);
    }

    if (!call) {
        throw new Error("No active or ringing call found to accept");
    }

    if (call.status !== "ringing") {
        throw new Error(`Cannot accept call with status '${call.status}'`);
    }

    if (call.receiverId !== strReceiverId && call.callerId !== strReceiverId) {
        throw new Error("Unauthorized to accept this call");
    }

    call.status = "connected";
    call.receiverSocketId = receiverSocketId ? String(receiverSocketId) : call.receiverSocketId;
    call.acceptedAt = Date.now();

    if (receiverSocketId) {
        socketCallMap.set(String(receiverSocketId), call.callId);
    }

    return call;
};

/**
 * Reject an incoming call
 */
export const rejectCall = ({ callerId, receiverId }) => {
    const strReceiverId = receiverId ? String(receiverId) : null;
    const strCallerId = callerId ? String(callerId) : null;

    let call = strReceiverId ? getUserCall(strReceiverId) : null;
    if (!call && strCallerId) {
        call = getUserCall(strCallerId);
    }

    if (!call) {
        return null;
    }

    // Clean up call session
    cleanupCall(call.callId);
    call.status = "ended";
    call.endedAt = Date.now();
    return call;
};

/**
 * End an ongoing or ringing call
 */
export const endCall = ({ userId, socketId, callId }) => {
    let call = null;
    if (callId) {
        call = getCallById(callId);
    }
    if (!call && userId) {
        call = getUserCall(userId);
    }
    if (!call && socketId) {
        call = getSocketCall(socketId);
    }

    if (!call) {
        return null;
    }

    cleanupCall(call.callId);
    call.status = "ended";
    call.endedAt = Date.now();
    return call;
};

/**
 * Clean up call on socket disconnect
 */
export const handleDisconnect = (socketId, userId) => {
    let call = getSocketCall(socketId);
    if (!call && userId) {
        call = getUserCall(userId);
    }

    if (!call) {
        return null;
    }

    const strUserId = userId ? String(userId) : null;
    const strSocketId = socketId ? String(socketId) : null;

    const isCaller = (strUserId && call.callerId === strUserId) || (strSocketId && call.callerSocketId === strSocketId);
    const peerId = isCaller ? call.receiverId : call.callerId;
    const peerSocketId = isCaller ? call.receiverSocketId : call.callerSocketId;

    cleanupCall(call.callId);
    call.status = "ended";
    call.endedAt = Date.now();

    return {
        call,
        isCaller,
        peerId,
        peerSocketId,
    };
};

/**
 * Internal cleanup helper to remove all references
 */
const cleanupCall = (callId) => {
    if (!callId) return;
    const call = activeCalls.get(callId);
    if (call) {
        userCallMap.delete(call.callerId);
        userCallMap.delete(call.receiverId);
        if (call.callerSocketId) socketCallMap.delete(call.callerSocketId);
        if (call.receiverSocketId) socketCallMap.delete(call.receiverSocketId);
        activeCalls.delete(callId);
    }
};

/**
 * Reset all call state (testing/cleanup)
 */
export const clearAllCalls = () => {
    activeCalls.clear();
    userCallMap.clear();
    socketCallMap.clear();
};

export default {
    isUserInCall,
    getUserCall,
    getSocketCall,
    getCallById,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    handleDisconnect,
    clearAllCalls,
};
