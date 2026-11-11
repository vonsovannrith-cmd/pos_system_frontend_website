export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fail(res: Response): Promise<never> {
  // ប្ដូរសារពីខ្មែរមកអង់គ្លេសនៅទីនេះ
  let message = res.status === 403 ? "You do not have permission to perform this action" : "An error occurred";
  try {
    const body = await res.json();
    message = body.message ?? message;
  } catch {}
  throw new ApiError(res.status, message);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) return fail(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Upload ឯកសារ (multipart). កុំកំណត់ Content-Type: Browser នឹងដាក់ boundary ឱ្យ */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });
  if (!res.ok) return fail(res);
  return res.json() as Promise<T>;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeader() });
  if (!res.ok) return fail(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}