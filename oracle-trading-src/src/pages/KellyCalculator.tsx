import { useState, useMemo } from 'react';
import { ChartColumn, TrendingUp } from 'lucide-react';
import { useNumberInput } from '../hooks/useNumberInput';
import { calculateKelly } from '../lib/calculations';
import { PageHeader, InputField, AlertCard, inputStyle } from '../components/Layout';

type KellyMode = 'full' | 'half' | 'quarter';

// Selected button color: dark orange #B35900 with white text
const SELECTED_BTN_STYLE: React.CSSProperties = {
  backgroundColor: '#B35900',
  color: '#ffffff',
  border: '1px solid #B35900',
};
const UNSELECTED_BTN_STYLE: React.CSSProperties = {
  backgroundColor: 'hsl(222 47% 12%)',
  color: 'hsl(50 20% 60%)',
  border: '1px solid hsl(45 100% 55% / 0.2)',
};

export default function KellyCalculator() {
  const winRate = useNumberInput(55);
  const avgWin = useNumberInput(2);
  const avgLoss = useNumberInput(1);
  const capital = useNumberInput(10000);
  const [selectedMode, setSelectedMode] = useState<KellyMode>('half');

  const w = Math.min(100, Math.max(0, winRate.value));
  const aw = Math.max(0.01, avgWin.value);
  const al = Math.max(0.01, avgLoss.value);
  const cap = Math.max(0, capital.value);

  const kelly = useMemo(() => calculateKelly(w, aw, al), [w, aw, al]);

  const isNegative = kelly.fullKelly === 0 && (w / 100) * (aw / al) - (1 - w / 100) < 0;
  const riskReward = al > 0 ? (aw / al).toFixed(2) : 'N/A';

  const fullSize = cap * kelly.fullKelly / 100;
  const halfSize = cap * kelly.halfKelly / 100;
  const quarterSize = cap * kelly.quarterKelly / 100;

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const modeData: Record<KellyMode, { label: string; fraction: number; size: number; desc: string; guidance: string }> = {
    full: { label: 'Full Kelly', fraction: kelly.fullKelly, size: fullSize, desc: 'Aggressive — Maximum growth potential', guidance: kelly.aggressiveGuidance },
    half: { label: 'Half Kelly (Conservative)', fraction: kelly.halfKelly, size: halfSize, desc: 'Balanced — Recommended for most traders', guidance: kelly.conservativeGuidance },
    quarter: { label: 'Quarter Kelly (Very Conservative)', fraction: kelly.quarterKelly, size: quarterSize, desc: 'Safe — Minimizes drawdown risk', guidance: kelly.conservativeGuidance },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(222 47% 6%)', color: 'hsl(50 100% 92%)' }}>
      <PageHeader title="Kelly Criterion Calculator" subtitle="Determine optimal position sizing for your trading strategy" icon={<ChartColumn size={20} />} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 32 }}>

          {/* Input Panel */}
          <div className="card-gold-glow" style={{ padding: 24, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'hsl(50 100% 92%)' }}>Strategy Parameters</h2>

            <InputField label="Win Rate (%)" hint="Your historical win rate percentage (0–100)">
              <input ref={winRate.ref} type="number" value={winRate.value} onChange={winRate.onChange} onInput={winRate.onInput} min="0" max="100" step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Average Win Profit (%)" hint="Average profit percentage per winning trade">
              <input ref={avgWin.ref} type="number" value={avgWin.value} onChange={avgWin.onChange} onInput={avgWin.onInput} min="0.01" step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Average Loss per Trade (%)" hint="Average loss percentage per losing trade">
              <input ref={avgLoss.ref} type="number" value={avgLoss.value} onChange={avgLoss.onChange} onInput={avgLoss.onInput} min="0.01" step="0.1" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Total Trading Capital" hint="Your total trading capital available">
              <input ref={capital.ref} type="number" value={capital.value} onChange={capital.onChange} onInput={capital.onInput} min="0" translate="no" style={inputStyle} />
            </InputField>

            {/* Risk-Reward Ratio display */}
            <div style={{ padding: 12, background: 'hsl(45 100% 55% / 0.1)', borderRadius: 8, border: '1px solid hsl(45 100% 55% / 0.2)' }}>
              <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 4 }}>Risk-Reward Ratio</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">1 : {riskReward}</p>
            </div>
          </div>

          {/* Main Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {isNegative && (
              <AlertCard type="error" title="Do Not Trade" message="With these parameters, the expected value is negative. Kelly Criterion recommends 0% position size — do not place this trade." />
            )}

            {/* Full / Half / Quarter Kelly buttons & cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(['full', 'half', 'quarter'] as KellyMode[]).map(mode => {
                const d = modeData[mode];
                const isSelected = selectedMode === mode;
                return (
                  <div
                    key={mode}
                    className="card-gold-glow"
                    style={{
                      padding: 20,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      ...(isSelected ? { borderColor: '#B35900', boxShadow: '0 0 12px #B3590044' } : {}),
                    }}
                    onClick={() => setSelectedMode(mode)}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = 'hsl(45 100% 55% / 0.4)')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = 'hsl(45 100% 55% / 0.2)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 4 }}>{d.label}</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{d.fraction.toFixed(2)}%</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 4 }}>Position Size</p>
                        <p style={{ fontSize: 22, fontWeight: 700, color: 'hsl(45 100% 70%)', fontFamily: 'monospace' }} translate="no">{fmt(d.size)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)' }}>{d.desc}</p>
                      {/* Selected indicator button */}
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedMode(mode); }}
                        style={{
                          padding: '4px 14px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          ...(isSelected ? SELECTED_BTN_STYLE : UNSELECTED_BTN_STYLE),
                        }}
                      >{isSelected ? 'Selected' : mode === 'full' ? 'Full' : mode === 'half' ? 'Half' : 'Quarter'}</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="card-gold-glow" style={{ padding: 20, borderLeft: '4px solid hsl(45 100% 55%)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <TrendingUp size={16} style={{ color: 'hsl(45 100% 55%)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(50 100% 92%)', marginBottom: 4 }}>Recommendation</p>
                  <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)' }}>
                    {modeData[selectedMode].guidance || 'Start with Half Kelly for balanced growth and risk management. Adjust based on your comfort level and market conditions.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="card-gold-glow" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {[
                  { label: 'Total Capital:', value: fmt(cap), color: 'hsl(45 100% 55%)' },
                  { label: 'Win Rate:', value: `${w.toFixed(1)}%`, color: 'hsl(45 100% 70%)' },
                  { label: 'Risk-Reward:', value: `1:${riskReward}`, color: 'hsl(45 100% 70%)' },
                  { label: 'Full Kelly:', value: `${kelly.fullKelly.toFixed(2)}%`, color: 'hsl(45 100% 55%)' },
                  { label: 'Half Kelly:', value: `${kelly.halfKelly.toFixed(2)}%`, color: 'hsl(45 100% 55%)' },
                  { label: 'Quarter Kelly:', value: `${kelly.quarterKelly.toFixed(2)}%`, color: 'hsl(45 100% 55%)' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(50 20% 60%)' }}>{r.label}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: r.color }} translate="no">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Info Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card-gold-glow" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>Understanding Kelly Criterion</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(45 100% 55%)', marginBottom: 4 }}>What is Kelly Criterion?</p>
                  <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.6 }}>
                    A mathematical formula that tells you what fraction of your bankroll to risk on each trade to maximize long-term growth while minimizing ruin risk.
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(45 100% 55%)', marginBottom: 4 }}>Formula</p>
                  <code style={{ fontSize: 12, color: 'hsl(50 100% 92%)', background: 'hsl(222 47% 12%)', padding: '8px', borderRadius: 6, display: 'block' }}>
                    f = (b·p − q) / b
                  </code>
                  <p style={{ fontSize: 11, color: 'hsl(50 20% 60%)', marginTop: 6, lineHeight: 1.5 }}>
                    p = win rate, q = 1−p, b = win/loss ratio
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(45 100% 55%)', marginBottom: 4 }}>Pro Tips</p>
                  <ul style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.7, paddingLeft: 16 }}>
                    <li>Use Half Kelly to reduce variance by 50%</li>
                    <li>Never exceed Full Kelly fraction</li>
                    <li>Recalculate after market conditions change</li>
                    <li>Combine with proper stop-loss management</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
