/** Verification builds point at a throwaway backend so they never touch the one a person is running. */
export const BACKEND_ORIGIN: string = import.meta.env?.VITE_TRANZ_BACKEND ?? 'http://127.0.0.1:4318';

/** `status` is 0 when the backend could not be reached at all. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Automatic pairing: the backend hands its local access token only to the paired extension origin. */
export async function pairToken(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_ORIGIN}/api/pair`, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new ApiError('Tranz trên máy chưa chạy.', 0);
  }
  const data = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
  if (!response.ok || !data.token) throw new ApiError(data.error ?? 'Không tự kết nối được với Tranz trên máy.', response.status);
  return data.token;
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
          ? 'Tranz trên máy không phản hồi kịp. Vui lòng thử lại.'
          : 'Tranz trên máy chưa chạy. Mở Terminal ở thư mục Tranz, chạy npm run dev, rồi thử lại.',
        0,
      );
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new ApiError(data.error ?? `Yêu cầu không thành công (${response.status}).`, response.status);
    return data as T;
  }
}
