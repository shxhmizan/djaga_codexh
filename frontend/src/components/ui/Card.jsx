export default function Card({
  children,
  className = '',
  hover = true,
  glow = null,
  padding = true,
  onClick,
  style = {},
}) {
  const glowStyles = glow ? {
    borderColor: glow === 'safe' ? 'var(--safe-border)' : glow === 'threat' ? 'var(--threat-border)' : 'var(--accent-border)',
    boxShadow: glow === 'safe'
      ? '0 0 60px rgba(34,197,94,0.1)'
      : glow === 'threat'
      ? '0 0 60px rgba(239,68,68,0.1)'
      : '0 0 60px rgba(108,99,255,0.1)',
  } : {};

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl
        ${padding ? 'p-6' : ''}
        ${hover ? 'transition-all duration-200 hover:-translate-y-[2px] hover:border-[rgba(255,255,255,0.12)]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(25,46,40,0.76), rgba(11,25,21,0.62))',
        border: '1px solid rgba(219,255,241,0.14)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.07)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        ...glowStyles,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
