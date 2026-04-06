import { useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();
  usePageMeta(
    'Privacy Policy | Oracle Trading',
    'Privacy Policy for Oracle Trading. Learn how we collect, use, and protect your data when you use our free investment strategy calculators.'
  );

  const linkStyle = { color: 'var(--gold)', textDecoration: 'underline' };
  const sections: { title: string; content: string | ReactNode }[] = [
    {
      title: '1. Information We Collect',
      content: `Oracle Trading does not collect any personally identifiable information (PII) directly. However, third-party services integrated into this website may collect certain data automatically:

• Usage Data: Pages visited, time spent, buttons clicked, and other interaction data — collected by Google Analytics (GA4) via cookies and browser storage.
• Device & Browser Data: Browser type, operating system, screen resolution, and approximate geographic location (country/city level) — collected by Google Analytics.
• Advertising Data: Google AdSense may collect information about your interests and browsing behavior across websites to serve relevant advertisements. This is done through cookies and similar tracking technologies.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `The data collected is used for the following purposes:

• Analytics: To understand how visitors use the site, which calculators are most popular, and how to improve the user experience.
• Advertising: To display relevant advertisements through Google AdSense. Ad revenue helps us keep Oracle Trading free for all users.
• Performance Monitoring: To identify and fix technical issues affecting site performance.

We do not sell, trade, or rent your personal information to third parties.`,
    },
    {
      title: '3. Cookies',
      content: `This website uses cookies — small text files stored in your browser — for the following purposes:

• Google Analytics cookies: Track site usage and user behavior anonymously.
• Google AdSense cookies: Serve personalized or contextual advertisements.

You can control or disable cookies through your browser settings. Note that disabling cookies may affect some site functionality. You may also opt out of personalized advertising by visiting Google's Ad Settings at adssettings.google.com.`,
    },
    {
      title: '4. Third-Party Services',
      content: (
        <span style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }} className="text-muted-foreground">
          {'Oracle Trading uses the following third-party services, each governed by their own privacy policies:\n\n'}
          {'• Google Analytics — '}<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>policies.google.com/privacy</a>{'\n'}
          {'• Google AdSense — '}<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>policies.google.com/privacy</a>{'\n'}
          {'• Google Fonts — '}<a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>fonts.google.com</a>{'\n'}
          {'• Cloudflare Pages — '}<a href="https://www.cloudflare.com/privacypolicy" target="_blank" rel="noopener noreferrer" style={linkStyle}>cloudflare.com/privacypolicy</a>{'\n\n'}
          {'We encourage you to review the privacy policies of these third-party providers.'}
        </span>
      ),
    },
    {
      title: '5. Data Retention',
      content: `Oracle Trading does not directly store any user data on its servers. Data collected by Google Analytics is retained according to Google's data retention policies (default: 14 months). You may request deletion of your Analytics data through Google's tools.`,
    },
    {
      title: '6. Children\'s Privacy',
      content: `Oracle Trading is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided personal information through this site, please contact us and we will take steps to remove that information.`,
    },
    {
      title: '7. Your Rights',
      content: `Depending on your location, you may have the following rights regarding your data:

• Right to Access: Request information about what data has been collected about you.
• Right to Deletion: Request deletion of your personal data.
• Right to Opt-Out: Opt out of personalized advertising via Google Ad Settings.
• GDPR (EU users): You have rights to access, rectify, erase, and restrict processing of your personal data.
• CCPA (California users): You have the right to know, delete, and opt-out of the sale of personal information.

To exercise these rights, please contact us at the email below.`,
    },
    {
      title: '8. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. When we do, we will update the "Last Updated" date at the top of this page. We encourage you to review this policy periodically.`,
    },
    {
      title: '9. Contact Us',
      content: (
        <>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:
          <br /><br />
          Website: <a href="https://oracletrading.site" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>oracletrading.site</a>
          <br />
          Email: <a href="mailto:oracletrading.help@gmail.com" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>oracletrading.help@gmail.com</a>
          <br /><br />
          We will respond to your inquiry within a reasonable timeframe.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="btn-back">
            <ArrowLeft className="w-5 h-5 text-gold" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield className="w-5 h-5 text-gold" />
            <h1 className="text-foreground" style={{ fontSize: 22, fontWeight: 700 }}>Privacy Policy</h1>
          </div>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 800, paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ marginBottom: 40 }}>
          <h2 className="text-foreground" style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, fontFamily: 'Playfair Display, serif' }}>Privacy Policy</h2>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>Last Updated: April 4, 2026</p>
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: 'color-mix(in oklab, var(--primary) 5%, transparent)', border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)' }}>
            <p className="text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.7 }}>
              Welcome to Oracle Trading ("we," "us," or "our"). This Privacy Policy explains how we handle information when you visit <strong className="text-foreground">oracletrading.site</strong>. By using our site, you agree to the practices described in this policy.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sections.map((section, i) => (
            <div key={i} style={{ borderBottom: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)', paddingBottom: 32 }}>
              <h3 className="text-foreground" style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{section.title}</h3>
              {typeof section.content === 'string'
                ? <p className="text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.content}</p>
                : <div>{section.content}</div>
              }
            </div>
          ))}
        </div>
      </div>

      <footer style={{ borderTop: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', background: 'color-mix(in oklab, var(--card) 50%, transparent)', marginTop: 48 }}>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32, textAlign: 'center' }}>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>Oracle Trading © 2026. Professional Investment Strategy Calculator.</p>
        </div>
      </footer>
    </div>
  );
}
