import { useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import DigitalIDCard from '../components/identity/DigitalIDCard';
import TrustScoreMeter from '../components/identity/TrustScoreMeter';
import GovCheckList from '../components/identity/GovCheckList';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

export default function Profile() {
  const { addToast } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('nav.profile')} — DJAGA`;
  }, [t]);

  return (
    <PageWrapper>
      <div className="py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-8" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('profile.title')}
        </h1>

        <div className="space-y-12">
          {/* Section 1 — Digital ID Card */}
          <section className="animate-fade-in-up">
            <h2
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'var(--accent)' }} />
              {t('profile.digitalId')}
            </h2>
            <DigitalIDCard
              onShare={() => addToast({ type: 'info', message: t('common.shareCopied') })}
              onDownload={() => addToast({ type: 'success', message: t('common.pdfDownloaded') })}
              onRefresh={() => addToast({ type: 'info', message: t('common.identityRefreshed') })}
            />
          </section>

          {/* Section 2 — Trust Score */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'var(--teal)' }} />
              {t('profile.trustScore')}
            </h2>
            <TrustScoreMeter />
          </section>

          {/* Section 3 — Government Verifications */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h2
              className="text-lg font-semibold mb-4 flex items-center gap-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              <span className="w-1.5 h-5 rounded-full" style={{ background: 'var(--safe)' }} />
              {t('profile.govCheck')}
            </h2>
            <GovCheckList />
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}
