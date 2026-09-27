const API_BASE_URL = import.meta.env?.VITE_API_URL ?? "http://localhost:3001";

type AuthTokenGetter = () => Promise<string | null>;
let authTokenGetter: AuthTokenGetter | null = null;

// Registered once, at the app root, from Clerk's useAuth().getToken - keeps
// every page from fetching its own token. Never logged.
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  authTokenGetter = getter;
}

async function authHeaders(authed: boolean): Promise<Record<string, string>> {
  if (!authed || !authTokenGetter) return {};
  const token = await authTokenGetter();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiRequestOptions {
  authed?: boolean;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessageFrom(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string") {
    return (data as { message: string }).message;
  }
  return fallback;
}

export async function apiGet<T>(path: string, parse: (data: unknown) => T, options: ApiRequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { headers: await authHeaders(options.authed ?? false) });
  } catch {
    throw new ApiError("Unable to reach the Purgatory API.");
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new ApiError("Not found.", 404);
    }
    throw new ApiError(`Request failed with status ${res.status}.`, res.status);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Received a malformed response from the API.");
  }

  try {
    return parse(data);
  } catch {
    throw new ApiError("Received an unexpected response shape from the API.");
  }
}

async function apiMutate<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  parse: (data: unknown) => T,
  options: ApiRequestOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(await authHeaders(options.authed ?? false)) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Unable to reach the Purgatory API.");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("Received a malformed response from the API.", res.status);
  }

  if (!res.ok) {
    throw new ApiError(errorMessageFrom(data, `Request failed with status ${res.status}.`), res.status);
  }

  try {
    return parse(data);
  } catch {
    throw new ApiError("Received an unexpected response shape from the API.");
  }
}

export function apiPost<T>(path: string, body: unknown, parse: (data: unknown) => T, options: ApiRequestOptions = {}): Promise<T> {
  return apiMutate("POST", path, body, parse, options);
}

export function apiPatch<T>(path: string, body: unknown, parse: (data: unknown) => T, options: ApiRequestOptions = {}): Promise<T> {
  return apiMutate("PATCH", path, body, parse, options);
}

export function apiPut<T>(path: string, body: unknown, parse: (data: unknown) => T, options: ApiRequestOptions = {}): Promise<T> {
  return apiMutate("PUT", path, body, parse, options);
}

export function apiDelete<T>(path: string, parse: (data: unknown) => T, options: ApiRequestOptions = {}): Promise<T> {
  return apiMutate("DELETE", path, undefined, parse, options);
}
