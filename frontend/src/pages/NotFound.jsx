import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';

export default function NotFound() {
  useEffect(() => {
    document.title = '404 — DJAGA';
  }, []);

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Shield size={64} style={{ color: 'var(--accent)', opacity: 0.3 }} />
        <h1
          className="text-6xl font-extrabold mt-6 mb-3 gradient-text"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-2px' }}
        >
          404
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Halaman ini tidak dijumpai. / This page was not found.
        </p>
        <Link to="/">
          <Button variant="primary" size="md">
            <Home size={16} />
            Back to Home
          </Button>
        </Link>
      </div>
    </PageWrapper>
  );
}
