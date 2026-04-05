import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { usePageMeta } from '../hooks/usePageMeta';
import { ArrowLeft, AlertCircle, Crown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LearnAbout } from '../components/LearnAbout';
import { Footer } from '../components/Footer';

const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

const learnSections = [
  { title: '📚 What is the VIP Integrated Strategy?', content: 'The VIP Integrated Strategy combines two powerful financial frameworks: Kelly Criterion for scientifically optimal position sizing, and Martingale Pyramid for systematic averaging-down entry management. By applying the Kelly formula to determine what percentage of capital to deploy — then using Martingale pyramid levels to define where and how to enter as prices drop — traders can systematically manage both the SIZE of their positions and the TIMING of their entries. This combination aims to maximize long-term capital growth while managing downside risk through structured dollar-cost averaging.' },
  { title: '✅ Advantages', content: ['Dual Framework: Combines Kelly (position sizing math) with Martingale (entry management) for a complete, structured trading system', 'Scientific Sizing: Kelly Criterion prevents over-betting by mathematically limiting each deployment to the optimal fraction', 'Systematic Recovery: Pyramid entries reduce average cost basis during drawdowns, enabling profit at lower recovery prices', 'Flexible Kelly Options: Choose Full Kelly (Aggressive), Half Kelly (Conservative), or Quarter Kelly (Very Conservative) — all results update instantly', 'Compounding Projection: Built-in growth simulator with configurable duration (Days/Months/Years) shows your expected capital trajectory'] },
  { title: '⚠️ Disadvantages', content: ['Capital Intensive: Martingale pyramid levels require increasing capital reserves — insufficient funds force early exit at a loss', 'Assumption Dependency: The strategy assumes price will eventually recover — sustained bear markets can invalidate this assumption', 'Input Sensitivity: Results depend on accurate win rate and profit/loss ratios — overestimating inputs leads to over-confident projections'] },
  { title: '💡 How to Use', content: ['Step 1 — Kelly Setup: Enter Win Rate, Avg Profit, Avg Loss. Select Full / Half / Quarter Kelly based on your risk tolerance.', 'Step 2 — Martingale Setup: Set Market Price, Number of Entry Levels (how many buys as price drops), and % Drop Between Entries.', 'Step 3 — Compounding: Set Target Monthly Return and Duration (Days / Months / Years) to project long-term growth.', 'Step 4 — Execute: Follow the Optimized Entry Levels for the exact price and allocation at each level.'] },
];

const kellyOptions = [
  { key: 'full',    label: 'Full Kelly',    sublabel: 'Aggressive',       multiplier: 1 },
  { key: 'half',    label: 'Half Kelly',    sublabel: 'Conservative',     multiplier: 0.5 },
  { key: 'quarter', label: 'Quarter Kelly', sublabel: 'Very Conservative', multiplier: 0.25 },
] as const;

type DurationUnit = 'day' | 'month' | 'year';

