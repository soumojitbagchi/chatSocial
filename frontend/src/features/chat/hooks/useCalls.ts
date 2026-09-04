import { useState, useCallback, useEffect, useRef } from 'react';
import { CallLogItem } from '../UI/CallsSection';
import { socketService } from '../api/socketService';
import { callService } from '../api/callService';
import { mediaService } from '../api/mediaService';
import { p2pMesh } from '../api/p2pMeshService';
import { authService } from '../../auth/api/authService';
import { chatApi } from '../api/chatApi';
export interface ActiveCallState {
  callId?: string;
  contactName: string;
  contactId: string;
  avatar?: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'error';
  statusMessage?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  sfu?: boolean;
  peerIds?: string[];
}

export interface UseCallsReturn {
  calls: CallLogItem[];
  missedCalls: CallLogItem[];
  unseenMissedCount: number;
  activeCall: ActiveCallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  peerNames: Record<string, string>;
  markMissedSeen: (ids?: string[]) => Promise<void>;
  refreshCallHistory: () => Promise<void>;
  invitePeer: (targetUserId: string, name?: string) => Promise<void>;
  startCall: (
    contactIdOrName: string,
    contactNameOrType?: string | 'audio' | 'video',
    typeOrAvatar?: 'audio' | 'video' | string,
    avatar?: string
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: (reason?: string) => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CALL_LOGS_KEY = 'chatSocial_call_logs';

export function useCalls(): UseCallsReturn {
  const [calls, setCalls] = useState<CallLogItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CALL_LOGS_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const [missedCalls, setMissedCalls] = useState<CallLogItem[]>([]);
  const [unseenMissedCount, setUnseenMissedCount] = useState(0);

  const activeCallRef = useRef<ActiveCallState | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const callStartTimeRef = useRef<number | null>(null);

  const fetchCallLogs = useCallback(async () => {
    try {
      const [dbLogs, missed] = await Promise.all([
        chatApi.getCallLogs('all'),
        chatApi.getMissedCalls(),
      ]);
      if (Array.isArray(dbLogs)) {
        setCalls(dbLogs as CallLogItem[]);
        if (typeof window !== 'undefined') {
          if (dbLogs.length === 0) {
            localStorage.removeItem(CALL_LOGS_KEY);
          } else {
            localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(dbLogs.slice(0, 50)));
          }
        }
      }
      setMissedCalls((missed.calls || []) as CallLogItem[]);
      setUnseenMissedCount(missed.unseenMissedCount || 0);
    } catch {}
  }, []);

  // Backwards-compatible alias (History section refresh).
  const refreshCallHistory = fetchCallLogs;

  const markMissedSeen = useCallback(async (ids?: string[]) => {
    // Optimistic: clear red immediately, confirm from server after.
    setCalls((prev) => prev.map((c) => (c.direction === 'missed' && !c.seen ? { ...c, seen: true } : c)));
    setMissedCalls((prev) => prev.map((c) => (!c.seen ? { ...c, seen: true } : c)));
    setUnseenMissedCount(0);
    try {
      const remaining = await chatApi.markMissedSeen(ids);
      setUnseenMissedCount(remaining);
      if (remaining > 0) void fetchCallLogs();
    } catch {}
  }, [fetchCallLogs]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) {
        void fetchCallLogs();
      }
    }, 0);

    const handleFocus = () => {
      if (isSubscribed && document.visibilityState === 'visible') {
        void fetchCallLogs();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [fetchCallLogs]);

  const saveCallLog = useCallback((log: CallLogItem) => {
    setCalls((prev) => {
      const updated = [log, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(updated.slice(0, 50)));
        } catch {}
      }
      return updated;
    });
  }, []);

  const formatCallDuration = (seconds: number): string => {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };


  const cleanupMedia = useCallback(() => {
    mediaService.cleanup();
    p2pMesh.leave();
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams({});
  }, []);

  const currentUserId = useCallback(() => {
    const u = authService.getStoredUser();
    return String(u?.id || u?._id || '');
  }, []);

  const startMedia = useCallback(async (callId: string, type: 'audio' | 'video', sfu: boolean, peerIds: string[]) => {
    if (sfu) {
      await mediaService.initCallMedia({
        callId,
        type,
        onRemoteStream: (stream) => {
          setRemoteStream(new MediaStream(stream.getTracks()));
          setRemoteStreams((prev) => {
            const first = Object.keys(prev)[0];
            if (first) return prev;
            return { ...prev, [peerIds[0] || 'peer']: new MediaStream(stream.getTracks()) };
          });
          callStartTimeRef.current = Date.now();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null));
        },
        onLocalStream: (stream) => {
          setLocalStream(stream);
        },
        onMediaStateChange: (state) => {
          if (state === 'connected') {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null));
          } else if (state === 'disconnected' || state === 'failed') {
            setActiveCall((prev) => (prev ? { ...prev, statusMessage: 'Reconnecting...' } : null));
          }
        },
      });
      return;
    }

    await p2pMesh.join({
      callId,
      userId: currentUserId(),
      type,
      peerIds,
      callbacks: {
        onLocalStream: (stream) => {
          setLocalStream(stream);
        },
        onPeerStream: (peerId, stream) => {
          setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
          setRemoteStream((prev) => prev || stream);
          callStartTimeRef.current = Date.now();
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null));
        },
        onPeerLeft: (peerId) => {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
        },
        onMediaStateChange: (peerId, state) => {
          if (state === 'connected') {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null));
          } else if (state === 'disconnected' || state === 'failed') {
            setActiveCall((prev) => (prev ? { ...prev, statusMessage: 'Reconnecting...' } : null));
          }
        },
      },
    });
  }, [currentUserId]);

  const invitePeer = useCallback(async (targetUserId: string, name?: string) => {
    const current = activeCallRef.current;
    if (!current?.callId || !targetUserId) return;
    if (p2pMesh.peerCount() + 1 >= 6) {
      setActiveCall((prev) => (prev ? { ...prev, statusMessage: 'Call is full (max 6 for P2P)' } : null));
      return;
    }
    try {
      await callService.inviteToCall(current.callId, targetUserId);
      if (name) setPeerNames((prev) => ({ ...prev, [targetUserId]: name }));
    } catch (err) {
      console.error('[useCalls] Failed to invite peer:', err);
    }
  }, []);

  const startCall = useCallback(
    async (
      arg1: string,
      arg2?: string | 'audio' | 'video',
      arg3?: 'audio' | 'video' | string,
      arg4?: string
    ) => {
      if (!arg1) return;

      let contactId = arg1;
      let contactName = arg1;
      let type: 'audio' | 'video' = 'audio';
      let avatar: string | undefined = undefined;

      if (arg2 === 'audio' || arg2 === 'video') {
        contactId = arg1;
        contactName = arg1;
        type = arg2;
        avatar = typeof arg3 === 'string' ? arg3 : undefined;
      } else {
        contactId = arg1;
        contactName = typeof arg2 === 'string' ? arg2 : arg1;
        type = arg3 === 'video' ? 'video' : 'audio';
        avatar = arg4;
      }
      mediaService.primeAudio();
      p2pMesh.primeAudio();
      try {
        const newCall: ActiveCallState = {
          contactId,
          contactName,
          avatar,
          type,
          direction: 'outgoing',
          status: 'calling',
          statusMessage: 'Calling...',
          isMuted: false,
          isVideoOff: false,
        };
        setActiveCall(newCall);

        const res = await callService.startCall(contactId, type);
        setActiveCall((prev) => (prev ? { ...prev, callId: res.callId, status: 'calling' } : null));
      } catch (error) {
        console.error('[useCalls] Failed to initiate call:', error);
        const errMsg = error instanceof Error ? error.message : 'Call initiation failed';
        setActiveCall({
          contactId,
          contactName,
          avatar,
          type,
          direction: 'outgoing',
          status: 'error',
          statusMessage: errMsg,
        });
        mediaService.cleanup();
        p2pMesh.leave();
        setTimeout(() => setActiveCall(null), 2500);
      }
    },
    []
  );
  const acceptCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || !current.callId) return;

    try {
      mediaService.primeAudio();
      p2pMesh.primeAudio();
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connecting media...' } : null));
      await callService.acceptCall(current.callId);
      await startMedia(current.callId, current.type, current.sfu === true, [current.contactId]);
    } catch (error) {
      console.error('[useCalls] Failed to accept call:', error);
      setActiveCall((prev) => (prev ? { ...prev, status: 'error', statusMessage: 'Media device error' } : null));
      cleanupMedia();
      setTimeout(() => setActiveCall(null), 2000);
    }
  }, [startMedia, cleanupMedia]);

  const rejectCall = useCallback(
    async (reason: string = 'Call declined') => {
      const current = activeCallRef.current;
      if (current && current.callId) {
        try {
          await callService.rejectCall(current.callId, reason);
        } catch {}

        const now = new Date();
        saveCallLog({
          id: `call-${Date.now()}`,
          name: current.contactName,
          avatar: current.avatar || '',
          type: current.type,
          direction: 'missed',
          status: 'missed',
          duration: '0s',
          time: `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        void fetchCallLogs();
      }

      cleanupMedia();
      setActiveCall(null);
    },
    [saveCallLog, fetchCallLogs, cleanupMedia]
  );

  const endCall = useCallback(
    async (reason: string = 'Call ended by user') => {
      const current = activeCallRef.current;
      if (current && current.callId) {
        const isGroupMesh = current.sfu !== true && p2pMesh.peerCount() > 1;
        try {
          if (isGroupMesh) {
            await callService.leaveMeshCall(current.callId);
          } else {
            await callService.endCall(current.callId, reason);
          }
        } catch {}

        const durationSec = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
        const now = new Date();

        saveCallLog({
          id: `call-${Date.now()}`,
          name: current.contactName,
          avatar: current.avatar || '',
          type: current.type,
          direction: current.direction,
          status: 'completed',
          duration: formatCallDuration(durationSec),
          time: `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        void fetchCallLogs();
      }

      callStartTimeRef.current = null;
      cleanupMedia();
      setActiveCall(null);
    },
    [saveCallLog, fetchCallLogs, cleanupMedia]
  );

  const toggleMute = useCallback(() => {
    const sfuMuted = mediaService.toggleMute();
    const p2pMuted = p2pMesh.toggleMute();
    const isMuted = sfuMuted || p2pMuted;
    setActiveCall((prev) => (prev ? { ...prev, isMuted } : null));
  }, []);

  const toggleVideo = useCallback(() => {
    const sfuOff = mediaService.toggleVideo();
    const p2pOff = p2pMesh.toggleVideo();
    const isVideoOff = sfuOff || p2pOff;
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff } : null));
  }, []);

  useEffect(() => {
    // Server-side history changed (missed recorded, seen marked elsewhere).
    const unbindHistory = socketService.on('call:history-updated', () => {
      void fetchCallLogs();
    });
    const unbindMissed = socketService.on('call:missed', () => {
      void fetchCallLogs();
    });
    const handleIncoming = (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as {
          callId?: string;
          callerId?: string;
          callerName?: string;
          callerUsername?: string;
          callerAvatar?: string;
          avatar?: string;
          name?: string;
          type?: 'audio' | 'video';
          callType?: 'audio' | 'video';
          sfu?: boolean;
          peerIds?: string[];
        };

        if (activeCallRef.current) {
          if (data.callId) {
            callService.rejectCall(data.callId, 'User is busy in another call');
          }
          return;
        }

        if (data.callId && data.callerId) {
          const resolvedName = data.callerName || data.name || (data.callerUsername ? `@${data.callerUsername}` : `User ${data.callerId.slice(-4)}`);
          const resolvedAvatar = data.callerAvatar || data.avatar || '';

          setActiveCall({
            callId: data.callId,
            contactId: data.callerId,
            contactName: resolvedName,
            avatar: resolvedAvatar,
            type: data.type || data.callType || 'audio',
            direction: 'incoming',
            status: 'ringing',
            statusMessage: `Incoming ${data.type === 'video' || data.callType === 'video' ? 'Video' : 'Audio'} Call...`,
            isMuted: false,
            sfu: data.sfu === true,
            peerIds: data.peerIds || [data.callerId],
          });
          setPeerNames((prev) => ({ ...prev, [data.callerId]: resolvedName }));
        }
      }
    };

    const unbindIncoming = socketService.on('call:incoming', handleIncoming);
    const unbindIncomingLegacy = socketService.on('incoming-call', handleIncoming);
    const handleAccepted = async (payload: unknown) => {
      const current = activeCallRef.current;
      if (!current || current.direction !== 'outgoing') return;

      const data = payload as {
        callId?: string;
        participantId?: string;
        acceptorName?: string;
        acceptorAvatar?: string;
        avatar?: string;
        name?: string;
        type?: 'audio' | 'video';
        sfu?: boolean;
      };
      const callId = data.callId || current.callId;
      if (!callId) return;

      const resolvedAvatar = data.acceptorAvatar || data.avatar || current.avatar;
      const resolvedName = data.acceptorName || data.name || current.contactName;
      const sfu = data.sfu === true;

      try {
        setActiveCall((prev) =>
          prev
            ? {
                ...prev,
                callId,
                contactName: resolvedName,
                avatar: resolvedAvatar,
                status: 'connected',
                statusMessage: 'Connecting media...',
                sfu,
              }
            : null
        );
        await startMedia(callId, current.type, sfu, [current.contactId]);
      } catch (err) {
        console.error('[useCalls] Error initializing caller media on call:accepted:', err);
      }
    };

    const unbindAccepted = socketService.on('call:accepted', handleAccepted);
    const unbindAcceptedLegacy = socketService.on('call-accepted', handleAccepted);

    const unbindNewProducer = socketService.on('media:newProducer', async (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as { producerId?: string; kind?: 'audio' | 'video' };
        if (data.producerId) {
          await mediaService.consumeProducer(data.producerId);
        }
      }
    });
    const unbindProducerClosed = socketService.on('media:producerClosed', (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as { producerId?: string };
        if (data.producerId) {
          mediaService.removeConsumer(data.producerId);
        }
      }
    });


    const handleRejected = (payload: unknown) => {
      const data = payload as { reason?: string; targetUserId?: string };
      const current = activeCallRef.current;
      const reason = data?.reason || 'Call rejected';

      setActiveCall((prev) => (prev ? { ...prev, status: 'rejected', statusMessage: reason } : null));

      if (current) {
        const now = new Date();
        saveCallLog({
          id: `call-${Date.now()}`,
          name: current.contactName,
          avatar: current.avatar || '',
          type: current.type,
          direction: 'outgoing',
          status: 'missed',
          duration: '0s',
          time: `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        void fetchCallLogs();
      }
      cleanupMedia();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'rejected' ? null : prev));
      }, 2000);
    };

    const unbindRejected = socketService.on('call:rejected', handleRejected);
    const unbindRejectedLegacy = socketService.on('call-rejected', handleRejected);


    const handleEnded = (payload: unknown) => {
      const data = payload as { reason?: string; fromUserId?: string };
      const current = activeCallRef.current;
      const reason = data?.reason || 'Call ended';

      setActiveCall((prev) => (prev ? { ...prev, status: 'ended', statusMessage: reason } : null));

      if (current) {
        const durationSec = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
        const now = new Date();

        saveCallLog({
          id: `call-${Date.now()}`,
          name: current.contactName,
          avatar: current.avatar || '',
          type: current.type,
          direction: current.direction,
          status: 'completed',
          duration: formatCallDuration(durationSec),
          time: `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        void fetchCallLogs();
      }
      callStartTimeRef.current = null;
      cleanupMedia();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'ended' ? null : prev));
      }, 1500);
    };

    const unbindEnded = socketService.on('call:ended', handleEnded);
    const unbindEndedLegacy = socketService.on('call-ended', handleEnded);


    const handleError = (payload: unknown) => {
      const data = payload as { message?: string; code?: string };
      const message = data?.message || 'Call error';

      setActiveCall((prev) => (prev ? { ...prev, status: 'error', statusMessage: message } : null));
      cleanupMedia();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'error' ? null : prev));
      }, 2500);
    };

    const unbindError = socketService.on('call:error', handleError);
    const unbindErrorLegacy = socketService.on('call-error', handleError);

    const unbindPeerJoined = socketService.on('call:peer-joined', (payload: unknown) => {
      const data = (payload || {}) as { callId?: string; peerId?: string };
      const current = activeCallRef.current;
      if (!current?.callId || data.callId !== current.callId || !data.peerId) return;
      if (current.sfu === true) return;
      setPeerNames((prev) => ({ ...prev, [data.peerId as string]: prev[data.peerId as string] || `User ${(data.peerId as string).slice(-4)}` }));
      void p2pMesh.addPeer(data.peerId).catch((err) => {
        console.error('[useCalls] Failed to connect mesh peer:', err);
      });
    });

    const unbindPeerLeft = socketService.on('call:peer-left', (payload: unknown) => {
      const data = (payload || {}) as { callId?: string; peerId?: string };
      const current = activeCallRef.current;
      if (!current?.callId || data.callId !== current.callId || !data.peerId) return;
      p2pMesh.leavePeer(data.peerId);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[data.peerId as string];
        return next;
      });
    });

    return () => {
      unbindHistory();
      unbindMissed();
      unbindPeerJoined();
      unbindPeerLeft();
      unbindIncoming();
      unbindIncomingLegacy();
      unbindAccepted();
      unbindAcceptedLegacy();
      unbindNewProducer();
      unbindProducerClosed();
      unbindRejected();
      unbindRejectedLegacy();
      unbindEnded();
      unbindEndedLegacy();
      unbindError();
      unbindErrorLegacy();
    };
  }, [saveCallLog, fetchCallLogs]);

  return {
    calls,
    missedCalls,
    unseenMissedCount,
    activeCall,
    localStream,
    remoteStream,
    remoteStreams,
    peerNames,
    markMissedSeen,
    refreshCallHistory,
    invitePeer,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}

export default useCalls;
