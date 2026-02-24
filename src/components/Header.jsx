export default function Header({ onConfigOpen, isConfigured }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <AlgoliaLogo />
        <div className="header-title">
          <h1>Side-by-Side Search</h1>
          <span className="header-subtitle">Keyword vs Neural Comparison</span>
        </div>
      </div>

      <div className="header-right">
        <button
          className={`config-btn ${!isConfigured ? 'config-btn--alert' : ''}`}
          onClick={onConfigOpen}
          title="Configure search settings"
          aria-label="Open configuration panel"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {!isConfigured && <span className="config-btn-dot" />}
        </button>
      </div>
    </header>
  );
}

function AlgoliaLogo() {
  return (
    <img
      src="/src/components/Algolia_Logo.png"
      alt="Algolia"
      className="algolia-logo"
      width="36"
      height="36"
    />
  );
}
