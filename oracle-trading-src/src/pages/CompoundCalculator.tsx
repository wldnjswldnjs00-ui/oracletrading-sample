import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';

type DurationUnit = 'Day' | 'Month' | 'Year';
const parseNum = (val: string) => { const n = parseFloat(val.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };

export default function CompoundCalculator() {
  const [, navigate] = useLocation();
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [returnRate, setReturnRate] = useState(10);
  const [duration, setDuration] = useState(12);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('Month');

  const result = useMemo(() => {
    if (!initialInvestment || !returnRate || !duration) return null;
    const r = returnRate / 100;
    const schedule = [];
    for (let i = 0; i <= duration; i++) {
      const balance = initialInvestment * Math.pow(1 + r, i);
      const prevBalance = i > 0 ? initialInvestment * Math.pow(1 + r, i - 1) : initialInvestment;
      const interest = i === 0 ? 0 : balance - prevBalance;
      const cumulativeRoi = ((balance - initialInvestment) / initialInvestment) * 100;
      schedule.push({ period: i, balance, interest, cumulativeRoi });
    }
    const finalBalance = initialInvestment * Math.pow(1 + r, duration);
    const totalInterest = finalBalance - initialInvestment;
    const roi = (totalInterest / initialInvestment) * 100;
    return { finalBalance, totalInterest, roi, schedule };
  }, [initialInvestment, returnRate, duration]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.schedule.map(s => ({ period: `${durationUnit} ${s.period}`, balance: Math.round(s.balance) }));
  }, [result, durationUnit]);

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
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Compound Interest Calculator</h1>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>Visualize the power of exponential growth</p>
          </div>
        </div>
      </header>
      <div className="bg-card/50 py-4 border-b border-primary/20"><div className="container"><AdSense slot="1234567891" format="horizontal" responsive={true} /></div></div>
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="hidden lg:block"><SidebarAds /></div>
          <div className="lg:col-span-4 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              <div className="card-gold-glow p-6" style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className="text-foreground" style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Investment Parameters</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Initial Investment</label>
                    <input type="number" value={initialInvestment} onChange={e => setInitialInvestment(Math.max(0, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Return Rate (%)</label>
                    <input type="number" value={returnRate} onChange={e => setReturnRate(Math.max(0, parseNum(e.target.value)))} step="0.1" className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Investment Duration</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                      <input type="number" value={duration} onChange={e => setDuration(Math.max(1, parseNum(e.target.value)))} className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, padding: 4, background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)', height: 38 }}>
                        {(['Day', 'Month', 'Year'] as DurationUnit[]).map(u => (
                          <button key={u} onClick={() => setDurationUnit(u)} style={{ borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: durationUnit === u ? '#fff' : 'transparent', color: durationUnit === u ? '#000' : '#fff' }}>{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Final Balance', value: (result?.finalBalance ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'var(--gold)', cls: 'text-gold' },
                  { label: 'Total Gain', value: (result?.totalInterest ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'var(--accent)', cls: 'text-accent' },
                  { label: 'Return on Investment', value: `${(result?.roi ?? 0).toFixed(2)}%`, color: 'var(--gold)', cls: 'text-gold' },
                ].map(({ label, value, color, cls }) => (
                  <div key={label} className="card-gold-glow p-6" style={{ borderLeft: `4px solid ${color}`, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="text-muted-foreground">
                      <TrendingUp style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    </div>
                    <p className={`${cls} font-mono notranslate`} style={{ fontSize: 36, fontWeight: 900 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-gold-glow p-6">
              <h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp style={{ width: 20, height: 20, color: 'var(--gold)' }} /> Growth Projection
              </h3>
              <div style={{ height: 400, width: '100%' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="period" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${((v as number) / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #D4AF37', borderRadius: 8 }} itemStyle={{ color: '#D4AF37' }} formatter={(v) => [(v as number).toLocaleString(), 'Balance']} />
                      <Area type="monotone" dataKey="balance" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} className="text-muted-foreground">Enter parameters to see projection</div>
                )}
              </div>
            </div>
            <div className="card-gold-glow" style={{ overflow: 'hidden' }}>
              <div style={{ padding: 24 }}><h3 className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>{durationUnit}-by-{durationUnit} Breakdown</h3></div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'color-mix(in oklab, var(--primary) 5%, transparent)' }}>
                      {[durationUnit, 'Total Asset', 'Profit', 'ROI %'].map(h => (
                        <th key={h} className="text-muted-foreground" style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result ? result.schedule.slice(1).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid color-mix(in oklab, var(--primary) 5%, transparent)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--primary) 5%, transparent)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="text-muted-foreground font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{durationUnit} {s.period}</td>
                        <td className="text-gold font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700 }}>{s.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                        <td className="text-accent font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600 }}>+{s.interest.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                        <td className="text-gold font-mono notranslate" style={{ padding: '16px 24px', fontSize: 13 }}>{s.cumulativeRoi.toFixed(2)}%</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center' }} className="text-muted-foreground">Enter investment details to generate breakdown</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12"><div className="container"><AdSense slot="1234567892" format="horizontal" responsive={true} /></div></div>
    </div>
  );
}
