import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useNumberInput } from '../hooks/useNumberInput';
import { calculateCompound } from '../lib/calculations';
import { PageHeader, InputField, StatCard, AlertCard, inputStyle } from '../components/Layout';

type DurationUnit = 'days' | 'months' | 'years';

const unitLabels: Record<DurationUnit, string> = { days: 'Days', months: 'Months', years: 'Years' };

export default function CompoundCalculator() {
  const initial = useNumberInput(10000);
  const monthlyRate = useNumberInput(5);
  const duration = useNumberInput(12);
  const [unit, setUnit] = useState<DurationUnit>('months');

  const result = useMemo(
    () => calculateCompound(initial.value, monthlyRate.value, duration.value, unit),
    [initial.value, monthlyRate.value, duration.value, unit]
  );

  const isNegative = monthlyRate.value < 0;

  const unitDisplayLabel = unit === 'days' ? `${Math.ceil(duration.value)} days` : unit === 'years' ? `${duration.value} years` : `${duration.value} months`;

  // Format numbers without currency symbols — comma separated only
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtPct = (_n: number) => {
    const pct = result.totalProfit / Math.max(1, initial.value) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  const chartData = result.monthlyData.slice(0, 60); // cap for display

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(222 47% 6%)', color: 'hsl(50 100% 92%)' }}>
      <PageHeader title="Compound Interest Calculator" subtitle="Project your wealth growth with compound returns" icon={<TrendingUp size={20} />} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32 }}>

          {/* Input Panel */}
          <div className="card-gold-glow" style={{ padding: 24, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'hsl(50 100% 92%)' }}>Investment Parameters</h2>

            <InputField label="Starting Amount" hint="Your initial investment amount">
              <input ref={initial.ref} type="number" value={initial.value} onChange={initial.onChange} onInput={initial.onInput} min="0" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Monthly Return (%)" hint="Expected monthly return percentage">
              <input ref={monthlyRate.ref} type="number" value={monthlyRate.value} onChange={monthlyRate.onChange} onInput={monthlyRate.onInput} step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Investment Duration">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input ref={duration.ref} type="number" value={duration.value} onChange={duration.onChange} onInput={duration.onInput} min="1" translate="no" style={{ ...inputStyle, width: 80 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['days', 'months', 'years'] as DurationUnit[]).map(u => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        backgroundColor: unit === u ? 'hsl(45 100% 55%)' : 'hsl(222 47% 9%)',
                        color: unit === u ? 'hsl(222 47% 6%)' : 'hsl(50 20% 60%)',
                        transition: 'all 0.15s',
                      }}
                    >{unitLabels[u]}</button>
                  ))}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)' }}>
                {unit === 'days' ? `${Math.ceil(duration.value / 30.44)} months approximately` : unit === 'years' ? `${duration.value * 12} months` : `${duration.value} months`}
              </p>
            </InputField>
          </div>

          {/* Results Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {isNegative && (
              <AlertCard type="error" title="Negative Return Rate" message="A negative monthly return means your balance will decrease over time. The projection below shows the expected loss." />
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <StatCard
                label="Final Balance"
                value={fmt(result.finalAmount)}
                subtext={`After ${unitDisplayLabel}`}
                valueStyle={{ color: 'hsl(45 100% 55%)' }}
              />
              <StatCard
                label="Total Gain"
                value={fmt(result.totalProfit)}
                subtext="Pure profit earned"
                valueStyle={{ color: result.totalProfit >= 0 ? 'hsl(120 60% 55%)' : 'hsl(0 84% 60%)' }}
              />
              <StatCard
                label="Initial Investment"
                value={fmt(initial.value)}
                subtext="Your starting capital"
                valueStyle={{ color: 'hsl(45 100% 70%)' }}
              />
              <StatCard
                label="Total Return"
                value={fmtPct(result.totalProfit)}
                subtext="Return on initial capital"
                valueStyle={{ color: result.totalProfit >= 0 ? 'hsl(120 60% 55%)' : 'hsl(0 84% 60%)' }}
              />
            </div>

            {/* Chart */}
            <div className="card-gold-glow" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>Growth Projection</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45 100% 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(45 100% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 18%)" />
                  <XAxis dataKey="month" stroke="hsl(50 20% 60%)" tick={{ fill: 'hsl(50 20% 60%)', fontSize: 11 }} />
                  <YAxis stroke="hsl(50 20% 60%)" tick={{ fill: 'hsl(50 20% 60%)', fontSize: 11 }} tickFormatter={v => v.toLocaleString('en-US')} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(222 47% 9%)', border: '1px solid hsl(45 100% 55% / 0.3)', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(50 100% 92%)' }}
                    formatter={(v) => [(v as number).toLocaleString('en-US', { maximumFractionDigits: 0 }), 'Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="hsl(45 100% 55%)" fill="url(#colorBalance)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown Table */}
            <div className="card-gold-glow" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>
                {unit === 'days' ? 'Day-by-Day Breakdown' : 'Month-by-Month Breakdown'}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(45 100% 55% / 0.2)' }}>
                      {[unit === 'days' ? 'Day' : 'Month', 'Balance', 'Profit'].map(h => (
                        <th key={h} style={{ padding: '8px', textAlign: 'left', color: 'hsl(50 20% 60%)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.monthlyData.slice(0, 120).map(row => (
                      <tr key={row.month} style={{ borderBottom: '1px solid hsl(45 100% 55% / 0.08)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsl(45 100% 55% / 0.05)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '8px', color: 'hsl(50 100% 92%)', fontWeight: 600 }} translate="no">
                          {unit === 'days' ? 'Day' : 'Month'} {row.month}
                        </td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: 'hsl(45 100% 55%)' }} translate="no">{fmt(row.balance)}</td>
                        <td style={{ padding: '8px', fontFamily: 'monospace', color: row.profit >= 0 ? 'hsl(120 60% 55%)' : 'hsl(0 84% 60%)' }} translate="no">
                          {row.profit >= 0 ? '+' : ''}{fmt(row.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
