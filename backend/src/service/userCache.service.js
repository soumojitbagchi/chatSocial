import crypto from "crypto";
import {
    getRedisClient,
    markRedisUnhealthy,
    redisConstants,
    requireRedisReady,
    RedisUnavailableError,
} from "../config/redis.js";

const DIRECTORY_EPOCH_KEY = "epoch:directory";
const INCREMENT_EPOCHS_SCRIPT = `
for _, key in ipairs(KEYS) do
    redis.call("INCR", key)
end
return #KEYS
`;
const SEARCH_TTL = { min: 45, max: 60 };
const CONNECTIONS_TTL = { min: 30, max: 45 };
const AUTH_PROFILE_TTL = { min: 60, max: 90 };
const MAX_SEARCH_CODE_POINTS = 100;

const toId = (value) => {
    const source = value?.id ?? value?._id ?? value;
    const id = source?.toString?.() ?? "";
    if (!/^[a-f0-9]{24}$/i.test(id)) {
        throw new TypeError("Cached user data requires a valid id");
    }
    return id;
};

const toStringValue = (value, fallback = "") => (
    typeof value === "string" ? value : fallback
);

const toTimestamp = (value) => {
    if (!value) return undefined;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
    throw new TypeError("Cached request data contains an invalid timestamp");
};

export const toAuthUserDto = (user) => {
    if (!user || typeof user !== "object") {
        throw new TypeError("Auth profile must be an object");
    }

    return {
        id: toId(user),
        name: toStringValue(user.name),
        email: toStringValue(user.email),
        username: toStringValue(user.username),
        isEmailVerified: Boolean(user.isEmailVerified),
        avatar: toStringValue(user.avatar),
        about: toStringValue(user.about),
        phone: toStringValue(user.phone),
    };
};

export const toSearchCandidateDto = (user) => {
    if (!user || typeof user !== "object") {
        throw new TypeError("Search candidate must be an object");
    }

    return {
        id: toId(user),
        name: toStringValue(user.name),
        username: toStringValue(user.username),
        email: toStringValue(user.email),
        avatar: toStringValue(user.avatar),
        about: toStringValue(user.about) || "Hey there! I am using chatSocial.",
    };
};

const toConnectionContactDto = (contact) => ({
    id: toId(contact),
    name: toStringValue(contact.name),
    username: toStringValue(contact.username),
    email: toStringValue(contact.email),
    avatar: toStringValue(contact.avatar),
    about: toStringValue(contact.about),
    roomId: contact.roomId ? toId(contact.roomId) : null,
});

const toPendingRequestDto = (request) => ({
    id: toId(request),
    name: toStringValue(request.name),
    username: toStringValue(request.username),
    email: toStringValue(request.email),
    avatar: toStringValue(request.avatar),
    about: toStringValue(request.about),
    requestedAt: toTimestamp(request.requestedAt),
});

export const toConnectionSnapshotDto = (snapshot) => {
    if (snapshot === null) return null;
    if (!snapshot || typeof snapshot !== "object") {
        throw new TypeError("Connection snapshot must be an object");
    }

    if (!Array.isArray(snapshot.contacts)
        || !Array.isArray(snapshot.pendingIncoming)
        || !Array.isArray(snapshot.pendingOutgoing)) {
        throw new TypeError("Connection snapshot arrays are required");
    }

    return {
        contacts: snapshot.contacts.map(toConnectionContactDto),
        pendingIncoming: snapshot.pendingIncoming.map(toPendingRequestDto),
        pendingOutgoing: snapshot.pendingOutgoing.map(toPendingRequestDto),
    };
};

const toSearchCandidates = (candidates) => {
    if (!Array.isArray(candidates)) {
        throw new TypeError("Search candidates must be an array");
    }
    return candidates.map(toSearchCandidateDto);
};

export const normalizeSearchQuery = (value) => (
    Array.from((value ?? "").toString().trim().toLowerCase())
        .slice(0, MAX_SEARCH_CODE_POINTS)
        .join("")
);

const relationshipEpochKey = (userId) => `epoch:relationships:${toId(userId)}`;
const authProfileEpochKey = (userId) => `epoch:auth-profile:${toId(userId)}`;
const parseEpoch = (value) => {
    if (value === null || value === undefined) return "0";
    if (!/^\d+$/.test(value.toString())) {
        throw new RedisUnavailableError("Redis epoch data is invalid");
    }
    return value.toString();
};

const hashQuery = (query) => crypto.createHash("sha256").update(query).digest("hex");

