import { isNetworkError } from '../../services/errors';
import { withTimeout } from '../fetchWithTimeout';

/** A fake fetch that never answers on its own, but rejects like the real one when its signal aborts. */
function hangingFetch() {
  return jest.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      }),
  );
}

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('passes a quick answer straight through', async () => {
    const response = { ok: true } as Response;
    const fetchImpl = jest.fn(() => Promise.resolve(response));
    await expect(withTimeout(fetchImpl, 1000)('https://example.test')).resolves.toBe(response);
  });

  it('gives up after the time limit, failing like a dropped connection', async () => {
    const request = withTimeout(hangingFetch(), 1000)('https://example.test');
    jest.advanceTimersByTime(1000);
    const error = await request.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect(isNetworkError(error)).toBe(true);
  });

  it('keeps a cancellation by the caller a cancellation', async () => {
    const caller = new AbortController();
    const request = withTimeout(hangingFetch(), 1000)('https://example.test', { signal: caller.signal });
    caller.abort();
    await expect(request).rejects.toThrow('Aborted');
  });

  it('passes other failures through unchanged', async () => {
    const failure = new Error('boom');
    const fetchImpl = jest.fn(() => Promise.reject(failure));
    await expect(withTimeout(fetchImpl, 1000)('https://example.test')).rejects.toBe(failure);
  });
});
