import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = 'Privacy Policy | Oracle Trading';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Privacy Policy for Oracle Trading. Learn how we collect, use, and protect your data when you use our investment strategy calculators.');
    return () => {
      document.title = 'Oracle Trading - Investment Strategy Calculator | Compound Interest, Kelly Criterion, Martingale';
      if (metaDesc) metaDesc.setAttribute('content', 'Professional investment strategy calculator. Calculate compound interest, optimal position sizing with Kelly Criterion, and martingale pyramid strategies. Free financial tools for serious traders.');
    };
  }, []);

  const sections = [
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
      content: `Oracle Trading uses the following third-party services, each governed by their own privacy policies:

• Google Analytics (analytics.google.com/policies/privacy)
• Google AdSense (policies.google.com/privacy)
• Google Fonts (fonts.google.com)
• Cloudflare Pages (cloudflare.com/privacypolicy)

We encourage you to review the privacy policies of these third-party providers.`,
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
      content: `If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at:

Website: oracletrading.site
Email: contact@oracletrading.site

We will respond to your inquiry within a reasonable timeframe.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in oklab, var(--primary) 10%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
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
              <p className="text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.content}</p>
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
