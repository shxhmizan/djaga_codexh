import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const typeConfig = {
  success: { icon: CheckCircle, color: 'var(--safe)', bg: 'var(--safe-dim)', border: 'var(--safe-border)' },
  error: { icon: XCircle, color: 'var(--threat)', bg: 'var(--threat-dim)', border: 'var(--threat-border)' },
  warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-dim)', border: 'rgba(245,158,11,0.25)' },
  info: { icon: Info, color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'var(--accent-border)' },
};

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = typeConfig[toast.type] || typeConfig.info;
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl max-w-[380px] w-full ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(12px)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        animation: 'slideLeft 0.3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <Icon size={18} style={{ color: config.color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {toast.title}
          </p>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors flex-shrink-0"
      >
        <X size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>
    </div>
  );
}

export default function Toast({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[200] flex flex-col gap-2 pointer-events-none
        bottom-24 right-4 lg:bottom-6 lg:right-6
        top-auto left-auto
        items-end"
    >
      {toasts.slice(-3).map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
