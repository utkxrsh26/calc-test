import Link from 'next/link';

export type LegalSectionItem = {
  title: string;
  description: string;
};

export type LegalSection = {
  title: string;
  body?: string;
  items?: LegalSectionItem[];
  bullets?: string[];
  note?: string;
};

type LegalPageTemplateProps = {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: LegalSection[];
  badgeLabel?: string;
  cta?: {
    title: string;
    description: string;
    href: string;
    label: string;
  };
};

export default function LegalPageTemplate({
  title,
  subtitle,
  lastUpdated,
  sections,
  badgeLabel = 'Policy Center',
  cta,
}: LegalPageTemplateProps) {
  return (
    <div className="legal-page">
      <div className="container">
        <section className="legal-hero">
          <span className="legal-badge">{badgeLabel}</span>
          <h1>{title}</h1>
          <p className="legal-subtitle">{subtitle}</p>
          <p className="legal-meta">Last updated {lastUpdated}</p>
        </section>

        <div className="legal-card-grid">
          {sections.map((section) => (
            <article key={section.title} className="legal-card">
              <div className="legal-card-header">
                <h2>{section.title}</h2>
                {section.body && <p>{section.body}</p>}
              </div>

              {section.items && section.items.length > 0 && (
                <div className="legal-items">
                  {section.items.map((item) => (
                    <div key={item.title} className="legal-item">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.bullets && section.bullets.length > 0 && (
                <ul className="legal-list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}

              {section.note && <p className="legal-note">{section.note}</p>}
            </article>
          ))}
        </div>

        {cta && (
          <section className="legal-cta">
            <div className="legal-cta-card">
              <div>
                <h3>{cta.title}</h3>
                <p>{cta.description}</p>
              </div>
              <Link href={cta.href} className="legal-cta-button">
                {cta.label}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

