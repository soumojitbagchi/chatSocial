import http from "http";
import axios from "axios";
import { io as ClientIO } from "../frontend/node_modules/socket.io-client/build/esm/index.js";

const BACKEND_URL = "http://localhost:8080";
const API_URL = `${BACKEND_URL}/api`;

async function testIteration(iteration) {
    console.log(`\n===============================================================`);
    console.log(`=== RUNNING END-TO-END TEST ITERATION ${iteration} OF 4 ===`);
    console.log(`===============================================================`);

    const ts = Date.now();
    const userAData = {
        name: `Alice Tester ${ts}`,
        email: `alice_${ts}@example.com`,
        username: `alice_${ts}`,
        password: "Password123!",
    };
    const userBData = {
        name: `Soumojit Bagchi ${ts}`,
        email: `bagchi_${ts}@example.com`,
        username: `bagchi_${ts}`,
        password: "Password123!",
    };

    // 1. Register User A and User B
    console.log("[1] Registering User A and User B (Bagchi)...");
    const regARes = await axios.post(`${API_URL}/auth/register`, userAData);
    if (!regARes.data.token || !regARes.data.user) {
        throw new Error("Registration A failed: token/user missing");
    }
    const tokenA = regARes.data.token;
    const userA = regARes.data.user;
    const userAId = String(userA.id || userA._id);

    const regBRes = await axios.post(`${API_URL}/auth/register`, userBData);
    if (!regBRes.data.token || !regBRes.data.user) {
        throw new Error("Registration B failed: token/user missing");
    }
    const tokenB = regBRes.data.token;
    const userB = regBRes.data.user;
    const userBId = String(userB.id || userB._id);
    console.log(`✓ User A (${userA.username} / ${userAId}) and User B (${userB.username} / ${userBId}) registered`);

    // 2. Test /api/auth/me for both users
    console.log("[2] Verifying authentication via /api/auth/me...");
    const meA = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (!meA.data.success || !meA.data.user) throw new Error("Auth me A failed");

    const meB = await axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${tokenB}` } });
    if (!meB.data.success || !meB.data.user) throw new Error("Auth me B failed");
    console.log("✓ /api/auth/me verified for both users");

    // 3. Test /api/users/search and /api/users/connections
    console.log("[3] Testing User Search & Connections...");
    const searchRes = await axios.get(`${API_URL}/users/search?q=bagchi`, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (!searchRes.data.success || !Array.isArray(searchRes.data.data)) throw new Error("Search users failed");

    const connRes = await axios.get(`${API_URL}/users/connections`, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (!connRes.data.success || !connRes.data.data) throw new Error("Get connections failed");
    console.log(`✓ User search returned ${searchRes.data.data.length} match(es), connections endpoint healthy`);

    // 4. Connect User A to User B
    console.log("[4] Establishing connection between User A and User B...");
    const connectRes = await axios.post(`${API_URL}/users/connect`, { targetUserId: userBId }, { headers: { Authorization: `Bearer ${tokenA}` } });
    if (!connectRes.data.success) throw new Error("Connect request failed");

    const acceptRes = await axios.post(`${API_URL}/users/accept`, { targetUserId: userAId }, { headers: { Authorization: `Bearer ${tokenB}` } });
    if (!acceptRes.data.success || !acceptRes.data.room) throw new Error("Accept connection failed");
    const directRoom = acceptRes.data.room;
    const directRoomId = String(directRoom.id || directRoom._id);
    console.log(`✓ Direct 1-to-1 Room established [roomId=${directRoomId}]`);

    // 5. Test Socket.IO Real-time Connection & Presence
    console.log("[5] Connecting User A and User B via Socket.IO...");
    const socketA = ClientIO(BACKEND_URL, {
        auth: { token: tokenA },
        transports: ["websocket"],
        reconnection: false,
    });
    const socketB = ClientIO(BACKEND_URL, {
        auth: { token: tokenB },
        transports: ["websocket"],
        reconnection: false,
    });

    await Promise.all([
        new Promise((resolve) => socketA.on("connect", resolve)),
        new Promise((resolve) => socketB.on("connect", resolve)),
    ]);
    console.log("✓ Socket.IO clients authenticated & connected");

    // 6. Join Direct Room and Send Message
    console.log("[6] Testing direct room join and real-time message exchange...");
    socketA.emit("joinRoom", directRoomId);
    socketB.emit("joinRoom", directRoomId);

    await new Promise((r) => setTimeout(r, 200));

    const msgPromiseB = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("User B did not receive message in time")), 3000);
        socketB.on("receiveMessage", (msg) => {
            clearTimeout(timeout);
            resolve(msg);
        });
    });

    const testText = `Hello Bagchi, this is automated test ${iteration}!`;
    socketA.emit("sendMessage", { roomId: directRoomId, text: testText });

    const receivedMsg = await msgPromiseB;
    if (receivedMsg.text !== testText) {
        throw new Error(`Message text mismatch: expected "${testText}", got "${receivedMsg.text}"`);
    }
    console.log(`✓ User B received real-time message: "${receivedMsg.text}"`);

    // 7. Verify Message Persistence via REST API
    const messagesRes = await axios.get(`${API_URL}/messages?roomId=${directRoomId}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!messagesRes.data.success || !Array.isArray(messagesRes.data.data) || messagesRes.data.data.length === 0) {
        throw new Error("Message persistence check failed");
    }
    console.log(`✓ Message persisted in database (found ${messagesRes.data.data.length} messages)`);

    // 8. Test Mediasoup SFU 1-to-1 Calling Flow to Bagchi
    console.log("[8] Testing Mediasoup SFU Calling Flow to Bagchi...");
    const incomingCallPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("User B did not receive incoming call")), 4000);
        socketB.on("call:incoming", (callData) => {
            clearTimeout(timeout);
            resolve(callData);
        });
    });

    socketA.emit("call:start", { targetUserId: userBId, type: "audio" });
    const incomingCall = await incomingCallPromise;
    const callId = incomingCall.callId;
    console.log(`✓ User B received call:incoming [callId=${callId}]`);

    const callAcceptedPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("User A did not receive call:accepted")), 4000);
        socketA.on("call:accepted", (data) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });

    socketB.emit("call:accept", { callId });
    const acceptedData = await callAcceptedPromise;
    console.log(`✓ User A received call:accepted from User B`);

    // Request Router RTP Capabilities
    const rtpCapsA = await new Promise((resolve, reject) => {
        socketA.emit("media:getRouterCapabilities", { callId }, (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res.routerRtpCapabilities || res.rtpCapabilities);
        });
    });
    if (!rtpCapsA || !rtpCapsA.codecs) throw new Error("RTP Capabilities missing");

    // Create Send and Recv WebRTC Transports for User A & B
    const sendTransportA = await new Promise((resolve, reject) => {
        socketA.emit("media:createTransport", { callId, direction: "send" }, (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
        });
    });
    const recvTransportB = await new Promise((resolve, reject) => {
        socketB.emit("media:createTransport", { callId, direction: "recv" }, (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
        });
    });
    console.log(`✓ WebRTC Transports created on SFU: Send [${sendTransportA.id}] / Recv [${recvTransportB.id}]`);

    // Connect Transports
    const mockDtls = {
        role: "server",
        fingerprints: [{ algorithm: "sha-256", value: "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD" }],
    };
    await new Promise((resolve) => socketA.emit("media:connectTransport", { callId, transportId: sendTransportA.id, dtlsParameters: mockDtls }, resolve));
    await new Promise((resolve) => socketB.emit("media:connectTransport", { callId, transportId: recvTransportB.id, dtlsParameters: mockDtls }, resolve));
    console.log("✓ WebRTC Transports connected");

    // Produce Audio
    const newProducerPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("User B did not receive media:newProducer")), 3000);
        socketB.on("media:newProducer", (data) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });

    const mockRtpParams = {
        mid: "0",
        codecs: [{ mimeType: "audio/opus", payloadType: 111, clockRate: 48000, channels: 2, rtcpFeedback: [] }],
        encodings: [{ ssrc: 11111111 }],
    };
    const prodRes = await new Promise((resolve, reject) => {
        socketA.emit("media:produce", { callId, transportId: sendTransportA.id, kind: "audio", rtpParameters: mockRtpParams }, (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
        });
    });
    const newProd = await newProducerPromise;
    console.log(`✓ Producer created [${prodRes.id}] and announced to User B`);

    // Consume & Resume
    const consumeRes = await new Promise((resolve, reject) => {
        socketB.emit("media:consume", { callId, producerId: newProd.producerId, rtpCapabilities: rtpCapsA }, (res) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
        });
    });
    await new Promise((resolve) => socketB.emit("media:resumeConsumer", { callId, consumerId: consumeRes.id }, resolve));
    console.log(`✓ User B consumed & resumed audio producer [consumerId=${consumeRes.id}]`);

    // End Call
    const callEndedPromise = new Promise((resolve) => socketB.on("call:ended", resolve));
    socketA.emit("call:end", { callId, reason: "Call completed" });
    await callEndedPromise;
    console.log("✓ Call ended and all SFU resources cleaned up");

    // Cleanup Sockets
    socketA.disconnect();
    socketB.disconnect();

    console.log(`✓ ITERATION ${iteration} COMPLETED WITH 100% SUCCESS!`);
}

async function runAll() {
    try {
        console.log("Starting 4 Consecutive End-to-End Live Integration Tests...");
        for (let i = 1; i <= 4; i++) {
            await testIteration(i);
        }
        console.log("\n==================================================================");
        console.log("🎉 ALL 4 CONSECUTIVE END-TO-END TESTS PASSED WITH ZERO ERRORS! 🎉");
        console.log("==================================================================");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

runAll();
