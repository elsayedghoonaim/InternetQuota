import { useState, useCallback, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Hook for managing accounts — fetch, add, delete.
 */
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useAccounts(auth, onUnauthorized) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const intervalRef = useRef(null);

    const fetchQuotas = useCallback(async (force = false) => {
        if (!auth) return;
        if (force) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const data = await apiFetch(`/quotas${force ? '?force_refresh=true' : ''}`, auth);
            setAccounts(data);
            setLastUpdated(Date.now());
        } catch (err) {
            if (err.message === 'UNAUTHORIZED') {
                onUnauthorized();
            }
            setError(err.message === 'UNAUTHORIZED' ? 'Invalid Credentials' : err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [auth, onUnauthorized]);

    // Auto-refresh every 5 minutes and on Tab Focus
    useEffect(() => {
        if (!auth) return;
        fetchQuotas(false); // Initial fetch uses cached DB data for instant UI loading
        intervalRef.current = setInterval(() => fetchQuotas(true), POLL_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("Tab is visible again. Forcing quota refresh...");
                fetchQuotas(true);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [auth]); // eslint-disable-line react-hooks/exhaustive-deps

    const addAccount = useCallback(async (formData) => {
        setLoading(true);
        setError(null);
        try {
            await apiFetch('/accounts', auth, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            await fetchQuotas(false);
            return true;
        } catch (err) {
            setError(err.message === 'UNAUTHORIZED' ? 'Invalid Credentials' : 'Failed to add account. Check credentials or identifier.');
            return false;
        } finally {
            setLoading(false);
        }
    }, [auth, fetchQuotas]);

    const deleteAccount = useCallback(async (identifier) => {
        const prevAccounts = [...accounts];
        setAccounts(accounts.filter(a => a.identifier !== identifier));

        try {
            await apiFetch(`/accounts/${identifier}`, auth, { method: 'DELETE' });
        } catch (err) {
            setError(err.message === 'UNAUTHORIZED' ? 'Invalid Credentials' : 'Failed to delete account');
            setAccounts(prevAccounts);
        }
    }, [auth, accounts]);

    return {
        accounts, loading, refreshing, error, lastUpdated,
        setError, fetchQuotas, addAccount, deleteAccount
    };
}
