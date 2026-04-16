import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { InstantSearch, Configure } from 'react-instantsearch';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import SyncSearchBox from './components/SyncSearchBox';
import SearchColumn from './components/SearchColumn';
import ConfigPanel from './components/ConfigPanel';
import useLocalStorage from './hooks/useLocalStorage';

const DEFAULT_CONFIG = {
  index1: {
    appId: '',
    apiKey: '',
    indexName: '',
    title: 'Keyword Search',
    searchMode: 'keyword',
  },
  index2: {
    appId: '',
    apiKey: '',
    indexName: '',
    title: 'Neural Search',
    searchMode: 'neural',
  },
  showRetrievalBadge: false,
  attributes: {
    imageAttr: 'image',
    imagePrefix: '',
    imageSuffix: '',
    nameAttr: 'name',
    attr1Name: 'brand',
    attr1Label: 'Brand',
    attr2Name: 'price',
    attr2Label: 'Price',
  },
  syncColumns: false,
  syncIndex: false,
};

function ConnectorLine({ selectedObjectID }) {
  const [line, setLine] = useState(null);

  const recalc = useCallback(() => {
    if (!selectedObjectID) { setLine(null); return; }
    const find = (col) => {
      const nodes = document.querySelectorAll(`[data-col="${col}"][data-objectid]`);
      return [...nodes].find((n) => n.dataset.objectid === selectedObjectID) ?? null;
    };
    const a = find('1');
    const b = find('2');
    if (!a || !b) { setLine(null); return; }
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    setLine({
      x1: ra.right, y1: ra.top + ra.height / 2,
      x2: rb.left,  y2: rb.top + rb.height / 2,
    });
  }, [selectedObjectID]);

  useEffect(() => {
    recalc();
    window.addEventListener('scroll', recalc, { passive: true });
    window.addEventListener('resize', recalc);
    return () => {
      window.removeEventListener('scroll', recalc);
      window.removeEventListener('resize', recalc);
    };
  }, [recalc]);

  if (!line) return null;
  const { x1, y1, x2, y2 } = line;
  const mx = (x1 + x2) / 2;

  return (
    <svg className="connector-svg" aria-hidden="true">
      <defs>
        <linearGradient id="conn-grad" gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0%" stopColor="#003DFF" />
          <stop offset="100%" stopColor="#7857FF" />
        </linearGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
        stroke="url(#conn-grad)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={x1} cy={y1} r="5" fill="#003DFF" />
      <circle cx={x2} cy={y2} r="5" fill="#7857FF" />
    </svg>
  );
}

function HitToast({ toast }) {
  if (!toast) return null;
  return (
    <div key={toast.key} className="hit-toast" style={{ left: toast.x, top: toast.y }}>
      {toast.message}
    </div>
  );
}

// Fallback client used when credentials are not yet configured
const createFallbackClient = () => ({
  search(requests) {
    return Promise.resolve({
      results: requests.map(() => ({
        hits: [],
        nbHits: 0,
        nbPages: 0,
        page: 0,
        processingTimeMS: 0,
        hitsPerPage: 9,
        exhaustiveNbHits: true,
        query: '',
        params: '',
      })),
    });
  },
});

