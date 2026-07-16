import { useState, useEffect, useRef } from 'react';

const PARTICLES_COUNT = 60;

function generateParticles() {
  return Array.from({ length: PARTICLES_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 3,
    opacity: Math.random() * 0.5 + 0.1,
  }));
}

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0); // 0=enter, 1=show, 2=text, 3=exit
  const [particles] = useState(generateParticles);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Animated ring canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);

    let animId;
    let startTime = performance.now();

    const draw = (now) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      // Outer ring glow
      const gradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, 80);
      gradient.addColorStop(0, 'rgba(108,99,255,0)');
      gradient.addColorStop(0.6, `rgba(108,99,255,${0.08 + 0.04 * Math.sin(elapsed * 2)})`);
      gradient.addColorStop(1, 'rgba(108,99,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Animated arc ring
      const arcStart = elapsed * 1.5;
      const arcLen = Math.PI * 1.2 + Math.sin(elapsed * 3) * 0.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 52, arcStart, arcStart + arcLen);
      ctx.strokeStyle = '#6C63FF';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Second arc ring (opposite)
      ctx.beginPath();
      ctx.arc(cx, cy, 52, arcStart + Math.PI, arcStart + Math.PI + arcLen * 0.6);
      ctx.strokeStyle = '#8B84FF';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, 38, -arcStart * 0.7, -arcStart * 0.7 + Math.PI * 0.8);
      ctx.strokeStyle = 'rgba(108,99,255,0.3)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Shield icon in center
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + 0.03 * Math.sin(elapsed * 2.5), 1 + 0.03 * Math.sin(elapsed * 2.5));
      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F1F0FF';
      ctx.fillText('🛡️', 0, 0);
      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050508',
        opacity: phase === 3 ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}
    >
      {/* Gradient background orbs */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '20%', left: '30%',
          width: '400px', height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'splashOrb1 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%', right: '20%',
          width: '300px', height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13,204,177,0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'splashOrb2 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          top: '50%', left: '60%',
          width: '250px', height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'splashOrb3 7s ease-in-out infinite',
        }} />
      </div>

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.id % 3 === 0 ? '#6C63FF' : p.id % 3 === 1 ? '#0DCCB1' : '#8B84FF',
            opacity: phase >= 1 ? p.opacity : 0,
            transition: `opacity 1s ease ${p.delay * 0.3}s`,
            animation: `splashParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(108,99,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,99,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        opacity: phase >= 1 ? 0.6 : 0,
        transition: 'opacity 1.5s ease',
        pointerEvents: 'none',
      }} />

      {/* Animated ring */}
      <canvas
        ref={canvasRef}
        style={{
          width: '200px',
          height: '200px',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1)' : 'scale(0.6)',
          transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: '32px',
        }}
      />

      {/* Brand text */}
      <div style={{
        textAlign: 'center',
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.4,0,0.2,1) 0.2s',
      }}>
        <h1 style={{
          fontSize: '42px',
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #F1F0FF 0%, #6C63FF 50%, #0DCCB1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '8px',
        }}>
          DJAGA
        </h1>
        <p style={{
          fontSize: '13px',
          fontFamily: "'Space Mono', monospace",
          color: '#8B8BA7',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '24px',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.6s ease 0.5s',
        }}>
          Detect &middot; Protect &middot; Trust
        </p>

        {/* Loading bar */}
        <div style={{
          width: '160px',
          height: '2px',
          background: 'rgba(108,99,255,0.15)',
          borderRadius: '1px',
          overflow: 'hidden',
          margin: '0 auto',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.6s',
        }}>
          <div style={{
            height: '100%',
            borderRadius: '1px',
            background: 'linear-gradient(90deg, #6C63FF, #0DCCB1)',
            animation: 'splashLoad 2s ease-in-out both',
            transformOrigin: 'left',
          }} />
        </div>

        {/* Version */}
        <p style={{
          fontSize: '10px',
          fontFamily: "'Space Mono', monospace",
          color: '#4A4A6A',
          marginTop: '16px',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.8s',
        }}>
          v2.0 · Digital Guardian for Malaysia
        </p>
      </div>

      {/* Scoped keyframes */}
      <style>{`
        @keyframes splashOrb1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes splashOrb2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 20px) scale(1.15); }
        }
        @keyframes splashOrb3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 30px) scale(0.9); }
        }
        @keyframes splashParticle {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(8px); }
          75% { transform: translateY(10px) translateX(-5px); }
        }
        @keyframes splashLoad {
          0% { width: 0%; }
          60% { width: 80%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
