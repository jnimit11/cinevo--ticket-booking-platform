export function resolveApiBaseUrl(overrideEnv) {
  let rawUrl = "";
  let isProd = false;

  if (overrideEnv !== undefined) {
    rawUrl = overrideEnv.VITE_API_URL || overrideEnv.VITE_API_BASE_URL || "";
    isProd = Boolean(overrideEnv.PROD);
  } else if (typeof import.meta !== "undefined" && import.meta.env) {
    rawUrl =
      import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
    isProd = Boolean(import.meta.env.PROD);
  }

  if (typeof rawUrl === "string" && rawUrl.trim() !== "") {
    const trimmed = rawUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  if (isProd) {
    throw new Error(
      "Missing VITE_API_URL environment variable. Production builds must specify VITE_API_URL pointing to the Cinevo backend.",
    );
  }

  return "http://localhost:5000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const MAX_BOOKING_SEATS = 12;
export const CATALOGUE_PAGE_LIMIT = 12;

export const KNOWN_LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Spanish",
  "French",
  "Japanese",
  "Korean",
];
