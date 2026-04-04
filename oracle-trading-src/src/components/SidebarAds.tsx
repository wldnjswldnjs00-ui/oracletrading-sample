import { AdSense } from './AdSense';

export function SidebarAds() {
  const slotStyle = {
    border: '2px solid #D4AF37',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    minHeight: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'color-mix(in oklab, #D4AF37 5%, transparent)',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={slotStyle}><AdSense slot="9999999001" format="rectangle" /></div>
      <div style={slotStyle}><AdSense slot="9999999002" format="rectangle" /></div>
      <div style={slotStyle}><AdSense slot="9999999003" format="rectangle" /></div>
    </div>
  );
}
