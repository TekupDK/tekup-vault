/**
 * React Hook til TekupVault Integration
 * Kan bruges i renos-frontend til semantisk søgning på tværs af alle repos
 */

import { useState, useCallback } from 'react';

const VAULT_API_URL = 'http://localhost:3001/api/search';
const VAULT_API_KEY = 'tekup_vault_api_key_2025_secure';

export function useVaultSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (query, options = {}) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(VAULT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': VAULT_API_KEY
        },
        body: JSON.stringify({
          query,
          limit: options.limit || 10,
          threshold: options.threshold || 0.5,
          repository: options.repository, // Optional: filter by repo
          source: options.source // Optional: filter by source
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err.message);
      console.error('Vault search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// Eksempel på brug i React komponent
export function VaultSearchComponent() {
  const [query, setQuery] = useState('');
  const { results, loading, error, search } = useVaultSearch();

  const handleSearch = useCallback(() => {
    search(query);
  }, [query, search]);

  return (
    <div className="vault-search">
      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg i alle TekupVault dokumenter..."
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Søger...' : '🔍 Søg'}
        </button>
      </div>

      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="results">
          <h3>Fundet {results.length} resultater:</h3>
          {results.map((result) => (
            <div key={result.id} className="result-item">
              <div className="result-header">
                <span className="repository">
                  {result.repository.split('/')[1]}
                </span>
                <span className="path">{result.path}</span>
                <span className="similarity">
                  {result.similarity.toFixed(3)}
                </span>
              </div>
              <div className="result-content">
                {result.content.substring(0, 300)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