export const createUserCache = ({
    getClient = getRedisClient,
    ensureReady = requireRedisReady,
    onUnhealthy = markRedisUnhealthy,
    randomInt = crypto.randomInt,
    commandTimeoutMs = redisConstants.COMMAND_TIMEOUT_MS,
} = {}) => {
    const ttlWithJitter = ({ min, max }) => randomInt(min, max + 1);

    const execute = async (operation) => {
        let client;
        try {
            ensureReady();
            client = getClient();
        } catch (error) {
            if (error?.code === "REDIS_UNAVAILABLE") throw error;
            throw new RedisUnavailableError();
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), commandTimeoutMs);
        timer.unref?.();

        try {
            const commandClient = typeof client.withAbortSignal === "function"
                ? client.withAbortSignal(controller.signal)
                : client;
            return await operation(commandClient);
        } catch (error) {
            onUnhealthy(error, { staleRisk: false });
            if (error?.code === "REDIS_UNAVAILABLE") throw error;
            throw new RedisUnavailableError();
        } finally {
            clearTimeout(timer);
        }
    };

    const readEpochs = async (keys) => {
        const values = await execute((client) => client.mGet(keys));
        if (!Array.isArray(values) || values.length !== keys.length) {
            throw new RedisUnavailableError("Redis epoch response is invalid");
        }
        return values.map(parseEpoch);
    };

    const readThrough = async ({ key, loader, sanitize, ttl }) => {
        const cached = await execute((client) => client.get(key));
        if (cached !== null) {
            try {
                return sanitize(JSON.parse(cached));
            } catch (error) {
                try {
                    await execute((client) => client.del(key));
                } catch {
                    // The original invalid-payload error remains the request outcome.
                }
                onUnhealthy(error, { staleRisk: false });
                throw new RedisUnavailableError("Cached user data is invalid");
            }
        }

        const loaded = await loader();
        if (loaded === null) return null;
        const sanitized = sanitize(loaded);
        await execute((client) => client.setEx(key, ttlWithJitter(ttl), JSON.stringify(sanitized)));
        return sanitized;
    };

    const incrementEpochs = async (keys) => {
        const uniqueKeys = [...new Set(keys)];
        if (uniqueKeys.length === 0) {
            ensureReady();
            return;
        }

        await execute((client) => client.eval(INCREMENT_EPOCHS_SCRIPT, {
            keys: uniqueKeys,
            arguments: [],
        }));
    };

    const invalidateRelationships = (userIds) => incrementEpochs(
        userIds.filter(Boolean).map(relationshipEpochKey)
    );

    const invalidateAuthProfiles = (userIds) => incrementEpochs(
        userIds.filter(Boolean).map(authProfileEpochKey)
    );

    const invalidateDirectory = () => incrementEpochs([DIRECTORY_EPOCH_KEY]);

    const invalidateDirectoryAndAuth = (userIds = []) => incrementEpochs([
        DIRECTORY_EPOCH_KEY,
        ...userIds.filter(Boolean).map(authProfileEpochKey),
    ]);

    const getSearchCandidates = async (query, loader) => {
        const normalizedQuery = normalizeSearchQuery(query);
        const [directoryEpoch] = await readEpochs([DIRECTORY_EPOCH_KEY]);
        const key = `search:d${directoryEpoch}:q:${hashQuery(normalizedQuery)}`;
        const candidates = await readThrough({
            key,
            loader: () => loader(normalizedQuery),
            sanitize: toSearchCandidates,
            ttl: SEARCH_TTL,
        });
        return { normalizedQuery, candidates };
    };

    const getConnectionSnapshot = async (userId, loader) => {
        const id = toId(userId);
        const [directoryEpoch, relationshipEpoch] = await readEpochs([
            DIRECTORY_EPOCH_KEY,
            relationshipEpochKey(id),
        ]);
        const key = `connections:${id}:d${directoryEpoch}:r${relationshipEpoch}`;
        return readThrough({
            key,
            loader,
            sanitize: toConnectionSnapshotDto,
            ttl: CONNECTIONS_TTL,
        });
    };

    const getAuthProfile = async (userId, loader) => {
        const id = toId(userId);
        const [profileEpoch] = await readEpochs([authProfileEpochKey(id)]);
        const key = `auth-profile:${id}:p${profileEpoch}`;
        return readThrough({
            key,
            loader,
            sanitize: toAuthUserDto,
            ttl: AUTH_PROFILE_TTL,
        });
    };

    const primeAuthProfile = async (user) => {
        const dto = toAuthUserDto(user);
        const [profileEpoch] = await readEpochs([authProfileEpochKey(dto.id)]);
        const key = `auth-profile:${dto.id}:p${profileEpoch}`;
        await execute((client) => client.setEx(
            key,
            ttlWithJitter(AUTH_PROFILE_TTL),
            JSON.stringify(dto)
        ));
        return dto;
    };

    const runCoherentMutation = async ({ invalidate, mutate, prime }) => {
        await invalidate();

        let result;
        let mutationError = null;
        try {
            result = await mutate();
        } catch (error) {
            mutationError = error;
        }

        try {
            await invalidate();
            if (!mutationError && prime) {
                await prime(result);
            }
        } catch (error) {
            onUnhealthy(error, { staleRisk: true });
            if (!mutationError) return result;
        }

        if (mutationError) throw mutationError;
        return result;
    };

    return {
        getSearchCandidates,
        getConnectionSnapshot,
        getAuthProfile,
        primeAuthProfile,
        invalidateRelationships,
        invalidateAuthProfiles,
        invalidateDirectory,
        invalidateDirectoryAndAuth,
        runCoherentMutation,
        requireReady: ensureReady,
    };
};

export const overlayConnectionPresence = (snapshot, isOnline) => {
    if (!snapshot) return null;
    return {
        ...snapshot,
        contacts: snapshot.contacts.map((contact) => ({
            ...contact,
            online: Boolean(isOnline(contact.id)),
        })),
    };
};

export const personalizeSearchCandidates = ({
    candidates,
    snapshot,
    currentUserId,
    isOnline,
    limit,
}) => {
    const contacts = new Map((snapshot?.contacts || []).map((contact) => [contact.id, contact]));
    const incoming = new Set((snapshot?.pendingIncoming || []).map((request) => request.id));
    const outgoing = new Set((snapshot?.pendingOutgoing || []).map((request) => request.id));
    const currentId = toId(currentUserId);

    return candidates
        .filter((candidate) => candidate.id !== currentId)
        .slice(0, limit)
        .map((candidate) => {
            const contact = contacts.get(candidate.id);
            let connectionStatus = "none";
            if (contact) connectionStatus = "connected";
            else if (outgoing.has(candidate.id)) connectionStatus = "pending_sent";
            else if (incoming.has(candidate.id)) connectionStatus = "pending_received";

            return {
                ...candidate,
                connectionStatus,
                roomId: contact?.roomId || null,
                online: Boolean(isOnline(candidate.id)),
            };
        });
};

const userCache = createUserCache();

export default userCache;
