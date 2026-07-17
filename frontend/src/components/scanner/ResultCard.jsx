import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, RotateCcw, Network } from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';
import KeywordPills from './KeywordPills';
import ParticleBurst from './ParticleBurst';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { isThreat, getVerdictLabel, getVerdictEmoji } from '../../utils/formatters';

export default function ResultCard({ result, onReset, showTrace = true }) {
  const [showCard, setShowCard] = useState(false);
  const [showGauge, setShowGauge] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [flashColor, setFlashColor] = useState(null);

  const threat = isThreat(result.verdict);
  const color = threat ? 'var(--threat)' : 'var(--safe)';
  const verdictText = result.verdict === 'fake' ? 'FAKE' : result.verdict === 'scam' ? 'SCAM' : result.verdict === 'real' ? 'REAL' : 'SAFE';

  // Timed reveal sequence
  useEffect(() => {
    // Flash
    setFlashColor(threat ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)');
    const t1 = setTimeout(() => setFlashColor(null), 200);
    // Card
    const t2 = setTimeout(() => setShowCard(true), 200);
    // Gauge
    const t3 = setTimeout(() => setShowGauge(true), 400);
    // Highlights
    const t4 = setTimeout(() => setShowHighlights(true), 600);
    // Particles
    const t5 = setTimeout(() => setShowParticles(true), 800);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
    };
  }, [result, threat]);

  const highlights = result.highlights || result.matchedKeywords || [];
  const isTextScan = result.type === 'text';
  const isVoiceScan = result.type === 'voice';
  const isImageScan = result.type === 'image';
  const imageAnalysis = result.imageAnalysis;
  const voiceAnalysis = result.voiceAnalysis;
  const syntheticProbability = imageAnalysis?.syntheticProbability;
  const imageModelFlagsSynthetic = typeof syntheticProbability === 'number' && syntheticProbability >= 0.5;
  const statusLabel = isImageScan
    ? (imageModelFlagsSynthetic ? 'LIKELY SYNTHETIC IMAGE' : 'IMAGE MODEL: NO STRONG SYNTHETIC SIGNAL')
    : isVoiceScan
    ? (threat ? 'POTENTIAL VOICE SCAM' : 'NO STRONG VOICE SCAM SIGNAL')
    : threat ? 'DEEPFAKE DETECTED' : isTextScan ? (result.verdict === 'scam' ? 'SCAM DETECTED' : 'MESSAGE SAFE') : 'AUTHENTIC IMAGE';
  const imageHeadline = imageModelFlagsSynthetic ? 'SYNTHETIC RISK' : 'NO STRONG AI SIGNAL';

  return (
    <div className="relative">
      {/* Screen flash */}
      {flashColor && (
        <div
          className="fixed inset-0 z-[50] pointer-events-none"
          style={{
            background: flashColor,
            animation: 'screenFlash 0.3s ease forwards',
          }}
        />
      )}

      {/* Particle burst */}
      <ParticleBurst type={threat ? 'threat' : 'safe'} trigger={showParticles} />

      {/* Result card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          opacity: showCard ? 1 : 0,
          transform: showCard ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          border: `1px solid ${threat ? 'var(--threat-border)' : 'var(--safe-border)'}`,
          background: threat ? 'var(--threat-dim)' : 'var(--safe-dim)',
          boxShadow: `0 0 60px ${threat ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'}`,
        }}
      >
        {/* Top badge bar */}
        <div
          className="px-5 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
          style={{
            background: threat ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
            color: threat ? '#FCA5A5' : '#86EFAC',
            fontFamily: 'var(--font-display)',
            borderRadius: '16px 16px 0 0',
          }}
        >
          {getVerdictEmoji(result.verdict)} {statusLabel}
        </div>

        <div className="p-6">
          {/* Verdict text */}
          <div className="text-center mb-6">
            <h2
              className="text-5xl font-extrabold mb-1"
              style={{
                fontFamily: 'var(--font-display)',
                color: threat ? '#EF4444' : '#22C55E',
                letterSpacing: '-1px',
              }}
            >
              {isImageScan ? imageHeadline : isVoiceScan ? (threat ? 'SCAM RISK' : 'SAFE') : verdictText}
            </h2>
          </div>

          {/* Confidence gauge */}
          {showGauge && (
            <div className="flex justify-center mb-6">
              <ConfidenceGauge
                value={result.confidence}
                color={color}
                size={140}
                label={isImageScan ? 'Overall investigation risk' : ''}
              />
            </div>
          )}

          {isVoiceScan && (voiceAnalysis?.summary || voiceAnalysis?.transcript) && (
            <div className="mb-5 rounded-xl px-4 py-4" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <h4 className="text-xs uppercase tracking-wider" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '1.2px' }}>What this voice note is about</h4>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {voiceAnalysis.summary || 'DJAGA transcribed the following message from the voice note.'}
              </p>
              {voiceAnalysis.transcript && (
                <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-tertiary)' }}>Transcript: </span>
                  {voiceAnalysis.transcript}
                </p>
              )}
            </div>
          )}

          {/* Scam type badge (text scans) */}
          {isTextScan && result.scamType && (
            <div className="flex justify-center mb-4">
              <Badge type="warning">{result.scamType}</Badge>
            </div>
          )}

          {/* Keywords (text scans) */}
          {isTextScan && result.matchedKeywords && result.matchedKeywords.length > 0 && showHighlights && (
            <div className="mb-5">
              <h4
                className="text-xs uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '1.5px' }}
              >
                Suspicious patterns found:
              </h4>
              <KeywordPills keywords={result.matchedKeywords} type="threat" />
            </div>
          )}

          {/* Highlights (image/voice scans) */}
          {!isTextScan && highlights.length > 0 && showHighlights && (
            <div className="mb-5">
              <h4
                className="text-xs uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '1.5px' }}
              >
                {isVoiceScan ? 'What DJAGA found in the voice:' : 'What the AI detected:'}
              </h4>
              <div className="space-y-2">
                {highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-sm"
                    style={{
                      color: 'var(--text-secondary)',
                      opacity: showHighlights ? 1 : 0,
                      transform: showHighlights ? 'translateX(0)' : 'translateX(10px)',
                      transition: `all 0.3s ease ${i * 80}ms`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: threat ? 'var(--threat)' : 'var(--safe)' }}
                    />
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning box */}
          <div
            className="rounded-xl p-4 mb-5"
            style={{
              background: threat ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
              borderLeft: `3px solid ${threat ? 'var(--threat)' : 'var(--safe)'}`,
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} style={{ color: threat ? 'var(--warning)' : 'var(--safe)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {threat
                    ? (isVoiceScan ? 'Pause the conversation. Do not transfer money or share verification codes.' : isTextScan ? 'Do not transfer money. Contact PDRM at 999.' : imageModelFlagsSynthetic ? 'Treat this image as potentially AI-generated or manipulated.' : 'The overall investigation found risk, but the image model did not independently label it as synthetic.')
                    : (isVoiceScan ? 'No strong scam signal was found in this voice note.' : isTextScan ? 'This message appears to be safe.' : 'The image model found no strong AI-generation signal.')
                  }
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {threat
                    ? (isVoiceScan ? 'Verify the caller through an independently found number before taking any action.' : isTextScan ? 'Do not transfer money. Report to PDRM at 999.' : 'Review the model probability and cited contextual evidence before you rely on this media.')
                    : (isVoiceScan ? 'Review the cited evidence and remain cautious if the caller adds pressure later.' : isTextScan ? 'This message appears to be safe.' : 'No classifier can prove authenticity; verify the original source when the stakes are high.')
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div>
            <Button variant="ghost" size="md" onClick={onReset} className="w-full">
              <RotateCcw size={16} />
              Scan Again
            </Button>
          </div>
          {showTrace && result.traceUrl && <a href={result.traceUrl} className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium" style={{ color: 'var(--accent)', border: '1px solid var(--accent-border)' }}><Network size={16} /> View investigation trace</a>}
        </div>
      </div>
    </div>
  );
}
