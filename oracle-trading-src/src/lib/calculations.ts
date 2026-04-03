// Kelly Criterion calculation
export function calculateKelly(winRate: number, avgWin: number, avgLoss: number) {
  const p = winRate / 100;
  const q = 1 - p;
  const b = avgWin / avgLoss;
  const fullKelly = (b * p - q) / b;
  const halfKelly = fullKelly / 2;
  const quarterKelly = fullKelly / 4;
  const f = Math.max(0, fullKelly);
  const h = Math.max(0, halfKelly);
  const qk = Math.max(0, quarterKelly);

  let aggressiveGuidance = '';
  let conservativeGuidance = '';

  if (f <= 0) {
    aggressiveGuidance = 'Do not trade. Expected value is negative.';
    conservativeGuidance = 'Do not trade. Expected value is negative.';
  } else if (f < 0.02) {
    aggressiveGuidance = 'Trade with extreme caution. Position size should be minimal.';
    conservativeGuidance = 'Avoid trading. Risk-reward ratio is unfavorable.';
  } else if (f < 0.05) {
    aggressiveGuidance = `Use ${(f * 100).toFixed(2)}% of bankroll (Full Kelly). High risk.`;
    conservativeGuidance = `Use ${(qk * 100).toFixed(2)}% of bankroll (Quarter Kelly). Safer approach.`;
  } else {
    aggressiveGuidance = `Use ${(f * 100).toFixed(2)}% of bankroll (Full Kelly). Optimal growth.`;
    conservativeGuidance = `Use ${(h * 100).toFixed(2)}% of bankroll (Half Kelly). Balanced approach.`;
  }

  return {
    fullKelly: Math.round(f * 10000) / 100,
    halfKelly: Math.round(h * 10000) / 100,
    quarterKelly: Math.round(qk * 10000) / 100,
    aggressiveGuidance,
    conservativeGuidance,
  };
}

// Compound interest calculation
export function calculateCompound(
  initial: number,
  monthlyRate: number,
  duration: number,
  unit: 'days' | 'months' | 'years'
) {
  let months: number;
  if (unit === 'days') months = duration / 30.44;
  else if (unit === 'years') months = duration * 12;
  else months = duration;

  const r = monthlyRate / 100;
  const data: Array<{ month: number; balance: number; invested: number; profit: number }> = [];
  let balance = initial;

  const steps = Math.ceil(months);
  for (let i = 1; i <= steps; i++) {
    balance = balance * (1 + r);
    data.push({
      month: i,
      balance: Math.round(balance * 100) / 100,
      invested: initial,
      profit: Math.round((balance - initial) * 100) / 100,
    });
  }

  const last = data[data.length - 1];
  return {
    finalAmount: last?.balance ?? initial,
    totalInvested: initial,
    totalProfit: last?.profit ?? 0,
    monthlyData: data,
  };
}

// Martingale calculation
export interface MartingaleLevel {
  level: number;
  price: number;
  positionSize: number;
  cumulativeSize: number;
  cumulativeCapital: number;
  averagePrice: number;
}

