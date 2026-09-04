/**
 * Call Session Manager
 * Authoritative in-memory state manager for 1-to-1 WebRTC SFU call sessions and mediasoup media state.
 *
 * Lifecycle:
 * IDLE -> CALLING -> RINGING -> ACCEPTED -> MEDIA_CONNECTING -> ACTIVE -> ENDED
 * Rejected: RINGING -> REJECTED -> CLEANUP
 */

export const CALL_STATUS = {
    IDLE: "idle",
    CALLING: "calling",
    RINGING: "ringing",
    ACCEPTED: "accepted",
    MEDIA_CONNECTING: "media_connecting",
    ACTIVE: "active",
    REJECTED: "rejected",
    ENDED: "ended",
};

// P2P mesh budget: upstream cost grows per peer. Warn at 4, enforce at 6.
export const MESH_SOFT_CAP = 4;
export const MAX_MESH_PEERS = 6;

// Primary in-memory maps
// callId -> CallSession
const activeCalls = new Map();
// userId -> callId
const userCallMap = new Map();
// socketId -> callId
const socketCallMap = new Map();

// Quick lookup index maps for mediasoup objects
// transportId -> { callId, userId, direction }
const transportIndex = new Map();
// producerId -> { callId, userId, kind }
const producerIndex = new Map();
// consumerId -> { callId, userId, kind, producerId }
const consumerIndex = new Map();

/**
 * Check if a user is currently in an active or ringing call
 */
export const isUserInCall = (userId) => {
    if (!userId) return false;
    const strUserId = String(userId);
    const callId = userCallMap.get(strUserId);
    if (!callId) return false;
    const session = activeCalls.get(callId);
    if (!session) {
        userCallMap.delete(strUserId);
        return false;
    }
    return (
        session.status === CALL_STATUS.CALLING ||
        session.status === CALL_STATUS.RINGING ||
        session.status === CALL_STATUS.ACCEPTED ||
        session.status === CALL_STATUS.MEDIA_CONNECTING ||
        session.status === CALL_STATUS.ACTIVE
    );
};

/**
 * Get call session by callId
 */
export const getCallById = (callId) => {
    if (!callId) return null;
    return activeCalls.get(String(callId)) || null;
};

/**
 * Get call session by userId
 */
export const getCallByUserId = (userId) => {
    if (!userId) return null;
    const callId = userCallMap.get(String(userId));
    if (!callId) return null;
    return activeCalls.get(callId) || null;
};

/**
 * Get call session by socketId
 */
export const getCallBySocketId = (socketId) => {
    if (!socketId) return null;
    const callId = socketCallMap.get(String(socketId));
    if (!callId) return null;
    return activeCalls.get(callId) || null;
};

/**
 * Create a new call session
 */
