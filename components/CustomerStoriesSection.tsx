import Link from 'next/link';

export default function CustomerStoriesSection() {
  return (
    <section className="customer-stories-section">
      <div className="container">
        <h2 className="section-title">Trusted by engineering teams worldwide</h2>
        <p className="section-description">
          Join 10,000+ developers shipping better code,<br />
          from fast-growing startups to enterprise teams.
        </p>
        <Link href="#" className="link-primary">Start reviewing smarter →</Link>

        <div className="stories-grid">
          {[
            { title: 'How Stripe reduced code review time by 60% with AI-powered analysis', icon: 'circle' },
            { title: 'Airbnb catches 90% of bugs before production using Codity', icon: 'triangle' },
            { title: 'Shopify\'s journey to zero critical bugs in production', icon: 'square' },
            { title: 'Netflix prevents security vulnerabilities with automated code analysis', icon: 'gear' },
            { title: 'Uber ships features 3x faster with instant code reviews', icon: 'lightning' },
            { title: 'Coinbase maintains code quality at scale with Codity', icon: 'dollar' },
            { title: 'Auth0 reduces technical debt by 40% using AI suggestions', icon: 'auth0' },
            { title: 'Twilio\'s code review turnaround time drops from days to minutes', icon: 'flower' },
            { title: 'How MongoDB improved code quality metrics by 75%', icon: 'check' },
          ].map((story, i) => (
            <div key={i} className="story-card">
              <div className="story-icon">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="15" stroke="#fff" strokeWidth="2" fill="none"/>
                  <circle cx="20" cy="20" r="8" fill="#fff"/>
                </svg>
              </div>
              <h3>{story.title}</h3>
              <Link href="#" className="story-link">Read story</Link>
            </div>
          ))}
        </div>

        <div className="customer-stats">
          <h3>Trusted by 10,000+ developers reviewing 1M+ pull requests monthly</h3>
        </div>
      </div>
    </section>
  );
}