export function calculateMartingale(
  currentPrice: number,
  priceDropPct: number,
  quantities: number[],
  targetProfitPct: number,
  totalCapital: number
) {
  const levels: MartingaleLevel[] = [];
  let cumCapital = 0;
  let cumSize = 0;
  let weightedPrice = 0;

  for (let i = 0; i < quantities.length; i++) {
    const price = currentPrice * Math.pow(1 - priceDropPct / 100, i);
    const qty = quantities[i];
    const capital = price * qty;
    cumCapital += capital;
    cumSize += qty;
    weightedPrice += price * qty;
    const avgPrice = cumSize > 0 ? weightedPrice / cumSize : 0;
    levels.push({
      level: i + 1,
      price: Math.round(price * 100) / 100,
      positionSize: qty,
      cumulativeSize: Math.round(cumSize * 100) / 100,
      cumulativeCapital: Math.round(cumCapital * 100) / 100,
      averagePrice: Math.round(avgPrice * 100) / 100,
    });
  }

  const avgPrice = cumSize > 0 ? weightedPrice / cumSize : 0;
  const profitTarget = avgPrice * (1 + targetProfitPct / 100);
  const profitAtTarget = (profitTarget - avgPrice) * cumSize;

  let riskMessage = '';
  if (totalCapital && totalCapital > 0) {
    const ratio = cumCapital / totalCapital;
    if (ratio > 0.8) riskMessage = 'EXTREME RISK: Over 80% of your capital is required. Reduce position sizes immediately.';
    else if (ratio > 0.5) riskMessage = 'HIGH RISK: Over 50% of your capital is required. Consider reducing position sizes.';
    else if (ratio > 0.2) riskMessage = 'MODERATE RISK: 20–50% of your capital is required. Monitor closely.';
    else riskMessage = 'LOW RISK: Less than 20% of your capital is required. Manageable exposure.';
  } else if (cumCapital > 100000) {
    riskMessage = 'EXTREME RISK: Total capital required is very high. Proceed with extreme caution.';
  } else if (cumCapital > 50000) {
    riskMessage = 'HIGH RISK: Significant capital required. Consider reducing position sizes.';
  } else if (cumCapital > 10000) {
    riskMessage = 'MODERATE RISK: Reasonable capital requirement. Monitor closely.';
  } else {
    riskMessage = 'LOW RISK: Capital requirement is manageable.';
  }

  return { levels, totalCapital: cumCapital, totalSize: cumSize, averagePrice: Math.round(avgPrice * 100) / 100, profitAtTarget: Math.round(profitAtTarget * 100) / 100, riskMessage };
}

// VIP Martingale levels (Kelly-based)
export interface VIPLevel {
  level: number;
  price: number;
  shares: number;
  investment: number;
  percentOfTotal: number;
}

export function calculateVIPMartingale(
  capital: number,
  kellyFraction: number,
  currentPrice: number,
  numLevels: number,
  priceDropPct: number
) {
  const levels: VIPLevel[] = [];
  const positionSize = capital * kellyFraction / 100;
  const perLevel = numLevels > 0 ? positionSize / numLevels : 0;
  let totalShares = 0;
  let totalInvested = 0;
  let weightedPrice = 0;

  for (let i = 0; i < numLevels; i++) {
    const price = currentPrice * (1 - (priceDropPct / 100) * i);
    const shares = price > 0 ? perLevel / price : 0;
    const investment = perLevel;
    totalShares += shares;
    totalInvested += investment;
    weightedPrice += price * shares;
    levels.push({
      level: i + 1,
      price,
      shares,
      investment,
      percentOfTotal: positionSize > 0 ? (investment / positionSize) * 100 : 0,
    });
  }

  const averagePrice = totalShares > 0 ? weightedPrice / totalShares : 0;
  return { levels, totalShares, totalInvested, averagePrice, breakEvenPrice: averagePrice };
}

// Growth projection (used in VIP Strategy)
export interface ProjectionPoint {
  label: string;
  balance: number;
  profit: number;
  monthlyGain: number;
}

export function calculateGrowthProjection(
  capital: number,
  targetMonthlyReturn: number,
  duration: number,
  unit: 'Day' | 'Month' | 'Year'
): ProjectionPoint[] {
  const monthlyRate = targetMonthlyReturn / 100;
  let points: ProjectionPoint[] = [];
  let balance = capital;

  if (unit === 'Day') {
    const dailyRate = Math.pow(1 + monthlyRate, 1 / 30.44) - 1;
    for (let i = 1; i <= duration; i++) {
      const prev = balance;
      balance = balance * (1 + dailyRate);
      points.push({ label: `Day ${i}`, balance, profit: balance - capital, monthlyGain: balance - prev });
    }
  } else if (unit === 'Month') {
    for (let i = 1; i <= duration; i++) {
      const prev = balance;
      balance = balance * (1 + monthlyRate);
      points.push({ label: `Month ${i}`, balance, profit: balance - capital, monthlyGain: balance - prev });
    }
  } else {
    // Year
    for (let i = 1; i <= duration; i++) {
      const prev = balance;
      balance = balance * Math.pow(1 + monthlyRate, 12);
      points.push({ label: `Year ${i}`, balance, profit: balance - capital, monthlyGain: balance - prev });
    }
  }

  return points;
}
