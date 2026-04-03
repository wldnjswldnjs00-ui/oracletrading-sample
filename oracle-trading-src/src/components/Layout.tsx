import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  isVip?: boolean;
}

export function PageHeader({ title, subtitle, icon, isVip }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header
      style={{
        borderBottom: '1px solid hsl(45 100% 55% / 0.2)',
        backgroundColor: 'hsl(222 47% 9% / 0.5)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: 8,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'hsl(45 100% 55%)',
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'hsl(45 100% 55% / 0.1)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icon && <span style={{ color: 'hsl(45 100% 55%)' }}>{icon}</span>}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'hsl(50 100% 92%)', margin: 0 }}>{title}</h1>
            {isVip && (
              <span style={{
                padding: '2px 8px',
                borderRadius: 999,
                background: 'hsl(45 100% 55% / 0.2)',
                border: '1px solid hsl(45 100% 55% / 0.5)',
                fontSize: 11,
                fontWeight: 700,
                color: 'hsl(45 100% 55%)',
              }}>VIP</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'hsl(50 20% 60%)', marginTop: 2 }}>{subtitle}</p>
        </div>
      </div>
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
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: 'hsl(222 47% 12%)',
  border: '1px solid hsl(45 100% 55% / 0.2)',
  color: 'hsl(50 100% 92%)',
  fontFamily: 'monospace',
  fontSize: 14,
  outline: 'none',
};

export const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: 'hsl(222 47% 12%)',
  border: '1px solid hsl(45 100% 55% / 0.2)',
  color: 'hsl(50 100% 92%)',
  fontFamily: 'monospace',
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
      <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', ...valueStyle }}>{value}</p>
      {subtext && <p style={{ fontSize: 12, color: 'hsl(45 100% 70%)', marginTop: 8 }}>{subtext}</p>}
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
    error: { border: 'hsl(0 84% 60%)', text: 'hsl(0 84% 60%)' },
    warning: { border: 'hsl(25 100% 50%)', text: 'hsl(25 100% 55%)' },
    info: { border: 'hsl(45 100% 55%)', text: 'hsl(45 100% 55%)' },
  };
  const c = colors[type];
  return (
    <div className="card-gold-glow" style={{ padding: 20, borderLeft: `4px solid ${c.border}` }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 12, color: 'hsl(50 20% 60%)' }}>{message}</p>
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
      {title && <h3 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(50 100% 92%)', marginBottom: 16 }}>{title}</h3>}
      {children}
    </div>
  );
}
