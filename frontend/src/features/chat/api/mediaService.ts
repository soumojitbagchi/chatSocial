import { Device } from 'mediasoup-client';
import type { Transport, Producer, Consumer } from 'mediasoup-client/types';
import callService from './callService';

export type RemoteStreamCallback = (stream: MediaStream) => void;
export type LocalStreamCallback = (stream: MediaStream) => void;
export type MediaStateCallback = (state: 'connecting' | 'connected' | 'disconnected' | 'failed') => void;

export class MediaService {
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private audioProducer: Producer | null = null;
  private videoProducer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map(); // producerId -> Consumer

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private currentCallId: string | null = null;
  private callType: 'audio' | 'video' = 'audio';

  private onRemoteStreamCallback: RemoteStreamCallback | null = null;
  private onLocalStreamCallback: LocalStreamCallback | null = null;
  private onMediaStateCallback: MediaStateCallback | null = null;
  private generation = 0;

  /**
   * Initialize mediasoup Device and WebRTC transports for a call
   */
  public async initCallMedia(options: {
    callId: string;
    type?: 'audio' | 'video';
    onRemoteStream?: RemoteStreamCallback;
    onLocalStream?: LocalStreamCallback;
    onMediaStateChange?: MediaStateCallback;
  }): Promise<void> {
    this.cleanup();
    const gen = this.generation;

    this.currentCallId = options.callId;
    this.callType = options.type || 'audio';
    this.onRemoteStreamCallback = options.onRemoteStream || null;
    this.onLocalStreamCallback = options.onLocalStream || null;
    this.onMediaStateCallback = options.onMediaStateChange || null;

    if (this.onMediaStateCallback) {
      this.onMediaStateCallback('connecting');
    }

    try {
      // 1. Get Router RTP Capabilities from server
      const routerRtpCapabilities = await callService.getRouterRtpCapabilities(this.currentCallId);

      // 2. Initialize and load mediasoup Device
      const device = new Device();
      await device.load({ routerRtpCapabilities });
      this.device = device;

      // 3. Create Send Transport on Server & Client
      const sendParams = await callService.createTransport(this.currentCallId, 'send');
      const sendTransport = device.createSendTransport({
        id: sendParams.id,
        iceParameters: sendParams.iceParameters,
        iceCandidates: sendParams.iceCandidates,
        dtlsParameters: sendParams.dtlsParameters,
      });

      sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await callService.connectTransport(this.currentCallId!, sendTransport.id, dtlsParameters);
          callback();
        } catch (err) {
          errback(err instanceof Error ? err : new Error(String(err)));
        }
      });

      sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
        try {
          const res = await callService.produce(
            this.currentCallId!,
            sendTransport.id,
            kind,
            rtpParameters,
            (appData || {}) as Record<string, unknown>
          );
          callback({ id: res.id });
        } catch (err) {
          errback(err instanceof Error ? err : new Error(String(err)));
        }
      });

      sendTransport.on('connectionstatechange', (state) => {
        if (state === 'connected') {
          if (this.onMediaStateCallback) this.onMediaStateCallback('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          if (this.onMediaStateCallback) this.onMediaStateCallback(state);
        }
      });

      this.sendTransport = sendTransport;

      // 4. Create Receive Transport on Server & Client
      const recvParams = await callService.createTransport(this.currentCallId, 'recv');
      const recvTransport = device.createRecvTransport({
        id: recvParams.id,
        iceParameters: recvParams.iceParameters,
        iceCandidates: recvParams.iceCandidates,
        dtlsParameters: recvParams.dtlsParameters,
      });

      recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await callService.connectTransport(this.currentCallId!, recvTransport.id, dtlsParameters);
          callback();
        } catch (err) {
          errback(err instanceof Error ? err : new Error(String(err)));
        }
      });

      recvTransport.on('connectionstatechange', (state) => {
        if (state === 'connected') {
          if (this.onMediaStateCallback) this.onMediaStateCallback('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          if (this.onMediaStateCallback) this.onMediaStateCallback(state);
        }
      });

      this.recvTransport = recvTransport;

      // 5. Acquire local media (Mic / Camera) and produce tracks
      await this.publishLocalMedia(gen);

      // 6. Consume any existing producers in the call
      await this.consumeExistingProducers();

      if (gen !== this.generation) {
        this.cleanup();
        throw new Error('Call ended while initializing media');
      }
    } catch (error) {
      console.error('[mediaService] Failed to initialize call media:', error);
      if (this.onMediaStateCallback) {
        this.onMediaStateCallback('failed');
      }
      this.cleanup();
      throw error;
    }
  }

  /**
   * Acquire local audio/video media stream and start producing on SendTransport
   */
  private async publishLocalMedia(gen: number): Promise<void> {
    if (!this.sendTransport || !this.device) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: this.callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (gen !== this.generation) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            // ignore
          }
        });
        throw new Error('Call ended while acquiring media');
      }
      this.localStream = stream;

      if (this.onLocalStreamCallback) {
        this.onLocalStreamCallback(stream);
      }

      // Produce Audio Track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && this.device.canProduce('audio')) {
        this.audioProducer = await this.sendTransport.produce({
          track: audioTrack,
          codecOptions: {
            opusStereo: true,
            opusDtx: true,
          },
        });
      }

      // Produce Video Track if enabled
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && this.device.canProduce('video')) {
        this.videoProducer = await this.sendTransport.produce({
          track: videoTrack,
        });
      }
    } catch (err) {
      console.error('[mediaService] Failed to get user media or produce tracks:', err);
      throw new Error('Microphone or camera access denied or unavailable');
    }
  }

  /**
   * Consume all existing producers in the call
   */
  public async consumeExistingProducers(): Promise<void> {
    if (!this.currentCallId) return;

    try {
      const producers = await callService.getProducers(this.currentCallId);
      for (const prod of producers) {
        await this.consumeProducer(prod.producerId);
      }
    } catch (err) {
      console.warn('[mediaService] Error consuming existing producers:', err);
    }
  }

  /**
   * Consume a specific remote producer
   */
  public async consumeProducer(producerId: string): Promise<Consumer | null> {
    if (!this.device || !this.recvTransport || !this.currentCallId) return null;
    if (this.consumers.has(producerId)) {
      return this.consumers.get(producerId)!;
    }

    try {
      const consumerParams = await callService.consume(
        this.currentCallId,
        producerId,
        this.device.rtpCapabilities
      );

      const consumer = await this.recvTransport.consume({
        id: consumerParams.id,
        producerId: consumerParams.producerId,
        kind: consumerParams.kind,
        rtpParameters: consumerParams.rtpParameters,
      });

      this.consumers.set(producerId, consumer);

      // Attach track to remote MediaStream
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(consumer.track);

      // Play remote audio through HTMLAudioElement
      if (consumer.kind === 'audio') {
        this.playRemoteAudio(this.remoteStream);
      }

      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }

      // Confirm local creation and resume consumer on server
      await callService.confirmConsumed(this.currentCallId, consumer.id);
      await callService.resumeConsumer(this.currentCallId, consumer.id);

      consumer.on('transportclose', () => {
        this.removeConsumer(producerId);
      });

      consumer.on('trackended', () => {
        this.removeConsumer(producerId);
      });

      console.log(`[mediaService] Consumed remote producer ${producerId} (${consumer.kind})`);
      return consumer;
    } catch (error) {
      console.error(`[mediaService] Error consuming producer ${producerId}:`, error);
      return null;
    }
  }

  /**
   * Remove and clean up a consumer when producer closes
   */
  public removeConsumer(producerId: string): void {
    const consumer = this.consumers.get(producerId);
    if (!consumer) return;

    try {
      if (this.remoteStream) {
        this.remoteStream.removeTrack(consumer.track);
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
      consumer.close();
    } catch {
      // Ignore
    }

    this.consumers.delete(producerId);
  }

  /**
   * Prime audio element during user gesture to satisfy browser autoplay policy
   */
  public primeAudio(): void {
    try {
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.autoplay = true;
      }
    } catch (err) {
      console.warn('[mediaService] Failed to prime audio element:', err);
    }
  }

  /**
   * Play remote audio stream through HTMLAudioElement
   */
  private playRemoteAudio(stream: MediaStream): void {
    try {
      this.primeAudio();
      if (this.audioElement) {
        this.audioElement.srcObject = stream;
        this.audioElement.play().catch((err) => {
          console.warn('[mediaService] Audio auto-play waiting for user interaction:', err);
        });
      }
    } catch (err) {
      console.error('[mediaService] Failed to play remote audio:', err);
    }
  }

  /**
   * Toggle microphone audio track
   */
  public toggleMute(shouldMute?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const newEnabled = shouldMute !== undefined ? !shouldMute : !audioTrack.enabled;
    audioTrack.enabled = newEnabled;

    if (this.audioProducer) {
      if (newEnabled) {
        this.audioProducer.resume();
      } else {
        this.audioProducer.pause();
      }
    }

    return !newEnabled; // returns isMuted
  }

  /**
   * Toggle camera video track
   */
  public toggleVideo(shouldDisable?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const newEnabled = shouldDisable !== undefined ? !shouldDisable : !videoTrack.enabled;
    videoTrack.enabled = newEnabled;

    if (this.videoProducer) {
      if (newEnabled) {
        this.videoProducer.resume();
      } else {
        this.videoProducer.pause();
      }
    }

    return !newEnabled; // returns isVideoOff
  }

  /**
   * Get current local MediaStream
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get current remote MediaStream
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Check if microphone is currently muted
   */
  public isMuted(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? !audioTrack.enabled : false;
  }

  /**
   * Check if camera video is currently off
   */
  public isVideoOff(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? !videoTrack.enabled : true;
  }

  /**
   * Clean up all active mediasoup transports, producers, consumers, and media streams
   */
  public cleanup(): void {
    this.generation += 1;
    // 1. Close consumers
    for (const [, consumer] of this.consumers) {
      try {
        consumer.close();
      } catch {
        // Ignore
      }
    }
    this.consumers.clear();

    // 2. Close producers
    if (this.audioProducer) {
      try {
        this.audioProducer.close();
      } catch {
        // Ignore
      }
      this.audioProducer = null;
    }

    if (this.videoProducer) {
      try {
        this.videoProducer.close();
      } catch {
        // Ignore
      }
      this.videoProducer = null;
    }

    // 3. Close transports
    if (this.sendTransport) {
      try {
        this.sendTransport.close();
      } catch {
        // Ignore
      }
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      try {
        this.recvTransport.close();
      } catch {
        // Ignore
      }
      this.recvTransport = null;
    }

    // 4. Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // 5. Reset remote audio & stream
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
    }
    this.remoteStream = null;
    this.device = null;
    this.currentCallId = null;
    this.onRemoteStreamCallback = null;
    this.onLocalStreamCallback = null;
    this.onMediaStateCallback = null;
  }
}

export const mediaService = new MediaService();
export default mediaService;
