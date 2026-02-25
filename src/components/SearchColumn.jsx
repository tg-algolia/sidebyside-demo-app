import { Hits, Pagination, useInstantSearch } from 'react-instantsearch';
import HitCard from './HitCard';

function ColumnStats() {
  const { results, status } = useInstantSearch();

  if (status === 'loading' || status === 'stalled') {
    return (
      <div className="stats-bar">
        <span className="nb-hits stats-loading">Searching...</span>
      </div>
    );
  }

  if (!results || results.nbHits === undefined) {
    return <div className="stats-bar" />;
  }

  const { nbHits, processingTimeMS } = results;

  return (
    <div className="stats-bar">
      <span className="nb-hits">
        {nbHits.toLocaleString()} result{nbHits !== 1 ? 's' : ''}
      </span>
      <span className="response-time" title="Server processing time">
        {processingTimeMS}ms
      </span>
    </div>
  );
}

function HitsSection({ attributes, showRetrievalBadge }) {
  const { results } = useInstantSearch();
  const hasNoResults = results && results.nbHits === 0 && results.query !== '';

  if (hasNoResults) {
    return (
      <div className="no-results">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <p>No results for <strong>&ldquo;{results.query}&rdquo;</strong></p>
      </div>
    );
  }

  return (
    <Hits
      hitComponent={(props) => (
        <HitCard {...props} attributes={attributes} showRetrievalBadge={showRetrievalBadge} />
      )}
      classNames={{
        root: 'hits-root',
        list: 'hits-list',
        item: 'hits-item',
        emptyRoot: 'hits-empty',
      }}
    />
  );
}

export default function SearchColumn({ title, searchMode, attributes, showRetrievalBadge }) {
  const modeLabel = searchMode === 'neural' ? '🧠 Neural' : '🔤 Keyword';

  return (
    <div className="search-column">
      <div className="column-header">
        <div className="column-title-row">
          <h2 className="column-title">{title}</h2>
          <span className={`mode-badge mode-badge--${searchMode}`}>
            {modeLabel}
          </span>
        </div>
        <ColumnStats />
      </div>

      <HitsSection attributes={attributes} showRetrievalBadge={showRetrievalBadge} />

      <div className="pagination-wrapper">
        <Pagination
          padding={2}
          classNames={{
            root: 'ais-Pagination',
            list: 'ais-Pagination-list',
            item: 'ais-Pagination-item',
            link: 'ais-Pagination-link',
            selectedItem: 'ais-Pagination-item--selected',
            disabledItem: 'ais-Pagination-item--disabled',
            previousPageItem: 'ais-Pagination-item--previousPage',
            nextPageItem: 'ais-Pagination-item--nextPage',
            firstPageItem: 'ais-Pagination-item--firstPage',
            lastPageItem: 'ais-Pagination-item--lastPage',
          }}
        />
      </div>
    </div>
  );
}
