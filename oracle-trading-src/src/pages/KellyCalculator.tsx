import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';

export default function KellyCalculator() {
  const [, navigate] = useLocation();
  const [winRate, setWinRate] = useState(60);
  const [profitRatio, setProfitRatio] = useState(2);
  const [lossRatio, setLossRatio] = useState(1);
  const [selectedKelly, setSelectedKelly] = useState<'full' | 'half' | 'quarter'>('half');

  // Chrome translation safe number parser
  const parseNum = (val: string) => {
    const n = parseFloat(val.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const kellyCalculation = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    
    const fullKelly = (p * b - q) / b;
    const halfKelly = fullKelly / 2;
    const quarterKelly = fullKelly / 4;
    
    return {
      fullKelly: Math.max(0, fullKelly * 100),
      halfKelly: Math.max(0, halfKelly * 100),
      quarterKelly: Math.max(0, quarterKelly * 100),
      isValid: fullKelly > 0
    };
  }, [winRate, profitRatio, lossRatio]);

  const kellyValue = selectedKelly === 'full' ? kellyCalculation.fullKelly : 
                     selectedKelly === 'half' ? kellyCalculation.halfKelly : 
                     kellyCalculation.quarterKelly;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gold" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              <h1 className="text-2xl font-bold text-foreground">Kelly Criterion Calculator</h1>
            </div>
            <p className="text-xs text-muted-foreground">Optimal position sizing for maximum growth</p>
          </div>
        </div>
      </header>

      {/* Top Banner Ad */}
      <div className="bg-card/50 py-4 border-b border-primary/20">
        <div className="container">
          <AdSense slot="1234567899" format="horizontal" responsive={true} />
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sidebar Ads */}
          <div className="hidden lg:block">
            <SidebarAds />
          </div>

          {/* Left: Input Form */}
          <div className="lg:col-span-1">
            <div className="card-gold-glow p-6 sticky top-24 space-y-6">
              <h2 className="text-xl font-bold mb-6 text-foreground">Input Parameters</h2>

              {/* Win Rate */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Win Rate (%)
                </label>
                <input
                  type="number"
                  value={winRate}
                  onChange={(e) => setWinRate(Math.max(0, Math.min(100, parseNum(e.target.value))))}
                  step="1"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Your historical win rate (0-100%)</p>
              </div>

              {/* Profit Ratio */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Avg Profit per Win (%)
                </label>
                <input
                  type="number"
                  value={profitRatio}
                  onChange={(e) => setProfitRatio(Math.max(0.1, parseNum(e.target.value)))}
                  step="0.1"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Average profit when you win</p>
              </div>

              {/* Loss Ratio */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">
                  Avg Loss per Loss (%)
                </label>
                <input
                  type="number"
                  value={lossRatio}
                  onChange={(e) => setLossRatio(Math.max(0.1, parseNum(e.target.value)))}
                  step="0.1"
                  className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Average loss when you lose</p>
              </div>
            </div>
          </div>

          {/* Center: Kelly Calculation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Kelly Selection */}
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-6 text-foreground">Kelly Fraction Selection</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'full', label: 'Full Kelly', value: kellyCalculation.fullKelly },
                  { key: 'half', label: 'Half Kelly', value: kellyCalculation.halfKelly },
                  { key: 'quarter', label: 'Quarter Kelly', value: kellyCalculation.quarterKelly }
                ].map(({ key, label, value }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedKelly(key as 'full' | 'half' | 'quarter')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedKelly === key
                        ? 'border-gold bg-gold/10 shadow-lg shadow-gold/20'
                        : 'border-primary/20 bg-primary/5 hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground mb-2">{label}</p>
                    <p className="text-2xl font-bold text-gold font-mono">{value.toFixed(2)}%</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculation Details */}
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-6 text-foreground">Calculation Details</h3>
              <div className="space-y-4 text-sm">
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-muted-foreground mb-1">Formula</p>
                  <p className="font-mono text-foreground">f = (p × b - q) / b</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-muted-foreground mb-1">Win Probability (p)</p>
                    <p className="font-mono text-gold font-bold">{(winRate / 100).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-muted-foreground mb-1">Loss Probability (q)</p>
                    <p className="font-mono text-accent font-bold">{((100 - winRate) / 100).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-muted-foreground mb-1">Profit/Loss Ratio (b)</p>
                    <p className="font-mono text-accent font-bold">{(profitRatio / lossRatio).toFixed(2)}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-muted-foreground mb-1">Full Kelly</p>
                    <p className="font-mono text-gold font-bold">{kellyCalculation.fullKelly.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Position Size */}
            <div className="card-gold-glow p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-gold" />
                <h3 className="text-lg font-bold text-foreground">Recommended Position Size</h3>
              </div>
              <div className="bg-gold/10 border border-gold/20 rounded-xl p-6">
                <p className="text-muted-foreground mb-2">Risk {kellyValue.toFixed(2)}% of your capital per trade</p>
                <p className="text-4xl font-bold text-gold font-mono">{kellyValue.toFixed(2)}%</p>
                <p className="text-xs text-muted-foreground mt-4">
                  {selectedKelly === 'full' && 'Aggressive: Maximum theoretical growth but higher volatility'}
                  {selectedKelly === 'half' && 'Balanced: Recommended for most traders - good growth with manageable risk'}
                  {selectedKelly === 'quarter' && 'Conservative: Lower volatility, suitable for risk-averse traders'}
                </p>
              </div>
            </div>

            {/* Risk Warning */}
            {kellyCalculation.fullKelly > 25 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-500 mb-1">High Risk Alert</p>
                    <p className="text-xs text-muted-foreground">
                      Your Kelly Criterion suggests risking over 25% per trade. Consider using Half or Quarter Kelly to reduce volatility.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Information */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-4 text-foreground">What is Kelly Criterion?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                The Kelly Criterion is a mathematical formula that determines the optimal fraction of your capital to risk on each trade to maximize long-term growth while minimizing the risk of ruin.
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-bold text-foreground mb-1">Key Benefits:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Maximizes long-term wealth growth</li>
                    <li>Prevents over-betting</li>
                    <li>Reduces risk of ruin</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-foreground mb-1">Practical Use:</p>
                  <p className="text-muted-foreground">Use Half Kelly for safer trading with good growth potential</p>
                </div>
              </div>
            </div>

            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-4 text-foreground">Common Mistakes</h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>Using Full Kelly without experience</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>Ignoring market volatility</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>Overestimating win rate</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner Ad */}
      <div className="bg-card/50 py-4 border-t border-primary/20 mt-12">
        <div className="container">
          <AdSense slot="1234567896" format="horizontal" responsive={true} />
        </div>
      </div>
    </div>
  );
}
