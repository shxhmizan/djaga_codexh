import { useState, useEffect, useCallback } from 'react';
import { Mic, Upload, Shield, Square } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import ScanButton from '../components/scanner/ScanButton';
import AILoadingScreen from '../components/scanner/AILoadingScreen';
import ResultCard from '../components/scanner/ResultCard';
import Button from '../components/ui/Button';
import { useScanner } from '../hooks/useScanner';
import { useSound } from '../hooks/useSound';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import { haptics } from '../utils/haptics';

export default function VoiceScan() {
  const [activeTab, setActiveTab] = useState('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [hasUpload, setHasUpload] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [forceVerdict, setForceVerdict] = useState(null);
  const [waveformBars, setWaveformBars] = useState(Array(20).fill(20));
  const { isScanning, result, startScan, cancelScan, resetScan } = useScanner();
  const { addToast } = useApp();
  const { t } = useTranslation();
  const sound = useSound();

  useEffect(() => {
    document.title = `${t('voice.title')} — DJAGA`;
  }, []);

  // Simulate recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setWaveformBars(Array(20).fill(0).map(() => 10 + Math.random() * 90));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Animate waveform while recording
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveformBars(Array(20).fill(0).map(() => 10 + Math.random() * 90));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setHasRecording(false);
    }
  };

  const handleDemoSelect = useCallback((verdict) => {
    setForceVerdict(verdict);
    setHasRecording(true);
    setIsRecording(false);
    sound.uploadSuccess();
  }, [sound]);

  const handleScan = useCallback(() => {
    haptics.scan();
    sound.scanStart();
    setShowLoading(true);
    startScan('voice', { forceVerdict: forceVerdict || 'real', fileName: 'voice_recording.m4a' });
  }, [startScan, forceVerdict, sound]);

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
    setHasRecording(false);
    setHasUpload(false);
    setIsRecording(false);
    setRecordingTime(0);
    setForceVerdict(null);
    haptics.reset();
    sound.reset();
  }, [resetScan, sound]);

  const handleDownloadReport = useCallback(() => {
    addToast({ type: 'success', message: 'Report downloaded successfully.' });
  }, [addToast]);

  const canScan = hasRecording || hasUpload;

  return (
    <PageWrapper>
      {showLoading && (
        <AILoadingScreen
          type="voice"
          onComplete={handleLoadingComplete}
        />
      )}

      <div className="py-6 lg:py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('voice.title')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('voice.subtitle')}
        </p>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-secondary)' }}>
          {[
            { id: 'record', label: t('voice.recordLive'), icon: Mic },
            { id: 'upload', label: t('voice.uploadAudio'), icon: Upload },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setHasRecording(false); setHasUpload(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px]"
              style={{
                background: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Record Tab */}
        {activeTab === 'record' && !result && (
          <div className="flex flex-col items-center py-8">
            {/* Record button */}
            <button
              onClick={handleRecord}
              className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 min-w-[80px] min-h-[80px]"
              style={{
                background: isRecording ? 'var(--threat)' : 'var(--accent)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: isRecording ? '0 0 0 8px rgba(239,68,68,0.2)' : '0 0 0 0px transparent',
              }}
            >
              {isRecording ? <Square size={28} color="white" /> : <Mic size={28} color="white" />}
              {isRecording && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: '3px solid var(--threat)',
                    animation: 'pulse 1s infinite',
                  }}
                />
              )}
            </button>

            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isRecording ? `${t('voice.recording')} ${formatTime(recordingTime)}` : hasRecording ? t('voice.recordReady') : t('voice.tapRecord')}
            </p>

            {/* Waveform visualization */}
            {(isRecording || hasRecording) && (
              <div className="flex items-end gap-1 h-16 mt-6">
                {waveformBars.map((height, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 4,
                      height: `${isRecording ? height : 30 + Math.sin(i * 0.5) * 20}%`,
                      background: isRecording ? 'var(--threat)' : 'var(--accent)',
                      opacity: 0.5 + (height / 200),
                      minHeight: 4,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && !result && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl cursor-pointer"
            style={{
              border: '2px dashed var(--accent-border)',
              background: 'rgba(108,99,255,0.03)',
            }}
            onClick={() => { setHasUpload(true); sound.uploadSuccess(); }}
          >
            <Upload size={32} style={{ color: 'var(--accent)', opacity: 0.6 }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {hasUpload ? t('voice.audioLoaded') : t('voice.clickUpload')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              MP3, WAV, M4A
            </p>
          </div>
        )}

        {/* Demo buttons */}
        {!result && (
          <div className="mt-6 mb-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {t('voice.tryDemo')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDemoSelect('real')}
                className="px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-[1px] min-h-[44px]"
                style={{ background: 'transparent', border: '1px solid var(--safe-border)', color: '#86EFAC', cursor: 'pointer' }}
              >
                {t('voice.realVoice')}
              </button>
              <button
                onClick={() => handleDemoSelect('fake')}
                className="px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:-translate-y-[1px] min-h-[44px]"
                style={{ background: 'transparent', border: '1px solid var(--threat-border)', color: '#FCA5A5', cursor: 'pointer' }}
              >
                {t('voice.aiVoice')}
              </button>
            </div>
          </div>
        )}

        {/* Scan button */}
        {!result && (
          <div className="mt-4">
            <ScanButton
              onClick={handleScan}
              loading={isScanning}
              disabled={!canScan}
              label={t('voice.analyseBtn')}
            />
          </div>
        )}

        {/* Result */}
        {result && !showLoading && (
          <div className="mt-8">
            <ResultCard
              result={result}
              onReset={handleReset}
              onDownloadReport={handleDownloadReport}
            />
          </div>
        )}

        {/* Idle state */}
        {!result && !isRecording && !hasRecording && !hasUpload && activeTab === 'record' && (
          <div className="flex flex-col items-center py-8">
            <Shield size={64} style={{ color: 'var(--text-tertiary)', opacity: 0.15 }} />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
