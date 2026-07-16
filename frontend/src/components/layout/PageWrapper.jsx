export default function PageWrapper({ children, className = '' }) {
  return (
    <div
      className={`w-full max-w-6xl mx-auto px-4 md:px-8 lg:px-20 pt-4 lg:pt-20 ${className}`}
    >
      {children}
    </div>
  );
}
