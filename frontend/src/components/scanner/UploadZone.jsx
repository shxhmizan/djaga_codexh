import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

export default function UploadZone({ onFile, onError, className = '' }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const inputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateAndSet = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError?.('Please upload JPG, PNG, or WEBP. / Sila muat naik JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      onError?.('File must be under 5MB. / Fail mestilah di bawah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setFileName(file.name);
      setFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      onFile?.(file, e.target.result);
    };
    reader.readAsDataURL(file);
  }, [onFile, onError]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) validateAndSet(file);
  }, [validateAndSet]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setPreview(null);
    setFileName('');
    setFileSize('');
    if (inputRef.current) inputRef.current.value = '';
    onFile?.(null, null);
  };

  // Set preview from demo buttons (exposed via ref or direct call)
  const setDemoPreview = useCallback((dataUrl, name) => {
    setPreview(dataUrl);
    setFileName(name);
    setFileSize('Demo image');
  }, []);

  return (
    <div className={className}>
      <div
        onClick={!preview ? handleClick : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
        style={{
          height: preview ? 280 : 260,
          border: `2px dashed ${isDragOver ? 'var(--accent)' : preview ? 'transparent' : 'var(--accent-border)'}`,
          background: isDragOver
            ? 'rgba(108,99,255,0.08)'
            : preview
            ? 'var(--bg-secondary)'
            : 'rgba(108,99,255,0.03)',
          transform: isDragOver ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {/* Filename overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
              style={{
                background: 'linear-gradient(transparent, rgba(10,10,15,0.9))',
              }}
            >
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {fileName} · {fileSize}
              </span>
            </div>
            {/* Clear button */}
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{
                background: 'rgba(10,10,15,0.7)',
                border: '1px solid var(--border)',
              }}
            >
              <X size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}
            >
              <Upload size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Drop image here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                JPG, PNG, WEBP — max 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
