import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LearnAbout } from '../components/LearnAbout';

const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

const learnSections = [
  { title: '📚 What is Kelly Criterion?', content: 'The Kelly Criterion is a mathematical formula developed in 1956 by John L. Kelly Jr., a scientist at Bell Telephone Laboratories. Kelly originally invented the formula to analyze long-distance telephone signal noise, but he quickly realized its profound implications for gambling and investing. He published the paper "A New Interpretation of Information Rate," showing how a bettor should size bets to maximize the expected logarithm of wealth. Mathematician Edward O. Thorp later popularized Kelly\'s formula in finance, applying it to blackjack and eventually to stock markets. The formula f* = (p × b − q) / b represents the optimal fraction of capital to bet, where p is win probability, q is loss probability, and b is the profit-to-loss ratio.' },
  { title: '✅ Advantages', content: ['Compounding Power: Mathematically proven to maximize long-term portfolio growth faster than any other strategy', 'Scientific Foundation: Rooted in information theory and probability — not guesswork', 'Automatic Risk Scaling: Position size automatically shrinks after losses, protecting capital during drawdowns', 'Prevents Ruin: Built-in safeguard against total capital loss by never betting more than mathematically optimal', 'Adaptable Fractions: Half and Quarter Kelly variants reduce volatility while retaining most of the growth advantage'] },
  { title: '⚠️ Disadvantages', content: ['High Volatility: Full Kelly produces extreme balance swings — drawdowns of 50%+ are mathematically expected', 'Estimation Sensitivity: Results depend heavily on accurate win rate and profit/loss ratio inputs; small errors cause large deviations', 'Psychological Difficulty: Watching large drawdowns while "following the formula" requires strong mental discipline'] },
  { title: '💡 How to Use', content: ['Win Rate (%): Enter your historical win percentage from past trades (e.g. 60 means you win 60% of trades)', 'Avg Profit per Win (%): The average percentage gain on your winning trades', 'Avg Loss per Loss (%): The average percentage loss on your losing trades', 'Choose Kelly Fraction: Full Kelly for maximum growth (aggressive), Half Kelly for most traders (balanced), Quarter Kelly for conservative approach', 'Recommendation: Start with Half Kelly — it captures ~75% of Full Kelly\'s growth with far less volatility'] },
];

