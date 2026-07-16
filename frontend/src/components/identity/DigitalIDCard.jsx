import { Shield, Share2, Download, RefreshCw } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useApp } from '../../context/AppContext';

export default function DigitalIDCard({ onShare, onDownload, onRefresh }) {
  const { user } = useApp();
  const did = user.digitalId;

  return (
    <div className="relative max-w-[380px] mx-auto lg:mx-0">
      {/* Animated gradient border wrapper */}
      <div
        className="p-[2px] rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #6C63FF, #0DCCB1, #6C63FF, #8B84FF)',
          backgroundSize: '300% 300%',
          animation: 'gradientMove 5s ease infinite',
        }}
      >
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-dim)' }}
              >
                <Shield size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <span
                className="text-sm font-bold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
              >
                DJAGA ID
              </span>
            </div>
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}
            >
              {did.did.replace('did:djaga:', '')}
            </span>
          </div>

          {/* User name */}
          <h3
            className="text-xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
          >
            {user.name}
          </h3>
          <p className="text-xs mb-5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            IC: {user.ic}
          </p>

          {/* QR code + Trust score section */}
          <div className="flex items-center gap-5 mb-5">
            {/* Decorative QR pattern */}
            <div
              className="w-24 h-24 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64">
                {/* Decorative QR pattern */}
                {Array.from({ length: 8 }).map((_, row) =>
                  Array.from({ length: 8 }).map((_, col) => {
                    const show = (row + col) % 3 !== 0 || (row < 3 && col < 3) || (row < 3 && col > 4) || (row > 4 && col < 3);
                    return show ? (
                      <rect
                        key={`${row}-${col}`}
                        x={col * 8}
                        y={row * 8}
                        width="6"
                        height="6"
                        rx="1"
                        fill="var(--text-primary)"
                        opacity="0.8"
                      />
                    ) : null;
                  })
                )}
              </svg>
            </div>

            {/* Trust info */}
            <div className="flex-1">
              <div className="mb-2">
                <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '1.5px' }}>
                  TRUST SCORE
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span
                  className="text-3xl font-extrabold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}
                >
                  {user.trustScore}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>/1000</span>
              </div>
              <Badge type="safe" dot>{user.trustBand}</Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="flex justify-between text-xs mb-5" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            <span>Issued: {new Date(did.issuedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>Expires: {new Date(did.expiresAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onShare} className="flex-1">
              <Share2 size={14} />
              Share
            </Button>
            <Button variant="ghost" size="sm" onClick={onDownload} className="flex-1">
              <Download size={14} />
              PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={onRefresh} className="flex-1">
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
