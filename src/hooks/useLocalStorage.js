import { useState, useEffect } from 'react';

/**
 * Persist state in localStorage with deep-merge fallback for new config keys.
 */
export default function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return deepMerge(JSON.parse(stored), defaultValue);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (e.g. private browsing quotas)
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Deep merge `stored` into `defaults` so newly added config keys
 * always get their default values on first use.
 */
function deepMerge(stored, defaults) {
  if (typeof defaults !== 'object' || defaults === null) return stored ?? defaults;
  const result = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (k in stored) {
      result[k] =
        typeof defaults[k] === 'object' && !Array.isArray(defaults[k])
          ? deepMerge(stored[k], defaults[k])
          : stored[k];
    }
  }
  return result;
}
