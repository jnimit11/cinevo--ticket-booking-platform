import { useState, useEffect, useMemo, useCallback } from "react";
import { getMovies } from "./movieApi.js";
import { CATALOGUE_PAGE_LIMIT, KNOWN_LANGUAGES } from "../../core/config/constants.js";
import { useDebounce } from "../../shared/hooks/useDebounce.js";

export function useMovies() {
  const [movies, setMovies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: CATALOGUE_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [page, setPage] = useState(1);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getMovies({
      page,
      limit: CATALOGUE_PAGE_LIMIT,
      search: debouncedSearch,
      language: selectedLanguage,
      signal: controller.signal,
    })
      .then((data) => {
        if (!ignore) {
          setMovies(data.movies);
          setPagination(data.pagination);
          setLoadStatus("success");
        }
      })
      .catch((error) => {
        if (!ignore) {
          if (controller.signal.aborted) return;
          setLoadError(error.message || "Unable to load movies.");
          setLoadStatus("error");
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [debouncedSearch, selectedLanguage, page, loadAttempt]);

  const languageOptions = useMemo(() => {
    const set = new Set(KNOWN_LANGUAGES);
    movies.forEach((movie) => {
      if (movie.language && movie.language.trim()) {
        set.add(movie.language.trim());
      }
    });
    return Array.from(set).sort();
  }, [movies]);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    setPage(1);
    setLoadStatus("loading");
  }, []);

  const handleLanguageChange = useCallback((value) => {
    setSelectedLanguage(value);
    setPage(1);
    setLoadStatus("loading");
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSelectedLanguage("");
    setPage(1);
    setLoadStatus("loading");
  }, []);

  const retryLoading = useCallback(() => {
    setLoadError("");
    setLoadStatus("loading");
    setLoadAttempt((a) => a + 1);
  }, []);

  const handlePageChange = useCallback((updater) => {
    setPage(updater);
    setLoadStatus("loading");
  }, []);

  return {
    movies,
    pagination,
    searchInput,
    selectedLanguage,
    languageOptions,
    loadStatus,
    loadError,
    page,
    setPage: handlePageChange,
    handleSearchChange,
    handleLanguageChange,
    clearSearch,
    retryLoading,
  };
}
