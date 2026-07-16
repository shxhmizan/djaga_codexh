import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import TextInput from '../components/scanner/TextInput';
import ScanButton from '../components/scanner/ScanButton';
import AILoadingScreen from '../components/scanner/AILoadingScreen';
import ResultCard from '../components/scanner/ResultCard';
import { useScanner } from '../hooks/useScanner';
import { useSound } from '../hooks/useSound';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { haptics } from '../utils/haptics';

const DEMO_TEXTS = [
  {
    label: 'Macau Scam',
    verdict: 'scam',
    color: 'var(--threat)',
    text: "Ini panggilan daripada PDRM. Akaun bank anda telah digantung kerana terlibat dalam kes pengubahan wang haram. Sila transfer RM3,000 kepada akaun ini untuk proses siasatan: 7123456789 (Maybank). Jangan beritahu sesiapa.",
  },
  {
    label: 'Lucky Draw',
    verdict: 'scam',
    color: 'var(--warning)',
    text: "Tahniah! Nombor telefon anda telah dipilih untuk memenangi RM10,000 tunai daripada peraduan Maxis. Klik pautan ini untuk tuntut hadiah anda sekarang: bit.ly/maxis-prize2025",
  },
  {
    label: 'Family Impersonation',
    verdict: 'scam',
    color: 'var(--accent)',
    text: "Mama, ini Hafiz. Saya dalam masalah besar sekarang. Saya kena tangkap polis sebab kemalangan. Tolong transfer RM5,000 ke akaun 1234567890 (CIMB). Jangan cerita kat abah dulu.",
  },
];

export default function TextScan() {
  const [text, setText] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [forceVerdict, setForceVerdict] = useState(null);
  const { isScanning, result, startScan, cancelScan, resetScan } = useScanner();
  const { addToast } = useApp();
  const { t } = useTranslation();
  const sound = useSound();

  useEffect(() => {
    document.title = `${t('text.title')} — DJAGA`;
  }, []);

  const handleDemoSelect = useCallback((demo) => {
    setText(demo.text);
    setForceVerdict(demo.verdict);
    sound.uploadSuccess();
  }, [sound]);

  const handleScan = useCallback(() => {
    haptics.scan();
    sound.scanStart();
    setShowLoading(true);
    startScan('text', { forceVerdict: forceVerdict || 'scam', text });
  }, [startScan, text, forceVerdict, sound]);

  const handleLoadingComplete = useCallback((data) => {
    setShowLoading(false);
    if (data?.cancelled) {
      cancelScan();
      haptics.reset();
      sound.reset();
    }
  }, [cancelScan, sound]);

  useEffect(() => {
    if (result && !showLoading) {
      const threat = result.verdict === 'scam';
      if (threat) {
        haptics.threat();
        sound.resultThreat();
      } else {
        haptics.safe();
        sound.resultSafe();
      }
    }
  }, [result, showLoading, sound]);

  const handleReset = useCallback(() => {
    resetScan();
    setText('');
    setForceVerdict(null);
    haptics.reset();
    sound.reset();
  }, [resetScan, sound]);

  const handleDownloadReport = useCallback(() => {
    addToast({ type: 'success', message: 'Report downloaded successfully.' });
  }, [addToast]);

  return (
    <PageWrapper>
      {showLoading && (
        <AILoadingScreen
          type="text"
          text={text}
          onComplete={handleLoadingComplete}
        />
      )}

      <div className="py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('text.title')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('text.subtitle')}
        </p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Input */}
          <div className="flex-1">
            <TextInput
              value={text}
              onChange={(val) => { setText(val); setForceVerdict(null); }}
              maxLength={1000}
            />

            {/* Demo buttons */}
            <div className="my-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {t('text.tryDemo')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {DEMO_TEXTS.map((demo) => (
                  <button
                    key={demo.label}
                    onClick={() => handleDemoSelect(demo)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-[1px] min-h-[44px]"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-light)',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: demo.color }} />
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan button */}
            {!result && (
              <ScanButton
                onClick={handleScan}
                loading={isScanning}
                disabled={!text.trim()}
                label={t('text.scanBtn')}
              />
            )}
          </div>

          {/* Right column — Result */}
          <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
            {result && !showLoading ? (
              <ResultCard
                result={result}
                onReset={handleReset}
                onDownloadReport={handleDownloadReport}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 lg:py-32">
                <Shield size={80} style={{ color: 'var(--text-tertiary)', opacity: 0.15 }} />
                <p className="mt-4 text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {t('text.pasteHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
