import { useState, useCallback, useEffect, useRef } from 'react';
import { CallLogItem } from '../UI/CallsSection';
import { socketService } from '../api/socketService';
import { webRTCService } from '../api/webRTCService';

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
  peerSocketId?: string;
}

export interface UseCallsReturn {
  calls: CallLogItem[];
  activeCall: ActiveCallState | null;
  startCall: (contactId: string, contactName: string, type?: 'audio' | 'video', avatar?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;
  toggleMute: () => void;
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
   * 1. Start an outgoing 1-to-1 WebRTC voice call
   */
  const startCall = useCallback(async (
    contactId: string,
    contactName: string,
    type: 'audio' | 'video' = 'audio',
    avatar?: string
  ) => {
    if (!contactId) return;

    try {
      // Initialize WebRTC peer connection
      await webRTCService.initPeerConnection({
        onIceCandidate: (candidate) => {
          const current = activeCallRef.current;
          const targetId = current?.contactId || contactId;
          const targetSocket = current?.peerSocketId;
          socketService.sendIceCandidate(targetId, candidate.toJSON(), targetSocket);
        },
        onRemoteStream: () => {
          setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
          } else if (state === 'disconnected' || state === 'failed') {
            setActiveCall((prev) => prev ? { ...prev, statusMessage: 'Reconnecting...' } : null);
          }
        },
      });

      const newCall: ActiveCallState = {
        contactId,
        contactName,
        avatar,
        type,
        direction: 'outgoing',
        status: 'calling',
        statusMessage: 'Calling...',
        isMuted: false,
      };

      setActiveCall(newCall);
      socketService.callUser(contactId, type);
    } catch (error) {
      console.error('Failed to initiate voice call:', error);
      setActiveCall({
        contactId,
        contactName,
        avatar,
        type,
        direction: 'outgoing',
        status: 'error',
        statusMessage: error instanceof Error ? error.message : 'Microphone unavailable',
      });
      webRTCService.cleanup();
      setTimeout(() => setActiveCall(null), 2500);
    }
  }, []);

  /**
   * 2. Accept an incoming call
   */
  const acceptCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;

    try {
      setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connecting audio...' } : null);

      await webRTCService.initPeerConnection({
        onIceCandidate: (candidate) => {
          const targetId = current.contactId;
          const targetSocket = current.peerSocketId;
          socketService.sendIceCandidate(targetId, candidate.toJSON(), targetSocket);
        },
        onRemoteStream: () => {
          callStartTimeRef.current = Date.now();
          setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            callStartTimeRef.current = Date.now();
            setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
          }
        },
      });

