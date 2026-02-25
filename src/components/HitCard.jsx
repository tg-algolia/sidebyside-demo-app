import { Highlight } from 'react-instantsearch';

const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23F0F0FA' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter%2Csans-serif' font-size='13' fill='%23BBBBCC'%3ENo Image%3C/text%3E%3C/svg%3E`;

/**
 * Reads _rankingInfo.semanticScore and matchedWords to determine
 * how this hit was retrieved. Only present when getRankingInfo:true
 * was sent in the search request.
 *
 *  semanticScore > 0 && matchedWords > 0  → "Keyword & Vector"
 *  semanticScore > 0 && matchedWords === 0 → "Vector"
 *  semanticScore absent / 0               → "Keyword"
 */
function RetrievalBadge({ rankingInfo }) {
  if (!rankingInfo) return null;

  const hasVector =
    rankingInfo.semanticScore !== undefined && rankingInfo.semanticScore > 0;
  const hasKeyword =
    (rankingInfo.matchedWords ?? rankingInfo.words ?? 0) > 0;

  let label, variant;
  if (hasVector && hasKeyword) {
    label = 'Keyword & Vector';
    variant = 'hybrid';
  } else if (hasVector) {
    label = 'Vector';
    variant = 'vector';
  } else {
    label = 'Keyword';
    variant = 'keyword';
  }

  return (
    <span className={`retrieval-badge retrieval-badge--${variant}`}>
      <svg className="retrieval-badge-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" opacity="0.2" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
      {label}
    </span>
  );
}

function RankingInfoButton({ rankingInfo }) {
  if (!rankingInfo) return null;

  const keywordScore = rankingInfo.keywordScore ?? null;
  const semanticScore = rankingInfo.semanticScore ?? null;
  const neuralScore = rankingInfo.neuralScore ?? null;
  // For keyword-only results Algolia copies keywordScore into neuralScore — treat those as null

  const fmt = (val) =>
    val !== undefined && val !== null ? val.toFixed(4) : '—';

  return (
    <div className="ranking-info-btn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
      <div className="ranking-info-tooltip">
        <div className="ranking-info-row">
          <span className="ranking-info-label">Keyword Score</span>
          <span className="ranking-info-value">{fmt(keywordScore)}</span>
        </div>
        <div className="ranking-info-row">
          <span className="ranking-info-label">Semantic Score</span>
          <span className="ranking-info-value">{fmt(semanticScore)}</span>
        </div>
        <div className="ranking-info-row">
          <span className="ranking-info-label">Neural Score</span>
          <span className="ranking-info-value">{fmt(neuralScore)}</span>
        </div>
      </div>
    </div>
  );
}

export default function HitCard({ hit, attributes, showRetrievalBadge, showRankingInfo }) {
  const { imageAttr, imagePrefix, imageSuffix, nameAttr, attr1Name, attr1Label, attr2Name, attr2Label } = attributes;

  const rawImageUrl = imageAttr ? hit[imageAttr] : null;
  const imageUrl = rawImageUrl ? `${imagePrefix || ''}${rawImageUrl}${imageSuffix || ''}` : null;
  const attr1Value = attr1Name ? hit[attr1Name] : undefined;
  const attr2Value = attr2Name ? hit[attr2Name] : undefined;

  // Check if highlight data exists for name attribute to avoid errors
  const hasHighlight =
    nameAttr &&
    hit._highlightResult &&
    hit._highlightResult[nameAttr] !== undefined;

  const displayName = nameAttr ? (hit[nameAttr] || '—') : '—';

  return (
    <article className="hit-card">
      {showRankingInfo && <RankingInfoButton rankingInfo={hit._rankingInfo} />}
      <div className="hit-image-wrapper">
        {showRetrievalBadge && <RetrievalBadge rankingInfo={hit._rankingInfo} />}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="hit-image"
            onError={(e) => {
              e.currentTarget.src = FALLBACK_SVG;
            }}
            loading="lazy"
          />
        ) : (
          <div className="hit-image-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      <div className="hit-body">
        <h3 className="hit-name" title={displayName}>
          {hasHighlight ? (
            <Highlight attribute={nameAttr} hit={hit} />
          ) : (
            displayName
          )}
        </h3>

        <div className="hit-attributes">
          {attr1Name && (
            <div className="hit-attr">
              <span className="attr-label">{attr1Label || attr1Name}</span>
              <span className="attr-value" title={attr1Value !== undefined ? String(attr1Value) : ''}>
                {attr1Value !== null && attr1Value !== undefined && attr1Value !== '' ? String(attr1Value) : '—'}
              </span>
            </div>
          )}
          {attr2Name && (
            <div className="hit-attr">
              <span className="attr-label">{attr2Label || attr2Name}</span>
              <span className="attr-value" title={attr2Value !== undefined ? String(attr2Value) : ''}>
                {attr2Value !== null && attr2Value !== undefined && attr2Value !== '' ? String(attr2Value) : '—'}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
