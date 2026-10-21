import { Component, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { createPortal } from 'react-dom';
import { InstantSearch, Configure, Chat, createDefaultTools, SearchIndexToolType } from 'react-instantsearch';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import OptionalFilters from './components/OptionalFilters';
import SyncSearchBox from './components/SyncSearchBox';
import SearchColumn from './components/SearchColumn';
import HitCard from './components/HitCard';
import { createAgentTools, createAgentTransport } from './components/agentTools';
import ConfigPanel from './components/ConfigPanel';
import useLocalStorage from './hooks/useLocalStorage';

const DEFAULT_CONFIG = {
  index1: {
    appId: '',
    apiKey: '',
    indexName: '',
    title: 'Keyword Search',
    searchMode: 'keyword',
    synonymsEnabled: true,
    rulesEnabled: true,
    drrEnabled: true,
  },
  index2: {
    appId: '',
    apiKey: '',
    indexName: '',
    title: 'Neural Search',
    searchMode: 'neural',
    agentId: '',
    synonymsEnabled: true,
    rulesEnabled: true,
    drrEnabled: true,
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

function AskAiButton({ slot, open, onClick }) {
  if (!slot) return null;
  return createPortal(
    <button
      type="button"
      className={`ask-ai-btn${open ? ' ask-ai-btn--open' : ''}`}
      onClick={onClick}
      aria-pressed={open}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zm7 11l.9 2.6L22.5 16.5l-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13zM5 14l.7 2.1 2.1.7-2.1.7L5 19.6l-.7-2.1-2.1-.7 2.1-.7L5 14z" />
      </svg>
      Ask AI
    </button>,
    slot
  );
}

const CHAT_TRANSLATIONS = {
  header: { title: 'Ask AI' },
  messages: { loaderText: 'Thinking…' },
};

// The widget's built-in loader only covers the wait for the first byte. After that the
// assistant message exists but is empty while the agent runs its search tool, which reads
// as "nothing is happening". Show progress in that gap and hold back the action buttons
// until there is text to act on.
function AgentMessageActions({ actions = [], message }) {
  const parts = message?.parts ?? [];
  const textParts = parts.filter((p) => p.type === 'text');
  const streamingText = textParts.some((p) => p.state === 'streaming');
  const hasText = textParts.some((p) => p.text);
  const toolParts = parts.filter((p) => p.type?.startsWith('tool-'));
  const searching = toolParts.some((p) => p.state !== 'output-available' && p.state !== 'output-error');

  if (!hasText || streamingText) {
    if (streamingText) return null;
    return (
      <div className="agent-progress" role="status" aria-live="polite">
        <span className="agent-progress-spinner" aria-hidden="true" />
        <span>{searching || toolParts.length === 0 ? 'Searching the catalog' : 'Writing a response'}</span>
        <span className="agent-progress-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
    );
  }

  return actions.map((action, i) => (
    <button
      key={i}
      type="button"
      className="ais-Button ais-Button--ghost ais-Button--sm ais-Button--icon-only ais-ChatMessage-action"
      disabled={action.disabled}
      aria-label={action.title}
      title={action.title}
      onClick={() => action.onClick?.(message)}
    >
      {action.icon ? <action.icon /> : null}
    </button>
  ));
}
const CHAT_CLASSNAMES = { root: 'ais-ChatOverlayLayout' };
const CHAT_SIZE_KEY = 'askAiSize';
const CHAT_MIN = { w: 320, h: 360 };

// Drag handle on the panel's top-left corner (the panel is anchored bottom-right).
// Size persists in localStorage; double-click the handle to reset.
function AskAiResizer() {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    const root = document.querySelector('.ais-ChatOverlayLayout');
    if (!root) return undefined;
    setContainer(root.querySelector('.ais-Chat-container'));
    const apply = (size) => {
      if (size) {
        root.style.setProperty('--ais-chat-width', `${size.w}px`);
        root.style.setProperty('--ais-chat-height', `${size.h}px`);
      } else {
        root.style.removeProperty('--ais-chat-width');
        root.style.removeProperty('--ais-chat-height');
      }
    };
    try { apply(JSON.parse(localStorage.getItem(CHAT_SIZE_KEY))); } catch { /* ignore */ }
    root.__applyChatSize = apply;
    return () => { delete root.__applyChatSize; };
  }, []);

  const onPointerDown = (e) => {
    const root = document.querySelector('.ais-ChatOverlayLayout');
    if (!root) return;
    e.preventDefault();
    const rect = root.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    let size = { w: rect.width, h: rect.height };
    const prevTransition = root.style.transition;
    root.style.transition = 'none';
    document.body.style.userSelect = 'none';
    const move = (ev) => {
      size = {
        w: Math.round(Math.max(CHAT_MIN.w, start.w + (start.x - ev.clientX))),
        h: Math.round(Math.max(CHAT_MIN.h, start.h + (start.y - ev.clientY))),
      };
      root.__applyChatSize?.(size);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      root.style.transition = prevTransition;
      document.body.style.userSelect = '';
      try { localStorage.setItem(CHAT_SIZE_KEY, JSON.stringify(size)); } catch { /* ignore */ }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const reset = () => {
    document.querySelector('.ais-ChatOverlayLayout')?.__applyChatSize?.(null);
    try { localStorage.removeItem(CHAT_SIZE_KEY); } catch { /* ignore */ }
  };

  if (!container) return null;
  return createPortal(
    <div
      className="ask-ai-resize"
      role="separator"
      aria-label="Resize Ask AI (double-click to reset)"
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onDoubleClick={reset}
    />,
    container
  );
}

// Keeps an unpublished/misconfigured agent from taking down the whole page.
class AskAiBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.warn('[Ask AI] agent error:', error); }
  render() {
    if (!this.state.error) return this.props.children;
    const { slot } = this.props;
    return slot ? createPortal(
      <button type="button" className="ask-ai-btn ask-ai-btn--error" disabled
        title={`Agent unavailable: ${this.state.error.message || 'unknown error'}. Check that it is published in Agent Studio.`}>
        Ask AI unavailable
      </button>,
      slot
    ) : null;
  }
}

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
  const [optionalFilters, setOptionalFilters] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedObjectID, setSelectedObjectID] = useState(null);
  const [toast, setToast] = useState(null);
  const [askAiSlot, setAskAiSlot] = useState(null);
  const col1ItemsRef = useRef([]);
  const col2ItemsRef = useRef([]);
  const toastTimerRef = useRef(null);

  const toggleIndexSetting = useCallback((indexKey, field) => {
    setConfig((prev) => ({
      ...prev,
      [indexKey]: { ...prev[indexKey], [field]: prev[indexKey][field] === false },
    }));
  }, [setConfig]);

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

  const agentId = config.index2.agentId?.trim();

  // A trailing "?" hands the query to the agent instead of (only) searching.
  const isQuestion = !!agentId && /\S\s*\?+\s*$/.test(debouncedQuery) && debouncedQuery.trim().length > 1;
  const searchQuery = agentId ? debouncedQuery.replace(/\s*\?+\s*$/, '') : debouncedQuery;
  const lastAskedRef = useRef(null);
  useEffect(() => {
    if (!isQuestion) { lastAskedRef.current = null; return undefined; }
    const text = debouncedQuery.trim();
    if (lastAskedRef.current === text) return undefined;
    lastAskedRef.current = text;
    // Always start from a fresh chat: open, stop any in-flight reply, clear, then send.
    let tries = 0;
    let clearingSince = null;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > 100) { clearInterval(timer); return; }
      const container = document.querySelector('.ais-Chat-container');
      if (!container) return;
      if (!container.classList.contains('ais-Chat-container--open')) {
        document.querySelector('.ask-ai-btn')?.click();
        return;
      }
      const textarea = container.querySelector('.ais-ChatPrompt-textarea');
      const submit = container.querySelector('.ais-ChatPrompt-submit');
      const clearBtn = container.querySelector('.ais-ChatHeader-clear');
      if (!textarea) return;
      const busy = ['submitted', 'streaming'].includes(submit?.dataset.status);
      if (busy) { textarea.closest('form')?.requestSubmit(); return; }
      const stillClearing = !!container.querySelector('.ais-ChatMessages-content--clearing');
      if (stillClearing || (clearBtn && !clearBtn.disabled)) {
        if (clearingSince === null) { clearingSince = tries; clearBtn?.click(); return; }
        // The library clears on a CSS transitionend; nudge it if none fires.
        if (tries - clearingSince >= 8) {
          container.querySelector('.ais-ChatMessages-content')?.dispatchEvent(
            new TransitionEvent('transitionend', { propertyName: 'opacity' })
          );
        }
        return;
      }
      if (textarea.disabled) return;
      clearInterval(timer);
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => textarea.closest('form')?.requestSubmit(), 50);
    }, 100);
    return () => clearInterval(timer);
  }, [isQuestion, debouncedQuery]);
  const chatItem = useCallback(
    ({ item }) => <HitCard hit={item} attributes={config.attributes} />,
    [config.attributes]
  );

  // Agent Studio names its search tools per index ("algolia_search_index_<indexName>"),
  // but the Chat widget only ships a renderer for the generic "algolia_search_index".
  const agentCtxRef = useRef({});
  agentCtxRef.current = {
    appId: config.syncColumns ? config.index1.appId : config.index2.appId,
    apiKey: config.syncColumns ? config.index1.apiKey : config.index2.apiKey,
    indexName: config.syncColumns && config.syncIndex ? config.index1.indexName : config.index2.indexName,
    attributes: config.attributes,
    query,
    setQuery,
    getHits: () => col2ItemsRef.current,
  };

  const chatTools = useMemo(() => {
    const searchTool = createDefaultTools(chatItem)[SearchIndexToolType];
    const names = [config.index1.indexName, config.index2.indexName].filter(Boolean);
    return {
      ...createAgentTools(agentCtxRef),
      ...Object.fromEntries(names.map((name) => [`${SearchIndexToolType}_${name}`, searchTool])),
    };
  }, [chatItem, config.index1.indexName, config.index2.indexName]);

  const agentAppId = config.syncColumns ? config.index1.appId : config.index2.appId;
  const agentApiKey = config.syncColumns ? config.index1.apiKey : config.index2.apiKey;
  const agentTransport = useMemo(
    () => (agentId ? createAgentTransport({ appId: agentAppId, apiKey: agentApiKey, agentId }) : null),
    [agentId, agentAppId, agentApiKey]
  );

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
          askAiSlotRef={setAskAiSlot}
          showAskAiHint={!!agentId}
        />

        <OptionalFilters
          filters={optionalFilters}
          onChange={setOptionalFilters}
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
              <SyncSearchBox query={searchQuery} />
              <Configure
                hitsPerPage={9}
                getRankingInfo={true}
                optionalFilters={optionalFilters.length ? optionalFilters : undefined}
                synonyms={config.index1.synonymsEnabled !== false}
                enableRules={config.index1.rulesEnabled !== false}
                enableReRanking={config.index1.drrEnabled !== false}
                disableNeuralSearch={config.syncColumns || config.index1.searchMode === 'keyword'}
              />
              <SearchColumn
                title={config.index1.title}
                searchMode={config.syncColumns ? 'keyword' : config.index1.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.showRetrievalBadge}
                columnId={1}
                toggles={{ synonyms: config.index1.synonymsEnabled !== false, rules: config.index1.rulesEnabled !== false, drr: config.index1.drrEnabled !== false }}
                onToggle={(field) => toggleIndexSetting('index1', field)}
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
              <SyncSearchBox query={searchQuery} />
              <Configure
                hitsPerPage={9}
                getRankingInfo={true}
                optionalFilters={optionalFilters.length ? optionalFilters : undefined}
                synonyms={config.index2.synonymsEnabled !== false}
                enableRules={config.index2.rulesEnabled !== false}
                enableReRanking={config.index2.drrEnabled !== false}
                disableNeuralSearch={!config.syncColumns && config.index2.searchMode === 'keyword'}
              />
              <SearchColumn
                title={config.index2.title}
                searchMode={config.syncColumns ? 'neural' : config.index2.searchMode}
                attributes={config.attributes}
                showRetrievalBadge={config.showRetrievalBadge}
                showRankingInfo={true}
                columnId={2}
                toggles={{ synonyms: config.index2.synonymsEnabled !== false, rules: config.index2.rulesEnabled !== false, drr: config.index2.drrEnabled !== false }}
                onToggle={(field) => toggleIndexSetting('index2', field)}
                selectedObjectID={selectedObjectID}
                onHitClick={handleHitClick}
                onItemsChange={onCol2Items}
              />
              {agentId && (
                <AskAiBoundary key={agentId} slot={askAiSlot}>
                  <Chat
                    transport={agentTransport}
                    itemComponent={chatItem}
                    tools={chatTools}
                    translations={CHAT_TRANSLATIONS}
                    actionsComponent={AgentMessageActions}
                    classNames={CHAT_CLASSNAMES}
                    toggleButtonComponent={({ open, onClick }) => (
                      <AskAiButton slot={askAiSlot} open={open} onClick={onClick} />
                    )}
                  />
                  <AskAiResizer />
                </AskAiBoundary>
              )}
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
