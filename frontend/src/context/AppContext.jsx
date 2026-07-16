import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CURRENT_USER } from '../data/dummyUsers';
import { SCAN_HISTORY } from '../data/dummyScans';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(CURRENT_USER);
  const [scanHistory, setScanHistory] = useState(SCAN_HISTORY);
  const [toasts, setToasts] = useState([]);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('djaga_mute') === 'true';
    } catch {
      return false;
    }
  });

  // The supplied UI has no sign-in screen. Establish its clearly simulated demo
  // identity once so every protected backend endpoint is exercised in local mode.
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(async ({ user: existing }) => {
        if (existing) return setUser(existing);
        const response = await fetch('/api/auth/mydigitalid', { method: 'POST', credentials: 'include' });
        if (response.ok) setUser((await response.json()).user);
      }).catch(() => {});
  }, []);

  // Theme: 'dark' or 'light'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('djaga_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('djaga_theme', next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  // Apply theme class to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // English-only product mode. Locale data remains available for future expansion.
  const language = 'en';
  const toggleLanguage = useCallback(() => {}, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('djaga_mute', String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts(prev => [...prev.slice(-2), newToast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addScan = useCallback((scan) => {
    setScanHistory(prev => [scan, ...prev]);
  }, []);

  return (
    <AppContext.Provider value={{
      user,
      scanHistory,
      addScan,
      toasts,
      addToast,
      removeToast,
      isMuted,
      toggleMute,
      theme,
      toggleTheme,
      language,
      toggleLanguage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
