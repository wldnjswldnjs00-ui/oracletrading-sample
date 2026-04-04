import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, GitBranch, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LearnAbout } from '../components/LearnAbout';

const learnSections = [
  { title: '📚 What is Martingale Strategy?', content: 'The Martingale strategy originated in 18th-century France as a gambling system. The name comes from a class of betting strategies popularized in Marseille, France. The classic rule: double your bet after every loss, so one win recovers all previous losses. In financial markets, a modified "pyramid entry" version is used — adding larger positions as the price drops to lower the average entry price. Traders use it to recover from losing positions by scaling in at better prices, targeting a break-even or profit when the price reverses.' },
  { title: '✅ Advantages', content: ['Averaging Down: Reduces average entry price with each additional level, making recovery easier', 'Mechanical System: Clear rules for each level — no emotional decision-making required during execution', 'Works in Range Markets: Highly effective in sideways/oscillating markets where price eventually returns to mean', 'Customizable Scaling: Position sizes can be tailored (1-2-4-8 or 1-1-2-3) to match available capital', 'Break-even at Lower Price: Can achieve profit even when price does not fully recover to initial entry'] },
  { title: '⚠️ Disadvantages', content: ['Unlimited Capital Risk: In a sustained downtrend, capital requirements grow exponentially — losses can be catastrophic', 'Trend Vulnerability: Strong trending markets (crypto, stocks) can move far beyond any reasonable drawdown assumption', 'Psychological Burden: Watching an ever-increasing position size move against you creates extreme psychological pressure'] },
  { title: '💡 How to Use', content: ['Entry Price: Your first entry point — the price at which you open the initial position', 'Drawdown per Level (%): How much the price drops before you enter the next level (e.g. 5% = enter again every 5% drop)', 'Position Sizes: Define each level\'s size as comma-separated values (e.g. "1, 2, 4, 8" means doubling each level)', 'Available Capital: Enter your total capital to check if the full strategy is feasible', 'Risk Rule: Never deploy Martingale without a hard stop-loss — define the maximum number of levels before you exit'] },
];

const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

export default function MartingaleSimulator() {
  const [, navigate] = useLocation();
  const [entryPrice, setEntryPrice] = useState(100);
  const [drawdownPct, setDrawdownPct] = useState(5);
  const [targetProfit, setTargetProfit] = useState(10);
  const [positionSizes, setPositionSizes] = useState('1, 2, 4, 8');
  const [availableCapital, setAvailableCapital] = useState(10000);

  const result = useMemo(() => {
    try {
      const sizes = positionSizes.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
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
      const riskAssessment = capitalOk
        ? `Strategy fits within your capital. Average entry: ${avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}. Break-even at ${breakEvenPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}.`
        : `Strategy requires ${totalCapitalRequired.toLocaleString('en-US', { maximumFractionDigits: 0 })} but only ${availableCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })} available. Reduce position sizes or levels.`;
      return { levels, totalCapitalRequired, breakEvenPrice, profitAtTarget, riskAssessment, capitalOk };
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
      <div className="bg-card/50 py-4 border-b border-primary/20"><div className="container"><AdSense slot="1234567895" format="horizontal" responsive={true} /></div></div>
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
                    <input type="number" value={entryPrice} onChange={e => setEntryPrice(Math.max(0, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Drawdown per Level (%)</label>
                      <input type="number" value={drawdownPct} onChange={e => setDrawdownPct(Math.max(0, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Profit (%)</label>
                      <input type="number" value={targetProfit} onChange={e => setTargetProfit(Math.max(0, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Position Sizes (comma separated)</label>
                    <input type="text" value={positionSizes} onChange={e => setPositionSizes(e.target.value)} placeholder="e.g. 1, 2, 4, 8" className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Available Capital</label>
                    <input type="number" value={availableCapital} onChange={e => setAvailableCapital(Math.max(0, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
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
                    <p className="text-muted-foreground" style={{ fontSize: 13 }}>{result.riskAssessment}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Entry Level Chart */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <GitBranch style={{ width: 20, height: 20, color: 'var(--gold)' }} /> Entry Level Visualization
              </h3>
              <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 20 }}>Capital deployed and entry price at each level — updates in real time as you adjust parameters.</p>
              <div style={{ height: 300 }}>
                {result && result.levels.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.levels.map(l => ({ name: `L${l.level}`, capital: Math.round(l.cumulativeCapital), price: parseFloat(l.price.toFixed(2)), avg: parseFloat(l.averagePrice.toFixed(2)) }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${((v as number)/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: 8 }}
                        formatter={(v, name) => {
                          if (name === 'capital') return [(v as number).toLocaleString(), 'Total Capital'];
                          return [v, name];
                        }}
                      />
                      <Bar dataKey="capital" radius={[4, 4, 0, 0]}>
                        {result.levels.map((_, i) => {
                          const colors = ['#D4AF37', '#C9A227', '#BE9517', '#B38807', '#A87B00', '#9D6E00', '#926100', '#875400'];
                          return <Cell key={i} fill={colors[i % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} className="text-muted-foreground">Enter parameters to see chart</div>
                )}
              </div>
            </div>

            {/* Middle Ad */}
            <div className="bg-card/50 py-4 border-y border-primary/20" style={{ marginLeft: '-1.5rem', marginRight: '-1.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}><AdSense slot="1234567894" format="horizontal" responsive={true} /></div>

            {/* Entry Level Table */}
            <div className="card-gold-glow" style={{ overflow: 'hidden' }}>
              <div style={{ padding: 24 }}><h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>Entry Level Breakdown</h3></div>
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
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12"><div className="container"><AdSense slot="1234567896" format="horizontal" responsive={true} /></div></div>
    </div>
  );
}
