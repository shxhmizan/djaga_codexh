import { useState } from 'react';
import { Plus } from 'lucide-react';
import VerifiedBadge, { statusConfig } from './VerifiedBadge';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function GovCheckList({ checks = [] }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <div className="space-y-2">
        {checks.map((check) => {
          const config = statusConfig[check.status] || statusConfig.pending;

          return (
            <div
              key={check.id}
              className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-[var(--bg-tertiary)]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {/* Status icon */}
              <VerifiedBadge status={check.status} size={20} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {check.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {check.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {check.detail}
                </p>
              </div>

              {/* Time */}
              <span className="text-xs flex-shrink-0" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {check.time}
              </span>

              {/* Status badge */}
              <Badge type={config.type}>
                {config.label}
              </Badge>
            </div>
          );
        })}
        {!checks.length && <p className="text-sm p-4" style={{ color: 'var(--text-tertiary)' }}>No verification records are available.</p>}
      </div>

      {/* Add more button */}
      <div className="mt-4">
        <Button variant="secondary" size="md" fullWidth onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Add more verifications
        </Button>
      </div>

      {/* Coming soon modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="More Verifications">
        <div className="text-center py-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-dim)' }}
          >
            <Plus size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h4 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Coming in V2
          </h4>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Additional government API verifications will be available in the next version. Request early access to be notified.
          </p>
          <Button variant="primary" size="md" onClick={() => setShowModal(false)}>
            Request Early Access
          </Button>
        </div>
      </Modal>
    </div>
  );
}
