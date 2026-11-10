import { useContext } from 'react';
import { ChatContext, ChatContextValue } from '../context/ChatContext';

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within a ChatProvider');
  return ctx;
}
