import { useState, useMemo, useEffect } from 'react';
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
    showRetrievalBadge: false,
  },
  index2: {
    appId: '',
    apiKey: '',
    indexName: '',
    title: 'Neural Search',
    searchMode: 'neural',
    showRetrievalBadge: false,
  },
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
  hitsPerPage: 9,
  syncColumns: false,
  syncIndex: false,
};

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
          <div className="comparison-container">
            <InstantSearch
              searchClient={searchClient1}
              indexName={config.index1.indexName}
              future={{ preserveSharedStateOnUnmount: true }}
            >
              <SyncSearchBox query={debouncedQuery} />
              <Configure
                hitsPerPage={config.hitsPerPage}
                getRankingInfo={true}
                {...(config.syncIndex ? { disableNeuralSearch: true } : {})}
              />
              <SearchColumn
                title={config.index1.title}
                searchMode={config.syncColumns ? 'keyword' : config.index1.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.index1.showRetrievalBadge}
              />
            </InstantSearch>

            <InstantSearch
              searchClient={searchClient2}
              indexName={config.syncColumns && config.syncIndex ? config.index1.indexName : config.index2.indexName}
              future={{ preserveSharedStateOnUnmount: true }}
            >
              <SyncSearchBox query={debouncedQuery} />
              <Configure
                hitsPerPage={config.hitsPerPage}
                getRankingInfo={true}
                {...(config.syncIndex ? { disableNeuralSearch: false } : {})}
              />
              <SearchColumn
                title={config.index2.title}
                searchMode={config.syncColumns ? 'neural' : config.index2.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.syncColumns ? config.index1.showRetrievalBadge : config.index2.showRetrievalBadge}
                showRankingInfo={true}
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
    </div>
  );
}
