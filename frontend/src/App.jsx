import { useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import SplashScreen from './components/layout/SplashScreen';
import Toast from './components/ui/Toast';
import Home from './pages/Home';
import ImageScan from './pages/ImageScan';
import ScamCheck from './pages/ScamCheck';
import VoiceScan from './pages/VoiceScan';
import Profile from './pages/Profile';
import Feed from './pages/Feed';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Trace from './pages/Trace';
import OsintDashboard from './pages/OsintDashboard';
import NotFound from './pages/NotFound';
import { useApp } from './context/AppContext';

function App() {
  const { toasts, removeToast, user, authLoading } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (authLoading) return <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen app-shell" style={{ background: 'var(--bg-primary)' }}>
      <div className="ambient-scene" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="radar-field"><span className="radar-sweep" /><span className="radar-core" /></div>
        <span className="signal signal-a" /><span className="signal signal-b" /><span className="signal signal-c" />
      </div>
      <Navbar />
      <main className="relative z-10 pt-12 pb-20 md:pt-16 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/image" element={<ImageScan />} />
          <Route path="/text" element={<Navigate to="/scam-check" replace />} />
          <Route path="/scam-check" element={<ScamCheck />} />
          <Route path="/voice" element={<VoiceScan />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/map" element={<Navigate to="/feed" replace />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/osint" element={<OsintDashboard />} />
          <Route path="/agent" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
