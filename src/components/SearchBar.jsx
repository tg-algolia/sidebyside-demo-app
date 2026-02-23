export default function SearchBar({ query, onChange, onClear }) {
  return (
    <div className="search-bar-container">
      <div className="search-bar-inner">
        <span className="search-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>

        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search both indices simultaneously..."
          className="search-input"
          aria-label="Search query"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />

        {query && (
          <button
            className="search-clear"
            onClick={onClear}
            aria-label="Clear search"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
