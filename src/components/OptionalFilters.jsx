import { useState } from 'react';

export default function OptionalFilters({ filters, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const addFilter = () => {
    const value = draft.trim();
    if (!value) return;
    if (filters.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...filters, value]);
    setDraft('');
  };

  const removeFilter = (value) => {
    onChange(filters.filter((f) => f !== value));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFilter();
    }
  };

  return (
    <div className="optional-filters">
      <div className="optional-filters-bar">
        <button
          type="button"
          className={`optional-filters-toggle${isOpen ? ' is-open' : ''}`}
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Optional Filters
          {filters.length > 0 && (
            <span className="optional-filters-count">{filters.length}</span>
          )}
        </button>

        {filters.length > 0 && (
          <div className="optional-filters-chips">
            {filters.map((f) => (
              <span key={f} className="optional-filter-chip">
                {f}
                <button
                  type="button"
                  className="optional-filter-chip-remove"
                  onClick={() => removeFilter(f)}
                  aria-label={`Remove filter ${f}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="optional-filters-panel">
          <div className="optional-filters-input-row">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. sdk:nextjs"
              className="optional-filters-input"
              aria-label="Add optional filter"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-primary optional-filters-add"
              onClick={addFilter}
              disabled={!draft.trim()}
            >
              Add
            </button>
          </div>
          <p className="optional-filters-hint">
            Format <code>facet:value</code> — e.g. <code>sdk:nextjs</code>. Records matching a
            filter are boosted higher in the results.
          </p>
        </div>
      )}
    </div>
  );
}
