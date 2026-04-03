import { useState, useMemo } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useNumberInput } from '../hooks/useNumberInput';
import { calculateKelly, calculateVIPMartingale, calculateGrowthProjection } from '../lib/calculations';
import { PageHeader, InputField, AlertCard, inputStyle, selectStyle } from '../components/Layout';

type PeriodUnit = 'Day' | 'Month' | 'Year';

export default function VIPStrategy() {
  const targetReturn = useNumberInput(10);
  const winRate = useNumberInput(55);
  const avgWin = useNumberInput(2);
  const avgLoss = useNumberInput(1);
  const capitalInput = useNumberInput(10000);
  const priceInput = useNumberInput(100);
  const levelsInput = useNumberInput(4);
  const dropInput = useNumberInput(5);

  // ③ Period setting inputs
  const periodValueInput = useNumberInput(12);
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('Month');

  const p = Math.min(100, Math.max(0, winRate.value));
  const aw = Math.max(0.01, avgWin.value);
  const al = Math.max(0.01, avgLoss.value);
  const capital = Math.max(0, capitalInput.value);
  const price = Math.max(0.01, priceInput.value);
  const levels = Math.max(1, Math.min(10, Math.round(levelsInput.value)));
  const drop = Math.min(99, Math.max(0.01, dropInput.value));
  const periodValue = Math.max(1, Math.round(periodValueInput.value));

  const kelly = useMemo(() => calculateKelly(p, aw, al), [p, aw, al]);
  const halfKellyFraction = kelly.halfKelly; // use half kelly for VIP
  const isNegative = kelly.fullKelly === 0 && (p / 100) * (aw / al) - (1 - p / 100) < 0;

  const martingaleResult = useMemo(
    () => calculateVIPMartingale(capital, halfKellyFraction, price, levels, drop),
    [capital, halfKellyFraction, price, levels, drop]
  );

  const exceedsCapital = martingaleResult.totalInvested > capital;
  const remainingCapital = Math.max(0, capital - martingaleResult.totalInvested);

  // ③ Dynamic growth projection — uses capital, targetReturn, periodValue, periodUnit
  const projectionData = useMemo(
    () => calculateGrowthProjection(capital, targetReturn.value, periodValue, periodUnit),
    [capital, targetReturn.value, periodValue, periodUnit]
  );

  // ③ Dynamic title based on user settings
  const projectionTitle = `${periodValue}-${periodUnit} Growth Projection`;

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(222 47% 6%)', color: 'hsl(50 100% 92%)' }}>
      <PageHeader
        title="VIP Integrated Strategy"
        subtitle="Kelly Criterion + Martingale Pyramid Combined"
        icon={<Star size={20} />}
        isVip
      />

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 220px 1fr', gap: 24 }}>

          {/* ===== LEFT: Strategy Configuration ===== */}
          <div className="card-gold-glow" style={{ padding: 20, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'hsl(50 100% 92%)' }}>Strategy Configuration</h2>

            <InputField label="Target Monthly Return (%)" hint="Your monthly profit goal (e.g., 10% per month)">
              <input ref={targetReturn.ref} type="number" value={targetReturn.value} onChange={targetReturn.onChange} onInput={targetReturn.onInput} step="0.5" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Win Rate (%)" hint="Your historical win rate (0–100%)">
              <input ref={winRate.ref} type="number" value={winRate.value} onChange={winRate.onChange} onInput={winRate.onInput} min="0" max="100" step="1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Avg Profit per Win (%)" hint="Average profit when you win">
              <input ref={avgWin.ref} type="number" value={avgWin.value} onChange={avgWin.onChange} onInput={avgWin.onInput} min="0.01" step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Avg Loss per Loss (%)" hint="Average loss when you lose">
              <input ref={avgLoss.ref} type="number" value={avgLoss.value} onChange={avgLoss.onChange} onInput={avgLoss.onInput} min="0.01" step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Total Trading Capital" hint="Your total available trading capital">
              <input ref={capitalInput.ref} type="number" value={capitalInput.value} onChange={capitalInput.onChange} onInput={capitalInput.onInput} min="0" translate="no" style={inputStyle} />
            </InputField>

            {/* Martingale Parameters section */}
            <div style={{ borderTop: '1px solid hsl(45 100% 55% / 0.2)', paddingTop: 20, marginTop: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>Martingale Parameters</h3>

              <InputField label="Current Price per Unit" hint="Current price of the stock / coin / asset">
                <input ref={priceInput.ref} type="number" value={priceInput.value} onChange={priceInput.onChange} onInput={priceInput.onInput} min="0.01" step="0.01" translate="no" style={inputStyle} />
              </InputField>

              <InputField label="Number of Entry Levels" hint="How many times to buy as price drops (1–10)">
                <input ref={levelsInput.ref} type="number" value={levelsInput.value} onChange={levelsInput.onChange} onInput={levelsInput.onInput} min="1" max="10" step="1" translate="no" style={inputStyle} />
              </InputField>

              <InputField label="Price Drop Between Entries (%)" hint="Buy again when price drops this much (e.g., 5% = buy at -5%, -10%, -15%)">
                <input ref={dropInput.ref} type="number" value={dropInput.value} onChange={dropInput.onChange} onInput={dropInput.onInput} min="0.01" max="99" step="0.5" translate="no" style={inputStyle} />
              </InputField>
            </div>

            {/* ③ Period Setting — added at bottom of Strategy Configuration */}
            <div style={{ borderTop: '1px solid hsl(45 100% 55% / 0.2)', paddingTop: 20, marginTop: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>Projection Period</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={periodValueInput.ref}
                  type="number"
                  value={periodValueInput.value}
                  onChange={periodValueInput.onChange}
                  onInput={periodValueInput.onInput}
                  min="1"
                  translate="no"
                  style={{ ...inputStyle, width: 80 }}
                />
                <select
                  value={periodUnit}
                  onChange={e => setPeriodUnit(e.target.value as PeriodUnit)}
                  style={selectStyle}
                >
                  <option value="Day">Day</option>
                  <option value="Month">Month</option>
                  <option value="Year">Year</option>
                </select>
              </div>
              <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginTop: 6 }}>
                Chart will show {periodValue}-{periodUnit} projection
              </p>
            </div>
          </div>

          {/* ===== MIDDLE: Entry Levels ===== */}
          <div className="card-gold-glow" style={{ padding: 20, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>Entry Levels</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {martingaleResult.levels.map(l => (
                <div key={l.level} style={{ background: 'hsl(45 100% 55% / 0.1)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(45 100% 55%)' }}>Level {l.level}</span>
                    <span style={{ fontSize: 12, color: 'hsl(45 100% 70%)', fontFamily: 'monospace' }} translate="no">{l.price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(50 20% 60%)' }}>Quantity:</span>
                      <span style={{ fontFamily: 'monospace', color: 'hsl(50 100% 92%)' }} translate="no">{l.shares.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(50 20% 60%)' }}>Capital:</span>
                      <span style={{ fontFamily: 'monospace', color: 'hsl(45 100% 55%)' }} translate="no">{l.investment.toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(50 20% 60%)' }}>% of Total:</span>
                      <span style={{ fontFamily: 'monospace', color: 'hsl(45 100% 70%)' }} translate="no">{l.percentOfTotal.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid hsl(45 100% 55% / 0.2)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {[
                { label: 'Total Quantity:', value: martingaleResult.totalShares.toFixed(2), color: 'hsl(45 100% 55%)' },
                { label: 'Total Capital:', value: fmt(martingaleResult.totalInvested), color: 'hsl(45 100% 55%)' },
                { label: 'Avg Entry Price:', value: martingaleResult.averagePrice.toFixed(2), color: 'hsl(45 100% 70%)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(50 20% 60%)' }}>{r.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }} translate="no">{r.value}</span>
                </div>
              ))}
            </div>

            {/* ③ Dynamic Growth Chart — inserted below the Martingale Entry Levels table */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid hsl(45 100% 55% / 0.2)' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>
                {projectionTitle}
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={projectionData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="vipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45 100% 55%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(45 100% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 18%)" />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(50 20% 60%)"
                    tick={{ fill: 'hsl(50 20% 60%)', fontSize: 10 }}
                    interval={Math.ceil(projectionData.length / 5) - 1}
                  />
                  <YAxis
                    stroke="hsl(50 20% 60%)"
                    tick={{ fill: 'hsl(50 20% 60%)', fontSize: 10 }}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(222 47% 9%)', border: '1px solid hsl(45 100% 55% / 0.3)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(50 100% 92%)' }}
                    formatter={(v) => [(v as number).toLocaleString('en-US', { maximumFractionDigits: 0 }), 'Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="hsl(45 100% 55%)" fill="url(#vipGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== RIGHT: Main Results ===== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isNegative && (
              <AlertCard type="error" title="Negative Expected Value" message="With these parameters, the Kelly Criterion recommends 0% position size. Adjust your win rate or profit/loss ratio before trading." />
            )}
            {exceedsCapital && (
              <AlertCard type="warning" title="Strategy Exceeds Available Capital" message="The strategy requires more capital than available. Reduce entry levels or increase capital." />
            )}

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="card-gold-glow" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>Kelly Fraction (Half)</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{halfKellyFraction.toFixed(2)}%</p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 8 }}>Position size per trade</p>
              </div>
              <div className="card-gold-glow" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>Break-Even Price</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{martingaleResult.breakEvenPrice.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 8 }} translate="no">
                  {martingaleResult.breakEvenPrice > price
                    ? `↑ ${((martingaleResult.breakEvenPrice / price - 1) * 100).toFixed(1)}% above current`
                    : `↓ ${((1 - martingaleResult.breakEvenPrice / price) * 100).toFixed(1)}% below current`}
                </p>
              </div>
              <div className="card-gold-glow" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>Total Capital Required</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{fmt(martingaleResult.totalInvested)}</p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 8 }}>For all {levels} entry levels</p>
              </div>
              <div className="card-gold-glow" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>Available Capital</p>
                <p style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: exceedsCapital ? 'hsl(0 84% 60%)' : 'hsl(45 100% 55%)' }} translate="no">
                  {fmt(remainingCapital)}
                </p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 8 }}>Remaining after strategy</p>
              </div>
            </div>

            {/* How This Strategy Works */}
            <div className="card-gold-glow" style={{ padding: 20, borderLeft: '4px solid hsl(45 100% 55%)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={16} style={{ color: 'hsl(45 100% 55%)', flexShrink: 0, marginTop: 2 }} />
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'hsl(50 100% 92%)', margin: 0 }}>How This Strategy Works</h4>
              </div>
              <div style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p>
                  <strong style={{ color: 'hsl(50 100% 92%)' }}>1. First Entry:</strong>{' '}
                  Buy <span translate="no">{martingaleResult.levels[0]?.shares.toFixed(2) ?? '0'}</span> units at{' '}
                  <span translate="no">{price.toFixed(2)}</span>
                </p>
                <p>
                  <strong style={{ color: 'hsl(50 100% 92%)' }}>2. If Price Drops <span translate="no">{drop}%</span>:</strong>{' '}
                  Buy <span translate="no">{martingaleResult.levels[1]?.shares.toFixed(2) ?? '0'}</span> more units at{' '}
                  <span translate="no">{martingaleResult.levels[1]?.price.toFixed(2) ?? '0'}</span>
                </p>
                <p>
                  <strong style={{ color: 'hsl(50 100% 92%)' }}>3. Continue:</strong> Repeat for all <span translate="no">{levels}</span> levels
                </p>
                <p>
                  <strong style={{ color: 'hsl(50 100% 92%)' }}>4. Exit:</strong>{' '}
                  When price reaches <span translate="no">{martingaleResult.breakEvenPrice.toFixed(2)}</span> (break-even), sell all units
                </p>
              </div>
            </div>

            {/* ③ Dynamic Projection — table view + chart title changes */}
            <div className="card-gold-glow" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>
                {projectionTitle}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>
                {projectionData.map(d => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'hsl(45 100% 55% / 0.08)', borderRadius: 6 }}>
                    <span style={{ color: 'hsl(50 20% 60%)' }}>{d.label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'hsl(50 100% 92%)' }} translate="no">
                        {fmt(d.balance)}
                      </div>
                      <div style={{ color: d.profit >= 0 ? 'hsl(120 60% 50%)' : 'hsl(0 84% 60%)' }} translate="no">
                        {d.profit >= 0 ? '+' : ''}{fmt(d.profit)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notes */}
            <div className="card-gold-glow" style={{ padding: 20, borderLeft: '4px solid hsl(45 100% 55%)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <TrendingUp size={16} style={{ color: 'hsl(45 100% 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(50 100% 92%)', marginBottom: 4 }}>Important Notes</p>
                  <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.6 }}>
                    This strategy requires sufficient capital to execute all <span translate="no">{levels}</span> levels.
                    If price continues falling beyond your capital limit, you cannot execute all entries.
                    Use this as a guideline and adjust parameters based on your risk tolerance.
                    Always consult with a financial advisor before trading.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
