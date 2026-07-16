export default function Spinner({ size = 24, color = 'var(--accent)', className = '' }) {
  return (
    <div
      className={`inline-block ${className}`}
      style={{
        width: size,
        height: size,
        border: `2.5px solid rgba(255,255,255,0.08)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}
