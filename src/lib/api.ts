// Same-origin: Next.js Rewrite forwards /api/* to Backend (see next.config.ts)[cite: 6]
export const API_URL = "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const found = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

/** Mutating requests must include the X-XSRF-TOKEN header copied from the XSRF-TOKEN cookie */
async function csrfHeader(method: string): Promise<Record<string, string>> {
  if (!UNSAFE.has(method)) return {};
  let token = readCookie("XSRF-TOKEN");
  if (!token) {
    await fetch("/api/health");          // Server sets XSRF-TOKEN cookie in response
    token = readCookie("XSRF-TOKEN");
  }
  return token ? { "X-XSRF-TOKEN": token } : {};
}

async function fail(res: Response, path: string): Promise<never> {
  // Session expired (httpOnly cookie: JS cannot see expiration) -> redirect to login
  if (res.status === 401 && !path.startsWith("/api/auth/login") && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  let message = res.status === 403 ? "You do not have permission to perform this action" : "An error occurred";
  try {
    const body = await res.json();
    message = body.message ?? message;
  } catch {}
  throw new ApiError(res.status, message);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(await csrfHeader(method)),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) return fail(res, path);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Upload files (multipart). Do not set Content-Type: Browser will set boundary automatically */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: await csrfHeader("POST"),
    body: formData,
  });
  if (!res.ok) return fail(res, path);
  return res.json() as Promise<T>;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { credentials: "same-origin" });
  if (!res.ok) return fail(res, path);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}