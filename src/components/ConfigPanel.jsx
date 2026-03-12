import { useState, useEffect, useRef } from 'react';

export default function ConfigPanel({ isOpen, onClose, config, defaultConfig, onSave }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(config)));
  const [showApiKey1, setShowApiKey1] = useState(false);
  const [showApiKey2, setShowApiKey2] = useState(false);

  // Import / Export state
  const [exportName, setExportName] = useState('');
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset local state to current config every time the panel opens
  useEffect(() => {
    if (isOpen) {
      setLocal(JSON.parse(JSON.stringify(config)));
      setImportError(null);
    }
  }, [isOpen]);

  // ── Export ──────────────────────────────────────────────────────
  const exportConfig = () => {
    const utc = new Date().toISOString().replace(/:/g, '-').replace(/\.\d{3}/, '');
    const prefix = exportName.trim() ? `${exportName.trim()}-` : '';
    const filename = `${prefix}sidebyside-config-${utc}.json`;
    const blob = new Blob([JSON.stringify(local, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import ──────────────────────────────────────────────────────
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed.index1 || !parsed.index2 || !parsed.attributes) {
          setImportError('Invalid config file — missing required sections (index1, index2, attributes).');
          return;
        }
        setLocal({
          ...defaultConfig,
          ...parsed,
          index1: { ...defaultConfig.index1, ...parsed.index1 },
          index2: { ...defaultConfig.index2, ...parsed.index2 },
          attributes: { ...defaultConfig.attributes, ...parsed.attributes },
        });
      } catch {
        setImportError('Could not parse file. Make sure it is a valid JSON config exported from this tool.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ── Config update helpers ───────────────────────────────────────
  const updateIndex = (indexKey, field, value) => {
    setLocal((prev) => ({
      ...prev,
      [indexKey]: { ...prev[indexKey], [field]: value },
    }));
  };

  const updateAttr = (field, value) => {
    setLocal((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [field]: value },
    }));
  };

  const handleReset = () => setLocal(JSON.parse(JSON.stringify(defaultConfig)));

  return (
    <aside
      className={`config-panel ${isOpen ? 'config-panel--open' : ''}`}
      role="complementary"
      aria-label="Configuration panel"
    >
      {/* Panel Header */}
      <div className="config-panel-header">
        <div className="config-panel-header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <h2>Configuration</h2>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="config-panel-body">

        {/* ── Import / Export ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--io">⇅</span>
            Import / Export
          </h3>
          <p className="config-hint">
            Export saves the current configuration as a <code>.json</code> file on your machine — import it later to restore everything.
          </p>

          <div className="config-field" style={{ marginBottom: '10px' }}>
            <span className="config-field-label">Export name (optional)</span>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder="e.g. algolia-test, sideBySide"
              spellCheck={false}
            />
          </div>

          <div className="io-row">
            <button className="io-btn io-btn--export" onClick={exportConfig} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Config
            </button>

            <button className="io-btn io-btn--import" onClick={() => { setImportError(null); fileInputRef.current?.click(); }} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Config
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="io-file-input"
              onChange={handleImportFile}
              aria-label="Import configuration JSON file"
            />
          </div>

          {importError && (
            <p className="io-error">{importError}</p>
          )}
        </section>

        {/* ── Index 1 ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--1">1</span>
            Left Column Index
          </h3>
          <div className="config-fields">
            <Field label="Column Title">
              <input
                type="text"
                value={local.index1.title}
                onChange={(e) => updateIndex('index1', 'title', e.target.value)}
                placeholder="e.g. Keyword Search"
              />
            </Field>
            <Field label="App ID">
              <input
                type="text"
                value={local.index1.appId}
                onChange={(e) => updateIndex('index1', 'appId', e.target.value)}
                placeholder="Your Algolia App ID"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Search-only API Key">
              <div className="input-with-toggle">
                <input
                  type={showApiKey1 ? 'text' : 'password'}
                  value={local.index1.apiKey}
                  onChange={(e) => updateIndex('index1', 'apiKey', e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowApiKey1((v) => !v)}
                  aria-label={showApiKey1 ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey1 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </Field>
            <Field label="Index Name">
              <input
                type="text"
                value={local.index1.indexName}
                onChange={(e) => updateIndex('index1', 'indexName', e.target.value)}
                placeholder="your_index_name"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            {!local.syncColumns && (
              <Field label="Search Mode">
                <select
                  value={local.index1.searchMode}
                  onChange={(e) => updateIndex('index1', 'searchMode', e.target.value)}
                >
                  <option value="keyword">🔤 Keyword</option>
                  <option value="neural">🧠 Neural (AI Search)</option>
                </select>
              </Field>
            )}
            <ToggleField
              label="Show retrieval type badge on hit tiles"
              hint='Sends getRankingInfo:true and reads _rankingInfo.semanticScore to display "Keyword", "Vector", or "Keyword & Vector" on each result.'
              checked={!!local.index1.showRetrievalBadge}
              onChange={(v) => updateIndex('index1', 'showRetrievalBadge', v)}
            />
          </div>
        </section>

        {/* ── Sync divider ── */}
        <div className="sync-divider">
          <label className="sync-divider-toggle">
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={!!local.syncColumns}
                onChange={(e) => {
                  const on = e.target.checked;
                  setLocal((prev) => ({
                    ...prev,
                    syncColumns: on,
                    syncIndex: on ? prev.syncIndex : false,
                    ...(on ? {
                      index1: { ...prev.index1, searchMode: 'keyword' },
                      index2: { ...prev.index2, searchMode: 'neural' },
                    } : {}),
                  }));
                }}
              />
              <span className="toggle-slider" />
            </span>
            <span className="sync-divider-label">
              <strong>Same App for both columns</strong>
              <span className="sync-divider-hint">
                Shares App ID &amp; API Key from Left Column
              </span>
            </span>
          </label>

          {local.syncColumns && (
            <label className="sync-divider-toggle" style={{ marginTop: '10px' }}>
              <span className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!!local.syncIndex}
                  onChange={(e) =>
                    setLocal((prev) => ({ ...prev, syncIndex: e.target.checked }))
                  }
                />
                <span className="toggle-slider" />
              </span>
              <span className="sync-divider-label">
                <strong>Query the the SAME INDEX</strong>
                <span className="sync-divider-hint">
                  Left column uses keyword, the Right uses NeuralSearch
                </span>
              </span>
            </label>
          )}
        </div>

        {/* ── Index 2 ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--2">2</span>
            Right Column Index
          </h3>
          <div className="config-fields">
            <Field label="Column Title">
              <input
                type="text"
                value={local.index2.title}
                onChange={(e) => updateIndex('index2', 'title', e.target.value)}
                placeholder="e.g. Neural Search"
              />
            </Field>

            {local.syncColumns ? (
              <>
                <div className="sync-notice">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  <span>
                    App ID and API Key are shared from the Left Column.
                    {local.syncIndex
                      ? <> Index Name is also shared. Left uses <strong>Keyword</strong>, Right uses <strong>Neural</strong>.</>
                      : <> Search mode is fixed to <strong>Neural</strong>.</>
                    }
                  </span>
                </div>
                {!local.syncIndex && (
                  <Field label="Index Name">
                    <input
                      type="text"
                      value={local.index2.indexName}
                      onChange={(e) => updateIndex('index2', 'indexName', e.target.value)}
                      placeholder="your_index_name"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </Field>
                )}
                <ToggleField
                  label="Show retrieval type badge on hit tiles"
                  hint='Sends getRankingInfo:true and reads _rankingInfo.semanticScore to display "Keyword", "Vector", or "Keyword & Vector" on each result.'
                  checked={!!local.index2.showRetrievalBadge}
                  onChange={(v) => updateIndex('index2', 'showRetrievalBadge', v)}
                />
              </>
            ) : (
              <>
                <Field label="App ID">
                  <input
                    type="text"
                    value={local.index2.appId}
                    onChange={(e) => updateIndex('index2', 'appId', e.target.value)}
                    placeholder="Your Algolia App ID"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Search-only API Key">
                  <div className="input-with-toggle">
                    <input
                      type={showApiKey2 ? 'text' : 'password'}
                      value={local.index2.apiKey}
                      onChange={(e) => updateIndex('index2', 'apiKey', e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowApiKey2((v) => !v)}
                      aria-label={showApiKey2 ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey2 ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                  </div>
                </Field>
                <Field label="Index Name">
                  <input
                    type="text"
                    value={local.index2.indexName}
                    onChange={(e) => updateIndex('index2', 'indexName', e.target.value)}
                    placeholder="your_index_name"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Search Mode">
                  <select
                    value={local.index2.searchMode}
                    onChange={(e) => updateIndex('index2', 'searchMode', e.target.value)}
                  >
                    <option value="keyword">🔤 Keyword</option>
                    <option value="neural">🧠 Neural (AI Search)</option>
                  </select>
                </Field>
                <ToggleField
                  label="Show retrieval type badge on hit tiles"
                  hint='Sends getRankingInfo:true and reads _rankingInfo.semanticScore to display "Keyword", "Vector", or "Keyword & Vector" on each result.'
                  checked={!!local.index2.showRetrievalBadge}
                  onChange={(v) => updateIndex('index2', 'showRetrievalBadge', v)}
                />
              </>
            )}
          </div>
        </section>

        {/* ── Hit Card Attributes ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--attrs">✦</span>
            Hit Card Attributes
          </h3>
          <p className="config-hint">
            Enter the exact attribute names from your Algolia index records.
          </p>
          <div className="config-fields">
            <Field label="Image Attribute">
              <input
                type="text"
                value={local.attributes.imageAttr}
                onChange={(e) => updateAttr('imageAttr', e.target.value)}
                placeholder="e.g. image_url, thumbnail"
              />
            </Field>
            <Field label="Image URL Prefix (optional)">
              <input
                type="text"
                value={local.attributes.imagePrefix}
                onChange={(e) => updateAttr('imagePrefix', e.target.value)}
                placeholder="e.g. https://cdn.example.com/"
              />
            </Field>
            <Field label="Image URL Suffix (optional)">
              <input
                type="text"
                value={local.attributes.imageSuffix}
                onChange={(e) => updateAttr('imageSuffix', e.target.value)}
                placeholder="e.g. ?w=400&auto=format"
              />
            </Field>
            <Field label="Name / Title Attribute">
              <input
                type="text"
                value={local.attributes.nameAttr}
                onChange={(e) => updateAttr('nameAttr', e.target.value)}
                placeholder="e.g. name, title, product_name"
              />
            </Field>

            <div className="config-field-pair">
              <Field label="Attribute 1 — Field">
                <input
                  type="text"
                  value={local.attributes.attr1Name}
                  onChange={(e) => updateAttr('attr1Name', e.target.value)}
                  placeholder="field_name"
                />
              </Field>
              <Field label="Attribute 1 — Label">
                <input
                  type="text"
                  value={local.attributes.attr1Label}
                  onChange={(e) => updateAttr('attr1Label', e.target.value)}
                  placeholder="Display label"
                />
              </Field>
            </div>

            <div className="config-field-pair">
              <Field label="Attribute 2 — Field">
                <input
                  type="text"
                  value={local.attributes.attr2Name}
                  onChange={(e) => updateAttr('attr2Name', e.target.value)}
                  placeholder="field_name"
                />
              </Field>
              <Field label="Attribute 2 — Label">
                <input
                  type="text"
                  value={local.attributes.attr2Label}
                  onChange={(e) => updateAttr('attr2Label', e.target.value)}
                  placeholder="Display label"
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ── Display Settings ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--display">⊞</span>
            Display Settings
          </h3>
          <div className="config-fields">
            <Field label="Hits Per Page (3 columns × N rows)">
              <select
                value={local.hitsPerPage}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, hitsPerPage: parseInt(e.target.value, 10) }))
                }
              >
                <option value={6}>6 hits &nbsp;(2 rows)</option>
                <option value={9}>9 hits &nbsp;(3 rows)</option>
                <option value={12}>12 hits (4 rows)</option>
                <option value={15}>15 hits (5 rows)</option>
                <option value={18}>18 hits (6 rows)</option>
              </select>
            </Field>
          </div>
        </section>
      </div>

      {/* Panel Footer */}
      <div className="config-panel-footer">
        <button className="btn btn-secondary" onClick={handleReset} type="button">
          Reset
        </button>
        <button className="btn btn-primary" onClick={() => onSave(local)} type="button">
          Apply &amp; Search
        </button>
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <label className="config-field">
      <span className="config-field-label">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, hint, checked, onChange }) {
  return (
    <div className="toggle-field">
      <label className="toggle-row">
        <span className="toggle-switch">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="toggle-slider" />
        </span>
        <span className="toggle-label">{label}</span>
      </label>
      {hint && <p className="toggle-hint">{hint}</p>}
    </div>
  );
}
