import { CheckCircle, XCircle, Clock, MinusCircle } from 'lucide-react';

const statusConfig = {
  verified: { icon: CheckCircle, color: 'var(--safe)', label: 'VERIFIED', type: 'safe' },
  clear: { icon: CheckCircle, color: 'var(--safe)', label: 'CLEAR', type: 'safe' },
  skipped: { icon: MinusCircle, color: 'var(--text-tertiary)', label: 'N/A', type: 'gray' },
  pending: { icon: Clock, color: 'var(--warning)', label: 'PENDING', type: 'warning' },
  failed: { icon: XCircle, color: 'var(--threat)', label: 'FAILED', type: 'threat' },
};

export default function VerifiedBadge({ status = 'pending', size = 16 }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return <Icon size={size} style={{ color: config.color }} />;
}

export { statusConfig };
