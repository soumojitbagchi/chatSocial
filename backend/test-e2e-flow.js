import http from "http";
import express from "express";
import { io as ClientIO } from "../frontend/node_modules/socket.io-client/build/esm/index.js";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import registerSocketHandler from "./src/sockets/index.js";
import { closeMediasoupWorkers } from "./src/sockets/service/mediasoupWorker.js";

const JWT_KEY = process.env.JWT_KEY || "test_e2e_jwt_secret_key_1234567890_abcdef";
process.env.JWT_KEY = JWT_KEY;

const PORT = 8097;

function makeToken(user) {
    return jwt.sign(
        { id: user.id, _id: user.id, name: user.name, username: user.username, email: user.email },
        JWT_KEY,
        { expiresIn: "1h" }
    );
}

const alice = { id: "607f1f77bcf86cd7994390aa", name: "Alice Smith", username: "alice", email: "alice@example.com" };
const bagchi = { id: "607f1f77bcf86cd7994390bb", name: "Soumojit Bagchi", username: "bagchi", email: "bagchi@example.com" };

const aliceToken = makeToken(alice);
const bagchiToken = makeToken(bagchi);

const app = express();
app.use(express.json());

const mockRooms = [
    {
        _id: "607f1f77bcf86cd799439001",
        roomname: "general",
        displayName: "General Chat",
        description: "Public general chat room",
        isDirect: false,
        createdAt: new Date().toISOString(),
        members: [alice.id, bagchi.id],
    },
    {
        _id: "607f1f77bcf86cd799439002",
        roomname: "Direct Message",
        displayName: "Soumojit Bagchi",
        description: "Direct conversation with Soumojit Bagchi",
        isDirect: true,
        createdAt: new Date().toISOString(),
        members: [
            { _id: alice.id, name: alice.name, username: alice.username, avatar: "" },
            { _id: bagchi.id, name: bagchi.name, username: bagchi.username, avatar: "" },
        ],
        contactUser: {
            id: bagchi.id,
            name: bagchi.name,
            username: bagchi.username,
            avatar: "",
        },
    },
];

const mockMessages = [];

// REST routes
app.get("/api/auth/me", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, JWT_KEY);
        res.json({ success: true, data: decoded });
    } catch {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
});

app.get("/api/room", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = token ? jwt.decode(token) : null;
    const currentId = decoded?.id || decoded?._id;

    const result = mockRooms.map((r) => {
        if (r.isDirect && Array.isArray(r.members)) {
            const other = r.members.find((m) => (m._id || m).toString() !== currentId) || r.members[0];
            const otherName = other.name || r.roomname;
            return {
                ...r,
                displayName: otherName,
                roomname: otherName,
                contactUser: {
                    id: (other._id || other).toString(),
                    name: otherName,
                    username: other.username || otherName,
                },
            };
        }
        return r;
    });

    res.json({ success: true, data: result });
});

app.get("/api/message/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const msgs = mockMessages.filter((m) => m.roomId === roomId);
    res.json({ success: true, data: msgs });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: "*", credentials: true },
});

registerSocketHandler(io);

