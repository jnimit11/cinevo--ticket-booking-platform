export function MovieFilterBar({
  searchInput,
  onSearchChange,
  selectedLanguage,
  onLanguageChange,
  languageOptions = [],
  onClear,
}) {
  const hasActiveFilters = Boolean(searchInput || selectedLanguage);

  return (
    <div className="filter-bar" role="search" aria-label="Filter movies">
      <div className="search-input-wrap">
        <span className="material-symbols-outlined search-icon" aria-hidden="true">
          search
        </span>
        <input
          type="text"
          className="search-input"
          placeholder="Search by movie title..."
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search movies"
        />
        {searchInput && (
          <button
            type="button"
            className="search-clear-button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search text"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        )}
      </div>

      <div className="filter-select-wrap">
        <select
          className="language-select"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          aria-label="Filter by language"
        >
          <option value="">All Languages</option>
          {languageOptions.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          className="secondary-button clear-filter-button"
          type="button"
          onClick={onClear}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
            filter_alt_off
          </span>
          <span>Clear Filters</span>
        </button>
      )}
    </div>
  );
}
