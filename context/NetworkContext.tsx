import { createContext, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NetworkService } from '../services/NetworkService';

export interface NetworkContextValue {
  /** False while the device has no connection. Assumed true until the first report. */
  online: boolean;
  /** Run `listener` each time the connection comes back after being down. Returns an unsubscribe function. */
  onReconnect: (listener: () => void) => () => void;
}

export const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const wasOffline = useRef(false);
  const reconnectListeners = useRef(new Set<() => void>());

  useEffect(
    () =>
      NetworkService.subscribe((isOnline) => {
        setOnline(isOnline);
        if (isOnline && wasOffline.current) reconnectListeners.current.forEach((listener) => listener());
        wasOffline.current = !isOnline;
      }),
    [],
  );

  const onReconnect = useCallback((listener: () => void) => {
    reconnectListeners.current.add(listener);
    return () => {
      reconnectListeners.current.delete(listener);
    };
  }, []);

  const value = useMemo<NetworkContextValue>(() => ({ online, onReconnect }), [online, onReconnect]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
