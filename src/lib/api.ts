
  import {
    locales,
    defaultLocale,
    LOCALE_COOKIE,
    type Locale,
  } from "@/i18n/config";

  // Same-origin: Next.js Rewrite forwards /api/* to Spring Boot Backend.
  export const API_URL = "";

  export class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "ApiError";
    }
  }

  const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

  function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;

    const found = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${name}=`));

    if (!found) return null;

    try {
      return decodeURIComponent(found.slice(name.length + 1));
    } catch {
      return null;
    }
  }

  /**
   * Get current locale from URL, then cookie.
   */
  function getCurrentLocale(): Locale {
    if (typeof window === "undefined") {
      return defaultLocale;
    }

    const urlLocale = window.location.pathname.split("/")[1];

    if (locales.includes(urlLocale as Locale)) {
      return urlLocale as Locale;
    }

    const cookieLocale = readCookie(LOCALE_COOKIE);

    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      return cookieLocale as Locale;
    }

    return defaultLocale;
  }

  /**
   * Get CSRF token for requests that modify data.
   */
  async function csrfHeader(method: string): Promise<Headers> {
    const headers = new Headers();

    if (!UNSAFE.has(method)) {
      return headers;
    }

    let token = readCookie("XSRF-TOKEN");

    if (!token) {
      const response = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new ApiError(
          response.status,
          "Unable to initialize CSRF protection",
        );
      }

      token = readCookie("XSRF-TOKEN");
    }

    if (!token) {
      throw new Error(
        "CSRF token is missing. Please refresh the page and try again.",
      );
    }

    headers.set("X-XSRF-TOKEN", token);

    return headers;
  }

  /**
   * Handle API errors.
   */
  async function fail(res: Response, path: string): Promise<never> {
    if (
      res.status === 401 &&
      !path.startsWith("/api/auth/login") &&
      !path.startsWith("/api/auth/logout") &&
      typeof window !== "undefined"
    ) {
      const locale = getCurrentLocale();

      window.location.replace(`/${locale}/login`);
    }

    let message =
      res.status === 403
        ? "You do not have permission to perform this action"
        : "An error occurred";

    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // Keep the default error message.
    }

    throw new ApiError(res.status, message);
  }

  /**
   * General API request.
   */
  export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const csrfHeaders = await csrfHeader(method);

    csrfHeaders.forEach((value, key) => {
      headers.set(key, value);
    });

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      method,
      credentials: "same-origin",
      headers,
    });

    if (!res.ok) {
      return fail(res, path);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  /**
   * Upload files using multipart/form-data.
   */
  export async function apiUpload<T>(
    path: string,
    formData: FormData,
  ): Promise<T> {
    const headers = await csrfHeader("POST");

    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: formData,
    });

    if (!res.ok) {
      return fail(res, path);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }

  /**
   * Download a file from the backend.
   */
  export async function apiDownload(
    path: string,
    filename: string,
  ): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "GET",
      credentials: "same-origin",
    });

    if (!res.ok) {
      return fail(res, path);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }
