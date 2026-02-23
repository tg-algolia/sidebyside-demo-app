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
    <svg
      className="algolia-logo"
      width="36"
      height="36"
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Algolia"
    >
      <rect width="500" height="500" rx="100" fill="#5468FF" />
      <path
        d="M385 250C385 187.3 334.7 137 272 137H250v64.7h22c37.1 0 67.3 30.2 67.3 67.3v91.8c0 .5-.4.9-.9.9H227c-.5 0-.9-.4-.9-.9v-35.6h-64.7V361c0 13.3 10.7 24 24 24H361c13.3 0 24-10.7 24-24V250H385z"
        fill="white"
      />
      <path d="M137 115h64.7v270H137z" fill="white" />
    </svg>
  );
}
