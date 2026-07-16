import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Volume2, VolumeX, Home, Newspaper, Map, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

const NAV_KEYS = [
  { path: '/feed', labelKey: 'nav.feed', icon: Newspaper },
  { path: '/', labelKey: 'nav.home', icon: Home },
  { path: '/map', labelKey: 'nav.intelMap', icon: Map },
  { path: '/profile', labelKey: 'nav.profile', icon: User },
];

export default function Navbar() {
  const location = useLocation();
  const { isMuted, toggleMute } = useApp();
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* ═══════════════════════════════════════════════
          DESKTOP TOP BAR — visible ≥ 768px
         ═══════════════════════════════════════════════ */}
      <nav
        className="hidden md:block fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{
          background: scrolled ? 'var(--glass-bg)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        <div className="flex items-center justify-between px-8 h-16 max-w-[1440px] mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
            >
              <Shield size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              DJAGA
            </span>
          </Link>

          {/* Center nav links */}
          <div className="flex items-center gap-1">
            {NAV_KEYS.map(link => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium no-underline transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                  }}
                >
                  <Icon size={16} style={{ opacity: isActive ? 1 : 0.6 }} />
                  {t(link.labelKey)}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {isMuted
                ? <VolumeX size={18} style={{ color: 'var(--text-tertiary)' }} />
                : <Volume2 size={18} style={{ color: 'var(--text-secondary)' }} />
              }
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════
          MOBILE TOP HEADER — visible < 768px
          Slim bar with logo + controls only
         ═══════════════════════════════════════════════ */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-[100] transition-all duration-300"
        style={{
          background: scrolled ? 'var(--glass-bg)' : 'var(--bg-primary)',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between px-4 h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
            >
              <Shield size={13} style={{ color: 'var(--accent)' }} />
            </div>
            <span
              className="text-base font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              DJAGA
            </span>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-md"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {isMuted
                ? <VolumeX size={16} style={{ color: 'var(--text-tertiary)' }} />
                : <Volume2 size={16} style={{ color: 'var(--text-secondary)' }} />
              }
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR — visible < 768px
          4 tabs with icon + label, active glow
         ═══════════════════════════════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100]"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {NAV_KEYS.map(link => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 no-underline transition-all duration-200"
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
              >
                <div
                  className="relative flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-300"
                  style={{
                    background: isActive ? 'var(--accent-dim)' : 'transparent',
                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{
                      transition: 'all 0.3s ease',
                      filter: isActive ? 'drop-shadow(0 0 6px var(--accent))' : 'none',
                    }}
                  />
                  {isActive && (
                    <span
                      className="absolute -top-0.5 right-1 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: 'var(--accent)',
                        boxShadow: '0 0 6px var(--accent)',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] font-medium transition-all duration-200"
                  style={{
                    opacity: isActive ? 1 : 0.6,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? '0.3px' : '0',
                  }}
                >
                  {t(link.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
