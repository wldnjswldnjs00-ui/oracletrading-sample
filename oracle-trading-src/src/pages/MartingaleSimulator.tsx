import { useState, useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import { useNumberInput } from '../hooks/useNumberInput';
import { PageHeader, InputField, AlertCard, inputStyle } from '../components/Layout';

interface Level {
  level: number;
  price: number;
  qty: number;
  capital: number;
  pctOfTotal: number;
}

export default function MartingaleSimulator() {
  const capitalInput = useNumberInput(10000);
  const priceInput = useNumberInput(100);
  const dropInput = useNumberInput(5);
  const [quantities, setQuantities] = useState<number[]>([10, 15, 20, 25]);

  const capital = Math.max(0, capitalInput.value);
  const price = Math.max(0.01, priceInput.value);
  const drop = Math.min(99, Math.max(0.01, dropInput.value));

  const levels: Level[] = useMemo(() => {
    return quantities.map((qty, i) => {
      const p = price * Math.pow(1 - drop / 100, i);
      const cap = qty * p;
      return { level: i + 1, price: p, qty, capital: cap, pctOfTotal: 0 };
    });
  }, [quantities, price, drop]);

  const totalCapital = levels.reduce((s, l) => s + l.capital, 0);
  const totalQty = levels.reduce((s, l) => s + l.qty, 0);
  const avgPrice = totalQty > 0 ? totalCapital / totalQty : 0;
  const exceedsCapital = totalCapital > capital;

  // Profit at different target prices (2% above avg)
  const profitTargets = [
    { label: '+2%', price: avgPrice * 1.02 },
    { label: '+5%', price: avgPrice * 1.05 },
    { label: '+10%', price: avgPrice * 1.10 },
    { label: '+20%', price: avgPrice * 1.20 },
  ].map(t => ({
    label: t.label,
    price: t.price,
    profit: (t.price - avgPrice) * totalQty,
  }));

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const updateQty = (idx: number, val: string) => {
    const v = Math.max(0, Math.round(parseFloat(val) || 0));
    setQuantities(q => { const n = [...q]; n[idx] = v; return n; });
  };
  const addLevel = () => setQuantities(q => [...q, Math.max(1, Math.round(q[q.length - 1] * 1.5))]);
  const removeLevel = () => setQuantities(q => q.length > 1 ? q.slice(0, -1) : q);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(222 47% 6%)', color: 'hsl(50 100% 92%)' }}>
      <PageHeader title="Martingale Simulator" subtitle="Model pyramid entry strategies with share-based averaging" icon={<GitBranch size={20} />} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 240px 1fr', gap: 24 }}>

          {/* Config Panel */}
          <div className="card-gold-glow" style={{ padding: 20, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'hsl(50 100% 92%)' }}>Strategy Configuration</h2>

            <InputField label="Available Capital" hint="Your total capital for this strategy">
              <input ref={capitalInput.ref} type="number" value={capitalInput.value} onChange={capitalInput.onChange} onInput={capitalInput.onInput} min="0" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Current Price per Unit" hint="Current price of the stock / coin / asset">
              <input ref={priceInput.ref} type="number" value={priceInput.value} onChange={priceInput.onChange} onInput={priceInput.onInput} min="0.01" step="0.01" translate="no" style={inputStyle} />
            </InputField>

            <InputField label="Price Drop Between Entries (%)" hint="Buy again when price drops this % (e.g., 5% = -5%, -10%, -15%)">
              <input ref={dropInput.ref} type="number" value={dropInput.value} onChange={dropInput.onChange} onInput={dropInput.onInput} min="0.01" max="99" step="0.5" translate="no" style={inputStyle} />
            </InputField>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addLevel} style={{ flex: 1, padding: '8px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                + Add Level
              </button>
              <button onClick={removeLevel} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'hsl(0 84% 60% / 0.2)', color: 'hsl(0 84% 60%)', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                − Remove
              </button>
            </div>
          </div>

          {/* Entry Levels Panel */}
          <div className="card-gold-glow" style={{ padding: 20, alignSelf: 'start', position: 'sticky', top: 88 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>Entry Levels</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
              {levels.map((l, i) => (
                <div key={i} style={{ background: 'hsl(45 100% 55% / 0.1)', padding: 12, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(45 100% 55%)' }}>Level {l.level}</span>
                    <span style={{ fontSize: 12, color: 'hsl(45 100% 70%)', fontFamily: 'monospace' }} translate="no">{l.price.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    value={l.qty}
                    onChange={e => updateQty(i, e.target.value)}
                    onInput={e => updateQty(i, (e.target as HTMLInputElement).value)}
                    min="0"
                    translate="no"
                    style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', marginBottom: 8 }}
                    placeholder="Quantity"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(50 20% 60%)' }}>Capital:</span>
                      <span style={{ fontFamily: 'monospace', color: 'hsl(45 100% 55%)' }} translate="no">{l.capital.toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'hsl(50 20% 60%)' }}>% of Total:</span>
                      <span style={{ fontFamily: 'monospace', color: 'hsl(45 100% 70%)' }} translate="no">
                        {totalCapital > 0 ? (l.capital / totalCapital * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid hsl(45 100% 55% / 0.2)', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              {[
                { label: 'Total Quantity:', value: fmt(totalQty), color: 'hsl(45 100% 55%)' },
                { label: 'Total Capital:', value: fmt(totalCapital), color: 'hsl(45 100% 55%)' },
                { label: 'Avg Entry Price:', value: avgPrice.toFixed(2), color: 'hsl(45 100% 70%)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'hsl(50 20% 60%)' }}>{r.label}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: r.color }} translate="no">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {exceedsCapital && (
              <AlertCard type="error" title="Insufficient Capital" message={`Total investment required (${fmt(totalCapital)}) exceeds available capital (${fmt(capital)}). Reduce quantities or add capital.`} />
            )}

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div className="card-gold-glow" style={{ padding: 16 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 4 }}>Total Investment Required</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{fmt(totalCapital)}</p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 4 }}>Sum of all entry levels</p>
              </div>
              <div className="card-gold-glow" style={{ padding: 16 }}>
                <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 4 }}>Average Entry Price</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'hsl(45 100% 55%)', fontFamily: 'monospace' }} translate="no">{avgPrice.toFixed(2)}</p>
                <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 4 }}>Weighted average cost</p>
              </div>
            </div>

            {/* Risk assessment */}
            <div className="card-gold-glow" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>Risk Assessment</h3>
              {(() => {
                const ratio = capital > 0 ? totalCapital / capital : 0;
                const isExtreme = ratio > 0.8;
                const isHigh = ratio > 0.5;
                const isModerate = ratio > 0.2;
                const color = isExtreme ? 'hsl(0 84% 60%)' : isHigh ? 'hsl(25 100% 55%)' : isModerate ? 'hsl(50 100% 55%)' : 'hsl(120 60% 50%)';
                const msg = isExtreme ? 'EXTREME RISK: Over 80% of capital required.' : isHigh ? 'HIGH RISK: Over 50% of capital required.' : isModerate ? 'MODERATE RISK: 20–50% of capital required.' : 'LOW RISK: Less than 20% of capital required.';
                return <p style={{ fontSize: 13, color, fontWeight: 600 }}>{msg}</p>;
              })()}
            </div>

            {/* Profit at target prices */}
            <div className="card-gold-glow" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'hsl(50 100% 92%)' }}>Profit at Different Prices</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profitTargets.map(t => (
                  <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'hsl(45 100% 55% / 0.1)', borderRadius: 6 }}>
                    <span style={{ fontSize: 13, color: 'hsl(50 20% 60%)' }}>{t.label} ({t.price.toFixed(2)})</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: t.profit >= 0 ? 'hsl(120 60% 50%)' : 'hsl(0 84% 60%)' }} translate="no">
                      {t.profit >= 0 ? '+' : ''}{fmt(t.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="card-gold-glow" style={{ padding: 16, borderLeft: '4px solid hsl(45 100% 55%)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(50 100% 92%)', marginBottom: 8 }}>How This Works</p>
              <div style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p><strong style={{ color: 'hsl(50 100% 92%)' }}>1. First Entry:</strong> Purchase {quantities[0]} units at {price.toFixed(2)}</p>
                <p><strong style={{ color: 'hsl(50 100% 92%)' }}>2. Each Drop:</strong> Buy again at each {drop}% price decrease</p>
                <p><strong style={{ color: 'hsl(50 100% 92%)' }}>3. Exit:</strong> Sell all {fmt(totalQty)} units at average price ({avgPrice.toFixed(2)}) or above</p>
              </div>
            </div>

            {/* Strategy notes */}
            <div className="card-gold-glow" style={{ padding: 16, borderLeft: '4px solid hsl(45 100% 55%)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(50 100% 92%)', marginBottom: 4 }}>Strategy Notes</p>
              <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', lineHeight: 1.6 }}>
                Works best in ranging markets. Stop buying if price continues falling beyond your capital limit. Consider your risk tolerance carefully.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