async function runIteration(iterationNumber) {
    console.log(`\n===============================================================`);
    console.log(`=== RUN ${iterationNumber}: AUTH -> ROOMS -> MSG -> CALL BAGCHI ===`);
    console.log(`===============================================================`);

    // 1. Authenticate Alice & Bagchi
    console.log(`[Step 1] Verifying Alice & Bagchi tokens via /api/auth/me...`);
    const aliceRes = await fetch(`http://localhost:${PORT}/api/auth/me`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
    }).then((r) => r.json());
    if (!aliceRes.success || aliceRes.data.username !== "alice") {
        throw new Error("Alice auth verification failed");
    }

    const bagchiRes = await fetch(`http://localhost:${PORT}/api/auth/me`, {
        headers: { Authorization: `Bearer ${bagchiToken}` },
    }).then((r) => r.json());
    if (!bagchiRes.success || bagchiRes.data.username !== "bagchi") {
        throw new Error("Bagchi auth verification failed");
    }
    console.log(`✓ Auth verified for Alice (${aliceRes.data.name}) and Bagchi (${bagchiRes.data.name})`);

    // 2. Fetch Rooms for Alice
    console.log(`[Step 2] Fetching rooms for Alice...`);
    const roomsRes = await fetch(`http://localhost:${PORT}/api/room`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
    }).then((r) => r.json());

    if (!roomsRes.success || !Array.isArray(roomsRes.data) || roomsRes.data.length === 0) {
        throw new Error("Failed to fetch rooms for Alice");
    }

    const bagchiChat = roomsRes.data.find((r) => r.displayName === "Soumojit Bagchi" || r.contactUser?.name === "Soumojit Bagchi");
    if (!bagchiChat) {
        throw new Error("Bagchi conversation room not found in /api/room response");
    }
    console.log(`✓ Found Bagchi conversation: roomId=${bagchiChat._id}, contactUser=${bagchiChat.contactUser?.name} (id=${bagchiChat.contactUser?.id})`);

    // 3. Connect Sockets for Alice & Bagchi
    console.log(`[Step 3] Connecting Socket.IO clients...`);
    const socketAlice = ClientIO(`http://localhost:${PORT}`, {
        auth: { token: aliceToken },
        transports: ["websocket"],
    });

    const socketBagchi = ClientIO(`http://localhost:${PORT}`, {
        auth: { token: bagchiToken },
        transports: ["websocket"],
    });

    await Promise.all([
        new Promise((resolve) => socketAlice.once("connect", resolve)),
        new Promise((resolve) => socketBagchi.once("connect", resolve)),
    ]);
    console.log(`✓ Sockets connected (Alice=${socketAlice.id}, Bagchi=${socketBagchi.id})`);

    // 4. Join Bagchi Chat Room and wait for acknowledgment
    const joinPromise = Promise.all([
        new Promise((resolve) => socketAlice.once("room:joined", resolve)),
        new Promise((resolve) => socketBagchi.once("room:joined", resolve)),
    ]);
    socketAlice.emit("joinRoom", bagchiChat._id);
    socketBagchi.emit("joinRoom", bagchiChat._id);
    await joinPromise;

    // 5. Send message from Alice to Bagchi
    console.log(`[Step 4] Alice sending message to Bagchi: "Hello Bagchi, how are you?"`);
    const testMessageText = `Hello Bagchi! (iteration ${iterationNumber})`;

    const messageReceivedPromise = new Promise((resolve) => {
        socketBagchi.on("receiveMessage", (msg) => {
            if (msg.text === testMessageText) {
                resolve(msg);
            }
        });
    });

    socketAlice.emit("sendMessage", {
        roomId: bagchiChat._id,
        text: testMessageText,
    });

    const receivedMsg = await messageReceivedPromise;
    console.log(`✓ Bagchi received message: "${receivedMsg.text}" from userId=${receivedMsg.userId}`);

    // 6. Alice initiates Mediasoup SFU Call to Bagchi
    console.log(`[Step 5] Alice calling Bagchi via Mediasoup SFU (type: video)...`);
    const callIncomingPromise = new Promise((resolve) => {
        socketBagchi.once("call:incoming", (data) => {
            resolve(data);
        });
    });

    socketAlice.emit("call:start", {
        targetUserId: bagchi.id,
        type: "video",
    });

    const incomingCall = await callIncomingPromise;
    console.log(`✓ Bagchi received call:incoming: callId=${incomingCall.callId}, caller=${incomingCall.callerName}`);

    // 7. Bagchi Accepts the Call
    console.log(`[Step 6] Bagchi accepting call ${incomingCall.callId}...`);
    const callAcceptedPromise = new Promise((resolve) => {
        socketAlice.once("call:accepted", (data) => {
            resolve(data);
        });
    });

    socketBagchi.emit("call:accept", {
        callId: incomingCall.callId,
    });

    const acceptedCall = await callAcceptedPromise;
    console.log(`✓ Alice received call:accepted: callId=${acceptedCall.callId}`);

    // 8. Mediasoup SFU Transports Creation & Connection
    console.log(`[Step 7] Creating Mediasoup SFU Transports for Alice and Bagchi...`);
    const aliceSendTransport = await new Promise((resolve) => {
        socketAlice.emit("media:createTransport", { callId: incomingCall.callId, direction: "send" }, (res) => resolve(res));
    });
    const bagchiRecvTransport = await new Promise((resolve) => {
        socketBagchi.emit("media:createTransport", { callId: incomingCall.callId, direction: "recv" }, (res) => resolve(res));
    });

    if (!aliceSendTransport?.id || !bagchiRecvTransport?.id) {
        throw new Error(`Transport creation failed: Alice=${JSON.stringify(aliceSendTransport)}, Bagchi=${JSON.stringify(bagchiRecvTransport)}`);
    }
    console.log(`✓ Transports created: Alice Send=${aliceSendTransport.id}, Bagchi Recv=${bagchiRecvTransport.id}`);

    // 9. Produce Video from Alice -> Bagchi
    console.log(`[Step 8] Alice producing video on SFU...`);
    const newProducerPromise = new Promise((resolve) => {
        socketBagchi.once("media:newProducer", (data) => resolve(data));
    });

    const aliceProducerRes = await new Promise((resolve) => {
        socketAlice.emit("media:produce", {
            callId: incomingCall.callId,
            transportId: aliceSendTransport.id,
            kind: "video",
            rtpParameters: {
                codecs: [{ mimeType: "video/VP8", payloadType: 96, clockRate: 90000 }],
                encodings: [{ ssrc: 11111111 }],
            },
        }, (res) => resolve(res));
    });

    if (!aliceProducerRes || aliceProducerRes.error || !aliceProducerRes.id) {
        throw new Error(`Alice produce failed: ${JSON.stringify(aliceProducerRes?.error || aliceProducerRes)}`);
    }
    console.log(`✓ Alice produced video [producerId=${aliceProducerRes.id}]`);

    const announcedProducer = await newProducerPromise;
    console.log(`✓ Bagchi received media:newProducer: kind=${announcedProducer.kind}, producerId=${announcedProducer.producerId}`);

    // 10. Bagchi Consumes Video & Resumes
    console.log(`[Step 9] Bagchi consuming video on SFU...`);
    const consumeRes = await new Promise((resolve) => {
        socketBagchi.emit("media:consume", {
            callId: incomingCall.callId,
            producerId: announcedProducer.producerId,
            rtpCapabilities: {
                codecs: [{ mimeType: "video/VP8", kind: "video", preferredPayloadType: 96, clockRate: 90000 }],
                headerExtensions: [],
            },
        }, (res) => resolve(res));
    });

    if (!consumeRes || consumeRes.error || !consumeRes.id) {
        throw new Error(`Bagchi consume failed: ${JSON.stringify(consumeRes?.error || consumeRes)}`);
    }
    console.log(`✓ Bagchi created consumer [consumerId=${consumeRes.id}]`);

    const resumeRes = await new Promise((resolve) => {
        socketBagchi.emit("media:resumeConsumer", {
            callId: incomingCall.callId,
            consumerId: consumeRes.id,
        }, (res) => resolve(res));
    });
    if (!resumeRes || resumeRes.error) {
        throw new Error(`Bagchi resumeConsumer failed: ${JSON.stringify(resumeRes?.error || resumeRes)}`);
    }
    console.log(`✓ Bagchi resumed consumer successfully`);

    // 11. Alice ends call & verifies cleanup
    console.log(`[Step 10] Alice ending call ${incomingCall.callId}...`);
    const callEndedPromise = new Promise((resolve) => {
        socketBagchi.once("call:ended", (data) => resolve(data));
    });

    socketAlice.emit("call:end", {
        callId: incomingCall.callId,
        reason: "User finished conversation",
    });

    const endedData = await callEndedPromise;
    console.log(`✓ Bagchi received call:ended: reason="${endedData.reason}"`);

    // Disconnect sockets cleanly for next iteration
    socketAlice.disconnect();
    socketBagchi.disconnect();
    await new Promise((r) => setTimeout(r, 200));

    console.log(`✓ Iteration ${iterationNumber} COMPLETED WITH 100% SUCCESS!\n`);
}

async function main() {
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`E2E Test Server running on port ${PORT}`);

    try {
        for (let i = 1; i <= 4; i++) {
            await runIteration(i);
        }

        console.log(`===============================================================`);
        console.log(`🎉 ALL 4 E2E ITERATIONS PASSED CONSECUTIVELY WITH ZERO ERRORS! 🎉`);
        console.log(`===============================================================`);
    } catch (err) {
        console.error("❌ E2E TEST FAILED:", err);
        process.exitCode = 1;
    } finally {
        closeMediasoupWorkers();
        server.close();
    }
}

main();
