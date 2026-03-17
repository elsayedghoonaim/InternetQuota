import { useState, useEffect, useCallback } from 'react';

/**
 * Auth hook — manages login state and localStorage persistence.
 */
export function useAuth() {
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const savedAuth = localStorage.getItem('quota_auth');
        if (savedAuth) {
            try {
                setAuth(JSON.parse(savedAuth));
            } catch {
                localStorage.removeItem('quota_auth');
            }
        }
    }, []);

    const login = useCallback((creds) => {
        setAuth(creds);
        localStorage.setItem('quota_auth', JSON.stringify(creds));
    }, []);

    const logout = useCallback(() => {
        setAuth(null);
        localStorage.removeItem('quota_auth');
    }, []);

    return { auth, login, logout };
}
