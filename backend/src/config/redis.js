import { createClient } from "redis";

const CONNECT_TIMEOUT_MS = 5000;
const COMMAND_TIMEOUT_MS = 2000;
const DEFAULT_STALE_QUARANTINE_MS = 95000;
const TRANSIENT_UNHEALTHY_MS = 5000;

let redisClient = null;
let unhealthyUntil = 0;

export class RedisConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "RedisConfigurationError";
        this.code = "REDIS_CONFIGURATION_ERROR";
    }
}

export class RedisUnavailableError extends Error {
    constructor(message = "User cache is temporarily unavailable") {
        super(message);
        this.name = "RedisUnavailableError";
        this.code = "REDIS_UNAVAILABLE";
        this.statusCode = 503;
    }
}

const parseBoolean = (value, name) => {
    if (value === undefined || value === null || value === "") return false;
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    throw new RedisConfigurationError(`${name} must be either true or false`);
};

const safeErrorLabel = (error) => {
    if (!error || typeof error !== "object") return "UNKNOWN";
    const code = typeof error.code === "string" ? error.code : null;
    const name = typeof error.name === "string" ? error.name : null;
    return code || name || "UNKNOWN";
};

const reconnectStrategy = (retries) => {
    if (retries >= 6) {
        return new RedisUnavailableError("Redis reconnect attempts exhausted");
    }
    return Math.min(200 * (2 ** retries), 2000);
};

export const buildRedisOptions = (env = process.env) => {
    const nodeEnv = (env.NODE_ENV || "development").trim().toLowerCase();
    const defaultPrefix = `chatsocial:${nodeEnv}:user-cache:v1`;
    const prefix = (env.REDIS_KEY_PREFIX || defaultPrefix).trim();

    if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(prefix)) {
        throw new RedisConfigurationError("REDIS_KEY_PREFIX contains unsupported characters");
    }

    const commonOptions = {
        keyPrefix: `${prefix}:`,
        commandsQueueMaxLength: 1000,
        disableOfflineQueue: true,
        pingInterval: 30000,
    };

    const url = env.REDIS_URL?.trim();
    if (url) {
        let parsed;
        try {
            parsed = new URL(url);
        } catch {
            throw new RedisConfigurationError("REDIS_URL must be a valid Redis URL");
        }

        if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
            throw new RedisConfigurationError("REDIS_URL must use redis: or rediss:");
        }

        return {
            ...commonOptions,
            url,
            socket: {
                connectTimeout: CONNECT_TIMEOUT_MS,
                reconnectStrategy,
            },
        };
    }

    const host = env.REDIS_HOST?.trim();
    const port = Number(env.REDIS_PORT);
    const password = env.REDIS_PASSWORD;

    if (!host) {
        throw new RedisConfigurationError("REDIS_HOST is required when REDIS_URL is not set");
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new RedisConfigurationError("REDIS_PORT must be an integer between 1 and 65535");
    }
    if (typeof password !== "string" || password.length === 0) {
        throw new RedisConfigurationError("REDIS_PASSWORD is required when REDIS_URL is not set");
    }

    const username = env.REDIS_USERNAME?.trim();
    const tls = parseBoolean(env.REDIS_TLS, "REDIS_TLS");

    return {
        ...commonOptions,
        username: username || undefined,
        password,
        socket: {
            host,
            port,
            tls,
            connectTimeout: CONNECT_TIMEOUT_MS,
            reconnectStrategy,
        },
    };
};

export const getRedisClient = () => {
    if (!redisClient) {
        throw new RedisUnavailableError("Redis has not been initialized");
    }
    return redisClient;
};

export const isRedisReady = () => (
    Boolean(redisClient?.isReady) && Date.now() >= unhealthyUntil
);

export const requireRedisReady = () => {
    if (!isRedisReady()) {
        throw new RedisUnavailableError();
    }
    return redisClient;
};

export const markRedisUnhealthy = (error, { staleRisk = false } = {}) => {
    const duration = staleRisk ? DEFAULT_STALE_QUARANTINE_MS : TRANSIENT_UNHEALTHY_MS;
    unhealthyUntil = Math.max(unhealthyUntil, Date.now() + duration);
    console.error(`[redis] marked unavailable (${safeErrorLabel(error)})`);
};

export const connectRedis = async (env = process.env) => {
    if (redisClient?.isReady) return redisClient;

    const client = createClient(buildRedisOptions(env));
    redisClient = client;

    client.on("error", (error) => {
        console.error(`[redis] client error (${safeErrorLabel(error)})`);
    });
    client.on("end", () => {
        console.warn("[redis] connection closed");
    });

    try {
        await client.connect();
        const commandClient = client.withAbortSignal(AbortSignal.timeout(COMMAND_TIMEOUT_MS));
        await commandClient.ping();
        unhealthyUntil = 0;
        console.log("Connected to Redis");
        return client;
    } catch (error) {
        if (client.isOpen) client.destroy();
        redisClient = null;
        throw new RedisUnavailableError(`Redis connection failed (${safeErrorLabel(error)})`);
    }
};

export const closeRedis = async () => {
    const client = redisClient;
    redisClient = null;
    unhealthyUntil = 0;

    if (!client?.isOpen) return;

    let timeout;
    try {
        await Promise.race([
            client.close(),
            new Promise((_, reject) => {
                timeout = setTimeout(
                    () => reject(new Error("Redis close timed out")),
                    COMMAND_TIMEOUT_MS
                );
                timeout.unref?.();
            }),
        ]);
    } catch {
        if (client.isOpen) client.destroy();
    } finally {
        clearTimeout(timeout);
    }
};

export const redisConstants = {
    COMMAND_TIMEOUT_MS,
    DEFAULT_STALE_QUARANTINE_MS,
};