export default function KellyCalculator() {
  const [, navigate] = useLocation();
  const [winRate, setWinRate] = useState(60);
  const [profitRatio, setProfitRatio] = useState(2);
  const [lossRatio, setLossRatio] = useState(1);
  const [selectedKelly, setSelectedKelly] = useState<'full' | 'half' | 'quarter'>('half');

  const kellyCalculation = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    const fullKelly = (p * b - q) / b;
    return {
      fullKelly: Math.max(0, fullKelly * 100),
      halfKelly: Math.max(0, fullKelly / 2 * 100),
      quarterKelly: Math.max(0, fullKelly / 4 * 100),
      isValid: fullKelly > 0
    };
  }, [winRate, profitRatio, lossRatio]);

  const kellyValue = selectedKelly === 'full' ? kellyCalculation.fullKelly :
                     selectedKelly === 'half' ? kellyCalculation.halfKelly :
                     kellyCalculation.quarterKelly;

  // Chart: simulate growth over 20 trades with selected Kelly fraction
  const chartData = useMemo(() => {
    const data = [];
    let capital = 10000;
    const fraction = kellyValue / 100;
    const p = winRate / 100;
    for (let i = 0; i <= 20; i++) {
      data.push({ trade: `T${i}`, capital: Math.round(capital) });
      // Expected value step
      capital = capital * (1 + fraction * (p * (profitRatio / lossRatio) - (1 - p)));
    }
    return data;
  }, [kellyValue, winRate, profitRatio, lossRatio]);

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
      <div className="bg-card/50 py-4 border-b border-primary/20"><div className="container"><AdSense slot="1234567899" format="horizontal" responsive={true} /></div></div>

      {/* Learn About */}
      <LearnAbout topic="Kelly Criterion" sections={learnSections} />

      {/* Main */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="hidden lg:block"><SidebarAds /></div>

          {/* Input */}
          <div className="lg:col-span-1">
            <div className="card-gold-glow p-6 sticky top-24 space-y-6">
              <h2 className="text-foreground" style={{ fontSize: 20, fontWeight: 700 }}>Input Parameters</h2>
              {[
                { label: 'Win Rate (%)', value: winRate, set: (v: number) => setWinRate(Math.max(0, Math.min(100, v))), hint: 'Your historical win rate (0–100%)' },
                { label: 'Avg Profit per Win (%)', value: profitRatio, set: (v: number) => setProfitRatio(Math.max(0.1, v)), hint: 'Average profit when you win', step: 0.1 },
                { label: 'Avg Loss per Loss (%)', value: lossRatio, set: (v: number) => setLossRatio(Math.max(0.1, v)), hint: 'Average loss when you lose', step: 0.1 },
              ].map(({ label, value, set, hint, step }) => (
                <div key={label}>
                  <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</label>
                  <input type="number" value={value} step={step ?? 1}
                    onChange={e => set(parseNum(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 4 }}>{hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Center */}
          <div className="lg:col-span-2 space-y-6">
            {/* Kelly Selection */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Kelly Fraction Selection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { key: 'full', label: 'Full Kelly', value: kellyCalculation.fullKelly },
                  { key: 'half', label: 'Half Kelly', value: kellyCalculation.halfKelly },
                  { key: 'quarter', label: 'Quarter Kelly', value: kellyCalculation.quarterKelly },
                ].map(({ key, label, value }) => (
                  <button key={key} onClick={() => setSelectedKelly(key as 'full' | 'half' | 'quarter')}
                    style={{
                      padding: 16, borderRadius: 12, cursor: 'pointer',
                      border: selectedKelly === key ? '2px solid #B35900' : '2px solid color-mix(in oklab, var(--primary) 20%, transparent)',
                      background: selectedKelly === key ? '#B35900' : 'color-mix(in oklab, var(--primary) 5%, transparent)',
                      color: selectedKelly === key ? '#fff' : 'var(--foreground)',
                      boxShadow: selectedKelly === key ? '0 0 20px rgba(179,89,0,0.3)' : 'none',
                    }}>
                    <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{label}</p>
                    <p className="font-mono" style={{ fontSize: 22, fontWeight: 900 }}>{value.toFixed(2)}%</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Details */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Calculation Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)' }}>
                  <p className="text-muted-foreground" style={{ fontSize: 11, marginBottom: 4 }}>Formula</p>
                  <p className="text-foreground font-mono" style={{ fontSize: 13 }}>f = (p × b - q) / b</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Win Probability (p)', value: (winRate / 100).toFixed(2), cls: 'text-gold' },
                    { label: 'Loss Probability (q)', value: ((100 - winRate) / 100).toFixed(2), cls: 'text-accent' },
                    { label: 'Profit/Loss Ratio (b)', value: (profitRatio / lossRatio).toFixed(2), cls: 'text-accent' },
                    { label: 'Full Kelly', value: `${kellyCalculation.fullKelly.toFixed(2)}%`, cls: 'text-gold' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} style={{ padding: 12, borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)' }}>
                      <p className="text-muted-foreground" style={{ fontSize: 11, marginBottom: 4 }}>{label}</p>
                      <p className={`${cls} font-mono`} style={{ fontSize: 16, fontWeight: 700 }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Position */}
            <div className="card-gold-glow p-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp className="w-5 h-5 text-gold" />
                <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>Recommended Position Size</h3>
              </div>
              <div style={{ padding: 24, borderRadius: 12, background: 'color-mix(in oklab, var(--gold) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--gold) 20%, transparent)' }}>
                <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 8 }}>Risk {kellyValue.toFixed(2)}% of your capital per trade</p>
                <p className="text-gold font-mono" style={{ fontSize: 40, fontWeight: 900 }}>{kellyValue.toFixed(2)}%</p>
                <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 12 }}>
                  {selectedKelly === 'full' && 'Aggressive: Maximum theoretical growth but higher volatility'}
                  {selectedKelly === 'half' && 'Balanced: Recommended for most traders — good growth with manageable risk'}
                  {selectedKelly === 'quarter' && 'Conservative: Lower volatility, suitable for risk-averse traders'}
                </p>
              </div>
            </div>

            {kellyCalculation.fullKelly > 25 && (
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: 12 }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>High Risk Alert</p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>Your Kelly suggests risking over 25% per trade. Consider using Half or Quarter Kelly.</p>
                </div>
              </div>
            )}

            {/* Growth Chart */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Expected Growth Projection (20 Trades)</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="kellyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="trade" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${((v as number)/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: 8 }} itemStyle={{ color: '#D4AF37' }} formatter={(v) => [(v as number).toLocaleString(), 'Capital']} />
                    <Area type="monotone" dataKey="capital" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#kellyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>What is Kelly Criterion?</h3>
              <p className="text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>The Kelly Criterion determines the optimal fraction of capital to risk on each trade to maximize long-term growth while minimizing risk of ruin.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className="text-foreground" style={{ fontSize: 12, fontWeight: 700 }}>Key Benefits:</p>
                {['Maximizes long-term wealth growth', 'Prevents over-betting', 'Reduces risk of ruin'].map(b => (
                  <div key={b} style={{ display: 'flex', gap: 6 }}>
                    <span className="text-gold" style={{ flexShrink: 0 }}>•</span>
                    <span className="text-muted-foreground" style={{ fontSize: 12 }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Common Mistakes</h3>
              {['Using Full Kelly without experience', 'Ignoring market volatility', 'Overestimating win rate'].map(m => (
                <div key={m} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <span className="text-gold" style={{ flexShrink: 0, fontWeight: 700 }}>•</span>
                  <span className="text-muted-foreground" style={{ fontSize: 12 }}>{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Ad */}
      <div className="bg-card/50 py-4 border-y border-primary/20"><div className="container"><AdSense slot="1234567897" format="horizontal" responsive={true} /></div></div>

      {/* Bottom Ad */}
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12"><div className="container"><AdSense slot="1234567896" format="horizontal" responsive={true} /></div></div>
    </div>
  );
}
