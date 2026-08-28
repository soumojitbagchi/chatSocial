import callSessionManager, {
    CALL_STATUS,
    isUserInCall,
    getCallById,
    getCallByUserId,
    getCallBySocketId,
    createCallSession,
    setCallAccepted,
    setCallRejected,
    setCallEnded,
    clearAllSessions,
} from "./callSession.manager.js";
import mediaService from "./media.service.js";

/**
 * Call Service
 * Application-level call orchestration orchestrating CallSessionManager and MediaService.
 */

export { isUserInCall, getCallById, getCallByUserId, getCallBySocketId };

export const getUserCall = (userId) => getCallByUserId(userId);
export const getSocketCall = (socketId) => getCallBySocketId(socketId);

/**
 * Initiate a new 1-to-1 call
 */
export const initiateCall = ({ callerId, callerSocketId, targetUserId, callType = "audio" }) => {
    if (!callerId || !targetUserId) {
        const err = new Error("Caller ID and Target User ID are required");
        err.code = "INVALID_PARAMETERS";
        throw err;
    }

    const session = createCallSession({
        callerId,
        callerSocketId,
        receiverId: targetUserId,
        callType,
    });

    console.log(
        `[callService] Initiated call [callId=${session.callId}] from ${callerId} to ${targetUserId} (${session.type})`
    );

    return session;
};

/**
 * Accept an incoming call
 */
export const acceptCall = async ({ receiverId, receiverSocketId, callId }) => {
    if (!receiverId) {
        const err = new Error("Receiver ID is required");
        err.code = "INVALID_PARAMETERS";
        throw err;
    }

    let session = null;
    if (callId) {
        session = getCallById(callId);
    }
    if (!session) {
        session = getCallByUserId(receiverId);
    }

    if (!session) {
        const err = new Error("No active or ringing call found to accept");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    session = setCallAccepted(session.callId, receiverId, receiverSocketId);

    // Initialize mediasoup router for the call session
    await mediaService.initializeCallRouter(session.callId);

    console.log(`[callService] Accepted call [callId=${session.callId}] by user ${receiverId}`);
    return session;
};

/**
 * Reject an incoming call
 */
export const rejectCall = async ({ userId, callId, reason = "Call declined" }) => {
    let session = null;
    if (callId) {
        session = getCallById(callId);
    }
    if (!session && userId) {
        session = getCallByUserId(userId);
    }

    if (!session) {
        return null;
    }

    const rejectedSession = setCallRejected(session.callId, userId, reason);
    if (!rejectedSession) {
        return null;
    }

    console.log(`[callService] Rejected call [callId=${session.callId}] by user ${userId}: ${reason}`);

    // Clean up mediasoup resources
    await mediaService.cleanupCallMedia(session.callId);

    return {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.receiverId,
        reason,
    };
};

/**
 * End an ongoing or ringing call
 */
export const endCall = async ({ userId, socketId, callId, reason = "Call ended" }) => {
    let session = null;
    if (callId) {
        session = getCallById(callId);
    }
    if (!session && userId) {
        session = getCallByUserId(userId);
    }
    if (!session && socketId) {
        session = getCallBySocketId(socketId);
    }

    if (!session) {
        return null;
    }

    setCallEnded(session.callId, reason);
    console.log(`[callService] Ended call [callId=${session.callId}] reason: ${reason}`);

    const result = {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.receiverId,
        reason,
    };

    // Clean up mediasoup resources and remove session
    await mediaService.cleanupCallMedia(session.callId);

    return result;
};

/**
 * Clean up call on socket disconnect
 */
export const handleDisconnect = async (socketId, userId) => {
    let session = getCallBySocketId(socketId);
    if (!session && userId) {
        session = getCallByUserId(userId);
    }

    if (!session) {
        return null;
    }

    const strUserId = userId ? String(userId) : null;
    const isCaller = strUserId ? session.callerId === strUserId : false;
    const peerId = isCaller ? session.receiverId : session.callerId;

    const result = {
        callId: session.callId,
        peerId,
        callerId: session.callerId,
        receiverId: session.receiverId,
        reason: "Peer disconnected",
    };

    setCallEnded(session.callId, "Peer disconnected");
    await mediaService.cleanupCallMedia(session.callId);

    return result;
};

/**
 * Clear all calls for testing
 */
export const clearAllCalls = async () => {
    clearAllSessions();
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
