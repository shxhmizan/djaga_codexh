import { Loader2 } from 'lucide-react';

const variants = {
  primary: {
    bg: 'bg-accent hover:brightness-105',
    text: 'text-white',
    border: '',
    style: { background: 'var(--accent)' },
  },
  secondary: {
    bg: 'hover:bg-bg-tertiary',
    text: 'text-text-primary',
    border: 'border border-[rgba(255,255,255,0.12)]',
    style: {},
  },
  ghost: {
    bg: 'hover:bg-[rgba(255,255,255,0.06)]',
    text: 'text-text-secondary hover:text-text-primary',
    border: '',
    style: {},
  },
  danger: {
    bg: 'hover:brightness-105',
    text: 'text-white',
    border: '',
    style: { background: 'var(--threat)' },
  },
};

const sizes = {
  sm: 'h-9 px-4 text-sm rounded-[10px]',
  md: 'h-11 px-6 text-[15px] rounded-xl',
  lg: 'h-[52px] px-8 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-200 cursor-pointer select-none
        ${s} ${v.bg} ${v.text} ${v.border}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]'}
        ${className}
      `}
      style={{
        ...v.style,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        minWidth: loading ? undefined : undefined,
      }}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          <span>{typeof children === 'string' ? children : 'Loading...'}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
