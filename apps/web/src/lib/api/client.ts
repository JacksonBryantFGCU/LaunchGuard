const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

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

export async function apiGet<T>(path: string, parse: (data: unknown) => T): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new ApiError("Unable to reach the Redline API.");
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

export async function apiPost<T>(path: string, body: unknown, parse: (data: unknown) => T): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Unable to reach the Redline API.");
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
