import { io, Socket } from 'socket.io-client';

export type SocketEventCallback = (payload: unknown) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<SocketEventCallback>> = new Map();
  private connected: boolean = false;
  private currentToken: string | null = null;
  private currentUserId: string | null = null;

  public connect(url?: string): Socket {
    const socketUrl = url || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080');

    let token = '';
    let userId = '';
    let username = '';
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('chatSocial_token') || '';
      try {
        const stored = localStorage.getItem('chatSocial_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          userId = parsed.id || parsed._id || '';
          username = parsed.username || parsed.name || '';
        }
      } catch {
        // Ignore JSON parse error
      }
    }

    if (this.socket) {
      if (this.socket.connected && this.currentToken === token && this.currentUserId === userId) {
        return this.socket;
      }
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentToken = token;
    this.currentUserId = userId;
    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token },
      query: { userId, username },
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('online', {});
      this.notifyListeners('connect', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.notifyListeners('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this.notifyListeners('connect_error', error);
    });

    // Wire global backend event forwards
    const events = [
      'receiveMessage',
      'messageUpdated',
      'messageDeleted',
      'messages:list',
      'room:created',
      'room:joined',
      'room:left',
      'room:switched',
      'user:online',
      'user:offline',
      'users:online-list',
      'user:joined',
      'user:left',
      'message:error',
      'room:error',
      'incoming-call',
      'call-accepted',
      'call-rejected',
      'offer',
      'answer',
      'ice-candidate',
      'call-ended',
      'call-error'
    ];

    events.forEach((eventName) => {
      this.socket?.on(eventName, (data) => {
        this.notifyListeners(eventName, data);
      });
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentToken = null;
      this.currentUserId = null;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public emit(event: string, data: unknown) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  // Real-time Chat & Room emitters
  public sendMessage(roomId: string, text: string) {
    this.emit('sendMessage', { roomId, text });
  }

  public editMessage(messageId: string, newMessage: string) {
    this.emit('editMessage', { messageId, newMessage });
  }

  public deleteMessage(messageId: string) {
    this.emit('deleteMessage', { messageId });
  }

  public getMessages(roomId: string, limit: number = 50, page: number = 1) {
    this.emit('getMessages', { roomId, limit, page });
  }

  public createRoom(roomname: string, description: string = '') {
    this.emit('create-room', { roomname, description });
  }

  public joinRoom(roomId: string) {
    this.emit('join-room', { roomId });
  }

  public leaveRoom(roomId: string) {
    this.emit('leave-room', { roomId });
  }

  public switchRoom(oldRoomId: string, newRoomId: string) {
    this.emit('switch-room', { oldRoomId, newRoomId });
  }

  // Real-time WebRTC Call Signaling emitters
  public callUser(targetUserId: string, callType: 'audio' | 'video' = 'audio') {
    this.emit('call-user', { targetUserId, callType });
  }

  public acceptCall(callerId: string) {
    this.emit('accept-call', { callerId });
  }

  public rejectCall(callerId: string, reason?: string) {
    this.emit('reject-call', { callerId, reason });
  }

  public sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit, targetSocketId?: string) {
    this.emit('offer', { targetUserId, offer, targetSocketId });
  }

  public sendAnswer(targetUserId: string, answer: RTCSessionDescriptionInit, targetSocketId?: string) {
    this.emit('answer', { targetUserId, answer, targetSocketId });
  }

  public sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit, targetSocketId?: string) {
    this.emit('ice-candidate', { targetUserId, candidate, targetSocketId });
  }

  public endCall(targetUserId?: string, reason?: string) {
    this.emit('end-call', { targetUserId, reason });
  }

  // Event Subscription
  public on(event: string, callback: SocketEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private notifyListeners(event: string, data: unknown) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in socket listener for ${event}:`, err);
        }
      });
    }
  }
}

export const socketService = new SocketService();
export default socketService;
