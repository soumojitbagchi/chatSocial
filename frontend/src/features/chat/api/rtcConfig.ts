/**
 * WebRTC Configuration
 * Provides standard STUN servers for development/NAT traversal,
 * structured to allow easy TURN server addition without modifying signaling or peer logic.
 */

export interface WebRTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export const defaultRtcConfig: WebRTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Returns RTCConfiguration object for RTCPeerConnection initialization
 */
export function getRtcConfiguration(customConfig?: Partial<WebRTCConfiguration>): RTCConfiguration {
  return {
    ...defaultRtcConfig,
    ...customConfig,
  };
}

export default getRtcConfiguration;
