import { useEffect, useState } from 'react';

const EMPTY = { map_points: [], scam_types: [], city_stats: [], insights: [], live_stats: [], top_accounts: [], top_phones: [], monthly_trend: [] };

/** Fetches all product intelligence from the application database. */
export default function useIntelligence() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/intelligence', { credentials: 'include' })
      .then(response => response.ok ? response.json() : EMPTY)
      .then(result => { if (active) setData({ ...EMPTY, ...result }); })
      .catch(() => { if (active) setData(EMPTY); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { data, loading };
}
