import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the loader (used by pull-to-refresh and after mutations). */
  reload: () => void;
}

/**
 * Runs an async loader on mount and whenever `deps` change, exposing
 * loading / error / data and a manual `reload`. Guards against setting state
 * after unmount.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (mounted.current) setData(result);
      })
      .catch((err: unknown) => {
        if (mounted.current) setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(run, [run]);

  return { data, loading, error, reload: run };
}
