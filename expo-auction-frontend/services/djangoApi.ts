/** Django REST API base URL (no trailing slash). */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_DJANGO_API_URL?.replace(/\/$/, "") ?? "http://3.138.107.95:8000/api";