export const createCallSession = ({ callerId, callerSocketId, receiverId, callType = "audio" }) => {
    const strCallerId = String(callerId);
    const strReceiverId = String(receiverId);

    if (strCallerId === strReceiverId) {
        const err = new Error("Cannot call yourself");
        err.code = "CANNOT_CALL_SELF";
        throw err;
    }

    if (isUserInCall(strCallerId)) {
        const err = new Error("You are already in an active call");
        err.code = "USER_BUSY";
        throw err;
    }

    if (isUserInCall(strReceiverId)) {
        const err = new Error("Target user is busy in another call");
        err.code = "USER_BUSY";
        throw err;
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const session = {
        callId,
        type: callType === "video" ? "video" : "audio",
        status: CALL_STATUS.RINGING,
        callerId: strCallerId,
        receiverId: strReceiverId,
        createdAt: Date.now(),
        acceptedAt: null,
        endedAt: null,
        router: null, // assigned by media service
        participants: new Map([
            [
                strCallerId,
                {
                    userId: strCallerId,
                    socketId: callerSocketId ? String(callerSocketId) : null,
                    role: "caller",
                    sendTransport: null,
                    recvTransport: null,
                    producers: new Map(), // producerId -> Producer
                    consumers: new Map(), // consumerId -> Consumer
                },
            ],
            [
                strReceiverId,
                {
                    userId: strReceiverId,
                    socketId: null,
                    role: "receiver",
                    sendTransport: null,
                    recvTransport: null,
                    producers: new Map(),
                    consumers: new Map(),
                },
            ],
        ]),
    };

    activeCalls.set(callId, session);
    userCallMap.set(strCallerId, callId);
    userCallMap.set(strReceiverId, callId);
    if (callerSocketId) {
        socketCallMap.set(String(callerSocketId), callId);
    }

    return session;
};

/**
 * Associate a participant's socket ID with their call session participant record
 */
export const updateParticipantSocket = (callId, userId, socketId) => {
    const session = getCallById(callId);
    if (!session) return null;

    const participant = session.participants.get(String(userId));
    if (participant) {
        participant.socketId = socketId ? String(socketId) : participant.socketId;
        if (socketId) {
            socketCallMap.set(String(socketId), session.callId);
        }
    }
    return session;
};

/**
 * Validate and transition call status to ACCEPTED
 */
export const setCallAccepted = (callId, receiverId, receiverSocketId) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    if (session.status === CALL_STATUS.ENDED || session.status === CALL_STATUS.REJECTED) {
        const err = new Error("Call has already ended");
        err.code = "CALL_ALREADY_ENDED";
        throw err;
    }

    if (session.status !== CALL_STATUS.RINGING) {
        const err = new Error(`Cannot accept call in status '${session.status}'`);
        err.code = "INVALID_STATE";
        throw err;
    }

    const strReceiverId = String(receiverId);
    if (session.receiverId !== strReceiverId) {
        const err = new Error("Unauthorized to accept this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    session.status = CALL_STATUS.ACCEPTED;
    session.acceptedAt = Date.now();

    const participant = session.participants.get(strReceiverId);
    if (participant) {
        participant.socketId = receiverSocketId ? String(receiverSocketId) : participant.socketId;
        if (receiverSocketId) {
            socketCallMap.set(String(receiverSocketId), session.callId);
        }
    }

    return session;
};

/**
 * Validate and transition call status to ACTIVE / MEDIA_CONNECTING
 */
export const setCallActive = (callId) => {
    const session = getCallById(callId);
    if (!session) return null;
    if (session.status === CALL_STATUS.ACCEPTED || session.status === CALL_STATUS.MEDIA_CONNECTING) {
        session.status = CALL_STATUS.ACTIVE;
    }
    return session;
};

/**
 * Transition call status to REJECTED and clean up
 */
export const setCallRejected = (callId, userId, reason = "Declined") => {
    const session = getCallById(callId);
    if (!session) return null;

    if (session.status !== CALL_STATUS.RINGING) {
        // Only ringing calls can be rejected
        return null;
    }

    const strUserId = String(userId);
    if (!session.participants.has(strUserId)) {
        const err = new Error("Unauthorized: user not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    session.status = CALL_STATUS.REJECTED;
    session.endedAt = Date.now();
    session.rejectReason = reason;

    return session;
};

/**
 * Transition call status to ENDED and mark end timestamp
 */
export const setCallEnded = (callId, reason = "Ended") => {
    const session = getCallById(callId);
    if (!session) return null;

    session.status = CALL_STATUS.ENDED;
    session.endedAt = Date.now();
    session.endReason = reason;

    return session;
};

/**
 * Attach a mediasoup Router to the call session
 */
export const setCallRouter = (callId, router) => {
    const session = getCallById(callId);
    if (!session) return null;
    session.router = router;
    return session;
};

/**
 * Register transport for a participant
 */
export const registerParticipantTransport = (callId, userId, direction, transport) => {
    const session = getCallById(callId);
    if (!session) return;

    const participant = session.participants.get(String(userId));
    if (!participant) return;

    if (direction === "send") {
        participant.sendTransport = transport;
    } else {
        participant.recvTransport = transport;
    }

    transportIndex.set(transport.id, {
        callId: session.callId,
        userId: String(userId),
        direction,
    });
};

/**
 * Register producer for a participant
 */
export const registerParticipantProducer = (callId, userId, producer) => {
    const session = getCallById(callId);
    if (!session) return;

    const participant = session.participants.get(String(userId));
    if (!participant) return;

    participant.producers.set(producer.id, producer);
    producerIndex.set(producer.id, {
        callId: session.callId,
        userId: String(userId),
        kind: producer.kind,
    });
};

/**
 * Register consumer for a participant
 */
export const registerParticipantConsumer = (callId, userId, consumer) => {
    const session = getCallById(callId);
    if (!session) return;

    const participant = session.participants.get(String(userId));
    if (!participant) return;

    participant.consumers.set(consumer.id, consumer);
    consumerIndex.set(consumer.id, {
        callId: session.callId,
        userId: String(userId),
        kind: consumer.kind,
        producerId: consumer.producerId,
    });
};

/**
 * Lookup info from indexes
 */
export const getTransportInfo = (transportId) => transportIndex.get(transportId) || null;
export const getProducerInfo = (producerId) => producerIndex.get(producerId) || null;
export const getConsumerInfo = (consumerId) => consumerIndex.get(consumerId) || null;

export const addParticipantToSession = (callId, userId, socketId = null, role = "member") => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    if (session.participants.has(strUserId)) {
        return session.participants.get(strUserId);
    }

    if (session.participants.size >= MAX_MESH_PEERS) {
        const err = new Error(`Call is full (max ${MAX_MESH_PEERS} participants for P2P mesh)`);
        err.code = "MESH_FULL";
        throw err;
    }

    if (session.status === CALL_STATUS.ENDED || session.status === CALL_STATUS.REJECTED) {
        const err = new Error("Call has already ended");
        err.code = "CALL_ALREADY_ENDED";
        throw err;
    }

    const participant = {
        userId: strUserId,
        socketId: socketId ? String(socketId) : null,
        role,
        sendTransport: null,
        recvTransport: null,
        producers: new Map(),
        consumers: new Map(),
    };
    session.participants.set(strUserId, participant);
    userCallMap.set(strUserId, session.callId);
    if (socketId) {
        socketCallMap.set(String(socketId), session.callId);
    }
    return participant;
};

export const removeParticipantFromSession = (callId, userId) => {
    const session = getCallById(callId);
    if (!session) return 0;

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (participant?.socketId) {
        socketCallMap.delete(participant.socketId);
    }
    session.participants.delete(strUserId);
    userCallMap.delete(strUserId);
    return session.participants.size;
};

export const getSessionPeerIds = (callId, excludeUserId = null) => {
    const session = getCallById(callId);
    if (!session) return [];
    const exclude = excludeUserId ? String(excludeUserId) : null;
    return [...session.participants.keys()].filter((id) => id !== exclude);
};

/**
 * Clean up all indexes and references for a call session
 */
export const removeCallSession = (callId) => {
    if (!callId) return;
    const session = activeCalls.get(String(callId));
    if (!session) return;

    // Delete transport, producer, consumer index entries
    for (const [, participant] of session.participants) {
        if (participant.sendTransport) {
            transportIndex.delete(participant.sendTransport.id);
        }
        if (participant.recvTransport) {
            transportIndex.delete(participant.recvTransport.id);
        }
        for (const [prodId] of participant.producers) {
            producerIndex.delete(prodId);
        }
        for (const [consId] of participant.consumers) {
            consumerIndex.delete(consId);
        }

        userCallMap.delete(participant.userId);
        if (participant.socketId) {
            socketCallMap.delete(participant.socketId);
        }
    }

    userCallMap.delete(session.callerId);
    userCallMap.delete(session.receiverId);
    activeCalls.delete(String(callId));
};

/**
 * Clear all in-memory calls and indexes (for testing)
 */
export const clearAllSessions = () => {
    activeCalls.clear();
    userCallMap.clear();
    socketCallMap.clear();
    transportIndex.clear();
    producerIndex.clear();
    consumerIndex.clear();
};

export default {
    CALL_STATUS,
    MESH_SOFT_CAP,
    MAX_MESH_PEERS,
    isUserInCall,
    getCallById,
    getCallByUserId,
    getCallBySocketId,
    createCallSession,
    updateParticipantSocket,
    addParticipantToSession,
    removeParticipantFromSession,
    getSessionPeerIds,
    setCallAccepted,
    setCallActive,
    setCallRejected,
    setCallEnded,
    setCallRouter,
    registerParticipantTransport,
    registerParticipantProducer,
    registerParticipantConsumer,
    getTransportInfo,
    getProducerInfo,
    getConsumerInfo,
    removeCallSession,
    clearAllSessions,
};
