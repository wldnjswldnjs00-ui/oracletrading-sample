import { useEffect } from 'react';

declare global { interface Window { adsbygoogle: unknown[]; } }

function SidebarSlot({ slot }: { slot: string }) {
  useEffect(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
  }, []);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', minHeight: 0 }}
      data-ad-client="ca-pub-6870676006996989"
      data-ad-slot={slot}
      data-ad-format="rectangle"
      data-full-width-responsive="true"
    />
  );
}

export function SidebarAds() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SidebarSlot slot="9999999001" />
      <SidebarSlot slot="9999999002" />
    </div>
  );
}
