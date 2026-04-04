import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  isVip?: boolean;
  adSlot?: string;
}

export function PageHeader({ title, subtitle, icon, isVip, adSlot }: PageHeaderProps) {
  const [, navigate] = useLocation();
  return (
    <>
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center' }}
            className="text-muted-foreground"
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--primary) 10%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <ArrowLeft size={20} className="text-gold" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon && <span className="text-gold">{icon}</span>}
              <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>{title}</h1>
              {isVip && (
                <span style={{
                  padding: '2px 10px', borderRadius: 999,
                  background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
                  border: '1px solid color-mix(in oklab, var(--primary) 50%, transparent)',
                  fontSize: 11, fontWeight: 700,
                }} className="text-gold">VIP</span>
              )}
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>{subtitle}</p>
          </div>
        </div>
      </header>
      {adSlot && (
        <div className="bg-card/50 py-4 border-b border-primary/20">
          <div className="container">
            <ins
              className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-6870676006996989"
              data-ad-slot={adSlot}
              data-ad-format="horizontal"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      )}
    </>
  );
}

interface InputFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function InputField({ label, hint, children }: InputFieldProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label className="text-muted-foreground" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  backgroundColor: 'var(--input)',
  border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
  color: 'var(--foreground)',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  outline: 'none',
};

export const selectStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  backgroundColor: 'var(--input)',
  border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
  color: 'var(--foreground)',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  valueStyle?: React.CSSProperties;
}

export function StatCard({ label, value, subtext, valueStyle }: StatCardProps) {
  return (
    <div className="card-gold-glow" style={{ padding: 20 }}>
      <p className="text-muted-foreground" style={{ fontSize: 12, marginBottom: 8 }}>{label}</p>
      <p className="text-foreground font-mono" style={{ fontSize: 24, fontWeight: 700, ...valueStyle }}>{value}</p>
      {subtext && <p className="text-gold" style={{ fontSize: 12, marginTop: 8 }}>{subtext}</p>}
    </div>
  );
}

interface AlertCardProps {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function AlertCard({ type, title, message }: AlertCardProps) {
  const borderColor = type === 'info' ? 'var(--primary)' : '#fe6e00';
  const textColor = type === 'info' ? 'var(--primary)' : '#fe6e00';
  return (
    <div className="card-gold-glow" style={{ padding: 20, borderLeft: `4px solid ${borderColor}` }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 4 }}>{title}</p>
      <p className="text-muted-foreground" style={{ fontSize: 12 }}>{message}</p>
    </div>
  );
}

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionCard({ title, children, style }: SectionCardProps) {
  return (
    <div className="card-gold-glow" style={{ padding: 24, ...style }}>
      {title && <h3 className="text-foreground" style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>{title}</h3>}
      {children}
    </div>
  );
}
