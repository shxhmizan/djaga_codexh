// Canvas-based particle burst system
// Safe (green) and Threat (red) variants

export function createParticleBurst(canvas, type = 'safe') {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const colors = type === 'safe'
    ? ['#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0', '#6C63FF']
    : ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#F59E0B'];

  const particles = [];
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const particleCount = 60;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const velocity = 2 + Math.random() * 6;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      radius: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: 0.015 + Math.random() * 0.015,
      gravity: 0.05 + Math.random() * 0.05,
    });
  }

  let animFrame;

  function animate() {
    ctx.clearRect(0, 0, rect.width, rect.height);

    let alive = false;
    for (const p of particles) {
      if (p.alpha <= 0) continue;
      alive = true;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.alpha -= p.decay;
      p.radius *= 0.995;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(p.radius, 0), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (alive) {
      animFrame = requestAnimationFrame(animate);
    }
  }

  animate();

  return () => {
    if (animFrame) cancelAnimationFrame(animFrame);
  };
}
