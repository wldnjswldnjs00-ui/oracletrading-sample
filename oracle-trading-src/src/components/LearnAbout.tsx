import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Section {
  title: string;
  content: string | string[];
}

interface LearnAboutProps {
  topic: string;
  sections: Section[];
}

export function LearnAbout({ topic, sections }: LearnAboutProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card/50 border-b border-primary/20">
      <div className="container py-4">
        <button
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <span style={{ fontSize: 16 }}>📖</span>
          <span className="text-gold" style={{ fontSize: 14, fontWeight: 600 }}>Learn About {topic}</span>
          <span style={{ marginLeft: 'auto' }} className="text-muted-foreground">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {open && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {sections.map((section, i) => (
              <div key={i} style={{ padding: 16, borderRadius: 8, border: '1px solid color-mix(in oklab, var(--primary) 20%, transparent)', background: 'color-mix(in oklab, var(--card) 60%, transparent)' }}>
                <h4 className="text-foreground" style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{section.title}</h4>
                {Array.isArray(section.content) ? (
                  <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {section.content.map((item, j) => (
                      <li key={j} style={{ display: 'flex', gap: 8, fontSize: 12 }} className="text-muted-foreground">
                        <span className="text-gold" style={{ flexShrink: 0 }}>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.6 }}>{section.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
