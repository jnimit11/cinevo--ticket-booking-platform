import { API_BASE_URL } from "../../core/config/constants.js";

export function buildMovieQuery({ page, limit, search, language } = {}) {
  const params = new URLSearchParams();

  if (page !== undefined && page !== null && String(page).trim() !== "") {
    const parsedPage = Number(page);
    if (Number.isInteger(parsedPage) && parsedPage > 0) {
      params.set("page", String(parsedPage));
    }
  }

  if (limit !== undefined && limit !== null && String(limit).trim() !== "") {
    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      params.set("limit", String(Math.min(parsedLimit, 50)));
    }
  }

  if (typeof search === "string" && search.trim() !== "") {
    params.set("search", search.trim().slice(0, 100));
  }

  if (typeof language === "string" && language.trim() !== "") {
    params.set("language", language.trim().slice(0, 50));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getMovies({
  page = 1,
  limit = 12,
  search,
  language,
  signal,
} = {}) {
  const query = buildMovieQuery({ page, limit, search, language });
  const response = await fetch(`${API_BASE_URL}/movies${query}`, { signal });

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The movies API returned an invalid response.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : "The movies request failed.",
    );
    error.status = response.status;
    throw error;
  }

  if (!Array.isArray(data?.movies)) {
    throw new Error("The movies API returned an invalid movie list.");
  }

  const pagination = data?.pagination;
  const total = Number(pagination?.total);
  const totalPages = Number(pagination?.totalPages);
  const currentPage = Number(pagination?.page);
  const currentLimit = Number(pagination?.limit);

  if (
    !pagination ||
    typeof pagination !== "object" ||
    !Number.isFinite(total) ||
    total < 0 ||
    !Number.isFinite(totalPages) ||
    totalPages < 0 ||
    !Number.isFinite(currentPage) ||
    currentPage < 1 ||
    !Number.isFinite(currentLimit) ||
    currentLimit < 1
  ) {
    throw new Error("The movies API returned invalid pagination data.");
  }

  return {
    movies: data.movies,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,
    },
    count: data.movies.length,
  };
}

export async function getMovieById(id, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/movies/${encodeURIComponent(id)}`, {
    signal,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The movies API returned an invalid response.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : "Movie not found.",
    );
    error.status = response.status;
    throw error;
  }

  if (!data?.movie || typeof data.movie !== "object" || Array.isArray(data.movie)) {
    throw new Error("The movies API returned an invalid movie.");
  }

  return data.movie;
}
