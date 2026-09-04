import socketService from './socketService';
import { callService } from './callService';

export type P2PMediaState = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface P2PMeshCallbacks {
  onLocalStream?: (stream: MediaStream) => void;
  onPeerStream?: (peerId: string, stream: MediaStream) => void;
  onPeerLeft?: (peerId: string) => void;
  onMediaStateChange?: (peerId: string, state: P2PMediaState) => void;
}


const iceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: (import.meta.env.VITE_TURN_USERNAME as string | undefined) || undefined,
      credential: (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) || undefined,
    });
  }
  return servers;
};

export class P2PMesh {
  private pcs = new Map<string, RTCPeerConnection>();
  private peerStreams = new Map<string, MediaStream>();
  private audioElements = new Map<string, HTMLAudioElement>();
  private restarted = new Set<string>();
  private localStream: MediaStream | null = null;
  private callId: string | null = null;
  private userId = '';
  private callType: 'audio' | 'video' = 'audio';
  private callbacks: P2PMeshCallbacks = {};
  private unbinds: Array<() => void> = [];

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  async join(options: {
    callId: string;
    userId: string;
    type?: 'audio' | 'video';
    peerIds?: string[];
    callbacks?: P2PMeshCallbacks;
  }): Promise<MediaStream> {
    this.leave();
    this.callId = options.callId;
    this.userId = String(options.userId);
    this.callType = options.type || 'audio';
    this.callbacks = options.callbacks || {};

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: this.callType === 'video'
        ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        : false,
    });
    this.localStream = stream;
    this.callbacks.onLocalStream?.(stream);

    this.unbinds.push(
      socketService.on('call:p2p-offer', (d) => this.onOffer(d)),
      socketService.on('call:p2p-answer', (d) => this.onAnswer(d)),
      socketService.on('call:p2p-ice', (d) => this.onIce(d)),
    );

    for (const peerId of options.peerIds || []) {
      if (String(peerId) !== this.userId) void this.addPeer(String(peerId));
    }
    return stream;
  }

  // Lower userId offers; the other side answers. No glare without a leader.
  private shouldOffer(peerId: string): boolean {
    return this.userId < peerId;
  }

  async addPeer(peerId: string): Promise<void> {
    if (this.pcs.has(peerId) || !this.callId || !this.localStream) return;
    const pc = this.createPC(peerId);
    for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    if (this.shouldOffer(peerId)) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      callService.sendP2POffer(this.callId, peerId, offer);
    }
  }

  private createPC(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pcs.set(peerId, pc);
    this.callbacks.onMediaStateChange?.(peerId, 'connecting');

    pc.onicecandidate = (e) => {
      if (e.candidate && this.callId) {
        callService.sendP2PIce(this.callId, peerId, e.candidate.toJSON());
      }
    };

    pc.ontrack = (e) => {
      let stream = this.peerStreams.get(peerId);
      if (!stream) {
        stream = new MediaStream();
        this.peerStreams.set(peerId, stream);
      }
      for (const track of e.streams[0]?.getTracks() || [e.track]) {
        if (!stream.getTracks().some((t) => t.id === track.id)) stream.addTrack(track);
      }
      this.callbacks.onPeerStream?.(peerId, stream);
      if (this.callType === 'audio') this.playAudio(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        this.restarted.delete(peerId);
        this.callbacks.onMediaStateChange?.(peerId, 'connected');
      } else if (state === 'disconnected') {
        this.callbacks.onMediaStateChange?.(peerId, 'disconnected');
      } else if (state === 'failed') {
        if (!this.restarted.has(peerId)) {
          this.restarted.add(peerId);
          void pc.restartIce();
        } else {
          this.callbacks.onMediaStateChange?.(peerId, 'failed');
        }
      }
    };

    return pc;
  }

  private async onOffer(data: unknown): Promise<void> {
    const { callId, fromUserId, payload } = this.parseSignal(data);
    if (!callId || !fromUserId || !payload || callId !== this.callId || !this.localStream) return;
    let pc = this.pcs.get(fromUserId);
    if (!pc) {
      pc = this.createPC(fromUserId);
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callService.sendP2PAnswer(callId, fromUserId, answer);
    } catch (err) {
      console.warn('[p2pMesh] Failed to answer offer:', err);
    }
  }

  private async onAnswer(data: unknown): Promise<void> {
    const { callId, fromUserId, payload } = this.parseSignal(data);
    if (!callId || !fromUserId || !payload || callId !== this.callId) return;
    try {
      await this.pcs.get(fromUserId)?.setRemoteDescription(new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit));
    } catch (err) {
      console.warn('[p2pMesh] Failed to apply answer:', err);
    }
  }

  private async onIce(data: unknown): Promise<void> {
    const { callId, fromUserId, payload } = this.parseSignal(data);
    if (!callId || !fromUserId || !payload || callId !== this.callId) return;
    try {
      await this.pcs.get(fromUserId)?.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
    } catch (err) {
      console.warn('[p2pMesh] Failed to add ICE candidate:', err);
    }
  }

  private parseSignal(data: unknown): { callId: string; fromUserId: string; payload: Record<string, unknown> | null } {
    const d = (data || {}) as Record<string, unknown>;
    const payload = d.payload && typeof d.payload === 'object' ? (d.payload as Record<string, unknown>) : null;
    return {
      callId: typeof d.callId === 'string' ? d.callId : '',
      fromUserId: typeof d.fromUserId === 'string' ? d.fromUserId : '',
      payload,
    };
  }

  private playAudio(peerId: string, stream: MediaStream): void {
    try {
      let el = this.audioElements.get(peerId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        this.audioElements.set(peerId, el);
      }
      el.srcObject = stream;
      void el.play().catch(() => {});
    } catch {
      // autoplay waits for user gesture
    }
  }

  primeAudio(): void {
    try {
      const el = new Audio();
      el.autoplay = true;
      void el.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  toggleMute(shouldMute?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = shouldMute !== undefined ? !shouldMute : !track.enabled;
    return !track.enabled;
  }

  toggleVideo(shouldDisable?: boolean): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = shouldDisable !== undefined ? !shouldDisable : !track.enabled;
    return !track.enabled;
  }

  peerCount(): number {
    return this.pcs.size;
  }

  leavePeer(peerId: string): void {
    try {
      this.pcs.get(peerId)?.close();
    } catch {
      // ignore
    }
    this.pcs.delete(peerId);
    this.peerStreams.delete(peerId);
    this.restarted.delete(peerId);
    const el = this.audioElements.get(peerId);
    if (el) {
      try {
        el.pause();
        el.srcObject = null;
      } catch {
        // ignore
      }
      this.audioElements.delete(peerId);
    }
    this.callbacks.onPeerLeft?.(peerId);
  }

  leave(): void {
    for (const peerId of [...this.pcs.keys()]) {
      try {
        this.pcs.get(peerId)?.close();
      } catch {
        // ignore
      }
    }
    this.pcs.clear();
    this.peerStreams.clear();
    this.restarted.clear();
    for (const el of this.audioElements.values()) {
      try {
        el.pause();
        el.srcObject = null;
      } catch {
        // ignore
      }
    }
    this.audioElements.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.localStream = null;
    }
    for (const unbind of this.unbinds) {
      try {
        unbind();
      } catch {
        // ignore
      }
    }
    this.unbinds = [];
    this.callId = null;
    this.callbacks = {};
  }
}

export const p2pMesh = new P2PMesh();
export default p2pMesh;
