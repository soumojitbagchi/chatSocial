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
    addParticipantToSession,
    removeParticipantFromSession,
    getSessionPeerIds,
} from "./callSession.manager.js";
import mediaService from "./media.service.js";
import { isMediasoupAvailable } from "./mediasoupWorker.js";
import { recordCallLog } from "../../service/callLog.service.js";
/**
 * Call Service
 * Application-level call orchestration orchestrating CallSessionManager and MediaService.
 */

export { isUserInCall, getCallById, getCallByUserId, getCallBySocketId };

export const getUserCall = (userId) => getCallByUserId(userId);
export const getSocketCall = (socketId) => getCallBySocketId(socketId);
export const getCallPeers = (callId, excludeUserId = null) => getSessionPeerIds(callId, excludeUserId);

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

    // SFU router boots lazily on first media request. Skipping it here lets
    // P2P-only deployments accept calls with no mediasoup installed.
    if (isMediasoupAvailable()) {
        await mediaService.initializeCallRouter(session.callId);
    }

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

    void recordCallLog({
        callerId: session.callerId,
        receiverId: session.receiverId,
        callId: session.callId,
        type: session.type || "audio",
        status: "rejected",
        duration: 0,
        startedAt: session.startedAt,
        endedAt: new Date(),
    });

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

    const durationSec = session.acceptedAt ? Math.round((Date.now() - new Date(session.acceptedAt).getTime()) / 1000) : 0;
    const status = session.status === CALL_STATUS.ACCEPTED || session.status === CALL_STATUS.ACTIVE
        ? "completed"
        : "missed";

    void recordCallLog({
        callerId: session.callerId,
        receiverId: session.receiverId,
        callId: session.callId,
        type: session.type || "audio",
        status,
        duration: durationSec,
        startedAt: session.startedAt,
        endedAt: new Date(),
    });

    setCallEnded(session.callId, reason);
    console.log(`[callService] Ended call [callId=${session.callId}] reason: ${reason}`);

    const result = {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.receiverId,
        reason,
    };

    await mediaService.cleanupCallMedia(session.callId);
    return result;
};

export const inviteToCall = ({ inviterId, callId, targetUserId }) => {
    if (!inviterId || !targetUserId) {
        const err = new Error("Inviter ID and Target User ID are required");
        err.code = "INVALID_PARAMETERS";
        throw err;
    }

    const session = callId ? getCallById(callId) : getCallByUserId(inviterId);
    if (!session) {
        const err = new Error("No active call found to invite into");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strInviter = String(inviterId);
    const strTarget = String(targetUserId);
    if (!session.participants.has(strInviter)) {
        const err = new Error("Only call participants can invite others");
        err.code = "UNAUTHORIZED";
        throw err;
    }
    if (strInviter === strTarget) {
        const err = new Error("Cannot invite yourself");
        err.code = "CANNOT_CALL_SELF";
        throw err;
    }
    if (session.participants.has(strTarget)) {
        const err = new Error("User is already in this call");
        err.code = "ALREADY_IN_CALL";
        throw err;
    }
    if (isUserInCall(strTarget)) {
        const err = new Error("Target user is busy in another call");
        err.code = "USER_BUSY";
        throw err;
    }

    // Reserve the slot now so concurrent invites respect MAX_MESH_PEERS.
    addParticipantToSession(session.callId, strTarget, null, "invited");

    return {
        callId: session.callId,
        type: session.type,
        inviterId: strInviter,
        targetUserId: strTarget,
        peerIds: getSessionPeerIds(session.callId, strTarget),
    };
};

export const joinCall = ({ userId, socketId, callId }) => {
    const session = callId ? getCallById(callId) : getCallByUserId(userId);
    if (!session) {
        const err = new Error("No active call found to join");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    if (!session.participants.has(strUserId)) {
        const err = new Error("You were not invited to this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    const participant = session.participants.get(strUserId);
    participant.socketId = socketId ? String(socketId) : participant.socketId;
    participant.role = participant.role === "invited" ? "member" : participant.role;

    return {
        callId: session.callId,
        type: session.type,
        peerIds: getSessionPeerIds(session.callId, strUserId),
    };
};

export const leaveCall = ({ userId, callId }) => {
    const session = callId ? getCallById(callId) : getCallByUserId(userId);
    if (!session) return { ended: true, peerIds: [] };

    const remaining = removeParticipantFromSession(session.callId, String(userId));
    const peerIds = getSessionPeerIds(session.callId);
    if (remaining < 2) {
        setCallEnded(session.callId, "Last participants left");
        return { ended: true, callId: session.callId, peerIds };
    }
    return { ended: false, callId: session.callId, peerIds };
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

    const durationSec = session.acceptedAt ? Math.round((Date.now() - new Date(session.acceptedAt).getTime()) / 1000) : 0;
    const status = session.status === CALL_STATUS.ACCEPTED || session.status === CALL_STATUS.ACTIVE
        ? "completed"
        : "missed";

    void recordCallLog({
        callerId: session.callerId,
        receiverId: session.receiverId,
        callId: session.callId,
        type: session.type || "audio",
        status,
        duration: durationSec,
        startedAt: session.startedAt,
        endedAt: new Date(),
    });

    const otherId = session.callerId === (userId ? String(userId) : "") ? session.receiverId : session.callerId;
    const result = {
        callId: session.callId,
        callerId: session.callerId,
        receiverId: session.receiverId,
        peerId: otherId,
        reason: "Peer disconnected",
    };

    setCallEnded(session.callId, "Peer disconnected");
    console.log(`[callService] Disconnect cleanup for call [callId=${session.callId}] on socket ${socketId}`);

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
    getCallPeers,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    inviteToCall,
    joinCall,
    leaveCall,
    handleDisconnect,
    clearAllCalls,
};
