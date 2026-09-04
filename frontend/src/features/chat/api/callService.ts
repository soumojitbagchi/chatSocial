import socketService from './socketService';
import type { RtpCapabilities, RtpParameters, DtlsParameters, IceParameters, IceCandidate } from 'mediasoup-client/types';

export interface TransportParamsResponse {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  sctpParameters?: unknown;
}

export interface ProduceResponse {
  id: string;
  kind: 'audio' | 'video';
}

export interface ConsumerParamsResponse {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  type?: string;
  producerPaused?: boolean;
}

export interface RemoteProducerInfo {
  producerId: string;
  participantId: string;
  kind: 'audio' | 'video';
  appData?: Record<string, unknown>;
}

export class CallService {
  /**
   * Application Signaling: Start a new 1-to-1 call
   */
  public async startCall(targetUserId: string, type: 'audio' | 'video' = 'audio'): Promise<{ callId: string; status: string }> {
    return socketService.request<{ callId: string; status: string }>('call:start', {
      targetUserId,
      type,
    });
  }

  /**
   * Application Signaling: Accept an incoming call
   */
  public async acceptCall(callId: string): Promise<{ callId: string; status: string }> {
    return socketService.request<{ callId: string; status: string }>('call:accept', {
      callId,
    });
  }

  /**
   * Application Signaling: Reject an incoming call
   */
  public async rejectCall(callId: string, reason: string = 'Call declined'): Promise<{ ok: boolean }> {
    return socketService.request<{ ok: boolean }>('call:reject', {
      callId,
      reason,
    });
  }

  /**
   * Application Signaling: End an ongoing call
   */
  public async endCall(callId: string, reason: string = 'Call ended'): Promise<{ ok: boolean }> {
    return socketService.request<{ ok: boolean }>('call:end', {
      callId,
      reason,
    });
  }

  public sendP2POffer(callId: string, targetUserId: string, payload: unknown): void {
    socketService.emit('call:p2p-offer', { callId, targetUserId, payload });
  }

  public sendP2PAnswer(callId: string, targetUserId: string, payload: unknown): void {
    socketService.emit('call:p2p-answer', { callId, targetUserId, payload });
  }

  public sendP2PIce(callId: string, targetUserId: string, payload: unknown): void {
    socketService.emit('call:p2p-ice', { callId, targetUserId, payload });
  }

  public async inviteToCall(callId: string, targetUserId: string): Promise<{ callId: string; targetUserId: string; peerIds: string[] }> {
    return socketService.request('call:invite', { callId, targetUserId });
  }

  public async joinMeshCall(callId: string): Promise<{ callId: string; type: 'audio' | 'video'; peerIds: string[]; sfu: boolean }> {
    return socketService.request('call:join', { callId });
  }

  public async leaveMeshCall(callId: string): Promise<{ ok: boolean; ended: boolean }> {
    return socketService.request('call:leave', { callId });
  }

  /**
   * Mediasoup Signaling: Get Router RTP capabilities for call session
   */
  public async getRouterRtpCapabilities(callId: string): Promise<RtpCapabilities> {
    const res = await socketService.request<{ routerRtpCapabilities: RtpCapabilities }>('media:getRouterCapabilities', {
      callId,
    });
    return res.routerRtpCapabilities;
  }

  /**
   * Mediasoup Signaling: Create send or recv WebRTC Transport
   */
  public async createTransport(callId: string, direction: 'send' | 'recv'): Promise<TransportParamsResponse> {
    return socketService.request<TransportParamsResponse>('media:createTransport', {
      callId,
      direction,
    });
  }

  /**
   * Mediasoup Signaling: Connect WebRTC Transport with DTLS parameters
   */
  public async connectTransport(callId: string, transportId: string, dtlsParameters: DtlsParameters): Promise<{ connected: boolean }> {
    return socketService.request<{ connected: boolean }>('media:connectTransport', {
      callId,
      transportId,
      dtlsParameters,
    });
  }

  /**
   * Mediasoup Signaling: Produce media track
   */
  public async produce(
    callId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
    appData: Record<string, unknown> = {}
  ): Promise<ProduceResponse> {
    return socketService.request<ProduceResponse>('media:produce', {
      callId,
      transportId,
      kind,
      rtpParameters,
      appData,
    });
  }

  /**
   * Mediasoup Signaling: Get existing producers in the call
   */
  public async getProducers(callId: string): Promise<RemoteProducerInfo[]> {
    const res = await socketService.request<{ producers: RemoteProducerInfo[] }>('media:getProducers', {
      callId,
    });
    return res.producers || [];
  }

  /**
   * Mediasoup Signaling: Consume remote producer
   */
  public async consume(callId: string, producerId: string, rtpCapabilities: RtpCapabilities): Promise<ConsumerParamsResponse> {
    return socketService.request<ConsumerParamsResponse>('media:consume', {
      callId,
      producerId,
      rtpCapabilities,
    });
  }

  /**
   * Mediasoup Signaling: Confirm local consumer created
   */
  public async confirmConsumed(callId: string, consumerId: string): Promise<{ ok: boolean }> {
    return socketService.request<{ ok: boolean }>('media:consumed', {
      callId,
      consumerId,
    });
  }

  /**
   * Mediasoup Signaling: Resume consumer on server
   */
  public async resumeConsumer(callId: string, consumerId: string): Promise<{ resumed: boolean }> {
    return socketService.request<{ resumed: boolean }>('media:resumeConsumer', {
      callId,
      consumerId,
    });
  }

  /**
   * Mediasoup Signaling: Close producer
   */
  public async closeProducer(callId: string, producerId: string): Promise<{ closed: boolean }> {
    return socketService.request<{ closed: boolean }>('media:closeProducer', {
      callId,
      producerId,
    });
  }

  /**
   * Mediasoup Signaling: Close consumer
   */
  public async closeConsumer(callId: string, consumerId: string): Promise<{ closed: boolean }> {
    return socketService.request<{ closed: boolean }>('media:closeConsumer', {
      callId,
      consumerId,
    });
  }
}

export const callService = new CallService();
export default callService;