      socketService.acceptCall(current.contactId);
    } catch (error) {
      console.error('Failed to accept call:', error);
      setActiveCall((prev) => prev ? { ...prev, status: 'error', statusMessage: 'Audio device error' } : null);
      webRTCService.cleanup();
      setTimeout(() => setActiveCall(null), 2000);
    }
  }, []);

  /**
   * 3. Reject an incoming call
   */
  const rejectCall = useCallback((reason?: string) => {
    const current = activeCallRef.current;
    if (current) {
      socketService.rejectCall(current.contactId, reason || 'Call declined');

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

    webRTCService.cleanup();
    setActiveCall(null);
  }, [saveCallLog]);

  /**
   * 4. End an ongoing or ringing call
   */
  const endCall = useCallback(() => {
    const current = activeCallRef.current;
    if (current) {
      socketService.endCall(current.contactId, 'Call ended by user');

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
    webRTCService.cleanup();
    setActiveCall(null);
  }, [saveCallLog]);

  /**
   * 5. Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    const isMuted = webRTCService.toggleMute();
    setActiveCall((prev) => (prev ? { ...prev, isMuted } : null));
  }, []);

  /**
   * Wire Socket.IO WebRTC Signaling Event Listeners
   */
  useEffect(() => {
    // A. incoming-call
    const unbindIncoming = socketService.on('incoming-call', (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const data = payload as {
          callerId?: string;
          callerSocketId?: string;
          callerName?: string;
          callType?: 'audio' | 'video';
          callId?: string;
        };

        if (activeCallRef.current) {
          // Already busy in a call
          if (data.callerId) {
            socketService.rejectCall(data.callerId, 'User is busy in another call');
          }
          return;
        }

        if (data.callerId) {
          setActiveCall({
            callId: data.callId,
            contactId: data.callerId,
            contactName: data.callerName || `User ${data.callerId.slice(-4)}`,
            type: data.callType || 'audio',
            direction: 'incoming',
            status: 'ringing',
            statusMessage: 'Incoming call...',
            peerSocketId: data.callerSocketId,
            isMuted: false,
          });
        }
      }
    });

    // B. call-accepted (Caller receives this when receiver accepts)
    const unbindAccepted = socketService.on('call-accepted', async (payload: unknown) => {
      const current = activeCallRef.current;
      if (!current || current.direction !== 'outgoing') return;

      const data = payload as { acceptorId?: string; acceptorSocketId?: string; callId?: string };
      const targetSocketId = data.acceptorSocketId;
      const targetUserId = data.acceptorId || current.contactId;

      try {
        setActiveCall((prev) => prev ? {
          ...prev,
          peerSocketId: targetSocketId,
          status: 'connected',
          statusMessage: 'Connecting audio...'
        } : null);

        const offer = await webRTCService.createOffer();
        socketService.sendOffer(targetUserId, offer, targetSocketId);
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    });

    // C. offer (Receiver receives SDP offer from caller)
    const unbindOffer = socketService.on('offer', async (payload: unknown) => {
      const data = payload as { offer?: RTCSessionDescriptionInit; fromUserId?: string; fromSocketId?: string };
      if (!data.offer) return;

      try {
        const answer = await webRTCService.handleOffer(data.offer);
        const targetUserId = data.fromUserId || activeCallRef.current?.contactId;
        if (targetUserId) {
          socketService.sendAnswer(targetUserId, answer, data.fromSocketId);
        }
        setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // D. answer (Caller receives SDP answer from receiver)
    const unbindAnswer = socketService.on('answer', async (payload: unknown) => {
      const data = payload as { answer?: RTCSessionDescriptionInit };
      if (!data.answer) return;

      try {
        await webRTCService.handleAnswer(data.answer);
        setActiveCall((prev) => prev ? { ...prev, status: 'connected', statusMessage: 'Connected' } : null);
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    // E. ice-candidate (Both peers receive ICE candidates)
    const unbindIce = socketService.on('ice-candidate', async (payload: unknown) => {
      const data = payload as { candidate?: RTCIceCandidateInit };
      if (data.candidate) {
        await webRTCService.handleCandidate(data.candidate);
      }
    });

    // F. call-rejected (Caller receives rejection)
    const unbindRejected = socketService.on('call-rejected', (payload: unknown) => {
      const data = payload as { reason?: string; targetUserId?: string };
      const current = activeCallRef.current;
      const reason = data.reason || 'Call rejected';

      setActiveCall((prev) => prev ? { ...prev, status: 'rejected', statusMessage: reason } : null);

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

      webRTCService.cleanup();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'rejected' ? null : prev));
      }, 2000);
    });

    // G. call-ended (Call terminated by peer or server)
    const unbindEnded = socketService.on('call-ended', (payload: unknown) => {
      const data = payload as { reason?: string; fromUserId?: string };
      const current = activeCallRef.current;
      const reason = data?.reason || 'Call ended';

      setActiveCall((prev) => prev ? { ...prev, status: 'ended', statusMessage: reason } : null);

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
      webRTCService.cleanup();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'ended' ? null : prev));
      }, 1500);
    });

    // H. call-error
    const unbindError = socketService.on('call-error', (payload: unknown) => {
      const data = payload as { message?: string };
      const message = data.message || 'Call error';

      setActiveCall((prev) => prev ? { ...prev, status: 'error', statusMessage: message } : null);
      webRTCService.cleanup();
      setTimeout(() => {
        setActiveCall((prev) => (prev?.status === 'error' ? null : prev));
      }, 2500);
    });

    return () => {
      unbindIncoming();
      unbindAccepted();
      unbindOffer();
      unbindAnswer();
      unbindIce();
      unbindRejected();
      unbindEnded();
      unbindError();
    };
  }, [saveCallLog]);

  return {
    calls,
    activeCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}

export default useCalls;
