import { mediasoupConfig } from "../../config/mediasoup.config.js";
import { createMediasoupRouter } from "./mediasoupWorker.js";
import callSessionManager, {
    CALL_STATUS,
    getCallById,
    registerParticipantTransport,
    registerParticipantProducer,
    registerParticipantConsumer,
    setCallRouter,
} from "./callSession.manager.js";

/**
 * Media Service
 * Manages mediasoup WebRtcTransports, Producers, and Consumers for call sessions.
 */

/**
 * Initialize a mediasoup Router for a call session
 */
export const initializeCallRouter = async (callId) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    if (session.router && !session.router.closed) {
        return session.router;
    }

    const router = await createMediasoupRouter();
    setCallRouter(callId, router);
    return router;
};

/**
 * Get Router RTP Capabilities for a call session
 */
export const getRouterRtpCapabilities = async (callId) => {
    let session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    if (!session.router || session.router.closed) {
        await initializeCallRouter(callId);
        session = getCallById(callId);
    }

    return session.router.rtpCapabilities;
};

/**
 * Create a WebRtcTransport for sending or receiving media
 */
export const createWebRtcTransport = async ({ callId, userId, socketId, direction }) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) {
        const err = new Error("User is not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    if (!session.router || session.router.closed) {
        await initializeCallRouter(callId);
    }

    const router = session.router;
    const { listenIps, enableUdp, enableTcp, preferUdp, initialAvailableOutgoingBitrate, maxSctpMessageSize } =
        mediasoupConfig.webRtcTransport;

    const transport = await router.createWebRtcTransport({
        listenIps,
        enableUdp,
        enableTcp,
        preferUdp,
        initialAvailableOutgoingBitrate,
        maxSctpMessageSize,
        appData: {
            callId,
            userId: strUserId,
            socketId: socketId ? String(socketId) : participant.socketId,
            direction,
        },
    });

    // Close any previous transport in this direction
    const prevTransport = direction === "send" ? participant.sendTransport : participant.recvTransport;
    if (prevTransport && !prevTransport.closed) {
        try {
            prevTransport.close();
        } catch (e) {
            console.warn(`[mediaService] Error closing previous ${direction} transport:`, e);
        }
    }

    // Attach transport lifecycle event listeners
    transport.on("dtlsstatechange", (dtlsState) => {
        console.log(`[mediaService] Transport [${transport.id}] dtlsstatechange: ${dtlsState} (user: ${strUserId})`);
        if (dtlsState === "closed" || dtlsState === "failed") {
            try {
                transport.close();
            } catch (e) {
                // Ignore
            }
        }
    });

    transport.on("close", () => {
        console.log(`[mediaService] Transport [${transport.id}] closed (user: ${strUserId}, dir: ${direction})`);
    });

    registerParticipantTransport(callId, strUserId, direction, transport);

    console.log(
        `[mediaService] Created ${direction} transport [${transport.id}] for user ${strUserId} in call ${callId}`
    );

    return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters,
    };
};

/**
 * Connect a WebRtcTransport with remote DTLS parameters
 */
