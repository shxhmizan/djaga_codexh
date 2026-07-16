import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CURRENT_USER } from '../data/dummyUsers';
import { SCAN_HISTORY } from '../data/dummyScans';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState(SCAN_HISTORY);
  const [toasts, setToasts] = useState([]);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem('djaga_mute') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const restore = async () => {
      try {
        const current = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json());
        if (current.user) { setUser(current.user); return; }
      } finally { setAuthLoading(false); }
    };
    restore();
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
      authLoading,
      setUser,
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
