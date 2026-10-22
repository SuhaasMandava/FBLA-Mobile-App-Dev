type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Wraps `fetchImpl` so each request gives up after `ms`. A request that times out fails
 * exactly like a dropped connection (a TypeError saying "Network request failed"), which
 * every caller already handles. A request the caller cancels itself still fails as a
 * cancellation, not a timeout.
 */
export function withTimeout(fetchImpl: Fetch, ms: number): Fetch {
  return (input, init = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const callerSignal = init.signal;
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener('abort', () => controller.abort());
    }
    return fetchImpl(input, { ...init, signal: controller.signal })
      .catch((e: unknown) => {
        if (controller.signal.aborted && !callerSignal?.aborted) throw new TypeError('Network request failed (timed out)');
        throw e;
      })
      .finally(() => clearTimeout(timer));
  };
}
