export const BACKEND_ORIGIN = 'http://127.0.0.1:4318';

/** `status` is 0 when the backend could not be reached at all. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class Api {
  constructor(readonly token: string) {}

  async call<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(35000);
    let response: Response;
    try {
      response = await fetch(`${BACKEND_ORIGIN}/api${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(
        timeout.aborted
          ? 'The local backend did not answer in time. Retry.'
          : 'Cannot reach the Tranz backend at 127.0.0.1:4318. Start it with npm run dev, then retry.',
        0,
      );
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new ApiError(data.error ?? `Request failed (${response.status}).`, response.status);
    return data as T;
  }
}
