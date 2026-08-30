import { useState, useCallback, useEffect, useRef } from 'react';
import { CallLogItem } from '../UI/CallsSection';
import { socketService } from '../api/socketService';
import { callService } from '../api/callService';
import { mediaService } from '../api/mediaService';

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
  activeCall: ActiveCallState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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

  const activeCallRef = useRef<ActiveCallState | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const callStartTimeRef = useRef<number | null>(null);

  const saveCallLog = useCallback((log: CallLogItem) => {
    setCalls((prev) => {
      const updated = [log, ...prev];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(updated.slice(0, 50)));
        } catch {
          // Ignore localStorage errors
        }
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

  /**
   * 1. Start an outgoing 1-to-1 WebRTC SFU Call
   */
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
        // 3-arg signature: startCall(name, 'audio' | 'video', avatar?)
        contactId = arg1;
        contactName = arg1;
        type = arg2;
        avatar = typeof arg3 === 'string' ? arg3 : undefined;
      } else {
        // 4-arg signature: startCall(contactId, contactName, 'audio' | 'video', avatar?)
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

  /**
   * 2. Accept an incoming call
   */
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

  /**
   * 3. Reject an incoming call
   */
  const rejectCall = useCallback(
    async (reason: string = 'Call declined') => {
      const current = activeCallRef.current;
      if (current && current.callId) {
        try {
          await callService.rejectCall(current.callId, reason);
        } catch {
          // Ignore
        }

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
      }

      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
    },
    [saveCallLog]
  );

  /**
   * 4. End an ongoing or ringing call
   */
  const endCall = useCallback(
    async (reason: string = 'Call ended by user') => {
      const current = activeCallRef.current;
      if (current && current.callId) {
        try {
          await callService.endCall(current.callId, reason);
        } catch {
          // Ignore
        }

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
      }

      callStartTimeRef.current = null;
      mediaService.cleanup();
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
    },
    [saveCallLog]
  );

  /**
   * 5. Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    const isMuted = mediaService.toggleMute();
    setActiveCall((prev) => (prev ? { ...prev, isMuted } : null));
  }, []);

  /**
   * 6. Toggle camera video on/off
   */
  const toggleVideo = useCallback(() => {
    const isVideoOff = mediaService.toggleVideo();
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff } : null));
  }, []);

  /**
   * Wire Socket.IO Application Call and Mediasoup Event Listeners
   */
  useEffect(() => {
    // A. call:incoming
    const handleIncoming = (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as {
          callId?: string;
          callerId?: string;
          callerName?: string;
          callerAvatar?: string;
          callerUsername?: string;
          avatar?: string;
          name?: string;
          type?: 'audio' | 'video';
          callType?: 'audio' | 'video';
        };

        if (activeCallRef.current) {
          // Already busy in a call -> reject automatically
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
            isVideoOff: false,
          });
        }
      }
    };

    const unbindIncoming = socketService.on('call:incoming', handleIncoming);
    const unbindIncomingLegacy = socketService.on('incoming-call', handleIncoming);

    // B. call:accepted (Caller receives this when receiver accepts)
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

    // C. media:newProducer (Peer created a new audio or video producer)
    const unbindNewProducer = socketService.on('media:newProducer', async (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as { producerId?: string; kind?: 'audio' | 'video' };
        if (data.producerId) {
          await mediaService.consumeProducer(data.producerId);
        }
      }
    });

    // D. media:producerClosed
    const unbindProducerClosed = socketService.on('media:producerClosed', (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as { producerId?: string };
        if (data.producerId) {
          mediaService.removeConsumer(data.producerId);
        }
      }
    });

    // E. call:rejected (Caller receives rejection)
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

    // F. call:ended (Call terminated by peer or server)
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

    // G. call:error
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
  }, [saveCallLog]);

  return {
    calls,
    activeCall,
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}

export default useCalls;
