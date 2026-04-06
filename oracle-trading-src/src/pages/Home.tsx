import { useLocation } from 'wouter';
import { ChartColumn, GitBranch, Crown, ChevronRight } from 'lucide-react';
import CandleChart from '../components/CandleChart';

const tools = [
  {
    id: 'compound',
    title: 'Compound Interest Calculator',
    description: 'See how your investment grows exponentially through compound interest over time.',
    icon: <ChartColumn size={32} />,
    path: '/compound-calculator',
  },
  {
    id: 'kelly',
    title: 'Kelly Criterion Calculator',
    description: 'Determine optimal position sizing based on your win rate and risk-reward ratio.',
    icon: <ChartColumn size={32} />,
    path: '/kelly-calculator',
  },
  {
    id: 'martingale',
    title: 'Martingale Simulator',
    description: 'Simulate pyramid entry strategy with custom drawdown levels and position scaling.',
    icon: <GitBranch size={32} />,
    path: '/martingale-simulator',
  },
  {
    id: 'vip',
    title: 'VIP Strategy',
    description: 'Integrated solution combining Kelly, Martingale, and compound interest for optimal returns.',
    icon: <Crown size={32} />,
    path: '/vip-strategy',
    isVip: true,
  },
];

const features = [
  { title: 'Precision Calculations', description: 'Advanced mathematical models for accurate financial projections and risk assessment.' },
  { title: 'Interactive Visualization', description: 'Instant charts and graphs showing growth trajectories and risk scenarios.' },
  { title: 'Integrated Strategy', description: 'Combine multiple calculation methods for comprehensive investment planning.' },
];

function AdBanner({ slot }: { slot: string }) {
  return (
    <div style={{ minHeight: 0 }}>
      <div className="container">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-6870676006996989"
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header style={{ background: '#000', borderBottom: 'none' }} className="sticky top-0 z-50">
        <div className="container py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#D4AF37', fontWeight: 700, fontSize: 14, fontFamily: 'Georgia, serif' }}>OT</span>
            </div>
            <div>
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>Oracle Trading</h1>
              <p className="text-muted-foreground" style={{ fontSize: 12 }}>Investment Strategy Calculator</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero - 3D Candle Chart */}
      <CandleChart />

      {/* Ad 1 */}
      <AdBanner slot="2000000001" />

      {/* Tool Cards */}
      <section className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 32 }}>
          {tools.map((tool, i) => (
            <div
              key={tool.id}
              className="animate-slide-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <button
                onClick={() => navigate(tool.path)}
                className="card-gold-glow"
                style={{
                  width: '100%',
                  padding: 32,
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'block',
                }}
              >
                {tool.isVip && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16,
                    padding: '4px 12px', borderRadius: 999,
                    background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--primary) 50%, transparent)',
                  }}>
                    <span className="text-gold" style={{ fontSize: 11, fontWeight: 700 }}>VIP</span>
                  </div>
                )}
                <div style={{ position: 'relative', zIndex: 10 }}>
                  <div style={{
                    marginBottom: 24,
                    display: 'inline-flex',
                    padding: 12,
                    borderRadius: 8,
                    background: 'color-mix(in oklab, var(--primary) 10%, transparent)',
                  }}>
                    <span className="text-gold">{tool.icon}</span>
                  </div>
                  <h3 className="text-foreground" style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{tool.title}</h3>
                  <p className="text-muted-foreground" style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>{tool.description}</p>
                  <div className="text-gold" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <span>Explore</span>
                    <ChevronRight size={20} />
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Ad 2 */}
      <AdBanner slot="2000000002" />

      {/* Why Oracle Trading */}
      <section className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div style={{ maxWidth: 720, marginBottom: 48 }}>
          <h2 className="text-foreground" style={{ fontSize: 36, fontWeight: 700, marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>Why Oracle Trading?</h2>
          <p className="text-muted-foreground" style={{ fontSize: 17 }}>Professional-grade calculation tools designed for every investor and trader.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              padding: 24, borderRadius: 8,
              border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
              background: 'color-mix(in oklab, var(--card) 50%, transparent)',
            }}>
              <h4 className="text-gold" style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>{f.title}</h4>
              <p className="text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ad 3 */}
      <AdBanner slot="2000000003" />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', background: 'color-mix(in oklab, var(--card) 50%, transparent)', marginTop: 48 }}>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32, textAlign: 'center' }}>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>Oracle Trading © 2026. Professional Investment Strategy Calculator.</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 8 }}>Disclaimer: For educational purposes only. Always consult with a financial advisor.</p>
          <div style={{ marginTop: 16 }}>
            <button onClick={() => navigate('/privacy-policy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: 12, textDecoration: 'underline', opacity: 0.7 }}>
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
