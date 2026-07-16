import { useState, useEffect, useCallback } from 'react';
import { Shield } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import UploadZone from '../components/scanner/UploadZone';
import ScanButton from '../components/scanner/ScanButton';
import AILoadingScreen from '../components/scanner/AILoadingScreen';
import ResultCard from '../components/scanner/ResultCard';
import { useScanner } from '../hooks/useScanner';
import { useSound } from '../hooks/useSound';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { haptics } from '../utils/haptics';

export default function ImageScan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const { isScanning, result, startScan, cancelScan, resetScan } = useScanner();
  const { addToast } = useApp();
  const { t } = useTranslation();
  const sound = useSound();

  useEffect(() => {
    document.title = `${t('image.title')} — DJAGA`;
  }, []);

  const handleFile = useCallback((f, dataUrl) => {
    if (f) {
      setFile(f);
      setPreview(dataUrl);
      setFileName(f.name);
      setError('');
      sound.uploadSuccess();
    } else {
      setFile(null);
      setPreview(null);
      setFileName('');
    }
  }, [sound]);

  const handleError = useCallback((msg) => {
    setError(msg);
    addToast({ type: 'warning', message: msg });
  }, [addToast]);

  const handleScan = useCallback(() => {
    haptics.scan();
    sound.scanStart();
    startScan('image', { file, fileName });
  }, [startScan, file, fileName, sound]);

  // Play result sounds when result appears
  useEffect(() => {
    if (result && !isScanning) {
      const threat = result.verdict === 'fake';
      if (threat) {
        haptics.threat();
        sound.resultThreat();
      } else {
        haptics.safe();
        sound.resultSafe();
      }
    }
  }, [result, isScanning, sound]);

  const handleReset = useCallback(() => {
    resetScan();
    setFile(null);
    setPreview(null);
    setFileName('');
    haptics.reset();
    sound.reset();
  }, [resetScan, sound]);

  const hasFile = !!preview;

  return (
    <PageWrapper>
      {/* Loading Screen */}
      {isScanning && (
        <AILoadingScreen
          type="image"
          fileName={fileName}
          onComplete={(data) => { if (data?.cancelled) cancelScan(); }}
        />
      )}

      <div className="py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('image.title')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('image.subtitle')}
        </p>

        <div className="mb-6 rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
          <div className="mt-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
          <div><p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI image detection</p><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>DJAGA runs a local authenticity classifier on the uploaded pixels and returns its real/fake confidence with traceable evidence.</p></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Input */}
          <div className="flex-1">
            <UploadZone
              onFile={handleFile}
              onError={handleError}
              className="mb-4"
            />

            {/* Error display */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                {error}
              </div>
            )}

            {/* Scan button */}
            {!result && (
              <ScanButton
                onClick={handleScan}
                loading={isScanning}
                disabled={!hasFile}
                label={t('image.scanBtn')}
              />
            )}
          </div>

          {/* Right column — Result */}
          <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
            {result && !isScanning ? (
              <ResultCard
                result={result}
                onReset={handleReset}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 lg:py-32">
                <Shield size={80} style={{ color: 'var(--text-tertiary)', opacity: 0.15 }} />
                <p className="mt-4 text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {t('image.uploadHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