export const connectWebRtcTransport = async ({ callId, userId, transportId, dtlsParameters }) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) {
        const err = new Error("User is not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    let targetTransport = null;
    if (participant.sendTransport && participant.sendTransport.id === transportId) {
        targetTransport = participant.sendTransport;
    } else if (participant.recvTransport && participant.recvTransport.id === transportId) {
        targetTransport = participant.recvTransport;
    }

    if (!targetTransport) {
        const err = new Error("WebRTC transport not found for this participant");
        err.code = "TRANSPORT_NOT_FOUND";
        throw err;
    }

    await targetTransport.connect({ dtlsParameters });
    console.log(`[mediaService] Connected transport [${transportId}] for user ${strUserId}`);

    return { connected: true };
};

/**
 * Create a Producer on the participant's send transport
 */
export const createProducer = async ({ callId, userId, transportId, kind, rtpParameters, appData = {} }) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    if (session.status === CALL_STATUS.ENDED || session.status === CALL_STATUS.REJECTED) {
        const err = new Error("Cannot produce media in an ended or rejected call");
        err.code = "INVALID_STATE";
        throw err;
    }

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) {
        const err = new Error("User is not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    if (!participant.sendTransport || participant.sendTransport.id !== transportId) {
        const err = new Error("Send transport not found or not initialized");
        err.code = "TRANSPORT_NOT_FOUND";
        throw err;
    }

    // Close any previous producer of the same kind
    for (const [prodId, prod] of participant.producers) {
        if (prod.kind === kind && !prod.closed) {
            try {
                prod.close();
            } catch (e) {
                // Ignore
            }
            participant.producers.delete(prodId);
        }
    }

    const producer = await participant.sendTransport.produce({
        kind,
        rtpParameters,
        appData: {
            ...appData,
            callId,
            userId: strUserId,
            kind,
        },
    });

    producer.on("transportclose", () => {
        console.log(`[mediaService] Producer [${producer.id}] transport closed (user: ${strUserId}, kind: ${kind})`);
        try {
            producer.close();
        } catch (e) {
            // Ignore
        }
    });

    registerParticipantProducer(callId, strUserId, producer);
    callSessionManager.setCallActive(callId);

    console.log(
        `[mediaService] Producer created [producerId=${producer.id}] kind=${kind} for user ${strUserId} in call ${callId}`
    );

    return {
        id: producer.id,
        kind: producer.kind,
    };
};

/**
 * Close a Producer
 */
export const closeProducer = async ({ callId, userId, producerId }) => {
    const session = getCallById(callId);
    if (!session) return false;

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) return false;

    const producer = participant.producers.get(producerId);
    if (producer && !producer.closed) {
        producer.close();
        participant.producers.delete(producerId);
        console.log(`[mediaService] Producer [${producerId}] closed by user ${strUserId}`);
        return true;
    }
    return false;
};

/**
 * Get all existing producers in a call (excluding optional userId)
 */
export const getProducersForCall = (callId, excludeUserId = null) => {
    const session = getCallById(callId);
    if (!session) return [];

    const result = [];
    const strExclude = excludeUserId ? String(excludeUserId) : null;

    for (const [participantId, participant] of session.participants) {
        if (strExclude && participantId === strExclude) continue;

        for (const [, producer] of participant.producers) {
            if (!producer.closed) {
                result.push({
                    producerId: producer.id,
                    participantId,
                    kind: producer.kind,
                    appData: producer.appData,
                });
            }
        }
    }

    return result;
};

/**
 * Create a Consumer on the participant's receive transport
 */
export const createConsumer = async ({ callId, userId, producerId, rtpCapabilities }) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) {
        const err = new Error("User is not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    if (!participant.recvTransport || participant.recvTransport.closed) {
        const err = new Error("Receive transport not found or not initialized");
        err.code = "TRANSPORT_NOT_FOUND";
        throw err;
    }

    // Find the target producer in another participant's producers
    let targetProducer = null;
    let producerUserId = null;
    for (const [otherUserId, otherParticipant] of session.participants) {
        if (otherUserId !== strUserId && otherParticipant.producers.has(producerId)) {
            targetProducer = otherParticipant.producers.get(producerId);
            producerUserId = otherUserId;
            break;
        }
    }

    if (!targetProducer || targetProducer.closed) {
        const err = new Error("Target producer not found or already closed");
        err.code = "PRODUCER_NOT_FOUND";
        throw err;
    }

    if (!session.router || session.router.closed) {
        const err = new Error("Router not available");
        err.code = "MEDIA_ERROR";
        throw err;
    }

    // Verify router can consume
    const canConsume = session.router.canConsume({
        producerId: targetProducer.id,
        rtpCapabilities,
    });

    if (!canConsume) {
        const err = new Error("Router cannot consume producer with client RTP capabilities");
        err.code = "CANNOT_CONSUME";
        throw err;
    }

    // Create consumer paused initially
    const consumer = await participant.recvTransport.consume({
        producerId: targetProducer.id,
        rtpCapabilities,
        paused: true,
        appData: {
            callId,
            userId: strUserId,
            producerUserId,
            producerId: targetProducer.id,
            kind: targetProducer.kind,
        },
    });

    consumer.on("transportclose", () => {
        console.log(`[mediaService] Consumer [${consumer.id}] transport closed (user: ${strUserId})`);
        try {
            consumer.close();
        } catch (e) {
            // Ignore
        }
    });

    consumer.on("producerclose", () => {
        console.log(`[mediaService] Consumer [${consumer.id}] producer closed`);
        try {
            consumer.close();
        } catch (e) {
            // Ignore
        }
        participant.consumers.delete(consumer.id);
    });

    registerParticipantConsumer(callId, strUserId, consumer);

    console.log(
        `[mediaService] Created paused consumer [${consumer.id}] kind=${consumer.kind} for user ${strUserId} from producer ${targetProducer.id}`
    );

    return {
        id: consumer.id,
        producerId: targetProducer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
    };
};

