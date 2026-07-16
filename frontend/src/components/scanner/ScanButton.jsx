import { Search, Loader2 } from 'lucide-react';

export default function ScanButton({ onClick, loading = false, disabled = false, label = "Scan for Deepfakes" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2.5 font-semibold rounded-xl transition-all duration-200"
      style={{
        height: 52,
        background: disabled || loading ? 'rgba(108,99,255,0.3)' : 'var(--accent)',
        color: 'white',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-body)',
        fontSize: '15px',
        transform: 'translateY(0)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = 'translateY(0) scale(0.98)';
        }
      }}
      onMouseUp={(e) => {
        e.target.style.transform = 'translateY(-1px) scale(1)';
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.filter = 'brightness(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.filter = 'none';
      }}
    >
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>Analysing...</span>
        </>
      ) : (
        <>
          <Search size={18} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
