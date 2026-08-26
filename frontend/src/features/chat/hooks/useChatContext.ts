import { useContext } from 'react';
import { ChatContext, ChatContextType } from '../state/chatContextObject';

export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export default useChatContext;
