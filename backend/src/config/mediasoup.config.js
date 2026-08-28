import os from "os";

/**
 * Mediasoup SFU Configuration
 * Environment-driven configuration supporting localhost development, LAN, and production.
 */
export const mediasoupConfig = {
    // Number of mediasoup workers to spawn
    numWorkers: Math.max(1, Number(process.env.MEDIASOUP_NUM_WORKERS) || Math.min(2, os.cpus().length || 1)),

    // Worker settings
    worker: {
        rtcMinPort: Number(process.env.MEDIASOUP_MIN_PORT) || 20000,
        rtcMaxPort: Number(process.env.MEDIASOUP_MAX_PORT) || 29999,
        logLevel: process.env.MEDIASOUP_LOG_LEVEL || "warn",
        logTags: [
            "info",
            "ice",
            "dtls",
            "rtp",
            "srtp",
            "rtcp",
        ],
    },

    // Router media codecs (RtpCodecCapability[])
    // Note: Do NOT add RTX codecs here; mediasoup handles RTX automatically.
    router: {
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000,
                parameters: {
                    "x-google-start-bitrate": 1000,
                },
            },
            {
                kind: "video",
                mimeType: "video/H264",
                clockRate: 90000,
                parameters: {
                    "packetization-mode": 1,
                    "profile-level-id": "42e01f",
                    "level-asymmetry-allowed": 1,
                    "x-google-start-bitrate": 1000,
                },
            },
            {
                kind: "video",
                mimeType: "video/VP9",
                clockRate: 90000,
                parameters: {
                    "profile-id": 0,
                    "x-google-start-bitrate": 1000,
                },
            },
        ],
    },

    // WebRtcTransport options
    webRtcTransport: {
        listenIps: [
            {
                ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
                announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || process.env.MEDIASOUP_ANNOUNCED_ADDRESS || "127.0.0.1",
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        maxSctpMessageSize: 262144,
    },
};

export default mediasoupConfig;
