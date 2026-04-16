import { useInfiniteHits, useInstantSearch } from 'react-instantsearch';
import { useRef, useEffect } from 'react';
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

function HitsSection({ attributes, showRetrievalBadge, showRankingInfo, columnId, selectedObjectID, onHitClick, onItemsChange }) {
  const { results } = useInstantSearch();
  const { items, showMore, isLastPage } = useInfiniteHits();
  const sentinelRef = useRef(null);

  useEffect(() => {
    onItemsChange?.(items);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sentinelRef.current || isLastPage) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) showMore();
      });
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLastPage, showMore]);

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
    <div className="hits-root">
      <ol className="hits-list">
        {items.map((hit) => (
          <li
            key={hit.objectID}
            className="hits-item"
            data-objectid={hit.objectID}
            data-col={columnId}
          >
            <HitCard
              hit={hit}
              attributes={attributes}
              showRetrievalBadge={showRetrievalBadge}
              showRankingInfo={showRankingInfo}
              isSelected={hit.objectID === selectedObjectID}
              onClick={(e) => onHitClick?.(hit.objectID, columnId, e)}
            />
          </li>
        ))}
      </ol>
      {!isLastPage && <div ref={sentinelRef} className="infinite-scroll-sentinel" />}
    </div>
  );
}

export default function SearchColumn({ title, searchMode, attributes, showRetrievalBadge, showRankingInfo, columnId, selectedObjectID, onHitClick, onItemsChange }) {
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

      <HitsSection
        attributes={attributes}
        showRetrievalBadge={showRetrievalBadge}
        showRankingInfo={showRankingInfo}
        columnId={columnId}
        selectedObjectID={selectedObjectID}
        onHitClick={onHitClick}
        onItemsChange={onItemsChange}
      />
    </div>
  );
}
