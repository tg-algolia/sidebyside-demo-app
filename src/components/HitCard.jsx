import { Highlight } from 'react-instantsearch';

const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23F0F0FA' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter%2Csans-serif' font-size='13' fill='%23BBBBCC'%3ENo Image%3C/text%3E%3C/svg%3E`;

/**
 * Resolves an attribute value from a record, supporting both flat keys
 * ("name") and dotted/nested paths ("hierarchy.lvl1" → hit.hierarchy.lvl1).
 * Falls back to a literal flat lookup so keys that genuinely contain a dot
 * still work.
 */
function getNested(obj, path) {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  return path.split('.').reduce(
    (acc, key) => (acc !== null && acc !== undefined ? acc[key] : undefined),
    obj
  );
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Comma-separated attribute list: returns the first attribute that has a
 * value on the record, so mixed-type indices can specify per-type fields
 * (e.g. "image.originalSrc, fields.headerImage.fields.file.url").
 * Array items can be addressed by index ("fields.mainTeachers.0.fields.image...").
 */
function resolveAttr(obj, spec) {
  if (!spec) return { value: undefined, attr: undefined };
  for (const attr of spec.split(',').map((a) => a.trim()).filter(Boolean)) {
    const value = getNested(obj, attr);
    if (!isEmpty(value)) return { value, attr };
  }
  return { value: undefined, attr: undefined };
}

/**
 * Reads _rankingInfo.signals (kwPos / vecPos), falling back to the legacy
 * semanticScore and matchedWords fields, to determine
 * how this hit was retrieved. Only present when getRankingInfo:true
 * was sent in the search request.
 *
 *  semanticScore > 0 && matchedWords > 0  → "Keyword & Vector"
 *  semanticScore > 0 && matchedWords === 0 → "Vector"
 *  semanticScore absent / 0               → "Keyword"
 */
function RetrievalBadge({ rankingInfo }) {
  if (!rankingInfo) return null;

  const sig = rankingInfo.signals;
  const hasVector = sig
    ? sig.vecPos !== null && sig.vecPos !== undefined
    : rankingInfo.semanticScore !== undefined && rankingInfo.semanticScore > 0;
  const hasKeyword = sig
    ? sig.kwPos !== null && sig.kwPos !== undefined
    : (rankingInfo.matchedWords ?? rankingInfo.words ?? 0) > 0;

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

  // Newer API responses nest scores under `signals`; older ones expose flat fields.
  const sig = rankingInfo.signals ?? {};
  const has = (v) => v !== null && v !== undefined;
  const kwPos = sig.kwPos;
  const vecPos = sig.vecPos;
  const kwRRF = sig.kwRRF ?? rankingInfo.keywordScore;
  const vecRRF = sig.vecRRF ?? rankingInfo.semanticScore;
  const fused = sig.rrf ?? rankingInfo.neuralScore;
  const cosine = rankingInfo.semanticSimilarity;

  const inKw = has(kwPos) || (!sig.rrf && has(kwRRF));
  const inVec = has(vecPos) || has(cosine);
  const retrieved = inKw && inVec ? 'Keyword + Vector' : inVec ? 'Vector only' : inKw ? 'Keyword only' : '—';

  const num = (v, d = 4) => (typeof v === 'number' ? v.toFixed(d) : '—');
  const rank = (v) => (has(v) ? `#${v + 1}` : '—');
  // Cosine similarity as a percentage is easier to talk through live
  const cosineLabel = typeof cosine === 'number' ? `${num(cosine, 3)} (${(cosine * 100).toFixed(1)}%)` : '—';
  const fusedLabel = typeof fused === 'number'
    ? `${num(fused, 3)}${typeof kwRRF === 'number' && typeof vecRRF === 'number' ? ` (${num(kwRRF, 3)} + ${num(vecRRF, 3)})` : ''}`
    : '—';

  const rows = [
    ['Retrieved by', retrieved],
    ['Keyword rank', rank(kwPos)],
    ['Vector rank', rank(vecPos)],
    ['Cosine similarity', cosineLabel],
    ['Fused score (RRF)', fusedLabel],
  ];

  return (
    <div className="ranking-info-btn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
      <div className="ranking-info-tooltip">
        {rows.map(([label, value]) => (
          <div className="ranking-info-row" key={label}>
            <span className="ranking-info-label">{label}</span>
            <span className="ranking-info-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HitCard({ hit, attributes, showRetrievalBadge, showRankingInfo, isSelected, onClick }) {
  const { imageAttr, imagePrefix, imageSuffix, nameAttr, attr1Name, attr1Label, attr2Name, attr2Label } = attributes;

  const rawImageUrl = resolveAttr(hit, imageAttr).value;
  // Contentful-style URLs are protocol-relative ("//images.ctfassets.net/...")
  const imageUrl = typeof rawImageUrl === 'string' && rawImageUrl
    ? `${imagePrefix || ''}${rawImageUrl.startsWith('//') ? `https:${rawImageUrl}` : rawImageUrl}${imageSuffix || ''}`
    : null;
  const attr1Value = resolveAttr(hit, attr1Name).value;
  const attr2Value = resolveAttr(hit, attr2Name).value;

  // Highlight data mirrors the record shape, so nested paths must be walked too.
  const { value: nameValue, attr: resolvedNameAttr } = resolveAttr(hit, nameAttr);
  const hasHighlight =
    resolvedNameAttr &&
    hit._highlightResult &&
    getNested(hit._highlightResult, resolvedNameAttr) !== undefined;

  const displayName = nameValue ? String(nameValue) : '—';

  return (
    <article
      className={`hit-card${isSelected ? ' hit-card--selected' : ''}`}
      onClick={onClick}
    >
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
            <Highlight attribute={resolvedNameAttr} hit={hit} />
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
