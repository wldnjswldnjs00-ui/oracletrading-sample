import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePageMeta } from '../hooks/usePageMeta';
import { ArrowLeft, GitBranch, TrendingUp, AlertCircle } from 'lucide-react';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LearnAbout } from '../components/LearnAbout';

const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

const learnSections = [
  { title: '📚 What is Martingale Strategy?', content: 'The Martingale strategy originated in 18th-century France as a gambling system. The name comes from a class of betting strategies popularized in Marseille, France. The classic rule: double your bet after every loss, so one win recovers all previous losses. In financial markets, a modified "pyramid entry" version is used — adding larger positions as the price drops to lower the average entry price. Traders use it to recover from losing positions by scaling in at better prices, targeting a break-even or profit when the price reverses.' },
  { title: '✅ Advantages', content: ['Averaging Down: Reduces average entry price with each additional level, making recovery easier', 'Mechanical System: Clear rules for each level — no emotional decision-making required during execution', 'Works in Range Markets: Highly effective in sideways/oscillating markets where price eventually returns to mean', 'Customizable Scaling: Position sizes can be tailored (1-2-4-8 or 1-1-2-3) to match available capital', 'Break-even at Lower Price: Can achieve profit even when price does not fully recover to initial entry'] },
  { title: '⚠️ Disadvantages', content: ['Unlimited Capital Risk: In a sustained downtrend, capital requirements grow exponentially — losses can be catastrophic', 'Trend Vulnerability: Strong trending markets (crypto, stocks) can move far beyond any reasonable drawdown assumption', 'Psychological Burden: Watching an ever-increasing position size move against you creates extreme psychological pressure'] },
  { title: '💡 How to Use', content: ['Entry Price: Your first entry point — the price at which you open the initial position', 'Drawdown per Level (%): How much the price drops before you enter the next level (e.g. 5% = enter again every 5% drop)', 'Number of Entry Levels: How many times you plan to enter (buy) as the price drops — each level adds a new position', 'Position Sizes: Define each level\'s size as comma-separated values (e.g. "1, 2, 4, 8" means doubling each level)', 'Risk Rule: Never deploy Martingale without a hard stop-loss — define the maximum number of levels before you exit'] },
];

