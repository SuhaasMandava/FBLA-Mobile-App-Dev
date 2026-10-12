import NetInfo from '@react-native-community/netinfo';

export const NetworkService = {
  /**
   * Calls `listener(online)` right away and again whenever connectivity changes.
   * "Offline" means the device reports no connection at all (airplane mode, no
   * signal); it deliberately doesn't second-guess a connected-but-slow network,
   * where requests failing already shows a clear message. Returns an unsubscribe function.
   */
  subscribe(listener: (online: boolean) => void): () => void {
    return NetInfo.addEventListener((state) => listener(state.isConnected !== false));
  },
};
