import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePageMeta } from '../hooks/usePageMeta';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LearnAbout } from '../components/LearnAbout';

const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

const learnSections = [
  { title: '📚 What is Kelly Criterion?', content: 'The Kelly Criterion is a mathematical formula developed in 1956 by John L. Kelly Jr., a scientist at Bell Telephone Laboratories. Kelly originally invented the formula to analyze long-distance telephone signal noise, but he quickly realized its profound implications for gambling and investing. He published the paper "A New Interpretation of Information Rate," showing how a bettor should size bets to maximize the expected logarithm of wealth. Mathematician Edward O. Thorp later popularized Kelly\'s formula in finance, applying it to blackjack and eventually to stock markets. The formula f* = (p × b − q) / b represents the optimal fraction of capital to bet, where p is win probability, q is loss probability, and b is the profit-to-loss ratio.' },
  { title: '✅ Advantages', content: ['Compounding Power: Mathematically proven to maximize long-term portfolio growth faster than any other strategy', 'Scientific Foundation: Rooted in information theory and probability — not guesswork', 'Automatic Risk Scaling: Position size automatically shrinks after losses, protecting capital during drawdowns', 'Prevents Ruin: Built-in safeguard against total capital loss by never betting more than mathematically optimal', 'Adaptable Fractions: Half and Quarter Kelly variants reduce volatility while retaining most of the growth advantage'] },
  { title: '⚠️ Disadvantages', content: ['High Volatility: Full Kelly produces extreme balance swings — drawdowns of 50%+ are mathematically expected', 'Estimation Sensitivity: Results depend heavily on accurate win rate and profit/loss ratio inputs; small errors cause large deviations', 'Psychological Difficulty: Watching large drawdowns while "following the formula" requires strong mental discipline'] },
  { title: '💡 How to Use', content: ['Win Rate (%): Enter your historical win percentage from past trades (e.g. 60 means you win 60% of trades)', 'Avg Profit per Win (%): The average percentage gain on your winning trades', 'Avg Loss per Loss (%): The average percentage loss on your losing trades', 'Starting Capital: Set your trading capital (1 to 100,000,000) — the chart shows projected growth from this base', 'Choose Kelly Fraction: Full Kelly for maximum growth (Aggressive), Half Kelly for most traders (Conservative), Quarter Kelly for lower risk (Very Conservative)'] },
];

const kellyOptions = [
  { key: 'full', label: 'Full Kelly', sublabel: 'Aggressive', desc: 'Maximum theoretical growth rate. Highest volatility — large drawdowns are expected. Best for experienced traders only.' },
  { key: 'half', label: 'Half Kelly', sublabel: 'Conservative', desc: 'Recommended for most traders. Captures ~75% of Full Kelly\'s growth with significantly lower volatility and drawdowns.' },
  { key: 'quarter', label: 'Quarter Kelly', sublabel: 'Very Conservative', desc: 'Lowest volatility. Steady compounding growth with minimal balance swings. Ideal for risk-averse traders.' },
] as const;