export default function MartingaleSimulator() {
  const [, navigate] = useLocation();
  usePageMeta(
    'Martingale Simulator | Oracle Trading',
    'Simulate Martingale pyramid entry strategies with custom drawdown levels and position sizing. Calculate average entry price, break-even point, and profit targets for your trading strategy.',
    'Martingale Strategy Simulator - Oracle Trading',
    'Free Martingale simulator for traders. Enter your position sizes (1-2-4-8) and drawdown levels to calculate average entry price, total capital required, and profit at target. Includes position entry schedule.'
  );
  const [entryPrice, setEntryPrice] = useState(100);
  const [drawdownPct, setDrawdownPct] = useState(5);
  const [targetProfit, setTargetProfit] = useState(10);
  const [numberOfLevels, setNumberOfLevels] = useState(4);
  const [positionSizesText, setPositionSizesText] = useState('1, 2, 4, 8');
  const [availableCapital, setAvailableCapital] = useState(10000);

  const handleLevelsChange = (n: number) => {
    const clamped = Math.max(1, Math.min(10, Math.round(n)));
    setNumberOfLevels(clamped);
    const sizes = Array.from({ length: clamped }, (_, i) => Math.pow(2, i));
    setPositionSizesText(sizes.join(', '));
  };

  // Parse positionSizesText for computation
  const positionSizes = useMemo(() => {
    // Support both comma-separated (1, 2, 4) and semicolon-separated (for European locales where comma = decimal)
    const separator = positionSizesText.includes(';') ? ';' : ',';
    return positionSizesText.split(separator).map(s => parseFloat(s.trim().replace(',', '.'))).filter(n => !isNaN(n) && n > 0);
  }, [positionSizesText]);

  const result = useMemo(() => {
    try {
      const sizes = positionSizes;
      if (sizes.length === 0 || !entryPrice || !drawdownPct) return null;
      const levels = sizes.map((size, i) => {
        const price = entryPrice * Math.pow(1 - drawdownPct / 100, i);
        const avgPriceNumerator = sizes.slice(0, i + 1).reduce((sum, s, j) => sum + s * entryPrice * Math.pow(1 - drawdownPct / 100, j), 0);
        const avgPriceDenominator = sizes.slice(0, i + 1).reduce((sum, s) => sum + s, 0);
        const averagePrice = avgPriceNumerator / avgPriceDenominator;
        const cumulativeCapital = sizes.slice(0, i + 1).reduce((sum, s, j) => sum + s * entryPrice * Math.pow(1 - drawdownPct / 100, j), 0);
        return { level: i + 1, price, positionSize: size, averagePrice, cumulativeCapital };
      });
      const totalUnits = sizes.reduce((a, b) => a + b, 0);
      const totalCapitalRequired = levels[levels.length - 1].cumulativeCapital;
      const avgPrice = levels[levels.length - 1].averagePrice;
      const breakEvenPrice = avgPrice;
      const profitAtTarget = totalUnits * avgPrice * (1 + targetProfit / 100) - totalCapitalRequired;
      const capitalOk = totalCapitalRequired <= availableCapital;
      return { levels, totalCapitalRequired, breakEvenPrice, profitAtTarget, capitalOk, avgPrice };
    } catch { return null; }
  }, [entryPrice, drawdownPct, targetProfit, positionSizes, availableCapital]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--primary) 10%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <ArrowLeft className="w-5 h-5 text-gold" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch className="w-5 h-5 text-gold" />
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Martingale Simulator</h1>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Simulate pyramid entry and recovery strategies</p>
          </div>
        </div>
      </header>

      <div className="bg-card/50 py-4 border-b border-primary/20">
        <div className="container"><AdSense slot="1234567895" format="horizontal" responsive={true} /></div>
      </div>

      <LearnAbout topic="Martingale Strategy" sections={learnSections} />

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="hidden lg:block"><SidebarAds /></div>
          <div className="lg:col-span-4 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Input Card */}
              <div className="card-gold-glow p-6">
                <h2 className="text-foreground" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Strategy Parameters</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Current Entry Price</label>
                    <input type="number" value={entryPrice} onChange={e => setEntryPrice(Math.max(0, Math.min(100000000, parseNum(e.target.value))))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Number of Entry Levels</label>
                    <input type="number" value={numberOfLevels} min={1} max={10} onChange={e => handleLevelsChange(parseNum(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 4 }}>How many times to enter as price drops (1–10)</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Position Sizes (comma separated)</label>
                    <input type="text" value={positionSizesText} onChange={e => setPositionSizesText(e.target.value)} placeholder="e.g. 1, 2, 4, 8" className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 4 }}>Auto-set from levels above — edit to customize. Use semicolons (;) if comma is your decimal separator.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Drawdown per Level (%)</label>
                      <input type="number" value={drawdownPct} min={0} max={99} onChange={e => setDrawdownPct(Math.max(0, Math.min(99, parseNum(e.target.value))))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Profit (%)</label>
                      <input type="number" value={targetProfit} onChange={e => setTargetProfit(Math.max(0, Math.min(1000, parseNum(e.target.value))))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Available Capital</label>
                    <input type="number" value={availableCapital} onChange={e => setAvailableCapital(Math.max(0, Math.min(100000000, parseNum(e.target.value))))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card-gold-glow p-6" style={{ borderLeft: '4px solid var(--gold)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="text-muted-foreground">
                    <TrendingUp style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Capital Required</span>
                  </div>
                  <p className="text-gold font-mono notranslate" style={{ fontSize: 30, fontWeight: 900 }}>
                    {result ? result.totalCapitalRequired.toLocaleString('en-US', { maximumFractionDigits: 0 }) : <span className="text-muted-foreground" style={{ fontSize: 14 }}>Invalid Input</span>}
                  </p>
                </div>
                <div className="card-gold-glow p-6" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="text-muted-foreground">
                    <TrendingUp style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Break-even Price</span>
                  </div>
                  <p className="text-accent font-mono notranslate" style={{ fontSize: 30, fontWeight: 900 }}>
                    {result ? result.breakEvenPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : <span className="text-muted-foreground" style={{ fontSize: 14 }}>Invalid Input</span>}
                  </p>
                </div>
                <div className="card-gold-glow p-6" style={{ borderLeft: '4px solid var(--gold)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="text-muted-foreground">
                    <TrendingUp style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profit at Target</span>
                  </div>
                  <p className="text-gold font-mono notranslate" style={{ fontSize: 30, fontWeight: 900 }}>
                    {result ? result.profitAtTarget.toLocaleString('en-US', { maximumFractionDigits: 0 }) : <span className="text-muted-foreground" style={{ fontSize: 14 }}>Invalid Input</span>}
                  </p>
                </div>
                {result && (
                  <div style={{ padding: 16, borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', display: 'flex', gap: 12 }}>
                    <AlertCircle style={{ width: 20, height: 20, color: 'var(--gold)', flexShrink: 0 }} />
                    <p className="text-muted-foreground" style={{ fontSize: 13 }}>
                      {result.capitalOk ? (
                        <>Strategy fits within your capital. Average entry: <span className="notranslate">{result.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>. Break-even at <span className="notranslate">{result.breakEvenPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>.</>
                      ) : (
                        <>Strategy requires <span className="notranslate">{result.totalCapitalRequired.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> but only <span className="notranslate">{availableCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> available. Reduce position sizes or levels.</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Middle Ad */}
            <div className="bg-card/50 py-4 border-y border-primary/20" style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
              <AdSense slot="1234567894" format="horizontal" responsive={true} />
            </div>

            {/* Position Entry Schedule (formerly Entry Level Breakdown) */}
            <div className="card-gold-glow" style={{ overflow: 'hidden' }}>
              <div style={{ padding: 24 }}>
                <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>Position Entry Schedule</h3>
                <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 4 }}>
                  Planned entry price, position size, and cumulative cost at each level — auto-calculated from your parameters.
                </p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'color-mix(in oklab, var(--primary) 5%, transparent)' }}>
                      {['Level', 'Entry Price', 'Size', 'Avg Price', 'Total Capital'].map(h => (
                        <th key={h} className="text-muted-foreground" style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result ? result.levels.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid color-mix(in oklab, var(--primary) 5%, transparent)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--primary) 5%, transparent)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="text-muted-foreground font-mono" style={{ padding: '16px 24px', fontSize: 13 }}>Level {l.level}</td>
                        <td className="text-gold font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{l.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td className="text-foreground font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{l.positionSize}</td>
                        <td className="text-accent font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{l.averagePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td className="text-gold font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{l.cumulativeCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center' }} className="text-muted-foreground">Enter strategy parameters to see breakdown</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12">
        <div className="container"><AdSense slot="1234567896" format="horizontal" responsive={true} /></div>
      </div>
    </div>
  );
}
