import { useNavigate } from 'react-router-dom';
import { TrendingUp, GitBranch, ChartColumn, Star, RotateCcw, ChevronRight } from 'lucide-react';

const tools = [
  {
    id: 'compound',
    title: 'Compound Interest',
    description: 'Calculate asset growth with regular investments and compound returns over time.',
    icon: <TrendingUp size={24} />,
    path: '/compound',
    color: 'from-blue-400 to-cyan-500',
    isVip: false,
  },
  {
    id: 'kelly',
    title: 'Kelly Criterion',
    description: 'Determine optimal position sizing based on your win rate and risk-reward ratio.',
    icon: <ChartColumn size={24} />,
    path: '/kelly',
    color: 'from-green-400 to-emerald-500',
    isVip: false,
  },
  {
    id: 'martingale',
    title: 'Martingale Simulator',
    description: 'Simulate pyramid entry strategy with custom drawdown levels and position scaling.',
    icon: <GitBranch size={24} />,
    path: '/martingale',
    color: 'from-orange-400 to-red-500',
    isVip: false,
  },
  {
    id: 'vip',
    title: 'VIP Strategy',
    description: 'Integrated solution combining Kelly, Martingale, and compound interest for optimal returns.',
    icon: <Star size={24} />,
    path: '/vip',
    color: 'from-yellow-300 to-amber-500',
    isVip: true,
  },
];

const features = [
  {
    icon: <ChartColumn size={20} />,
    title: 'Precision Calculations',
    desc: 'Advanced mathematical models for accurate financial projections and risk assessment.',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Real-time Visualization',
    desc: 'Interactive charts and graphs showing growth trajectories and risk scenarios.',
  },
  {
    icon: <RotateCcw size={20} />,
    title: 'Integrated Strategy',
    desc: 'Combine multiple calculation methods for comprehensive investment planning.',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(222 47% 6%)', color: 'hsl(50 100% 92%)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid hsl(45 100% 55% / 0.2)',
        backgroundColor: 'hsl(222 47% 9% / 0.5)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={24} style={{ color: 'hsl(45 100% 55%)' }} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'hsl(50 100% 92%)' }}>Oracle Trading</h1>
            <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', margin: 0 }}>Investment Strategy Calculator</p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, color: 'hsl(50 100% 92%)' }}>
          Master Your{' '}
          <span style={{ color: 'hsl(45 100% 55%)' }}>Investment</span>
          <br />Strategy
        </h2>
        <p style={{ fontSize: 18, color: 'hsl(50 20% 60%)', maxWidth: 680, margin: '0 auto 48px', lineHeight: 1.6 }}>
          Precision tools for calculating compound growth, optimal position sizing, and advanced trading strategies.
          Combine Kelly Criterion, Martingale pyramiding, and compound interest to maximize returns while managing risk.
        </p>

        {/* Tool cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 64 }}>
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => navigate(tool.path)}
              style={{
                position: 'relative',
                background: 'hsl(222 47% 9%)',
                border: '1px solid hsl(45 100% 55% / 0.2)',
                borderRadius: 12,
                padding: 24,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                color: 'hsl(50 100% 92%)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'hsl(45 100% 55% / 0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px hsl(45 100% 55% / 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'hsl(45 100% 55% / 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {tool.isVip && (
                <span style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'hsl(45 100% 55% / 0.2)',
                  border: '1px solid hsl(45 100% 55% / 0.5)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'hsl(45 100% 55%)',
                }}>VIP</span>
              )}
              <div style={{
                display: 'inline-flex',
                padding: 12,
                borderRadius: 8,
                background: 'hsl(45 100% 55% / 0.1)',
                color: 'hsl(45 100% 55%)',
                marginBottom: 16,
              }}>
                {tool.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'hsl(50 100% 92%)' }}>{tool.title}</h3>
              <p style={{ fontSize: 14, color: 'hsl(50 20% 60%)', lineHeight: 1.5 }}>{tool.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16, color: 'hsl(45 100% 55%)', fontSize: 13, fontWeight: 600 }}>
                Explore <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} style={{ padding: 24, borderRadius: 12, background: 'hsl(222 47% 9%)', border: '1px solid hsl(45 100% 55% / 0.1)' }}>
              <div style={{ color: 'hsl(45 100% 55%)', marginBottom: 12 }}>{f.icon}</div>
              <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'hsl(50 100% 92%)' }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: 'hsl(50 20% 60%)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
