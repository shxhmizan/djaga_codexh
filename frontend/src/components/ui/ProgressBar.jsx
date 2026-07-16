import { useEffect, useState } from 'react';

export default function ProgressBar({
  value = 0,
  max = 100,
  color = 'var(--accent)',
  height = 3,
  animated = true,
  className = '',
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (animated) {
      requestAnimationFrame(() => {
        setWidth((value / max) * 100);
      });
    } else {
      setWidth((value / max) * 100);
    }
  }, [value, max, animated]);

  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{
        height,
        background: 'rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          transition: animated ? 'width 0.3s ease-out' : 'none',
        }}
      />
    </div>
  );
}
