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

// Simple 1x1 colored canvas as demo images
function createDemoImage(color, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, color);
  grad.addColorStop(1, '#1A1A28');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);
  // Face placeholder
  ctx.beginPath();
  ctx.arc(200, 170, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();
  // Body placeholder
  ctx.beginPath();
  ctx.ellipse(200, 340, 100, 60, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fill();
  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 200, 380);
  return canvas.toDataURL('image/png');
}

export default function ImageScan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [showLoading, setShowLoading] = useState(false);
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

  const handleDemoSelect = useCallback((verdict, label) => {
    const color = verdict === 'fake' ? '#3D1F1F' : verdict === 'real' ? '#1F3D2F' : '#1F2F3D';
    const dataUrl = createDemoImage(color, label);
    setPreview(dataUrl);
    setFileName(`demo_${verdict}.png`);
    setFile({ name: `demo_${verdict}.png`, type: 'image/png', size: 0 });
    setError('');
    sound.uploadSuccess();
  }, [sound]);

  const handleScan = useCallback((forceVerdict) => {
    haptics.scan();
    sound.scanStart();
    setShowLoading(true);
    startScan('image', { forceVerdict, fileName });
  }, [startScan, fileName, sound]);

  const handleLoadingComplete = useCallback((data) => {
    setShowLoading(false);
    if (data?.cancelled) {
      cancelScan();
      haptics.reset();
      sound.reset();
    } else {
      // Result will appear from the useScanner hook
      setTimeout(() => {
        if (result) {
          const threat = result.verdict === 'fake';
          if (threat) {
            haptics.threat();
            sound.resultThreat();
          } else {
            haptics.safe();
            sound.resultSafe();
          }
        }
      }, 300);
    }
  }, [cancelScan, result, sound]);

  // Play result sounds when result appears
  useEffect(() => {
    if (result && !showLoading) {
      const threat = result.verdict === 'fake';
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
    setFile(null);
    setPreview(null);
    setFileName('');
    haptics.reset();
    sound.reset();
  }, [resetScan, sound]);

  const handleDownloadReport = useCallback(() => {
    addToast({ type: 'success', message: 'Report downloaded successfully.' });
  }, [addToast]);

  const hasFile = !!preview;

  return (
    <PageWrapper>
      {/* Loading Screen */}
      {showLoading && (
        <AILoadingScreen
          type="image"
          fileName={fileName}
          onComplete={handleLoadingComplete}
        />
      )}

      <div className="py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('image.title')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('image.subtitle')}
        </p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column — Input */}
          <div className="flex-1">
            <UploadZone
              onFile={handleFile}
              onError={handleError}
              className="mb-4"
            />

            {/* Demo buttons */}
            <div className="mb-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {t('image.tryDemo')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Real Photo', verdict: 'real' },
                  { label: 'Deepfake', verdict: 'fake' },
                  { label: 'Group Photo', verdict: 'real' },
                ].map((demo) => (
                  <button
                    key={demo.label}
                    onClick={() => handleDemoSelect(demo.verdict, demo.label)}
                    className="px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-[1px] min-h-[44px]"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-light)',
                      cursor: 'pointer',
                    }}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,158,11,0.25)', color: '#FCD34D' }}>
                {error}
              </div>
            )}

            {/* Scan button */}
            {!result && (
              <ScanButton
                onClick={() => handleScan(file?.name?.includes('fake') ? 'fake' : file?.name?.includes('real') || file?.name?.includes('Group') ? 'real' : null)}
                loading={isScanning}
                disabled={!hasFile}
                label={t('image.scanBtn')}
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
