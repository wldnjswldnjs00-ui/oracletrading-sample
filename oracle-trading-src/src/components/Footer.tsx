import { useLocation } from 'wouter';

export function Footer() {
  const [, navigate] = useLocation();
  return (
    <footer style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', background: 'color-mix(in oklab, var(--card) 50%, transparent)', marginTop: 48 }}>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24, textAlign: 'center' }}>
        <p className="text-muted-foreground" style={{ fontSize: 12 }}>Oracle Trading © 2026. Professional Investment Strategy Calculator.</p>
        <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>Disclaimer: For educational purposes only. Always consult with a financial advisor.</p>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate('/privacy-policy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 11, textDecoration: 'underline', opacity: 0.7 }}>
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
}
