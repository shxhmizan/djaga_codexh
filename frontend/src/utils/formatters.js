// Utility formatters for dates, scores, and percentages

export function formatTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatConfidence(value) {
  return `${value.toFixed(1)}%`;
}

export function formatScore(score, max) {
  return `${score} / ${max}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateText(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getVerdictLabel(verdict) {
  const labels = {
    real: 'AUTHENTIC',
    fake: 'DEEPFAKE DETECTED',
    safe: 'SAFE',
    caution: 'CAUTION',
    scam: 'SCAM DETECTED',
  };
  return labels[verdict] || verdict.toUpperCase();
}

export function getVerdictEmoji(verdict) {
  const emojis = {
    real: '✅',
    fake: '🚨',
    safe: '✅',
    caution: '⚠️',
    scam: '🚨',
  };
  return emojis[verdict] || '⚠️';
}

export function isThreat(verdict) {
  return verdict === 'fake' || verdict === 'scam';
}

export function getScanTypeIcon(type) {
  const icons = {
    image: '🖼',
    text: '💬',
    voice: '🎙',
  };
  return icons[type] || '📄';
}
