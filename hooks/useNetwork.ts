import { useContext } from 'react';
import { NetworkContext, NetworkContextValue } from '../context/NetworkContext';

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
}
