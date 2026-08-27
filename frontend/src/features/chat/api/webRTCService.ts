/**
 * WebRTC Service
 * Manages RTCPeerConnection lifecycle, microphone media stream,
 * SDP offer/answer creation, ICE candidate negotiation, and remote audio playback.
 */

import { getRtcConfiguration, WebRTCConfiguration } from './rtcConfig';

export type IceCandidateCallback = (candidate: RTCIceCandidate) => void;
export type RemoteStreamCallback = (stream: MediaStream) => void;
export type ConnectionStateCallback = (state: RTCPeerConnectionState) => void;

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private candidateQueue: RTCIceCandidateInit[] = [];

  private onIceCandidateCallback: IceCandidateCallback | null = null;
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;
  private onConnectionStateCallback: ConnectionStateCallback | null = null;

  /**
   * Acquire local audio stream from user microphone
   */
  public async getLocalAudioStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Failed to get local audio media:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Initialize RTCPeerConnection and bind audio tracks & event handlers
   */
  public async initPeerConnection(options?: {
    customConfig?: Partial<WebRTCConfiguration>;
    onIceCandidate?: IceCandidateCallback;
    onRemoteStream?: RemoteStreamCallback;
    onConnectionStateChange?: ConnectionStateCallback;
  }): Promise<RTCPeerConnection> {
    this.cleanup();

    this.onIceCandidateCallback = options?.onIceCandidate || null;
    this.onRemoteStreamCallback = options?.onRemoteStream || null;
    this.onConnectionStateCallback = options?.onConnectionStateChange || null;

    const rtcConfig = getRtcConfiguration(options?.customConfig);
    const pc = new RTCPeerConnection(rtcConfig);
    this.peerConnection = pc;

    // Ensure local audio stream is acquired and tracks are added to peer connection
    const localStream = await this.getLocalAudioStream();
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle ICE candidates generated locally
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };

    // Handle incoming remote audio tracks
    pc.ontrack = (event: RTCTrackEvent) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      this.remoteStream = stream;
      this.playRemoteAudio(stream);

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(stream);
      }
    };

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      if (this.onConnectionStateCallback && this.peerConnection) {
        this.onConnectionStateCallback(this.peerConnection.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      // ICE state updates
    };

    return pc;
  }

  /**
   * Create SDP Offer (Caller side)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle SDP Offer and Create SDP Answer (Receiver side)
   */
  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.initPeerConnection();
    }

    const pc = this.peerConnection!;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Flush any ICE candidates that arrived before remote description was ready
    await this.flushCandidateQueue();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Handle SDP Answer (Caller side)
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection is not initialized');
    }

    if (this.peerConnection.signalingState === 'have-local-offer') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushCandidateQueue();
    }
  }

  /**
   * Handle incoming ICE candidate from signaling peer
   */
  public async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      this.candidateQueue.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.warn('Error adding ICE candidate:', error);
    }
  }

  /**
   * Drain queued candidates once remote description is set
   */
  private async flushCandidateQueue(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (error) {
          console.warn('Error applying queued ICE candidate:', error);
        }
      }
    }
  }

  /**
   * Play remote audio stream through an audio element
   */
  private playRemoteAudio(stream: MediaStream): void {
    try {
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.autoplay = true;
      }
      this.audioElement.srcObject = stream;
      this.audioElement.play().catch((err) => {
        console.warn('Audio auto-play waiting for user interaction:', err);
      });
    } catch (error) {
      console.error('Failed to set audio element srcObject:', error);
    }
  }

  /**
   * Toggle microphone mute state
   */
  public toggleMute(shouldMute?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const newEnabled = shouldMute !== undefined ? !shouldMute : !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    return !newEnabled; // returns isMuted
  }

  /**
   * Check if local audio is currently muted
   */
  public isMuted(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : false;
  }

  /**
   * Clean up all active WebRTC resources, audio playback, and media tracks
   */
  public cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    this.remoteStream = null;
    this.candidateQueue = [];
    this.onIceCandidateCallback = null;
    this.onRemoteStreamCallback = null;
    this.onConnectionStateCallback = null;
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;
