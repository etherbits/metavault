import { API_BASE_URL } from "@/shared/api/client";

export function resolveMediaUrl(src: string | null | undefined) {
  if (!src) return undefined;

  if (src.startsWith("/media/")) {
    return `${API_BASE_URL}${src}`;
  }

  return src;
}
