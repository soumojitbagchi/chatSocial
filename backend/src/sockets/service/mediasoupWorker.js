let mediasoup = null;
try {
    mediasoup = (await import("mediasoup")).default;
} catch {
    console.warn("[mediasoup] Module not available — SFU calling features are disabled. Install mediasoup to enable.");
}

import { mediasoupConfig } from "../../config/mediasoup.config.js";

/**
 * Worker Pool Management
 * Holds initialized mediasoup Worker instances and distributes Routers round-robin.
 */
const workers = [];
let nextWorkerIdx = 0;
let initPromise = null;

const ensureMediasoup = () => {
    if (!mediasoup) {
        const err = new Error("mediasoup is not installed — SFU calling is unavailable in this deployment");
        err.code = "MEDIASOUP_UNAVAILABLE";
        throw err;
    }
};

/**
 * Initialize all mediasoup workers configured in mediasoupConfig
 */
export const initMediasoupWorkers = async () => {
    ensureMediasoup();
    if (workers.length > 0) {
        return workers;
    }
    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        const { numWorkers, worker: workerSettings } = mediasoupConfig;
        console.log(`[mediasoup] Initializing ${numWorkers} worker(s)...`);

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                rtcMinPort: workerSettings.rtcMinPort,
                rtcMaxPort: workerSettings.rtcMaxPort,
                logLevel: workerSettings.logLevel,
                logTags: workerSettings.logTags,
            });

            worker.on("died", (error) => {
                console.error(`[mediasoup] Worker ${worker.pid} died unexpected:`, error);
                const idx = workers.indexOf(worker);
                if (idx !== -1) {
                    workers.splice(idx, 1);
                }
                // Spawn replacement worker
                mediasoup
                    .createWorker({
                        rtcMinPort: workerSettings.rtcMinPort,
                        rtcMaxPort: workerSettings.rtcMaxPort,
                        logLevel: workerSettings.logLevel,
                        logTags: workerSettings.logTags,
                    })
                    .then((newWorker) => {
                        console.log(`[mediasoup] Spawned replacement worker ${newWorker.pid}`);
                        workers.push(newWorker);
                    })
                    .catch((err) => {
                        console.error("[mediasoup] Failed to spawn replacement worker:", err);
                    });
            });

            workers.push(worker);
            console.log(`[mediasoup] Worker ${worker.pid} created successfully`);
        }

        return workers;
    })();

    return initPromise;
};

/**
 * Get next available Worker (round-robin)
 */
export const getMediasoupWorker = async () => {
    ensureMediasoup();
    if (workers.length === 0) {
        await initMediasoupWorkers();
    }
    if (workers.length === 0) {
        throw new Error("No mediasoup workers available");
    }

    const worker = workers[nextWorkerIdx];
    nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
    return worker;
};

/**
 * Create a new Router on the next available worker with standard media codecs
 */
export const createMediasoupRouter = async () => {
    const worker = await getMediasoupWorker();
    const router = await worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs,
    });
    console.log(`[mediasoup] Router created [routerId=${router.id}] on worker ${worker.pid}`);
    return router;
};

/**
 * Check if mediasoup is available
 */
export const isMediasoupAvailable = () => !!mediasoup;

/**
 * Close and clean up all workers (e.g. during server shutdown)
 */
export const closeMediasoupWorkers = () => {
    for (const worker of workers) {
        try {
            worker.close();
        } catch (err) {
            console.warn(`[mediasoup] Error closing worker ${worker.pid}:`, err);
        }
    }
    workers.length = 0;
    nextWorkerIdx = 0;
    initPromise = null;
    console.log("[mediasoup] All workers closed");
};

export default {
    initMediasoupWorkers,
    getMediasoupWorker,
    createMediasoupRouter,
    closeMediasoupWorkers,
    isMediasoupAvailable,
};

