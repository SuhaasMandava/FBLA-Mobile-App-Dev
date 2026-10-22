import { useContext } from 'react';
import { CommunicationContext, CommunicationContextValue } from '../context/CommunicationContext';

export function useCommunication(): CommunicationContextValue {
  const ctx = useContext(CommunicationContext);
  if (!ctx) throw new Error('useCommunication must be used within a CommunicationProvider');
  return ctx;
}
