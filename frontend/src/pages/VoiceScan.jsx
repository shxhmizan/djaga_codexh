import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioLines, Mic, Upload, Shield, Square } from 'lucide-react';
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
  const [audioFile, setAudioFile] = useState(null);
  const [waveformBars, setWaveformBars] = useState(Array(20).fill(20));
  const { isScanning, result, startScan, cancelScan, resetScan } = useScanner();
  const { addToast } = useApp();
  const { t } = useTranslation();
  const sound = useSound();
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const uploadRef = useRef(null);

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

  const handleRecord = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : undefined;
      const recorder = new MediaRecorder(stream, supported ? { mimeType: supported } : undefined);
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : 'webm';
        const file = new File(chunks, `voice-note.${extension}`, { type });
        setAudioFile(file); setHasRecording(file.size > 0); setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder; streamRef.current = stream;
      setRecordingTime(0); setHasRecording(false); setAudioFile(null); recorder.start(1000); setIsRecording(true);
    } catch {
      addToast({ type: 'warning', message: 'Microphone permission is required to record a voice note.' });
    }
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { addToast({ type: 'warning', message: 'Choose an audio file (M4A, MP3, WAV, WebM, or OGG).' }); return; }
    setAudioFile(file); setHasUpload(true); setHasRecording(false); sound.uploadSuccess();
  };

  const handleScan = useCallback(() => {
    haptics.scan();
    sound.scanStart();
    startScan('voice', { file: audioFile, fileName: audioFile?.name });
  }, [startScan, audioFile, sound]);

  useEffect(() => {
    if (result && !isScanning) {
      const threat = result.riskLevel === 'danger';
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
    setHasRecording(false);
    setHasUpload(false);
    setAudioFile(null);
    setIsRecording(false);
    setRecordingTime(0);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    haptics.reset();
    sound.reset();
  }, [resetScan, sound]);

  const canScan = hasRecording || hasUpload;

  return (
    <PageWrapper>
      {isScanning && (
        <AILoadingScreen
          type="voice"
          fileName={audioFile?.name}
          onComplete={(data) => { if (data?.cancelled) cancelScan(); }}
        />
      )}

      <div className="py-6 lg:py-8 max-w-2xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
          {t('voice.title')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          {t('voice.subtitle')}
        </p>

        {!result && <div className="mb-6 rounded-2xl p-4 flex gap-3" style={{background:'var(--accent-dim)',border:'1px solid var(--accent-border)'}}><AudioLines size={21} style={{color:'var(--accent)',flexShrink:0,marginTop:2}}/><p className="text-sm leading-relaxed" style={{color:'var(--text-secondary)'}}><strong style={{color:'var(--text-primary)'}}>What DJAGA checks:</strong> spoken scam pressure and impersonation, known scam records, live public reports, and synthetic-voice signals. A voice result is evidence-based—not a single deepfake score.</p></div>}

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg-secondary)' }}>
          {[
            { id: 'record', label: t('voice.recordLive'), icon: Mic },
            { id: 'upload', label: t('voice.uploadAudio'), icon: Upload },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setHasRecording(false); setHasUpload(false); setAudioFile(null); }}
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
          <>
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl cursor-pointer"
            style={{
              border: '2px dashed var(--accent-border)',
              background: 'rgba(108,99,255,0.03)',
            }}
            onClick={() => uploadRef.current?.click()}
          >
            <Upload size={32} style={{ color: 'var(--accent)', opacity: 0.6 }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {hasUpload ? `${t('voice.audioLoaded')} ${audioFile?.name || ''}` : t('voice.clickUpload')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              MP3, WAV, M4A
            </p>
          </div>
          <input ref={uploadRef} type="file" accept="audio/mp4,audio/x-m4a,audio/mpeg,audio/wav,audio/x-wav,audio/webm,audio/ogg" className="hidden" onChange={handleUpload} />
          </>
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
        {result && !isScanning && (
          <div className="mt-8">
            <ResultCard
              result={result}
              onReset={handleReset}
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
