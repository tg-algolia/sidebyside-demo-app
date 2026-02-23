import { useState, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

export default function ConfigPanel({ isOpen, onClose, config, onSave }) {
  const [local, setLocal] = useState(config);
  const [showApiKey1, setShowApiKey1] = useState(false);
  const [showApiKey2, setShowApiKey2] = useState(false);

  // Preset management
  const [presets, setPresets] = useLocalStorage('sidebyside-presets', []);
  const [presetName, setPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [loadedPreset, setLoadedPreset] = useState(null);

  // Sync when external config changes (e.g. on first load)
  useEffect(() => {
    setLocal(config);
  }, [config]);

  const savePreset = () => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    setPresets((prev) => {
      const idx = prev.findIndex((p) => p.name === name);
      const entry = { name, config: local, savedAt: new Date().toISOString() };
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    setPresetName('');
    setIsSavingPreset(false);
    setLoadedPreset(name);
  };

  const loadPreset = (preset) => {
    setLocal(preset.config);
    setLoadedPreset(preset.name);
    setIsSavingPreset(false);
  };

  const deletePreset = (name) => {
    setPresets((prev) => prev.filter((p) => p.name !== name));
    if (loadedPreset === name) setLoadedPreset(null);
  };

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

  const handleReset = () => setLocal(config);

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

        {/* ── Presets ── */}
        <section className="config-section">
          <h3 className="config-section-title">
            <span className="section-badge section-badge--preset">★</span>
            Saved Presets
          </h3>

          {presets.length === 0 && !isSavingPreset && (
            <p className="config-hint">No presets saved yet. Configure your indices below and save a preset to recall it later.</p>
          )}

          {presets.length > 0 && (
            <ul className="preset-list">
              {presets.map((p) => (
                <li key={p.name} className={`preset-item ${loadedPreset === p.name ? 'preset-item--active' : ''}`}>
                  <div className="preset-item-info">
                    <span className="preset-item-name">{p.name}</span>
                    {loadedPreset === p.name && <span className="preset-item-active-badge">Loaded</span>}
                  </div>
                  <div className="preset-item-actions">
                    <button
                      className="preset-btn preset-btn--load"
                      onClick={() => loadPreset(p)}
                      type="button"
                      title="Load this preset into the editor"
                    >
                      Load
                    </button>
                    <button
                      className="preset-btn preset-btn--delete"
                      onClick={() => deletePreset(p.name)}
                      type="button"
                      aria-label={`Delete preset ${p.name}`}
                      title="Delete preset"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isSavingPreset ? (
            <div className="preset-save-row">
              <input
                type="text"
                className="preset-name-input"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setIsSavingPreset(false); }}
                placeholder="Preset name…"
                autoFocus
              />
              <button className="preset-btn preset-btn--confirm" onClick={savePreset} type="button" disabled={!presetName.trim()}>
                Save
              </button>
              <button className="preset-btn preset-btn--cancel" onClick={() => { setIsSavingPreset(false); setPresetName(''); }} type="button">
                Cancel
              </button>
            </div>
          ) : (
            <button className="preset-add-btn" onClick={() => setIsSavingPreset(true)} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Save current as preset
            </button>
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
            <Field label="Search Mode">
              <select
                value={local.index1.searchMode}
                onChange={(e) => updateIndex('index1', 'searchMode', e.target.value)}
              >
                <option value="keyword">🔤 Keyword</option>
                <option value="neural">🧠 Neural (AI Search)</option>
              </select>
            </Field>
            <ToggleField
              label="Show retrieval type badge on hit tiles"
              hint='Sends getRankingInfo:true and reads _rankingInfo.semanticScore to display "Keyword", "Vector", or "Keyword & Vector" on each result.'
              checked={!!local.index1.showRetrievalBadge}
              onChange={(v) => updateIndex('index1', 'showRetrievalBadge', v)}
            />
          </div>
        </section>

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
