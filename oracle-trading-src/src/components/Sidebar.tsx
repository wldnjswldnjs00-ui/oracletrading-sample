import { Link, useLocation } from 'wouter';
import { House, ChartColumn, GitBranch, Crown, ChevronRight } from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: <House size={18} />, path: '/' },
  { id: 'compound', label: 'Compound Interest Calculator', icon: <ChartColumn size={18} />, path: '/compound-calculator' },
  { id: 'kelly', label: 'Kelly Criterion Calculator', icon: <ChartColumn size={18} />, path: '/kelly-calculator' },
  { id: 'martingale', label: 'Martingale Simulator', icon: <GitBranch size={18} />, path: '/martingale-simulator' },
  { id: 'vip', label: 'VIP Strategy', icon: <Crown size={18} />, path: '/vip-strategy', isVip: true },
];

declare global {
  interface Window { adsbygoogle: unknown[]; }
}

function AdSlot({ slot, format = 'rectangle' }: { slot: string; format?: string }) {
  return (
    <div style={{ margin: '12px 0', overflow: 'hidden' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6870676006996989"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside style={{
      width: 260,
      minWidth: 260,
      backgroundColor: 'var(--sidebar)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
            border: '1px solid color-mix(in oklab, var(--primary) 40%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)', fontFamily: 'Playfair Display, serif' }}>
              Oracle Trading
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Investment Calculator</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {navItems.map(item => {
          const isActive = item.path === '/'
            ? location === '/'
            : location.startsWith(item.path);
          return (
            <Link key={item.id} href={item.path}>
              <a style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 2,
                cursor: 'pointer',
                textDecoration: 'none',
                backgroundColor: isActive ? 'color-mix(in oklab, var(--primary) 15%, transparent)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                border: isActive ? '1px solid color-mix(in oklab, var(--primary) 30%, transparent)' : '1px solid transparent',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in oklab, var(--primary) 8%, transparent)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                }
              }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
                {item.isVip && (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--primary) 40%, transparent)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}>VIP</span>
                )}
                {isActive && <ChevronRight size={14} style={{ flexShrink: 0 }} />}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Ad Slots */}
      <div style={{ padding: '0 8px' }}>
        <AdSlot slot="1234567890" />
        <AdSlot slot="1234567891" />
        <AdSlot slot="1234567892" />
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--sidebar-border)',
        fontSize: 11,
        color: 'var(--muted-foreground)',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Oracle Trading © 2026.<br />
        Professional Investment Strategy Calculator.
      </div>
    </aside>
  );
}
