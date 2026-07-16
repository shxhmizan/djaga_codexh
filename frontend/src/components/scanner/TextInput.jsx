export default function TextInput({ value, onChange, placeholder, maxLength = 1000 }) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Tampal mesej atau URL yang mencurigakan di sini..."}
        maxLength={maxLength}
        className="w-full p-4 rounded-xl text-[16px] leading-relaxed resize-y focus:outline-none transition-all duration-200"
        style={{
          minHeight: 200,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent)';
          e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.25)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
      />
      <span
        className="absolute bottom-3 right-3 text-xs"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
      >
        {value.length} / {maxLength}
      </span>
    </div>
  );
}
