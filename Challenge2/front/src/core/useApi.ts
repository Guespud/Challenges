import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

interface UseApiOptions {
  /** Run the fetcher automatically on mount / when deps change. Set to false for mutations triggered manually. */
  immediate?: boolean;
  /** Re-runs the effect when these change, same semantics as useEffect deps. */
  deps?: unknown[];
}

/**
 * Single reusable primitive for every network call in the app: queries (immediate: true)
 * and mutations (immediate: false, call `run()` on submit) share the same loading/error/data shape.
 */
export function useApi<T>(fetcher: () => Promise<T>, options: UseApiOptions = {}) {
  const { immediate = true, deps = [] } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(immediate);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      // fetch-on-mount is the intentional query behavior of this primitive, not a side effect to avoid
      // eslint-disable-next-line react-hooks/set-state-in-effect
      run().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, run, ...deps]);

  return { data, error, loading, run };
}