export default function VIPStrategy() {
  const [, navigate] = useLocation();
  usePageMeta(
    'VIP Integrated Strategy | Oracle Trading',
    'Combine Kelly Criterion and Martingale pyramid for an integrated trading strategy. Optimize position sizing and entry levels together. Includes compound growth projection with Day/Month/Year simulation.',
    'VIP Integrated Strategy - Kelly + Martingale | Oracle Trading',
    'Advanced VIP trading strategy combining Kelly Criterion position sizing with Martingale pyramid entries. Calculate optimal entry levels, investment allocation, and long-term compounding growth projection.'
  );
  const [targetMonthlyReturn, setTargetMonthlyReturn] = useState(10);
  const [winRate, setWinRate] = useState(60);
  const [profitRatio, setProfitRatio] = useState(2);
  const [lossRatio, setLossRatio] = useState(1);
  const [tradingCapital, setTradingCapital] = useState(10000);
  const [currentAssetPrice, setCurrentAssetPrice] = useState(100);
  const [entryLevels, setEntryLevels] = useState(4);
  const [priceDropPercent, setPriceDropPercent] = useState(5);
  const [selectedKelly, setSelectedKelly] = useState<'full' | 'half' | 'quarter'>('half');
  const [compoundingValue, setCompoundingValue] = useState(12);
  const [compoundingUnit, setCompoundingUnit] = useState<DurationUnit>('month');

  const handleUnitChange = (newUnit: DurationUnit) => {
    if (newUnit === compoundingUnit) return;
    const toDays = compoundingUnit === 'day' ? compoundingValue : compoundingUnit === 'month' ? compoundingValue * 30 : compoundingValue * 365;
    const converted = newUnit === 'day' ? toDays : newUnit === 'month' ? Math.round(toDays / 30) : Math.round(toDays / 365);
    setCompoundingValue(Math.max(1, Math.min(600, converted)));
    setCompoundingUnit(newUnit);
  };

  // Base full Kelly calculation
  const fullKellyPct = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    const fk = (p * b - q) / b;
    return Math.max(0, fk * 100);
  }, [winRate, profitRatio, lossRatio]);

  const kellyMultiplier = kellyOptions.find(o => o.key === selectedKelly)?.multiplier ?? 0.5;
  const kellyPct = fullKellyPct * kellyMultiplier;

  // Martingale levels — position sizes double each level (1, 2, 4, 8...)
  const martingaleData = useMemo(() => {
    const levels = [];
    let totalInvestment = 0;
    let totalShares = 0;

    // Doubling weights: level 1 = 1, level 2 = 2, level 3 = 4, level 4 = 8...
    const weights = Array.from({ length: entryLevels }, (_, i) => Math.pow(2, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const totalKellyCapital = (tradingCapital * kellyPct) / 100;

    for (let i = 1; i <= entryLevels; i++) {
      const priceAtLevel = currentAssetPrice * Math.pow(1 - priceDropPercent / 100, i - 1);
      // Investment scales with doubling weight
      const investmentPerLevel = totalWeight > 0 ? totalKellyCapital * (weights[i - 1] / totalWeight) : 0;
      const shares = priceAtLevel > 0 ? investmentPerLevel / priceAtLevel : 0;

      totalInvestment += investmentPerLevel;
      totalShares += shares;

      levels.push({
        level: i,
        price: priceAtLevel,
        shares,
        investment: investmentPerLevel,
        percentOfTotal: tradingCapital > 0 ? (investmentPerLevel / tradingCapital) * 100 : 0,
      });
    }

    const averagePrice = totalShares > 0 ? totalInvestment / totalShares : 0;
    return { levels, totalShares, totalInvestment, averagePrice };
  }, [tradingCapital, currentAssetPrice, entryLevels, priceDropPercent, kellyPct]);

  // Chart data — unit-aware labels
  const chartData = useMemo(() => {
    const monthlyRate = targetMonthlyReturn / 100;
    const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;

    if (compoundingUnit === 'day') {
      return Array.from({ length: compoundingValue + 1 }, (_, d) => {
        const balance = tradingCapital * Math.pow(1 + dailyRate, d);
        return { name: `Day ${d}`, balance: Math.round(balance), profit: Math.round(balance - tradingCapital) };
      });
    } else if (compoundingUnit === 'month') {
      return Array.from({ length: compoundingValue + 1 }, (_, m) => {
        const balance = tradingCapital * Math.pow(1 + dailyRate, m * 30);
        return { name: `Month ${m}`, balance: Math.round(balance), profit: Math.round(balance - tradingCapital) };
      });
    } else {
      return Array.from({ length: compoundingValue + 1 }, (_, y) => {
        const balance = tradingCapital * Math.pow(1 + dailyRate, y * 365);
        return { name: `Year ${y}`, balance: Math.round(balance), profit: Math.round(balance - tradingCapital) };
      });
    }
  }, [tradingCapital, targetMonthlyReturn, compoundingUnit, compoundingValue]);

  const unitLabel = compoundingUnit === 'day' ? 'Day' : compoundingUnit === 'month' ? 'Month' : 'Year';
  const finalBalance = chartData[chartData.length - 1]?.balance ?? 0;

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
              <Crown className="w-5 h-5 text-gold" />
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700 }}>VIP Integrated Strategy</h1>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Kelly Criterion + Martingale Pyramid Combined</p>
          </div>
        </div>
      </header>

      {/* Top Ad */}
      <div className="bg-card/50 py-4 border-b border-primary/20">
        <div className="container"><AdSense slot="1234567899" format="horizontal" responsive={true} /></div>
      </div>

      {/* Learn About */}
      <LearnAbout topic="VIP Integrated Strategy" sections={learnSections} />

      {/* Main Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1"><SidebarAds /></div>

          {/* Input */}
          <div className="lg:col-span-2">
            <div className="card-gold-glow p-6 sticky top-24 space-y-5">
              <h2 className="text-foreground" style={{ fontSize: 18, fontWeight: 700 }}>Strategy Configuration</h2>

              {[
                { label: 'Target Monthly Return (%)', value: targetMonthlyReturn, set: (v: number) => setTargetMonthlyReturn(Math.max(0, Math.min(1000, v))), hint: 'Monthly return goal — used to project compounding growth across all time units' },
                { label: 'Win Rate (%)', value: winRate, set: (v: number) => setWinRate(Math.max(0, Math.min(100, v))), hint: 'Historical win rate (0–100%)' },
                { label: 'Avg Profit per Win (%)', value: profitRatio, set: (v: number) => setProfitRatio(Math.max(0.1, Math.min(10000, v))), hint: 'Average % gain on winning trades', step: 0.1 },
                { label: 'Avg Loss per Loss (%)', value: lossRatio, set: (v: number) => setLossRatio(Math.max(0.1, Math.min(10000, v))), hint: 'Average % lost on losing trades', step: 0.1 },
                { label: 'Trading Capital', value: tradingCapital, set: (v: number) => setTradingCapital(Math.max(100, Math.min(100000000, v))), hint: 'Total available capital' },
              ].map(({ label, value, set, hint, step }) => (
                <div key={label}>
                  <label className="text-muted-foreground" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
                  <input type="number" value={value} step={step ?? 1}
                    onChange={e => set(parseNum(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 3 }}>{hint}</p>
                </div>
              ))}

              <div style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', paddingTop: 16 }}>
                <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Martingale Parameters</h3>
                {[
                  { label: 'Market Price', value: currentAssetPrice, set: (v: number) => setCurrentAssetPrice(Math.max(0.01, Math.min(10000000, v))), hint: 'Current asset price', step: 0.01 },
                  { label: 'Number of Entry Levels', value: entryLevels, set: (v: number) => setEntryLevels(Math.max(1, Math.min(10, Math.round(v)))), hint: 'How many times to buy as price drops (1–10)' },
                  { label: 'Price Drop Between Entries (%)', value: priceDropPercent, set: (v: number) => setPriceDropPercent(Math.max(0.1, Math.min(99, v))), hint: 'Buy again when price drops this % (0.1–99%)', step: 0.5 },
                ].map(({ label, value, set, hint, step }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</label>
                    <input type="number" value={value} step={step ?? 1}
                      onChange={e => set(parseNum(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                    <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 3 }}>{hint}</p>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)', paddingTop: 16 }}>
                <h3 className="text-foreground" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Compounding Duration</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input type="number" value={compoundingValue} min={1} max={600}
                    onChange={e => setCompoundingValue(Math.max(1, Math.min(600, parseNum(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)', alignItems: 'center' }}>
                    {(['day', 'month', 'year'] as DurationUnit[]).map(u => (
                      <button key={u} onClick={() => handleUnitChange(u)} className="notranslate" style={{ borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', border: 'none', padding: '6px 4px', background: compoundingUnit === u ? '#fff' : 'transparent', color: compoundingUnit === u ? '#000' : '#fff' }}>
                        {u === 'day' ? 'Day' : u === 'month' ? 'Mon' : 'Yr'}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground" style={{ fontSize: 10, marginTop: 6 }}>Set compounding period for growth projection</p>
              </div>
            </div>
          </div>

          {/* Main: 3 cols */}
          <div className="lg:col-span-3 space-y-6" style={{ minWidth: 0 }}>
            {/* Kelly Selector */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Kelly Fraction Selection</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {kellyOptions.map(({ key, label, sublabel }) => {
                  const val = fullKellyPct * ({ full: 1, half: 0.5, quarter: 0.25 }[key]);
                  const isSelected = selectedKelly === key;
                  return (
                    <button key={key} onClick={() => setSelectedKelly(key)} style={{
                      padding: '16px 20px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      border: isSelected ? '2px solid #B35900' : '2px solid color-mix(in oklab, var(--primary) 20%, transparent)',
                      background: isSelected ? '#B35900' : 'color-mix(in oklab, var(--primary) 5%, transparent)',
                      color: isSelected ? '#fff' : 'var(--foreground)',
                      boxShadow: isSelected ? '0 0 20px rgba(179,89,0,0.3)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                    }}>
                      <div>
                        <span className="notranslate" style={{ fontSize: 14, fontWeight: 800 }}>{label}</span>
                        <span className="notranslate" style={{ fontSize: 11, fontWeight: 600, marginLeft: 8, opacity: 0.75 }}>({sublabel})</span>
                      </div>
                      <span className="font-mono notranslate" style={{ fontSize: 22, fontWeight: 900 }}>{val.toFixed(2)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optimized Entry Levels */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Optimized Entry Levels</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {martingaleData.levels.map(level => (
                  <div key={level.level} style={{ padding: '14px 16px', borderRadius: 10, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="text-gold notranslate" style={{ fontSize: 13, fontWeight: 700 }}>Level {level.level}</span>
                      <span className="text-accent font-mono notranslate" style={{ fontSize: 13, fontWeight: 700 }}>{level.price.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 10, marginBottom: 2 }}>Shares</p>
                        <p className="text-foreground font-mono notranslate" style={{ fontSize: 13, fontWeight: 700 }}>{level.shares.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 10, marginBottom: 2 }}>Investment</p>
                        <p className="text-foreground font-mono notranslate" style={{ fontSize: 13, fontWeight: 700 }}>{level.investment.toFixed(0)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p className="text-muted-foreground" style={{ fontSize: 10, marginBottom: 2 }}>% of Capital</p>
                        <p className="text-accent font-mono notranslate" style={{ fontSize: 13, fontWeight: 700 }}>{level.percentOfTotal.toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compounding Growth Chart */}
            <div className="card-gold-glow p-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>
                  <span className="notranslate">{compoundingValue}</span><span>-</span><span className="notranslate">{unitLabel}</span><span> Compounding Growth</span>
                </h3>
                <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                  <span className="text-muted-foreground"><span>Final: </span><span className="text-gold font-mono notranslate">{finalBalance.toLocaleString()}</span></span>
                </div>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 20 }}>
                <span>Projected balance assuming </span><span className="notranslate">{targetMonthlyReturn}</span><span>% monthly return. Chart updates when you change any parameter.</span>
              </p>
              <div style={{ height: 420 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="vipGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={v => {
                        const n = v as number;
                        if (n >= 1000000000000) return `${(n / 1000000000000).toFixed(1)}T`;
                        if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
                        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
                        if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                        return String(Math.round(n));
                      }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: 8 }}
                      itemStyle={{ color: '#D4AF37' }}
                      formatter={(v, name) => [(v as number).toLocaleString(), name === 'balance' ? 'Total Balance' : 'Profit']}
                    />
                    <Area type="monotone" dataKey="balance" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#vipGrad)" name="balance" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)', display: 'flex', gap: 10 }}>
                <AlertCircle style={{ width: 16, height: 16, color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                <p className="text-muted-foreground" style={{ fontSize: 11, lineHeight: 1.6 }}>
                  <span>Projections assume consistent </span><span className="notranslate">{targetMonthlyReturn}</span><span>% monthly return through strategy execution. Past performance does not guarantee future results.</span>
                </p>
              </div>
            </div>

            {/* Strategy Execution Walkthrough */}
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Strategy Execution Walkthrough</h3>
              {kellyPct === 0 ? (
                <div style={{ padding: 16, borderRadius: 8, background: 'color-mix(in oklab, var(--destructive, #ef4444) 10%, transparent)', border: '1px solid color-mix(in oklab, var(--destructive, #ef4444) 30%, transparent)' }}>
                  <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6 }}>
                    <strong className="text-foreground">⚠️ Kelly Criterion = 0%</strong><span> — The current win rate / profit ratio combination yields a negative or zero edge. The strategy recommends </span><strong className="text-foreground">no position</strong><span>. Adjust your win rate or profit ratio to generate a positive expected value before executing this strategy.</span>
                  </p>
                </div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: 1, text: <><strong className="text-foreground">Entry (Level 1):</strong><span> Buy </span><span className="notranslate">{martingaleData.levels[0]?.shares.toFixed(4) ?? '—'}</span><span> units at </span><span className="notranslate">{currentAssetPrice.toFixed(2)}</span><span> → Deploy </span><span className="notranslate">{martingaleData.levels[0]?.investment.toFixed(0) ?? '—'}</span></> },
                  { step: 2, text: martingaleData.levels.length > 1 ? <><strong className="text-foreground"><span>After </span><span className="notranslate">{priceDropPercent}</span><span>% drop:</span></strong><span> Price reaches </span><span className="notranslate">{martingaleData.levels[1]?.price.toFixed(2)}</span><span> → Buy </span><span className="notranslate">{martingaleData.levels[1]?.shares.toFixed(4)}</span><span> more units</span></> : <><strong className="text-foreground"><span>After </span><span className="notranslate">{priceDropPercent}</span><span>% drop:</span></strong><span> Only 1 level configured — increase entry levels to use this step.</span></> },
                  { step: 3, text: <><strong className="text-foreground">Continue:</strong><span> Repeat for all </span><span className="notranslate">{entryLevels}</span><span> levels, accumulating </span><span className="notranslate">{martingaleData.totalShares.toFixed(4)}</span><span> total units</span></> },
                  { step: 4, text: <><strong className="text-foreground">Exit target:</strong><span> Sell all </span><span className="notranslate">{martingaleData.totalShares.toFixed(4)}</span><span> units at </span><span className="notranslate">{martingaleData.averagePrice.toFixed(2)}</span><span> or above → Recover full investment</span></> },
                ].map(({ step, text }) => (
                  <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'color-mix(in oklab, var(--primary) 20%, transparent)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700 }}>{step}</span>
                    <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ad */}
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12">
        <div className="container"><AdSense slot="1234567896" format="horizontal" responsive={true} /></div>
      </div>
      <Footer />
    </div>
  );
}
