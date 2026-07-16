// Web Audio API Sound Engine — no external files
// All sounds generated programmatically

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function isMuted() {
  try {
    return localStorage.getItem('djaga_mute') === 'true';
  } catch {
    return false;
  }
}

function playTone(frequency, duration, type = 'sine', gain = 0.15, startTime = 0) {
  if (isMuted()) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime + startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
}

function playSweep(startFreq, endFreq, duration, type = 'sine', gain = 0.15) {
  if (isMuted()) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// Rising chime 440→660Hz, 0.3s
export function playUploadSuccess() {
  if (isMuted()) return;
  playSweep(440, 660, 0.3, 'sine', 0.12);
}

// Two low pulses 180Hz, 0.15s apart
export function playScanStart() {
  if (isMuted()) return;
  playTone(180, 0.1, 'sine', 0.1, 0);
  playTone(180, 0.1, 'sine', 0.1, 0.15);
}

// 3-tone loop while loading (call once, returns stop fn)
export function playAnalysing() {
  if (isMuted()) return { stop: () => {} };
  const ctx = getAudioContext();
  let stopped = false;
  let timeoutId;

  function playLoop() {
    if (stopped) return;
    playTone(330, 0.15, 'sine', 0.06, 0);
    playTone(440, 0.15, 'sine', 0.06, 0.2);
    playTone(392, 0.15, 'sine', 0.06, 0.4);
    timeoutId = setTimeout(playLoop, 800);
  }

  playLoop();

  return {
    stop: () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
    }
  };
}

// C5-E5-G5 chord, staggered 80ms, 0.5s each
export function playResultSafe() {
  if (isMuted()) return;
  playTone(523.25, 0.5, 'sine', 0.1, 0);       // C5
  playTone(659.25, 0.5, 'sine', 0.1, 0.08);     // E5
  playTone(783.99, 0.5, 'sine', 0.1, 0.16);     // G5
}

// G4→D4 descending, 0.4s each, slight distortion
export function playResultThreat() {
  if (isMuted()) return;
  playTone(392, 0.4, 'sawtooth', 0.08, 0);      // G4
  playTone(293.66, 0.4, 'sawtooth', 0.08, 0.3); // D4
}

// Ultra-short click 800Hz, 0.05s, gain 0.08
export function playButtonTap() {
  if (isMuted()) return;
  playTone(800, 0.05, 'sine', 0.08, 0);
}

// Swoosh down 600→200Hz, 0.2s
export function playReset() {
  if (isMuted()) return;
  playSweep(600, 200, 0.2, 'sine', 0.1);
}
