import { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import ScamFeed from '../components/feed/ScamFeed';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';
import ScamHeatmap from '../components/map/ScamHeatmap';

export default function Feed() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('macau_scam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPhone, setReportPhone] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [occurredWhen, setOccurredWhen] = useState('today');
  const [consentPublic, setConsentPublic] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [reportError, setReportError] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const { addToast } = useApp();
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t('feed.title')} — DJAGA`;
  }, [t]);

  const loadFeed = useCallback(() => {
    fetch('/api/feed', { credentials: 'include' })
      .then(response => response.json())
      .then(items => setLiveAlerts(items.map((item, index) => ({
        id: `${item.region}-${index}`, title: item.title, description: item.summary,
        area: item.region, source: item.source_name, type: item.scam_type.toLowerCase().replaceAll(' ', '_'),
        severity: item.scam_type.toLowerCase().includes('cloned') ? 'critical' : 'high',
        reportCount: item.scam_type.toLowerCase().includes('cloned') ? 12 : 7,
        verified: false, date: item.date,
      })))).catch(() => setLiveAlerts([]));
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed, feedRefreshKey]);

  const filteredAlerts = liveAlerts;

  const resetReport = () => {
    setShowReportModal(false); setReportDescription(''); setReportPhone(''); setReportLocation('');
    setOccurredWhen('today'); setConsentPublic(false); setAnalysis(null); setReportError('');
  };

  const handleAnalyzeReport = async () => {
    setReportError(''); setAnalysing(true);
    try {
      const response = await fetch('/api/reports/analyze', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: reportDescription, submitted_type: reportType === 'unsure' ? null : reportType, phone_link: reportPhone }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to analyse this report.');
      setAnalysis(result);
    } catch (error) { setReportError(error.message); } finally { setAnalysing(false); }
  };

  const handleSubmitReport = async () => {
    if (!analysis) return handleAnalyzeReport();
    setReportError(''); setSubmitting(true);
    try {
      const response = await fetch('/api/reports', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: reportDescription, submitted_type: reportType === 'unsure' ? null : reportType, phone_link: reportPhone, location: reportLocation, occurred_when: occurredWhen, consent_public: consentPublic }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Unable to submit this report.');
      loadFeed(); setFeedRefreshKey(key => key + 1); resetReport();
      addToast({ type: 'success', title: 'Report saved', message: result.published ? 'Added to the community intelligence feed as unverified.' : 'Saved privately to your account.' });
    } catch (error) { setReportError(error.message); } finally { setSubmitting(false); }
  };

  return (
    <PageWrapper>
      <div className="py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
            {t('feed.title')}
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--safe)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {t('feed.updated')}
            </span>
          </div>
        </div>

        {/* Unified intelligence map — the former standalone Intel Map now lives with its alerts. */}
        <section className="mb-8">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Live intelligence map</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Explore locations, signals, and emerging scam patterns alongside the live feed.</p>
            </div>
          </div>
          <ScamHeatmap refreshKey={feedRefreshKey} />
        </section>

        {/* Feed */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Latest alerts</h2>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{filteredAlerts.length} reports</span>
        </div>
        <ScamFeed alerts={filteredAlerts} />

        {/* Report button */}
        <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50">
          <button
            onClick={() => { setShowReportModal(true); setReportError(''); }}
            className="flex items-center gap-2 px-5 py-3 rounded-full font-medium text-sm shadow-lg transition-all duration-200 hover:-translate-y-[1px] min-h-[48px]"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(108,99,255,0.4)',
            }}
          >
            <Plus size={18} />
            {t('feed.reportScam')}
          </button>
        </div>

        {/* Report Modal */}
        <Modal isOpen={showReportModal} onClose={resetReport} title={t('feed.reportTitle')}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                {t('feed.scamType')}
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full h-12 px-4 rounded-lg text-sm"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                }}
              >
                <option value="unsure">I'm not sure — let DJAGA classify it</option>
                <option value="macau_scam">Macau Scam</option>
                <option value="phishing">Phishing</option>
                <option value="deepfake">Deepfake</option>
                <option value="investment_scam">Investment Scam</option>
                <option value="love_scam">Love Scam</option>
                <option value="job_scam">Job Scam</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Input
              label={t('feed.description')}
              multiline
              rows={3}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder={t('feed.descPlaceholder')}
              maxLength={1200}
              charCount
            />
            <p className="-mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>Do not include passwords, TAC/OTP codes, or full bank-account details.</p>

            <Input
              label={t('feed.phoneLabel')}
              value={reportPhone}
              onChange={(e) => setReportPhone(e.target.value)}
              placeholder={t('feed.phonePlaceholder')}
            />

            <Input label="Approximate location (optional)" value={reportLocation} onChange={(e) => setReportLocation(e.target.value)} placeholder="e.g. Ipoh, Perak" />

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>When did this happen?</label>
              <select value={occurredWhen} onChange={(e) => setOccurredWhen(e.target.value)} className="w-full h-12 px-4 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '16px' }}>
                <option value="today">Today</option><option value="this_week">This week</option><option value="earlier">Earlier</option>
              </select>
            </div>

            {analysis && <div className="rounded-xl p-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent)' }}><Sparkles size={16}/><span className="text-xs font-semibold uppercase tracking-wide">DJAGA analysis</span></div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{analysis.title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Classified with {Math.round(analysis.confidence * 100)}% confidence. You can still correct the scam type above.</p>
            </div>}

            <label className="flex items-start gap-3 text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={consentPublic} onChange={(e) => setConsentPublic(e.target.checked)} className="mt-0.5" style={{ accentColor: 'var(--accent)' }} />
              <span>I understand this report may appear anonymously in DJAGA’s community intelligence feed after AI classification. It will be labelled as unverified.</span>
            </label>

            {reportError && <p className="text-sm" style={{ color: 'var(--threat)' }}>{reportError}</p>}

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleSubmitReport}
              loading={analysing || submitting}
              disabled={reportDescription.trim().length < 12 || !consentPublic}
            >
              {analysis ? 'Submit community report' : 'Analyse report'}
            </Button>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
