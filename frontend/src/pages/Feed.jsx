import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import ScamFeed from '../components/feed/ScamFeed';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../hooks/useTranslation';

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('macau_scam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPhone, setReportPhone] = useState('');
  const [liveAlerts, setLiveAlerts] = useState([]);
  const { addToast } = useApp();
  const { t } = useTranslation();

  const FILTERS = [
    { id: 'all', label: t('feed.all') },
    { id: 'critical', label: t('feed.critical') },
    { id: 'high', label: t('feed.high') },
    { id: 'deepfake', label: t('feed.deepfake') },
    { id: 'voice', label: t('feed.voice') },
    { id: 'text', label: t('feed.text') },
  ];

  useEffect(() => {
    document.title = `${t('feed.title')} — DJAGA`;
  }, [t]);

  useEffect(() => {
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

  const filteredAlerts = liveAlerts.filter(alert => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return alert.severity === 'critical';
    if (activeFilter === 'high') return alert.severity === 'high';
    if (activeFilter === 'deepfake') return alert.type.includes('deepfake');
    if (activeFilter === 'voice') return alert.type.includes('voice') || alert.type.includes('deepfake_call');
    if (activeFilter === 'text') return alert.type.includes('phishing') || alert.type.includes('scam');
    return true;
  });

  const handleSubmitReport = () => {
    setShowReportModal(false);
    setReportDescription('');
    setReportPhone('');
    addToast({ type: 'success', title: t('feed.reportTitle'), message: t('feed.reportSuccess') });
  };

  return (
    <PageWrapper>
      <div className="py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>
            {t('feed.title')}
          </h1>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            {t('feed.subtitle')}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--safe)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {t('feed.updated')}
            </span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 min-h-[44px]"
              style={{
                background: activeFilter === filter.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeFilter === filter.id ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${activeFilter === filter.id ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <ScamFeed alerts={filteredAlerts} />

        {/* Report button */}
        <div className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 z-50">
          <button
            onClick={() => setShowReportModal(true)}
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
        <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title={t('feed.reportTitle')}>
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
            />

            <Input
              label={t('feed.phoneLabel')}
              value={reportPhone}
              onChange={(e) => setReportPhone(e.target.value)}
              placeholder={t('feed.phonePlaceholder')}
            />

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={handleSubmitReport}
              disabled={!reportDescription.trim()}
            >
              {t('feed.submitReport')}
            </Button>
          </div>
        </Modal>
      </div>
    </PageWrapper>
  );
}
