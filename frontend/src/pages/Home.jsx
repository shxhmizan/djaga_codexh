import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Image, MessageSquare, Mic, ArrowRight, X, AlertTriangle, Shield, TrendingUp, Users } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTranslation } from '../hooks/useTranslation';
import { SCAM_FEED } from '../data/dummyScamFeed';

const ROTATE_KEYS = ['home.rotate.1', 'home.rotate.2', 'home.rotate.3', 'home.rotate.4'];

function RotatingText({ t }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animState, setAnimState] = useState('in');

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimState('out');
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % ROTATE_KEYS.length);
        setAnimState('in');
      }, 500);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        display: 'inline-block',
        animation: animState === 'in' ? 'heroTextIn 0.5s cubic-bezier(0.4,0,0.2,1) both' : 'heroTextOut 0.4s cubic-bezier(0.4,0,0.2,1) both',
        background: 'linear-gradient(135deg, var(--accent) 0%, #0DCCB1 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      key={`${currentIndex}-${t(ROTATE_KEYS[currentIndex])}`}
    >
      {t(ROTATE_KEYS[currentIndex])}
    </span>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [showAlert, setShowAlert] = useState(true);
  const [animatedStats, setAnimatedStats] = useState(false);

  const quickActions = [
    { path: '/image', titleKey: 'home.action.image.title', descKey: 'home.action.image.desc', icon: Image, accent: '#6C63FF', accentDim: 'rgba(108,99,255,0.12)' },
    { path: '/text', titleKey: 'home.action.text.title', descKey: 'home.action.text.desc', icon: MessageSquare, accent: '#0DCCB1', accentDim: 'rgba(13,204,177,0.12)' },
    { path: '/voice', titleKey: 'home.action.voice.title', descKey: 'home.action.voice.desc', icon: Mic, accent: '#F59E0B', accentDim: 'rgba(245,158,11,0.12)' },
  ];

  const stats = [
    { label: t('home.lostToScams'), value: 'RM 1.2B+', icon: TrendingUp },
    { label: t('home.affected'), value: '30M+', icon: Users },
    { label: t('home.detection'), value: t('home.realtimeAi'), icon: Shield },
  ];

  useEffect(() => {
    document.title = t('home.title');
    const timer = setTimeout(() => setAnimatedStats(true), 500);
    return () => clearTimeout(timer);
  }, [t]);

  const criticalAlerts = SCAM_FEED.filter(a => a.severity === 'critical').length;

  return (
    <PageWrapper>
      {/* Live scam alert banner */}
      {showAlert && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-6 animate-fade-in-up"
          style={{
            background: 'var(--threat-dim)',
            border: '1px solid var(--threat-border)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: 'var(--threat)' }} />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              ⚠️ {criticalAlerts} {t('home.alert')}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/feed">
              <Button variant="ghost" size="sm">{t('home.viewAlerts')}</Button>
            </Link>
            <button
              onClick={() => setShowAlert(false)}
              className="p-1.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={16} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="py-12 lg:py-20 text-center stagger-children">
        <h1
          className="text-4xl lg:text-5xl font-extrabold mb-5 leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '-2px',
            lineHeight: 1.1,
            minHeight: '160px',
          }}
        >
          <RotatingText t={t} />
          <br />
          <span className="gradient-text">{t('home.stopScams')}</span>
          <br />
          <span className="gradient-text">{t('home.protectMalaysia')}</span>
        </h1>

        <p
          className="text-base lg:text-lg mb-8 max-w-xl mx-auto"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
        >
          {t('home.subtitle')}
        </p>

        {/* Stats ticker */}
        <div className="flex flex-row items-start justify-between gap-2 sm:gap-10 mt-10 max-w-xl mx-auto">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 text-center flex-1"
              style={{
                opacity: animatedStats ? 1 : 0,
                transform: animatedStats ? 'translateY(0)' : 'translateY(10px)',
                transition: `all 0.5s ease ${i * 0.1}s`,
              }}
            >
              <stat.icon size={16} style={{ color: 'var(--accent)' }} />
              <div>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </span>
                <span className="block text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Action Cards */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.path} className="no-underline">
              <Card className="group" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105"
                    style={{ background: action.accentDim }}
                  >
                    <action.icon size={22} style={{ color: action.accent }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                      {t(action.titleKey)}
                    </h3>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                      {t(action.descKey)}
                    </p>
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium transition-all duration-200 group-hover:gap-2"
                      style={{ color: action.accent }}
                    >
                      {t('home.scanNow')} <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

    </PageWrapper>
  );
}
