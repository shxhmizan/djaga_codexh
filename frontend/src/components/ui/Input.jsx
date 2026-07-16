import { forwardRef } from 'react';

const Input = forwardRef(function Input({
  label,
  error,
  multiline = false,
  rows = 4,
  maxLength,
  value,
  onChange,
  placeholder,
  className = '',
  charCount = false,
  ...props
}, ref) {
  const Tag = multiline ? 'textarea' : 'input';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          className="block mb-2 text-sm font-medium"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <Tag
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={multiline ? rows : undefined}
          className={`
            w-full px-4 py-3 rounded-lg text-[15px] placeholder:text-[var(--text-tertiary)]
            focus:outline-none transition-all duration-200
            ${multiline ? 'resize-y min-h-[120px]' : 'h-12'}
            ${error ? 'border-[var(--threat)]' : ''}
          `}
          style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${error ? 'var(--threat-border)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '16px', // iOS zoom prevention
            lineHeight: multiline ? '1.6' : undefined,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--threat)' : 'var(--accent)';
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.25)' : 'rgba(108,99,255,0.25)'}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? 'var(--threat-border)' : 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
          {...props}
        />
        {charCount && maxLength && (
          <span
            className="absolute bottom-2 right-3 text-xs"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          >
            {(value || '').length} / {maxLength}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--threat)' }}>
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
