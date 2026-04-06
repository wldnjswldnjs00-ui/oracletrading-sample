import { useEffect } from 'react';

declare global { interface Window { adsbygoogle: unknown[]; } }

interface AdSenseProps {
  slot: string;
  format?: string;
  responsive?: boolean;
}

export function AdSense({ slot, format = 'auto', responsive = true }: AdSenseProps) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', minHeight: 0 }}
      data-ad-client="ca-pub-6870676006996989"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
