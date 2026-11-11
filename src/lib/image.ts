import { API_URL } from "@/lib/api";

/** "/api/images/uuid" → Full URL to the backend */
export const imageSrc = (url: string | null): string | null => (url ? `${API_URL}${url}` : null);