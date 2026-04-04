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
  const [openSection, setOpenSection] = useState<number | null>(null);

  const toggle = () => {
    setOpen(o => !o);
    setOpenSection(null);
  };

  const toggleSection = (i: number) => {
    setOpenSection(prev => (prev === i ? null : i));
  };

  return (
    <div className="bg-card/50 border-b border-primary/20">
      <div className="container py-4">
        {/* Top-level toggle */}
        <button
          onClick={toggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            width: '100%', textAlign: 'left', padding: 0,
          }}
        >
          <span style={{ fontSize: 16 }}>📖</span>
          <span className="text-gold" style={{ fontSize: 14, fontWeight: 600 }}>
            Learn About {topic}
          </span>
          <span style={{ marginLeft: 'auto' }} className="text-muted-foreground">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {open && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sections.map((section, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 8,
                  border: '1px solid color-mix(in oklab, var(--primary) 15%, transparent)',
                  overflow: 'hidden',
                }}
              >
                {/* Section header button */}
                <button
                  onClick={() => toggleSection(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: openSection === i
                      ? 'color-mix(in oklab, var(--primary) 10%, transparent)'
                      : 'color-mix(in oklab, var(--card) 60%, transparent)',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>
                    {section.title}
                  </span>
                  <span className="text-muted-foreground" style={{ flexShrink: 0, marginLeft: 8 }}>
                    {openSection === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                {/* Section content — only shown when this section is open */}
                {openSection === i && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'color-mix(in oklab, var(--card) 40%, transparent)',
                      borderTop: '1px solid color-mix(in oklab, var(--primary) 10%, transparent)',
                    }}
                  >
                    {Array.isArray(section.content) ? (
                      <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {section.content.map((item, j) => (
                          <li key={j} style={{ display: 'flex', gap: 8, fontSize: 12 }} className="text-muted-foreground">
                            <span className="text-gold" style={{ flexShrink: 0 }}>•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground" style={{ fontSize: 12, lineHeight: 1.7 }}>
                        {section.content}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
