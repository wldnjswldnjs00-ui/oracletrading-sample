import { useState, useEffect } from 'react';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ot-cookie-consent')) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('ot-cookie-consent', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: 'rgba(10,10,10,0.97)',
      borderTop: '1px solid rgba(212,175,55,0.2)',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, flex: 1, minWidth: 200, lineHeight: 1.5 }}>
        This site uses cookies for analytics (Google Analytics) and advertising (Google AdSense).
        By continuing, you agree to our{' '}
        <a href="/privacy-policy" style={{ color: '#D4AF37', textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
      <button
        onClick={accept}
        style={{
          padding: '8px 20px', borderRadius: 8,
          border: '1px solid rgba(212,175,55,0.4)',
          background: 'rgba(212,175,55,0.12)',
          color: '#D4AF37', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
        }}
      >
        Accept &amp; Close
      </button>
    </div>
  );
}
