import { AdSense } from './AdSense';

export function SidebarAds() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AdSense slot="1234567890" format="rectangle" />
      <AdSense slot="1234567891" format="rectangle" />
      <AdSense slot="1234567892" format="rectangle" />
    </div>
  );
}
