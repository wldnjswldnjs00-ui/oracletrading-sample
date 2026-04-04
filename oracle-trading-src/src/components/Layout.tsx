import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  isVip?: boolean;
}

export function PageHeader({ title, subtitle, icon, isVip }: PageHeaderProps) {
  return (
    <header style={{
      borderBottom: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
      backgroundColor: 'color-mix(in oklab, var(--card) 80%, transparent)',
      backdropFilter: 'blur(8px)',
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ color: 'var(--primary)' }}>{icon}</span>}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', margin: 0, fontFamily: 'Playfair Display, serif' }}>
          {title}
        </h1>
        {isVip && (
          <span style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklab, var(--primary) 20%, transparent)',
            border: '1px solid color-mix(in oklab, var(--primary) 40%, transparent)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--primary)',
          }}>VIP</span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 4 }}>{subtitle}</p>
    </header>
  );
}

interface InputFieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function InputField({ label, hint, children }: InputFieldProps) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: 'var(--input)',
  border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)',
  color: 'var(--foreground)',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 14,
  outline: 'none',
};

export const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
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
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--foreground)', ...valueStyle }}>{value}</p>
      {subtext && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 8 }}>{subtext}</p>}
    </div>
  );
}

interface AlertCardProps {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function AlertCard({ type, title, message }: AlertCardProps) {
  const colors = {
    error: { border: '#fe6e00', text: '#fe6e00' },
    warning: { border: '#fe6e00', text: '#fe6e00' },
    info: { border: 'var(--primary)', text: 'var(--primary)' },
  };
  const c = colors[type];
  return (
    <div className="card-gold-glow" style={{ padding: 20, borderLeft: `4px solid ${c.border}` }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{message}</p>
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
    <div className="card-gold-glow" style={{ padding: 20, ...style }}>
      {title && <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)', marginBottom: 16, fontFamily: 'Playfair Display, serif' }}>{title}</h3>}
      {children}
    </div>
  );
}
