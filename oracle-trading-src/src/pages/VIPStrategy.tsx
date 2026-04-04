import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, TrendingUp, AlertCircle, Crown } from 'lucide-react';
import { AdSense } from '../components/AdSense';
import { SidebarAds } from '../components/SidebarAds';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function VIPStrategy() {
  const [, navigate] = useLocation();
  const [targetMonthlyReturn, setTargetMonthlyReturn] = useState(10);
  const [winRate, setWinRate] = useState(60);
  const [profitRatio, setProfitRatio] = useState(2);
  const [lossRatio, setLossRatio] = useState(1);
  const [tradingCapital, setTradingCapital] = useState(10000);
  const [currentAssetPrice, setCurrentAssetPrice] = useState(100);
  const [entryLevels, setEntryLevels] = useState(4);
  const [priceDropPercent, setPriceDropPercent] = useState(5);

  // Compounding Duration Settings
  const [compoundingValue, setCompoundingValue] = useState(12);
  const [compoundingUnit, setCompoundingUnit] = useState<'day' | 'month' | 'year'>('month');

  // Chrome translation safe number parser
  const parseNum = (val: string) => {
    const n = parseFloat(val.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  // Calculate Kelly Criterion
  const kellyCalculation = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = profitRatio / lossRatio;
    const fullKelly = (p * b - q) / b;
    return Math.max(0, (fullKelly / 2) * 100); // Half Kelly
  }, [winRate, profitRatio, lossRatio]);

  // Martingale calculation
  const martingaleData = useMemo(() => {
    const levels = [];
    let totalInvestment = 0;
    let totalShares = 0;

    for (let i = 1; i <= entryLevels; i++) {
      const priceAtLevel = currentAssetPrice * (1 - (priceDropPercent / 100) * (i - 1));
      const investmentPerLevel = (tradingCapital * kellyCalculation) / (100 * entryLevels);
      const shares = investmentPerLevel / priceAtLevel;

      totalInvestment += investmentPerLevel;
      totalShares += shares;

      levels.push({
        level: i,
        price: priceAtLevel,
        shares: shares,
        investment: investmentPerLevel,
        percentOfTotal: (investmentPerLevel / tradingCapital) * 100
      });
    }

    const averagePrice = totalInvestment / totalShares;

    return {
      levels,
      totalShares,
      totalInvestment,
      averagePrice
    };
  }, [tradingCapital, currentAssetPrice, entryLevels, priceDropPercent, kellyCalculation]);

  // Convert compounding duration to days
  const compoundingDays = useMemo(() => {
    switch (compoundingUnit) {
      case 'day':
        return compoundingValue;
      case 'month':
        return compoundingValue * 30;
      case 'year':
        return compoundingValue * 365;
      default:
        return 30;
    }
  }, [compoundingValue, compoundingUnit]);

  // Monthly projection
  const monthlyProjection = useMemo(() => {
    const projections = [];
    const monthlyRate = targetMonthlyReturn / 100;
    const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;

    for (let day = 0; day <= compoundingDays; day++) {
      const balance = tradingCapital * Math.pow(1 + dailyRate, day);
      const profit = balance - tradingCapital;
      const month = Math.ceil(day / 30);

      if (day % 30 === 0 || day === compoundingDays) {
        projections.push({
          day,
          month,
          balance,
          profit
        });
      }
    }

    return projections;
  }, [tradingCapital, targetMonthlyReturn, compoundingDays]);

  // Chart data for growth visualization
  const chartData = useMemo(() => {
    return monthlyProjection.map((proj) => ({
      name: `Day ${proj.day}`,
      balance: Math.round(proj.balance),
      profit: Math.round(proj.profit)
    }));
  }, [monthlyProjection]);

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
              <Crown className="w-5 h-5 text-gold" />
              <h1 className="text-2xl font-bold text-foreground">VIP Integrated Strategy</h1>
            </div>
            <p className="text-xs text-muted-foreground">Kelly Criterion + Martingale Pyramid Combined</p>
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
              <div>
                <h2 className="text-xl font-bold mb-6 text-foreground">Strategy Configuration</h2>

                {/* Target Monthly Return */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Target Monthly Return (%)
                  </label>
                  <input
                    type="number"
                    value={targetMonthlyReturn}
                    onChange={(e) => setTargetMonthlyReturn(parseNum(e.target.value))}
                    step="0.5"
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your monthly profit goal (e.g., 10% per month)</p>
                </div>

                {/* Win Rate */}
                <div className="mb-6">
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
                <div className="mb-6">
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
                <div className="mb-6">
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

                {/* Trading Capital */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Trading Capital
                  </label>
                  <input
                    type="number"
                    value={tradingCapital}
                    onChange={(e) => setTradingCapital(Math.max(100, parseNum(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your total available trading capital</p>
                </div>
              </div>

              <div className="border-t border-primary/20 pt-6">
                <h3 className="text-lg font-bold mb-6 text-foreground">Martingale Parameters</h3>

                {/* Market Price */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Market Price
                  </label>
                  <input
                    type="number"
                    value={currentAssetPrice}
                    onChange={(e) => setCurrentAssetPrice(Math.max(0.01, parseNum(e.target.value)))}
                    step="0.01"
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Current price of the stock / coin / asset</p>
                </div>

                {/* Entry Levels */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Number of Entry Levels
                  </label>
                  <input
                    type="number"
                    value={entryLevels}
                    onChange={(e) => setEntryLevels(Math.max(1, Math.min(10, parseNum(e.target.value))))}
                    step="1"
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">How many times to buy as price drops (1-10)</p>
                </div>

                {/* Price Drop Percent */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">
                    Price Drop Between Entries (%)
                  </label>
                  <input
                    type="number"
                    value={priceDropPercent}
                    onChange={(e) => setPriceDropPercent(Math.max(0.1, parseNum(e.target.value)))}
                    step="0.5"
                    className="w-full px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Buy again when price drops this %</p>
                </div>
              </div>

              {/* Compounding Duration Settings */}
              <div className="border-t border-primary/20 pt-6">
                <h3 className="text-lg font-bold mb-6 text-foreground">Compounding Duration</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={compoundingValue}
                    onChange={(e) => setCompoundingValue(Math.max(1, parseNum(e.target.value)))}
                    step="1"
                    className="flex-1 px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  />
                  <select
                    value={compoundingUnit}
                    onChange={(e) => setCompoundingUnit(e.target.value as 'day' | 'month' | 'year')}
                    className="px-3 py-2 rounded-lg bg-input border border-primary/20 text-foreground font-mono text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">Set your compounding period for growth projections</p>
              </div>
            </div>
          </div>

          {/* Center: Entry Levels Detail */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-gold-glow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Optimized Entry Levels</h3>
                <div className="px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-bold">
                  Half Kelly Applied
                </div>
              </div>

              <div className="space-y-4">
                {martingaleData.levels.map((level) => (
                  <div key={level.level} className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-gold">Level {level.level}</span>
                      <span className="text-sm font-mono text-accent">{level.price.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Shares</p>
                        <p className="font-mono font-bold text-foreground">{level.shares.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Investment</p>
                        <p className="font-mono font-bold text-foreground">{level.investment.toFixed(0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground mb-1">% of Strategy</p>
                        <p className="font-mono font-bold text-accent">{level.percentOfTotal.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Martingale Entry Levels Breakdown Table */}
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-6 text-foreground">Martingale Entry Levels Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-primary/20">
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Level</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Price</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Shares</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Investment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {martingaleData.levels.map((level) => (
                      <tr key={level.level} className="border-b border-primary/10 hover:bg-primary/5">
                        <td className="py-2 px-2 text-foreground font-mono">{level.level}</td>
                        <td className="text-right py-2 px-2 text-accent font-mono">{level.price.toFixed(2)}</td>
                        <td className="text-right py-2 px-2 text-foreground font-mono">{level.shares.toFixed(2)}</td>
                        <td className="text-right py-2 px-2 text-gold font-mono font-bold">{level.investment.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compounding Growth Chart */}
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-6 text-foreground">
                {compoundingValue}-{compoundingUnit === 'day' ? 'Day' : compoundingUnit === 'month' ? 'Month' : 'Year'} Compounding Growth
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff40" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1a1f3a',
                      border: '1px solid #d4af37',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => (value as number).toLocaleString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#d4af37" 
                    dot={false}
                    strokeWidth={2}
                    name="Total Balance"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    dot={false}
                    strokeWidth={2}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Strategy Execution Walkthrough */}
            <div className="card-gold-glow p-6">
              <h3 className="text-lg font-bold mb-6 text-foreground">Strategy Execution Walkthrough</h3>
              <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-gold flex items-center justify-center flex-shrink-0 font-bold">1</span>
                  <p><strong className="text-foreground">Entry (Level 1):</strong> Buy {martingaleData.levels[0].shares.toFixed(2)} units at {currentAssetPrice.toFixed(2)} → Deploy {martingaleData.levels[0].investment.toFixed(0)}</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-gold flex items-center justify-center flex-shrink-0 font-bold">2</span>
                  <p><strong className="text-foreground">After {priceDropPercent}% drop:</strong> Price reaches {(currentAssetPrice * (1 - priceDropPercent / 100)).toFixed(2)} → Buy {martingaleData.levels[1].shares.toFixed(2)} more units</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-gold flex items-center justify-center flex-shrink-0 font-bold">3</span>
                  <p><strong className="text-foreground">Continue:</strong> Repeat for all {entryLevels} levels, accumulating {martingaleData.totalShares.toFixed(2)} total units</p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-gold flex items-center justify-center flex-shrink-0 font-bold">4</span>
                  <p><strong className="text-foreground">Exit target:</strong> Sell all {martingaleData.totalShares.toFixed(2)} units at {martingaleData.averagePrice.toFixed(2)} or above → Recover full investment</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Projections */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-gold-glow p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-gold" />
                <h3 className="text-lg font-bold text-foreground">
                  {compoundingValue}-{compoundingUnit === 'day' ? 'Day' : compoundingUnit === 'month' ? 'Month' : 'Year'} Projection
                </h3>
              </div>

              <div className="space-y-3">
                {monthlyProjection.slice(-5).map((proj) => (
                  <div key={proj.day} className="flex justify-between items-center py-2 border-b border-primary/10 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {compoundingUnit === 'day' ? `Day ${proj.day}` : `Month ${proj.month}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">+{((proj.balance / tradingCapital - 1) * 100).toFixed(0)}% total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gold font-mono">{proj.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-[10px] text-green-500 font-mono">+{proj.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gold/5 rounded-xl border border-gold/10">
                <div className="flex gap-3">
                  <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Projections assume consistent {targetMonthlyReturn}% monthly growth through strategy execution. Past performance does not guarantee future results.
                  </p>
                </div>
              </div>
            </div>

            {/* Kelly Summary */}
            <div className="card-gold-glow p-5">
              <h3 className="text-sm font-bold mb-3 text-foreground">Kelly Parameters</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="text-accent font-mono">{winRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk-Reward:</span>
                  <span className="text-accent font-mono">1:{(profitRatio / lossRatio).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Half Kelly:</span>
                  <span className="text-gold font-mono font-bold">{kellyCalculation.toFixed(2)}%</span>
                </div>
              </div>
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
