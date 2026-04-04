import { Link } from 'wouter';
import { ChartColumn, GitBranch, Crown, ChevronRight, TrendingUp, RotateCcw } from 'lucide-react';

const tools = [
  {
    id: 'compound',
    title: 'Compound Interest Calculator',
    description: 'Calculate asset growth with regular investments and compound returns over time.',
    icon: <ChartColumn size={24} />,
    path: '/compound-calculator',
  },
  {
    id: 'kelly',
    title: 'Kelly Criterion Calculator',
    description: 'Determine optimal position sizing based on your win rate and risk-reward ratio.',
    icon: <ChartColumn size={24} />,
    path: '/kelly-calculator',
  },
  {
    id: 'martingale',
    title: 'Martingale Simulator',
    description: 'Simulate pyramid entry strategy with custom drawdown levels and position scaling.',
    icon: <GitBranch size={24} />,
    path: '/martingale-simulator',
  },
  {
    id: 'vip',
    title: 'VIP Strategy',
    description: 'Integrated solution combining Kelly, Martingale, and compound interest for optimal returns.',
    icon: <Crown size={24} />,
    path: '/vip-strategy',
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

function AdBanner({ slot }: { slot: string }) {
  return (
    <div style={{ margin: '20px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6870676006996989"
        data-ad-slot={slot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ padding: '40px 32px', maxWidth: 960, margin: '0 auto' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: 16,
          color: 'var(--foreground)',
          fontFamily: 'Playfair Display, serif',
        }}>
          Master Your{' '}
          <span style={{ color: 'var(--primary)' }}>Investment</span>
          <br />Strategy
        </h1>
        <p style={{ fontSize: 17, color: 'var(--muted-foreground)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
          Advanced mathematical models for accurate financial projections and risk assessment.
          Professional-grade calculation tools designed for serious investors and traders.
        </p>
      </section>

      {/* Ad Slot 1 */}
      <AdBanner slot="2000000001" />

      {/* Tool cards */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {tools.map(tool => (
            <Link key={tool.id} href={tool.path}>
              <a className="card-gold-glow" style={{
                display: 'block',
                padding: 24,
                cursor: 'pointer',
                textDecoration: 'none',
                position: 'relative',
              }}>
                {tool.isVip && (
                  <span style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--primary) 40%, transparent)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}>VIP</span>
                )}
                <div style={{
                  display: 'inline-flex',
                  padding: 12,
                  borderRadius: 8,
                  background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                  color: 'var(--primary)',
                  marginBottom: 16,
                }}>
                  {tool.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--foreground)' }}>
                  {tool.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                  {tool.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16, color: 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
                  Explore <ChevronRight size={14} />
                </div>
              </a>
            </Link>
          ))}
        </div>
      </section>

      {/* Ad Slot 2 */}
      <AdBanner slot="2000000002" />

      {/* Features */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: 'var(--foreground)', fontFamily: 'Playfair Display, serif', textAlign: 'center' }}>
          Why Oracle Trading?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} className="card-gold-glow" style={{ padding: 24 }}>
              <div style={{ color: 'var(--primary)', marginBottom: 12 }}>{f.icon}</div>
              <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--foreground)', fontSize: 15 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ad Slot 3 */}
      <AdBanner slot="2000000003" />
    </div>
  );
}