export default function App() {
  const [config, setConfig] = useLocalStorage('sidebyside-config', DEFAULT_CONFIG);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedObjectID, setSelectedObjectID] = useState(null);
  const [toast, setToast] = useState(null);
  const col1ItemsRef = useRef([]);
  const col2ItemsRef = useRef([]);
  const toastTimerRef = useRef(null);

  const onCol1Items = useCallback((items) => { col1ItemsRef.current = items; }, []);
  const onCol2Items = useCallback((items) => { col2ItemsRef.current = items; }, []);

  const handleHitClick = useCallback((objectID, colId, event) => {
    if (selectedObjectID === objectID) {
      setSelectedObjectID(null);
      return;
    }
    const otherItems = colId === 1 ? col2ItemsRef.current : col1ItemsRef.current;
    const existsInOther = otherItems.some((item) => item.objectID === objectID);
    if (existsInOther) {
      setSelectedObjectID(objectID);
      setToast(null);
    } else {
      setSelectedObjectID(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message: "Record not found in the other column", x: event.clientX, y: event.clientY - 52, key: Date.now() });
      toastTimerRef.current = setTimeout(() => setToast(null), 2200);
    }
  }, [selectedObjectID]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelectedObjectID(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounce query to limit API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const searchClient1 = useMemo(() => {
    if (!config.index1.appId || !config.index1.apiKey) return createFallbackClient();
    return algoliasearch(config.index1.appId, config.index1.apiKey);
  }, [config.index1.appId, config.index1.apiKey]);

  const searchClient2 = useMemo(() => {
    const appId = config.syncColumns ? config.index1.appId : config.index2.appId;
    const apiKey = config.syncColumns ? config.index1.apiKey : config.index2.apiKey;
    if (!appId || !apiKey) return createFallbackClient();
    return algoliasearch(appId, apiKey);
  }, [
    config.syncColumns,
    config.index1.appId, config.index1.apiKey,
    config.index2.appId, config.index2.apiKey,
  ]);

  const isConfigured = config.syncColumns
    ? config.syncIndex
      ? config.index1.appId && config.index1.apiKey && config.index1.indexName
      : config.index1.appId && config.index1.apiKey && config.index1.indexName && config.index2.indexName
    : config.index1.appId && config.index1.apiKey && config.index1.indexName &&
      config.index2.appId && config.index2.apiKey && config.index2.indexName;

  return (
    <div className="app">
      <Header
        onConfigOpen={() => setIsPanelOpen(true)}
        isConfigured={!!isConfigured}
      />

      <main className="main-content">
        <SearchBar
          query={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
        />

        {!isConfigured ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2>Configure Your Search Indices</h2>
            <p>
              Set up your Algolia App IDs, API keys, and index names to start comparing
              keyword vs. neural search results side by side.
            </p>
            <button className="btn btn-primary" onClick={() => setIsPanelOpen(true)}>
              Open Configuration
            </button>
          </div>
        ) : (
          <div
            className="comparison-container"
            onClick={(e) => { if (!e.target.closest('.hit-card')) setSelectedObjectID(null); }}
          >
            <InstantSearch
              searchClient={searchClient1}
              indexName={config.index1.indexName}
              future={{ preserveSharedStateOnUnmount: true }}
            >
              <SyncSearchBox query={debouncedQuery} />
              <Configure
                hitsPerPage={9}
                getRankingInfo={true}
                disableNeuralSearch={config.syncColumns || config.index1.searchMode === 'keyword'}
              />
              <SearchColumn
                title={config.index1.title}
                searchMode={config.syncColumns ? 'keyword' : config.index1.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.showRetrievalBadge}
                columnId={1}
                selectedObjectID={selectedObjectID}
                onHitClick={handleHitClick}
                onItemsChange={onCol1Items}
              />
            </InstantSearch>

            <InstantSearch
              searchClient={searchClient2}
              indexName={config.syncColumns && config.syncIndex ? config.index1.indexName : config.index2.indexName}
              future={{ preserveSharedStateOnUnmount: true }}
            >
              <SyncSearchBox query={debouncedQuery} />
              <Configure
                hitsPerPage={9}
                getRankingInfo={true}
                disableNeuralSearch={!config.syncColumns && config.index2.searchMode === 'keyword'}
              />
              <SearchColumn
                title={config.index2.title}
                searchMode={config.syncColumns ? 'neural' : config.index2.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.showRetrievalBadge}
                showRankingInfo={true}
                columnId={2}
                selectedObjectID={selectedObjectID}
                onHitClick={handleHitClick}
                onItemsChange={onCol2Items}
              />
            </InstantSearch>
          </div>
        )}
      </main>

      {isPanelOpen && (
        <div className="panel-overlay" onClick={() => setIsPanelOpen(false)} />
      )}

      <ConfigPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        config={config}
        defaultConfig={DEFAULT_CONFIG}
        onSave={(newConfig) => {
          setConfig(newConfig);
          setIsPanelOpen(false);
        }}
      />

      <ConnectorLine selectedObjectID={selectedObjectID} />
      <HitToast toast={toast} />
    </div>
  );
}
