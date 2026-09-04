import { useState, useCallback, useEffect, useRef } from 'react';
import { CallLogItem } from '../UI/CallsSection';
import { socketService } from '../api/socketService';
import { callService } from '../api/callService';
import { mediaService } from '../api/mediaService';
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
}

export interface UseCallsReturn {
  calls: CallLogItem[];
  missedCalls: CallLogItem[];
  unseenMissedCount: number;
  activeCall: ActiveCallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  markMissedSeen: (ids?: string[]) => Promise<void>;
  refreshCallHistory: () => Promise<void>;
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
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected', statusMessage: 'Connecting media...' } : null));
      await callService.acceptCall(current.callId);

      await mediaService.initCallMedia({
        callId: current.callId,
        type: current.type,
        onRemoteStream: (stream) => {
          setRemoteStream(new MediaStream(stream.getTracks()));
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
    } catch (error) {
      console.error('[useCalls] Failed to accept call:', error);
      setActiveCall((prev) => (prev ? { ...prev, status: 'error', statusMessage: 'Media device error' } : null));
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setTimeout(() => setActiveCall(null), 2000);
    }
  }, []);

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

      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
    },
    [saveCallLog, fetchCallLogs]
  );

  const endCall = useCallback(
    async (reason: string = 'Call ended by user') => {
      const current = activeCallRef.current;
      if (current && current.callId) {
        try {
          await callService.endCall(current.callId, reason);
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
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
    },
    [saveCallLog, fetchCallLogs]
  );

  const toggleMute = useCallback(() => {
    const isMuted = mediaService.toggleMute();
    setActiveCall((prev) => (prev ? { ...prev, isMuted } : null));
  }, []);

  const toggleVideo = useCallback(() => {
    const isVideoOff = mediaService.toggleVideo();
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
          });
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
      };
      const callId = data.callId || current.callId;
      if (!callId) return;

      const resolvedAvatar = data.acceptorAvatar || data.avatar || current.avatar;
      const resolvedName = data.acceptorName || data.name || current.contactName;

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
              }
            : null
        );
        await mediaService.initCallMedia({
          callId,
          type: current.type,
          onRemoteStream: (stream) => {
            setRemoteStream(new MediaStream(stream.getTracks()));
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
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
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
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
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
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'error' ? null : prev));
      }, 2500);
    };

    const unbindError = socketService.on('call:error', handleError);
    const unbindErrorLegacy = socketService.on('call-error', handleError);

    return () => {
      unbindHistory();
      unbindMissed();
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
    markMissedSeen,
    refreshCallHistory,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}

export default useCalls;
