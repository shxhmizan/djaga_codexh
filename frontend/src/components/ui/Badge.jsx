const badgeStyles = {
  safe: {
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    text: '#4ADE80',
  },
  threat: {
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    text: '#FCA5A5',
  },
  warning: {
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    text: '#FCD34D',
  },
  info: {
    bg: 'rgba(108,99,255,0.12)',
    border: 'rgba(108,99,255,0.25)',
    text: '#8B84FF',
  },
  teal: {
    bg: 'rgba(13,204,177,0.12)',
    border: 'rgba(13,204,177,0.25)',
    text: '#0DCCB1',
  },
  gray: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.1)',
    text: '#8B8BA7',
  },
};

export default function Badge({ children, type = 'info', className = '', dot = false }) {
  const s = badgeStyles[type] || badgeStyles.info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full ${className}`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: s.text }}
        />
      )}
      {children}
    </span>
  );
}