export default function KellyCalculator() {
  const [, navigate] = useLocation();
  usePageMeta(
    'Kelly Criterion Calculator | Oracle Trading',
    'Calculate optimal position sizing with the Kelly Criterion formula. Enter your win rate and profit/loss ratio to find the mathematically perfect bet size. Full, Half, and Quarter Kelly options.',
    'Kelly Criterion Calculator - Oracle Trading',
    'Free Kelly Criterion calculator for traders and investors. Find your optimal position size using the Kelly formula f* = (p×b − q)/b. Includes growth projection simulator for up to 100M trades.'
  );
  const [winRate, setWinRate] = useState(60);
  const [profitRatio, setProfitRatio] = useState(2);
  const [lossRatio, setLossRatio] = useState(1);
  const [selectedKelly, setSelectedKelly] = useState<'full' | 'half' | 'quarter'>('half');
  const [startingCapital, setStartingCapital] = useState(10000);
  const [simulatorTrades, setSimulatorTrades] = useState(20);

  const kellyCalculation = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    const fullKelly = (p * b - q) / b;
    return {
      fullKelly: Math.max(0, fullKelly * 100),
      halfKelly: Math.max(0, (fullKelly / 2) * 100),
      quarterKelly: Math.max(0, (fullKelly / 4) * 100),
    };
  }, [winRate, profitRatio, lossRatio]);

  const kellyValues = {
    full: kellyCalculation.fullKelly,
    half: kellyCalculation.halfKelly,
    quarter: kellyCalculation.quarterKelly,
  };

  const kellyValue = kellyValues[selectedKelly];

  const chartData = useMemo(() => {
    const data = [];
    let capital = startingCapital;
    const fraction = kellyValue / 100;
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    // Geometric growth factor per trade: (1 + f*b)^p * (1 - f)^q
    // This is the correct Kelly compounding formula (log-growth maximization)
    const perTrade = fraction > 0
      ? Math.pow(1 + fraction * b, p) * Math.pow(Math.max(1 - fraction, 0.0001), q)
      : 1;
    const count = Math.max(1, Math.min(simulatorTrades, 500)); // cap at 500 for performance
    for (let i = 0; i <= count; i++) {
      data.push({ trade: `T${i}`, capital: Math.round(capital) });
      capital = capital * perTrade;
    }
    return data;
  }, [kellyValue, winRate, profitRatio, lossRatio, startingCapital, simulatorTrades]);

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
              <TrendingUp className="w-5 h-5 text-gold" />
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Kelly Criterion Calculator</h1>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Optimal position sizing for maximum growth</p>
          </div>
        </div>
      </header>

      {/* Top Ad */}
      <div className="bg-card/50 py-4 border-b border-primary/20">
        <div className="container"><AdSense slot="1234567899" format="horizontal" responsive={true} /></div>
      </div>

      {/* Learn About */}
      <LearnAbout topic="Kelly Criterion" sections={learnSections} />

      {/* Main */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block"><SidebarAds /></div>

          {/* Content: 4 cols */}
          <div className="lg:col-span-4 space-y-8">
            {/* Top row: Input (1) + Kelly Selection (3) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Input Parameters */}
              <div className="lg:col-span-1">
                <div className="card-gold-glow p-6 space-y-5">
                  <h2 className="text-foreground" style={{ fontSize: 18, fontWeight: 700 }}>Input Parameters</h2>

                  {/* Starting Capital — TOP */}
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Starting Capital</label>
                    <input type="number" value={startingCapital} min={1} max={100000000}
                      onChange={e => setStartingCapital(Math.max(1, Math.min(100000000, parseNum(e.target.value))))}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 3 }}>Your initial trading capital (1 – 100,000,000)</p>
                  </div>

                  {/* Kelly inputs */}
                  {[
                    { label: 'Win Rate (%)', value: winRate, set: (v: number) => setWinRate(Math.max(0, Math.min(100, v))), hint: 'Historical win rate (0–100%)', step: 1 },
                    { label: 'Avg Profit per Win (%)', value: profitRatio, set: (v: number) => setProfitRatio(Math.max(0.1, v)), hint: 'Average % gained when winning', step: 0.1 },
                    { label: 'Avg Loss per Loss (%)', value: lossRatio, set: (v: number) => setLossRatio(Math.max(0.1, v)), hint: 'Average % lost when losing', step: 0.1 },
                  ].map(({ label, value, set, hint, step }) => (
                    <div key={label}>
                      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
                      <input type="number" value={value} step={step} onChange={e => set(parseNum(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                      <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 3 }}>{hint}</p>
                    </div>
                  ))}

                  {/* Simulator — BOTTOM */}
                  <div style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', paddingTop: 16 }}>
                    <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Simulator</h3>
                    <p className="text-muted-foreground" style={{ fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
                      How many trades to simulate? Set this to see your projected balance after e.g. 50 or 100 consecutive trades at the Kelly fraction above.
                    </p>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Number of Trades</label>
                    <input type="number" value={simulatorTrades} min={1} max={100000000}
                      onChange={e => setSimulatorTrades(Math.max(1, Math.min(100000000, Math.round(parseNum(e.target.value)))))}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 3 }}>Range: 1 – 100,000,000 trades</p>
                  </div>
                </div>
              </div>

              {/* Kelly Fraction Selection — full 3 cols */}
              <div className="lg:col-span-3">
                <div className="card-gold-glow p-6">
                  <h3 className="text-foreground" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Kelly Fraction Selection</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {kellyOptions.map(({ key, label, sublabel, desc }) => {
                      const val = kellyValues[key];
                      const isSelected = selectedKelly === key;
                      return (
                        <button key={key} onClick={() => setSelectedKelly(key)}
                          style={{
                            padding: '20px 24px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                            border: isSelected ? '2px solid #B35900' : '2px solid color-mix(in oklab, var(--primary) 20%, transparent)',
                            background: isSelected ? '#B35900' : 'color-mix(in oklab, var(--primary) 5%, transparent)',
                            color: isSelected ? '#fff' : 'var(--foreground)',
                            boxShadow: isSelected ? '0 0 24px rgba(179,89,0,0.35)' : 'none',
                            transition: 'all 0.15s ease',
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 16, fontWeight: 800 }}>{label}</span>
                                <span style={{
                                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'color-mix(in oklab, var(--primary) 15%, transparent)',
                                  color: isSelected ? '#fff' : 'var(--gold)',
                                }}>{sublabel}</span>
                              </div>
                              <p style={{ fontSize: 12, opacity: isSelected ? 0.85 : 0.6, lineHeight: 1.5 }}>{desc}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p className="font-mono notranslate" style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>{val.toFixed(2)}%</p>
                              <p style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>of capital per trade</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Chart — full width below */}
            <div className="card-gold-glow p-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp style={{ width: 20, height: 20, color: 'var(--gold)' }} />
                  Expected Growth Projection (<span className="notranslate">{simulatorTrades.toLocaleString()}</span> Trades)
                </h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span className="text-muted-foreground">Starting: <span className="text-gold font-mono notranslate">{startingCapital.toLocaleString()}</span></span>
                  <span className="text-muted-foreground">Projected: <span className="text-gold font-mono notranslate">{(chartData[chartData.length - 1]?.capital ?? 0).toLocaleString()}</span></span>
                </div>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 20 }}>
                Simulates expected capital growth over <span className="notranslate">{simulatorTrades.toLocaleString()}</span> trades using selected Kelly fraction and your input parameters. Chart updates automatically as you adjust any setting.
              </p>
              <div style={{ height: 420, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="kellyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="trade" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false}
                      tickFormatter={v => {
                        const n = v as number;
                        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
                        if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                        return String(n);
                      }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: 8 }}
                      itemStyle={{ color: '#D4AF37' }}
                      formatter={(v) => [(v as number).toLocaleString(), 'Capital']} />
                    <Area type="monotone" dataKey="capital" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#kellyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Ad */}
      <div className="bg-card/50 py-4 border-y border-primary/20">
        <div className="container"><AdSense slot="1234567897" format="horizontal" responsive={true} /></div>
      </div>

      {/* Bottom Ad */}
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12">
        <div className="container"><AdSense slot="1234567896" format="horizontal" responsive={true} /></div>
      </div>
    </div>
  );
}
