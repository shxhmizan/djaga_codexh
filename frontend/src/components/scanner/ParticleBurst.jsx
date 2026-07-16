import { useEffect, useRef } from 'react';
import { createParticleBurst } from '../../utils/particles';

export default function ParticleBurst({ type = 'safe', trigger = false }) {
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (trigger && canvasRef.current) {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = createParticleBurst(canvasRef.current, type);
    }
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [trigger, type]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
