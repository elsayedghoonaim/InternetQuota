import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Hook for fetching and generating statistics.
 */
export function useStatistics(auth) {
    const [statistics, setStatistics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const fetchStatistics = useCallback(async () => {
        if (!auth) return;
        setLoading(true);
        setError(null);

        try {
            const data = await apiFetch('/statistics', auth);
            setStatistics(data);
        } catch (err) {
            if (err.message !== 'UNAUTHORIZED') {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, [auth]);

    const generateStatistics = useCallback(async () => {
        if (!auth) return;
        setGenerating(true);
        setError(null);

        try {
            const result = await apiFetch('/statistics/generate?force=true', auth, { method: 'POST' });
            // Refresh after generating
            await fetchStatistics();
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setGenerating(false);
        }
    }, [auth, fetchStatistics]);

    return {
        statistics, loading, generating, error,
        setError, fetchStatistics, generateStatistics
    };
}