/**
 * Resume a paused Consumer after client confirms local consumer creation
 */
export const resumeConsumer = async ({ callId, userId, consumerId }) => {
    const session = getCallById(callId);
    if (!session) {
        const err = new Error("Call session not found");
        err.code = "CALL_NOT_FOUND";
        throw err;
    }

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) {
        const err = new Error("User is not a participant in this call");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    const consumer = participant.consumers.get(consumerId);
    if (!consumer || consumer.closed) {
        const err = new Error("Consumer not found or already closed");
        err.code = "CONSUMER_NOT_FOUND";
        throw err;
    }

    await consumer.resume();
    console.log(`[mediaService] Resumed consumer [${consumerId}] for user ${strUserId}`);

    return { resumed: true };
};

/**
 * Close a Consumer
 */
export const closeConsumer = async ({ callId, userId, consumerId }) => {
    const session = getCallById(callId);
    if (!session) return false;

    const strUserId = String(userId);
    const participant = session.participants.get(strUserId);
    if (!participant) return false;

    const consumer = participant.consumers.get(consumerId);
    if (consumer && !consumer.closed) {
        consumer.close();
        participant.consumers.delete(consumerId);
        console.log(`[mediaService] Consumer [${consumerId}] closed by user ${strUserId}`);
        return true;
    }
    return false;
};

/**
 * Clean up all mediasoup resources for a call session
 */
export const cleanupCallMedia = async (callId) => {
    const session = getCallById(callId);
    if (!session) return;

    console.log(`[mediaService] Cleaning up all media for call ${callId}...`);

    for (const [userId, participant] of session.participants) {
        // Close consumers
        for (const [, consumer] of participant.consumers) {
            try {
                if (!consumer.closed) consumer.close();
            } catch (e) {
                console.warn(`[mediaService] Error closing consumer:`, e);
            }
        }
        participant.consumers.clear();

        // Close producers
        for (const [, producer] of participant.producers) {
            try {
                if (!producer.closed) producer.close();
            } catch (e) {
                console.warn(`[mediaService] Error closing producer:`, e);
            }
        }
        participant.producers.clear();

        // Close transports
        if (participant.sendTransport && !participant.sendTransport.closed) {
            try {
                participant.sendTransport.close();
            } catch (e) {
                console.warn(`[mediaService] Error closing sendTransport:`, e);
            }
        }
        participant.sendTransport = null;

        if (participant.recvTransport && !participant.recvTransport.closed) {
            try {
                participant.recvTransport.close();
            } catch (e) {
                console.warn(`[mediaService] Error closing recvTransport:`, e);
            }
        }
        participant.recvTransport = null;
    }

    // Close Router
    if (session.router && !session.router.closed) {
        try {
            session.router.close();
            console.log(`[mediaService] Router [${session.router.id}] closed for call ${callId}`);
        } catch (e) {
            console.warn(`[mediaService] Error closing router:`, e);
        }
        session.router = null;
    }

    callSessionManager.removeCallSession(callId);
};

export default {
    initializeCallRouter,
    getRouterRtpCapabilities,
    createWebRtcTransport,
    connectWebRtcTransport,
    createProducer,
    closeProducer,
    getProducersForCall,
    createConsumer,
    resumeConsumer,
    closeConsumer,
    cleanupCallMedia,
};
