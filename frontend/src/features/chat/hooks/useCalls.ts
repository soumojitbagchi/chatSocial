import { useState, useCallback } from 'react';
import { CallLogItem } from '../UI/CallsSection';

export interface ActiveCallState {
  contactName: string;
  avatar?: string;
  type: 'audio' | 'video';
}

export interface UseCallsReturn {
  calls: CallLogItem[];
  activeCall: ActiveCallState | null;
  startCall: (contactName: string, type: 'audio' | 'video', avatar?: string) => void;
  endCall: () => void;
}

export function useCalls(): UseCallsReturn {
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  const startCall = useCallback((contactName: string, type: 'audio' | 'video', avatar?: string) => {
    setActiveCall({ contactName, avatar, type });
  }, []);

  const endCall = useCallback(() => {
    if (activeCall) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newLog: CallLogItem = {
        id: `call-${Date.now()}`,
        name: activeCall.contactName,
        avatar: activeCall.avatar || '',
        type: activeCall.type,
        direction: 'outgoing',
        status: 'completed',
        duration: '1m 12s',
        time: `Today, ${timeStr}`
      };
      setCalls((prev) => [newLog, ...prev]);
    }
    setActiveCall(null);
  }, [activeCall]);

  return {
    calls,
    activeCall,
    startCall,
    endCall,
  };
}

export default useCalls;
